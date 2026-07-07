// ==========================================
// MOBILE NAVIGATION
// ==========================================

const menuBtn = document.getElementById("menuBtn");
const closeBtn = document.getElementById("closeBtn");
const mobileMenu = document.getElementById("mobileMenu");
const overlay = document.getElementById("overlay");

function openMenu() {
  mobileMenu.classList.add("open");

  overlay.classList.add("show");

  document.body.style.overflow = "hidden";
}

function closeMenu() {
  mobileMenu.classList.remove("open");

  overlay.classList.remove("show");

  document.body.style.overflow = "";
}

if (menuBtn) {
  menuBtn.addEventListener("click", openMenu);
}

if (closeBtn) {
  closeBtn.addEventListener("click", closeMenu);
}

if (overlay) {
  overlay.addEventListener("click", closeMenu);
}

// Close menu when a navigation link is clicked

document.querySelectorAll(".mobile-nav a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

// Prevent the menu from staying open after resizing

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) {
    closeMenu();
  }
});

// ==========================================
// ACTIVE NAVIGATION
// ==========================================

const currentPage = window.location.pathname.split("/").pop();

document.querySelectorAll("nav a").forEach((link) => {
  const href = link.getAttribute("href");

  if (!href) return;

  if (href === currentPage || (currentPage === "" && href === "index.html")) {
    link.classList.add("active");
  }
});

// ==========================================
// SCROLL REVEAL
// ==========================================

const reveals = document.querySelectorAll(
  ".card, .faq-item, .cta-box, .support-hero, .hero-content, .stat-card",
);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  },
  {
    threshold: 0.15,
  },
);

reveals.forEach((item) => {
  item.classList.add("hidden");

  observer.observe(item);
});

// ==========================================
// BACK TO TOP
// ==========================================

const backTop = document.getElementById("backToTop");

if (backTop) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      backTop.classList.add("visible");
    } else {
      backTop.classList.remove("visible");
    }
  });

  backTop.addEventListener("click", () => {
    window.scrollTo({
      top: 0,

      behavior: "smooth",
    });
  });
}

// ==========================================
// PAGE FADE IN
// ==========================================

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

// ==========================================
// ESC KEY CLOSES MENU
// ==========================================

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});
