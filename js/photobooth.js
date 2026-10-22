// State Store for Litrato Photobooth
const state = {
  currentStage: 1,
  orientation: "vertical",
  photoCount: null,
  capturedPhotos: [],
  stream: null,
  facingMode: "user",
  isCountingDown: false,
  activeRetakeIndex: null,
  design: {
    frameColor: "#FFFFFF",
    filter: "none",
    stickers: []
  }
};

// DOM Elements
const stepNodes = [
  document.getElementById("step-node-1"),
  document.getElementById("step-node-2"),
  document.getElementById("step-node-3")
];

const stage1Section = document.getElementById("stage-1");
const stage2Section = document.getElementById("stage-2");
const stage3Section = document.getElementById("stage-3");

// Stage 1 DOM
const toggleButtons = document.querySelectorAll(".btn-toggle");
const layoutCards = document.querySelectorAll(".layout-card");
const previewFrames = document.querySelectorAll(".layout-preview-frame");
const btnNextToStage2 = document.getElementById("btn-next-to-stage-2");
const btnBackToStage1 = document.getElementById("btn-back-to-stage-1");

// Stage 2 DOM
const videoElement = document.getElementById("webcam-feed");
const cameraFlash = document.getElementById("camera-flash");
const countdownOverlay = document.getElementById("countdown-overlay");
const countdownText = document.getElementById("countdown-text");
const cameraStatus = document.getElementById("camera-status");
const thumbnailsTray = document.getElementById("thumbnails-tray");

const btnTakePicture = document.getElementById("btn-take-picture");
const fileUploadInput = document.getElementById("file-upload-input");
const btnRetakeAll = document.getElementById("btn-retake-all");
const btnNextToStage3 = document.getElementById("btn-next-to-stage-3");
const photoCanvas = document.getElementById("photo-canvas");
const slotReplaceInput = document.getElementById("slot-replace-input");
const btnFlipCamera = document.getElementById("btn-flip-camera");
let selectedSheetIndex = null;
const actionSheet = document.getElementById("slot-action-sheet");
const sheetTitle = document.getElementById("sheet-title");
const sheetBackdrop = document.getElementById("sheet-backdrop");
const btnSheetCancel = document.getElementById("btn-sheet-cancel");
const btnSheetRetake = document.getElementById("btn-sheet-retake");
const sheetUploadInput = document.getElementById("sheet-upload-input");

// Stage 3 DOM
const canvas = document.getElementById("export-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const colorSwatches = document.querySelectorAll(".color-swatch");
const customColorInput = document.getElementById("custom-color-input");
const filterButtons = document.querySelectorAll(".filter-btn");
const btnDownload = document.getElementById("btn-download");
const btnBackStage2 = document.getElementById("btn-back-stage2");
const stickersTray = document.getElementById("stickers-tray");
const stickerFileInput = document.getElementById("sticker-file-input");
const btnClearStickers = document.getElementById("btn-clear-stickers");
const stickerControlsPanel = document.getElementById("sticker-controls-panel");
const btnDeleteActiveSticker = document.getElementById("btn-delete-active-sticker");
const sizeSlider = document.getElementById("sticker-size-slider");
const sizePxVal = document.getElementById("size-px-val");
const rotateSlider = document.getElementById("sticker-rotate-slider");
const rotateDegreesVal = document.getElementById("rotate-degrees-val");
const stickerColorSwatches = document.querySelectorAll("#sticker-color-palette .color-swatch-sm");
const stickerColorCustom = document.getElementById("sticker-color-custom");
const mobileStickerBar = document.getElementById("mobile-sticker-bar");
const mstBtnColor = document.getElementById("mst-btn-color");
const mstBtnDuplicate = document.getElementById("mst-btn-duplicate");
const mstBtnDelete = document.getElementById("mst-btn-delete");
const mstBtnDone = document.getElementById("mst-btn-done");
const mstColorPreview = document.getElementById("mst-color-preview");


function goToStage(stageNumber) {
  state.currentStage = stageNumber;

  stepNodes.forEach((node, index) => {
    if (!node) return;
    const stepNum = index + 1;
    if (stepNum === stageNumber) {
      node.classList.add("active");
      node.setAttribute("aria-current", "step");
    } else {
      node.classList.remove("active");
      node.removeAttribute("aria-current");
    }
  });

  if (stage1Section) stage1Section.hidden = (stageNumber !== 1);
  if (stage2Section) stage2Section.hidden = (stageNumber !== 2);
  if (stage3Section) stage3Section.hidden = (stageNumber !== 3);

  if (stageNumber === 2) {
    startCamera();
  } else if (stageNumber === 3) {
    stopCamera();
    initStickerPicker();
    renderFrame();
  }
}

/* Stage 1: Controls */
// Switch Orientation (Vertical / Horizontal)
toggleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toggleButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const orientation = btn.dataset.orientation;
    state.orientation = orientation;

    previewFrames.forEach((frame) => {
      frame.classList.remove("vertical", "horizontal", "grid-4");
      if (orientation === "horizontal") {
        if (frame.id === "preview-4") {
          frame.classList.add("horizontal", "grid-4");
        } else {
          frame.classList.add("horizontal");
        }
      } else {
        frame.classList.add("vertical");
      }
    });
  });
});

