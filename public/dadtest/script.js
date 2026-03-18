document.documentElement.classList.add("js-ready");

const body = document.body;
const preloader = document.querySelector(".preloader");
const canvas = document.querySelector("#canvas");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const progressBar = document.querySelector(".scroll-progress span");
const yearNode = document.querySelector("#year");
const form = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const loadingStartedAt = performance.now();

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

const finishLoading = () => {
  if (!body || body.classList.contains("is-loaded")) {
    return;
  }

  const minimumVisibleTime = prefersReducedMotion.matches ? 0 : 700;
  const elapsed = performance.now() - loadingStartedAt;
  const delay = Math.max(0, minimumVisibleTime - elapsed);

  window.setTimeout(() => {
    body.classList.remove("is-loading");
    body.classList.add("is-loaded");

    if (preloader) {
      window.setTimeout(() => {
        preloader.hidden = true;
      }, 650);
    }
  }, delay);
};

window.addEventListener("load", finishLoading, { once: true });
window.setTimeout(finishLoading, 4500);

const setMenuState = (isOpen) => {
  if (!menuToggle || !siteNav) {
    return;
  }

  menuToggle.classList.toggle("is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  siteNav.classList.toggle("is-open", isOpen);
};

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);
  });

  siteNav.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => setMenuState(false));
  });

  document.addEventListener("click", (event) => {
    if (!siteNav.classList.contains("is-open")) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && !siteNav.contains(target) && !menuToggle.contains(target)) {
      setMenuState(false);
    }
  });
}

const updateProgress = () => {
  if (!progressBar) {
    return;
  }

  const scrollTop = window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  progressBar.style.width = `${Math.min(100, Math.max(0, ratio))}%`;
};

updateProgress();
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const countNodes = document.querySelectorAll("[data-count]");

const animateCount = (node) => {
  const target = Number(node.getAttribute("data-count"));
  if (!target) {
    return;
  }

  const duration = 1400;
  const start = performance.now();
  const initialText = node.textContent.trim();
  const suffixMatch = initialText.match(/[^\d]+$/);
  const suffix = suffixMatch ? suffixMatch[0] : "";

  const frame = (time) => {
    const elapsed = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    const current = Math.round(target * eased);
    node.textContent = `${current}${suffix}`;

    if (elapsed < 1) {
      window.requestAnimationFrame(frame);
    }
  };

  window.requestAnimationFrame(frame);
};

if ("IntersectionObserver" in window) {
  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.55 }
  );

  countNodes.forEach((node) => counterObserver.observe(node));
} else {
  countNodes.forEach((node) => {
    const suffixMatch = node.textContent.trim().match(/[^\d]+$/);
    const suffix = suffixMatch ? suffixMatch[0] : "";
    node.textContent = `${node.getAttribute("data-count")}${suffix}`;
  });
}

const sectionLinks = new Map();
document.querySelectorAll('.site-nav a[href^="#"]').forEach((link) => {
  const hash = link.getAttribute("href");
  if (hash) {
    sectionLinks.set(hash.slice(1), link);
  }
});

const sections = Array.from(document.querySelectorAll("main section[id]")).filter((section) =>
  sectionLinks.has(section.id)
);

if ("IntersectionObserver" in window && sections.length > 0) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visibleEntries.length === 0) {
        return;
      }

      const activeId = visibleEntries[0].target.id;
      sectionLinks.forEach((link, id) => {
        link.classList.toggle("is-active", id === activeId);
      });
    },
    {
      rootMargin: "-30% 0px -55% 0px",
      threshold: [0.2, 0.4, 0.6]
    }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

