// ═══════════════════════════════════════════════════════════
// TruthGuard Extension — Popup Script
// Handles: News, Link, Profile, Page tabs
// ═══════════════════════════════════════════════════════════

// ── Tab switching ──────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );
  document.querySelectorAll(".panel").forEach(p =>
    p.classList.toggle("active", p.id === `tab-${tab}`)
  );
}

// ── Helpers ────────────────────────────────────────────────
function setBar(barId, pctId, val) {
  const pct = ((val || 0) * 100).toFixed(1);
  const el = document.getElementById(barId);
  const pe = document.getElementById(pctId);
  if (el) el.style.width = pct + "%";
  if (pe) pe.textContent = pct + "%";
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = "⚠  " + msg; el.classList.add("visible"); }
}
function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("visible");
}

function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function setVerdict(stripId, verdictId, confId, { label, confidence, colorClass, icon, text }) {
  const strip   = document.getElementById(stripId);
  const verdict = document.getElementById(verdictId);
  const conf    = document.getElementById(confId);
  if (strip)   { strip.className   = `verdict-strip ${colorClass}`; }
  if (verdict) { verdict.className = `verdict-label-ext ${colorClass}`; verdict.innerHTML = `${icon} ${text}`; }
  if (conf)    { conf.textContent  = Math.round((confidence || 0) * 100) + "%"; }
}

function renderSignals(containerId, signals, verdict) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  if (!signals || signals.length === 0) {
    el.innerHTML = '<span class="sig-none">No specific signals detected.</span>';
    return;
  }
  signals.forEach(sig => {
    const tag = document.createElement("span");
    const cls = verdict === "FAKE" || verdict === "PHISHING" || verdict === "BOT"
      ? "sig-fake"
      : verdict === "SUSPICIOUS" ? "sig-warn" : "sig-safe";
    tag.className = `sig-tag ${cls}`;
    tag.textContent = sig;
    el.appendChild(tag);
  });
}

// ── Mode management ────────────────────────────────────────
const MODE_PILL_MAP = {
  "always-on": { id: "modeOn",     cls: "active-on"     },
  "manual":    { id: "modeManual", cls: "active-manual"  },
  "always-off":{ id: "modeOff",    cls: "active-off"     },
};

function applyMode(mode) {
  // Update pill highlights
  Object.values(MODE_PILL_MAP).forEach(({ id, cls }) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active-on", "active-manual", "active-off");
  });
  const active = MODE_PILL_MAP[mode];
  if (active) {
    const el = document.getElementById(active.id);
    if (el) el.classList.add(active.cls);
  }

  // Grey out UI when disabled
  document.body.classList.toggle("mode-off", mode === "always-off");
}

function setMode(mode) {
  chrome.runtime.sendMessage({ type: "SET_MODE", mode }, () => {
    applyMode(mode);
  });
}

function loadMode() {
  chrome.runtime.sendMessage({ type: "GET_MODE" }, res => {
    applyMode(res?.mode || "manual");
  });
}

// ── Status check ───────────────────────────────────────────
function checkStatus() {
  chrome.runtime.sendMessage({ type: "API_STATUS" }, res => {
    const dot   = document.getElementById("statusDot");
    const label = document.getElementById("statusLabel");
    if (res && res.ok) {
      dot.className   = "status-dot online";
      label.textContent = "server online";
    } else {
      dot.className   = "status-dot offline";
      label.textContent = "server offline";
    }
  });
}

// ── Load current page URL & any pending data ───────────────
function loadPageContext() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (!tab) return;
    const urlEl = document.getElementById("pageUrl");
    if (urlEl) {
      urlEl.textContent = tab.url || "—";
      urlEl.title = tab.url || "";
    }
    // Check if there's already a scan result for this tab
    chrome.tabs.sendMessage(tab.id, { type: "GET_LAST_RESULT" }, res => {
      if (chrome.runtime.lastError) return;
      if (res && res.result) renderPageResult(res.result);
    });
  });

  // Check for pending text or link (from context menu)
  chrome.storage.session.get(["pendingText", "pendingLink"], items => {
    if (items.pendingText) {
      document.getElementById("newsText").value = items.pendingText;
      switchTab("news");
      chrome.storage.session.remove("pendingText");
    }
    if (items.pendingLink) {
      document.getElementById("linkUrl").value = items.pendingLink;
      switchTab("link");
      chrome.storage.session.remove("pendingLink");
    }
  });
}