// Card Selection
layoutCards.forEach((card) => {
  card.addEventListener("click", () => {
    layoutCards.forEach((c) => {
      c.classList.remove("selected");
      c.setAttribute("aria-pressed", "false");
    });

    card.classList.add("selected");
    card.setAttribute("aria-pressed", "true");

    state.photoCount = parseInt(card.dataset.photos, 10);
    btnNextToStage2.disabled = false;
  });
});

btnNextToStage2.addEventListener("click", async () => {
  goToStage(2);
  initThumbnailSlots();
  await startCamera();
});

btnBackToStage1.addEventListener("click", () => {
  stopCamera();
  goToStage(1);
});

/* Stage Navigation */
function goToStage(stageNumber) {
  state.currentStage = stageNumber;

  stepNodes.forEach((node, index) => {
    if (!node) return;
    const stepNum = index + 1;
    if (stepNum === stageNumber) {
      node.classList.add("active");
      node.setAttribute("aria-current", "step");
    } else {
      node.classList.remove("active");
      node.removeAttribute("aria-current");
    }
  });

  [stage1Section, stage2Section, stage3Section].forEach((sec) => {
    if (sec) {
      sec.hidden = true;
      sec.style.display = "none";
    }
  });

  const activeSection = document.getElementById(`stage-${stageNumber}`);
  if (activeSection) {
    activeSection.hidden = false;
    activeSection.style.display = "";
  }

  if (stageNumber === 2) {
    startCamera();
  } else if (stageNumber === 3) {
    stopCamera();
    renderFrame();
  }
}

/* Stage 2: Camera Feed & Capture */
async function startCamera() {
  const statusElement = document.getElementById("camera-status");
  const video = document.getElementById("webcam-feed");

  if (statusElement) statusElement.classList.remove("active");

  // Keep: Essential check for secure context and browser capability
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error("Camera API not supported or context is insecure.");
    if (statusElement) {
      statusElement.innerHTML = "<p>Camera access requires a secure connection (HTTPS) or permission.</p>";
      statusElement.classList.add("active");
    }
    return;
  }

  if (state.facingMode === "user") {
    video.classList.add("mirrored");
  } else {
    video.classList.remove("mirrored");
  }

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
  }

  const constraints = {
    video: {
      facingMode: state.facingMode ? { ideal: state.facingMode } : "user"
    },
    audio: false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    state.stream = stream;
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    video.setAttribute("autoplay", "true");
    video.muted = true;

    await video.play();

    if (statusElement) statusElement.classList.remove("active");
  } catch (err) {
    console.error("Camera access error:", err);
    if (statusElement) {
      statusElement.innerHTML = `<p>${err.name === "NotAllowedError" ? "Camera permission denied. Please allow access in browser settings." : "Unable to access camera: " + err.message}</p>`;
      statusElement.classList.add("active");
    }
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
    videoElement.srcObject = null;
  }
}


function initThumbnailSlots() {
  thumbnailsTray.innerHTML = "";
  state.capturedPhotos = new Array(state.photoCount).fill(null);

  for (let i = 0; i < state.photoCount; i++) {
    const slot = document.createElement("div");
    slot.className = "thumbnail-slot";
    slot.id = `slot-${i}`;
    slot.dataset.index = i;
    slot.innerHTML = `
      <div class="slot-inner">
        <span class="slot-placeholder">#${i + 1}</span>
        <div class="slot-hover-overlay">
          <p class="hover-message">Don't like the shot?<br>Retake it again</p>
          <div class="hover-actions">
            <button type="button" class="btn-slot-retake" data-index="${i}">Retake</button>
            <button type="button" class="btn-slot-replace" data-index="${i}">Replace</button>
          </div>
        </div>
      </div>
    `;

    slot.addEventListener("click", (e) => {
      if (e.target.closest(".btn-slot-retake") || e.target.closest(".btn-slot-replace")) {
        return;
      }

      if (state.capturedPhotos[i]) {
        e.preventDefault();
        e.stopPropagation();
        openSlotSheet(i);
      }
    });

    thumbnailsTray.appendChild(slot);
  }

  attachSlotActionListeners();
  updateStage2Controls();
}

