const body = document.body;
const header = document.querySelector(".site-header");
const heroVideo = document.getElementById("heroVideo");
const heroSection = document.querySelector(".hero");
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
let touchStartX = 0;
let touchStartY = 0;
let headerIsScrolled = false;
const desktopVideoQuery = window.matchMedia("(min-width: 980px)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const networkConnection =
  navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;

function addMediaListener(query, callback) {
  if (!query) return;
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", callback);
    return;
  }
  if (typeof query.addListener === "function") {
    query.addListener(callback);
  }
}

function isVideoModeEnabled() {
  const saveDataEnabled = Boolean(networkConnection && networkConnection.saveData);
  return desktopVideoQuery.matches && !reducedMotionQuery.matches && !saveDataEnabled;
}

function syncVideoModeClass() {
  const shouldEnable = isVideoModeEnabled();
  body.classList.toggle("videos-enabled", shouldEnable);
  body.classList.toggle("videos-disabled", !shouldEnable);
}

function ensureVideoSource(videoElement) {
  if (!videoElement) return false;
  let hasSource = false;
  const sources = Array.from(videoElement.querySelectorAll("source[data-src]"));
  sources.forEach((source) => {
    if (source.src) {
      hasSource = true;
      return;
    }
    if (!source.dataset.src) return;
    source.src = source.dataset.src;
    hasSource = true;
  });

  if (!hasSource) return false;
  videoElement.load();
  return true;
}

function unloadVideoSource(videoElement) {
  if (!videoElement) return;
  videoElement.pause();
  videoElement.removeAttribute("src");
  videoElement.removeAttribute("autoplay");

  Array.from(videoElement.querySelectorAll("source")).forEach((source) => {
    source.removeAttribute("src");
  });

  videoElement.load();
}

function removeCinematicSectionOnPhone() {
  if (!window.matchMedia("(max-width: 759px)").matches) return;
  const videoSection = document.getElementById("videos");
  if (videoSection) {
    videoSection.remove();
  }

  const videoNavLink = document.querySelector('.site-nav a[href="#videos"]');
  if (videoNavLink) {
    videoNavLink.remove();
  }
}

function syncBodyLock() {
  const menuOpen = Boolean(nav && nav.classList.contains("is-open"));
  const lightboxOpen = Boolean(lightbox && lightbox.classList.contains("is-active"));
  body.classList.toggle("no-scroll", menuOpen || lightboxOpen);
}

function onScroll() {
  if (!header) return;
  const isScrolled = window.scrollY > 40;
  if (isScrolled === headerIsScrolled) return;
  headerIsScrolled = isScrolled;
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
  const shouldReduceMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.matchMedia("(max-width: 759px)").matches;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: shouldReduceMotion ? "auto" : "smooth"
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
  if (
    !("IntersectionObserver" in window) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.matchMedia("(max-width: 979px)").matches
  ) {
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

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    typedReviewText.textContent = reviews[0];
    if (typedCursor) typedCursor.style.display = "none";
    return;
  }

  if (typedCursor) typedCursor.style.display = "";

  let reviewIndex = 0;
  let charIndex = 0;
  let deleting = false;
  let timerId = null;
  let hasStarted = false;
  const compactViewport = window.matchMedia("(max-width: 759px)").matches;
  const typeDelay = compactViewport ? 36 : 28;
  const deleteDelay = compactViewport ? 22 : 16;

  const setTickTimeout = (delay) => {
    if (timerId) window.clearTimeout(timerId);
    timerId = window.setTimeout(tick, delay);
  };

  const tick = () => {
    timerId = null;
    if (document.hidden) return;

    const current = reviews[reviewIndex];

    if (!deleting) {
      charIndex += 1;
      typedReviewText.textContent = current.slice(0, charIndex);

      if (charIndex >= current.length) {
        deleting = true;
        setTickTimeout(1600);
        return;
      }

      setTickTimeout(typeDelay);
      return;
    }

    charIndex -= 1;
    typedReviewText.textContent = current.slice(0, Math.max(charIndex, 0));

    if (charIndex <= 0) {
      deleting = false;
      reviewIndex = (reviewIndex + 1) % reviews.length;
      setTickTimeout(300);
      return;
    }

    setTickTimeout(deleteDelay);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (timerId) window.clearTimeout(timerId);
      timerId = null;
      return;
    }

    if (hasStarted && !document.hidden && !timerId) {
      setTickTimeout(120);
    }
  });

  const startTyping = () => {
    if (hasStarted) return;
    hasStarted = true;
    typedReviewText.textContent = "";
    tick();
  };

  if (!("IntersectionObserver" in window)) {
    startTyping();
    return;
  }

  const starterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        startTyping();
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.22,
      rootMargin: "0px 0px -10% 0px"
    }
  );

  starterObserver.observe(typedReviewText);
}

function updateMobileCounter() {
  if (!galleryCounter || !mobileSlides.length) return;
  galleryCounter.textContent = `${mobileActiveIndex + 1} / ${mobileSlides.length}`;
}

