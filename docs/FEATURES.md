# Features - moremoreblossom

## Current Features ✅

### Core Game Mechanics
- **3D Environment Rendering** - Three.js scene with sky, terrain, and lighting
- **Phoenix Character** - Playable bird character with procedurally generated textures
  - Fire texture for feathers
  - Glow effect overlay
  - Ember particle effects
- **Third-Person Camera** - Smooth camera tracking following the player from behind
- **Movement System** - Directional movement with velocity-based physics
  - Ground movement (speed: 10 units/sec)
  - Jump mechanics with gravity simulation
  - Flight mode with increased speed (20 units/sec)
  - Smooth acceleration and deceleration

### Input Systems
- **Virtual Joysticks (Mobile)** - Nipple.js integration
  - Left joystick: Movement (up/down/left/right)
  - Right joystick: Camera rotation / looking
- **Keyboard Support (Desktop)** - Fallback input method
- **Touch-Friendly UI** - Joystick zones in dedicated screen areas

### Graphics & Rendering
- **Dynamic Lighting** - Ambient and directional lights with shadow mapping
- **Procedural Textures** - Dynamic generation of:
  - Fire texture (animated orange/red gradients)
  - Glow texture (bright overlay effect)
  - Ember texture (particle-like effects)
- **Fog System** - Distance-based fog for atmosphere and performance
- **Anti-aliasing** - WebGL anti-aliasing enabled
- **Responsive Canvas** - Auto-resizes to window dimensions

### Platform Support
- **Desktop Browsers** - Chrome, Firefox, Safari (keyboard input)
- **Mobile Browsers** - iOS Safari, Chrome Mobile (virtual joysticks)
- **Native Apps** - Capacitor integration for iOS/Android

---

## Planned Features 🔮

### Gameplay Expansion
- [ ] **Collectibles System** - Items to gather and points to score
- [ ] **Obstacles & Hazards** - Environmental challenges to navigate
- [ ] **Enemy NPCs** - Interactive characters with AI behavior
- [ ] **Level System** - Multiple levels/areas with progressive difficulty
- [ ] **Power-ups** - Temporary ability enhancements (speed boost, shield, etc.)
- [ ] **Boss Encounters** - Challenging combat scenarios

### Animation & Visuals
- [ ] **Character Animation States** - Idle, walking, running, flying, landing animations
- [ ] **Skeletal Animation** - Bone-based character rigging for smooth movement
- [ ] **Particle Effects** - Enhanced fire/ember particle system
- [ ] **Environmental Effects** - Dynamic weather, rain, snow, wind
- [ ] **Post-Processing** - Bloom, color grading, motion blur
- [ ] **Model Loading** - Support for external 3D models (.glTF, .FBX)

### Audio System
- [ ] **Background Music** - Dynamic music system
- [ ] **Sound Effects** - Jump, landing, flying, collision sounds
- [ ] **Audio Feedback** - UI interaction sounds
- [ ] **Spatial Audio** - 3D positional sound effects

### UI & HUD
- [ ] **Health/Status Bar** - Display character status
- [ ] **Score Display** - Real-time scoring system
- [ ] **Mini-map** - Top-down level overview
- [ ] **Pause Menu** - Pause/resume functionality
- [ ] **Settings Panel** - Audio, graphics quality, controls customization
- [ ] **Tutorial System** - On-screen hints for new players

### Physics & Collision
- [ ] **Advanced Collision Detection** - AABB, sphere, mesh collision
- [ ] **Rigid Body Physics** - Realistic object physics and interactions
- [ ] **Terrain Collision** - Walking on terrain with proper surface detection
- [ ] **Ragdoll Physics** - Character ragdoll on death (optional)

### Mobile Optimization
- [ ] **Joystick Sensitivity Settings** - Customizable input sensitivity
- [ ] **Haptic Feedback** - Vibration on events (jump, collision, pickup)
- [ ] **Performance Profiles** - Low/Medium/High quality settings
- [ ] **Battery Optimization** - Adaptive frame rate limiting

### Network & Persistence
- [ ] **Save System** - Player progress and scores
- [ ] **Local Storage** - Persisting settings and preferences
- [ ] **Leaderboard** - Top scores tracking (local or online)
- [ ] **Multiplayer** (Future) - Cooperative or competitive gameplay

### Developer Tools
- [ ] **Debug Mode** - Visualization of collision boxes, physics, etc.
- [ ] **Performance Monitor** - FPS counter, draw call stats
- [ ] **Level Editor** - In-game or web-based level design tool
- [ ] **Replay System** - Record and replay gameplay

---

## Feature Status Legend
- ✅ Implemented and tested
- 🔄 In development
- 🔮 Planned for future release
- ❌ Deprioritized or removed

---

## Last Updated
- **Date:** April 2026
- **Version:** 0.0.0
- **Status:** Early Development

## Notes for Contributors
When adding new features:
1. Update this document with the feature status
2. Add feature-specific details to relevant sections in `docs/ARCHITECTURE.md`
3. Test on both desktop and mobile platforms
4. Document any new dependencies added to `package.json`
5. Update `CODING_RULES.md` if new standards are needed