function openSlotSheet(index) {
  selectedSheetIndex = index;
  if (sheetTitle) {
    sheetTitle.textContent = `Photo #${index + 1}`;
  }
  if (actionSheet) {
    actionSheet.classList.add("active");
    actionSheet.setAttribute("aria-hidden", "false");
  }
}

function closeSlotSheet() {
  selectedSheetIndex = null;
  if (actionSheet) {
    actionSheet.classList.remove("active");
    actionSheet.setAttribute("aria-hidden", "true");
  }
}

sheetBackdrop?.addEventListener("click", closeSlotSheet);
btnSheetCancel?.addEventListener("click", closeSlotSheet);


btnSheetRetake?.addEventListener("click", () => {
  if (selectedSheetIndex !== null) {
    const idx = selectedSheetIndex;
    closeSlotSheet();
    retakeSpecificSlot(idx);
  }
});


sheetUploadInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (selectedSheetIndex !== null && file) {
    const targetIdx = selectedSheetIndex;
    const reader = new FileReader();
    reader.onload = (event) => {
      placePhotoInSlot(targetIdx, event.target.result);
      closeSlotSheet();
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  }
});

function attachSlotActionListeners() {
  document.querySelectorAll(".btn-slot-retake").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slotIndex = parseInt(btn.dataset.index, 10);
      retakeSpecificSlot(slotIndex);
    });
  });

  document.querySelectorAll(".btn-slot-replace").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeRetakeIndex = parseInt(btn.dataset.index, 10);
      slotReplaceInput.click();
    });
  });
}

let skipCountdownResolve = null;
let isCapturingProcess = false;

function runCountdown(seconds = 5) {
  return new Promise((resolve) => {
    state.isCountingDown = true;
    countdownOverlay.classList.add("active");
    let current = seconds;
    countdownText.textContent = current;

    playCountdownBeep(false);
    const timer = setInterval(() => {
      current -= 1;
      if (current > 0) {
        countdownText.textContent = current;
        playCountdownBeep(current === 1);
      } else {
        finish();
      }
    }, 1000);

    function finish() {
      if (!state.isCountingDown) return;
      clearInterval(timer);
      countdownOverlay.classList.remove("active");
      state.isCountingDown = false;
      skipCountdownResolve = null;
      resolve();
    }

    skipCountdownResolve = finish;
  });
}

function snapFrame() {
  playShutterSound();
  cameraFlash.classList.add("active");
  setTimeout(() => cameraFlash.classList.remove("active"), 200);

  const context = photoCanvas.getContext("2d");
  photoCanvas.width = videoElement.videoWidth || 640;
  photoCanvas.height = videoElement.videoHeight || 480;

  context.save();

  if (state.facingMode === "user") {
    context.translate(photoCanvas.width, 0);
    context.scale(-1, 1);
  }
  context.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);
  context.restore();

  return photoCanvas.toDataURL("image/png");
}

const shutterSound = new Audio("../assets/audio/shutter.mp3");
shutterSound.volume = 0.85;

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playCountdownBeep(isFinal = false) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(isFinal ? 920 : 540, ctx.currentTime);

  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

function playShutterSound() {
  shutterSound.currentTime = 0;
  shutterSound.play().catch((err) => {
    console.warn("Shutter audio error:", err);
  });
}

function placePhotoInSlot(index, dataUrl) {
  state.capturedPhotos[index] = dataUrl;
  
  
  if (typeof invalidatePhotoCache === "function") {
    invalidatePhotoCache();
  }

  const slot = document.getElementById(`slot-${index}`);
  if (!slot) return;

  slot.classList.add("has-image");

  slot.classList.remove("tilt-left", "tilt-right", "tilt-center");
  if (index % 3 === 0) {
    slot.classList.add("tilt-left");
  } else if (index % 3 === 1) {
    slot.classList.add("tilt-right");
  } else {
    slot.classList.add("tilt-center");
  }

  const inner = slot.querySelector(".slot-inner");
  const placeholder = inner.querySelector(".slot-placeholder");
  if (placeholder) {
    placeholder.style.display = "none";
  }

  const existingImg = inner.querySelector("img");
  if (existingImg) {
    existingImg.remove();
  }

  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = `Captured Photo ${index + 1}`;
  inner.prepend(img);

  updateStage2Controls();
}

