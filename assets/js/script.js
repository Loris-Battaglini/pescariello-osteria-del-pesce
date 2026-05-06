const body = document.body;
const header = document.querySelector(".site-header");
const heroVideo = document.getElementById("heroVideo");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const navLinks = Array.from(document.querySelectorAll(".site-nav a[href^='#']"));

const revealElements = Array.from(document.querySelectorAll(".reveal"));
const galleryGrid = document.querySelector(".gallery-grid");
const galleryItems = Array.from(document.querySelectorAll(".gallery-item"));
const lazyVideos = Array.from(document.querySelectorAll("video[data-lazy-video]"));
const galleryPrev = document.getElementById("galleryPrev");
const galleryNext = document.getElementById("galleryNext");
const galleryCounter = document.getElementById("galleryCounter");
const typedReviewText = document.getElementById("typedReviewText");
const typedCursor = document.querySelector(".typed-cursor");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxCaption = document.querySelector(".lightbox-caption");
const lightboxClose = document.querySelector(".lightbox-close");
const lightboxPrev = document.querySelector(".lightbox-prev");
const lightboxNext = document.querySelector(".lightbox-next");

let activeGalleryIndex = 0;
let lastFocusedElement = null;
let ticking = false;
let isMobileCarousel = false;
let mobileActiveIndex = 0;
let mobileSlides = [];
let mobileStepLocked = false;

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

function setupTypedReviews() {
  if (!typedReviewText) return;
  const reviewsRaw = typedReviewText.dataset.reviews || "";
  const reviews = reviewsRaw
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!reviews.length) return;

  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.matchMedia("(max-width: 979px)").matches
  ) {
    typedReviewText.textContent = reviews[0];
    if (typedCursor) typedCursor.style.display = "none";
    return;
  }

  let reviewIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const tick = () => {
    const current = reviews[reviewIndex];

    if (!deleting) {
      charIndex += 1;
      typedReviewText.textContent = current.slice(0, charIndex);

      if (charIndex >= current.length) {
        deleting = true;
        window.setTimeout(tick, 1600);
        return;
      }

      window.setTimeout(tick, 28);
      return;
    }

    charIndex -= 1;
    typedReviewText.textContent = current.slice(0, Math.max(charIndex, 0));

    if (charIndex <= 0) {
      deleting = false;
      reviewIndex = (reviewIndex + 1) % reviews.length;
      window.setTimeout(tick, 300);
      return;
    }

    window.setTimeout(tick, 16);
  };

  typedReviewText.textContent = "";
  tick();
}

function updateMobileCounter() {
  if (!galleryCounter || !mobileSlides.length) return;
  galleryCounter.textContent = `${mobileActiveIndex + 1} / ${mobileSlides.length}`;
}

function setMobileActiveSlide(nextIndex) {
  if (!mobileSlides.length) return;

  const total = mobileSlides.length;
  mobileActiveIndex = (nextIndex + total) % total;

  mobileSlides.forEach((item, index) => {
    const isActive = index === mobileActiveIndex;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-hidden", String(!isActive));
    if (isActive) {
      item.removeAttribute("tabindex");
    } else {
      item.setAttribute("tabindex", "-1");
    }
  });

  updateMobileCounter();
}

function teardownMobileCarousel() {
  if (!galleryGrid || !isMobileCarousel) return;

  mobileSlides.forEach((item) => {
    item.classList.remove("is-active");
    item.removeAttribute("aria-hidden");
    item.removeAttribute("tabindex");
  });

  mobileSlides = [];
  mobileActiveIndex = 0;
  mobileStepLocked = false;
  isMobileCarousel = false;

  if (galleryCounter) galleryCounter.textContent = `1 / ${galleryItems.length}`;
}

function initMobileCarousel() {
  if (!galleryGrid || isMobileCarousel) return;

  mobileSlides = Array.from(galleryGrid.querySelectorAll(".gallery-item"));
  if (mobileSlides.length < 2) return;

  isMobileCarousel = true;
  mobileActiveIndex = 0;
  setMobileActiveSlide(mobileActiveIndex);
}

