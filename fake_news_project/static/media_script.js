// ═══════════════════════════════════════════════════════════
// TruthLens — Media Detector Script
// ═══════════════════════════════════════════════════════════

const IMAGE_EXTS = new Set(["jpg","jpeg","png","webp","gif","bmp","tiff"]);
const VIDEO_EXTS = new Set(["mp4","mov","avi","mkv","webm","m4v","wmv"]);

let currentFile = null;
let currentMode = "image"; // "image" | "video"

// ── Mode toggle ────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  clearAll();

  const fileInput  = document.getElementById("fileInput");
  const dropHint   = document.getElementById("dropHint");
  const dropIcon   = document.getElementById("dropIcon");
  const modeImage  = document.getElementById("modeImage");
  const modeVideo  = document.getElementById("modeVideo");

  if (mode === "image") {
    fileInput.accept  = "image/*";
    dropHint.textContent = "JPG, PNG, WebP, GIF — max 50 MB";
    dropIcon.textContent = "🖼";
    modeImage.classList.add("active");
    modeVideo.classList.remove("active");
  } else {
    fileInput.accept  = "video/*";
    dropHint.textContent = "MP4, MOV, WebM, AVI, MKV — max 50 MB";
    dropIcon.textContent = "🎬";
    modeImage.classList.remove("active");
    modeVideo.classList.add("active");
  }
}

// ── Drag & Drop ────────────────────────────────────────────
const dropZone = document.getElementById("dropZone");

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// ── File handler ────────────────────────────────────────────
function handleFile(file) {
  if (!file) return;
  const ext = file.name.split(".").pop().toLowerCase();

  // Auto-switch mode based on file type
  if (VIDEO_EXTS.has(ext)) {
    currentMode = "video";
    document.getElementById("modeImage").classList.remove("active");
    document.getElementById("modeVideo").classList.add("active");
  } else if (IMAGE_EXTS.has(ext)) {
    currentMode = "image";
    document.getElementById("modeImage").classList.add("active");
    document.getElementById("modeVideo").classList.remove("active");
  } else {
    showError(`Unsupported file type ".${ext}". Please upload an image or video.`);
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    showError("File is too large. Maximum size is 50 MB.");
    return;
  }

  currentFile = file;
  showPreview(file, ext);
  document.getElementById("mediaResult").classList.remove("visible");
  document.getElementById("mediaError").classList.remove("visible");
  document.getElementById("analyseBtn").disabled = false;
}

function showPreview(file, ext) {
  const preview  = document.getElementById("filePreview");
  const thumb    = document.getElementById("previewThumb");
  const nameEl   = document.getElementById("previewName");
  const metaEl   = document.getElementById("previewMeta");

  nameEl.textContent = file.name;
  metaEl.textContent = `${formatBytes(file.size)} · ${ext.toUpperCase()}`;

  thumb.innerHTML = "";
  if (IMAGE_EXTS.has(ext)) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    thumb.appendChild(img);
  } else {
    thumb.innerHTML = `<span class="video-icon">🎬</span>`;
  }

  preview.classList.add("visible");
}

// ── Analyse ────────────────────────────────────────────────
async function analyseMedia() {
  if (!currentFile) return;

  const btn     = document.getElementById("analyseBtn");
  const spinner = document.getElementById("spinner");
  const result  = document.getElementById("mediaResult");
  const error   = document.getElementById("mediaError");

  result.classList.remove("visible");
  error.classList.remove("visible");

  btn.disabled = true;
  btn.querySelector(".btn-text").textContent = "Analysing";
  btn.querySelector(".btn-icon").style.display = "none";
  spinner.classList.add("visible");

  try {
    const formData = new FormData();
    formData.append("file", currentFile);

    const res  = await fetch("/api/detect-media", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Analysis failed. Please try again.");
      return;
    }

    renderResult(data);

  } catch (err) {
    showError("Network error — could not reach the server.");
  } finally {
    btn.disabled = false;
    btn.querySelector(".btn-text").textContent = "Analyse Media";
    btn.querySelector(".btn-icon").style.display = "";
    spinner.classList.remove("visible");
  }
}

