const body = document.body;
const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const navLinks = Array.from(document.querySelectorAll(".site-nav a[href^='#']"));

const revealElements = Array.from(document.querySelectorAll(".reveal"));
const galleryItems = Array.from(document.querySelectorAll(".gallery-item"));
const lazyVideos = Array.from(document.querySelectorAll("video[data-lazy-video]"));

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxCaption = document.querySelector(".lightbox-caption");
const lightboxClose = document.querySelector(".lightbox-close");
const lightboxPrev = document.querySelector(".lightbox-prev");
const lightboxNext = document.querySelector(".lightbox-next");

let activeGalleryIndex = 0;
let lastFocusedElement = null;
let ticking = false;

function syncBodyLock() {
  const menuOpen = Boolean(nav && nav.classList.contains("is-open"));
  const lightboxOpen = Boolean(lightbox && lightbox.classList.contains("is-active"));
  body.classList.toggle("no-scroll", menuOpen || lightboxOpen);
}

function onScroll() {
  if (!header) return;
  const isScrolled = window.scrollY > 40;
  header.classList.toggle("is-scrolled", isScrolled);
}

function requestScrollUpdate() {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(() => {
    onScroll();
    ticking = false;
  });
}

function closeMenu() {
  if (!menuToggle || !nav) return;
  menuToggle.setAttribute("aria-expanded", "false");
  nav.classList.remove("is-open");
  syncBodyLock();
}

function toggleMenu() {
  if (!menuToggle || !nav) return;
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  nav.classList.toggle("is-open", !isOpen);
  syncBodyLock();
}

function smoothScrollTo(hash) {
  const target = document.querySelector(hash);
  if (!target) return;
  const offset = header ? header.offsetHeight - 6 : 0;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth"
  });
}

function markRevealed(entries, observer) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    observer.unobserve(entry.target);
  });
}

function setupRevealObserver() {
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(markRevealed, {
    threshold: 0.18,
    rootMargin: "0px 0px -8% 0px"
  });

  revealElements.forEach((element) => observer.observe(element));
}

function openLightbox(index) {
  if (!lightbox || !lightboxImage || !galleryItems.length) return;
  activeGalleryIndex = index;
  const item = galleryItems[activeGalleryIndex];
  const image = item.querySelector("img");
  if (!image) return;

  const wasOpen = lightbox.classList.contains("is-active");
  if (!wasOpen) {
    lastFocusedElement = document.activeElement;
  }
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt || "Immagine gallery";
  lightboxCaption.textContent = item.dataset.caption || image.alt || "";

  lightbox.classList.add("is-active");
  lightbox.setAttribute("aria-hidden", "false");
  syncBodyLock();
}

function closeLightboxModal() {
  if (!lightbox) return;
  lightbox.classList.remove("is-active");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
  syncBodyLock();
  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
}

function stepLightbox(direction) {
  if (!galleryItems.length) return;
  activeGalleryIndex = (activeGalleryIndex + direction + galleryItems.length) % galleryItems.length;
  openLightbox(activeGalleryIndex);
}

function setupGalleryLightbox() {
  if (!galleryItems.length || !lightbox) return;

  galleryItems.forEach((item, index) => {
    item.addEventListener("click", () => openLightbox(index));
  });

  lightboxClose?.addEventListener("click", closeLightboxModal);
  lightboxPrev?.addEventListener("click", () => stepLightbox(-1));
  lightboxNext?.addEventListener("click", () => stepLightbox(1));

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightboxModal();
  });

  document.addEventListener("keydown", (event) => {
    const isOpen = lightbox.classList.contains("is-active");

    if (event.key === "Escape" && isOpen) {
      closeLightboxModal();
      return;
    }

    if (!isOpen) return;
    if (event.key === "ArrowRight") stepLightbox(1);
    if (event.key === "ArrowLeft") stepLightbox(-1);
  });
}

function setupLazyVideos() {
  if (!lazyVideos.length) return;

  const loadVideo = (videoElement) => {
    if (videoElement.dataset.loaded === "true") return;
    const source = videoElement.querySelector("source[data-src]");
    if (!source) return;
    source.src = source.dataset.src;
    videoElement.load();
    videoElement.dataset.loaded = "true";
  };

  if (!("IntersectionObserver" in window)) {
    lazyVideos.forEach((videoElement) => {
      loadVideo(videoElement);
      videoElement.play().catch(() => {});
    });
    return;
  }

  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const videoElement = entry.target;
        if (entry.isIntersecting) {
          loadVideo(videoElement);
          videoElement.play().catch(() => {});
        } else {
          videoElement.pause();
        }
      });
    },
    {
      threshold: 0.35,
      rootMargin: "0px 0px 10% 0px"
    }
  );

  lazyVideos.forEach((videoElement) => videoObserver.observe(videoElement));
}

if (menuToggle && nav) {
  menuToggle.addEventListener("click", toggleMenu);
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!nav.classList.contains("is-open")) return;
    const clickedInsideMenu = nav.contains(event.target) || menuToggle.contains(event.target);
    if (!clickedInsideMenu) closeMenu();
  });
}

document.querySelectorAll("a[href^='#']").forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const hash = anchor.getAttribute("href");
    if (!hash || hash === "#") return;
    const target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();
    smoothScrollTo(hash);
  });
});

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", onScroll);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

setupRevealObserver();
setupGalleryLightbox();
setupLazyVideos();
onScroll();

const yearNode = document.getElementById("year");
if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}
