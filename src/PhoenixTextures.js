import * as THREE from 'three';

// Public entry point — returns all textures needed by PhoenixMesh
export function createPhoenixTextures() {
  return {
    bodyFeatherMap: createBodyFeatherMap(),
    wingFeatherMap: createWingFeatherMap(),
    tailFeatherMap: createTailFeatherMap(),
    fireVolume3D:   create3DFireTexture(64),
  };
}

// ─── Perlin fBm noise (deterministic, for 3D fire volume) ─────────────────────

const _PERM = (() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = 0x9e3779b9 >>> 0;
  for (let i = 255; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), 0x85ebca6b) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    const j = s % (i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
})();

function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function _lerp(a, b, t) { return a + t * (b - a); }
function _grad3(h, x, y, z) {
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}
function _noise3(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = _fade(x), v = _fade(y), w = _fade(z);
  const A = _PERM[X] + Y,   AA = _PERM[A] + Z,   AB = _PERM[A + 1] + Z;
  const B = _PERM[X + 1] + Y, BA = _PERM[B] + Z, BB = _PERM[B + 1] + Z;
  return _lerp(
    _lerp(_lerp(_grad3(_PERM[AA],     x,   y,   z),   _grad3(_PERM[BA],     x-1, y,   z),   u),
          _lerp(_grad3(_PERM[AB],     x,   y-1, z),   _grad3(_PERM[BB],     x-1, y-1, z),   u), v),
    _lerp(_lerp(_grad3(_PERM[AA + 1], x,   y,   z-1), _grad3(_PERM[BA + 1], x-1, y,   z-1), u),
          _lerp(_grad3(_PERM[AB + 1], x,   y-1, z-1), _grad3(_PERM[BB + 1], x-1, y-1, z-1), u), v),
    w
  );
}
function _fbm3(x, y, z, oct = 4) {
  let val = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < oct; i++) {
    val += _noise3(x * freq, y * freq, z * freq) * amp;
    max += amp; amp *= 0.5; freq *= 2.0;
  }
  return val / max * 0.5 + 0.5;
}

function create3DFireTexture(size) {
  const data = new Uint8Array(size * size * size * 4);
  for (let iz = 0; iz < size; iz++) {
    for (let iy = 0; iy < size; iy++) {
      for (let ix = 0; ix < size; ix++) {
        const n = _fbm3(ix / size * 4.0, iy / size * 4.0, iz / size * 4.0);
        const idx = (iz * size * size + iy * size + ix) * 4;
        data[idx]     = Math.round(n * 255);
        data[idx + 1] = Math.round(Math.max(0, n * 2.0 - 0.8) * 255);
        data[idx + 2] = Math.round(Math.max(0, n * 3.5 - 2.2) * 255);
        data[idx + 3] = Math.round(n * 255);
      }
    }
  }
  const tex = new THREE.Data3DTexture(data, size, size, size);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function hexRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}
function lerpRgb(a, b, t) {
  return [
    (a[0] + (b[0] - a[0]) * t) | 0,
    (a[1] + (b[1] - a[1]) * t) | 0,
    (a[2] + (b[2] - a[2]) * t) | 0,
  ];
}
function rgbStr(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }
function rgbaStr(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

// ─── Single feather primitive ─────────────────────────────────────────────────
// Draws one realistic feather at (cx, tipY) pointing downward (base at bottom).
// length and width are in canvas pixels.

function _drawFeather(ctx, cx, tipY, width, length, rootColor, tipColor, barbs = true) {
  const baseY = tipY + length;
  ctx.save();
  ctx.translate(cx, tipY);

  // Vane silhouette — bezier left + right halves
  const hw = width * 0.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);                                              // tip
  ctx.bezierCurveTo( hw * 0.7,  length * 0.12,
                     hw * 0.85, length * 0.55,
                     hw * 0.25, length);                         // right side
  ctx.lineTo(-hw * 0.25, length);
  ctx.bezierCurveTo(-hw * 0.85, length * 0.55,
                    -hw * 0.7,  length * 0.12,
                    0, 0);                                       // left side
  ctx.closePath();

  // Colour: tip → root gradient
  const grad = ctx.createLinearGradient(0, 0, 0, length);
  grad.addColorStop(0,    rgbStr(tipColor));
  grad.addColorStop(0.45, rgbStr(lerpRgb(tipColor, rootColor, 0.5)));
  grad.addColorStop(1,    rgbStr(lerpRgb(rootColor, [0, 0, 0], 0.55)));
  ctx.fillStyle = grad;
  ctx.fill();

  // Barbs — fine diagonal lines emanating from the rachis
  if (barbs) {
    ctx.lineWidth = 0.6;
    const steps = Math.max(8, (length / 6) | 0);
    for (let i = 0; i < steps; i++) {
      const t  = i / steps;
      const by = t * length;
      const bw = hw * 0.82 * Math.sin(Math.PI * (t * 0.78 + 0.22));
      const lt = 1 - t;
      ctx.strokeStyle = rgbaStr(lerpRgb(tipColor, [255, 240, 160], lt), 0.18 + lt * 0.14);
      ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo( bw, by - bw * 0.22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(-bw, by - bw * 0.22); ctx.stroke();
    }
  }

  // Rachis — central shaft, cream gradient
  const rachGrad = ctx.createLinearGradient(0, 0, 0, length);
  rachGrad.addColorStop(0,   'rgba(255,252,210,0.95)');
  rachGrad.addColorStop(0.6, 'rgba(240,200,120,0.70)');
  rachGrad.addColorStop(1,   'rgba(180,120, 60,0.30)');
  ctx.strokeStyle = rachGrad;
  ctx.lineWidth = Math.max(1.0, width * 0.028);
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, length - 6);
  ctx.stroke();

  ctx.restore();
}

