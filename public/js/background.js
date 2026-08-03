/* background.js — Graph-paper background: animated grid, topo lines, and IP-based map layer. */

/* ── Graph-paper background with animated connecting lines ── */
(function () {
  const CELL = 28;            // grid spacing in px
  const DOT_R = 1.2;          // dot radius
  const LINE_W = 1.2;         // connection line width
  const DRAW_SPEED = 0.0018;  // progress per frame (0→1) — ~9s total animation

  const themes = {
    dark:  { bg: '#0a0a0a', dot: 'rgba(255,255,255,0.10)', line: 'rgba(255,255,255,0.18)' },
    light: { bg: '#f5f6fb', dot: 'rgba(0,0,0,0.10)', line: 'rgba(0,0,0,0.15)' }
  };

  let canvas, ctx, cols, rows, edges, drawOrder, progress, raf, theme;

  function init() {
    const container = document.querySelector('.world');
    if (!container) return;
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(canvas);
    ctx = canvas.getContext('2d');
    theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    generate();
    if (mapReady) { mapReady = false; mapCanvas = null; if (bgMode === 'map') { buildMapCanvas(); } }
    if (topoMapReady) { topoMapReady = false; topoMapCanvas = null; if (bgMode === 'topomap') { buildTopoMapCanvas(); } }
    gridCacheDirty = true;
    topoCacheCvs = null;
    if (bgMode === 'topo') generateTopoLines();
  }

  /* Build the random edge set using a spanning-tree so every dot is connected */
  function generate() {
    const w = window.innerWidth, h = window.innerHeight;
    cols = Math.ceil(w / CELL) + 1;
    rows = Math.ceil(h / CELL) + 1;
    const total = cols * rows;

    // adjacency: right, down, down-right, down-left
    const dirs = [[1,0],[0,1],[1,1],[-1,1]];

    // Build all possible edges
    const allEdges = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (const [dc, dr] of dirs) {
          const nc = c + dc, nr = r + dr;
          if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
            allEdges.push([r * cols + c, nr * cols + nc]);
          }
        }
      }
    }

    // Shuffle
    for (let i = allEdges.length - 1; i > 0; i--) {
      const j = Math.random() * (i + 1) | 0;
      [allEdges[i], allEdges[j]] = [allEdges[j], allEdges[i]];
    }

    // Union-Find for spanning tree
    const parent = Array.from({ length: total }, (_, i) => i);
    const rank = new Uint8Array(total);
    function find(x) { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; }
    function union(a, b) {
      a = find(a); b = find(b);
      if (a === b) return false;
      if (rank[a] < rank[b]) [a, b] = [b, a];
      parent[b] = a;
      if (rank[a] === rank[b]) rank[a]++;
      return true;
    }

    // Spanning tree edges (guarantees every node connected)
    const treeEdges = [];
    for (const e of allEdges) {
      if (union(e[0], e[1])) treeEdges.push(e);
    }

    // Add some extra random edges for visual density (~30% of remaining)
    const extraEdges = [];
    for (const e of allEdges) {
      if (find(e[0]) === find(e[1]) && !treeEdges.includes(e)) {
        if (Math.random() < 0.3) extraEdges.push(e);
      }
    }

    edges = treeEdges.concat(extraEdges);

    // BFS from all 4 corners simultaneously to determine draw order
    const cornerNodes = [
      0,                              // top-left
      cols - 1,                       // top-right
      (rows - 1) * cols,              // bottom-left
      (rows - 1) * cols + (cols - 1)  // bottom-right
    ];

    // Build adjacency list from edges
    const adj = Array.from({ length: total }, () => []);
    for (let i = 0; i < edges.length; i++) {
      adj[edges[i][0]].push(i);
      adj[edges[i][1]].push(i);
    }

    const edgeDepth = new Float64Array(edges.length);
    edgeDepth.fill(-1);
    const visited = new Uint8Array(total);
    const queue = [];
    for (const cn of cornerNodes) {
      visited[cn] = 1;
      queue.push(cn);
    }

    let depth = 0;
    while (queue.length) {
      const nextQueue = [];
      for (const node of queue) {
        for (const ei of adj[node]) {
          if (edgeDepth[ei] >= 0) continue;
          const other = edges[ei][0] === node ? edges[ei][1] : edges[ei][0];
          edgeDepth[ei] = depth;
          if (!visited[other]) {
            visited[other] = 1;
            nextQueue.push(other);
          }
        }
      }
      queue.length = 0;
      for (const n of nextQueue) queue.push(n);
      depth++;
    }

    // Sort edges by depth so they draw outward from corners
    drawOrder = edges.map((_, i) => i).sort((a, b) => edgeDepth[a] - edgeDepth[b]);
    const maxDepth = depth || 1;

    // Assign a normalized start time (0→1) to each edge based on depth
    edges.forEach((_, i) => {
      edges[i].startT = edgeDepth[i] / maxDepth;
    });

    progress = 0;
    if (!raf) tick();
  }

  function nodeXY(idx) {
    const c = idx % cols, r = (idx / cols) | 0;
    return [c * CELL, r * CELL];
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    progress = Math.min(1, progress + DRAW_SPEED);
    draw();
  }

  function draw() {
    const w = window.innerWidth, h = window.innerHeight;
    const t = themes[theme] || themes.dark;

    // Background
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, w, h);

    // Grid dots
    ctx.fillStyle = t.dot;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        ctx.arc(c * CELL, r * CELL, DOT_R, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Animated connecting lines
    ctx.strokeStyle = t.line;
    ctx.lineWidth = LINE_W;
    ctx.lineCap = 'round';

    for (const ei of drawOrder) {
      const e = edges[ei];
      const startT = e.startT;
      if (progress <= startT) continue;

      const localP = Math.min(1, (progress - startT) / 0.12); // each line takes 12% of total time to draw
      const eased = localP * localP * (3 - 2 * localP); // smoothstep

      const [x1, y1] = nodeXY(e[0]);
      const [x2, y2] = nodeXY(e[1]);
      const cx = x1 + (x2 - x1) * eased;
      const cy = y1 + (y2 - y1) * eased;

      ctx.globalAlpha = 0.4 + 0.6 * eased;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ── Overlay modes for blog and Explore ── */
  let bgMode = 'grid'; // 'grid', 'wavy', or 'map'
  let wavyTime = 0;
  let wavyLines = [];
  let blendTarget = 0; // 0 = grid, 1 = wavy
  let blendValue = 0;
  const BLEND_SPEED = 0.02; // ~50 frames = ~0.8s transition

  let wavyDrawProgress = 0; // 0→1 how far each line has drawn across
  const WAVY_DRAW_SPEED = 0.012; // ~80 frames = ~1.3s to fully draw

  /* ── Topography lines for Experience tab ── */
  const TOPO_BLEND_SPEED = 0.02;
  let topoBlendTarget = 0;
  let topoBlendValue = 0;
  let topoLines = [];
  let topoTime = 0;
  let topoDrawProgress = 0;
  const TOPO_DRAW_SPEED = 0.006;
  const TOPO_LINE_COUNT = 25;

  /* ── Offscreen caches to avoid per-frame redraws ── */
  let gridCacheCvs = null;
  let gridCacheDirty = true;
  let topoCacheCvs = null;
  let topoCacheFrame = 0;

  function topoNoise(x, y, t) {
    const l1 = Math.sin(x * 0.008 + t) * Math.cos(y * 0.008 + t * 0.7);
    const l2 = Math.sin(x * 0.02 + t * 0.5) * Math.cos(y * 0.02 + t * 0.3) * 0.5;
    const l3 = Math.sin(x * 0.05 + t * 0.2) * Math.cos(y * 0.05 + t * 0.1) * 0.25;
    return l1 + l2 + l3;
  }

  function generateTopoLines() {
    const h = window.innerHeight;
    topoLines = [];
    for (let i = 0; i < TOPO_LINE_COUNT; i++) {
      const baseY = (i / (TOPO_LINE_COUNT - 1)) * h;
      const pos = i / TOPO_LINE_COUNT;
      const brightness = Math.floor(30 + pos * 170);
      topoLines.push({
        baseY,
        brightness,
        terrainFreq: 0.3 + pos * 0.7,
        delay: i * 0.025
      });
    }
    topoDrawProgress = 0;
    topoCacheCvs = null;
    topoCacheFrame = 0;
  }

  function drawTopoLines(alpha) {
    if (alpha < 0.01) return;
    const w = window.innerWidth;

    for (const line of topoLines) {
      const lineP = Math.max(0, Math.min(1, (topoDrawProgress - line.delay) / (1 - line.delay)));
      if (lineP <= 0) continue;
      const eased = lineP * lineP * (3 - 2 * lineP);
      const drawToX = eased * w;

      ctx.beginPath();
      const b = line.brightness;
      ctx.strokeStyle = `rgb(${b},${b},${b})`;
      ctx.globalAlpha = alpha * (0.25 + 0.45 * (line.brightness / 200));
      ctx.lineWidth = 1.5;

      for (let x = 0; x <= drawToX; x += 5) {
        const y = line.baseY + topoNoise(x * line.terrainFreq, line.baseY * line.terrainFreq, topoTime) * 50;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function buildGridCache() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    if (!gridCacheCvs) gridCacheCvs = document.createElement('canvas');
    gridCacheCvs.width = w * dpr;
    gridCacheCvs.height = h * dpr;
    const gc = gridCacheCvs.getContext('2d');
    gc.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = themes[theme] || themes.dark;
    gc.fillStyle = t.dot;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        gc.beginPath();
        gc.arc(c * CELL, r * CELL, DOT_R, 0, Math.PI * 2);
        gc.fill();
      }
    }
    gc.strokeStyle = t.line;
    gc.lineWidth = LINE_W;
    gc.lineCap = 'round';
    for (const ei of drawOrder) {
      const e = edges[ei];
      const [x1, y1] = nodeXY(e[0]);
      const [x2, y2] = nodeXY(e[1]);
      gc.beginPath();
      gc.moveTo(x1, y1);
      gc.lineTo(x2, y2);
      gc.stroke();
    }
    gridCacheDirty = false;
  }

  function buildTopoCache() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    if (!topoCacheCvs) topoCacheCvs = document.createElement('canvas');
    topoCacheCvs.width = w * dpr;
    topoCacheCvs.height = h * dpr;
    const tc = topoCacheCvs.getContext('2d');
    tc.setTransform(dpr, 0, 0, dpr, 0, 0);
    tc.clearRect(0, 0, w, h);
    for (const line of topoLines) {
      tc.beginPath();
      const b = line.brightness;
      tc.strokeStyle = `rgb(${b},${b},${b})`;
      tc.globalAlpha = 0.25 + 0.45 * (line.brightness / 200);
      tc.lineWidth = 1.5;
      for (let x = 0; x <= w; x += 5) {
        const y = line.baseY + topoNoise(x * line.terrainFreq, line.baseY * line.terrainFreq, topoTime) * 50;
        if (x === 0) tc.moveTo(x, y);
        else tc.lineTo(x, y);
      }
      tc.stroke();
    }
  }

  /* ── Map tile system for Explore tab ── */
  const MAP_ZOOM = 12;
  const TILE_DRAW = 512;
  const MAP_BLEND_SPEED = 0.028;
  let mapBlendTarget = 0;
  let mapBlendValue = 0;
  let mapLocation = null;
  let mapLocationPromise = null;
  let mapCanvas = null;
  let mapCanvasTheme = null;
  let mapReady = false;
  let mapBuilding = false;

  /* ── Topo map tile system for Projects page ── */
  const TOPOMAP_ZOOM = 12;
  const TOPOMAP_TILE = 512;
  const TOPOMAP_BLEND_SPEED = 0.028;
  let topoMapBlendTarget = 0;
  let topoMapBlendValue = 0;
  let topoMapCanvas = null;
  let topoMapCanvasTheme = null;
  let topoMapReady = false;
  let topoMapBuilding = false;

  function parseLocData(data) {
    if (!data) return null;
    let lat, lng;
    if (typeof data.loc === 'string') {
      [lat, lng] = data.loc.split(',').map(Number);
    } else {
      lat = Number(data.latitude ?? data.lat);
      lng = Number(data.longitude ?? data.lng ?? data.lon);
    }
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }

  function loadMapLocation() {
    if (mapLocation) return Promise.resolve(mapLocation);
    try {
      const c = sessionStorage.getItem('map-loc');
      if (c) {
        const p = JSON.parse(c);
        if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
          mapLocation = p;
          return Promise.resolve(p);
        }
      }
    } catch {}
    if (mapLocationPromise) return mapLocationPromise;
    mapLocationPromise = fetch('/api/ip')
      .then(r => { if (!r.ok) throw 0; return r.json(); })
      .then(d => {
        const loc = parseLocData(d);
        if (!loc) throw 0;
        mapLocation = loc;
        const area = [d.city, d.region, d.country].filter(Boolean).join(', ');
        if (area) {
          try { sessionStorage.setItem('map-area', area); } catch {}
        }
        try { sessionStorage.setItem('map-loc', JSON.stringify(loc)); } catch {}
        return loc;
      })
      .catch(() => null)
      .finally(() => { mapLocationPromise = null; });
    return mapLocationPromise;
  }

  function latLonToTile(lat, lon, z) {
    const n = 1 << z;
    const x = ((lon + 180) / 360) * n;
    const r = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n;
    return { x, y };
  }

  async function buildMapCanvas() {
    if (mapBuilding || (mapReady && mapCanvasTheme === theme)) { if (window.hideNavPreloader) window.hideNavPreloader(); return; }
    if (!mapLocation) { if (window.hideNavPreloader) window.hideNavPreloader(); return; }
    mapBuilding = true;

    const z = MAP_ZOOM;
    const { x: txf, y: tyf } = latLonToTile(mapLocation.lat, mapLocation.lng, z);
    const cTX = Math.floor(txf), cTY = Math.floor(tyf);
    const fracX = txf - cTX, fracY = tyf - cTY;
    const w = window.innerWidth, h = window.innerHeight;
    const spanX = Math.ceil(w / TILE_DRAW / 2) + 2;
    const spanY = Math.ceil(h / TILE_DRAW / 2) + 2;
    const maxT = 1 << z;
    const reqs = [];

    for (let dy = -spanY; dy <= spanY; dy++) {
      for (let dx = -spanX; dx <= spanX; dx++) {
        let tx = cTX + dx, ty = cTY + dy;
        if (ty < 0 || ty >= maxT) continue;
        tx = ((tx % maxT) + maxT) % maxT;
        const sx = w / 2 + (dx - fracX) * TILE_DRAW;
        const sy = h / 2 + (dy - fracY) * TILE_DRAW;
        if (sx + TILE_DRAW < -50 || sx > w + 50 || sy + TILE_DRAW < -50 || sy > h + 50) continue;
        reqs.push({ url: `https://basemaps.cartocdn.com/light_nolabels/${z}/${tx}/${ty}@2x.png`, x: sx, y: sy });
      }
    }

    const loaded = await Promise.all(reqs.map(t => new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res({ img, x: t.x, y: t.y });
      img.onerror = () => res(null);
      img.src = t.url;
    })));

    const valid = loaded.filter(Boolean);
    if (!valid.length) { mapBuilding = false; if (window.hideNavPreloader) window.hideNavPreloader(); return; }

    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const oc = off.getContext('2d');

    // Fill base so uncovered areas match
    oc.fillStyle = theme === 'dark' ? '#ffffff' : '#f5f6fb';
    oc.fillRect(0, 0, w, h);
    for (const t of valid) oc.drawImage(t.img, t.x, t.y, TILE_DRAW, TILE_DRAW);

    // Dark mode: invert light tiles → black bg with white roads (toner look)
    if (theme === 'dark') {
      oc.globalCompositeOperation = 'difference';
      oc.fillStyle = '#ffffff';
      oc.fillRect(0, 0, w, h);
      oc.globalCompositeOperation = 'source-over';
    }

    mapCanvas = off;
    mapCanvasTheme = theme;
    mapReady = true;
    mapBuilding = false;
    if (bgMode === 'map') {
      mapBlendTarget = 1;
      if (!raf) tickBlended();
    }
    if (window.hideNavPreloader) window.hideNavPreloader();
  }

  function drawMapLayer(alpha) {
    if (!mapReady || !mapCanvas) return;
    const w = window.innerWidth, h = window.innerHeight;
    const t = themes[theme] || themes.dark;

    // Draw map directly with fade alpha
    ctx.globalAlpha = alpha * (theme === 'dark' ? 0.95 : 0.9);
    ctx.drawImage(mapCanvas, 0, 0);

    // Subtle vignette only at far edges
    const vigR = Math.max(w, h) * 0.6;
    const vg = ctx.createRadialGradient(w / 2, h / 2, vigR * 0.4, w / 2, h / 2, vigR);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, t.bg);
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  function drawMapPin(alpha) {
    if (alpha < 0.4) return;
    const pa = Math.min(1, (alpha - 0.4) / 0.6);
    const w = window.innerWidth, h = window.innerHeight;
    const px = w / 2, py = h / 2;
    const c = theme === 'light' ? '0,0,0' : '255,255,255';

    // Pulse ring
    const pulse = (Math.sin(performance.now() * 0.003) + 1) * 0.5;
    ctx.globalAlpha = pa * (0.25 - pulse * 0.15);
    ctx.strokeStyle = `rgba(${c},0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 14 + pulse * 18, 0, Math.PI * 2);
    ctx.stroke();

    // Static ring
    ctx.globalAlpha = pa * 0.45;
    ctx.strokeStyle = `rgba(${c},0.6)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Core dot
    ctx.globalAlpha = pa * 0.9;
    ctx.fillStyle = `rgba(${c},1)`;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* ── DEM contour line system for Projects page ── */
  async function buildTopoMapCanvas() {
    if (topoMapBuilding || (topoMapReady && topoMapCanvasTheme === theme)) { if (window.hideNavPreloader) window.hideNavPreloader(); return; }
    if (!mapLocation) { if (window.hideNavPreloader) window.hideNavPreloader(); return; }
    topoMapBuilding = true;

    const z = TOPOMAP_ZOOM;
    const { x: txf, y: tyf } = latLonToTile(mapLocation.lat, mapLocation.lng, z);
    const cTX = Math.floor(txf), cTY = Math.floor(tyf);
    const fracX = txf - cTX, fracY = tyf - cTY;
    const w = window.innerWidth, h = window.innerHeight;
    const DEM_SZ = 256;
    const spanX = Math.ceil(w / TOPOMAP_TILE / 2) + 1;
    const spanY = Math.ceil(h / TOPOMAP_TILE / 2) + 1;
    const maxT = 1 << z;
    const gridCols = spanX * 2 + 1;
    const gridRows = spanY * 2 + 1;
    const reqs = [];

    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const dy = gy - spanY, dx = gx - spanX;
        let tx = cTX + dx, ty = cTY + dy;
        if (ty < 0 || ty >= maxT) continue;
        tx = ((tx % maxT) + maxT) % maxT;
        reqs.push({ url: `https://tiles.mapterhorn.com/${z}/${tx}/${ty}.webp`, gx, gy });
      }
    }

    const loaded = await Promise.all(reqs.map(t => new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res({ img, gx: t.gx, gy: t.gy });
      img.onerror = () => res(null);
      img.src = t.url;
    })));

    const valid = loaded.filter(Boolean);
    if (!valid.length) { topoMapBuilding = false; if (window.hideNavPreloader) window.hideNavPreloader(); return; }

    // Composite DEM tiles at native resolution
    const demW = gridCols * DEM_SZ, demH = gridRows * DEM_SZ;
    const demCvs = document.createElement('canvas');
    demCvs.width = demW; demCvs.height = demH;
    const demCtx = demCvs.getContext('2d');
    for (const t of valid) demCtx.drawImage(t.img, t.gx * DEM_SZ, t.gy * DEM_SZ, DEM_SZ, DEM_SZ);

    // Decode Terrarium elevation: height = (R*256 + G + B/256) - 32768
    const demData = demCtx.getImageData(0, 0, demW, demH);
    const px = demData.data;
    const elev = new Float32Array(demW * demH);
    for (let i = 0; i < demW * demH; i++) {
      elev[i] = (px[i * 4] * 256 + px[i * 4 + 1] + px[i * 4 + 2] / 256) - 32768;
    }

    // DEM pixel → screen coordinate transform
    const scale = TOPOMAP_TILE / DEM_SZ;
    const ox = w / 2 - (spanX + fracX) * TOPOMAP_TILE;
    const oy = h / 2 - (spanY + fracY) * TOPOMAP_TILE;
    const d2sx = (dx) => ox + dx * scale;
    const d2sy = (dy) => oy + dy * scale;

    // Viewport bounds in DEM pixels
    const vl = Math.max(0, Math.floor(-ox / scale));
    const vt = Math.max(0, Math.floor(-oy / scale));
    const vr = Math.min(demW - 2, Math.ceil((w - ox) / scale));
    const vb = Math.min(demH - 2, Math.ceil((h - oy) / scale));

    // Elevation range in viewport
    let minE = Infinity, maxE = -Infinity;
    for (let y = vt; y <= vb; y += 3) {
      for (let x = vl; x <= vr; x += 3) {
        const e = elev[y * demW + x];
        if (e > -100 && e < 9000) { minE = Math.min(minE, e); maxE = Math.max(maxE, e); }
      }
    }
    const range = maxE - minE;
    let interval;
    if (range > 3000) interval = 200;
    else if (range > 1500) interval = 100;
    else if (range > 500) interval = 50;
    else if (range > 200) interval = 25;
    else if (range > 50) interval = 10;
    else interval = 5;
    const majorEvery = interval * 5;

    // Output canvas
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const oc = off.getContext('2d');
    oc.fillStyle = theme === 'dark' ? '#0a0a0a' : '#f5f5f0';
    oc.fillRect(0, 0, w, h);

    // Marching squares lookup: bit3=TL bit2=TR bit1=BR bit0=BL
    // edges: 0=top 1=right 2=bottom 3=left
    const MS = [
      null,[[3,2]],[[2,1]],[[3,1]],[[0,1]],'S',[[0,2]],[[0,3]],
      [[0,3]],[[0,2]],'S',[[0,1]],[[3,1]],[[2,1]],[[3,2]],null
    ];

    const lc = theme === 'dark' ? '255,255,255' : '0,0,0';
    const step = 2;
    const startLvl = Math.ceil(minE / interval) * interval;
    const endLvl = Math.floor(maxE / interval) * interval;

    for (let lvl = startLvl; lvl <= endLvl; lvl += interval) {
      const isMajor = lvl % majorEvery === 0;
      oc.strokeStyle = `rgba(${lc},${isMajor ? 0.22 : 0.08})`;
      oc.lineWidth = isMajor ? 1.4 : 0.7;
      oc.beginPath();

      for (let y = vt; y < vb; y += step) {
        for (let x = vl; x < vr; x += step) {
          const tl = elev[y * demW + x];
          const tr = elev[y * demW + x + step];
          const bl = elev[(y + step) * demW + x];
          const br = elev[(y + step) * demW + x + step];
          const sq = (tl >= lvl ? 8 : 0) | (tr >= lvl ? 4 : 0) | (br >= lvl ? 2 : 0) | (bl >= lvl ? 1 : 0);
          if (sq === 0 || sq === 15) continue;

          let segs = MS[sq];
          if (segs === 'S') {
            const c = (tl + tr + br + bl) * 0.25;
            segs = sq === 5
              ? (c >= lvl ? [[0,3],[1,2]] : [[0,1],[3,2]])
              : (c >= lvl ? [[0,1],[3,2]] : [[0,3],[1,2]]);
          }

          for (const [e1, e2] of segs) {
            const ep = (edge) => {
              switch (edge) {
                case 0: { const t = (lvl - tl) / (tr - tl); return [d2sx(x + t * step), d2sy(y)]; }
                case 1: { const t = (lvl - tr) / (br - tr); return [d2sx(x + step), d2sy(y + t * step)]; }
                case 2: { const t = (lvl - bl) / (br - bl); return [d2sx(x + t * step), d2sy(y + step)]; }
                case 3: { const t = (lvl - tl) / (bl - tl); return [d2sx(x), d2sy(y + t * step)]; }
              }
            };
            const [x1, y1] = ep(e1);
            const [x2, y2] = ep(e2);
            oc.moveTo(x1, y1);
            oc.lineTo(x2, y2);
          }
        }
      }
      oc.stroke();
    }

    topoMapCanvas = off;
    topoMapCanvasTheme = theme;
    topoMapReady = true;
    topoMapBuilding = false;
    if (bgMode === 'topomap') {
      topoMapBlendTarget = 1;
      if (!raf) tickBlended();
    }
    if (window.hideNavPreloader) window.hideNavPreloader();
  }

  function drawTopoMapLayer(alpha) {
    if (!topoMapReady || !topoMapCanvas) return;
    const w = window.innerWidth, h = window.innerHeight;
    const t = themes[theme] || themes.dark;

    ctx.globalAlpha = alpha;
    ctx.drawImage(topoMapCanvas, 0, 0);

    // Subtle vignette
    const vigR = Math.max(w, h) * 0.6;
    const vg = ctx.createRadialGradient(w / 2, h / 2, vigR * 0.4, w / 2, h / 2, vigR);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, t.bg);
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  function activateTopoMapMode() {
    if (topoMapReady && topoMapCanvasTheme === theme) {
      topoMapBlendTarget = 1;
      return;
    }
    if (window.showNavPreloader) window.showNavPreloader();
    loadMapLocation().then(loc => {
      if (!loc) { if (window.hideNavPreloader) window.hideNavPreloader(); return; }
      buildTopoMapCanvas();
    });
  }

  function generateWavyLines() {
    const w = window.innerWidth, h = window.innerHeight;
    wavyLines = [];
    const count = Math.floor(h / 32) + 4;
    for (let i = 0; i < count; i++) {
      wavyLines.push({
        y: (i / count) * h,
        amp: 8 + Math.random() * 18,
        freq: 0.003 + Math.random() * 0.006,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.015,
        alpha: 0.06 + Math.random() * 0.12,
        delay: i * 0.04
      });
    }
    wavyDrawProgress = 0;
  }

  function drawBlended() {
    if (blendValue < blendTarget) blendValue = Math.min(blendTarget, blendValue + BLEND_SPEED);
    else if (blendValue > blendTarget) blendValue = Math.max(blendTarget, blendValue - BLEND_SPEED);
    if (mapBlendValue < mapBlendTarget) mapBlendValue = Math.min(mapBlendTarget, mapBlendValue + MAP_BLEND_SPEED);
    else if (mapBlendValue > mapBlendTarget) mapBlendValue = Math.max(mapBlendTarget, mapBlendValue - MAP_BLEND_SPEED);
    if (topoBlendValue < topoBlendTarget) topoBlendValue = Math.min(topoBlendTarget, topoBlendValue + TOPO_BLEND_SPEED);
    else if (topoBlendValue > topoBlendTarget) topoBlendValue = Math.max(topoBlendTarget, topoBlendValue - TOPO_BLEND_SPEED);
    if (topoMapBlendValue < topoMapBlendTarget) topoMapBlendValue = Math.min(topoMapBlendTarget, topoMapBlendValue + TOPOMAP_BLEND_SPEED);
    else if (topoMapBlendValue > topoMapBlendTarget) topoMapBlendValue = Math.max(topoMapBlendTarget, topoMapBlendValue - TOPOMAP_BLEND_SPEED);

    const w = window.innerWidth, h = window.innerHeight;
    const t = themes[theme] || themes.dark;
    const wavyAlpha = blendValue;
    const mapAlpha = mapBlendValue;
    const topoAlpha = topoBlendValue;
    const topoMapAlpha = topoMapBlendValue;
    const gridAlpha = (1 - wavyAlpha) * (1 - mapAlpha) * (1 - topoAlpha) * (1 - topoMapAlpha);

    // Background
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, w, h);

    // Map layer (fades in with blend)
    if (mapAlpha > 0.01) drawMapLayer(mapAlpha);

    // Grid dots and lines (overlay on map)
    if (gridAlpha > 0.01) {
      if (progress >= 1) {
        // Fully drawn — use cached offscreen canvas
        if (gridCacheDirty || !gridCacheCvs) buildGridCache();
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = gridAlpha;
        ctx.drawImage(gridCacheCvs, 0, 0);
        ctx.restore();
      } else {
        // Still animating initial draw-in
        ctx.globalAlpha = gridAlpha;
        ctx.fillStyle = t.dot;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.beginPath();
            ctx.arc(c * CELL, r * CELL, DOT_R, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.strokeStyle = t.line;
        ctx.lineWidth = LINE_W;
        ctx.lineCap = 'round';
        for (const ei of drawOrder) {
          const e = edges[ei];
          if (progress <= e.startT) continue;
          const localP = Math.min(1, (progress - e.startT) / 0.12);
          const eased = localP * localP * (3 - 2 * localP);
          const [x1, y1] = nodeXY(e[0]);
          const [x2, y2] = nodeXY(e[1]);
          ctx.globalAlpha = gridAlpha * (0.4 + 0.6 * eased);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 + (x2 - x1) * eased, y1 + (y2 - y1) * eased);
          ctx.stroke();
        }
      }
    }

    // Map pin
    if (mapAlpha > 0.01) drawMapPin(mapAlpha);

    // Topo map layer (projects page)
    if (topoMapAlpha > 0.01) drawTopoMapLayer(topoMapAlpha);

    // Wavy lines (blog mode)
    if (wavyAlpha > 0.01) {
      wavyTime += 1;
      wavyDrawProgress = Math.min(1, wavyDrawProgress + WAVY_DRAW_SPEED);
      for (const line of wavyLines) {
        const lineP = Math.max(0, Math.min(1, (wavyDrawProgress - line.delay) / (1 - line.delay)));
        if (lineP <= 0) continue;
        const eased = lineP * lineP * (3 - 2 * lineP);
        const drawToX = eased * w;
        ctx.beginPath();
        ctx.strokeStyle = theme === 'light' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
        ctx.globalAlpha = wavyAlpha * (line.alpha + 0.15);
        ctx.lineWidth = 1.2;
        for (let x = 0; x <= drawToX; x += 3) {
          const y = line.y
            + Math.sin(x * line.freq + wavyTime * line.speed + line.phase) * line.amp
            + Math.sin(x * line.freq * 1.8 + wavyTime * line.speed * 0.7) * line.amp * 0.4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // Topography lines (experience mode)
    if (topoAlpha > 0.01) {
      topoTime += 0.003;
      if (topoDrawProgress < 1) {
        // During draw-in: render live
        topoDrawProgress = Math.min(1, topoDrawProgress + TOPO_DRAW_SPEED);
        drawTopoLines(topoAlpha);
      } else if (topoLines.length) {
        // After draw-in: cache to offscreen, refresh every 8 frames
        topoCacheFrame = (topoCacheFrame + 1) % 8;
        if (topoCacheFrame === 0 || !topoCacheCvs) buildTopoCache();
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = topoAlpha;
        ctx.drawImage(topoCacheCvs, 0, 0);
        ctx.restore();
      }
    }

    ctx.globalAlpha = 1;
  }

  function tickBlended() {
    progress = Math.min(1, progress + DRAW_SPEED);
    drawBlended();

    // Stop RAF when everything is settled (no transitions in progress)
    // Keep running if wavy, map, or topo are active (they need continuous animation)
    const settled = progress >= 1
      && blendTarget === 0 && blendValue < 0.001
      && mapBlendTarget === 0 && mapBlendValue < 0.001
      && topoBlendTarget === 0 && topoBlendValue < 0.001
      && topoMapBlendTarget === 0 && topoMapBlendValue < 0.001;

    if (settled) {
      // One final render to snap blend values, then stop
      blendValue = blendTarget;
      mapBlendValue = mapBlendTarget;
      topoBlendValue = topoBlendTarget;
      topoMapBlendValue = topoMapBlendTarget;
      drawBlended();
      raf = null;
    } else {
      raf = requestAnimationFrame(tickBlended);
    }
  }

  function activateMapMode() {
    if (mapReady && mapCanvasTheme === theme) {
      mapBlendTarget = 1;
      return;
    }
    if (window.showNavPreloader) window.showNavPreloader();
    loadMapLocation().then(loc => {
      if (!loc) { if (window.hideNavPreloader) window.hideNavPreloader(); return; }
      buildMapCanvas();
    });
  }

  window._graphPaperSetMode = function (mode) {
    bgMode = mode;
    // Update "What's this?" tooltip text
    const desc = document.getElementById('map-whats-this-desc');
    const areaEl = document.getElementById('map-whats-this-area');
    if (desc) {
      if (mode === 'topomap') desc.textContent = 'The background is a topographic map of your area based on your IP. Contour lines show the elevation around';
      else if (mode === 'map') desc.textContent = 'The background is a grayscale map of your approximate geolocation based on your IP. This current background is based in';
    }
    if (areaEl && areaEl.textContent === '...') {
      try { const a = sessionStorage.getItem('map-area'); if (a) areaEl.textContent = a; } catch {}
    }
    // Hide nav preloader if switching away from a loading mode
    if (mode !== 'map' && mode !== 'topomap') {
      if (window.hideNavPreloader) window.hideNavPreloader();
    }
    if (mode === 'wavy') {
      if (!wavyLines.length) generateWavyLines();
      blendTarget = 1;
      mapBlendTarget = 0;
      topoBlendTarget = 0;
      topoMapBlendTarget = 0;
    } else if (mode === 'map') {
      blendTarget = 0;
      mapBlendTarget = 0;
      topoBlendTarget = 0;
      topoMapBlendTarget = 0;
      activateMapMode();
    } else if (mode === 'topo') {
      generateTopoLines();
      blendTarget = 0;
      mapBlendTarget = 0;
      topoBlendTarget = 1;
      topoMapBlendTarget = 0;
    } else if (mode === 'topomap') {
      blendTarget = 0;
      mapBlendTarget = 0;
      topoBlendTarget = 0;
      topoMapBlendTarget = 0;
      activateTopoMapMode();
    } else {
      blendTarget = 0;
      mapBlendTarget = 0;
      topoBlendTarget = 0;
      topoMapBlendTarget = 0;
    }
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    tickBlended();
  };

  window._graphPaperSetTheme = function (mode) {
    theme = mode;
    gridCacheDirty = true;
    if (mapReady && mapCanvasTheme !== mode) {
      mapReady = false;
      mapCanvas = null;
      if (bgMode === 'map') buildMapCanvas();
    }
    if (topoMapReady && topoMapCanvasTheme !== mode) {
      topoMapReady = false;
      topoMapCanvas = null;
      if (bgMode === 'topomap') buildTopoMapCanvas();
    }
  };

  document.addEventListener('DOMContentLoaded', () => { init(); loadMapLocation(); });
})();
