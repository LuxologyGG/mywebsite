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

function handleEscape(state, focusTrigger, focusMobileToggle, dispatch) {
  if (!state.open && !state.mobileOpen) return false;

  if (state.mobileOpen) {
    focusMobileToggle();
  } else if (state.open) {
    focusTrigger();
  }
  dispatch({ type: state.mobileOpen ? "MOBILE_CLOSE" : "ESCAPE" });
  return true;
}

function handleTriggerFocus(focusVisible, dispatch, suppressOpen = false) {
  if (!focusVisible || suppressOpen) return false;
  dispatch({ type: "OPEN" });
  return true;
}

function getTriggerClickEvent({
  open,
  openedByHover,
  hoverCapable,
  mobile,
}) {
  if (open && openedByHover && hoverCapable && !mobile) return null;
  return { type: "TOGGLE" };
}

function getFocusInEvent({ open, focusInsideRoot }) {
  if (!open || focusInsideRoot) return null;
  return { type: "CLOSE" };
}

function getViewportChangeEvent({ open, mobileOpen }) {
  if (!open && !mobileOpen) return null;
  return { type: "MOBILE_CLOSE" };
}

function getBreakpointFocusTarget({ focusWillHide, enteringMobile }) {
  if (!focusWillHide) return null;
  return enteringMobile ? "mobile" : "product";
}

function getViewportTransitionPlan({
  enteringMobile,
  focusWillHide,
  mobileOpen,
  open,
}) {
  return {
    event: getViewportChangeEvent({ mobileOpen, open }),
    focusTarget: getBreakpointFocusTarget({
      enteringMobile,
      focusWillHide,
    }),
  };
}

function getPanelConcealProperty(mobile) {
  return mobile ? "max-height" : "transform";
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
  let openedByHover = false;
  let suppressProductFocusOpen = false;

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
    }, 700);
  }

  panel.addEventListener("transitionend", (event) => {
    if (
      event.target !== panel ||
      event.propertyName !== getPanelConcealProperty(mobileQuery.matches)
    ) {
      return;
    }

    window.clearTimeout(panelHideTimer);
    if (!state.open) panel.hidden = true;
  });

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
    if (!state.open) openedByHover = false;
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
    const clickEvent = getTriggerClickEvent({
      open: state.open,
      openedByHover,
      hoverCapable: hoverQuery.matches,
      mobile: mobileQuery.matches,
    });
    openedByHover = false;
    if (clickEvent) dispatch(clickEvent);
  });

  trigger.addEventListener("pointerenter", () => {
    if (!hoverQuery.matches || mobileQuery.matches) return;
    clearHoverClose();
    const wasOpen = state.open;
    dispatch({ type: "OPEN" });
    if (!wasOpen && state.open) openedByHover = true;
  });
  trigger.addEventListener("pointerleave", scheduleHoverClose);

  panel.addEventListener("pointerenter", clearHoverClose);
  panel.addEventListener("pointerleave", scheduleHoverClose);

  trigger.addEventListener("focus", () => {
    clearHoverClose();
    handleTriggerFocus(
      trigger.matches(":focus-visible"),
      dispatch,
      suppressProductFocusOpen
    );
  });

  document.addEventListener("focusin", (event) => {
    const focusEvent = getFocusInEvent({
      open: state.open,
      focusInsideRoot: root.contains(event.target),
    });
    if (focusEvent) dispatch(focusEvent);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!root.contains(event.target)) {
      dispatch({ type: state.mobileOpen ? "MOBILE_CLOSE" : "OUTSIDE" });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    handleEscape(
      state,
      () => trigger.focus({ preventScroll: true }),
      () => mobileToggle.focus({ preventScroll: true }),
      dispatch
    );
  });

  mobileToggle.addEventListener("click", () => {
    clearHoverClose();
    dispatch({ type: "MOBILE_TOGGLE" });
  });

  function handleViewportChange() {
    const activeElement = document.activeElement;
    const enteringMobile = mobileQuery.matches;
    const transitionPlan = getViewportTransitionPlan({
      ...state,
      enteringMobile,
      focusWillHide: enteringMobile
        ? navContent.contains(activeElement)
        : activeElement === mobileToggle || panel.contains(activeElement),
    });

    if (transitionPlan.focusTarget === "mobile") {
      mobileToggle.focus({ preventScroll: true });
    } else if (transitionPlan.focusTarget === "product") {
      suppressProductFocusOpen = true;
      trigger.focus({ preventScroll: true });
      suppressProductFocusOpen = false;
    }

    if (transitionPlan.event) {
      dispatch(transitionPlan.event);
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
  module.exports = {
    getBreakpointFocusTarget,
    getFocusInEvent,
    getPanelConcealProperty,
    getTriggerClickEvent,
    getViewportChangeEvent,
    getViewportTransitionPlan,
    handleEscape,
    handleTriggerFocus,
    reduceMenuState,
  };
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavigation, { once: true });
  } else {
    initNavigation();
  }
}
