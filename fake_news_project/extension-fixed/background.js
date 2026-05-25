// ═══════════════════════════════════════════════════════════
// TruthGuard Extension — Background Service Worker
// ═══════════════════════════════════════════════════════════

const API_BASE = "http://localhost:5000";

// ── Context menus ──────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "tg-analyse-text",
      title: "🔍 TruthGuard: Check this text",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "tg-analyse-link",
      title: "🔗 TruthGuard: Check this link",
      contexts: ["link"],
    });
    chrome.contextMenus.create({
      id: "tg-scan-page",
      title: "📰 TruthGuard: Scan this page",
      contexts: ["page"],
    });
  });

  // Set default mode on install
  chrome.storage.sync.get("tgMode", (data) => {
    if (!data.tgMode) chrome.storage.sync.set({ tgMode: "manual" });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "tg-analyse-text") {
    chrome.storage.session.set({ pendingText: info.selectionText });
    chrome.action.openPopup?.();
  }
  if (info.menuItemId === "tg-analyse-link") {
    chrome.storage.session.set({ pendingLink: info.linkUrl });
    chrome.action.openPopup?.();
  }
  if (info.menuItemId === "tg-scan-page") {
    chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_AND_SCAN" });
  }
});

// ── Auto-scan on navigation (Always On mode) ───────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return;

  chrome.storage.sync.get("tgMode", (data) => {
    if (data.tgMode === "always-on") {
      // Small delay to let content script settle
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { type: "EXTRACT_AND_SCAN" }, () => {
          if (chrome.runtime.lastError) {} // tab may not have content script
        });
      }, 1500);
    }
  });
});

// ── Message routing ────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "API_DETECT_TEXT") {
    fetch(`${API_BASE}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: msg.text }),
    })
      .then(r => r.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "API_DETECT_LINK") {
    fetch(`${API_BASE}/api/detect-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: msg.url }),
    })
      .then(r => r.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "API_DETECT_PROFILE") {
    fetch(`${API_BASE}/api/detect-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg.payload),
    })
      .then(r => r.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "API_STATUS") {
    fetch(`${API_BASE}/api/status`)
      .then(r => r.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "GET_MODE") {
    chrome.storage.sync.get("tgMode", (data) => {
      sendResponse({ mode: data.tgMode || "manual" });
    });
    return true;
  }

  if (msg.type === "SET_MODE") {
    chrome.storage.sync.set({ tgMode: msg.mode }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