// ═══════════════════════════════════════════════════════════
// NEWS ANALYSER
// ═══════════════════════════════════════════════════════════
async function analyseNews() {
  const text = document.getElementById("newsText").value.trim();
  if (!text) { showError("newsError", "Please paste some text first."); return; }
  if (text.length < 10) { showError("newsError", "Text too short — add a bit more context."); return; }

  const btn  = document.getElementById("newsBtn");
  const spin = document.getElementById("newsSpinner");
  const btxt = document.getElementById("newsBtnText");
  hideError("newsError");
  document.getElementById("newsResult").classList.remove("visible");
  btn.disabled = true; spin.classList.add("visible"); btxt.textContent = "Analysing…";

  chrome.runtime.sendMessage({ type: "API_DETECT_TEXT", text }, res => {
    btn.disabled = false; spin.classList.remove("visible"); btxt.textContent = "Analyse Text →";
    if (!res || !res.ok) {
      showError("newsError", res?.error || "Could not reach the server. Is it running?");
      return;
    }
    renderNewsResult(res.data);
  });
}

function renderNewsResult(d) {
  const isFake = d.label === "FAKE";
  const isUnk  = d.label === "UNKNOWN";
  setVerdict("newsStrip", "newsVerdict", "newsConf", {
    colorClass:  isFake ? "fake" : isUnk ? "warn" : "real",
    icon:        isFake ? "⚠" : isUnk ? "~" : "✓",
    text:        isFake ? "POTENTIALLY FAKE" : isUnk ? "UNCERTAIN" : "LOOKS REAL",
    confidence:  d.confidence,
  });

  requestAnimationFrame(() => {
    setBar("nFakeBar", "nFakePct", d.scores?.fake);
    setBar("nRealBar", "nRealPct", d.scores?.real);
  });

  const r = document.getElementById("newsReasoning");
  if (d.reasoning) { r.textContent = d.reasoning; r.style.display = "block"; }
  else r.style.display = "none";

  const src = document.getElementById("newsSource");
  if (src) src.textContent = d.source || "—";

  document.getElementById("newsResult").classList.add("visible");
}

// ═══════════════════════════════════════════════════════════
// LINK DETECTOR
// ═══════════════════════════════════════════════════════════
async function analyseLink() {
  const url = document.getElementById("linkUrl").value.trim();
  if (!url) { showError("linkError", "Please paste a URL first."); return; }

  const btn  = document.getElementById("linkBtn");
  const spin = document.getElementById("linkSpinner");
  const btxt = document.getElementById("linkBtnText");
  hideError("linkError");
  document.getElementById("linkResult").classList.remove("visible");
  btn.disabled = true; spin.classList.add("visible"); btxt.textContent = "Scanning…";

  chrome.runtime.sendMessage({ type: "API_DETECT_LINK", url }, res => {
    btn.disabled = false; spin.classList.remove("visible"); btxt.textContent = "Scan URL →";
    if (!res || !res.ok) {
      showError("linkError", res?.error || "Could not reach the server. Is it running?");
      return;
    }
    renderLinkResult(res.data);
  });
}

