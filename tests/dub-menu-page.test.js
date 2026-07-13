const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const demoDirectory = path.join(__dirname, "../public/dub-menu");
const pagePath = path.join(demoDirectory, "index.html");
const scriptPath = path.join(demoDirectory, "script.js");
const stylesheetPath = path.join(demoDirectory, "style.css");

function contrastAgainstWhite(hexColor) {
  const channels = hexColor
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ));
  const luminance = (
    (0.2126 * channels[0]) +
    (0.7152 * channels[1]) +
    (0.0722 * channels[2])
  );
  return 1.05 / (luminance + 0.05);
}

test("Dub demo exposes an accessible product menu", () => {
  assert.equal(
    fs.existsSync(pagePath),
    true,
    "expected the standalone /dub-menu/ document to exist"
  );

  const html = fs.readFileSync(pagePath, "utf8");
  assert.match(html, /aria-controls="product-menu"/);
  assert.match(html, /id="product-menu"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Dub Links/);
  assert.match(html, /Dub Analytics/);
  assert.match(html, /Dub Partners/);
  assert.match(html, /Dub Integrations/);
  assert.match(html, /Dub API/);
  assert.match(
    html,
    /<link rel="icon" href="data:image\/svg\+xml,/,
    "expected an embedded favicon so the standalone demo stays request-clean"
  );
  assert.ok(
    html.indexOf('id="product-menu"') < html.indexOf('class="nav-actions"'),
    "expected Product panel before actions so mobile visual and tab order agree"
  );
  assert.match(
    html,
    /id="product-trigger"[\s\S]*?<\/button>\s*<section[\s\S]*?id="product-menu"/,
    "expected Product panel immediately after its trigger in DOM order"
  );
});

test("menu reducer handles open and close events", () => {
  assert.equal(
    fs.existsSync(scriptPath),
    true,
    "expected the menu behavior module to exist"
  );

  const { reduceMenuState } = require(scriptPath);
  assert.deepEqual(
    reduceMenuState({ open: false, mobileOpen: false }, { type: "OPEN" }),
    { open: true, mobileOpen: false }
  );
  assert.deepEqual(
    reduceMenuState({ open: true, mobileOpen: false }, { type: "TOGGLE" }),
    { open: false, mobileOpen: false }
  );

  for (const type of ["CLOSE", "ESCAPE", "OUTSIDE"]) {
    assert.deepEqual(
      reduceMenuState({ open: true, mobileOpen: false }, { type }),
      { open: false, mobileOpen: false }
    );
  }
});

test("menu reducer keeps unrelated state stable", () => {
  assert.equal(
    fs.existsSync(scriptPath),
    true,
    "expected the menu behavior module to exist"
  );

  const { reduceMenuState } = require(scriptPath);
  const state = { open: true, mobileOpen: false };
  assert.strictEqual(reduceMenuState(state, { type: "NOOP" }), state);
});

test("mobile navigation closes its product menu as a unit", () => {
  assert.equal(
    fs.existsSync(scriptPath),
    true,
    "expected the menu behavior module to exist"
  );

  const { reduceMenuState } = require(scriptPath);
  assert.deepEqual(
    reduceMenuState(
      { open: true, mobileOpen: true },
      { type: "MOBILE_CLOSE" }
    ),
    { open: false, mobileOpen: false }
  );
  assert.deepEqual(
    reduceMenuState(
      { open: false, mobileOpen: false },
      { type: "MOBILE_TOGGLE" }
    ),
    { open: false, mobileOpen: true }
  );
});

test("Escape restores focus before dispatching close", () => {
  const { handleEscape } = require(scriptPath);
  const calls = [];

  const handled = handleEscape(
    { open: true, mobileOpen: false },
    () => calls.push("product-focus"),
    () => calls.push("menu-focus"),
    (event) => calls.push(event.type)
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, ["product-focus", "ESCAPE"]);
});

test("mobile Escape restores focus to the visible Menu button", () => {
  const { handleEscape } = require(scriptPath);
  const calls = [];

  const handled = handleEscape(
    { open: true, mobileOpen: true },
    () => calls.push("product-focus"),
    () => calls.push("menu-focus"),
    (event) => calls.push(event.type)
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, ["menu-focus", "MOBILE_CLOSE"]);
});

test("Escape is ignored when all navigation is closed", () => {
  const { handleEscape } = require(scriptPath);
  const calls = [];

  const handled = handleEscape(
    { open: false, mobileOpen: false },
    () => calls.push("product-focus"),
    () => calls.push("menu-focus"),
    (event) => calls.push(event.type)
  );

  assert.equal(handled, false);
  assert.deepEqual(calls, []);
});

test("pointer focus waits for click instead of opening twice", () => {
  const { handleTriggerFocus } = require(scriptPath);
  const events = [];

  const handled = handleTriggerFocus(false, (event) => events.push(event.type));

  assert.equal(handled, false);
  assert.deepEqual(events, []);
});

