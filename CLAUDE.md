# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:5174 (also accessible on LAN via QR code)
npm run build    # Production build
npm run preview  # Preview production build
```

No automated test suite — verify changes by running the dev server and checking browser console for errors. Always run `npm run build` before pushing.

## Architecture

This is a browser-based 3D game built with **Three.js** and **Vite**. The player controls a Phoenix character that walks, jumps, and flies through a procedurally generated environment. It targets both desktop (keyboard/mouse) and mobile (virtual joysticks via Nipple.js).

### Core modules

- **`src/main.js`** — Entry point; instantiates `Game` on `DOMContentLoaded`.
- **`src/Game.js`** — Orchestrator. Sets up Three.js scene, camera, renderer, lighting, ground, and trees. Runs the animation loop via `renderer.setAnimationLoop()`, calling `InputManager.getInput()` then `Player.update(dt)` each frame.
- **`src/Player.js`** — Phoenix physics (gravity/velocity/flight), animation state machine (idle/walking/flying/gliding/landing), and third-person camera. Delegates mesh and texture creation to the two modules below. Drives ShaderMaterial time uniforms every frame via `this.shaderMaterials`.
- **`src/PhoenixMesh.js`** — Builds the full Phoenix scene graph (body, wings, tail, head, talons) using GLSL 3.0 `ShaderMaterial` instances that sample a `Data3DTexture` volume for animated fire effects. Returns the root mesh, animated part references, and `shaderMaterials[]` used by `Player`.
- **`src/PhoenixTextures.js`** — Generates all procedural textures at startup: 2D canvas textures (fire, glow, ember, feather alpha, per-species colour feather maps) and a 64³ RGBA `Data3DTexture` (`fireVolume3D`) built from deterministic Perlin fBm noise.
- **`src/InputManager.js`** — Abstracts keyboard and Nipple.js joystick input into a unified `{ moveVector, lookVector, isJumping }` interface so `Player.update()` never touches raw device events.
- **`src/constants.js`** — Single source of truth for all numeric values: physics (gravity, jump force, air resistance), movement speeds, arena bounds, camera offset/lerp, animation frequencies, mesh dimensions, colors, and material properties. Change game feel here first.

### Data flow

```
User input (keyboard / touch)
  → InputManager  (normalizes to moveVector / lookVector)
  → Game.animate() each frame
  → Player.update(deltaTime)
      ├─ ShaderMaterial uTime uniforms updated
      ├─ physics (gravity, velocity, flight)
      ├─ movement
      ├─ animation (wings, tail, head)
      └─ camera LERP
  → renderer.render(scene, camera)
```

### Key design decisions

- **No external assets** — all textures are procedurally generated at startup inside `PhoenixTextures.js`.
- **3D volumetric fire** — all phoenix materials use GLSL 3.0 (`glslVersion: THREE.GLSL3`) `ShaderMaterial` instances sampling a shared `Data3DTexture` (64³ Perlin fBm volume) via `sampler3D uVolume`. World-space UV coordinates give a continuous animated fire pattern across adjacent feathers.
- **Per-material ShaderMaterial instances** — `ShaderMaterial` is used instead of `onBeforeCompile` to avoid shader program cache key / uniform-sharing issues between instances that need independent `uTime`/`uScale` values.
- **Realistic feather colour textures** — `PhoenixTextures.js` generates per-species canvas feather maps (rachis, barbs, colour gradient) used as `map` in `_featherCanvasMat`. The fire volume modulates on top.
- **Anatomy-accurate proportions** — all mesh dimensions and offsets live in `constants.js` MESH section. Neck uses a positive `NECK_ROTATION_X` (narrow end forward-up toward head). Tail uses `TAIL_BASE_TILT` as the resting angle; animations oscillate around it, not zero.
- **Tapered wing membranes** — wing membranes use `THREE.ShapeGeometry` (bezier outline: wide at shoulder, swept leading edge, narrowing to tip) rotated flat with `rotateX(-Math.PI/2)`. Not `PlaneGeometry`.
- **Constants-driven** — `constants.js` holds 200+ values. Avoid introducing magic numbers elsewhere.
- **Boundary-clamping collision** — arena limits are enforced by clamping position to ±98 on X/Z; there is no mesh collision system yet.
- **Mobile-first** — dev server binds to `0.0.0.0`; the QR code plugin lets you test on a phone immediately. All UI (joystick zones, action button) is responsive via CSS media query at ≤700px.
- **Capacitor** — `@capacitor/core` and `@capacitor/cli` are installed for future native iOS/Android packaging; no Capacitor-specific code is active yet.

### Scene hierarchy

```
Scene
├── AmbientLight + DirectionalLight (with shadow map)
├── Ground plane (200×200)
├── Tree groups ×60 (procedural pine + deciduous, varied colors/scales)
└── Player group
    ├── Body (CapsuleGeometry, fire ShaderMaterial)
    ├── Neck (CylinderGeometry, tapered, positive rotation.x = narrow end forward-up)
    ├── Head (SphereGeometry + crest feathers, eyes, beak)
    ├── Wings (ShapeGeometry membrane + primary/secondary/covert feathers — 42 total)
    ├── Tail (5-feather fan, resting angle = MESH.TAIL_BASE_TILT)
    └── Feet + talons (3 talons per foot)
```

### Shader architecture

All phoenix parts share two vertex/fragment shader strings defined at the top of `PhoenixMesh.js`:

- **`_VERT`** — outputs `vWorldPos`, `vNormal`, `vUv` in GLSL 3.0 style (`out` varyings).
- **`_FIRE_COMMON`** — shared fragment preamble: declares `sampler3D uVolume`, `uTime`/scroll/scale/strength uniforms, `fireRamp()` colour function, `halfLambert()` lighting, and `volumeSample()`.
- **`_FRAG_BODY`** / **`_FRAG_FEATHER_ALPHA`** / **`_FRAG_FEATHER_CANVAS`** / **`_FRAG_MEMBRANE`** — fragment bodies that append to `_FIRE_COMMON`.

Uniforms per material: `uVolume` (shared `Data3DTexture`), `uTime`, `uScrollY`, `uScrollZ`, `uScale`, `uStrength`, plus optional `uColorMap` / `uAlphaMap`.

### Reference docs

- `docs/ARCHITECTURE.md` — detailed class structure and planned extension points (EntityManager, CollisionManager, AudioManager, etc.)
- `docs/FEATURES.md` — implemented vs. planned features
- `CODING_RULES.md` — code standards and mobile considerations
