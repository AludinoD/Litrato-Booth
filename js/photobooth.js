// State Store for Litrato Photobooth
const state = {
  currentStage: 1,
  orientation: "vertical",
  photoCount: null,
  capturedPhotos: [],
  stream: null,
  isCountingDown: false,
  activeRetakeIndex: null
};

// DOM Elements
const stepNodes = [
  document.getElementById("step-node-1"),
  document.getElementById("step-node-2"),
  document.getElementById("step-node-3")
];

const stage1Section = document.getElementById("stage-1");
const stage2Section = document.getElementById("stage-2");

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
    const stepNum = index + 1;
    if (stepNum === stageNumber) {
      node.classList.add("active");
      node.setAttribute("aria-current", "step");
    } else {
      node.classList.remove("active");
      node.removeAttribute("aria-current");
    }
  });

  if (stageNumber === 1) {
    stage1Section.hidden = false;
    stage2Section.hidden = true;
  } else if (stageNumber === 2) {
    stage1Section.hidden = true;
    stage2Section.hidden = false;
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
  console.log("Ready for Stage 3 (Design & Export) with photos:", state.capturedPhotos);
});