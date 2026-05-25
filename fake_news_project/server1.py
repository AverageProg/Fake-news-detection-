"""
Veradict — Flask Server  (rename TruthLens → your new name here)
================================================================
- Loads trained sklearn model from model/fake_news_model.pkl
- Detects language automatically
- Hybrid routing:
    Non-English                         → Gemini + web search
    English, factual/person claim       → Gemini + web search  ← NEW
    English, short (<20 words)          → Gemini + web search
    English, low confidence (<75%)      → Gemini + web search
    English, long + confident + generic → local model
- Gemini falls back to local model if all keys dead or error

Key rotation:
- Tracks daily usage per key
- Blacklists keys that return auth/quota errors (until next day)
- Tries next key automatically on any API error             ← FIXED

Web search (DuckDuckGo, no key needed):
- Builds a focused query: claim + current year              ← FIXED
- Primary: HTML scraper (more reliable than JSON API)
- Fallback: JSON instant answer API
- Injects results into Gemini prompt for real-time grounding

Media Detection (/api/detect-media):
- Images: metadata analysis (PIL/EXIF) + Gemini Vision
- Videos: frame extraction (OpenCV) + per-frame Gemini Vision
"""

import os
import re
import pickle
import time
import json
import base64
import tempfile
import urllib.request
import urllib.parse
from pathlib import Path
from flask import Flask, request, jsonify, render_template

try:
    from langdetect import detect as detect_lang
    LANGDETECT_AVAILABLE = True
except ImportError:
    LANGDETECT_AVAILABLE = False
    print("[WARN] langdetect not installed. pip install langdetect")

try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("[WARN] google-genai not installed. pip install google-genai")

try:
    from PIL import Image, ExifTags
    import io
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("[WARN] Pillow not installed. pip install Pillow")

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("[WARN] opencv-python not installed. pip install opencv-python")

app = Flask(__name__)

# Load .env / _env file if present
def _load_env_file():
    for env_path in [".env", "_env", "env"]:
        try:
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, _, v = line.partition("=")
                        os.environ.setdefault(k.strip(), v.strip())
            print(f"[ENV] Loaded environment from {env_path}")
            break
        except FileNotFoundError:
            continue
_load_env_file()

# ═══════════════════════════════════════════════════════════
# EXTERNAL DATABASE API KEYS
# All optional — any missing key disables that source gracefully
# Get free keys at the URLs listed below
# ═══════════════════════════════════════════════════════════

# Google Safe Browsing (free, 10k req/day)
# https://developers.google.com/safe-browsing/v4/get-started
SAFE_BROWSING_API_KEY = os.environ.get("SAFE_BROWSING_API_KEY", "")

# VirusTotal (free, 4 req/min)
# https://www.virustotal.com/gui/join-us
VIRUSTOTAL_API_KEY = os.environ.get("VIRUSTOTAL_API_KEY", "")

# PhishTank (free, no key needed — public API)
# https://www.phishtank.com/api_info.php
PHISHTANK_ENABLED = True  # uses their free unauthenticated endpoint

# URLhaus (free, no key needed — Abuse.ch project)
# https://urlhaus-api.abuse.ch/
URLHAUS_ENABLED = True

# Botometer v4 via RapidAPI (free tier, 1k req/day)
# https://rapidapi.com/OSoMe_Team/api/botometer-v4
BOTOMETER_RAPIDAPI_KEY = os.environ.get("BOTOMETER_RAPIDAPI_KEY", "")

# ClaimBuster — verifiable claim scoring (free, 100 req/day)
# https://idir.uta.edu/claimbuster/
GOOGLE_FACT_CHECK_API = os.environ.get("GOOGLE_FACT_CHECK_API", "")

# Hive Moderation — AI image/video detection (free tier)
# https://hivemoderation.com/
HIVE_API_KEY = os.environ.get("HIVE_API_KEY", "")

# MediaBias/FactCheck lookup (no official API — we do a DDG domain search)
# GDELT project: accessed via their free public API (no key needed)
GDELT_ENABLED = True
_last_gdelt_call = 0.0
GDELT_MIN_INTERVAL = 8  # seconds — prevent 429s from rapid calls

# ── Social media page detection (don't run news model on profile pages) ──
_SOCIAL_MEDIA_SIGNALS = [
    r"\b(followers?|following)\b[^.]{0,30}\d+",
    r"\bfriends?\b[^.]{0,20}\d+",
    r"\b(add friend|send message|follow|unfollow)\b",
    r"\b(timeline|newsfeed|news feed|story|stories|reel)\b",
    r"\b(liked this|reacted to|shared a|commented on)\b",
    r"\b(facebook|instagram|twitter|tiktok|linkedin)\b.{0,40}(profile|page|account)",
    r"\bcover photo\b",
    r"\b(mutual friends|mutual connections)\b",
]
_SOCIAL_RE = [re.compile(p, re.IGNORECASE) for p in _SOCIAL_MEDIA_SIGNALS]

def _is_social_media_page(text: str) -> bool:
    """Returns True if the text looks like scraped social media UI rather than news."""
    hits = sum(1 for pat in _SOCIAL_RE if pat.search(text))
    return hits >= 2

# ── Trusted publishing platforms ───────────────────────────
# These are established, real publishing platforms. If the request
# contains their domain (via Referer or text), boost the real score.
TRUSTED_PLATFORMS = {
    "medium.com", "huffpost.com", "huffingtonpost.com",
    "theatlantic.com", "theguardian.com", "guardian.com",
    "nytimes.com", "washingtonpost.com", "bbc.com", "bbc.co.uk",
    "reuters.com", "apnews.com", "npr.org", "pbs.org",
    "forbes.com", "businessinsider.com", "time.com",
    "newyorker.com", "wired.com", "techcrunch.com",
    "scientificamerican.com", "nature.com", "economist.com",
    "substack.com", "wordpress.com", "blogger.com",
    "linkedin.com",  # LinkedIn articles
}

def _get_request_domain() -> str:
    """Extract domain from the request Referer or Origin header."""
    for header in ("Referer", "Origin", "X-Source-URL"):
        val = request.headers.get(header, "")
        if val:
            try:
                import urllib.parse as _up
                host = _up.urlparse(val).hostname or ""
                # strip www.
                return host.lstrip("www.")
            except Exception:
                pass
    return ""

def _is_casual_blog_writing(text: str) -> bool:
    """
    Returns True if the text reads like informal blog/opinion writing
    rather than formal news. The local model wrongly flags this as fake
    because it mimics some surface patterns of sensational text.
    """
    casual_signals = [
        r"\bI (don'?t|can'?t|won'?t|haven'?t|didn'?t)\b",   # first-person contractions
        r"\b(Hehehe|Haha|LOL|OMG|WTF|lol|omg)\b",
        r"\bRead (this|the) article\b",
        r"\b(you'?ll|you'?re|you'?ve|you'?d)\b",              # second-person informal
        r"[;:]-?\)",                                           # emoticons
        r"\b(honestly|literally|basically|actually)\b",
        r"\bclick (here|to read|to find out)\b",
        r"\bfind out\b.{0,20}(below|here|more)",
        r"\b(tips?|tricks?|hacks?|secrets?)\b.{0,30}\d+",    # listicle patterns
    ]
    hits = sum(1 for p in casual_signals if re.search(p, text, re.IGNORECASE))
    return hits >= 2


# ── CORS — allow the browser extension (chrome-extension://) to call the API
@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "")
    if origin.startswith("chrome-extension://") or "localhost" in origin:
        response.headers["Access-Control-Allow-Origin"]  = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

@app.route("/api/detect",          methods=["OPTIONS"])
@app.route("/api/detect-media",    methods=["OPTIONS"])
@app.route("/api/detect-link",     methods=["OPTIONS"])
@app.route("/api/detect-profile",  methods=["OPTIONS"])
@app.route("/api/status",          methods=["OPTIONS"])
def handle_options():
    return "", 204


# ═══════════════════════════════════════════════════════════
# CONFIG — Gemini API keys (rotate automatically)
# Get free keys at https://aistudio.google.com/app/apikey
# ═══════════════════════════════════════════════════════════
GEMINI_API_KEYS = [
    os.environ.get("GEMINI_API_KEY_1", "AIzaSyDn7Jr3WQCvDaqhw1XpVxjtSwZULmJ9D0M"),  # FUNNY MOMENTS API
    os.environ.get("GEMINI_API_KEY_2", "AIzaSyA-yjBOk7SCQw1WAITYrlshqwWVM897gSo"),  # AMAZING INVENTORS API
    os.environ.get("GEMINI_API_KEY_3", "AIzaSyCPHCPMFWaHq7czfzGcJ8kywK1-8oloPMc"),  # NOTROLLBROO API
]
GEMINI_API_KEYS = [k for k in GEMINI_API_KEYS if k]
GEMINI_DAILY_LIMIT = 1400

_gemini_key_index  = 0
_gemini_daily_counts = {}   # key → (date_str, count)
_gemini_blacklist    = {}   # key → date_str when blacklisted (cleared next day)

# Simple in-memory result cache — avoids burning Gemini keys on repeat requests
# (extension often sends the same URL/text multiple times per page load)
import hashlib as _hashlib
_result_cache = {}          # sha256[:16] → (timestamp, result_dict)
_CACHE_TTL    = 300         # seconds (5 minutes)

def _cache_get(key: str) -> dict | None:
    entry = _result_cache.get(key)
    if entry and (time.time() - entry[0]) < _CACHE_TTL:
        return entry[1]
    return None

def _cache_set(key: str, result: dict):
    # Keep cache small — evict oldest 20% when > 200 entries
    if len(_result_cache) > 200:
        cutoff = time.time() - _CACHE_TTL
        stale = [k for k, (ts, _) in _result_cache.items() if ts < cutoff]
        for k in stale:
            _result_cache.pop(k, None)
    _result_cache[key] = (time.time(), result)

def _cache_key(text: str) -> str:
    return _hashlib.sha256(text.encode()).hexdigest()[:16]


# ═══════════════════════════════════════════════════════════
# MODEL LOADING
# ═══════════════════════════════════════════════════════════

