# moremoreblossom - Game Architecture

## Project Overview
**moremoreblossom** is a 3D browser-based game built with Three.js, featuring a playable character navigating through an interactive 3D environment. The game is designed to work on both desktop (keyboard/mouse) and mobile (virtual joysticks) platforms using Capacitor for native features.

## Technology Stack
- **Three.js** - 3D rendering engine
- **Vite** - Build tool and development server
- **Nipple.js** - Virtual joystick library for mobile input
- **Capacitor** - Native mobile app wrapper
- **JavaScript (ES6+)** - Core language

## Core Architecture

### 1. Game Loop
The game follows a standard game loop pattern:
```
┌─────────────────────┐
│   Initialization    │ (Game.init())
├─────────────────────┤
│   Game Loop:        │
│  1. Input Handling  │ (InputManager)
│  2. Update Logic    │ (Player.update())
│  3. Render Scene    │ (renderer.render())
├─────────────────────┤
│   Cleanup           │
└─────────────────────┘
```

### 2. Class Structure

#### **Game.js** - Main Orchestrator
- Initializes Three.js scene, camera, and renderer
- Creates game environment (terrain, lighting, sky)
- Manages the game loop via `animate()`
- Instantiates and manages Player and InputManager
- Handles window resize events

**Key Properties:**
- `scene` - Three.js Scene object
- `camera` - PerspectiveCamera with 75° FOV
- `renderer` - WebGLRenderer with shadow mapping
- `player` - Player instance
- `inputManager` - InputManager instance
- `clock` - THREE.Clock for delta time tracking

#### **Player.js** - Character Controller
- Represents the playable character (Phoenix-like bird)
- Handles movement, rotation, and animation states
- Manages physics (velocity, gravity, jumping, flying)
- Creates and updates character mesh and materials
- Implements procedural textures (fire, glow, ember effects)
- Updates third-person camera position

**Key Properties:**
- `mesh` - THREE.Group containing bird geometry
- `velocity` - Current movement velocity (Vector3)
- `isFlying` - Boolean state for flight mode
- `speed` - Ground movement speed (10 units/sec)
- `flightSpeed` - Flight movement speed (20 units/sec)
- `cameraOffset` - Relative camera position from player

**Key Methods:**
- `createPhoenixMesh()` - Builds bird geometry from primitives
- `update(deltaTime)` - Updates position, velocity, animations
- `applyMovement(moveVector, deltaTime)` - Processes input into movement
- `createFireTexture()`, `createGlowTexture()`, `createEmberTexture()` - Procedural textures

#### **InputManager.js** - Input Handler
- Manages virtual joysticks (left: movement, right: look/rotation)
- Tracks keyboard input (as fallback for desktop)
- Abstracts input handling from game logic

**Key Properties:**
- `moveVector` - { x, y } input from left joystick
- `lookVector` - { x, y } input from right joystick
- `isJumping` - Jump input flag
- `joystickLeft`, `joystickRight` - Nipple.js instances

**Key Methods:**
- `init()` - Sets up joystick zones and event listeners
- `getInput()` - Returns current input state

### 3. Three.js Scene Hierarchy
```
Scene
├── Lights
│   ├── AmbientLight (0.6 intensity)
│   └── DirectionalLight (0.8 intensity, with shadows)
├── Environment
│   ├── Ground/Terrain
│   └── Sky/Fog
├── Player (Mesh with sub-components)
│   ├── Bird Geometry
│   ├── Camera Rig
│   └── Particles/Effects
└── Future Entities
    ├── NPCs
    ├── Collectibles
    └── Obstacles
```

### 4. Physics System
Current physics implementation:
- **Movement:** Velocity-based with directional input
- **Gravity:** Constant downward acceleration (-20 units/sec²)
- **Jump:** Instantaneous upward velocity impulse (15 units/sec)
- **Flight:** Toggleable mode with separate flight speed
- **Collision:** Basic ground plane collision (can be extended)

### 5. Rendering Pipeline
1. **Input** → InputManager captures joystick/keyboard
2. **Update** → Player.update() processes movement and applies physics
3. **Render** → Three.js renderer draws scene with camera
4. **Post-Process** → (Future: effects, bloom, etc.)

### 6. Mobile vs Desktop Differences
| Aspect | Desktop | Mobile |
|--------|---------|--------|
| Input | Keyboard + Mouse | Virtual Joysticks |
| Camera | Mouse look | Right joystick |
| Performance | Higher quality | Optimized for lower-end devices |
| Controls | WASD + Space | Tap & drag |

## Data Flow
```
User Input (Keyboard/Touch)
    ↓
InputManager
    ↓
Game.update() → Player.update()
    ↓
Apply Physics & Movement
    ↓
Update Camera Position
    ↓
Render Scene
```

## Future Expansion Points
1. **EntityManager** - For spawning and managing NPCs, collectibles, etc.
2. **CollisionManager** - Sophisticated collision detection and response
3. **AudioManager** - Background music, sound effects
4. **AnimationManager** - State machine for character animations
5. **ParticleSystem** - Visual effects system
6. **LevelManager** - Support for multiple levels/scenes

## Performance Considerations
- Shadow mapping is enabled for dynamic lighting detail
- Fog reduces far-clip performance impact
- Virtual joysticks use static positioning (no drift)
- Capacitor integration for native mobile performance optimizations
- Responsive canvas sizing on window resize

## Directory Structure
```
moremoreblossom/
├── src/
│   ├── Game.js
│   ├── Player.js
│   ├── InputManager.js
│   ├── main.js
│   └── style.css
├── docs/
│   ├── ARCHITECTURE.md (this file)
│   ├── FEATURES.md
│   └── CONTRIBUTING.md
├── index.html
├── package.json
└── vite.config.js
```
