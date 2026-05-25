// ═══════════════════════════════════════════════════════════
// TruthGuard — Content Script
// ═══════════════════════════════════════════════════════════

let lastScanResult  = null;
let lastScannedText = "";       // track what was last sent to avoid re-scanning identical content
let scanDebounceTimer = null;
let isScanning = false;

// ── Mode helper ────────────────────────────────────────────
function getMode(cb) {
  chrome.runtime.sendMessage({ type: "GET_MODE" }, res => {
    cb(res?.mode || "manual");
  });
}

// ══════════════════════════════════════════════════════════
// TEXT EXTRACTION
// ══════════════════════════════════════════════════════════

function extractArticleText() {
  const selectors = [
    "article",
    '[role="main"]',
    "main",
    ".article-body",
    ".post-content",
    ".entry-content",
    ".story-body",
    ".article__body",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const text = el.innerText.trim();
      if (text.length > 150) return text.slice(0, 4000);
    }
  }
  const paras = Array.from(document.querySelectorAll("p"))
    .map(p => p.innerText.trim())
    .filter(t => t.length > 40)
    .join(" ");
  return paras.slice(0, 4000);
}

// ── Fingerprint text to avoid redundant API calls ──────────
function textFingerprint(text) {
  // Use first+last 100 chars + length as a cheap fingerprint
  return `${text.length}|${text.slice(0, 100)}|${text.slice(-100)}`;
}

// ══════════════════════════════════════════════════════════
// INLINE PARAGRAPH FLAGGING
// Only highlights individual <p> tags that look fake/misinformative.
// Does NOT show a banner for real/uncertain content.
// ══════════════════════════════════════════════════════════

const FLAGGED_ATTR = "data-tg-flagged";
const SCANNED_ATTR = "data-tg-para-scanned";

// Paragraphs already flagged won't be re-scanned unless text changed
function getUnscannedParagraphs() {
  return Array.from(document.querySelectorAll("p")).filter(p => {
    const text = p.innerText.trim();
    if (text.length < 80) return false;                       // too short to judge
    if (p.dataset.tgParaScanned === text.slice(0, 60)) return false; // already scanned this exact text
    return true;
  });
}

function markParagraphFake(p, confidence, reasoning) {
  p.style.outline        = "2px solid rgba(255,61,90,0.55)";
  p.style.outlineOffset  = "3px";
  p.style.borderRadius   = "3px";
  p.style.backgroundColor= "rgba(255,61,90,0.05)";
  p.setAttribute(FLAGGED_ATTR, "fake");

  // Inline tooltip badge
  if (!p.querySelector(".tg-para-badge")) {
    const badge = document.createElement("span");
    badge.className = "tg-para-badge";
    badge.style.cssText = `
      display:inline-block;margin-left:6px;padding:1px 6px;
      background:rgba(255,61,90,0.15);border:1px solid rgba(255,61,90,0.35);
      border-radius:4px;font-size:0.7em;color:#f87171;
      font-family:monospace;vertical-align:middle;cursor:default;
    `;
    badge.textContent = `⚠ ${Math.round(confidence * 100)}% fake`;
    badge.title = reasoning || "TruthGuard flagged this as potentially false.";
    p.appendChild(badge);
  }
}

function clearParagraphFlag(p) {
  p.style.outline         = "";
  p.style.outlineOffset   = "";
  p.style.borderRadius    = "";
  p.style.backgroundColor = "";
  p.removeAttribute(FLAGGED_ATTR);
  const badge = p.querySelector(".tg-para-badge");
  if (badge) badge.remove();
}