test("keyboard-visible focus opens the product menu", () => {
  const { handleTriggerFocus } = require(scriptPath);
  const events = [];

  const handled = handleTriggerFocus(true, (event) => events.push(event.type));

  assert.equal(handled, true);
  assert.deepEqual(events, ["OPEN"]);
});

test("programmatic breakpoint focus does not reopen Product", () => {
  const { handleTriggerFocus } = require(scriptPath);
  const events = [];

  const handled = handleTriggerFocus(
    true,
    (event) => events.push(event.type),
    true
  );

  assert.equal(handled, false);
  assert.deepEqual(events, []);
});

test("the click generated by a fresh desktop hover keeps the menu open", () => {
  const { getTriggerClickEvent } = require(scriptPath);

  assert.equal(
    getTriggerClickEvent({
      open: true,
      openedByHover: true,
      hoverCapable: true,
      mobile: false,
    }),
    null
  );
});

test("touch and subsequent clicks still toggle the menu", () => {
  const { getTriggerClickEvent } = require(scriptPath);

  assert.deepEqual(
    getTriggerClickEvent({
      open: false,
      openedByHover: false,
      hoverCapable: false,
      mobile: true,
    }),
    { type: "TOGGLE" }
  );
  assert.deepEqual(
    getTriggerClickEvent({
      open: true,
      openedByHover: false,
      hoverCapable: true,
      mobile: false,
    }),
    { type: "TOGGLE" }
  );
});

test("keyboard focus may traverse the whole navigation while open", () => {
  const { getFocusInEvent } = require(scriptPath);

  assert.equal(
    getFocusInEvent({ open: true, focusInsideRoot: true }),
    null
  );
  assert.deepEqual(
    getFocusInEvent({ open: true, focusInsideRoot: false }),
    { type: "CLOSE" }
  );
  assert.equal(
    getFocusInEvent({ open: false, focusInsideRoot: false }),
    null
  );
});

test("crossing a responsive breakpoint resets open navigation", () => {
  const { getViewportChangeEvent } = require(scriptPath);

  assert.deepEqual(
    getViewportChangeEvent({ open: true, mobileOpen: false }),
    { type: "MOBILE_CLOSE" }
  );
  assert.deepEqual(
    getViewportChangeEvent({ open: false, mobileOpen: true }),
    { type: "MOBILE_CLOSE" }
  );
  assert.equal(
    getViewportChangeEvent({ open: false, mobileOpen: false }),
    null
  );
});

test("breakpoint resets move focus to a control that stays visible", () => {
  const { getBreakpointFocusTarget } = require(scriptPath);

  assert.equal(
    getBreakpointFocusTarget({
      focusWillHide: true,
      enteringMobile: true,
    }),
    "mobile"
  );
  assert.equal(
    getBreakpointFocusTarget({
      focusWillHide: true,
      enteringMobile: false,
    }),
    "product"
  );
  assert.equal(
    getBreakpointFocusTarget({
      focusWillHide: false,
      enteringMobile: true,
    }),
    null
  );
});

test("closed navigation still transfers focus across breakpoints", () => {
  const { getViewportTransitionPlan } = require(scriptPath);

  assert.deepEqual(
    getViewportTransitionPlan({
      enteringMobile: true,
      focusWillHide: true,
      mobileOpen: false,
      open: false,
    }),
    { event: null, focusTarget: "mobile" }
  );
  assert.deepEqual(
    getViewportTransitionPlan({
      enteringMobile: false,
      focusWillHide: true,
      mobileOpen: false,
      open: false,
    }),
    { event: null, focusTarget: "product" }
  );
});

test("panel hiding waits for the breakpoint's longest transition", () => {
  const { getPanelConcealProperty } = require(scriptPath);

  assert.equal(getPanelConcealProperty(false), "transform");
  assert.equal(getPanelConcealProperty(true), "max-height");
});

test("stylesheet defines responsive menu motion and reduced motion", () => {
  assert.equal(
    fs.existsSync(stylesheetPath),
    true,
    "expected the standalone menu stylesheet to exist"
  );

  const css = fs.readFileSync(stylesheetPath, "utf8");
  assert.match(css, /\.mega-menu\.is-open/);
  assert.match(css, /@keyframes\s+menu-card-in/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /max-height:\s*calc\(100dvh - 68px\)/);
  assert.match(css, /\.product-trigger:focus-visible/);
  assert.match(
    css,
    /\.mega-menu\s*\{[^}]*flex:\s*0 0 auto;/s,
    "expected the mobile menu panel not to shrink and clip its cards"
  );
  assert.match(
    css,
    /\.mega-menu\.is-open\s*\{[^}]*transition:\s*max-height/s,
    "expected the mobile open state to retain max-height and padding transitions"
  );

  const footerSubtitle = css.match(
    /\.footer-card__copy small\s*\{[^}]*color:\s*(#[0-9a-f]{6})/i
  );
  assert.ok(footerSubtitle, "expected a hex color for footer subtitles");
  assert.ok(
    contrastAgainstWhite(footerSubtitle[1]) >= 4.5,
    "expected footer subtitle contrast to meet WCAG AA"
  );
});
