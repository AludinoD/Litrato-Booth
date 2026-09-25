// State Store for Litrato Photobooth
const state = {
  currentStage: 1,
  orientation: "vertical",
  photoCount: null,
  capturedPhotos: [],
  stream: null,
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

// Stage 3 DOM
const canvas = document.getElementById("export-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const colorSwatches = document.querySelectorAll(".color-swatch");
const customColorInput = document.getElementById("custom-color-input");
const filterButtons = document.querySelectorAll(".filter-btn");
const btnDownload = document.getElementById("btn-download");
const btnBackStage2 = document.getElementById("btn-back-stage2");


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

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    state.stream = stream;
    video.srcObject = stream;
    video.muted = true;

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve);
      };
    });

    // Camera succeeded
    if (statusElement) statusElement.classList.remove("active");
  } catch (err) {
    console.error("Camera access error:", err);
    // Camera failed
    if (statusElement) {
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
    thumbnailsTray.appendChild(slot);
  }

  attachSlotActionListeners();
  updateStage2Controls();
}

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

function runCountdown(seconds = 5) {
  return new Promise((resolve) => {
    state.isCountingDown = true;
    countdownOverlay.classList.add("active");
    let current = seconds;
    countdownText.textContent = current;

    const timer = setInterval(() => {
      current -= 1;
      if (current > 0) {
        countdownText.textContent = current;
      } else {
        clearInterval(timer);
        countdownOverlay.classList.remove("active");
        state.isCountingDown = false;
        resolve();
      }
    }, 1000);
  });
}

function snapFrame() {
  cameraFlash.classList.add("active");
  setTimeout(() => cameraFlash.classList.remove("active"), 200);

  const context = photoCanvas.getContext("2d");
  photoCanvas.width = videoElement.videoWidth || 640;
  photoCanvas.height = videoElement.videoHeight || 480;

  context.translate(photoCanvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);

  return photoCanvas.toDataURL("image/png");
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
    btnNextToStage3.style.display = "inline-block";
  } else {
    btnNextToStage3.style.display = "none";
  }
}

btnTakePicture.addEventListener("click", async () => {
  if (state.isCountingDown) return;

  btnTakePicture.disabled = true;

  let startIndex = state.capturedPhotos.findIndex((p) => p === null);
  if (startIndex === -1) startIndex = 0;

  for (let i = startIndex; i < state.photoCount; i++) {
    await runCountdown(5);
    const photoData = snapFrame();
    placePhotoInSlot(i, photoData);

    if (i < state.photoCount - 1) {
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  btnTakePicture.disabled = false;
});

async function retakeSpecificSlot(index) {
  if (state.isCountingDown) return;
  state.activeRetakeIndex = index;
  await runCountdown(5);
  const photoData = snapFrame();
  placePhotoInSlot(index, photoData);
  state.activeRetakeIndex = null;
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
  const isGrid4 = count === 4 && isHorizontal; // 2x2 Bento/Grid layout

  // High Resolution Export Sizing
  const slotW = 600;
  const slotH = 450;
  const border = 36;
  const gap = 24;
  const bottomBar = 110;

  let canvasW, canvasH;

  if (isGrid4) {
    // 2x2 Grid Layout
    canvasW = border * 2 + slotW * 2 + gap;
    canvasH = border * 2 + slotH * 2 + gap + bottomBar;
  } else if (isHorizontal) {
    // 1-Row Strip
    canvasW = border * 2 + (count * slotW) + ((count - 1) * gap);
    canvasH = border * 2 + slotH + bottomBar;
  } else {
    // Vertical Column Strip
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

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 52px 'Charman Serif', Georgia, serif";

  const isDarkFrame = getLuminance(state.design.frameColor) < 0.5;
  ctx.fillStyle = isDarkFrame ? "rgba(255, 255, 255, 0.9)" : "#231815";

  ctx.fillText("Litrato", canvasW / 2, canvasH - (bottomBar / 2));
  ctx.restore();

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
  btnDownload.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = `litrato-${state.photoCount}-photos-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  });
}