"use strict";

function reduceMenuState(state, event) {
  switch (event.type) {
    case "OPEN":
      return state.open ? state : { ...state, open: true };
    case "CLOSE":
    case "ESCAPE":
    case "OUTSIDE":
      return state.open ? { ...state, open: false } : state;
    case "TOGGLE":
      return { ...state, open: !state.open };
    case "MOBILE_TOGGLE": {
      const mobileOpen = !state.mobileOpen;
      return {
        ...state,
        mobileOpen,
        open: mobileOpen ? state.open : false,
      };
    }
    case "MOBILE_CLOSE":
      return state.open || state.mobileOpen
        ? { ...state, open: false, mobileOpen: false }
        : state;
    default:
      return state;
  }
}

function initNavigation() {
  const root = document.querySelector("[data-menu-root]");
  if (!root) return;

  const trigger = root.querySelector("#product-trigger");
  const panel = root.querySelector("#product-menu");
  const mobileToggle = root.querySelector(".mobile-toggle");
  const navContent = root.querySelector("#primary-navigation");
  const demoLinks = document.querySelectorAll(".demo-link");
  const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const mobileQuery = window.matchMedia("(max-width: 760px)");

  if (!trigger || !panel || !mobileToggle || !navContent) return;

  let state = { open: false, mobileOpen: false };
  let hoverCloseTimer = 0;
  let panelHideTimer = 0;

  function clearHoverClose() {
    window.clearTimeout(hoverCloseTimer);
    hoverCloseTimer = 0;
  }

  function revealPanel() {
    window.clearTimeout(panelHideTimer);
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");

    window.requestAnimationFrame(() => {
      if (!state.open) return;
      panel.classList.add("is-open");
    });
  }

  function concealPanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    window.clearTimeout(panelHideTimer);
    panelHideTimer = window.setTimeout(() => {
      if (!state.open) panel.hidden = true;
    }, 360);
  }

  function render(previousState) {
    root.classList.toggle("is-product-open", state.open);
    root.classList.toggle("is-mobile-open", state.mobileOpen);
    trigger.setAttribute("aria-expanded", String(state.open));
    mobileToggle.setAttribute("aria-expanded", String(state.mobileOpen));
    navContent.setAttribute("aria-hidden", mobileQuery.matches ? String(!state.mobileOpen) : "false");

    if (state.open && !previousState.open) revealPanel();
    if (!state.open && previousState.open) concealPanel();
  }

  function dispatch(event) {
    const previousState = state;
    state = reduceMenuState(state, event);
    if (state !== previousState) render(previousState);
  }

  function scheduleHoverClose() {
    if (!hoverQuery.matches || mobileQuery.matches) return;
    clearHoverClose();
    hoverCloseTimer = window.setTimeout(() => {
      dispatch({ type: "CLOSE" });
    }, 140);
  }

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    clearHoverClose();
    dispatch({ type: "TOGGLE" });
  });

  trigger.addEventListener("pointerenter", () => {
    if (!hoverQuery.matches || mobileQuery.matches) return;
    clearHoverClose();
    dispatch({ type: "OPEN" });
  });
  trigger.addEventListener("pointerleave", scheduleHoverClose);

  panel.addEventListener("pointerenter", clearHoverClose);
  panel.addEventListener("pointerleave", scheduleHoverClose);

  trigger.addEventListener("focus", () => {
    clearHoverClose();
    dispatch({ type: "OPEN" });
  });

  document.addEventListener("focusin", (event) => {
    if (!state.open) return;
    if (event.target === trigger || panel.contains(event.target)) return;
    dispatch({ type: "CLOSE" });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!root.contains(event.target)) {
      dispatch({ type: state.mobileOpen ? "MOBILE_CLOSE" : "OUTSIDE" });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || (!state.open && !state.mobileOpen)) return;
    const shouldRestoreFocus = state.open;
    dispatch({ type: state.mobileOpen ? "MOBILE_CLOSE" : "ESCAPE" });
    if (shouldRestoreFocus) trigger.focus();
  });

  mobileToggle.addEventListener("click", () => {
    clearHoverClose();
    dispatch({ type: "MOBILE_TOGGLE" });
  });

  function handleViewportChange() {
    if (!mobileQuery.matches && state.mobileOpen) {
      dispatch({ type: "MOBILE_CLOSE" });
    } else {
      navContent.setAttribute(
        "aria-hidden",
        mobileQuery.matches ? String(!state.mobileOpen) : "false"
      );
    }
  }

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", handleViewportChange);
  } else {
    mobileQuery.addListener(handleViewportChange);
  }

  for (const link of demoLinks) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      link.classList.remove("is-pressed");
      void link.offsetWidth;
      link.classList.add("is-pressed");
      window.setTimeout(() => link.classList.remove("is-pressed"), 280);
    });
  }

  render(state);
  window.requestAnimationFrame(() => document.body.classList.add("is-ready"));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { reduceMenuState };
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavigation, { once: true });
  } else {
    initNavigation();
  }
}
