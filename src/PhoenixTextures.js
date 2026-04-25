import * as THREE from 'three';
import { TEXTURE } from './constants.js';

export function createPhoenixTextures() {
  return {
    fireTexture:         createFireTexture(),
    glowTexture:         createGlowTexture(),
    emberTexture:        createEmberTexture(),
    featherAlphaTexture: createFeatherAlphaTexture(),
    crimsonFeatherTex:   createFeatherColorTexture(0xC41E3A, 0xFF6B00),  // deep red → orange tip
    goldFeatherTex:      createFeatherColorTexture(0xB8860B, 0xFFD700),  // dark gold → bright gold tip
    ruffFeatherTex:      createFeatherColorTexture(0xCC3300, 0xFF8800),  // deep orange → amber tip
    fireVolume3D:        create3DFireTexture(64),
  };
}

// ─── 3-D Perlin noise + Data3DTexture ────────────────────────────────────────
// Generates a 64³ RGBA volume where R = fire density (fBm noise), used by all
// phoenix ShaderMaterials via `sampler3D uVolume` for animated fire effects.

const _PERM = (() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // deterministic shuffle (LCG seed so texture is stable across reloads)
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
  return val / max * 0.5 + 0.5; // remap [-1,1] → [0,1]
}

function create3DFireTexture(size) {
  const data = new Uint8Array(size * size * size * 4);
  for (let iz = 0; iz < size; iz++) {
    for (let iy = 0; iy < size; iy++) {
      for (let ix = 0; ix < size; ix++) {
        const n = _fbm3(ix / size * 4.0, iy / size * 4.0, iz / size * 4.0);
        const idx = (iz * size * size + iy * size + ix) * 4;
        data[idx]     = Math.round(n * 255);                               // R: density
        data[idx + 1] = Math.round(Math.max(0, n * 2.0 - 0.8) * 255);    // G: hot core
        data[idx + 2] = Math.round(Math.max(0, n * 3.5 - 2.2) * 255);    // B: bright tip
        data[idx + 3] = Math.round(n * 255);                               // A: opacity
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

// ─── Realistic feather colour texture ────────────────────────────────────────
// Draws a full-colour feather (vane + rachis + barbs) on a transparent canvas.
// baseHex = quill/base colour, tipHex = tip/highlight colour.
// UV (0.5, 0) = feather base (canvas bottom), UV (0.5, 1) = tip (canvas top).

function createFeatherColorTexture(baseHex, tipHex) {
  const canvas = document.createElement('canvas');
  canvas.width  = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, cx = W / 2;

  ctx.clearRect(0, 0, W, H);

  // Feather vane shape — matches featherAlphaTexture scaled ×2
  ctx.beginPath();
  ctx.moveTo(cx, 6);
  ctx.bezierCurveTo(cx + 44, 44,  cx + 40, 164, cx + 10, 240);
  ctx.lineTo(cx - 10, 240);
  ctx.bezierCurveTo(cx - 40, 164, cx - 44, 44,  cx, 6);
  ctx.closePath();
  ctx.save();
  ctx.clip();

  // Colour gradient: dark at base (canvas bottom) → bright at tip (canvas top)
  const [br, bg, bb] = hexToRgb(baseHex);
  const [tr, tg, tb] = hexToRgb(tipHex);
  const grad = ctx.createLinearGradient(0, H, 0, 0);
  grad.addColorStop(0,    `rgb(${Math.round(br*0.45)},${Math.round(bg*0.45)},${Math.round(bb*0.45)})`);
  grad.addColorStop(0.25, `rgb(${br},${bg},${bb})`);
  grad.addColorStop(0.75, `rgb(${tr},${tg},${tb})`);
  grad.addColorStop(1,    `rgb(${Math.min(255,tr+40)},${Math.min(255,tg+40)},${Math.min(255,tb+40)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Barbs: fine diagonal lines from rachis toward vane edges, angled toward tip
  ctx.lineWidth = 0.65;
  for (let i = 0; i < 120; i++) {
    const y = H * 0.02 + H * 0.95 * (i / 120);
    const t = 1 - i / 120;
    const vaneHalf = 38 * Math.sin(Math.PI * (t * 0.82 + 0.18));
    ctx.strokeStyle = `rgba(255,220,160,${0.18 + t * 0.12})`;
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + vaneHalf, y - vaneHalf * 0.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx - vaneHalf, y - vaneHalf * 0.28); ctx.stroke();
  }

  // Rachis: central shaft — cream gradient, tapers toward tip
  const rachisGrad = ctx.createLinearGradient(cx, H, cx, 0);
  rachisGrad.addColorStop(0,   'rgba(255,240,180,0.95)');
  rachisGrad.addColorStop(0.6, 'rgba(255,250,210,0.75)');
  rachisGrad.addColorStop(1,   'rgba(255,255,230,0.40)');
  ctx.strokeStyle = rachisGrad;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx, H - 12);
  ctx.lineTo(cx, 8);
  ctx.stroke();

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function makeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE.CANVAS_SIZE;
  canvas.height = TEXTURE.CANVAS_SIZE;
  return canvas;
}

function toTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// ─── Body / environment textures ─────────────────────────────────────────────

function createFireTexture() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  const size = TEXTURE.CANVAS_SIZE;

  ctx.fillStyle = '#FF4500';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const progress = 1 - y / size;
    const hue = 10 + progress * 40;
    const lightness = 45 + progress * 35;
    ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
    ctx.fillRect(0, y, size, 1);
  }

  for (let i = 0; i < TEXTURE.FIRE_GRADIENT_LAYERS; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size * TEXTURE.FIRE_GRADIENT_FOCUS;
    const radius = Math.random() * 20 + 5;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grd.addColorStop(0, 'rgba(255, 220, 50, 0.5)');
    grd.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  return toTexture(canvas);
}

function createGlowTexture() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  const { GLOW_CENTER_X: cx, GLOW_CENTER_Y: cy, GLOW_RADIUS: r, CANVAS_SIZE: size } = TEXTURE;

  ctx.fillStyle = 'rgb(180, 60, 0)';
  ctx.fillRect(0, 0, size, size);

  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grd.addColorStop(0, 'rgba(255, 200, 50, 1)');
  grd.addColorStop(0.4, 'rgba(255, 100, 0, 1)');
  grd.addColorStop(1, 'rgba(180, 60, 0, 1)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);

  return toTexture(canvas);
}

// Feather silhouette: white pointed-oval on black — used as alphaMap on wing feather planes.
function createFeatherAlphaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, 64, 128);

  const cx = 32;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(cx, 3);
  ctx.bezierCurveTo(cx + 22, 22, cx + 20, 82, cx + 5, 120);
  ctx.lineTo(cx - 5, 120);
  ctx.bezierCurveTo(cx - 20, 82, cx - 22, 22, cx, 3);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function createEmberTexture() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  const size = TEXTURE.CANVAS_SIZE;

  ctx.fillStyle = '#8B2000';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < TEXTURE.EMBER_PARTICLES; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 5 + 2;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grd.addColorStop(0, `hsl(${Math.random() * 30 + 20}, 100%, 70%)`);
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  return toTexture(canvas);
}
