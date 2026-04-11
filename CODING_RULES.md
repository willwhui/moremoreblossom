# Coding Rules - moremoreblossom Game

This document outlines the core principles and guidelines for developing within the moremoreblossom project.

## 1. Architecture & Design
* **Context First:** Always reference `docs/ARCHITECTURE.md` and `docs/FEATURES.md` before making architectural changes.
* **Three.js Architecture:** Respect the Three.js scene graph structure and separation between rendering and game logic.
* **Game Loop Pattern:** Maintain the separation between initialization (`init()`), update logic (`update()`), and rendering (`animate()`).
* **Separation of Concerns:** Keep files focused on single responsibilities:
  - `Game.js` - Orchestrates scene, camera, renderer, and game state
  - `Player.js` - Player character logic, movement, animation, physics
  - `InputManager.js` - Handles user input (keyboard, virtual joysticks, etc.)
  - Future managers: `EntityManager.js`, `CollisionManager.js`, `AudioManager.js`, etc.
* **Code Reusability:** When implementing new features, extract reusable components and utilities. Avoid duplicating mesh creation, texture generation, or physics calculations.

## 2. Coding Standards
* **Strict JavaScript (ES6+):** Use modern JavaScript features and maintain type consistency where possible.
* **No Magic Numbers:** Define constants at the top of files or in a dedicated `constants.js` for physics values (gravity, speed, jump force, etc.).
* **CSS Organization:** Keep inline styles minimal; use `style.css` for layout and use Three.js materials for 3D styling.
* **Accessibility:** Ensure UI controls are keyboard accessible alongside virtual joystick controls. Support both desktop and mobile input.
* **Performance:** 
  - Avoid creating meshes/textures in the game loop.
  - Use object pooling for frequently created entities (particles, entities, etc.).
  - Profile and optimize rendering with WebGL best practices.

## 3. Development Workflow
* **Incremental Progress:** Make small, atomic, and verifiable changes to game systems.
* **Test-Supported:** Test core game logic (physics simulation, collision detection, movement) independently before integrating with rendering.
* **Documentation Maintenance:** Whenever a new feature is added, modified, or removed, update `docs/FEATURES.md` to reflect the latest game capabilities.
* **Asset Management:** Keep track of all Three.js geometries, materials, and textures. Document any external assets or model imports.
* **Post-Task Verification:** Run `npm run build` locally to verify changes compile correctly before finalizing. Check console for warnings/errors in target platforms (desktop, mobile).

## 4. Mobile-First Considerations
* **Joystick Input:** All movement and interaction should work with virtual joysticks (Nipple.js). Design for touch-first, keyboard as secondary.
* **Performance on Mobile:** Test on actual mobile devices. Optimize draw calls, texture sizes, and geometry complexity for lower-end devices.
* **Capacitor Integration:** Use Capacitor APIs for device-specific features (sensors, vibration, etc.). Keep platform-specific code isolated.
* **Responsive UI:** UI overlays (joystick zones, HUD) must adapt to different screen sizes and orientations.

## 5. Game-Specific Standards
* **Physics Constants:** Define gravity, speeds, and forces in a central location for consistency across all systems.
* **Texture Generation:** When creating procedural textures (fire, glow, ember textures), document the approach and keep generation in dedicated methods.
* **Animation State:** Manage character animations clearly. Document state transitions (idle, running, flying, landing, etc.).
* **Camera System:** The third-person camera system must track the player smoothly. Test camera collision and occlusion handling.
* **Scene Optimization:** Use fog, frustum culling, and LOD (Level of Detail) for distant objects to maintain performance.

## 6. Version Control & Workflow
* **Branch Naming:** Use descriptive names like `feature/player-animation`, `fix/camera-jitter`, `docs/architecture-update`.
* **Commit Messages:** Write clear messages: "Add flying mechanic to Player", "Fix joystick deadzone issue", "Optimize terrain rendering".
* **Feature Development:** Work on features in dedicated branches and create pull requests for review before merging to main.
* **Testing Before Merge:** Verify the game runs without console errors and target features work as intended on both desktop and mobile.

## 7. AI Assistant Preferences
* **Incremental Implementation:** When implementing new game systems, build and test incrementally.
* **Documentation Updates:** Any feature addition should include updates to `docs/FEATURES.md`.
* **Performance First:** Suggest optimizations when adding new rendering or physics features.
* **Mobile Testing:** Request mobile testing for input and performance before considering work complete.