function renderLinkResult(d) {
  const verdict = d.verdict; // "PHISHING" | "SUSPICIOUS" | "SAFE"
  const colorMap = { PHISHING: "fake", SUSPICIOUS: "warn", SAFE: "real" };
  const iconMap  = { PHISHING: "⚠", SUSPICIOUS: "~", SAFE: "✓" };
  const textMap  = { PHISHING: "PHISHING / FAKE", SUSPICIOUS: "SUSPICIOUS", SAFE: "LOOKS SAFE" };

  setVerdict("linkStrip", "linkVerdict", "linkConf", {
    colorClass: colorMap[verdict] || "warn",
    icon:       iconMap[verdict]  || "~",
    text:       textMap[verdict]  || verdict,
    confidence: d.risk_score,
  });

  // URL breakdown
  const parts = document.getElementById("linkParts");
  parts.innerHTML = "";
  if (d.url_parts) {
    Object.entries(d.url_parts).forEach(([k, v]) => {
      if (!v) return;
      const flagged = d.flagged_parts && d.flagged_parts.includes(k);
      const el = document.createElement("span");
      el.className = "url-part" + (flagged ? " flagged" : "");
      el.innerHTML = `<span class="pk">${esc(k)}: </span><span class="pv">${esc(String(v))}</span>`;
      parts.appendChild(el);
    });
  }

  requestAnimationFrame(() => {
    setBar("lPhishBar", "lPhishPct", d.scores?.phishing);
    setBar("lSuspBar",  "lSuspPct",  d.scores?.suspicious);
    setBar("lLegitBar", "lLegitPct", d.scores?.legitimate);
  });

  const r = document.getElementById("linkReasoning");
  if (d.reasoning) { r.textContent = d.reasoning; r.style.display = "block"; }
  else r.style.display = "none";

  renderSignals("linkSignals", d.signals, verdict);
  document.getElementById("linkResult").classList.add("visible");
}

// ═══════════════════════════════════════════════════════════
// PROFILE IDENTIFIER
// ═══════════════════════════════════════════════════════════
async function analyseProfile() {
  const payload = {
    username:     document.getElementById("pUsername").value.trim(),
    platform:     document.getElementById("pPlatform").value,
    account_age:  document.getElementById("pAge").value.trim(),
    followers:    document.getElementById("pFollowers").value.trim(),
    post_count:   document.getElementById("pPosts").value.trim(),
    photo_type:   document.getElementById("pPhoto").value,
    bio:          document.getElementById("pBio").value.trim(),
    sample_posts: document.getElementById("pSamplePosts").value.trim(),
    other:        document.getElementById("pOther").value.trim(),
  };

  if (!payload.username && !payload.bio && !payload.sample_posts) {
    showError("profileError", "Fill in at least the username or bio.");
    return;
  }

  const btn  = document.getElementById("profileBtn");
  const spin = document.getElementById("profileSpinner");
  const btxt = document.getElementById("profileBtnText");
  hideError("profileError");
  document.getElementById("profileResult").classList.remove("visible");
  btn.disabled = true; spin.classList.add("visible"); btxt.textContent = "Analysing…";

  chrome.runtime.sendMessage({ type: "API_DETECT_PROFILE", payload }, res => {
    btn.disabled = false; spin.classList.remove("visible"); btxt.textContent = "Analyse Profile →";
    if (!res || !res.ok) {
      showError("profileError", res?.error || "Could not reach the server. Is it running?");
      return;
    }
    renderProfileResult(res.data);
  });
}

function renderProfileResult(d) {
  const verdict = d.verdict; // "FAKE" | "BOT" | "SUSPICIOUS" | "AUTHENTIC"
  const isBad  = verdict === "FAKE" || verdict === "BOT";
  const isSusp = verdict === "SUSPICIOUS";
  setVerdict("profileStrip", "profileVerdict", "profileConf", {
    colorClass: isBad ? "fake" : isSusp ? "warn" : "real",
    icon:       isBad ? "⚠" : isSusp ? "~" : "✓",
    text:       isBad ? (verdict === "BOT" ? "LIKELY BOT" : "LIKELY FAKE")
                      : isSusp ? "SUSPICIOUS" : "LIKELY AUTHENTIC",
    confidence: d.confidence,
  });

  requestAnimationFrame(() => {
    setBar("pFakeBar", "pFakePct", d.scores?.fake);
    setBar("pSuspBar", "pSuspPct", d.scores?.suspicious);
    setBar("pAuthBar", "pAuthPct", d.scores?.authentic);
  });

  const r = document.getElementById("profileReasoning");
  if (d.reasoning) { r.textContent = d.reasoning; r.style.display = "block"; }
  else r.style.display = "none";

  renderSignals("profileSignals", d.signals, verdict);
  document.getElementById("profileResult").classList.add("visible");
}

