# Development Setup & Quick Reference

## Quick Start

```bash
# Install dependencies
npm install

# Development server (hot reload, local testing)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

Visit `http://localhost:5173` to see the game.

**Need a different port?** See [LOCAL_SERVER.md](LOCAL_SERVER.md) for instructions on running the server on port 5174 or any other port.

---

## Project Structure

```
moremoreblossom/
├── src/
│   ├── Game.js              # Main game orchestrator
│   ├── Player.js            # Player character controller
│   ├── InputManager.js      # Input handling (joysticks, keyboard)
│   ├── main.js              # Entry point
│   └── style.css            # Global styles
├── docs/
│   ├── ARCHITECTURE.md      # System design & class structure
│   ├── FEATURES.md          # Current & planned features
│   ├── CONTRIBUTING.md      # Contribution guidelines
│   ├── LOCAL_SERVER.md      # Running server on custom port
│   └── INDEX.md             # This file
├── index.html               # HTML template
├── package.json             # Dependencies & scripts
├── vite.config.js           # Vite configuration
└── CODING_RULES.md          # Code standards & guidelines
```

---

## Key Concepts

### Game Loop
```
init() → animate() during each frame
  ├─ InputManager.update() → Read joysticks/keyboard
  ├─ Player.update(deltaTime) → Apply physics & movement
  └─ renderer.render(scene, camera) → Draw frame
```

### Data Flow
```
Input → InputManager → Player.update() → Render
```

### File Responsibilities
- **Game.js** - Scene setup, game loop, camera, lighting
- **Player.js** - Character mesh, movement, physics, camera offset
- **InputManager.js** - Joystick/keyboard input abstraction
- **main.js** - Bootstrap & initialization

---

## Common Development Tasks

### Adding a New Property to Player
```javascript
// In Player constructor
this.newProperty = initialValue;

// In Player.update()
// Use this.newProperty in your game logic
```

### Adding Input Handling
```javascript
// In InputManager.init()
// Attach event listeners for new input

// In Player.update()
// Read from this.inputManager.moveVector or similar
```

### Adding Lights/Objects to Scene
```javascript
// In Game.init()
const light = new THREE.PointLight(color, intensity);
light.position.set(x, y, z);
this.scene.add(light);
```

### Debugging Physics
```javascript
// Log position every frame
console.log('[Player] Position:', this.mesh.position);
console.log('[Player] Velocity:', this.velocity);
console.log('[InputManager] Move:', this.inputManager.moveVector);
```

---

## Physics Constants
Located in **Player.js** constructor:
- `speed` - Ground movement speed (10 units/sec)
- `flightSpeed` - Flight mode speed (20 units/sec)
- `turnSpeed` - Rotation speed (2 rad/sec)
- `gravity` - Downward acceleration (-20 units/sec²)
- `jumpForce` - Upward velocity on jump (15 units/sec)

Modify these for playtesting and balance.

---

## Testing Checklist

Before committing changes:
- [ ] `npm run build` completes without errors
- [ ] `npm run dev` starts without console errors
- [ ] Game renders correctly
- [ ] Input works (keyboard on desktop, joysticks on mobile)
- [ ] No performance degradation (60 FPS target)

---

## Debugging Tools

### Browser DevTools
```javascript
// Inspect Three.js objects
window.game.player.mesh  // Access player mesh
window.game.scene        // Access scene
window.game.inputManager // Access input state
```

### Visual Debugging
```javascript
// In Game.init(), add to scene for debugging:
const axes = new THREE.AxesHelper(5);
const grid = new THREE.GridHelper(50, 50);
this.scene.add(axes);
this.scene.add(grid);
```

---

## Performance Tips

1. **Monitor FPS** - Chrome DevTools → Performance tab
2. **Check Draw Calls** - Fewer is better (target < 100)
3. **Optimize Meshes** - Reduce vertex count where possible
4. **Use Object Pooling** - For frequently created entities
5. **Test on Mobile** - Use actual device, not just browser emulation

---

## Mobile Testing

### Local Network Testing
```bash
# Get your computer's IP (e.g., 192.168.x.x)
ifconfig  # macOS/Linux
ipconfig  # Windows

# Visit from mobile: http://192.168.x.x:5173
```

### Joystick Testing
- Left joystick: Movement
- Right joystick: Camera/Look
- Adjustable in InputManager.js

---

## Useful Resources

- **Three.js Docs:** https://threejs.org/docs/
- **Vite Guide:** https://vitejs.dev/guide/
- **Nipple.js:** https://yoannimoulin.github.io/nipplejs/
- **WebGL Debugging:** Chrome DevTools → "Rendering" tab
- **Game Dev Patterns:** https://gameprogrammingpatterns.com/

---

## Troubleshooting

### Black Screen?
- Check console for errors
- Verify container element `#game-container` exists in HTML
- Check camera position isn't inside mesh

### Joysticks Not Working?
- Verify HTML has `#joystick-left-zone` and `#joystick-right-zone`
- Check InputManager.init() is called
- Use browser console to inspect joystick state

### Performance Issues?
- Profile with Chrome DevTools
- Check polygon count (look for dense meshes)
- Reduce texture sizes
- Enable fog for far-distance culling

---

## Code Style

- **Variables:** camelCase (e.g., `playerMesh`, `moveVector`)
- **Classes:** PascalCase (e.g., `Game`, `Player`, `InputManager`)
- **Constants:** UPPER_SNAKE_CASE in dedicated section
- **Comments:** Use prefixes `[Class]` for clarity

---

## Next Steps

1. Read [ARCHITECTURE.md](docs/ARCHITECTURE.md) for deeper system understanding
2. Check [FEATURES.md](docs/FEATURES.md) for planned work
3. Review [CONTRIBUTING.md](docs/CONTRIBUTING.md) before making changes
4. Follow [CODING_RULES.md](../CODING_RULES.md) for code standards

**Happy coding! 🌸**
