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