// ─── Body feather map ─────────────────────────────────────────────────────────
// Tiling texture wrapping the body/neck/head capsules — overlapping rows of
// phoenix feathers, deep crimson at quill, flame-orange/gold at tip.

function createBodyFeatherMap() {
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Rich dark background (quill shadow)
  ctx.fillStyle = '#1a0505';
  ctx.fillRect(0, 0, W, H);

  const ROWS = 14;
  const PER_ROW = 9;
  const fW = (W / PER_ROW) * 1.18;
  const fH = (H / ROWS) * 1.45;

  // Feather colours vary by row: chest (top) = crimson, belly = amber/gold
  const CRIMSON  = hexRgb(0xC41E3A);
  const ORANGE   = hexRgb(0xFF6B00);
  const GOLD     = hexRgb(0xFFB700);
  const DARK_RED = hexRgb(0x7A0010);

  // Draw rows back-to-front (higher row index = closer to viewer = drawn last)
  for (let row = 0; row < ROWS; row++) {
    const tRow = row / (ROWS - 1);               // 0=top, 1=bottom
    const rowY  = tRow * H;
    const stagger = (row % 2) * (fW / 2);

    const rootCol = lerpRgb(DARK_RED, lerpRgb(CRIMSON, DARK_RED, 0.3), tRow);
    const tipCol  = lerpRgb(ORANGE,   GOLD, tRow * 0.7);

    for (let col = -1; col <= PER_ROW; col++) {
      const cx = stagger + col * (W / PER_ROW);
      _drawFeather(ctx, cx, rowY, fW * 0.88, fH, rootCol, tipCol, true);
    }
  }

  // Subtle fire-glow overlay at the chest area (top of texture)
  const glow = ctx.createLinearGradient(0, 0, 0, H * 0.35);
  glow.addColorStop(0,   'rgba(255,100,0,0.18)');
  glow.addColorStop(1,   'rgba(255,100,0,0.00)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H * 0.35);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// ─── Wing feather map ─────────────────────────────────────────────────────────
// Dorsal (top-view) wing layout.
// UV.x = 0 → body/shoulder, UV.x = 1 → wing tip
// UV.y = 0 → leading edge,  UV.y = 1 → trailing edge
// Feathers: small coverts near body/leading, large primaries near tip/trailing.

function createWingFeatherMap() {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#180400';
  ctx.fillRect(0, 0, W, H);

  const CRIMSON = hexRgb(0xC41E3A);
  const ORANGE  = hexRgb(0xFF6B00);
  const AMBER   = hexRgb(0xFF8C00);
  const GOLD    = hexRgb(0xFFD700);
  const DK_RED  = hexRgb(0x6B0010);

  // ── Covert feathers (near leading edge, body-to-mid wing) ───────────────
  // 3 rows × ~12 feathers; short, wide, overlapping toward leading edge (top)
  for (let row = 2; row >= 0; row--) {
    const rowT    = row / 2;
    const yStart  = H * (0.02 + rowT * 0.20);
    const fLen    = H * 0.26;
    const fWid    = W * 0.052;
    const count   = 12 + row * 2;
    const xEnd    = W * (0.65 + rowT * 0.10);
    const tipC    = lerpRgb(AMBER, GOLD, rowT);
    const rootC   = lerpRgb(DK_RED, CRIMSON, rowT * 0.6);

    for (let i = 0; i < count; i++) {
      const t  = i / (count - 1);
      const cx = t * xEnd;
      // Angle coverts to sweep backward from leading → trailing
      ctx.save();
      ctx.translate(cx, yStart);
      ctx.rotate(0.05 + t * 0.04);
      _drawFeather(ctx, 0, 0, fWid, fLen, rootC, tipC, true);
      ctx.restore();
    }
  }

  // ── Secondary feathers (mid-wing, trailing edge) ─────────────────────────
  // 12 feathers from body to mid-wing, medium length
  {
    const COUNT = 12;
    for (let i = COUNT - 1; i >= 0; i--) {
      const t    = i / (COUNT - 1);
      const cx   = W * (0.02 + t * 0.52);
      const fLen = H * (0.55 + t * 0.18);
      const fWid = W * 0.065;
      const yTop = H * 0.08;
      const tipC = lerpRgb(ORANGE, CRIMSON, t * 0.6);
      const rC   = lerpRgb(DK_RED, lerpRgb(CRIMSON, [60, 0, 0], 0.5), t);
      ctx.save();
      ctx.translate(cx, yTop);
      ctx.rotate(0.03 + t * 0.03);
      _drawFeather(ctx, 0, 0, fWid, fLen, rC, tipC, true);
      ctx.restore();
    }
  }

  // ── Primary feathers (wing tip, longest, trailing edge) ──────────────────
  // 10 feathers from mid-wing to tip, fan outward
  {
    const COUNT = 10;
    for (let i = COUNT - 1; i >= 0; i--) {
      const t    = i / (COUNT - 1);
      const cx   = W * (0.48 + t * 0.50);
      const fLen = H * (0.70 + t * 0.22);
      const fWid = W * 0.058;
      const yTop = H * 0.04;
      const fanR = (t - 0.5) * 0.18;           // slight fan angle
      const tipC = lerpRgb(GOLD, CRIMSON, t * 0.4);
      const rC   = lerpRgb(DK_RED, [30, 0, 0], t);
      ctx.save();
      ctx.translate(cx, yTop);
      ctx.rotate(fanR);
      _drawFeather(ctx, 0, 0, fWid, fLen, rC, tipC, true);
      ctx.restore();
    }
  }

  // Warm glow toward the body (left side)
  const leftGlow = ctx.createLinearGradient(0, 0, W * 0.25, 0);
  leftGlow.addColorStop(0,   'rgba(255,80,0,0.22)');
  leftGlow.addColorStop(1,   'rgba(255,80,0,0.00)');
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, W * 0.25, H);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// ─── Tail feather map ─────────────────────────────────────────────────────────
// Top-down view of the tail fan: 9 long streaming feathers arranged in a semicircle.
// UV maps from the ShapeGeometry bounding box — fan origin is at UV midpoint-top.

function createTailFeatherMap() {
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#12050A';
  ctx.fillRect(0, 0, W, H);

  const GOLD    = hexRgb(0xFFD700);
  const AMBER   = hexRgb(0xFF8C00);
  const CRIMSON = hexRgb(0xC41E3A);
  const DK_GOLD = hexRgb(0x8B6914);

  const COUNT      = 9;
  const fanHalf    = Math.PI * 0.32;  // ±~58° total spread
  const featherLen = H * 0.85;
  const featherW   = W * 0.11;
  const originX    = W * 0.5;
  const originY    = H * 0.04;

  // Draw outer feathers first (behind), centre feathers on top
  const order = [];
  for (let i = 0; i < COUNT; i++) order.push(i);
  order.sort((a, b) => Math.abs(a - (COUNT - 1) / 2) - Math.abs(b - (COUNT - 1) / 2));

  for (const i of order) {
    const t     = i / (COUNT - 1);            // 0=left edge, 1=right edge
    const angle = -fanHalf + t * fanHalf * 2; // fan angle
    const tAbs  = Math.abs(t - 0.5) * 2;     // 0=centre, 1=outer edge

    // Outer feathers are shorter and more golden; centre feathers are longest, crimson
    const fLen  = featherLen * (1.0 - tAbs * 0.25);
    const fWid  = featherW   * (1.0 - tAbs * 0.20);
    const tipC  = lerpRgb(GOLD,    AMBER,   tAbs * 0.5);
    const rootC = lerpRgb(CRIMSON, DK_GOLD, tAbs * 0.6);

    ctx.save();
    ctx.translate(originX, originY);
    ctx.rotate(angle);
    _drawFeather(ctx, 0, 0, fWid, fLen, rootC, tipC, true);
    ctx.restore();
  }

  // Hot glow at the root (fan base)
  const rootGlow = ctx.createRadialGradient(originX, originY, 0, originX, originY, H * 0.20);
  rootGlow.addColorStop(0,   'rgba(255,120,0,0.55)');
  rootGlow.addColorStop(0.4, 'rgba(255,60,0,0.20)');
  rootGlow.addColorStop(1,   'rgba(255,40,0,0.00)');
  ctx.fillStyle = rootGlow;
  ctx.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