// Scan individual paragraphs — only flag FAKE ones, stay silent otherwise
async function scanParagraphs(paragraphs) {
  // Batch: send all at once as one request with numbered paragraphs
  // so we don't hammer the API with dozens of tiny requests
  if (!paragraphs.length) return;

  const BATCH_SIZE = 5; // scan up to 5 new paragraphs at a time
  const batch = paragraphs.slice(0, BATCH_SIZE);

  for (const p of batch) {
    const text = p.innerText.trim();
    p.dataset.tgParaScanned = text.slice(0, 60); // mark as scanned

    chrome.runtime.sendMessage({ type: "API_DETECT_TEXT", text }, res => {
      if (!res || !res.ok) return;
      const d = res.data;
      if (d.label === "FAKE" && (d.confidence || 0) >= 0.70) {
        markParagraphFake(p, d.confidence, d.reasoning);
      } else {
        // If it was previously flagged but now passes, clean it up
        if (p.getAttribute(FLAGGED_ATTR)) clearParagraphFlag(p);
      }
    });
  }
}

// ══════════════════════════════════════════════════════════
// PAGE-LEVEL SCAN (for banner — only shows on FAKE)
// ══════════════════════════════════════════════════════════

function scanPageText(text) {
  if (isScanning) return;
  const fp = textFingerprint(text);
  if (fp === lastScannedText) return;   // content hasn't meaningfully changed
  lastScannedText = fp;
  isScanning = true;

  chrome.runtime.sendMessage({ type: "API_DETECT_TEXT", text }, res => {
    isScanning = false;
    if (!res || !res.ok) return;
    const d = res.data;
    lastScanResult = d;

    // ONLY show banner if actually FAKE — stay silent for real/uncertain
    if (d.label === "FAKE") {
      injectBanner(d);
    } else {
      // Remove any stale banner if page content changed and now passes
      removeBanner();
    }
  });
}

// ══════════════════════════════════════════════════════════
// CONTINUOUS SCANNING ENGINE
// Watches the DOM for meaningful content changes and re-scans
// ══════════════════════════════════════════════════════════

let significantChangeCount = 0;

function onDOMChange(mutations) {
  // Only care about mutations that added real text content, not style/attribute noise
  let addedTextLength = 0;
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType === Node.TEXT_NODE) addedTextLength += node.textContent.length;
      else if (node.nodeType === Node.ELEMENT_NODE) addedTextLength += (node.innerText || "").length;
    }
  }

  if (addedTextLength < 100) return; // ignore tiny DOM tweaks

  significantChangeCount++;

  // Debounce: wait 2s after last significant change before scanning
  clearTimeout(scanDebounceTimer);
  scanDebounceTimer = setTimeout(() => {
    getMode(mode => {
      if (mode === "always-off") return;

      // Scan new/changed paragraphs individually (inline flagging)
      const unscanned = getUnscannedParagraphs();
      if (unscanned.length) scanParagraphs(unscanned);

      // Re-run full page scan if in Always On mode
      if (mode === "always-on") {
        const text = extractArticleText();
        if (text.length >= 150) scanPageText(text);
      }
    });
  }, 2000);
}

// ══════════════════════════════════════════════════════════
// BANNER (only injected for FAKE pages)
// ══════════════════════════════════════════════════════════

function injectBanner(result) {
  removeBanner();
  lastScanResult = result;

  const confPct   = Math.round((result.confidence || 0) * 100);
  const source    = result.source || "";
  const reasoning = result.reasoning || "";

  const banner = document.createElement("div");
  banner.id = "truthguard-banner";
  banner.style.cssText = `
    all: initial;
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 2147483647;
    background: #1a0608;
    border-bottom: 2px solid #7f1d1d;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
  `;

  banner.innerHTML = `
    <span style="font-size:1.1rem;flex-shrink:0;">⚠</span>
    <span style="color:#f87171;font-weight:700;font-size:0.82rem;letter-spacing:0.08em;flex-shrink:0;">
      TRUTHGUARD: POTENTIALLY FAKE
    </span>
    <span style="color:rgba(255,255,255,0.5);font-size:0.78rem;flex-shrink:0;">
      ${confPct}% confidence${source ? " · " + source : ""}
    </span>
    ${reasoning ? `<span style="color:rgba(255,255,255,0.4);font-size:0.76rem;flex:1;min-width:120px;">${reasoning}</span>` : ""}
    <button id="tg-banner-close" style="
      all:initial;margin-left:auto;cursor:pointer;
      color:rgba(255,255,255,0.35);font-size:1rem;padding:2px 6px;
      border-radius:4px;border:1px solid rgba(255,255,255,0.1);
      background:rgba(255,255,255,0.04);
      font-family:monospace;line-height:1;flex-shrink:0;
    ">✕</button>
  `;

  document.body.prepend(banner);
  document.body.style.marginTop = banner.offsetHeight + "px";
  banner.querySelector("#tg-banner-close").addEventListener("click", removeBanner);
}