MODEL_PATH = Path("model/fake_news_model.pkl")
_model = None

def load_model():
    global _model
    if MODEL_PATH.exists():
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
        print(f"[MODEL] Loaded from {MODEL_PATH}")
    else:
        print(f"[WARN] No model at {MODEL_PATH} — run Train_model.py first")

load_model()


# ═══════════════════════════════════════════════════════════
# GEMINI KEY ROTATION  (with blacklisting)
# ═══════════════════════════════════════════════════════════

def _is_blacklisted(key: str) -> bool:
    """A key is blacklisted only for the day it was flagged."""
    today = time.strftime("%Y-%m-%d")
    return _gemini_blacklist.get(key) == today

def _blacklist_key(key: str):
    today = time.strftime("%Y-%m-%d")
    _gemini_blacklist[key] = today
    print(f"[KEY] Blacklisted key ...{key[-6:]} for today ({today})")

def get_next_gemini_key() -> str | None:
    """
    Round-robin across keys, skipping:
      - keys that hit the daily usage limit
      - keys blacklisted today (auth error / quota exceeded from API)
    Returns None only when every key is exhausted.
    """
    global _gemini_key_index
    if not GEMINI_API_KEYS:
        return None
    today = time.strftime("%Y-%m-%d")

    for _ in range(len(GEMINI_API_KEYS)):
        key = GEMINI_API_KEYS[_gemini_key_index % len(GEMINI_API_KEYS)]
        _gemini_key_index += 1

        if _is_blacklisted(key):
            continue

        date_str, count = _gemini_daily_counts.get(key, (today, 0))
        if date_str != today:
            count = 0
        if count < GEMINI_DAILY_LIMIT:
            _gemini_daily_counts[key] = (today, count + 1)
            return key

    return None  # all keys exhausted or blacklisted

def _is_auth_error(exc: Exception) -> bool:
    """Detect Gemini auth / quota errors that mean the key is dead."""
    msg = str(exc).lower()
    return any(x in msg for x in [
        "api_key_invalid", "invalid api key", "permission_denied",
        "quota", "resource_exhausted", "403", "401",
        "api key not valid",
    ])


# ═══════════════════════════════════════════════════════════
# TEXT HELPERS
# ═══════════════════════════════════════════════════════════

def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s'.,!?-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def run_local_model(text: str) -> dict:
    if _model is None:
        import random
        fs = round(random.uniform(0.05, 0.95), 4)
        rs = round(1 - fs, 4)
        lbl = "FAKE" if fs > 0.5 else "REAL"
        return {"label": lbl, "confidence": round(max(fs, rs), 4),
                "scores": {"fake": fs, "real": rs}, "source": "stub"}
    proba = _model.predict_proba([clean_text(text)])[0]
    lbl = "FAKE" if proba[0] > proba[1] else "REAL"
    return {
        "label":      lbl,
        "confidence": round(float(max(proba)), 4),
        "scores":     {"fake": round(float(proba[0]), 4),
                       "real": round(float(proba[1]), 4)},
        "source":     "local_model",
    }


# ═══════════════════════════════════════════════════════════
# FACTUAL CLAIM DETECTION
# Decides whether the text is making a verifiable real-world
# claim that the local model cannot reliably judge.
# ═══════════════════════════════════════════════════════════

# Patterns that strongly suggest a real-world factual claim
_FACTUAL_PATTERNS = [
    r"\b(is|are|was|were|has|have|had)\s+(now\s+)?\d+\s+years?\s+old\b",  # age claims
    r"\b(born|died|arrested|elected|appointed|signed|passed|won|lost|scored|broke)\b",
    r"\b(president|prime minister|ceo|mayor|governor|senator|minister)\b",
    r"\b(record|championship|world cup|olympics|nobel|oscar|grammy)\b",
    r"\b(million|billion|trillion)\s+(dollars?|euros?|pounds?|people|votes?)\b",
    r"\b(law|bill|treaty|agreement|ban)\s+(passed|signed|approved|rejected)\b",
    r"\b(study|research|scientists?|researchers?)\s+(found|shows?|proves?|confirms?)\b",
    r"\b\d{4}\s+(election|census|survey|report|study)\b",
    r"\b(latest|current|today|yesterday|this\s+week|this\s+year|in\s+20\d\d)\b",
]
_FACTUAL_RE = [re.compile(p, re.IGNORECASE) for p in _FACTUAL_PATTERNS]

def _is_factual_claim(text: str) -> bool:
    """
    Returns True if the text appears to make a specific, verifiable
    real-world claim that requires up-to-date knowledge to evaluate.
    """
    for pattern in _FACTUAL_RE:
        if pattern.search(text):
            return True
    return False


# ═══════════════════════════════════════════════════════════
# WEB SEARCH  (DuckDuckGo, no API key needed)
# ═══════════════════════════════════════════════════════════

def web_search(query: str, max_results: int = 6) -> str:
    """
    Scrape DuckDuckGo for live search snippets.
    Appends the current year to the query so results are fresh.
    Returns plain text to inject into the Gemini prompt.
    """
    current_year = time.strftime("%Y")
    # Append year only if the query doesn't already mention a year
    if not re.search(r"\b20\d\d\b", query):
        query = f"{query} {current_year}"

    snippets = _ddg_html_search(query, max_results)
    if not snippets:
        snippets = _ddg_json_search(query, max_results)

    return "\n".join(snippets) if snippets else ""


def _ddg_html_search(query: str, max_results: int) -> list[str]:
    """Primary: scrape DuckDuckGo HTML — most reliable for current facts."""
    try:
        encoded = urllib.parse.urlencode({"q": query, "kl": "wt-wt"})
        url = f"https://html.duckduckgo.com/html/?{encoded}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        })
        with urllib.request.urlopen(req, timeout=7) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        # Extract result titles + snippets
        results = []

        # Titles
        titles = re.findall(r'class="result__title"[^>]*>.*?<a[^>]*>(.*?)</a>', html, re.DOTALL)
        titles = [re.sub(r"<[^>]+>", "", t).strip() for t in titles]

        # Snippets
        raw_snippets = re.findall(
            r'class="result__snippet"[^>]*>(.*?)</(?:a|span)>',
            html, re.DOTALL
        )
        snippets = [re.sub(r"<[^>]+>", "", s).strip() for s in raw_snippets]

        # Interleave title + snippet for context
        for i, snippet in enumerate(snippets[:max_results]):
            if snippet:
                title = titles[i] if i < len(titles) else ""
                entry = f"• {title}: {snippet}" if title else f"• {snippet}"
                results.append(entry)

        return results

    except Exception as e:
        print(f"[DDG HTML ERROR] {e}")
        return []


