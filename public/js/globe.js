/* globe.js — Spins a COBE globe to the coordinates /api/ip already returns.
 *
 * COBE is ESM-only, so it is pulled in with a dynamic import the first time the
 * IP card is opened rather than shipped on every page load. Everything here is
 * best-effort: if the module or WebGL is unavailable the canvas is removed and
 * the card renders exactly as it did before.
 *
 * Vendored: cobe@2.0.1, MIT (https://github.com/shuding/cobe)
 */

let ipGlobe = null;

function destroyIpGlobe() {
  if (!ipGlobe) return;
  try { ipGlobe.destroy(); } catch { /* already gone */ }
  ipGlobe = null;
}

async function mountIpGlobe(canvas, loc) {
  destroyIpGlobe();
  if (!canvas) return;

  const [lat, lng] = String(loc || '').split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) { canvas.remove(); return; }

  let createGlobe;
  try {
    ({ default: createGlobe } = await import('/js/vendor/cobe.esm.js'));
  } catch {
    canvas.remove();
    return;
  }

  const light = document.body.classList.contains('light-mode');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const size = 200;

  // Orientation that puts the marker dead centre, found by sweeping candidates
  // and screenshotting: phi needs a quarter-turn offset, and theta reads as half
  // the latitude in radians.
  const theta = (lat * Math.PI) / 360;
  const targetPhi = -(lng * Math.PI) / 180 - Math.PI / 2;
  // Start turned away so the globe visibly rotates to the location on open.
  let phi = reduce ? targetPhi : targetPhi - Math.PI * 1.2;

  try {
    ipGlobe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: size * 2,
      height: size * 2,
      phi,
      theta,
      dark: light ? 0 : 1,
      diffuse: 1.2,
      mapSamples: 14000,
      mapBrightness: light ? 14 : 11,
      baseColor: light ? [0.82, 0.82, 0.86] : [0.4, 0.4, 0.45],
      markerColor: [0.1, 0.8, 1],
      glowColor: light ? [0.9, 0.9, 0.95] : [0.35, 0.35, 0.4],
      markers: [{ location: [lat, lng], size: 0.07 }],
      onRender: (state) => {
        // Ease toward the marker's longitude, then hold it there.
        phi += (targetPhi - phi) * 0.045;
        state.phi = phi;
        state.theta = theta;
      },
    });
    canvas.classList.add('is-ready');
  } catch {
    canvas.remove();
  }
}