if (form && formStatus) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const contact = String(formData.get("contact") || "").trim();
    const reason = String(formData.get("reason") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !contact || !reason || !message) {
      formStatus.textContent = "Please complete each field before sending.";
      return;
    }

    const subject = `Appointment request: ${reason}`;
    const bodyText = [
      `Name: ${name}`,
      `Contact: ${contact}`,
      `Reason: ${reason}`,
      "",
      "Message:",
      message
    ].join("\n");

    const mailto = `mailto:info@cbsclinic.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

    formStatus.textContent = "Opening your email app with a drafted message.";
    window.location.href = mailto;
    form.reset();
  });
}

if (canvas) {
  const context = canvas.getContext("2d", { alpha: true, desynchronized: true });

  if (context) {
    const lowPowerDevice =
      (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4) ||
      (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) ||
      window.innerWidth < 900;
    const renderScale = lowPowerDevice ? 0.38 : 0.56;
    const fps = lowPowerDevice ? 16 : 24;
    const frameInterval = 1000 / fps;
    let animationFrameId = 0;
    let lastFrameTime = 0;
    let elapsedSeconds = 0;
    let viewportWidth = 0;
    let viewportHeight = 0;
    let particles = [];

    const getParticleCount = () => {
      if (lowPowerDevice) {
        return 24;
      }

      return window.innerWidth > 1400 ? 48 : 40;
    };

    class Vector2 {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }

      add(vector) {
        return new Vector2(this.x + vector.x, this.y + vector.y);
      }

      subtract(vector) {
        return new Vector2(this.x - vector.x, this.y - vector.y);
      }

      multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
      }

      magnitude() {
        return Math.hypot(this.x, this.y);
      }

      normalize() {
        const magnitude = this.magnitude();
        return magnitude > 0 ? this.multiply(1 / magnitude) : new Vector2();
      }
    }

    const randFloat = (min, max) => Math.random() * (max - min) + min;

    class Particle {
      constructor() {
        this.phase = randFloat(0, Math.PI * 2);
        this.wobble = randFloat(0.35, 1.2);
        this.radius = randFloat(lowPowerDevice ? 16 : 18, lowPowerDevice ? 34 : 44);
        this.color = `rgba(${Math.round(randFloat(184, 236))}, ${Math.round(randFloat(18, 84))}, ${Math.round(randFloat(6, 24))}, ${randFloat(0.2, 0.34).toFixed(3)})`;
        this.reset(true);
      }

      reset(randomizeVelocity = false) {
        const margin = Math.max(viewportWidth, viewportHeight) * 0.18;
        this.position = new Vector2(
          randFloat(-margin, viewportWidth + margin),
          randFloat(-margin, viewportHeight + margin)
        );

        if (randomizeVelocity || !this.velocity) {
          const angle = randFloat(0, Math.PI * 2);
          const speed = randFloat(0.08, lowPowerDevice ? 0.22 : 0.28);
          this.velocity = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
        }
      }

      update(timeValue, deltaScale, attractor) {
        const toAttractor = attractor.subtract(this.position);
        const distance = Math.max(1, toAttractor.magnitude());
        const drift = toAttractor
          .normalize()
          .multiply((0.008 + this.wobble * 0.005) * deltaScale * Math.min(1.6, distance / 180));
        const swirl = new Vector2(-toAttractor.y, toAttractor.x)
          .normalize()
          .multiply((0.005 + this.wobble * 0.004) * deltaScale);
        const pulse = new Vector2(
          Math.sin(timeValue * 0.42 + this.phase),
          Math.cos(timeValue * 0.36 + this.phase)
        ).multiply(0.012 * this.wobble * deltaScale);

        this.velocity = this.velocity.add(drift).add(swirl).add(pulse);

        const maxSpeed = lowPowerDevice ? 0.42 : 0.58;
        if (this.velocity.magnitude() > maxSpeed) {
          this.velocity = this.velocity.normalize().multiply(maxSpeed);
        }

        this.position = this.position.add(this.velocity.multiply(deltaScale));

        const margin = this.radius * 1.6;

        if (this.position.x < -margin || this.position.x > viewportWidth + margin) {
          this.velocity = new Vector2(-this.velocity.x * 0.94, this.velocity.y);
          this.position.x = Math.min(viewportWidth + margin, Math.max(-margin, this.position.x));
        }

        if (this.position.y < -margin || this.position.y > viewportHeight + margin) {
          this.velocity = new Vector2(this.velocity.x, -this.velocity.y * 0.94);
          this.position.y = Math.min(viewportHeight + margin, Math.max(-margin, this.position.y));
        }
      }

      draw() {
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    const resizeCanvas = () => {
      viewportWidth = Math.max(320, Math.round(window.innerWidth * renderScale));
      viewportHeight = Math.max(220, Math.round(window.innerHeight * renderScale));
      canvas.width = viewportWidth;
      canvas.height = viewportHeight;
      particles = Array.from({ length: getParticleCount() }, () => new Particle());
    };

    const getAttractor = (timeValue) =>
      new Vector2(
        viewportWidth * 0.5 + Math.sin(timeValue * 0.16) * viewportWidth * 0.16,
        viewportHeight * 0.5 + Math.cos(timeValue * 0.13) * viewportHeight * 0.12
      );

    const drawBackground = () => {
      context.clearRect(0, 0, viewportWidth, viewportHeight);
      context.fillStyle = "rgb(3, 0, 1)";
      context.fillRect(0, 0, viewportWidth, viewportHeight);

      const gradient = context.createRadialGradient(
        viewportWidth * 0.5,
        viewportHeight * 0.45,
        viewportWidth * 0.04,
        viewportWidth * 0.5,
        viewportHeight * 0.45,
        viewportWidth * 0.7
      );
      gradient.addColorStop(0, "rgba(255, 118, 76, 0.12)");
      gradient.addColorStop(0.32, "rgba(148, 14, 20, 0.12)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, viewportWidth, viewportHeight);
    };

    const drawParticles = (timeValue, deltaScale) => {
      const attractor = getAttractor(timeValue);

      particles.forEach((particle) => {
        particle.update(timeValue, deltaScale, attractor);
        particle.draw();
      });
    };

    const renderFrame = (timeValue, deltaScale) => {
      drawBackground();
      drawParticles(timeValue, deltaScale);
    };

    const stopLoop = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    };

    const loop = (now) => {
      if (document.hidden) {
        stopLoop();
        return;
      }

      if (now - lastFrameTime < frameInterval) {
        animationFrameId = window.requestAnimationFrame(loop);
        return;
      }

      const deltaMs = lastFrameTime ? now - lastFrameTime : frameInterval;
      const deltaScale = Math.min(2, deltaMs / 16.67);
      lastFrameTime = now;
      elapsedSeconds += deltaMs / 1000;
      renderFrame(elapsedSeconds, deltaScale);
      animationFrameId = window.requestAnimationFrame(loop);
    };

    const handleMotionPreference = () => {
      stopLoop();
      resizeCanvas();
      elapsedSeconds = 0;
      lastFrameTime = 0;
      renderFrame(0, 1);

      if (!prefersReducedMotion.matches) {
        animationFrameId = window.requestAnimationFrame(loop);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        handleMotionPreference();
      }
    };

    const handleResize = () => {
      resizeCanvas();
      renderFrame(elapsedSeconds, 1);
    };

    resizeCanvas();
    handleMotionPreference();

    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (typeof prefersReducedMotion.addEventListener === "function") {
      prefersReducedMotion.addEventListener("change", handleMotionPreference);
    } else if (typeof prefersReducedMotion.addListener === "function") {
      prefersReducedMotion.addListener(handleMotionPreference);
    }
  }
}
