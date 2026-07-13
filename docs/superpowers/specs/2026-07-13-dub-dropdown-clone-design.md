# Dub Dropdown Clone Design

## Goal

Build a standalone `/dub-menu/` demo that closely recreates the desktop product navigation shown on dub.co: the compact top bar, white floating mega-menu, illustrated product cards, grid-paper background, and polished open/close motion.

## Scope

- Add a self-contained static page without changing the existing camr.one homepage.
- Reproduce the visible Dub navigation labels, product-card copy, hierarchy, spacing, borders, shadows, and background treatment from the supplied reference.
- Implement the Product mega-menu. The other top-level links remain presentational links because their menus are outside the supplied reference.
- Use original HTML/CSS illustrations rather than copying proprietary screenshots or source assets.
- Keep all links as safe demo anchors; no authentication or backend behavior is required.

## Architecture

The page lives under `public/dub-menu/` so Cloudflare's static asset binding serves it directly. Markup, styling, and behavior stay in three focused files:

- `index.html`: semantic navigation, mega-menu content, card illustrations, and the quiet page backdrop.
- `style.css`: responsive layout, visual reproduction, transitions, staggered entrances, and reduced-motion overrides.
- `script.js`: a small deterministic menu state reducer plus DOM bindings for pointer, click, keyboard, and mobile behavior.

The reducer is exported in Node and initialized only when a browser document exists. This allows dependency-free tests with Node's built-in test runner.

## Interaction Design

### Desktop

- Product opens on pointer enter, focus, or click.
- Opening animates the panel from slightly above at reduced scale with opacity and blur resolving together.
- Product cards and footer tiles enter with a short stagger.
- The Product pill and chevron animate into their active state.
- Moving from the trigger to the panel keeps it open. Leaving the combined navigation region starts a short close delay to prevent accidental dismissal.
- Escape, outside click, or activating Product again closes the panel and restores focus when appropriate.

### Mobile

- The top bar collapses to a Menu button.
- The navigation expands as a full-width panel; Product behaves as an accordion.
- The card grid becomes a single-column list and decorative illustrations are simplified to keep the layout readable.

### Accessibility

- Use `aria-expanded`, `aria-controls`, landmarks, headings, and descriptive link labels.
- Preserve visible keyboard focus and support Enter, Space, and Escape.
- Under `prefers-reduced-motion: reduce`, remove stagger and transform animation while preserving all state changes.

## Visual System

- White canvas over a 44-pixel light-gray graph grid.
- Compact black wordmark, 14-pixel navigation copy, rounded gray active pill, outlined Log in button, and black Sign up button.
- Mega-menu uses a translucent white surface, thin neutral border, 20-pixel radius, and a soft multi-layer shadow.
- Three large upper cards show Links, Analytics, and Partners. Two shorter lower tiles show Integrations and API.
- Illustrations are built from CSS and inline SVG: link rows, an aqua analytics curve, partner avatars, integration marks, and a code editor.

## Verification

- Unit-test reducer transitions before implementing browser behavior.
- Run Node tests and syntax checks.
- Serve through Wrangler and exercise hover, click, outside-click, Escape, keyboard focus, mobile layout, and reduced motion in a real browser.
- Capture desktop and mobile screenshots and compare the desktop composition against the supplied reference.