// ── Render result ──────────────────────────────────────────
function renderResult(data) {
  const result     = document.getElementById("mediaResult");
  const chip       = document.getElementById("verdictChip");
  const icon       = document.getElementById("verdictIcon");
  const text       = document.getElementById("verdictText");
  const conf       = document.getElementById("confValue");
  const sourceBadge = document.getElementById("sourceBadge");

  // Verdict chip
  chip.className = "verdict-chip";
  if (data.label === "AI-GENERATED") {
    chip.classList.add("is-ai");
    icon.textContent = "⚠";
    text.textContent = "AI-Generated";
  } else if (data.label === "AUTHENTIC") {
    chip.classList.add("is-real");
    icon.textContent = "✓";
    text.textContent = "Authentic";
  } else {
    chip.classList.add("is-uncertain");
    icon.textContent = "~";
    text.textContent = "Uncertain";
  }

  conf.textContent = `${(data.confidence * 100).toFixed(1)}%`;
  sourceBadge.textContent = data.source || "—";

  // Score bars
  requestAnimationFrame(() => {
    const aiPct   = (data.scores.ai_generated * 100).toFixed(1);
    const authPct = (data.scores.authentic * 100).toFixed(1);
    document.getElementById("aiBar").style.width   = aiPct + "%";
    document.getElementById("authBar").style.width = authPct + "%";
    document.getElementById("aiPct").textContent   = aiPct + "%";
    document.getElementById("authPct").textContent = authPct + "%";
  });

  // Reasoning
  const reasoningBlock = document.getElementById("reasoningBlock");
  const reasoningText  = document.getElementById("reasoningText");
  if (data.reasoning) {
    reasoningText.textContent = data.reasoning;
    reasoningBlock.style.display = "block";
  } else {
    reasoningBlock.style.display = "none";
  }

  // Signals
  const signalTags = document.getElementById("signalTags");
  signalTags.innerHTML = "";
  if (data.signals && data.signals.length > 0) {
    data.signals.forEach(sig => {
      const tag = document.createElement("span");
      tag.className = "signal-tag" + (data.label === "AI-GENERATED" ? " red" : "");
      tag.textContent = sig;
      signalTags.appendChild(tag);
    });
  } else {
    signalTags.innerHTML = `<span class="no-signals">No specific signals detected.</span>`;
  }

  // Meta row
  document.getElementById("metaType").textContent = data.media_type === "video" ? "Video" : "Image";
  document.getElementById("metaSize").textContent = `${data.file_size_kb} KB`;

  if (data.media_type === "video") {
    document.getElementById("metaFramesWrap").style.display = "flex";
    document.getElementById("metaAiFramesWrap").style.display = "flex";
    document.getElementById("metaFrames").textContent    = data.frames_analysed;
    document.getElementById("metaAiFrames").textContent  = data.ai_flagged_frames;
    document.getElementById("metaDimsWrap").style.display = "none";
  } else {
    document.getElementById("metaFramesWrap").style.display = "none";
    document.getElementById("metaAiFramesWrap").style.display = "none";
    const dims = data.metadata && data.metadata.size ? data.metadata.size : null;
    if (dims) {
      document.getElementById("metaDimsWrap").style.display = "flex";
      document.getElementById("metaDims").textContent = dims;
    }
  }

  // Video frame breakdown
  const framesSection = document.getElementById("framesSection");
  const framesGrid    = document.getElementById("framesGrid");
  framesGrid.innerHTML = "";
  if (data.media_type === "video" && data.frame_results && data.frame_results.length > 0) {
    framesSection.style.display = "block";
    data.frame_results.forEach(fr => {
      const isAi   = fr.ai_score >= 0.5;
      const isUnc  = fr.ai_generated === "UNCERTAIN";
      const barCls = isUnc ? "unc" : (isAi ? "ai" : "auth");
      const lblCls = isUnc ? "unc" : (isAi ? "ai" : "auth");
      const label  = isUnc ? "Uncertain" : (isAi ? "AI" : "Authentic");

      const card = document.createElement("div");
      card.className = "frame-card";
      card.innerHTML = `
        <div class="frame-card-bar ${barCls}"></div>
        <div class="frame-card-body">
          <div class="frame-ts">${fr.timestamp_s}s</div>
          <div class="frame-verdict ${lblCls}">${label}</div>
          <div class="frame-score">${(fr.ai_score * 100).toFixed(0)}% AI</div>
        </div>
      `;
      framesGrid.appendChild(card);
    });
  } else {
    framesSection.style.display = "none";
  }

  // Image metadata accordion
  const metadataBlock   = document.getElementById("metadataBlock");
  const metadataContent = document.getElementById("metadataContent");
  if (data.media_type === "image" && data.metadata && Object.keys(data.metadata).length > 0) {
    metadataBlock.style.display = "block";
    metadataContent.innerHTML = Object.entries(data.metadata).map(([k, v]) => `
      <div class="metadata-row">
        <span class="metadata-key">${k}</span>
        <span class="metadata-val">${v}</span>
      </div>
    `).join("");
  } else {
    metadataBlock.style.display = "none";
  }

  result.classList.add("visible");
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Metadata accordion ─────────────────────────────────────
function toggleMeta() {
  const toggle  = document.getElementById("metadataToggle");
  const content = document.getElementById("metadataContent");
  const isOpen  = content.classList.toggle("open");
  toggle.classList.toggle("open", isOpen);
}

// ── Error ──────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById("mediaError");
  el.textContent = `⚠  ${msg}`;
  el.classList.add("visible");
}

// ── Clear ──────────────────────────────────────────────────
function clearFile() {
  currentFile = null;
  document.getElementById("fileInput").value = "";
  document.getElementById("filePreview").classList.remove("visible");
  document.getElementById("analyseBtn").disabled = true;
}

function clearAll() {
  clearFile();
  document.getElementById("mediaResult").classList.remove("visible");
  document.getElementById("mediaError").classList.remove("visible");
  document.getElementById("aiBar").style.width   = "0%";
  document.getElementById("authBar").style.width = "0%";
}

// ── Helpers ────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024)        return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
