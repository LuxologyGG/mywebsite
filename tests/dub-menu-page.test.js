const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const demoDirectory = path.join(__dirname, "../public/dub-menu");
const pagePath = path.join(demoDirectory, "index.html");
const scriptPath = path.join(demoDirectory, "script.js");
const stylesheetPath = path.join(demoDirectory, "style.css");

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
  assert.match(css, /\.product-trigger:focus-visible/);
});