function updateStage2Controls() {
  const filledCount = state.capturedPhotos.filter(Boolean).length;
  const allFilled = filledCount === state.photoCount;

  btnRetakeAll.disabled = filledCount === 0;

  if (allFilled) {
    btnNextToStage3.style.display = "grid";
  } else {
    btnNextToStage3.style.display = "none";
  }
}

btnTakePicture.addEventListener("click", async () => {
  if (state.isCountingDown) {
    if (typeof skipCountdownResolve === "function") {
      skipCountdownResolve();
    }
    return;
  }

  if (isCapturingProcess) return;

  let startIndex = state.capturedPhotos.findIndex((p) => p === null);
  if (startIndex === -1) {
    startIndex = 0;
  }

  isCapturingProcess = true;
  setCaptureButtonState(true);

  try {
    for (let i = startIndex; i < state.photoCount; i++) {
      if (i >= state.photoCount) break;

      await runCountdown(5);
      const photoData = snapFrame();
      placePhotoInSlot(i, photoData);

      // Brief breather between slots
      if (i < state.photoCount - 1) {
        await new Promise((res) => setTimeout(res, 600));
      }
    }
  } finally {
    isCapturingProcess = false;
    setCaptureButtonState(false);
  }
});

if (btnFlipCamera) {
  btnFlipCamera.addEventListener("click", async () => {
    // Toggle between selfie and environment camera
    state.facingMode = state.facingMode === "user" ? "environment" : "user";
    await startCamera();
  });
}

const ICON_CAMERA = `
  <span class="btn-icon-wrapper">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
      <circle cx="12" cy="13" r="3"></circle>
    </svg>
  </span>
`;

const ICON_SKIP = `
  <span class="btn-icon-wrapper">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="13 19 22 12 13 5 13 19"></polygon>
      <polygon points="2 19 11 12 2 5 2 19"></polygon>
    </svg>
  </span>
`;

function setCaptureButtonState(isSkipping) {
  if (!btnTakePicture) return;
  if (isSkipping) {
    btnTakePicture.innerHTML = `<span class="btn-text">Skip Countdown</span>${ICON_SKIP}`;
    btnTakePicture.classList.add("btn-skipping");
  } else {
    btnTakePicture.innerHTML = `<span class="btn-text">Take Picture</span>${ICON_CAMERA}`;
    btnTakePicture.classList.remove("btn-skipping");
  }
}

async function retakeSpecificSlot(index) {
  if (state.isCountingDown || isCapturingProcess) return;

  isCapturingProcess = true;
  state.activeRetakeIndex = index;
  setCaptureButtonState(true);

  try {
    await runCountdown(5);
    const photoData = snapFrame();
    placePhotoInSlot(index, photoData);
  } finally {
    state.activeRetakeIndex = null;
    isCapturingProcess = false;
    setCaptureButtonState(false);
  }
}

btnRetakeAll.addEventListener("click", () => {
  state.capturedPhotos = new Array(state.photoCount).fill(null);
  if (typeof invalidatePhotoCache === "function") {
    invalidatePhotoCache();
  }
  initThumbnailSlots();
});

fileUploadInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    let targetIndex = state.capturedPhotos.findIndex((p) => p === null);
    if (targetIndex === -1) targetIndex = 0;
    placePhotoInSlot(targetIndex, event.target.result);
  };
  reader.readAsDataURL(file);
  e.target.value = "";
});

slotReplaceInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file || state.activeRetakeIndex === null) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    placePhotoInSlot(state.activeRetakeIndex, event.target.result);
    state.activeRetakeIndex = null;
  };
  reader.readAsDataURL(file);
  e.target.value = "";
});


btnNextToStage3.addEventListener("click", () => {
  const allFilled = state.capturedPhotos.length === state.photoCount &&
                    state.capturedPhotos.every((photo) => photo !== null);

  if (!allFilled) {
    alert("Please fill all photo slots before proceeding!");
    return;
  }

  goToStage(3);
});



/* Stage 3 */
let cachedFilteredCanvases = [];
let isRendering = false;

// Clear caches when changing filters or capturing new photos
function invalidatePhotoCache() {
  cachedFilteredCanvases = [];
}

if (btnBackStage2) {
  btnBackStage2.addEventListener("click", () => {
    goToStage(2);
  });
}