function handleGalleryStep(direction) {
  if (!isMobileCarousel || !mobileSlides.length || mobileStepLocked) return;

  mobileStepLocked = true;
  setMobileActiveSlide(mobileActiveIndex + direction);

  window.setTimeout(() => {
    mobileStepLocked = false;
  }, 220);
}

function setupMobileGalleryCarousel() {
  if (!galleryGrid || !galleryPrev || !galleryNext) return;

  const mobileQuery = window.matchMedia("(max-width: 759px)");

  const syncMode = () => {
    if (mobileQuery.matches) {
      initMobileCarousel();
    } else {
      teardownMobileCarousel();
    }
  };

  syncMode();

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener("change", syncMode);
  } else {
    mobileQuery.addListener(syncMode);
  }

  galleryPrev.addEventListener("click", () => handleGalleryStep(-1));
  galleryNext.addEventListener("click", () => handleGalleryStep(1));
}

function setupHeroVideoPlayback() {
  if (!heroVideo) return;
  const targetRate = 0.74;

  const applyRate = () => {
    heroVideo.playbackRate = targetRate;
  };

  heroVideo.loop = true;
  applyRate();
  heroVideo.addEventListener("loadedmetadata", applyRate);
  heroVideo.addEventListener("play", applyRate);
}

function setupTrimmedVideoLoop(videoElement) {
  if (!videoElement || videoElement.dataset.trimBound === "true") return;

  const cutTail = Number(videoElement.dataset.cutTail || "0");
  const startAt = Number(videoElement.dataset.startAt || "0");
  const playbackRate = Number(videoElement.dataset.playbackRate || "1");

  const hasCutTail = Number.isFinite(cutTail) && cutTail > 0;
  const hasStartOffset = Number.isFinite(startAt) && startAt > 0;
  if (!hasCutTail && !hasStartOffset) return;

  videoElement.dataset.trimBound = "true";
  videoElement.loop = false;

  const restartFrom = () => {
    if (!Number.isFinite(videoElement.duration) || videoElement.duration <= 0) return 0.03;

    if (!hasStartOffset) return 0.03;

    const maxStart = Math.max(0.03, videoElement.duration - (hasCutTail ? cutTail + 0.3 : 0.35));
    return Math.min(startAt + 0.03, maxStart);
  };

  if (hasStartOffset) {
    videoElement.addEventListener("loadedmetadata", () => {
      videoElement.currentTime = restartFrom();
    });

    videoElement.addEventListener("play", () => {
      if (videoElement.currentTime < startAt - 0.05) {
        videoElement.currentTime = restartFrom();
      }
    });
  }

  if (Number.isFinite(playbackRate) && playbackRate > 0 && playbackRate !== 1) {
    const applyPlaybackRate = () => {
      videoElement.playbackRate = playbackRate;
    };
    applyPlaybackRate();
    videoElement.addEventListener("loadedmetadata", applyPlaybackRate);
    videoElement.addEventListener("play", applyPlaybackRate);
  }

  videoElement.addEventListener("timeupdate", () => {
    if (!Number.isFinite(videoElement.duration) || videoElement.duration <= 0.2) return;

    const loopTail = hasCutTail ? cutTail : 0.08;
    if (videoElement.duration <= loopTail + 0.2) return;
    if (videoElement.currentTime < videoElement.duration - loopTail) return;

    videoElement.currentTime = restartFrom();
    if (!videoElement.paused) {
      videoElement.play().catch(() => {});
    }
  });

  videoElement.addEventListener("ended", () => {
    videoElement.currentTime = restartFrom();
    videoElement.play().catch(() => {});
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
    setupTrimmedVideoLoop(videoElement);
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
setupTypedReviews();
setupMobileGalleryCarousel();
setupHeroVideoPlayback();
setupLazyVideos();
onScroll();

const yearNode = document.getElementById("year");
if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}
