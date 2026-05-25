// ── Character counter ──────────────────────────────────────
const input     = document.getElementById('newsInput');
const charCount = document.getElementById('charCount');

input.addEventListener('input', () => {
  charCount.textContent = `${input.value.length} / 5000`;
});

// ── Analyse ────────────────────────────────────────────────
async function analyse() {
  const text = input.value.trim();
  const btn   = document.getElementById('analyseBtn');
  const resultPanel = document.getElementById('resultPanel');
  const errorPanel  = document.getElementById('errorPanel');

  // Hide previous results
  resultPanel.classList.remove('visible');
  errorPanel.classList.remove('visible');

  if (!text) {
    showError('Please paste some text before analysing.');
    return;
  }

  // Loading state
  btn.disabled = true;
  btn.classList.add('loading');
  btn.querySelector('.btn-text').textContent = 'Analysing';
  btn.querySelector('.btn-icon').style.display = 'none';

  const t0 = Date.now();

  try {
    const res = await fetch('/api/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    const elapsed = Date.now() - t0;

    if (!res.ok) {
      showError(data.error || 'Something went wrong. Please try again.');
      return;
    }

    renderResult(data, elapsed);

  } catch (err) {
    showError('Network error — could not reach the server.');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.querySelector('.btn-text').textContent = 'Analyse Text';
    btn.querySelector('.btn-icon').style.display = '';
  }
}

// ── Auto-dismiss timer for FAKE verdict ───────────────────
let _fakeDismissTimer = null;
let _fakeDismissInterval = null;

function _startFakeDismiss() {
  // Clear any previous timers
  clearTimeout(_fakeDismissTimer);
  clearInterval(_fakeDismissInterval);

  const banner   = document.getElementById('fakeBanner');
  const progress = document.getElementById('fakeBannerProgress');
  const countdown = document.getElementById('fakeBannerCountdown');
  if (!banner) return;

  banner.classList.add('visible');
  let remaining = 20;

  _fakeDismissInterval = setInterval(() => {
    remaining--;
    if (countdown) countdown.textContent = remaining;
    if (progress)  progress.style.width  = (remaining / 20 * 100) + '%';
    if (remaining <= 0) {
      clearInterval(_fakeDismissInterval);
      banner.classList.remove('visible');
    }
  }, 1000);

  _fakeDismissTimer = setTimeout(() => {
    banner.classList.remove('visible');
    clearInterval(_fakeDismissInterval);
  }, 20000);
}

function _clearFakeBanner() {
  clearTimeout(_fakeDismissTimer);
  clearInterval(_fakeDismissInterval);
  const banner = document.getElementById('fakeBanner');
  if (banner) banner.classList.remove('visible');
}

// ── Render result ──────────────────────────────────────────
function renderResult(data, elapsed) {
  const isFake = data.label === 'FAKE';
  const isUncertain = data.label === 'UNCERTAIN';
  const badge  = document.getElementById('verdictBadge');

  // Dismiss any previous fake banner
  _clearFakeBanner();

  // Verdict badge
  if (isFake) {
    badge.className = 'verdict-badge is-fake';
    document.getElementById('verdictIcon').textContent  = '⚠';
    document.getElementById('verdictLabel').textContent = 'FAKE';
    _startFakeDismiss();
  } else if (isUncertain) {
    badge.className = 'verdict-badge is-uncertain';
    document.getElementById('verdictIcon').textContent  = '?';
    document.getElementById('verdictLabel').textContent = 'UNCERTAIN';
  } else {
    badge.className = 'verdict-badge is-real';
    document.getElementById('verdictIcon').textContent  = '✓';
    document.getElementById('verdictLabel').textContent = 'REAL';
  }

  // Show a note if the server skipped analysis (e.g. social media page)
  const noteEl = document.getElementById('resultNote');
  if (noteEl) {
    if (data.note) {
      noteEl.textContent = data.note;
      noteEl.style.display = 'block';
    } else {
      noteEl.style.display = 'none';
    }
  }

  // Confidence
  document.getElementById('confValue').textContent = `${(data.confidence * 100).toFixed(1)}%`;

  // Bars — animate after a tick
  requestAnimationFrame(() => {
    const fakeW = (data.scores.fake * 100).toFixed(1);
    const realW = (data.scores.real * 100).toFixed(1);
    document.getElementById('fakeBar').style.width = fakeW + '%';
    document.getElementById('realBar').style.width = realW + '%';
    document.getElementById('fakePct').textContent = fakeW + '%';
    document.getElementById('realPct').textContent = realW + '%';
  });

  // Meta
  document.getElementById('wordCount').textContent      = data.word_count.toLocaleString();
  document.getElementById('charCountResult').textContent = data.char_count.toLocaleString();
  document.getElementById('timeElapsed').textContent     = elapsed;

  document.getElementById('resultPanel').classList.add('visible');

  // Smooth scroll to result
  document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Add to fake log if applicable
  if (isFake) addToLog(input.value.trim(), data.confidence);
}

// ── Error helper ───────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('errorPanel');
  el.textContent = `⚠  ${msg}`;
  el.classList.add('visible');
}

// ── Clear ──────────────────────────────────────────────────
function clearAll() {
  input.value = '';
  charCount.textContent = '0 / 5000';
  document.getElementById('resultPanel').classList.remove('visible');
  document.getElementById('errorPanel').classList.remove('visible');
  // Reset bars
  document.getElementById('fakeBar').style.width = '0%';
  document.getElementById('realBar').style.width = '0%';
  input.focus();
}

// ── Allow Ctrl+Enter to submit ─────────────────────────────
input.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyse();
});
// ── Fake News Log ──────────────────────────────────────────
const fakeLog = [];

function addToLog(text, confidence) {
  fakeLog.unshift({ text, confidence });
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const pct  = (confidence * 100).toFixed(1);
  const words = text.trim().split(/\s+/).length;

  document.getElementById('fakeCount').textContent = fakeLog.length;
  document.getElementById('logEmpty').style.display = 'none';

  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = `
    <div class="log-item-header">
      <span class="log-item-conf">⚠ ${pct}% FAKE</span>
      <span class="log-item-time">${time}</span>
    </div>
    <div class="log-item-preview">${escapeHtml(text)}</div>
    <div class="log-item-meta">${words} words · ${text.length} chars</div>
  `;
  document.getElementById('logList').insertBefore(item, document.getElementById('logList').firstChild);
}

function clearLog() {
  fakeLog.length = 0;
  document.getElementById('fakeCount').textContent = '0';
  document.getElementById('logList').innerHTML = '';
  document.getElementById('logEmpty').style.display = '';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}