async function renderFrame() {
  if (!canvas || !ctx || isRendering) return;
  isRendering = true;

  const count = state.photoCount || 4;
  const isHorizontal = state.orientation === "horizontal";
  const isGrid4 = count === 4 && isHorizontal;

  const slotW = 600;
  const slotH = 450;
  const border = 36;
  const gap = 24;
  const bottomBar = 110;

  let canvasW, canvasH;

  if (isGrid4) {
    canvasW = border * 2 + slotW * 2 + gap;
    canvasH = border * 2 + slotH * 2 + gap + bottomBar;
  } else if (isHorizontal) {
    canvasW = border * 2 + (count * slotW) + ((count - 1) * gap);
    canvasH = border * 2 + slotH + bottomBar;
  } else {
    canvasW = border * 2 + slotW;
    canvasH = border * 2 + (count * slotH) + ((count - 1) * gap) + bottomBar;
  }

  canvas.width = canvasW;
  canvas.height = canvasH;

  ctx.fillStyle = state.design.frameColor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (cachedFilteredCanvases.length !== count) {
    cachedFilteredCanvases = [];
    for (let i = 0; i < count; i++) {
      const photoData = state.capturedPhotos[i];
      if (photoData) {
        const img = await loadImage(photoData);
        cachedFilteredCanvases[i] = applyFilterToImage(img, slotW, slotH, state.design.filter);
      } else {
        cachedFilteredCanvases[i] = null;
      }
    }
  }

  for (let i = 0; i < count; i++) {
    const filteredCanvas = cachedFilteredCanvases[i];
    if (!filteredCanvas) continue;

    let x, y;
    if (isGrid4) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      x = border + col * (slotW + gap);
      y = border + row * (slotH + gap);
    } else if (isHorizontal) {
      x = border + i * (slotW + gap);
      y = border;
    } else {
      x = border;
      y = border + i * (slotH + gap);
    }

    ctx.drawImage(filteredCanvas, x, y, slotW, slotH);
  }

  if (document.fonts) {
    await document.fonts.ready;
  }

  // Footer Logo
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 52px 'Charman Serif', Georgia, serif";

  const isDarkFrame = getLuminance(state.design.frameColor) < 0.5;
  ctx.fillStyle = isDarkFrame ? "rgba(255, 255, 255, 0.9)" : "#231815";
  ctx.fillText("Litrato", canvasW / 2, canvasH - (bottomBar / 2));
  ctx.restore();

  // Draw Stickers Layer
if (state.design.stickers && state.design.stickers.length > 0) {
    state.design.stickers.forEach((sticker, index) => {
      ctx.save();
      const cx = sticker.x + sticker.width / 2;
      const cy = sticker.y + sticker.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((sticker.rotation * Math.PI) / 180);

      ctx.drawImage(
        sticker.img,
        -sticker.width / 2,
        -sticker.height / 2,
        sticker.width,
        sticker.height
      );


      if (index === selectedStickerIndex) {
        ctx.strokeStyle = "rgba(184, 125, 75, 0.95)";
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        ctx.strokeRect(
          -sticker.width / 2,
          -sticker.height / 2,
          sticker.width,
          sticker.height
        );


        const dotRadius = 8;
        ctx.fillStyle = "#FFFFFF";
        const corners = [
          [-sticker.width / 2, -sticker.height / 2],
          [sticker.width / 2, -sticker.height / 2],
          [sticker.width / 2, sticker.height / 2],
          [-sticker.width / 2, sticker.height / 2]
        ];

        corners.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }

      ctx.restore();
    });
  }

  isRendering = false;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function applyFilterToImage(img, targetW, targetH, filterName) {
  const offscreen = document.createElement("canvas");
  offscreen.width = targetW;
  offscreen.height = targetH;
  const offCtx = offscreen.getContext("2d");

  const imgRatio = img.width / img.height;
  const targetRatio = targetW / targetH;
  let sW, sH, sX, sY;

  if (imgRatio > targetRatio) {
    sH = img.height;
    sW = img.height * targetRatio;
    sX = (img.width - sW) / 2;
    sY = 0;
  } else {
    sW = img.width;
    sH = img.width / targetRatio;
    sX = 0;
    sY = (img.height - sH) / 2;
  }

  if (filterName === "bw") {
    offCtx.filter = "grayscale(100%) contrast(110%)";
  } else if (filterName === "sepia") {
    offCtx.filter = "sepia(75%) contrast(105%) brightness(95%)";
  } else if (filterName === "vivid") {
    offCtx.filter = "saturate(165%) contrast(115%)";
  } else {
    offCtx.filter = "none";
  }

  offCtx.drawImage(img, sX, sY, sW, sH, 0, 0, targetW, targetH);
  return offscreen;
}

