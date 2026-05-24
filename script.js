const stage = document.getElementById("stage");
const panels = Array.from(document.querySelectorAll(".panel"));
const navLinks = Array.from(document.querySelectorAll(".nav-link"));
const dots = Array.from(document.querySelectorAll(".dot"));
const navOrbit = document.querySelector(".nav-orbit");
const loader = document.getElementById("loader");
const loaderPercent = document.getElementById("loaderPercent");
const loadingFill = document.getElementById("loadingFill");
const loadingRocket = document.getElementById("loadingRocket");

let activeIndex = 0;
let isSnapping = false;
let wheelDelta = 0;
let lastSnapAt = 0;
let touchStartY = 0;
let scrollAnimationId = null;
const revealedPanels = new Set();

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function smoothScrollTo(targetTop, duration = 1250) {
  if (scrollAnimationId) cancelAnimationFrame(scrollAnimationId);

  const startTop = window.scrollY;
  const distance = targetTop - startTop;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = clamp(elapsed / duration, 0, 1);
    const eased = easeInOutCubic(progress);

    window.scrollTo(0, startTop + distance * eased);

    if (progress < 1) {
      scrollAnimationId = requestAnimationFrame(step);
      return;
    }

    scrollAnimationId = null;
    isSnapping = false;
    wheelDelta = 0;
  }

  scrollAnimationId = requestAnimationFrame(step);
}

function updateNav(index) {
  navLinks.forEach((link, i) => link.classList.toggle("active", i === index));
  dots.forEach((dot, i) => dot.classList.toggle("active", i === index));

  if (navOrbit && navLinks[index]) {
    const link = navLinks[index];
    navOrbit.style.width = `${link.offsetWidth}px`;
    navOrbit.style.transform = `translateX(${link.offsetLeft - 4}px)`;
  }
}

function revealPanel(index) {
  if (revealedPanels.has(index)) return;
  revealedPanels.add(index);
  const revealItems = panels[index].querySelectorAll(".reveal-group > *");
  gsap.fromTo(
    revealItems,
    { opacity: 0, y: 34, filter: "blur(10px)" },
    {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 1.1,
      stagger: 0.1,
      ease: "power3.out",
      delay: 0.24
    }
  );
}

function goToSection(index) {
  const next = clamp(index, 0, panels.length - 1);
  activeIndex = next;
  updateNav(activeIndex);

  isSnapping = true;
  smoothScrollTo(panels[activeIndex].offsetTop);
  revealPanel(activeIndex);
}

function snapByDirection(direction) {
  const now = performance.now();
  if (isSnapping || now - lastSnapAt < 950) return;
  lastSnapAt = now;
  goToSection(activeIndex + direction);
}

function handleWheel(event) {
  event.preventDefault();
  wheelDelta += event.deltaY;

  if (Math.abs(wheelDelta) < 35) return;
  snapByDirection(wheelDelta > 0 ? 1 : -1);
  wheelDelta = 0;
}

function handleKeydown(event) {
  const forwardKeys = ["ArrowDown", "PageDown", " "];
  const backKeys = ["ArrowUp", "PageUp"];

  if (forwardKeys.includes(event.key)) {
    event.preventDefault();
    snapByDirection(1);
  }

  if (backKeys.includes(event.key)) {
    event.preventDefault();
    snapByDirection(-1);
  }
}

function initControls() {
  window.addEventListener("wheel", handleWheel, { passive: false });
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("touchstart", (event) => {
    touchStartY = event.touches[0].clientY;
  }, { passive: true });
  window.addEventListener("touchend", (event) => {
    const deltaY = touchStartY - event.changedTouches[0].clientY;
    if (Math.abs(deltaY) < 48) return;
    snapByDirection(deltaY > 0 ? 1 : -1);
  }, { passive: true });

  [...navLinks, ...dots, ...document.querySelectorAll("[data-section]")].forEach((item) => {
    item.addEventListener("click", () => {
      const target = Number(item.dataset.section);
      if (!Number.isNaN(target)) goToSection(target);
    });
  });

  updateNav(0);
}

function initSectionObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const index = panels.indexOf(entry.target);
      if (index < 0) return;
      activeIndex = index;
      updateNav(index);
      revealPanel(index);
    });
  }, { threshold: 0.45 });

  panels.forEach((panel) => observer.observe(panel));
}

