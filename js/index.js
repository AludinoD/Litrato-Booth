document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  const elementsToReveal = document.querySelectorAll(
    ".reveal-item, .polaroid-container, .privacy-header, .privacy-block"
  );

  elementsToReveal.forEach((el) => {
    el.classList.add("reveal-item");
    observer.observe(el);
  });

  const btnBackToTop = document.getElementById("btn-back-to-top");

  if (btnBackToTop) {

    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        btnBackToTop.classList.add("visible");
      } else {
        btnBackToTop.classList.remove("visible");
      }
    });

    btnBackToTop.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }
});


const FRAME_PALETTE = [
  "#FFFFFF", 
  "#231815", 
  "#B87D4B", 
  "#E86A58", 
  "#6A8E72", 
  "#4B779A", 
  "#F8E9DA"  
];

function createAmbientStrip() {
  const counts = [2, 3, 4];
  const orientations = ["vertical", "horizontal"];

  const count = counts[Math.floor(Math.random() * counts.length)];
  let orientation = orientations[Math.floor(Math.random() * orientations.length)];
  const color = FRAME_PALETTE[Math.floor(Math.random() * FRAME_PALETTE.length)];

  const strip = document.createElement("div");
  strip.className = `ambient-strip ${orientation}`;
  strip.style.backgroundColor = color;

  
  if (count === 4 && orientation === "horizontal") {
    strip.className = "ambient-strip grid-4";
  }

  for (let i = 0; i < count; i++) {
    const slot = document.createElement("div");
    slot.className = "ambient-slot";
   
    if (color === "#231815") {
      slot.style.backgroundColor = "rgba(255, 255, 255, 0.18)";
    }
    strip.appendChild(slot);
  }

  return strip;
}

function initHeroBackground() {
  const tracks = [
    document.getElementById("marquee-track-1"),
    document.getElementById("marquee-track-2")
  ].filter(Boolean);

  if (tracks.length === 0) return;

  const totalStrips = 18; 

  tracks.forEach((track) => {
    track.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const batch = [];

    for (let i = 0; i < totalStrips; i++) {
      batch.push(createAmbientStrip());
    }

    batch.forEach((node) => fragment.appendChild(node));

    
    batch.forEach((node) => fragment.appendChild(node.cloneNode(true)));

    track.appendChild(fragment);
  });
}

initHeroBackground();