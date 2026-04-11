# Contributing to moremoreblossom

Thank you for your interest in contributing to the moremoreblossom game project! This document outlines the guidelines and processes for contributing.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Git
- Three.js familiarity (helpful but not required)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd moremoreblossom

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Development Workflow

### 1. Creating a Feature Branch
```bash
# Always create a new branch from master
git checkout master
git pull origin master
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features (e.g., `feature/player-animation`)
- `fix/` - Bug fixes (e.g., `fix/camera-jitter`)
- `docs/` - Documentation updates (e.g., `docs/architecture-update`)
- `refactor/` - Code refactoring (e.g., `refactor/input-manager`)

### 2. Making Changes
- Follow the [CODING_RULES.md](CODING_RULES.md) standards
- Reference [ARCHITECTURE.md](ARCHITECTURE.md) before architectural changes
- Make atomic, focused commits with clear messages
- Test frequently during development

### 3. Testing
Before submitting a pull request:
```bash
# Build the project
npm run build

# Check for console errors in dev server
npm run dev

# Test on mobile device (for input/performance)
# On desktop at http://localhost:5173
# On mobile at http://<your-ip>:5173
```

### 4. Creating a Pull Request
1. Push your branch to the remote repository
2. Create a pull request with a clear title and description
3. Link any related issues
4. Request review from team members
5. Address feedback and make requested changes

**Pull Request Template:**
```
## Description
Brief description of the changes made.

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Related Issues
Closes #(issue number)

## Testing
Describe how you tested the changes:
- [ ] Tested on desktop
- [ ] Tested on mobile
- [ ] No console errors
- [ ] Performance acceptable

## Checklist
- [ ] Code follows CODING_RULES.md
- [ ] FEATURES.md updated (if applicable)
- [ ] ARCHITECTURE.md updated (if applicable)
- [ ] Build passes (`npm run build`)
- [ ] No new warnings/errors
```

## Code Review Process

### What Reviewers Look For
1. **Adherence to Standards** - Does the code follow CODING_RULES.md?
2. **Architecture** - Does it respect the design patterns in ARCHITECTURE.md?
3. **Performance** - Any optimization concerns or potential bottlenecks?
4. **Mobile Compatibility** - Works on both desktop and mobile?
5. **Documentation** - Is the code clear and documented?

### Addressing Review Comments
- Respond to all comments (even if just agreeing)
- Make changes and commit them with descriptive messages
- Re-request review after making updates
- Feel free to discuss disagreements respectfully

## Common Tasks

### Adding a New Game System
1. Create a new file in `src/` (e.g., `src/CollisionManager.js`)
2. Follow the same class structure as existing managers
3. Update `Game.js` to integrate the new system
4. Add to `docs/FEATURES.md` under "Planned Features"
5. Document the new system in `docs/ARCHITECTURE.md`

### Adding a New Feature
1. Create a feature branch: `feature/feature-name`
2. Implement the feature following CODING_RULES.md
3. Test on desktop and mobile
4. Update `docs/FEATURES.md` - mark feature as ✅ Implemented
5. Create a pull request with clear description
6. Request review

### Fixing a Bug
1. Create a bug fix branch: `fix/bug-description`
2. Reproduce the bug locally
3. Fix the issue with minimal changes
4. Test thoroughly
5. Create a pull request referencing the issue
6. Request review

### Updating Documentation
1. Create a docs branch: `docs/topic-update`
2. Update relevant markdown files
3. Ensure consistency across docs
4. Create a pull request
5. Minimal review needed for docs-only changes

## Performance Guidelines

When implementing features:
- **Avoid creating objects in the game loop** - Pre-allocate and reuse
- **Minimize draw calls** - Batch geometries when possible
- **Profile your changes** - Use browser DevTools
- **Test on mobile** - Ensure 30+ FPS on target devices
- **Optimize textures** - Use reasonable resolutions (512x512 or smaller)

## Debugging Tips

### Console Logging
```javascript
// Prefix logs for easy filtering
console.log('[Game]', 'Scene initialized');
console.log('[Player]', 'Jump triggered');
console.log('[InputManager]', 'Joystick moved', moveVector);
```

### Three.js Debugging
```javascript
// Add wireframe mode
renderer.wireframe = false; // Set to true for debugging

// Visualize axes/grid
import { AxesHelper, GridHelper } from 'three';
scene.add(new AxesHelper(5));
scene.add(new GridHelper(20, 20));
```

### Performance Monitoring
- Use Chrome DevTools Performance tab
- Monitor frame time and GPU utilization
- Check for long JavaScript frames

## Reporting Issues

If you find a bug or have a feature request:
1. Check existing issues to avoid duplicates
2. Provide clear steps to reproduce
3. Include platform (desktop/mobile) and browser info
4. Attach screenshots or videos if helpful
5. Create an issue on GitHub

## Communication

- **Questions?** Open a discussion or ask in the project chat
- **Ideas?** Create an issue to discuss before implementing
- **Found a security issue?** Please report privately, don't create a public issue

## Code of Conduct

- Be respectful to all contributors
- Provide constructive feedback
- Accept feedback gracefully
- Help other contributors succeed
- Report inappropriate behavior

## Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [WebGL Best Practices](https://www.khronos.org/webgl/wiki/Best_Practices)
- [Game Programming Patterns](https://gameprogrammingpatterns.com/)

---

**Thank you for contributing to moremoreblossom! 🌸**