function getLuminance(hex) {
  const color = hex.replace("#", "");
  const r = parseInt(color.substring(0, 2), 16) || 0;
  const g = parseInt(color.substring(2, 4), 16) || 0;
  const b = parseInt(color.substring(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Stage 3 Event Listeners
colorSwatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    colorSwatches.forEach((s) => s.classList.remove("active"));
    swatch.classList.add("active");
    state.design.frameColor = swatch.dataset.color;
    renderFrame();
  });
});

if (customColorInput) {
  customColorInput.addEventListener("input", (e) => {
    colorSwatches.forEach((s) => s.classList.remove("active"));
    state.design.frameColor = e.target.value;
    renderFrame();
  });
}
const mobileStickerColorInput = document.getElementById("mobile-sticker-color-input");
const DEFAULT_STICKERS = [
  {
    id: "sparkle",
    name: "Sparkle",
    defaultColor: "#F4B942",
    svgTemplate: (c) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 0 C50 35 65 50 100 50 C65 50 50 65 50 100 C50 65 35 50 0 50 C35 50 50 35 50 0 Z" fill="${c}"/></svg>`
  },
  {
    id: "heart",
    name: "Heart",
    defaultColor: "#E86A58",
    svgTemplate: (c) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 88 C20 62 5 44 5 28 C5 12 18 5 30 5 C39 5 46 10 50 16 C54 10 61 5 70 5 C82 5 95 12 95 28 C95 44 80 62 50 88 Z" fill="${c}"/></svg>`
  },
  {
    id: "flower",
    name: "Daisy",
    defaultColor: "#F4B942",
    svgTemplate: (c) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="22" r="14" fill="#FFFFFF"/>
      <circle cx="78" cy="50" r="14" fill="#FFFFFF"/>
      <circle cx="50" cy="78" r="14" fill="#FFFFFF"/>
      <circle cx="22" cy="50" r="14" fill="#FFFFFF"/>
      <circle cx="30" cy="30" r="14" fill="#FFFFFF"/>
      <circle cx="70" cy="30" r="14" fill="#FFFFFF"/>
      <circle cx="70" cy="70" r="14" fill="#FFFFFF"/>
      <circle cx="30" cy="70" r="14" fill="#FFFFFF"/>
      <circle cx="50" cy="50" r="16" fill="${c}"/>
    </svg>`
  },
  {
    id: "star",
    name: "Star",
    defaultColor: "#6A8E72",
    svgTemplate: (c) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,5 64,36 98,38 72,60 80,94 50,75 20,94 28,60 2,38 36,36" fill="${c}"/></svg>`
  }
];

let selectedStickerIndex = null;
const DEFAULT_SPAWN_SIZE = 140;

function initStickerPicker() {
  if (!stickersTray) return;
  stickersTray.innerHTML = "";

  DEFAULT_STICKERS.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sticker-option-btn";
    btn.title = item.name;

    const rawSvg = item.svgTemplate(item.defaultColor);
    const blob = new Blob([rawSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    btn.innerHTML = `<img src="${url}" alt="${item.name}" />`;
    btn.addEventListener("click", () => {
      addPredefinedSticker(item);
    });
    stickersTray.appendChild(btn);
  });
}

