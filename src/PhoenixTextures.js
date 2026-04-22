import * as THREE from 'three';
import { TEXTURE } from './constants.js';

export function createPhoenixTextures() {
  return {
    fireTexture: createFireTexture(),
    glowTexture: createGlowTexture(),
    emberTexture: createEmberTexture(),
    featherAlphaTexture: createFeatherAlphaTexture(),
  };
}

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

function createFireTexture() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  const size = TEXTURE.CANVAS_SIZE;

  ctx.fillStyle = '#FF4500';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const progress = 1 - y / size;
    const hue = 10 + progress * 40;        // red-orange (10) → yellow (50)
    const lightness = 45 + progress * 35;  // always visible: 45% → 80%
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

  // Base so edges are never black (emissiveMap RGB(0,0,0) kills emissive contribution)
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

// Feather silhouette: white pointed-oval on black — used as alphaMap on PlaneGeometry feathers
// so they look like actual feather shapes instead of cones or boxes.
function createFeatherAlphaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, 64, 128);

  // Pointed-oval vane: tip at top (canvas y≈3), widest at ~30%, narrow quill at base (canvas y≈120)
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
