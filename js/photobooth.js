// State store for Photobooth configuration
const photoboothState = {
  stage: 1,
  orientation: "vertical", // 'vertical' or 'horizontal'
  photoCount: null         // 2, 3, or 4
};

// DOM Elements
const toggleButtons = document.querySelectorAll(".btn-toggle");
const layoutCards = document.querySelectorAll(".layout-card");
const previewFrames = document.querySelectorAll(".layout-preview-frame");
const btnNextStep = document.getElementById("btn-next-step");

// Switch Orientation (Vertical / Horizontal)
toggleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toggleButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const orientation = btn.dataset.orientation;
    photoboothState.orientation = orientation;

    // Update mini preview shapes dynamically
    previewFrames.forEach((frame) => {
      frame.classList.remove("vertical", "horizontal", "grid-4");
      if (orientation === "horizontal") {
        if (frame.id === "preview-4") {
          frame.classList.add("horizontal", "grid-4"); // 2x2 grid for 4 photos
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

    photoboothState.photoCount = parseInt(card.dataset.photos, 10);

    // Reveal and enable "Next Step" button
    btnNextStep.disabled = false;
  });
});

// Next Step Click
btnNextStep.addEventListener("click", () => {
  console.log("Selected Configuration:", photoboothState);
  // We will hook this up to Stage 2 (Snap Pics) next!
});