function removeBanner() {
  const el = document.getElementById("truthguard-banner");
  if (el) { el.remove(); document.body.style.marginTop = ""; }
}

// ══════════════════════════════════════════════════════════
// SUSPICIOUS LINK HIGHLIGHTING
// ══════════════════════════════════════════════════════════

const SUSPICIOUS_PATTERNS = [
  /bit\.ly|tinyurl|t\.co|ow\.ly|goo\.gl|buff\.ly|rb\.gy|is\.gd|cutt\.ly/i,
  /[a-z0-9-]{2,}\.(xyz|tk|ml|ga|cf|gq|pw|top|click|download|loan|win|stream)/i,
  /login|verify|secure|account|update|confirm|banking|paypal|amazon|apple|microsoft/i,
  /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/,
  /%[0-9a-f]{2}/i,
];

function highlightSuspiciousLinks() {
  document.querySelectorAll("a[href]").forEach(link => {
    if (link.dataset.tgScanned) return;
    link.dataset.tgScanned = "1";
    const href = link.href || "";
    const matchCount = SUSPICIOUS_PATTERNS.filter(p => p.test(href)).length;
    if (matchCount >= 2) {
      link.style.outline = "2px solid #f87171";
      link.style.outlineOffset = "2px";
      link.title = `⚠ TruthGuard: Suspicious link (${matchCount} signals). Right-click → Check this link.`;
    }
  });
}

// ══════════════════════════════════════════════════════════
// MESSAGE LISTENER
// ══════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "EXTRACT_AND_SCAN") {
    getMode(mode => {
      if (mode === "always-off") {
        sendResponse({ ok: false, error: "TruthGuard is disabled." });
        return;
      }
      const text = extractArticleText();
      if (!text || text.length < 30) {
        sendResponse({ ok: false, error: "Not enough article text found on this page." });
        return;
      }
      chrome.runtime.sendMessage({ type: "API_DETECT_TEXT", text }, res => {
        if (res && res.ok) {
          lastScanResult = res.data;
          // Banner only on FAKE
          if (res.data.label === "FAKE") injectBanner(res.data);
          else removeBanner();
          sendResponse({ ok: true, data: res.data });
        } else {
          sendResponse({ ok: false, error: res?.error || "API error" });
        }
      });
    });
    return true;
  }

  if (msg.type === "GET_PAGE_TEXT")   { sendResponse({ text: extractArticleText() }); }
  if (msg.type === "GET_LAST_RESULT") { sendResponse({ result: lastScanResult }); }
  if (msg.type === "REMOVE_BANNER")   { removeBanner(); sendResponse({ ok: true }); }
  if (msg.type === "INJECT_BANNER_DATA") { sendResponse({ ok: true }); }

  if (msg.type === "HIGHLIGHT_LINKS") {
    highlightSuspiciousLinks();
    sendResponse({ ok: true });
  }
});

// ══════════════════════════════════════════════════════════
// INIT — start passive scanning if not disabled
// ══════════════════════════════════════════════════════════

getMode(mode => {
  if (mode === "always-off") return;

  // Initial link highlight + paragraph scan
  highlightSuspiciousLinks();
  scanParagraphs(getUnscannedParagraphs());

  // Initial full-page scan in Always On mode
  if (mode === "always-on") {
    const text = extractArticleText();
    if (text.length >= 150) scanPageText(text);
  }

  // Watch for DOM changes (infinite scroll, SPAs, dynamic content)
  const observer = new MutationObserver(onDOMChange);
  observer.observe(document.body, { childList: true, subtree: true });
});