def _ddg_json_search(query: str, max_results: int) -> list[str]:
    """Fallback: DuckDuckGo Instant Answer JSON API."""
    try:
        encoded = urllib.parse.urlencode({
            "q": query, "format": "json",
            "no_html": "1", "skip_disambig": "1"
        })
        url = f"https://api.duckduckgo.com/?{encoded}"
        req = urllib.request.Request(url, headers={"User-Agent": "Veradict/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())

        results = []
        if data.get("Answer"):
            results.append(f"• Direct answer: {data['Answer']}")
        if data.get("AbstractText"):
            results.append(f"• Summary: {data['AbstractText']}")
        for topic in data.get("RelatedTopics", [])[:max_results]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append(f"• {topic['Text']}")
        return results[:max_results]

    except Exception as e:
        print(f"[DDG JSON ERROR] {e}")
        return []


# ═══════════════════════════════════════════════════════════
# GEMINI TEXT ANALYSIS
# ═══════════════════════════════════════════════════════════

def run_gemini(text: str, lang: str) -> dict:
    """
    Tries each Gemini key in rotation. If a key returns an auth/quota
    error it is blacklisted for the day and the next key is tried.
    Web search results are injected into the prompt for grounding.
    """
    # Build search query from first ~120 chars (headline-like)
    search_query = text[:120].strip().rstrip(".,;:")
    web_context  = web_search(search_query)
    web_section  = (
        f"\n\nLive web search results (fetched right now — treat as ground truth):\n{web_context}\n"
        if web_context else
        "\n\n(No live web results available — rely on your training knowledge.)\n"
    )

    prompt = f"""You are a fact-checking AI. Today's date is {time.strftime("%B %d, %Y")}.

Text to analyse (language: {lang}):
\"\"\"{text[:2000]}\"\"\"
{web_section}
Instructions:
- The web search results above were fetched RIGHT NOW and reflect current reality.
- Cross-reference every factual claim in the text against the web results.
- If the web results contradict the text (e.g. the person's age is different, the event didn't happen), that is a strong FAKE signal.
- If the text matches the web results, lean toward REAL.
- Also check: emotional/sensational language, vague sourcing, internal contradictions.
- If the claim was once true but is now outdated (e.g. someone's age changed), still mark it FAKE.

Respond ONLY with valid JSON (no markdown, no extra text):
{{"label": "FAKE" or "REAL", "confidence": 0.0-1.0, "fake_score": 0.0-1.0, "real_score": 0.0-1.0, "reasoning": "1-2 sentences citing specific evidence from the web results"}}"""

    # Try each key, blacklisting broken ones
    tried = 0
    while tried < len(GEMINI_API_KEYS):
        key = get_next_gemini_key()
        if not key:
            break
        tried += 1
        try:
            client   = genai.Client(api_key=key)
            response = client.models.generate_content(
                model="gemini-2.5-flash", contents=prompt
            )
            raw  = re.sub(r"```json|```", "", response.text.strip()).strip()
            data = json.loads(raw)
            print(f"[GEMINI] Key ...{key[-6:]} OK — label={data.get('label')}")
            return {
                "label":             data.get("label", "UNKNOWN").upper(),
                "confidence":        round(float(data.get("confidence",  0.5)), 4),
                "scores":            {
                    "fake": round(float(data.get("fake_score", 0.5)), 4),
                    "real": round(float(data.get("real_score", 0.5)), 4),
                },
                "source":            "gemini+web_search",
                "reasoning":         data.get("reasoning", ""),
                "detected_language": lang,
            }

        except Exception as e:
            print(f"[GEMINI ERROR] Key ...{key[-6:]}: {e}")
            if _is_auth_error(e):
                _blacklist_key(key)
            # loop and try next key

    # All keys failed
    return {
        "label": "UNKNOWN", "confidence": 0.0,
        "scores": {"fake": 0.0, "real": 0.0},
        "source": "gemini_all_keys_failed",
        "note": "All Gemini keys exhausted or blacklisted. Add more keys or try tomorrow.",
    }


def detect_language(text: str) -> str:
    if not LANGDETECT_AVAILABLE:
        return "en"
    try:
        return detect_lang(text[:500])
    except Exception:
        return "en"


# ═══════════════════════════════════════════════════════════
# MEDIA DETECTION HELPERS
# ═══════════════════════════════════════════════════════════

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".wmv"}

AI_SOFTWARE_TAGS = [
    "stable diffusion", "midjourney", "dall-e", "dalle", "firefly",
    "generative", "ai generated", "adobe firefly", "runway", "sora",
    "kling", "pika", "gen-2", "gen-3", "flux", "imagen",
]


def analyze_image_metadata(img_bytes: bytes) -> dict:
    signals  = []
    ai_score = 0.0

    if not PIL_AVAILABLE:
        return {"signals": signals, "ai_score": ai_score, "metadata": {}}

    try:
        img  = Image.open(io.BytesIO(img_bytes))
        meta = {}

        meta["format"] = img.format or "unknown"
        meta["mode"]   = img.mode
        meta["size"]   = f"{img.width}x{img.height}"

        if img.width in (512, 768, 1024, 1152, 1216, 1344, 2048) and \
           img.height in (512, 768, 1024, 1152, 1216, 1344, 2048):
            signals.append("Resolution matches common AI output size")
            ai_score += 0.15

        exif_data = img._getexif() if hasattr(img, "_getexif") else None
        if exif_data:
            exif     = {ExifTags.TAGS.get(k, k): v for k, v in exif_data.items()}
            combined = " ".join([
                str(exif.get("Software", "")),
                str(exif.get("ImageDescription", "")),
                str(exif.get("UserComment", "")),
                str(exif.get("Artist", "")),
            ]).lower()

            for tag in AI_SOFTWARE_TAGS:
                if tag in combined:
                    signals.append(f"EXIF software tag references AI tool: '{tag}'")
                    ai_score += 0.5
                    break

            has_camera = "Make" in exif and "Model" in exif
            has_lens   = "LensModel" in exif or "LensSpecification" in exif

            if not has_camera and not has_lens:
                signals.append("No camera make/model in EXIF — typical of AI-generated images")
                ai_score += 0.1
            if not has_lens and img.width >= 512:
                ai_score += 0.05

            meta["software"] = exif.get("Software", "—")
            meta["camera"]   = f"{exif.get('Make','—')} {exif.get('Model','—')}".strip()
            meta["datetime"] = str(exif.get("DateTimeOriginal", exif.get("DateTime", "—")))
        else:
            if img.format in ("PNG", "WEBP"):
                signals.append("No EXIF metadata — common in AI-generated PNG/WebP")
                ai_score += 0.1
            if hasattr(img, "text") and img.text:
                png_text = " ".join(str(v) for v in img.text.values()).lower()
                for tag in AI_SOFTWARE_TAGS:
                    if tag in png_text:
                        signals.append(f"PNG metadata references AI tool: '{tag}'")
                        ai_score += 0.5
                        break
                if "parameters" in img.text or "prompt" in png_text:
                    signals.append("PNG contains prompt/parameters chunk — strong AI signal")
                    ai_score += 0.4

        if CV2_AVAILABLE:
            img_rgb       = img.convert("RGB")
            arr           = np.array(img_rgb)
            gray          = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY).astype(np.float32)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_32F).var()
            meta["sharpness_variance"] = round(float(laplacian_var), 2)
            if laplacian_var < 100:
                signals.append("Unusually low texture variance — may indicate AI smoothing")
                ai_score += 0.1
            if img.format == "JPEG":
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=75)
                recompressed = Image.open(buffer)
                diff     = np.abs(arr.astype(np.float32) -
                                  np.array(recompressed.convert("RGB")).astype(np.float32))
                ela_mean = diff.mean()
                meta["ela_mean"] = round(float(ela_mean), 4)
                if ela_mean < 2.5:
                    signals.append("Very low ELA response — image may be AI-generated or heavily processed")
                    ai_score += 0.1

        return {
            "signals":  signals,
            "ai_score": round(min(ai_score, 1.0), 4),
            "metadata": meta,
        }

    except Exception as e:
        print(f"[METADATA ERROR] {e}")
        return {"signals": [f"Metadata analysis error: {str(e)}"], "ai_score": 0.0, "metadata": {}}


def gemini_analyze_image(img_bytes: bytes, mime_type: str, context: str = "image") -> dict:
    """Send image to Gemini Vision. Rotates keys and blacklists broken ones."""
    prompt = f"""You are an expert forensic analyst specializing in detecting AI-generated media.
Examine this {context} carefully and determine if it was created by an AI system
(Stable Diffusion, Midjourney, DALL-E, Sora, Kling, Runway, etc.) or authentic media.

Look for: unnatural skin, perfect symmetry errors, garbled text, impossible backgrounds,
dreamlike blending, wrong fingers/limbs, uniform lighting, plastic skin, watermark artifacts,
morphing faces, unnatural hair movement, blurry face boundaries, inconsistent lighting.

Respond ONLY with valid JSON (no markdown):
{{
  "ai_generated": "YES" or "NO" or "UNCERTAIN",
  "confidence": 0.0-1.0,
  "ai_score": 0.0-1.0,
  "human_score": 0.0-1.0,
  "signals": ["signal 1", "signal 2"],
  "reasoning": "one to two sentences summarising your verdict"
}}"""

    tried = 0
    while tried < len(GEMINI_API_KEYS):
        key = get_next_gemini_key()
        if not key:
            break
        tried += 1
        try:
            client  = genai.Client(api_key=key)
            img_b64 = base64.b64encode(img_bytes).decode()
            contents = [{"role": "user", "parts": [
                {"inline_data": {"mime_type": mime_type, "data": img_b64}},
                {"text": prompt},
            ]}]
            response = client.models.generate_content(model="gemini-2.5-flash", contents=contents)
            raw  = re.sub(r"```json|```", "", response.text.strip()).strip()
            data = json.loads(raw)
            return {
                "ai_generated": data.get("ai_generated", "UNCERTAIN").upper(),
                "confidence":   round(float(data.get("confidence", 0.5)), 4),
                "ai_score":     round(float(data.get("ai_score",    0.5)), 4),
                "human_score":  round(float(data.get("human_score", 0.5)), 4),
                "signals":      data.get("signals", []),
                "reasoning":    data.get("reasoning", ""),
                "source":       "gemini_vision",
            }
        except Exception as e:
            print(f"[GEMINI VISION ERROR] Key ...{key[-6:]}: {e}")
            if _is_auth_error(e):
                _blacklist_key(key)

    return {
        "ai_generated": "UNKNOWN", "confidence": 0.0,
        "ai_score": 0.5, "human_score": 0.5,
        "signals": [], "reasoning": "",
        "source": "gemini_all_keys_failed",
        "note": "All Gemini keys failed.",
    }


