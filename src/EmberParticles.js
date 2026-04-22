import * as THREE from 'three';
import { PARTICLES } from './constants.js';

export class EmberParticles {
  constructor(scene) {
    this._pool = [];

    const positions = new Float32Array(PARTICLES.MAX_COUNT * 3);
    const colors = new Float32Array(PARTICLES.MAX_COUNT * 3);

    this._geo = new THREE.BufferGeometry();
    this._geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this._geo.setDrawRange(0, 0);

    const mat = new THREE.PointsMaterial({
      size: PARTICLES.SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    scene.add(new THREE.Points(this._geo, mat));
  }

  update(dt, origin, isFlying) {
    // Spawn new particles this frame
    const rate = isFlying ? PARTICLES.SPAWN_RATE_FLYING : PARTICLES.SPAWN_RATE_GROUND;
    const expected = rate * dt;
    const count = Math.floor(expected) + (Math.random() < (expected % 1) ? 1 : 0);

    for (let i = 0; i < count && this._pool.length < PARTICLES.MAX_COUNT; i++) {
      this._pool.push({
        x: origin.x + (Math.random() - 0.5) * PARTICLES.SPAWN_SPREAD_XZ,
        y: origin.y + PARTICLES.SPAWN_Y_OFFSET,
        z: origin.z + (Math.random() - 0.5) * PARTICLES.SPAWN_SPREAD_XZ,
        vx: (Math.random() - 0.5) * PARTICLES.VEL_XZ,
        vy: PARTICLES.VEL_Y_MIN + Math.random() * (PARTICLES.VEL_Y_MAX - PARTICLES.VEL_Y_MIN),
        vz: (Math.random() - 0.5) * PARTICLES.VEL_XZ,
        age: 0,
        maxAge: PARTICLES.LIFE_MIN + Math.random() * (PARTICLES.LIFE_MAX - PARTICLES.LIFE_MIN),
      });
    }

    // Update existing particles, compact alive ones to front of array
    const pos = this._geo.attributes.position.array;
    const col = this._geo.attributes.color.array;
    let alive = 0;

    for (let i = 0; i < this._pool.length; i++) {
      const p = this._pool[i];
      p.age += dt;
      if (p.age >= p.maxAge) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= PARTICLES.GRAVITY * dt;

      this._pool[alive] = p;

      const t = 1 - p.age / p.maxAge; // 1 = fresh, 0 = dying
      const bi = alive * 3;
      pos[bi]     = p.x;
      pos[bi + 1] = p.y;
      pos[bi + 2] = p.z;
      // young: bright yellow-white → old: deep red
      col[bi]     = 0.6 + 0.4 * t;
      col[bi + 1] = 0.05 + 0.85 * t;
      col[bi + 2] = t * 0.45;

      alive++;
    }

    this._pool.length = alive;
    this._geo.setDrawRange(0, alive);
    this._geo.attributes.position.needsUpdate = true;
    this._geo.attributes.color.needsUpdate = true;
  }
}
