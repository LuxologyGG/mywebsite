# Dub Dropdown Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone `/dub-menu/` page that reproduces Dub's product mega-menu, motion, responsive behavior, and keyboard accessibility.

**Architecture:** Add an isolated static route under `public/dub-menu/`. Keep structure, presentation, and state behavior in separate HTML, CSS, and JavaScript files; export the JavaScript reducer for dependency-free Node tests while guarding browser initialization behind `document`.

**Tech Stack:** Semantic HTML5, modern CSS, inline SVG, vanilla JavaScript, Node's built-in test runner, Cloudflare Wrangler, Playwright browser verification.

---

### Task 1: Establish the accessible standalone route

**Files:**
- Create: `tests/dub-menu-page.test.js`
- Create: `public/dub-menu/index.html`

- [ ] **Step 1: Write the failing route test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pagePath = path.join(__dirname, "../public/dub-menu/index.html");

test("Dub demo exposes an accessible product menu", () => {
  const html = fs.readFileSync(pagePath, "utf8");
  assert.match(html, /aria-controls="product-menu"/);
  assert.match(html, /id="product-menu"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Dub Links/);
  assert.match(html, /Dub Analytics/);
  assert.match(html, /Dub Partners/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/dub-menu-page.test.js`

Expected: FAIL because `public/dub-menu/index.html` does not exist.

- [ ] **Step 3: Add semantic page markup**

Create a complete HTML document containing:

```html
<header class="site-header">
  <nav class="navbar" aria-label="Primary navigation">
    <a class="brand" href="#" aria-label="Dub home">dub</a>
    <button class="product-trigger" aria-expanded="false"
      aria-controls="product-menu">Product</button>
  </nav>
  <section id="product-menu" class="mega-menu" aria-label="Products" hidden>
    <a class="product-card product-card--links" href="#"><h2>Dub Links</h2></a>
    <a class="product-card product-card--analytics" href="#"><h2>Dub Analytics</h2></a>
    <a class="product-card product-card--partners" href="#"><h2>Dub Partners</h2></a>
  </section>
</header>
```

Complete it with the remaining nav links, Log in and Sign up actions, Integrations and API footer tiles, decorative illustrations, mobile controls, stylesheet link, and deferred script.

- [ ] **Step 4: Run the route test and verify GREEN**

Run: `node --test tests/dub-menu-page.test.js`

Expected: 1 test passes.

### Task 2: Define deterministic menu behavior

**Files:**
- Modify: `tests/dub-menu-page.test.js`
- Create: `public/dub-menu/script.js`

- [ ] **Step 1: Add failing reducer tests**

```js
test("menu reducer handles trigger, escape, and outside events", () => {
  const { reduceMenuState } = require("../public/dub-menu/script.js");
  assert.deepEqual(reduceMenuState({ open: false }, { type: "OPEN" }), { open: true });
  assert.deepEqual(reduceMenuState({ open: true }, { type: "TOGGLE" }), { open: false });
  assert.deepEqual(reduceMenuState({ open: true }, { type: "ESCAPE" }), { open: false });
  assert.deepEqual(reduceMenuState({ open: true }, { type: "OUTSIDE" }), { open: false });
});

test("irrelevant events preserve menu state", () => {
  const { reduceMenuState } = require("../public/dub-menu/script.js");
  const state = { open: true };
  assert.strictEqual(reduceMenuState(state, { type: "NOOP" }), state);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/dub-menu-page.test.js`

Expected: existing route test passes and reducer tests fail because `script.js` is missing.

- [ ] **Step 3: Implement the reducer and browser bindings**

```js
function reduceMenuState(state, event) {
  switch (event.type) {
    case "OPEN": return state.open ? state : { ...state, open: true };
    case "CLOSE":
    case "ESCAPE":
    case "OUTSIDE": return state.open ? { ...state, open: false } : state;
    case "TOGGLE": return { ...state, open: !state.open };
    default: return state;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { reduceMenuState };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initNavigation);
}
```

`initNavigation` must synchronize `hidden`, `aria-expanded`, the `is-open` class, and focus. Bind hover with a guarded close delay, trigger click, outside pointer-down, Escape, mobile-menu toggle, and anchor demo click prevention.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/dub-menu-page.test.js`

Expected: all reducer and route tests pass.

### Task 3: Reproduce the visual design and motion

**Files:**
- Create: `public/dub-menu/style.css`
- Modify: `tests/dub-menu-page.test.js`

- [ ] **Step 1: Add failing visual-contract assertions**

```js
test("stylesheet defines menu motion and reduced-motion handling", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "../public/dub-menu/style.css"),
    "utf8"
  );
  assert.match(css, /\.mega-menu\.is-open/);
  assert.match(css, /@keyframes menu-card-in/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/dub-menu-page.test.js`

Expected: visual-contract test fails because `style.css` is missing.

- [ ] **Step 3: Implement the responsive visual system**

Define:

```css
:root {
  --ink: #111;
  --muted: #6b6b6b;
  --line: #e8e8e8;
  --panel: rgba(255, 255, 255, .97);
  --ease-out: cubic-bezier(.16, 1, .3, 1);
}

.mega-menu {
  transform: translateY(-10px) scale(.985);
  transform-origin: 25% 0;
  opacity: 0;
  visibility: hidden;
}

.mega-menu.is-open {
  transform: translateY(0) scale(1);
  opacity: 1;
  visibility: visible;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

Complete the graph-paper canvas, navigation spacing, panel surface, three-card upper grid, two-tile footer, CSS/SVG illustrations, staggered `menu-card-in` animation, mobile drawer, focus states, and compact breakpoint.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/dub-menu-page.test.js`

Expected: all tests pass.

### Task 4: Browser verification and handoff

**Files:**
- Modify only if browser verification exposes a tested defect.

- [ ] **Step 1: Run static verification**

Run:

```bash
node --test tests/dub-menu-page.test.js
node --check public/dub-menu/script.js
git diff --check
```

Expected: all commands exit 0 with no warnings.

- [ ] **Step 2: Serve the Worker**

Run: `npx wrangler dev --port 8787`

Expected: Wrangler reports a ready local server.

- [ ] **Step 3: Verify desktop interactions**

At `http://127.0.0.1:8787/dub-menu/`, confirm Product opens on hover and click, remains open while crossing into the panel, closes on Escape and outside click, restores `aria-expanded="false"`, and shows the five product destinations.

- [ ] **Step 4: Verify responsive and accessibility behavior**

At 390×844, confirm the Menu button exposes navigation, Product expands as an accordion, cards form a single column, no horizontal overflow appears, Tab reaches every action, and reduced-motion mode removes movement.

- [ ] **Step 5: Capture reference screenshots**

Capture desktop at 1024×768 and mobile at 390×844. Compare desktop alignment, card proportions, border radius, shadow, and background grid with the supplied reference.

- [ ] **Step 6: Commit and push**

```bash
git add public/dub-menu tests/dub-menu-page.test.js \
  docs/superpowers/plans/2026-07-13-dub-dropdown-clone.md
git commit -m "feat: add Dub-style product menu"
git push -u origin cursor/dub-dropdown-clone-4409
```