def extract_video_frames(video_bytes: bytes, n_frames: int = 6) -> list[dict]:
    if not CV2_AVAILABLE:
        return []
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name
    frames = []
    try:
        cap          = cv2.VideoCapture(tmp_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0
        if total_frames <= 0:
            cap.release()
            return []
        indices = [int(i * total_frames / n_frames) for i in range(n_frames)]
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                continue
            h, w = frame.shape[:2]
            if w > 768:
                frame = cv2.resize(frame, (768, int(h * 768 / w)))
            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            frames.append({
                "frame_index": idx,
                "timestamp_s": round(idx / fps, 2),
                "jpeg_bytes":  buf.tobytes(),
            })
        cap.release()
    except Exception as e:
        print(f"[VIDEO EXTRACT ERROR] {e}")
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
    return frames


# ═══════════════════════════════════════════════════════════
# ROUTES — Pages
# ═══════════════════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/how-it-works")
def how_it_works():
    return render_template("how_it_works.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/media-detect")
def media_detect():
    return render_template("media_detect.html")


# ═══════════════════════════════════════════════════════════
# ROUTES — Text Detection
# ═══════════════════════════════════════════════════════════

@app.route("/api/detect", methods=["POST"])
def detect():
    data = request.get_json(silent=True)
    if not data or not data.get("text", "").strip():
        return jsonify({"error": "No text provided."}), 400

    text = data["text"].strip()
    if len(text) < 10:
        return jsonify({"error": "Text too short — provide a bit more context."}), 400

    try:
        lang       = detect_language(text)
        word_count = len(text.split())
        gemini_ready = GEMINI_AVAILABLE and bool(GEMINI_API_KEYS)

        # ── Guard: social media UI text ────────────────────
        # The extension sometimes sends scraped profile pages. The local news
        # model isn't trained on social-media text and will misclassify it.
        if _is_social_media_page(text):
            return jsonify({
                "label":             "UNCERTAIN",
                "confidence":        0.0,
                "scores":            {"fake": 0.0, "real": 0.0},
                "word_count":        word_count,
                "char_count":        len(text),
                "detected_language": lang,
                "source":            "skipped_social_media",
                "note":              "This text appears to be a social media profile page, not a news article. "
                                     "Use the Profile Detector on the Tools page for social media accounts.",
                "reasoning":         "",
                "ext_signals":       [],
            })

        # ── Trusted platform check ─────────────────────────
        # If the request comes from a known legitimate publisher,
        # skip the local model and return REAL immediately.
        request_domain = _get_request_domain()
        is_trusted = any(
            request_domain == td or request_domain.endswith("." + td)
            for td in TRUSTED_PLATFORMS
        ) if request_domain else False

        # ── Routing logic ──────────────────────────────────
        if not gemini_ready:
            # No Gemini at all — local model only
            result = run_local_model(text)
            result["detected_language"] = lang

        elif is_trusted:
            # Request came from a known legitimate platform.
            # The local model can't judge blog/opinion writing reliably,
            # so send to Gemini for an accurate assessment.
            print(f"[ROUTE] Trusted platform ({request_domain}) → Gemini")
            gemini = run_gemini(text, lang)
            result = gemini if gemini["label"] not in ("UNKNOWN", "ERROR") else run_local_model(text)

        elif lang != "en":
            # Non-English → always Gemini (local model is English-only)
            result = run_gemini(text, lang)

        else:
            local = run_local_model(text)

            # Send to Gemini if ANY of these are true:
            # 1. Text is short (local model has little signal)
            # 2. Local model is not confident  ← threshold lowered 0.75→0.62
            #    (catches informal blog writing that the local model over-flags)
            # 3. Text contains a specific verifiable factual claim
            # 4. Text reads like casual blog/opinion writing
            needs_gemini = (
                word_count < 20
                or local["confidence"] < 0.62
                or _is_factual_claim(text)
                or _is_casual_blog_writing(text)
            )

            if needs_gemini:
                reason = (
                    "short text"           if word_count < 20 else
                    "low local confidence" if local["confidence"] < 0.62 else
                    "casual blog writing"  if _is_casual_blog_writing(text) else
                    "factual claim detected"
                )
                print(f"[ROUTE] Sending to Gemini+web ({reason})")
                gemini = run_gemini(text, lang)
                if gemini["label"] in ("UNKNOWN", "ERROR"):
                    result = local
                    result["note"] = "Gemini unavailable, used local model. " + gemini.get("note", "")
                else:
                    result = gemini
            else:
                result = local

        # ── External DB enrichment for text ──────────────────
        ext_results = []
        # ClaimBuster: flag if this is a check-worthy verifiable claim
        cb = check_google_fact(text)
        ext_results.append(cb)
        # If text has a clear domain/source reference, check MBFC credibility
        domain_match = re.search(r"\b([a-z0-9-]{3,}\.(com|org|net|info|news|co))\b", text.lower())
        if domain_match:
            ext_results.append(check_mediabias_factcheck(domain_match.group(1)))
            ext_results.append(check_gdelt_domain(domain_match.group(1)))

        ext_signals  = _format_ext_signals(ext_results)
        ext_delta    = _ext_score_delta(ext_results)
        # Nudge confidence toward fake if external DBs agree
        final_confidence = result.get("confidence", 0.0)
        if ext_delta > 0 and result.get("label") == "FAKE":
            final_confidence = min(1.0, round(final_confidence + ext_delta * 0.3, 4))
        elif ext_delta < 0 and result.get("label") == "REAL":
            final_confidence = min(1.0, round(final_confidence + abs(ext_delta) * 0.2, 4))

        return jsonify({
            "label":             result.get("label",      "UNKNOWN"),
            "confidence":        final_confidence,
            "scores":            result.get("scores",     {"fake": 0.0, "real": 0.0}),
            "word_count":        word_count,
            "char_count":        len(text),
            "detected_language": result.get("detected_language", lang),
            "source":            result.get("source",    "unknown"),
            "note":              result.get("note",       ""),
            "reasoning":         result.get("reasoning",  ""),
            "ext_signals":       ext_signals,
        })

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ═══════════════════════════════════════════════════════════
# ROUTES — Media Detection
# ═══════════════════════════════════════════════════════════

@app.route("/api/detect-media", methods=["POST"])
def detect_media():
    MAX_BYTES = 50 * 1024 * 1024

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Send a file in the 'file' field."}), 400

    uploaded = request.files["file"]
    filename = uploaded.filename or ""
    ext      = Path(filename).suffix.lower()

    file_bytes = uploaded.read()
    if len(file_bytes) == 0:
        return jsonify({"error": "Uploaded file is empty."}), 400
    if len(file_bytes) > MAX_BYTES:
        return jsonify({"error": "File too large. Maximum size is 50 MB."}), 400

    if ext in IMAGE_EXTENSIONS:
        mime_type   = uploaded.mimetype or "image/jpeg"
        meta_result = analyze_image_metadata(file_bytes)

        gemini_result = {}
        if GEMINI_AVAILABLE and GEMINI_API_KEYS:
            gemini_result = gemini_analyze_image(file_bytes, mime_type, context="image")

        all_signals = meta_result["signals"] + gemini_result.get("signals", [])

        if gemini_result and gemini_result.get("ai_generated") not in ("ERROR", "UNKNOWN", "UNCERTAIN", "")  \
                and gemini_result.get("source") != "gemini_all_keys_failed":
            blended_ai_score = round(meta_result["ai_score"] * 0.3 + gemini_result["ai_score"] * 0.7, 4)
            label      = "AI-GENERATED" if blended_ai_score >= 0.5 else "AUTHENTIC"
            confidence = round(meta_result["ai_score"] * 0.3 + gemini_result["confidence"] * 0.7, 4)
            source     = "gemini_vision+metadata"
        else:
            blended_ai_score = meta_result["ai_score"]
            label      = "AI-GENERATED" if blended_ai_score >= 0.5 else "AUTHENTIC"
            confidence = blended_ai_score
            source     = "metadata_only"

        # ── Hive Moderation external AI image check ───────────
        hive_result  = check_hive_ai_image(file_bytes)
        hive_signals = _format_ext_signals([hive_result])
        hive_delta   = _ext_score_delta([hive_result])

        final_ai_score = min(1.0, round(blended_ai_score + hive_delta * 0.4, 4))
        final_label    = "AI-GENERATED" if final_ai_score >= 0.5 else "AUTHENTIC"
        final_conf     = round(final_ai_score if final_label == "AI-GENERATED" else 1 - final_ai_score, 4)
        final_source   = source + ("+hive_moderation" if hive_result.get("hit") else "")

        return jsonify({
            "media_type":   "image",
            "filename":     filename,
            "file_size_kb": round(len(file_bytes) / 1024, 1),
            "label":        final_label,
            "confidence":   final_conf,
            "scores":       {"ai_generated": final_ai_score,
                             "authentic":    round(1 - final_ai_score, 4)},
            "signals":      all_signals + hive_signals,
            "reasoning":    gemini_result.get("reasoning", ""),
            "metadata":     meta_result.get("metadata", {}),
            "source":       final_source,
        })

    elif ext in VIDEO_EXTENSIONS:
        if not CV2_AVAILABLE:
            return jsonify({"error": "Video analysis requires OpenCV. pip install opencv-python"}), 500

        frames = extract_video_frames(file_bytes, n_frames=6)
        if not frames:
            return jsonify({"error": "Could not extract frames from video."}), 422

        frame_results = []
        all_signals   = []
        ai_scores     = []

        for frame in frames:
            if GEMINI_AVAILABLE and GEMINI_API_KEYS:
                fr = gemini_analyze_image(
                    frame["jpeg_bytes"], "image/jpeg",
                    context=f"video frame at {frame['timestamp_s']}s"
                )
            else:
                fr = {
                    "ai_generated": "UNCERTAIN", "confidence": 0.5,
                    "ai_score": 0.5, "human_score": 0.5,
                    "signals": ["Gemini unavailable"], "reasoning": "", "source": "no_gemini",
                }
            ai_scores.append(fr["ai_score"])
            all_signals.extend(fr.get("signals", []))
            frame_results.append({
                "frame_index":  frame["frame_index"],
                "timestamp_s":  frame["timestamp_s"],
                "ai_score":     fr["ai_score"],
                "ai_generated": fr["ai_generated"],
                "reasoning":    fr["reasoning"],
            })

        seen = set()
        unique_signals = [s for s in all_signals if not (s in seen or seen.add(s))]

        avg_ai_score   = round(sum(ai_scores) / len(ai_scores), 4) if ai_scores else 0.5
        ai_frame_count = sum(1 for s in ai_scores if s >= 0.5)
        label          = "AI-GENERATED" if avg_ai_score >= 0.5 else "AUTHENTIC"
        confidence     = round(avg_ai_score if label == "AI-GENERATED" else 1 - avg_ai_score, 4)

        return jsonify({
            "media_type":        "video",
            "filename":          filename,
            "file_size_kb":      round(len(file_bytes) / 1024, 1),
            "label":             label,
            "confidence":        confidence,
            "scores":            {"ai_generated": avg_ai_score,
                                  "authentic":    round(1 - avg_ai_score, 4)},
            "frames_analysed":   len(frame_results),
            "ai_flagged_frames": ai_frame_count,
            "frame_results":     frame_results,
            "signals":           unique_signals,
            "source":            "gemini_vision_frames",
        })

    else:
        supported = ", ".join(sorted(IMAGE_EXTENSIONS | VIDEO_EXTENSIONS))
        return jsonify({"error": f"Unsupported file type '{ext}'. Supported: {supported}"}), 415


# ═══════════════════════════════════════════════════════════
# ROUTES — Status
# ═══════════════════════════════════════════════════════════

@app.route("/api/status")
def status():
    today = time.strftime("%Y-%m-%d")
    usage = {}
    for key in GEMINI_API_KEYS:
        date_str, count = _gemini_daily_counts.get(key, (today, 0))
        usage[f"...{key[-6:]}"] = {
            "requests_today": count if date_str == today else 0,
            "blacklisted":    _is_blacklisted(key),
        }
    return jsonify({
        "model_loaded":       _model is not None,
        "gemini_available":   GEMINI_AVAILABLE and bool(GEMINI_API_KEYS),
        "gemini_keys":        len(GEMINI_API_KEYS),
        "gemini_daily_limit": GEMINI_DAILY_LIMIT,
        "gemini_key_status":  usage,
        "langdetect":         LANGDETECT_AVAILABLE,
        "pil_available":      PIL_AVAILABLE,
        "cv2_available":      CV2_AVAILABLE,
    })



# ═══════════════════════════════════════════════════════════
# FAKE LINK DETECTOR — helpers
# ═══════════════════════════════════════════════════════════

import urllib.parse as _urlparse


# ═══════════════════════════════════════════════════════════
# EXTERNAL DATABASE LOOKUPS
# Each function returns a dict with at least:
#   { "hit": bool, "source": str, "detail": str, "score_delta": float }
# score_delta is added to the heuristic risk/fake score (+ve = more suspicious)
# All functions are safe to call — they catch exceptions and return a no-hit result
# ═══════════════════════════════════════════════════════════

def _ext_no_hit(source: str) -> dict:
    return {"hit": False, "source": source, "detail": "", "score_delta": 0.0}


# ── 1. Google Safe Browsing ────────────────────────────────
# Checks URLs against Google's constantly-updated phishing/malware DB
# Free: 10,000 req/day. Get key: https://developers.google.com/safe-browsing/v4/get-started

def check_google_safe_browsing(url: str) -> dict:
    if not SAFE_BROWSING_API_KEY:
        return _ext_no_hit("google_safe_browsing")
    try:
        api_url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={SAFE_BROWSING_API_KEY}"
        payload = json.dumps({
            "client": {"clientId": "truthguard", "clientVersion": "1.0"},
            "threatInfo": {
                "threatTypes":      ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                "platformTypes":    ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries":    [{"url": url}],
            },
        }).encode()
        req  = urllib.request.Request(api_url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        if data.get("matches"):
            threat = data["matches"][0].get("threatType", "THREAT")
            return {"hit": True, "source": "google_safe_browsing",
                    "detail": f"Listed as {threat} by Google Safe Browsing",
                    "score_delta": 0.6}
        return _ext_no_hit("google_safe_browsing")
    except Exception as e:
        print(f"[GSB ERROR] {e}")
        return _ext_no_hit("google_safe_browsing")


# ── 2. VirusTotal URL lookup ───────────────────────────────
# Checks URL reputation across 90+ antivirus/security engines
# Free: 4 req/min. Get key: https://www.virustotal.com/gui/join-us

def check_virustotal(url: str) -> dict:
    if not VIRUSTOTAL_API_KEY:
        return _ext_no_hit("virustotal")
    try:
        import base64 as _b64
        url_id = _b64.urlsafe_b64encode(url.encode()).rstrip(b"=").decode()
        api_url = f"https://www.virustotal.com/api/v3/urls/{url_id}"
        req = urllib.request.Request(api_url, headers={"x-apikey": VIRUSTOTAL_API_KEY})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
        stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
        malicious  = stats.get("malicious",  0)
        suspicious = stats.get("suspicious", 0)
        total      = sum(stats.values()) or 1
        if malicious + suspicious > 2:
            pct = round((malicious + suspicious) / total * 100)
            return {"hit": True, "source": "virustotal",
                    "detail": f"{malicious} malicious + {suspicious} suspicious out of {total} engines ({pct}%)",
                    "score_delta": min(0.5, (malicious + suspicious) / total * 1.5)}
        return _ext_no_hit("virustotal")
    except Exception as e:
        print(f"[VT ERROR] {e}")
        return _ext_no_hit("virustotal")


# ── 3. PhishTank ───────────────────────────────────────────
# Community-maintained phishing URL database — no API key needed
# https://www.phishtank.com/api_info.php

def check_phishtank(url: str) -> dict:
    if not PHISHTANK_ENABLED:
        return _ext_no_hit("phishtank")
    try:
        encoded_url = urllib.parse.urlencode({"url": url, "format": "json"})
        api_url = f"https://checkurl.phishtank.com/checkurl/?{encoded_url}"
        req = urllib.request.Request(api_url, headers={"User-Agent": "TruthGuard/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        results = data.get("results", {})
        if results.get("in_database") and results.get("valid"):
            return {"hit": True, "source": "phishtank",
                    "detail": "Confirmed phishing URL in PhishTank community database",
                    "score_delta": 0.7}
        return _ext_no_hit("phishtank")
    except Exception as e:
        print(f"[PHISHTANK ERROR] {e}")
        return _ext_no_hit("phishtank")


# ── 4. URLhaus (Abuse.ch) ─────────────────────────────────
# Tracks URLs distributing malware — no key needed
# https://urlhaus-api.abuse.ch/

def check_urlhaus(url: str) -> dict:
    if not URLHAUS_ENABLED:
        return _ext_no_hit("urlhaus")
    try:
        payload = urllib.parse.urlencode({"url": url}).encode()
        req = urllib.request.Request(
            "https://urlhaus-api.abuse.ch/v1/url/",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        if data.get("query_status") == "is_available" and data.get("threat"):
            threat = data.get("threat", "malware")
            return {"hit": True, "source": "urlhaus",
                    "detail": f"URLhaus: listed as {threat} distributor",
                    "score_delta": 0.65}
        return _ext_no_hit("urlhaus")
    except Exception as e:
        print(f"[URLHAUS ERROR] {e}")
        return _ext_no_hit("urlhaus")


# ── 5. ClaimBuster — check-worthiness scoring ─────────────
# Scores how "check-worthy" (factually verifiable) a claim is
# High scores mean it's a specific factual claim that could be true or false
# Free: 100 req/day. Get key: https://idir.uta.edu/claimbuster/

def check_google_fact(text: str) -> dict:
    if not GOOGLE_FACT_CHECK_API:
        return _ext_no_hit("Google Fact Check")
    try:
        # Use first sentence / headline (most claim-dense part)
        claim = text.split(".")[0].strip()[:300]
        # Google Fact Check Tools API: key as query param, query= for the claim
        encoded = urllib.parse.urlencode({"query": claim, "key": GOOGLE_FACT_CHECK_API})
        api_url = f"https://factchecktools.googleapis.com/v1alpha1/claims:search?{encoded}"
        req = urllib.request.Request(api_url, headers={"User-Agent": "TruthGuard/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
        claims_list = data.get("claims", [])
        if claims_list:
            top = claims_list[0]
            reviews = top.get("claimReview", [{}])
            rating = reviews[0].get("textualRating", "") if reviews else ""
            publisher = reviews[0].get("publisher", {}).get("name", "") if reviews else ""
            is_fake = any(kw in rating.lower() for kw in ["false", "fake", "mislead", "incorrect", "pants", "wrong"])
            delta = 0.35 if is_fake else -0.1
            return {"hit": True, "source": "Google Fact Check",
                    "detail": f"Fact-checked by {publisher}: '{rating}'",
                    "score_delta": delta}
        return _ext_no_hit("Google Fact Check")
    except Exception as e:
        print(f"[GOOGLE_FACT_CHECK ERROR] {e}")
        return _ext_no_hit("Google Fact Check")


# ── 6. GDELT — source credibility via event coverage ──────
# Checks if a domain appears in GDELT's news index
# No key needed — free public API: https://blog.gdeltproject.org/gdelt-2-0-our-global-similarity-graph-web-api/

def check_gdelt_domain(domain: str) -> dict:
    global _last_gdelt_call
    if not GDELT_ENABLED or not domain:
        return _ext_no_hit("gdelt")
    # Rate-limit: skip if called too recently (avoids 429s and SSL pile-ups)
    now = time.time()
    if now - _last_gdelt_call < GDELT_MIN_INTERVAL:
        return _ext_no_hit("gdelt")
    _last_gdelt_call = now
    try:
        encoded = urllib.parse.urlencode({"query": f"domain:{domain}", "mode": "ArtList", "maxrecords": "5", "format": "json"})
        api_url = f"https://api.gdeltproject.org/api/v2/doc/doc?{encoded}"
        req = urllib.request.Request(api_url, headers={"User-Agent": "TruthGuard/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:  # reduced from 6s → 3s
            data = json.loads(resp.read().decode())
        articles = data.get("articles", [])
        if articles:
            return {"hit": True, "source": "gdelt",
                    "detail": f"Domain found in GDELT news index ({len(articles)} recent articles) — established news source",
                    "score_delta": -0.15}  # negative = makes it look more legitimate
        return _ext_no_hit("gdelt")
    except Exception as e:
        print(f"[GDELT ERROR] {e}")
        return _ext_no_hit("gdelt")


# ── 7. MediaBias/FactCheck domain lookup ──────────────────
# MBFC doesn't have an official API, but we can search for the domain
# via DuckDuckGo scoped to their site to get a credibility indicator

def check_mediabias_factcheck(domain: str) -> dict:
    if not domain:
        return _ext_no_hit("mediabias_factcheck")
    try:
        query = f"site:mediabiasfactcheck.com {domain}"
        snippet = web_search(query, max_results=2)
        if snippet:
            combined = snippet.lower()
            if any(kw in combined for kw in ["conspiracy", "pseudoscience", "questionable", "fake news", "satire", "propaganda"]):
                return {"hit": True, "source": "mediabias_factcheck",
                        "detail": f"MediaBias/FactCheck flags this domain as low-credibility or conspiracy source",
                        "score_delta": 0.4}
            if any(kw in combined for kw in ["high factual", "very high factual", "mostly factual", "pro-science"]):
                return {"hit": True, "source": "mediabias_factcheck",
                        "detail": "MediaBias/FactCheck rates this domain as high factual credibility",
                        "score_delta": -0.2}
        return _ext_no_hit("mediabias_factcheck")
    except Exception as e:
        print(f"[MBFC ERROR] {e}")
        return _ext_no_hit("mediabias_factcheck")


# ── 8. Botometer — Twitter/X bot detection ────────────────
# Scores how likely an account is a bot using 1000+ features
# Free via RapidAPI (1k req/day): https://rapidapi.com/OSoMe_Team/api/botometer-v4

def check_botometer(username: str, platform: str) -> dict:
    if not BOTOMETER_RAPIDAPI_KEY:
        return _ext_no_hit("botometer")
    # Botometer only works for Twitter/X accounts
    if "twitter" not in platform.lower() and "x" not in platform.lower():
        return _ext_no_hit("botometer")
    try:
        clean_username = username.lstrip("@")
        api_url = f"https://botometer-v4.p.rapidapi.com/4/check_account?user={clean_username}"
        req = urllib.request.Request(api_url, headers={
            "X-RapidAPI-Key":  BOTOMETER_RAPIDAPI_KEY,
            "X-RapidAPI-Host": "botometer-v4.p.rapidapi.com",
        })
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
        score = data.get("cap", {}).get("english", data.get("cap", {}).get("universal", None))
        if score is not None:
            score = float(score)
            if score >= 0.6:
                return {"hit": True, "source": "botometer",
                        "detail": f"Botometer bot probability: {score:.0%} — likely automated account",
                        "score_delta": min(0.5, score * 0.7)}
            elif score <= 0.2:
                return {"hit": True, "source": "botometer",
                        "detail": f"Botometer bot probability: {score:.0%} — likely human account",
                        "score_delta": -0.1}
        return _ext_no_hit("botometer")
    except Exception as e:
        print(f"[BOTOMETER ERROR] {e}")
        return _ext_no_hit("botometer")


# ── 9. Hive Moderation — AI image detection ───────────────
# Dedicated AI-generated image classifier, more accurate than EXIF alone
# Free tier available: https://hivemoderation.com/

def check_hive_ai_image(img_bytes: bytes) -> dict:
    if not HIVE_API_KEY:
        return _ext_no_hit("hive_moderation")
    try:
        import base64 as _b64
        b64_img = _b64.b64encode(img_bytes).decode()
        payload = json.dumps({"image": {"url": f"data:image/jpeg;base64,{b64_img}"}}).encode()
        req = urllib.request.Request(
            "https://api.thehive.ai/api/v2/task/sync",
            data=payload,
            headers={"Content-Type": "application/json", "token": HIVE_API_KEY}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        classes = data.get("status", [{}])[0].get("response", {}).get("output", [{}])[0].get("classes", [])
        for cls in classes:
            if cls.get("class") == "ai_generated":
                hive_score = float(cls.get("score", 0))
                if hive_score >= 0.5:
                    return {"hit": True, "source": "hive_moderation",
                            "detail": f"Hive AI classifier: {hive_score:.0%} AI-generated confidence",
                            "score_delta": hive_score * 0.6,
                            "hive_score": hive_score}
        return _ext_no_hit("hive_moderation")
    except Exception as e:
        print(f"[HIVE ERROR] {e}")
        return _ext_no_hit("hive_moderation")


def _format_ext_signals(results: list[dict]) -> list[str]:
    """Convert external DB results into human-readable signal strings."""
    signals = []
    for r in results:
        if r.get("hit") and r.get("detail"):
            source_label = r["source"].replace("_", " ").title()
            signals.append(f"[{source_label}] {r['detail']}")
    return signals


def _ext_score_delta(results: list[dict]) -> float:
    """Sum score deltas from all external DB hits, capped at ±0.8."""
    delta = sum(r.get("score_delta", 0.0) for r in results if r.get("hit"))
    return max(-0.8, min(0.8, round(delta, 4)))


# ── Official domain whitelist ──────────────────────────────
# These are the REAL domains. Never flag them as suspicious.
# The typosquat check must skip these exact hostnames.
OFFICIAL_SAFE_DOMAINS = {
    "facebook.com", "fb.com", "instagram.com", "threads.net",
    "twitter.com", "x.com", "tiktok.com", "snapchat.com",
    "youtube.com", "google.com", "gmail.com", "google.co.uk",
    "apple.com", "icloud.com", "microsoft.com", "outlook.com",
    "live.com", "hotmail.com", "office.com", "office365.com",
    "amazon.com", "amazon.co.uk", "amazon.de", "amazon.fr",
    "paypal.com", "netflix.com", "spotify.com", "twitch.tv",
    "linkedin.com", "reddit.com", "pinterest.com", "tumblr.com",
    "github.com", "stackoverflow.com", "wikipedia.org",
    "whatsapp.com", "telegram.org", "discord.com", "slack.com",
    "dropbox.com", "zoom.us", "ebay.com", "etsy.com",
    "coinbase.com", "binance.com", "steam.com", "steampowered.com",
    "medium.com", "substack.com", "wordpress.com", "blogger.com",
    "bbc.com", "bbc.co.uk", "cnn.com", "nytimes.com",
    "theguardian.com", "reuters.com", "apnews.com",
}

_SAFE_TLDS  = {".com",".org",".net",".gov",".edu",".io",".co",".uk",".de",".fr",".jp",".ca",".au"}
_RISKY_TLDS = {".xyz",".top",".club",".online",".site",".tk",".ml",".ga",".cf",".gq",".pw",
               ".zip",".mov",".icu",".vip",".cc",".biz",".info",".live"}

_BRAND_KEYWORDS = [
    "paypal","amazon","apple","google","microsoft","facebook","instagram","netflix",
    "bank","secure","verify","login","account","update","confirm","suspended",
    "support","helpdesk","ebay","dropbox","icloud","outlook","office365","steam",
    "coinbase","binance","crypto","wallet","signin","password","recover",
]

# Typosquat patterns — ONLY match substitutions (0 for o, 1 for l, 4 for a)
# NOT the real spelling. Anchored so "facebook" ≠ "faceb0ok".
_TYPOSQUAT_PATTERNS = [
    r"paypa[1!]",                     # paypal → paypa1 / paypa!
    r"amaz[o0]n(?!\.com)",            # amazon → amaz0n (but NOT amazon.com itself)
    r"g[o0]{2}gle",                   # google → g00gle
    r"micros[o0]ft",                  # microsoft → micros0ft
    r"app[1!]e",                      # apple → app1e
    r"faceb[o0]{2}k",                 # facebook → faceb00k (TWO zeros, not letters)
    r"inst[a4]gr[a4]m",              # instagram → inst4gram
    r"netf[1!]ix",                    # netflix → netf1ix
    r"twitt[e3]r",                    # twitter → twitt3r
    r"[yi]0utube",                    # youtube → y0utube
    r"[il1]inkedin",                  # linkedin → 1inkedin
]
_TYPOSQUAT_RE = [re.compile(p, re.IGNORECASE) for p in _TYPOSQUAT_PATTERNS]


def _analyse_url_heuristics(url: str) -> dict:
    signals    = []
    risk_score = 0.0
    url_str    = url.strip()

    if not re.match(r"^https?://", url_str, re.IGNORECASE):
        url_str = "http://" + url_str

    try:
        parsed = _urlparse.urlparse(url_str)
    except Exception:
        return {"signals": ["Could not parse URL"], "risk_score": 0.5,
                "scores": {"phishing": 0.5, "suspicious": 0.3, "legitimate": 0.2},
                "url_parts": {}, "flagged_parts": []}

    hostname = (parsed.hostname or "").lower()
    path     = parsed.path or ""
    query    = parsed.query or ""
    scheme   = parsed.scheme.lower()
    flagged  = []

    # ── Official domain whitelist — never flag the real thing ──
    bare = hostname.lstrip("www.")
    if bare in OFFICIAL_SAFE_DOMAINS:
        return {
            "verdict":       "SAFE",
            "risk_score":    0.0,
            "scores":        {"phishing": 0.0, "suspicious": 0.05, "legitimate": 0.95},
            "signals":       [],
            "url_parts":     {"scheme": scheme, "hostname": hostname,
                              "path": path[:80], "query": query[:120]},
            "flagged_parts": [],
        }

    parts = {
        "scheme":   scheme,
        "hostname": hostname,
        "path":     path[:80] + ("…" if len(path) > 80 else ""),
        "query":    query[:120] + ("…" if len(query) > 120 else ""),
    }

    if scheme == "http":
        signals.append("No HTTPS — connection is unencrypted")
        risk_score += 0.15
        flagged.append("scheme")

    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", hostname):
        signals.append("IP address used instead of domain name")
        risk_score += 0.35
        flagged.append("hostname")

    tld = "." + hostname.rsplit(".", 1)[-1] if "." in hostname else ""
    if tld in _RISKY_TLDS:
        signals.append(f"High-risk TLD '{tld}' commonly used in spam/phishing")
        risk_score += 0.25
        flagged.append("hostname")

    for brand in _BRAND_KEYWORDS:
        if brand in hostname:
            if not re.match(rf"^(www\.)?{re.escape(brand)}\.(com|org|net|co\.uk)$", hostname):
                signals.append(f"Brand keyword '{brand}' in suspicious domain")
                risk_score += 0.3
                flagged.append("hostname")
                break

    for pat in _TYPOSQUAT_RE:
        if pat.search(hostname):
            signals.append("Possible typosquat of a well-known brand domain")
            risk_score += 0.35
            flagged.append("hostname")
            break

    subdomains = hostname.split(".")
    if len(subdomains) > 4:
        signals.append(f"Unusual subdomain depth ({len(subdomains)} levels) — classic phishing pattern")
        risk_score += 0.2
        flagged.append("hostname")

    domain_core = subdomains[-2] if len(subdomains) >= 2 else hostname
    if re.search(r"\d{4,}", domain_core):
        signals.append("Domain contains long numeric string — common in generated phishing domains")
        risk_score += 0.15
        flagged.append("hostname")
    if domain_core.count("-") >= 3:
        signals.append("Domain contains many hyphens — typical of impersonation domains")
        risk_score += 0.15
        flagged.append("hostname")

    phish_path_kw = ["login","signin","verify","confirm","secure","account","update","recover","password","token","auth"]
    for kw in phish_path_kw:
        if kw in path.lower():
            signals.append(f"Path contains sensitive keyword '{kw}'")
            risk_score += 0.1
            flagged.append("path")
            break

    if len(url_str) > 200:
        signals.append("Unusually long URL — often used to hide the true destination")
        risk_score += 0.1

    if url_str.count("%") > 4:
        signals.append("Heavy URL encoding — may be obfuscating the true destination")
        risk_score += 0.15

    free_hosts = ["000webhostapp","weebly","wixsite","blogspot","sites.google","glitch.me",
                  "netlify.app","vercel.app","github.io","firebaseapp","web.app"]
    for fh in free_hosts:
        if fh in hostname:
            signals.append(f"Hosted on free platform '{fh}' — sometimes used for phishing pages")
            risk_score += 0.1
            break

    shorteners = ["bit.ly","tinyurl","t.co","ow.ly","goo.gl","rb.gy","cutt.ly","is.gd","short.io","tiny.cc"]
    for sh in shorteners:
        if hostname == sh or hostname.endswith("." + sh):
            signals.append(f"Shortened URL via '{sh}' — destination is hidden")
            risk_score += 0.12
            break

    risk_score = min(round(risk_score, 4), 1.0)

    if risk_score >= 0.55:
        verdict = "PHISHING"
        scores  = {"phishing": risk_score,
                   "suspicious": round((1 - risk_score) * 0.6, 4),
                   "legitimate": round((1 - risk_score) * 0.4, 4)}
    elif risk_score >= 0.25:
        verdict = "SUSPICIOUS"
        scores  = {"phishing": round(risk_score * 0.5, 4),
                   "suspicious": risk_score,
                   "legitimate": round(1 - risk_score, 4)}
    else:
        verdict = "SAFE"
        scores  = {"phishing": round(risk_score * 0.3, 4),
                   "suspicious": round(risk_score * 0.5, 4),
                   "legitimate": round(1 - risk_score, 4)}

    return {
        "verdict":       verdict,
        "risk_score":    risk_score,
        "scores":        scores,
        "signals":       signals,
        "url_parts":     parts,
        "flagged_parts": list(set(flagged)),
    }


def _gemini_analyse_url(url: str, heuristic: dict) -> dict:
    """
    Gemini URL analysis grounded with live DuckDuckGo web search.
    Runs three targeted searches for domain reputation, scam reports,
    and brand-impersonation evidence before asking Gemini to reason.
    """
    import urllib.parse as _up
    try:
        hostname = _up.urlparse(url if "://" in url else "http://" + url).hostname or url
    except Exception:
        hostname = url

    queries = [
        f'"{hostname}" scam phishing fraud report',
        f'"{hostname}" site:scamadviser.com OR site:virustotal.com OR site:urlvoid.com',
        f'"{hostname}" review is it safe legitimate',
    ]

    search_results = {}
    for q in queries:
        result = web_search(q, max_results=5)
        if result:
            search_results[q] = result

    if search_results:
        web_section = "\n\nLive web search results (fetched RIGHT NOW — treat as ground truth):\n"
        for q, res in search_results.items():
            web_section += f"\nSearch: {q}\n{res}\n"
    else:
        web_section = "\n\n(No live web results found — rely on URL structure and training knowledge.)\n"

    signal_str = "\n".join(f"- {s}" for s in heuristic["signals"]) or "None detected."

    prompt = (
        f"You are a cybersecurity expert specialising in phishing and domain fraud."
        f" Today is {time.strftime('%B %d, %Y')}.\n\n"
        f"URL: {url}\nHostname: {hostname}\n\n"
        f"Heuristic signals:\n{signal_str}\n"
        f"Heuristic risk score: {heuristic['risk_score']} (0=safe 1=phishing)\n"
        f"{web_section}\n"
        f"Instructions:\n"
        f"- Web results above are real live evidence fetched right now.\n"
        f"- Scam/phishing reports in the results = very strong PHISHING evidence.\n"
        f"- Clean reputation checker results = lean SAFE.\n"
        f"- No results + suspicious heuristics = SUSPICIOUS.\n"
        f"- Do NOT visit the URL. Analyse URL string + web evidence only.\n\n"
        f"Respond ONLY with valid JSON, no markdown:\n"
        f'{{"verdict":"PHISHING or SUSPICIOUS or SAFE",'
        f'"confidence":0.0-1.0,'
        f'"phishing_score":0.0-1.0,'
        f'"suspicious_score":0.0-1.0,'
        f'"legitimate_score":0.0-1.0,'
        f'"additional_signals":["signal 1","signal 2"],'
        f'"reasoning":"2-3 sentences citing specific web evidence or URL patterns"}}'
    )

    tried = 0
    while tried < len(GEMINI_API_KEYS):
        key = get_next_gemini_key()
        if not key:
            break
        tried += 1
        try:
            client   = genai.Client(api_key=key)
            response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
            raw  = re.sub(r"```json|```", "", response.text.strip()).strip()
            data = json.loads(raw)
            print(f"[GEMINI URL] Key ...{key[-6:]} OK — verdict={data.get('verdict')}")
            return {
                "verdict":            data.get("verdict", "SUSPICIOUS").upper(),
                "confidence":         round(float(data.get("confidence",      0.5)),  4),
                "scores": {
                    "phishing":   round(float(data.get("phishing_score",   0.33)), 4),
                    "suspicious": round(float(data.get("suspicious_score", 0.33)), 4),
                    "legitimate": round(float(data.get("legitimate_score", 0.34)), 4),
                },
                "additional_signals": data.get("additional_signals", []),
                "reasoning":          data.get("reasoning", ""),
                "web_searched":       bool(search_results),
            }
        except Exception as e:
            print(f"[GEMINI URL ERROR] Key ...{key[-6:]}: {e}")
            if _is_auth_error(e):
                _blacklist_key(key)
    return {}


# ═══════════════════════════════════════════════════════════
# FAKE PROFILE IDENTIFIER — helpers
# ═══════════════════════════════════════════════════════════

def _profile_heuristics(data: dict) -> dict:
    signals    = []
    fake_score = 0.0

    username  = (data.get("username") or "").strip()
    age       = (data.get("account_age") or "").lower()
    followers = (data.get("followers") or "").lower()
    posts     = (data.get("post_count") or "").lower()
    photo     = (data.get("photo_type") or "").lower()
    bio       = (data.get("bio") or "")
    samples   = (data.get("sample_posts") or "")
    other     = (data.get("other") or "").lower()

    if re.search(r"\d{4,}", username):
        signals.append("Username contains long numeric string — bot-name pattern")
        fake_score += 0.2
    if re.search(r"[_\-]{2,}", username):
        signals.append("Username has consecutive underscores/hyphens — common in generated accounts")
        fake_score += 0.1

    if any(kw in age for kw in ["day", "hour", "minute", "week"]):
        signals.append("Very new account — recently created accounts are common for bots/fake profiles")
        fake_score += 0.25

    nums = re.findall(r"[\d,]+", followers)
    if len(nums) >= 2:
        try:
            f1 = int(nums[0].replace(",", ""))
            f2 = int(nums[1].replace(",", ""))
            if f1 < 50 and f2 > 500:
                signals.append(f"Extreme follower/following imbalance ({f1} followers, {f2} following) — bot pattern")
                fake_score += 0.3
            elif f1 > 10000 and f2 < 10:
                signals.append("Unusually high follower count with very few following — could be purchased followers")
                fake_score += 0.2
        except Exception:
            pass

    post_nums = re.findall(r"[\d,]+", posts)
    if post_nums:
        try:
            pc = int(post_nums[0].replace(",", ""))
            if pc > 10000 and any(kw in age for kw in ["month", "day", "week"]):
                signals.append("Extremely high post count for a new account — suggests automated posting")
                fake_score += 0.3
            elif pc < 3:
                signals.append("Very few or no posts — dormant or newly activated account")
                fake_score += 0.15
        except Exception:
            pass

    if "ai-generated" in photo or "perfect" in photo:
        signals.append("Profile photo described as AI-generated — strong fake indicator")
        fake_score += 0.4
    elif "stock" in photo:
        signals.append("Stock-photo-style profile picture — common in fake profiles")
        fake_score += 0.25
    elif "celebrity" in photo:
        signals.append("Impersonating a celebrity with their photo — clear fake signal")
        fake_score += 0.45
    elif "default" in photo or "no photo" in photo:
        signals.append("No profile photo — anonymous or quickly created account")
        fake_score += 0.1

    if bio:
        if len(bio) < 10:
            signals.append("Very short or empty bio — common in bot accounts")
            fake_score += 0.1
        generic_bio_kw = ["entrepreneur","investor","crypto","nft","dm for collab","link in bio","follow back","official"]
        for kw in generic_bio_kw:
            if kw in bio.lower():
                signals.append(f"Generic bio keyword '{kw}' — common in spam/bot profiles")
                fake_score += 0.1
                break
        if re.search(r"(follow me|follow back|f4f|l4l)", bio, re.IGNORECASE):
            signals.append("Bio contains 'follow-for-follow' language — engagement-farming pattern")
            fake_score += 0.15

    if samples:
        lines = [l.strip() for l in samples.split("\n") if l.strip()]
        if len(lines) >= 2 and len(set(lines)) < len(lines):
            signals.append("Duplicate posts detected — bot reposting pattern")
            fake_score += 0.25
        combined = " ".join(lines).lower()
        spam_kw = ["click here","earn money","free","giveaway","win","limited offer","dm me","check bio","link in bio"]
        for kw in spam_kw:
            if kw in combined:
                signals.append(f"Post contains spam/scam language: '{kw}'")
                fake_score += 0.2
                break

    if any(kw in other for kw in ["3am", "instant", "identical"]):
        signals.append("Behavioural pattern consistent with automated bot activity")
        fake_score += 0.25

    fake_score = min(round(fake_score, 4), 1.0)

    # Raised thresholds: heuristics alone are noisy, be conservative.
    # Gemini will refine these for borderline cases.
    if fake_score >= 0.6:
        verdict = "FAKE"
    elif fake_score >= 0.35:
        verdict = "SUSPICIOUS"
    else:
        verdict = "AUTHENTIC"

    return {"verdict": verdict, "fake_score": fake_score, "signals": signals}


def _gemini_analyse_profile(data: dict, heuristic: dict) -> dict:
    """
    Gemini profile analysis grounded with live DuckDuckGo web search.
    Searches for the username/handle across platforms, checks for
    known bot networks, and looks for any real-world presence of the person.
    """
    username = (data.get("username") or "").strip().lstrip("@")
    platform = (data.get("platform") or "")
    bio      = (data.get("bio") or "")[:200]

    # ── Build targeted searches ─────────────────────────────
    queries = []

    if username:
        if platform:
            queries.append(f'"{username}" {platform} fake bot account')
            queries.append(f'"{username}" {platform} profile')
        else:
            queries.append(f'"{username}" social media fake bot account')
            queries.append(f'"{username}" who is real person')

    if bio and len(bio) > 20:
        # Search a fragment of the bio — bots often share identical bios
        bio_fragment = bio[:80].strip()
        queries.append(f'"{bio_fragment}" bot spam fake account')

    search_results = {}
    for q in queries[:4]:   # cap at 4 searches
        result = web_search(q, max_results=5)
        if result:
            search_results[q] = result

    if search_results:
        web_section = "\n\nLive web search results (fetched RIGHT NOW — treat as ground truth):\n"
        for q, res in search_results.items():
            web_section += f"\nSearch: {q}\n{res}\n"
    else:
        web_section = "\n\n(No live web search results found — rely on profile data and training knowledge.)\n"

    profile_text = "\n".join(f"{k}: {v}" for k, v in data.items() if v)
    signal_str   = "\n".join(f"- {s}" for s in heuristic["signals"]) or "None"

    prompt = (
        f"You are a social-media forensics expert detecting fake accounts, bots, and coordinated"
        f" inauthentic behaviour. Today is {time.strftime('%B %d, %Y')}.\n\n"
        f"Profile information provided:\n{profile_text}\n\n"
        f"Heuristic signals:\n{signal_str}\n"
        f"Heuristic fake score: {heuristic['fake_score']} (0=authentic 1=definitely fake)\n"
        f"{web_section}\n"
        f"Instructions:\n"
        f"- Web results above were fetched RIGHT NOW and are real live evidence.\n"
        f"- If search results show NO real-world presence for this username = suspicious/fake signal.\n"
        f"- If results show scam/bot reports for this username = strong FAKE/BOT evidence.\n"
        f"- If results show a real, established person with genuine posts = lean AUTHENTIC.\n"
        f"- If the bio text matches known bot/spam content found in web results = BOT.\n"
        f"- Weigh the live web evidence heavily alongside the heuristic signals.\n\n"
        f"Respond ONLY with valid JSON, no markdown:\n"
        f'{{"verdict":"FAKE or BOT or SUSPICIOUS or AUTHENTIC",'
        f'"confidence":0.0-1.0,'
        f'"fake_score":0.0-1.0,'
        f'"suspicious_score":0.0-1.0,'
        f'"authentic_score":0.0-1.0,'
        f'"additional_signals":["signal from web evidence 1","signal 2"],'
        f'"reasoning":"2-3 sentences citing specific web evidence or profile patterns"}}'
    )

    tried = 0
    while tried < len(GEMINI_API_KEYS):
        key = get_next_gemini_key()
        if not key:
            break
        tried += 1
        try:
            client   = genai.Client(api_key=key)
            response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
            raw  = re.sub(r"```json|```", "", response.text.strip()).strip()
            d    = json.loads(raw)
            print(f"[GEMINI PROFILE] Key ...{key[-6:]} OK — verdict={d.get('verdict')}")
            return {
                "verdict":    d.get("verdict", "SUSPICIOUS").upper(),
                "confidence": round(float(d.get("confidence", 0.5)), 4),
                "scores": {
                    "fake":       round(float(d.get("fake_score",       0.33)), 4),
                    "suspicious": round(float(d.get("suspicious_score", 0.33)), 4),
                    "authentic":  round(float(d.get("authentic_score",  0.34)), 4),
                },
                "additional_signals": d.get("additional_signals", []),
                "reasoning":          d.get("reasoning", ""),
                "web_searched":       bool(search_results),
            }
        except Exception as e:
            print(f"[GEMINI PROFILE ERROR] Key ...{key[-6:]}: {e}")
            if _is_auth_error(e):
                _blacklist_key(key)
    return {}


# ═══════════════════════════════════════════════════════════
# ROUTE — Tools page
# ═══════════════════════════════════════════════════════════

@app.route("/tools")
def tools():
    return render_template("tools.html")


# ═══════════════════════════════════════════════════════════
# ROUTE — Fake Link Detection
# ═══════════════════════════════════════════════════════════

@app.route("/api/detect-link", methods=["POST"])
def detect_link():
    data = request.get_json(silent=True)
    if not data or not data.get("url", "").strip():
        return jsonify({"error": "No URL provided."}), 400

    url = data["url"].strip()
    if len(url) > 2048:
        return jsonify({"error": "URL too long."}), 400

    # Check cache first — extension may scan same URL many times
    ck = _cache_key(url)
    cached = _cache_get(ck)
    if cached:
        print(f"[CACHE HIT] URL {url[:60]}")
        return jsonify(cached)

    try:
        heuristic     = _analyse_url_heuristics(url)
        gemini_result = {}
        if GEMINI_AVAILABLE and GEMINI_API_KEYS:
            gemini_result = _gemini_analyse_url(url, heuristic)

        if gemini_result:
            all_signals = heuristic["signals"] + gemini_result.get("additional_signals", [])
            seen = set()
            signals    = [s for s in all_signals if not (s in seen or seen.add(s))]
            scores     = {
                "phishing":   round(heuristic["scores"]["phishing"]   * 0.4 + gemini_result["scores"]["phishing"]   * 0.6, 4),
                "suspicious": round(heuristic["scores"]["suspicious"] * 0.4 + gemini_result["scores"]["suspicious"] * 0.6, 4),
                "legitimate": round(heuristic["scores"]["legitimate"] * 0.4 + gemini_result["scores"]["legitimate"] * 0.6, 4),
            }
            verdict    = gemini_result["verdict"]
            risk_score = scores["phishing"]
            reasoning  = gemini_result.get("reasoning", "")
            source     = "heuristics+gemini"
        else:
            signals    = heuristic["signals"]
            risk_score = heuristic["risk_score"]
            verdict    = heuristic["verdict"]
            scores     = heuristic["scores"]
            reasoning  = "Heuristic analysis only (Gemini unavailable)."
            source     = "heuristics"

        # ── External DB checks for URL ────────────────────────
        ext_results = [
            check_google_safe_browsing(url),
            check_virustotal(url),
            check_phishtank(url),
            check_urlhaus(url),
        ]
        # Also check domain-level credibility
        try:
            _hostname = _urlparse.urlparse(url if "://" in url else "http://" + url).hostname or ""
            ext_results.append(check_gdelt_domain(_hostname))
            ext_results.append(check_mediabias_factcheck(_hostname))
        except Exception:
            pass

        ext_signals  = _format_ext_signals(ext_results)
        ext_delta    = _ext_score_delta(ext_results)

        # Hard escalation: if any authoritative DB flags it, override verdict
        hard_hits = [r for r in ext_results if r.get("hit") and r.get("score_delta", 0) >= 0.5]
        if hard_hits:
            verdict    = "PHISHING"
            risk_score = min(1.0, round(risk_score + ext_delta, 4))

        all_signals = list(dict.fromkeys(signals + ext_signals))

        result_out = {
            "url":           url,
            "verdict":       verdict,
            "risk_score":    risk_score,
            "scores":        scores,
            "signals":       all_signals,
            "reasoning":     reasoning,
            "url_parts":     heuristic.get("url_parts", {}),
            "flagged_parts": heuristic.get("flagged_parts", []),
            "source":        source,
            "ext_db_hits":   [r["source"] for r in ext_results if r.get("hit")],
        }
        _cache_set(ck, result_out)
        return jsonify(result_out)

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ═══════════════════════════════════════════════════════════
# ROUTE — Fake Profile Detection
# ═══════════════════════════════════════════════════════════

@app.route("/api/detect-profile", methods=["POST"])
def detect_profile():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No data provided."}), 400

    if not any(data.get(f, "").strip() for f in ["username", "bio", "sample_posts"]):
        return jsonify({"error": "Provide at least a username, bio, or sample posts."}), 400

    try:
        heuristic     = _profile_heuristics(data)
        gemini_result = {}
        if GEMINI_AVAILABLE and GEMINI_API_KEYS:
            gemini_result = _gemini_analyse_profile(data, heuristic)

        if gemini_result:
            all_signals = heuristic["signals"] + gemini_result.get("additional_signals", [])
            seen = set()
            signals    = [s for s in all_signals if not (s in seen or seen.add(s))]
            scores     = {
                "fake":       round(heuristic["fake_score"] * 0.35 + gemini_result["scores"]["fake"]       * 0.65, 4),
                "suspicious": round((1 - heuristic["fake_score"]) * 0.35 * 0.5 + gemini_result["scores"]["suspicious"] * 0.65, 4),
                "authentic":  round((1 - heuristic["fake_score"]) * 0.35 * 0.5 + gemini_result["scores"]["authentic"]  * 0.65, 4),
            }
            verdict    = gemini_result["verdict"]
            confidence = gemini_result["confidence"]
            reasoning  = gemini_result.get("reasoning", "")
            source     = "heuristics+gemini"
        else:
            signals    = heuristic["signals"]
            fake_score = heuristic["fake_score"]
            verdict    = heuristic["verdict"]
            scores     = {"fake": fake_score, "suspicious": round(fake_score * 0.4, 4), "authentic": round(1 - fake_score, 4)}
            confidence = fake_score if verdict in ("FAKE", "BOT") else round(1 - fake_score, 4)
            reasoning  = "Heuristic analysis only (Gemini unavailable)."
            source     = "heuristics"

        # ── External DB checks for profile ───────────────────
        username = data.get("username", "").strip()
        platform = data.get("platform", "")
        ext_results = [check_botometer(username, platform)]
        ext_signals  = _format_ext_signals(ext_results)
        ext_delta    = _ext_score_delta(ext_results)

        final_confidence = confidence
        if ext_delta > 0:
            final_confidence = min(1.0, round(confidence + ext_delta * 0.4, 4))
            if ext_delta >= 0.3 and verdict == "SUSPICIOUS":
                verdict = "BOT"
        elif ext_delta < 0 and verdict == "AUTHENTIC":
            final_confidence = min(1.0, round(confidence + abs(ext_delta) * 0.2, 4))

        all_signals = list(dict.fromkeys(signals + ext_signals))

        return jsonify({
            "verdict":    verdict,
            "confidence": final_confidence,
            "scores":     scores,
            "signals":    all_signals,
            "reasoning":  reasoning,
            "source":     source,
            "ext_db_hits": [r["source"] for r in ext_results if r.get("hit")],
        })

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)