function primeMobileSlideImage(index) {
  if (!mobileSlides.length) return;
  const total = mobileSlides.length;
  const normalizedIndex = (index + total) % total;
  const image = mobileSlides[normalizedIndex]?.querySelector("img");
  if (!image || image.dataset.primed === "true") return;

  image.dataset.primed = "true";
  const preloadImage = new Image();
  preloadImage.decoding = "async";
  preloadImage.src = image.currentSrc || image.src;
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

  primeMobileSlideImage(mobileActiveIndex);
  primeMobileSlideImage(mobileActiveIndex + 1);
  primeMobileSlideImage(mobileActiveIndex - 1);
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

  mobileSlides.forEach((slide, index) => {
    const image = slide.querySelector("img");
    if (!image) return;
    image.loading = index < 2 ? "eager" : "lazy";
    image.fetchPriority = index === 0 ? "high" : "low";
  });

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

  galleryGrid.addEventListener(
    "touchstart",
    (event) => {
      if (!isMobileCarousel || event.touches.length !== 1) return;
      const touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true }
  );

  galleryGrid.addEventListener(
    "touchend",
    (event) => {
      if (!isMobileCarousel || event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const horizontalSwipe = Math.abs(deltaX) > 36 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
      if (!horizontalSwipe) return;
      handleGalleryStep(deltaX < 0 ? 1 : -1);
    },
    { passive: true }
  );
}

function setupHeroVideoPlayback() {
  if (!heroVideo || !heroSection) return;
  const targetRate = 0.74;
  let hasMarkedReady = false;
  let heroObserver = null;

  const applyRate = () => {
    heroVideo.playbackRate = targetRate;
  };

  const markReady = () => {
    if (hasMarkedReady) return;
    hasMarkedReady = true;
    heroSection.classList.add("is-video-ready");
  };

  const isOnScreen = () => {
    const rect = heroSection.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  };

  const playHeroVideo = () => {
    if (!isVideoModeEnabled()) return;
    heroVideo.play().catch(() => {});
  };

  heroVideo.addEventListener("loadedmetadata", applyRate);
  heroVideo.addEventListener("play", applyRate);
  heroVideo.addEventListener("loadeddata", markReady);
  heroVideo.addEventListener("canplay", markReady);
  heroVideo.addEventListener("playing", markReady);

  const observeHeroVisibility = () => {
    if (heroObserver || !("IntersectionObserver" in window)) return;
    heroObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            playHeroVideo();
            return;
          }
          heroVideo.pause();
        });
      },
      {
        threshold: 0.15
      }
    );
    heroObserver.observe(heroSection);
  };

  const stopHeroObserver = () => {
    if (!heroObserver) return;
    heroObserver.disconnect();
    heroObserver = null;
  };

  const enableHeroVideo = () => {
    const sourceLoaded = ensureVideoSource(heroVideo);
    if (!sourceLoaded) return;
    heroVideo.loop = true;
    applyRate();
    if (heroVideo.readyState >= 2) {
      markReady();
    }
    observeHeroVisibility();
    if (!heroObserver && isOnScreen()) {
      playHeroVideo();
    }
  };

  const disableHeroVideo = () => {
    stopHeroObserver();
    hasMarkedReady = false;
    heroSection.classList.remove("is-video-ready");
    unloadVideoSource(heroVideo);
  };

  const syncHeroVideoMode = () => {
    syncVideoModeClass();
    if (isVideoModeEnabled()) {
      enableHeroVideo();
      return;
    }
    disableHeroVideo();
  };

  syncHeroVideoMode();
  addMediaListener(desktopVideoQuery, syncHeroVideoMode);
  addMediaListener(reducedMotionQuery, syncHeroVideoMode);
  if (networkConnection && typeof networkConnection.addEventListener === "function") {
    networkConnection.addEventListener("change", syncHeroVideoMode);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      heroVideo.pause();
      return;
    }

    if (isVideoModeEnabled() && isOnScreen()) {
      playHeroVideo();
    }
  });
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
  if (!document.getElementById("videos")) return;
  if (!lazyVideos.length) return;
  let videoObserver = null;

  const loadVideo = (videoElement) => {
    if (videoElement.dataset.loaded === "true") return;
    const sourceLoaded = ensureVideoSource(videoElement);
    if (!sourceLoaded) return;
    videoElement.dataset.loaded = "true";
    setupTrimmedVideoLoop(videoElement);
  };

  const disconnectObserver = () => {
    if (!videoObserver) return;
    videoObserver.disconnect();
    videoObserver = null;
  };

  const enableLazyVideos = () => {
    if (!isVideoModeEnabled()) return;
    if (!("IntersectionObserver" in window)) {
      lazyVideos.forEach((videoElement) => {
        loadVideo(videoElement);
        videoElement.play().catch(() => {});
      });
      return;
    }

    disconnectObserver();
    videoObserver = new IntersectionObserver(
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
        rootMargin: "0px 0px 14% 0px"
      }
    );
    lazyVideos.forEach((videoElement) => videoObserver.observe(videoElement));
  };

  const disableLazyVideos = () => {
    disconnectObserver();
    lazyVideos.forEach((videoElement) => {
      delete videoElement.dataset.loaded;
      unloadVideoSource(videoElement);
    });
  };

  const syncLazyVideoMode = () => {
    syncVideoModeClass();
    if (isVideoModeEnabled()) {
      enableLazyVideos();
      return;
    }
    disableLazyVideos();
  };

  syncLazyVideoMode();
  addMediaListener(desktopVideoQuery, syncLazyVideoMode);
  addMediaListener(reducedMotionQuery, syncLazyVideoMode);
  if (networkConnection && typeof networkConnection.addEventListener === "function") {
    networkConnection.addEventListener("change", syncLazyVideoMode);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    lazyVideos.forEach((videoElement) => videoElement.pause());
  });
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

removeCinematicSectionOnPhone();
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