function initLoader() {
  const loadTimeline = gsap.timeline({
    defaults: { ease: "power2.out" },
    onComplete: () => {
      loader.classList.add("hidden");
      revealPanel(0);
      gsap.fromTo(".nav-shell", { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out" });
    }
  });

  loadTimeline.to({ value: 0 }, {
    value: 100,
    duration: 2.85,
    ease: "power1.inOut",
    onUpdate() {
      const progress = Math.round(this.targets()[0].value);
      loaderPercent.textContent = `${progress}%`;
      loadingFill.style.width = `${progress}%`;
      loadingRocket.style.left = `${progress}%`;
    }
  });

  loadTimeline.to(loader, { opacity: 0, duration: 0.8, ease: "power2.inOut" }, "+=0.2");
}

function initTyping() {
  const target = document.getElementById("typingText");
  const text = target.textContent.trim();
  target.textContent = "";

  let i = 0;
  const interval = window.setInterval(() => {
    target.textContent = text.slice(0, i);
    i += 1;
    if (i > text.length) window.clearInterval(interval);
  }, 42);
}

function initMagnetic() {
  document.querySelectorAll(".magnetic").forEach((item) => {
    item.addEventListener("mousemove", (event) => {
      const rect = item.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const moveX = (x - rect.width / 2) * 0.12;
      const moveY = (y - rect.height / 2) * 0.12;

      item.style.setProperty("--mx", `${x}px`);
      item.style.setProperty("--my", `${y}px`);
      gsap.to(item, { x: moveX, y: moveY, duration: 0.35, ease: "power3.out" });
    });

    item.addEventListener("mouseleave", () => {
      gsap.to(item, { x: 0, y: 0, rotateX: 0, rotateY: 0, duration: 0.55, ease: "elastic.out(1, 0.45)" });
    });
  });

  document.querySelectorAll(".skill-card, .project-card").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateY = ((x / rect.width) - 0.5) * 8;
      const rotateX = -((y / rect.height) - 0.5) * 8;
      gsap.to(card, { rotateX, rotateY, z: 20, duration: 0.4, ease: "power3.out" });
    });
  });
}

function initParallax() {
  const orbitX = gsap.quickTo(".orbital-display", "x", { duration: 1.2, ease: "power3.out" });
  const orbitY = gsap.quickTo(".orbital-display", "y", { duration: 1.2, ease: "power3.out" });
  const astronautX = gsap.quickTo(".astronaut-hero", "x", { duration: 1.4, ease: "power3.out" });
  const astronautY = gsap.quickTo(".astronaut-hero", "y", { duration: 1.4, ease: "power3.out" });
  const contactX = gsap.quickTo(".contact-astronaut", "x", { duration: 1.4, ease: "power3.out" });
  const contactY = gsap.quickTo(".contact-astronaut", "y", { duration: 1.4, ease: "power3.out" });
  let queued = false;
  let px = 0;
  let py = 0;

  window.addEventListener("mousemove", (event) => {
    if (window.innerWidth < 900) return;
    px = (event.clientX / window.innerWidth - 0.5) * 2;
    py = (event.clientY / window.innerHeight - 0.5) * 2;

    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      orbitX(px * 10);
      orbitY(py * 7);
      astronautX(px * -14);
      astronautY(py * -10);
      contactX(px * 10);
      contactY(py * -8);
      queued = false;
    });
  });
}

function initTextScramble() {
  const glyphs = "01<>/{}[]ASTRODEV";

  document.querySelectorAll(".nav-link, .brand-text").forEach((item) => {
    const original = item.textContent;
    item.addEventListener("mouseenter", () => {
      let frame = 0;
      const timer = window.setInterval(() => {
        item.textContent = original
          .split("")
          .map((char, i) => {
            if (char === " " || i < frame) return char;
            return glyphs[Math.floor(Math.random() * glyphs.length)];
          })
          .join("");
        frame += 1;
        if (frame > original.length) {
          window.clearInterval(timer);
          item.textContent = original;
        }
      }, 34);
    });
  });
}

function createShootingStar() {
  const star = document.createElement("span");
  star.style.position = "fixed";
  star.style.zIndex = "2";
  star.style.left = `${Math.random() * 80 + 10}%`;
  star.style.top = `${Math.random() * 45 + 5}%`;
  star.style.width = "120px";
  star.style.height = "1px";
  star.style.pointerEvents = "none";
  star.style.background = "linear-gradient(90deg, rgba(188,232,255,0.9), transparent)";
  star.style.filter = "drop-shadow(0 0 8px rgba(129,211,255,0.9))";
  star.style.transform = "rotate(-24deg) translateX(0)";
  document.body.appendChild(star);

  gsap.to(star, {
    x: -520,
    y: 230,
    opacity: 0,
    duration: 1.25,
    ease: "power2.out",
    onComplete: () => star.remove()
  });
}

function initShootingStars() {
  window.setInterval(createShootingStar, 9000);
}

function initResponsiveFallback() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.style.scrollBehavior = "auto";
  }
}

window.addEventListener("load", () => {
  initControls();
  initSectionObserver();
  initTyping();
  initMagnetic();
  initParallax();
  initShootingStars();
  initLoader();
  initResponsiveFallback();
});