// ═══════════════════════════════════════════════════════════
// PAGE SCANNER
// ═══════════════════════════════════════════════════════════
function scanPage() {
  const btn  = document.getElementById("pageBtn");
  const spin = document.getElementById("pageSpinner");
  const btxt = document.getElementById("pageBtnText");
  hideError("pageError");
  document.getElementById("pageResult").classList.remove("visible");
  btn.disabled = true; spin.classList.add("visible"); btxt.textContent = "Scanning…";

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (!tab) {
      btn.disabled = false; spin.classList.remove("visible"); btxt.textContent = "Scan This Page →";
      showError("pageError", "No active tab found.");
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_TEXT" }, textRes => {
      if (chrome.runtime.lastError || !textRes?.text) {
        btn.disabled = false; spin.classList.remove("visible"); btxt.textContent = "Scan This Page →";
        showError("pageError", "Could not extract text from this page.");
        return;
      }

      chrome.runtime.sendMessage({ type: "API_DETECT_TEXT", text: textRes.text }, res => {
        btn.disabled = false; spin.classList.remove("visible"); btxt.textContent = "Scan This Page →";
        if (!res || !res.ok) {
          showError("pageError", res?.error || "Server error. Is TruthGuard running?");
          return;
        }
        // Inject banner into the page
        chrome.tabs.sendMessage(tab.id, { type: "INJECT_BANNER_DATA" });
        renderPageResult(res.data);

        // Also ask the content script to show the banner
        chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_AND_SCAN" });

        // Update the page badge
        updatePageBadge(res.data);
      });
    });
  });
}

function renderPageResult(d) {
  const isFake = d.label === "FAKE";
  const isUnk  = d.label === "UNKNOWN";
  setVerdict("pageStrip", "pageVerdict", "pageConf", {
    colorClass: isFake ? "fake" : isUnk ? "warn" : "real",
    icon:       isFake ? "⚠" : isUnk ? "~" : "✓",
    text:       isFake ? "POTENTIALLY FAKE" : isUnk ? "UNCERTAIN" : "LOOKS REAL",
    confidence: d.confidence,
  });

  requestAnimationFrame(() => {
    setBar("pgFakeBar", "pgFakePct", d.scores?.fake);
    setBar("pgRealBar", "pgRealPct", d.scores?.real);
  });

  const r = document.getElementById("pageReasoning");
  if (d.reasoning) { r.textContent = d.reasoning; r.style.display = "block"; }
  else r.style.display = "none";

  const src = document.getElementById("pageSource");
  if (src) src.textContent = d.source || "—";

  document.getElementById("pageResult").classList.add("visible");
  updatePageBadge(d);
}

function updatePageBadge(d) {
  const badge = document.getElementById("pageBadge");
  if (!badge) return;
  const isFake = d.label === "FAKE";
  const isUnk  = d.label === "UNKNOWN";
  badge.className = `page-scan-badge ${isFake ? "badge-fake" : isUnk ? "badge-warn" : "badge-real"}`;
  badge.textContent = isFake ? "⚠ FAKE" : isUnk ? "~ UNCERTAIN" : "✓ REAL";
}

function highlightLinks() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: "HIGHLIGHT_LINKS" });
  });
}

function removeBanner() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: "REMOVE_BANNER" });
  });
  // Reset badge
  const badge = document.getElementById("pageBadge");
  if (badge) { badge.className = "page-scan-badge badge-none"; badge.textContent = "Not scanned"; }
  document.getElementById("pageResult").classList.remove("visible");
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Tab switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Mode pills
  document.getElementById("modeOn").addEventListener("click", () => setMode("always-on"));
  document.getElementById("modeManual").addEventListener("click", () => setMode("manual"));
  document.getElementById("modeOff").addEventListener("click", () => setMode("always-off"));

  // Action buttons
  document.getElementById("newsBtn").addEventListener("click", analyseNews);
  document.getElementById("linkBtn").addEventListener("click", analyseLink);
  document.getElementById("profileBtn").addEventListener("click", analyseProfile);
  document.getElementById("pageBtn").addEventListener("click", scanPage);
  document.getElementById("highlightLinksBtn").addEventListener("click", highlightLinks);
  document.getElementById("removeBannerBtn").addEventListener("click", removeBanner);

  // Enter key on link input
  document.getElementById("linkUrl").addEventListener("keydown", e => {
    if (e.key === "Enter") analyseLink();
  });

  loadMode();
  checkStatus();
  loadPageContext();
});
