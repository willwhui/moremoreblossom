# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:5174 (also accessible on LAN via QR code)
npm run build    # Production build
npm run preview  # Preview production build
```

No automated test suite — verify changes by running the dev server and checking browser console for errors.

## Architecture

This is a browser-based 3D game built with **Three.js** and **Vite**. The player controls a Phoenix character that walks, jumps, and flies through a procedurally generated environment. It targets both desktop (keyboard/mouse) and mobile (virtual joysticks via Nipple.js).

### Core modules

- **`src/main.js`** — Entry point; instantiates `Game` on `DOMContentLoaded`.
- **`src/Game.js`** — Orchestrator. Sets up Three.js scene, camera, renderer, lighting, ground, and trees. Runs the animation loop via `renderer.setAnimationLoop()`, calling `InputManager.getInput()` then `Player.update(dt)` each frame.
- **`src/Player.js`** — Everything about the Phoenix: procedurally built mesh (body, wings with 42 feathers, tail, head, talons), physics (gravity/velocity/flight), animation state machine (idle/walking/flying/landing), and third-person camera.
- **`src/InputManager.js`** — Abstracts keyboard and Nipple.js joystick input into a unified `{ moveVector, lookVector, isJumping }` interface so `Player.update()` never touches raw device events.
- **`src/constants.js`** — Single source of truth for all numeric values: physics (gravity, jump force, air resistance), movement speeds, arena bounds, camera offset/lerp, animation frequencies, mesh dimensions, colors, and material properties. Change game feel here first.

### Data flow

```
User input (keyboard / touch)
  → InputManager  (normalizes to moveVector / lookVector)
  → Game.animate() each frame
  → Player.update(deltaTime)
      ├─ physics (gravity, velocity, flight)
      ├─ movement
      ├─ animation (wings, tail, head)
      └─ camera LERP
  → renderer.render(scene, camera)
```

### Key design decisions

- **No external assets** — all textures (fire, glow, ember) are procedurally generated on `<canvas>` at startup inside `Player.js`.
- **Constants-driven** — `constants.js` holds 200+ values. Avoid introducing magic numbers elsewhere.
- **Boundary-clamping collision** — arena limits are enforced by clamping position to ±98 on X/Z; there is no mesh collision system yet.
- **Mobile-first** — dev server binds to `0.0.0.0`; the QR code plugin lets you test on a phone immediately. All UI (joystick zones, action button) is responsive via CSS media query at ≤700px.

### Scene hierarchy

```
Scene
├── AmbientLight + DirectionalLight (with shadow map)
├── Ground plane (200×200)
├── Tree groups ×60 (procedural pine + deciduous, varied colors/scales)
└── Player group
    ├── Body, neck, head (eyes, beak)
    ├── Wings (primary/secondary/covert feathers — 42 total)
    ├── Tail (5-feather fan)
    └── Feet + talons (3 talons per foot)
```

### Reference docs

- `docs/ARCHITECTURE.md` — detailed class structure and planned extension points (EntityManager, CollisionManager, AudioManager, etc.)
- `docs/FEATURES.md` — implemented vs. planned features
- `CODING_RULES.md` — code standards and mobile considerations