function addPredefinedSticker(itemDef) {
  const color = itemDef.defaultColor;
  const rawSvg = itemDef.svgTemplate(color);
  const blob = new Blob([rawSvg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const w = DEFAULT_SPAWN_SIZE;
    const h = (itemDef.id === "date-stamp") ? Math.round(DEFAULT_SPAWN_SIZE * 0.36) : DEFAULT_SPAWN_SIZE;
    const defaultX = canvas ? (canvas.width / 2 - w / 2) : 50;
    const defaultY = canvas ? (canvas.height - 200) : 50;

    state.design.stickers.push({
      type: "predefined",
      def: itemDef,
      color: color,
      img: img,
      x: defaultX,
      y: defaultY,
      width: w,
      height: h,
      rotation: 0
    });

    selectSticker(state.design.stickers.length - 1);
    renderFrame();
  };
  img.src = url;
}

function addCustomSticker(imageSrc) {
  const img = new Image();
  img.onload = () => {
    const aspect = img.width / img.height;
    const w = DEFAULT_SPAWN_SIZE;
    const h = w / aspect;
    const defaultX = canvas ? (canvas.width / 2 - w / 2) : 50;
    const defaultY = canvas ? (canvas.height - 200) : 50;

    state.design.stickers.push({
      type: "custom",
      img: img,
      x: defaultX,
      y: defaultY,
      width: w,
      height: h,
      rotation: 0
    });

    selectSticker(state.design.stickers.length - 1);
    renderFrame();
  };
  img.src = imageSrc;
}

function selectSticker(index) {
  selectedStickerIndex = index;
  const isMobile = window.innerWidth <= 860;

  if (index === null || !state.design.stickers[index]) {
    if (stickerControlsPanel) stickerControlsPanel.hidden = true;
    if (mobileStickerBar) mobileStickerBar.hidden = true;
    return;
  }

  const s = state.design.stickers[index];

  // Desktop Slider Panel Sync
  if (!isMobile && stickerControlsPanel) {
    stickerControlsPanel.hidden = false;
    const currentW = Math.round(s.width);
    if (sizeSlider) sizeSlider.value = currentW;
    if (sizePxVal) sizePxVal.textContent = `${currentW}px`;
    if (rotateSlider) rotateSlider.value = s.rotation;
    if (rotateDegreesVal) rotateDegreesVal.textContent = `${s.rotation}°`;
  }

  // Mobile Toolbar Sync
  if (isMobile && mobileStickerBar) {
    mobileStickerBar.hidden = false;
    if (mstColorPreview) {
      mstColorPreview.style.backgroundColor = s.color || "#B87D4B";
      mstBtnColor.style.display = (s.type === "predefined") ? "flex" : "none";
    }
  }
}

// Mobile Toolbar Events
mstBtnDone?.addEventListener("click", () => {
  selectSticker(null);
  renderFrame();
});

mstBtnDelete?.addEventListener("click", () => {
  if (selectedStickerIndex !== null) {
    state.design.stickers.splice(selectedStickerIndex, 1);
    selectSticker(null);
    renderFrame();
  }
});

mstBtnDuplicate?.addEventListener("click", () => {
  if (selectedStickerIndex !== null) {
    const orig = state.design.stickers[selectedStickerIndex];
    state.design.stickers.push({
      ...orig,
      x: orig.x + 30,
      y: orig.y + 30
    });
    selectSticker(state.design.stickers.length - 1);
    renderFrame();
  }
});

mstBtnColor?.addEventListener("click", () => {
  if (mobileStickerColorInput) {
    mobileStickerColorInput.click();
  }
});

mobileStickerColorInput?.addEventListener("input", (e) => {
  setStickerColor(e.target.value);
  if (mstColorPreview) {
    mstColorPreview.style.backgroundColor = e.target.value;
  }
});

function setStickerColor(newColor) {
  if (selectedStickerIndex === null) return;
  const s = state.design.stickers[selectedStickerIndex];
  if (!s || s.type !== "predefined") return;

  s.color = newColor;
  const rawSvg = s.def.svgTemplate(newColor);
  const blob = new Blob([rawSvg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    s.img = img;
    renderFrame();
  };
  img.src = url;
}

sizeSlider?.addEventListener("input", (e) => {
  if (selectedStickerIndex === null) return;
  const s = state.design.stickers[selectedStickerIndex];
  const newW = parseFloat(e.target.value);
  const ratio = s.height / s.width;
  s.width = newW;
  s.height = newW * ratio;
  if (sizePxVal) sizePxVal.textContent = `${Math.round(newW)}px`;
  renderFrame();
});

rotateSlider?.addEventListener("input", (e) => {
  if (selectedStickerIndex === null) return;
  const s = state.design.stickers[selectedStickerIndex];
  s.rotation = parseInt(e.target.value, 10);
  if (rotateDegreesVal) rotateDegreesVal.textContent = `${s.rotation}°`;
  renderFrame();
});

stickerColorSwatches.forEach((btn) => {
  btn.addEventListener("click", () => setStickerColor(btn.dataset.color));
});

stickerColorCustom?.addEventListener("input", (e) => setStickerColor(e.target.value));

btnDeleteActiveSticker?.addEventListener("click", () => {
  if (selectedStickerIndex !== null) {
    state.design.stickers.splice(selectedStickerIndex, 1);
    selectSticker(null);
    renderFrame();
  }
});

btnClearStickers?.addEventListener("click", () => {
  state.design.stickers = [];
  selectSticker(null);
  renderFrame();
});

stickerFileInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    addCustomSticker(evt.target.result);
    e.target.value = "";
  };
  reader.readAsDataURL(file);
});


