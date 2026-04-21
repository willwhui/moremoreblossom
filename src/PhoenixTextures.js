import * as THREE from 'three';
import { TEXTURE } from './constants.js';

export function createPhoenixTextures() {
  return {
    fireTexture: createFireTexture(),
    glowTexture: createGlowTexture(),
    emberTexture: createEmberTexture(),
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

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const progress = 1 - y / size;
    const hue = Math.max(0, progress * 40);
    const lightness = Math.max(0, progress * 50);
    ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
    ctx.fillRect(0, y, size, 1);
  }

  for (let i = 0; i < TEXTURE.FIRE_GRADIENT_LAYERS; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size * TEXTURE.FIRE_GRADIENT_FOCUS;
    const radius = Math.random() * 20 + 5;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grd.addColorStop(0, 'rgba(255, 200, 0, 0.3)');
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

  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grd.addColorStop(0, 'rgba(255, 150, 0, 1)');
  grd.addColorStop(0.4, 'rgba(255, 100, 0, 0.6)');
  grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);

  return toTexture(canvas);
}

function createEmberTexture() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  const size = TEXTURE.CANVAS_SIZE;

  ctx.fillStyle = '#1a0000';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < TEXTURE.EMBER_PARTICLES; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 3 + 1;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grd.addColorStop(0, `hsl(${Math.random() * 30 + 20}, 100%, 60%)`);
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  return toTexture(canvas);
}