function isPointInSticker(px, py, s) {
  const cx = s.x + s.width / 2;
  const cy = s.y + s.height / 2;
  const rad = (-s.rotation * Math.PI) / 180;

  const dx = px - cx;
  const dy = py - cy;
  const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
  const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

  return (
    localX >= -s.width / 2 &&
    localX <= s.width / 2 &&
    localY >= -s.height / 2 &&
    localY <= s.height / 2
  );
}

function getCanvasPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

let draggedStickerIndex = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let initialTouchDistance = null;
let initialTouchAngle = null;
let initialWidth = 0;
let initialHeight = 0;
let initialRotation = 0;

function getTouchesDist(t1, t2) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

function getTouchesAngle(t1, t2) {
  return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
}

if (canvas) {
  // Mobile Touch Gestures
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      const pos = getCanvasPointerPos(e);
      let hit = false;
      for (let i = state.design.stickers.length - 1; i >= 0; i--) {
        const s = state.design.stickers[i];
        if (isPointInSticker(pos.x, pos.y, s)) {
          draggedStickerIndex = i;
          dragOffsetX = pos.x - s.x;
          dragOffsetY = pos.y - s.y;
          selectSticker(i);
          hit = true;
          renderFrame();
          break;
        }
      }
      if (!hit) {
        selectSticker(null);
        renderFrame();
      }
    } else if (e.touches.length === 2 && selectedStickerIndex !== null) {
      const s = state.design.stickers[selectedStickerIndex];
      initialTouchDistance = getTouchesDist(e.touches[0], e.touches[1]);
      initialTouchAngle = getTouchesAngle(e.touches[0], e.touches[1]);
      initialWidth = s.width;
      initialHeight = s.height;
      initialRotation = s.rotation;
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1 && draggedStickerIndex !== null) {
      const pos = getCanvasPointerPos(e);
      const s = state.design.stickers[draggedStickerIndex];
      s.x = pos.x - dragOffsetX;
      s.y = pos.y - dragOffsetY;
      renderFrame();
      e.preventDefault();
    } else if (e.touches.length === 2 && selectedStickerIndex !== null) {
      const s = state.design.stickers[selectedStickerIndex];
      const curDist = getTouchesDist(e.touches[0], e.touches[1]);
      const curAngle = getTouchesAngle(e.touches[0], e.touches[1]);

      // Pinch Scale
      const scaleFactor = curDist / (initialTouchDistance || 1);
      const aspect = initialHeight / initialWidth;
      const targetW = Math.max(50, Math.min(420, initialWidth * scaleFactor));
      s.width = targetW;
      s.height = targetW * aspect;

      // Twist Rotate
      const angleDiff = curAngle - initialTouchAngle;
      let finalAngle = Math.round(initialRotation + angleDiff);
      while (finalAngle > 180) finalAngle -= 360;
      while (finalAngle < -180) finalAngle += 360;
      s.rotation = finalAngle;

      renderFrame();
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener("touchend", () => {
    draggedStickerIndex = null;
    initialTouchDistance = null;
    initialTouchAngle = null;
  });

  // Desktop Mouse Gestures
  canvas.addEventListener("mousedown", (e) => {
    const pos = getCanvasPointerPos(e);
    let hit = false;
    for (let i = state.design.stickers.length - 1; i >= 0; i--) {
      const s = state.design.stickers[i];
      if (isPointInSticker(pos.x, pos.y, s)) {
        draggedStickerIndex = i;
        dragOffsetX = pos.x - s.x;
        dragOffsetY = pos.y - s.y;
        selectSticker(i);
        canvas.classList.add("dragging");
        hit = true;
        renderFrame();
        e.preventDefault();
        break;
      }
    }
    if (!hit) {
      selectSticker(null);
      renderFrame();
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (draggedStickerIndex === null) return;
    const pos = getCanvasPointerPos(e);
    const s = state.design.stickers[draggedStickerIndex];
    s.x = pos.x - dragOffsetX;
    s.y = pos.y - dragOffsetY;
    renderFrame();
  });

  window.addEventListener("mouseup", () => {
    draggedStickerIndex = null;
    canvas.classList.remove("dragging");
  });
}

// Stage 3 Filters & Download
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.design.filter = btn.dataset.filter;
    invalidatePhotoCache();
    renderFrame();
  });
});

if (btnDownload) {
  btnDownload.addEventListener("click", async () => {
    const prevSelected = selectedStickerIndex;
    selectedStickerIndex = null;
    await renderFrame();

    const link = document.createElement("a");
    link.download = `litrato-${state.photoCount}-photos-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();

    selectedStickerIndex = prevSelected;
    await renderFrame();
  });
}

// Initial Boot
initStickerPicker();