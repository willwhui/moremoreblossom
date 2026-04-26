import * as THREE from 'three';
import { PHYSICS, MOVEMENT, BOUNDS, CAMERA, ANIMATION, CONSTRAINTS, MESH } from './constants.js';
import { createPhoenixTextures } from './PhoenixTextures.js';
import { createPhoenixMesh } from './PhoenixMesh.js';

export class Player {
  constructor(scene, camera, inputManager, gltf = null) {
    this.scene = scene;
    this.camera = camera;
    this.inputManager = inputManager;

    // Physics
    this.speed = MOVEMENT.WALK_SPEED;
    this.turnSpeed = MOVEMENT.TURN_SPEED;
    this.maxFlightSpeed = MOVEMENT.FLIGHT_SPEED;
    this.currentFlightSpeed = 0;
    this.flightAcceleration = 8;
    this.yVelocity = 0;
    this.airResistance = 0.95;

    // States
    this.isFlying = false;
    this.isLanding = false;
    this.isGliding = false;
    this.takeoffAnimTime = -1;

    this.wingFlapPhase = 0;

    // Head snap (idle)
    this.headSnapTargetY = 0;
    this.headSnapTargetX = 0;
    this.headSnapHoldRemaining = 0;

    // AnimationMixer / active references — always point to whichever bird is showing
    this.mixer = null;
    this.action = null;
    this.shaderMaterials = [];

    // All loaded bird variants
    this.birds = [];
    this.activeBirdIdx = 0;

    // Root physics group — all movement/rotation applied here
    this.mesh = new THREE.Group();
    scene.add(this.mesh);

    if (Array.isArray(gltf) && gltf.length) {
      this._setupGLTFModels(gltf);
    } else if (gltf) {
      this._setupGLTFModels([gltf]);
    } else {
      this._setupProceduralModel();
    }

    this.cameraOffset = new THREE.Vector3(CAMERA.OFFSET.x, CAMERA.OFFSET.y, CAMERA.OFFSET.z);
    this.cameraRig = new THREE.Object3D();
    this.mesh.add(this.cameraRig);
  }

  // ─── Model setup ─────────────────────────────────────────────────────────────

  // Visual config per bird slot — distinct colour identities for same geometry
  static BIRD_CONFIGS = [
    { name: '🔥 Fire Phoenix',   emissive: 0xFF3300, intensity: 0.40,
      attribution: { label: '"Phoenix bird" by Dream Dixie Works', href: 'https://skfb.ly/pDxVB' } },
    { name: '✨ Golden Phoenix',  emissive: 0xFFAA00, intensity: 0.55,
      attribution: { label: '"phoenix bird" by NORBERTO-3D',       href: 'https://skfb.ly/6vLBp' } },
  ];

  _setupGLTFModels(gltfs) {
    gltfs.forEach((gltf, i) => {
      const cfg   = Player.BIRD_CONFIGS[i] ?? Player.BIRD_CONFIGS[0];
      const model = gltf.scene;

      // The GLB's long axis is +X (head at +X, tail at −X) but the player moves
      // along +Z.  A −90° Y rotation maps the model's +X forward onto +Z so that
      // rotations applied to the physics group produce the correct sweep direction.
      const pivot = new THREE.Group();
      pivot.rotation.y = -Math.PI / 2;
      pivot.add(model);

      // Scale to a consistent target height — compute box AFTER the pivot rotation
      pivot.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(pivot);
      pivot.scale.setScalar(5.0 / (box.max.y - box.min.y));

      // Lift feet to y = 0 in the physics group
      pivot.updateMatrixWorld(true);
      box.setFromObject(pivot);
      pivot.position.y = -box.min.y;

      // Shadows + per-variant emissive glow
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow    = true;
        child.receiveShadow = true;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          mat.emissive          = new THREE.Color(cfg.emissive);
          mat.emissiveIntensity = cfg.intensity;
          mat.needsUpdate       = true;
        }
      });

      pivot.visible = i === 0;
      this.mesh.add(pivot);

      // AnimationMixer targets the inner model (owns the skeleton)
      const mixer  = new THREE.AnimationMixer(model);
      let   action = null;
      if (gltf.animations.length > 0) {
        action = mixer.clipAction(gltf.animations[0]);
        action.play();
        action.timeScale = 0;
      }

      this.birds.push({ pivot, model, mixer, action, cfg });
    });

    this._activateBird(0);
    this.tailGroup  = null;
    this.wingLeft   = null;
    this.wingRight  = null;
  }

  // Point all active references at the chosen bird index and update the HUD
  _activateBird(idx) {
    this.activeBirdIdx = idx;
    const bird = this.birds[idx];
    this.mixer     = bird.mixer;
    this.action    = bird.action;
    this.headChild = bird.model.getObjectByName('b_Head_06') ?? bird.model;
    this._updateBirdHUD(bird.cfg);
  }

  _updateBirdHUD(cfg) {
    const nameEl = document.getElementById('bird-name');
    if (nameEl) nameEl.textContent = cfg.name;

    const attrEl = document.getElementById('attribution-text');
    if (attrEl) {
      attrEl.innerHTML =
        `<a href="${cfg.attribution.href}" target="_blank" rel="noopener">${cfg.attribution.label}</a>` +
        ` &mdash; <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>`;
    }
  }

  _switchBird() {
    if (this.birds.length < 2) return;

    const prevTimeScale = this.action?.timeScale ?? 0;

    this.birds[this.activeBirdIdx].pivot.visible = false;

    const nextIdx = (this.activeBirdIdx + 1) % this.birds.length;
    this.birds[nextIdx].pivot.visible = true;
    this._activateBird(nextIdx);

    if (this.action) this.action.timeScale = prevTimeScale;
  }

  _setupProceduralModel() {
    const textures = createPhoenixTextures();
    const built = createPhoenixMesh(this.scene, textures);
    // createPhoenixMesh adds the group to the scene already; swap it into this.mesh
    this.scene.remove(built.mesh);
    this.mesh.add(built.mesh);

    this.wingLeft   = built.wingLeft;
    this.wingRight  = built.wingRight;
    this.tailGroup  = built.tailGroup;
    this.headChild  = built.headChild;
    this.shaderMaterials = built.shaderMaterials;
  }

  // ─── Public ──────────────────────────────────────────────────────────────────

  update(dt) {
    const input = this.inputManager;
    const moveZ = input.moveVector.y;
    const moveX = input.moveVector.x;
    const time  = performance.now() * 0.001;

    // Tick procedural fire shaders
    for (const mat of this.shaderMaterials) mat.uniforms.uTime.value = time;

    // Tick all bird mixers (keeps inactive birds in correct pose for instant switching)
    for (const bird of this.birds) bird.mixer.update(dt);

    // Handle bird-switch input (one-shot flag consumed here)
    if (input.switchBirdPressed) {
      input.switchBirdPressed = false;
      this._switchBird();
    }

    if (input.isJumping) {
      if (!this.isFlying) this._startTakeoff();
      else this.yVelocity += PHYSICS.FLAP_THRUST * dt;
    }

    if (this.isFlying) this._updateFlight(dt, moveX, moveZ, time);
    else               this._updateGround(dt, moveX, moveZ, time, input);

    this._updateTakeoffAnim(dt);

    this.mesh.position.x = Math.max(-BOUNDS.ARENA_BORDER, Math.min(BOUNDS.ARENA_BORDER, this.mesh.position.x));
    this.mesh.position.z = Math.max(-BOUNDS.ARENA_BORDER, Math.min(BOUNDS.ARENA_BORDER, this.mesh.position.z));

    this._updateCamera(dt);
  }

  // ─── Flight ───────────────────────────────────────────────────────────────────

  _startTakeoff() {
    this.isFlying = true;
    this.isLanding = false;
    this.yVelocity = PHYSICS.JUMP_FORCE;
    this.currentFlightSpeed = 5;
    this.mesh.position.y += 0.1;
    this.takeoffAnimTime = 0;
    // Unpause baked animation
    if (this.action) this.action.timeScale = 1.0;
  }

  _updateFlight(dt, moveX, moveZ, time) {
    const targetSpeed = this.maxFlightSpeed * (0.3 + Math.max(0, moveZ));
    const diff = targetSpeed - this.currentFlightSpeed;
    this.currentFlightSpeed += Math.sign(diff) * Math.min(Math.abs(diff), this.flightAcceleration * dt);
    this.currentFlightSpeed *= this.airResistance;

    this.isGliding = !this.inputManager.isJumping && this.currentFlightSpeed > this.maxFlightSpeed * 0.35;
    const gravFactor = this.isGliding ? PHYSICS.FLIGHT_GRAVITY_FACTOR * 0.5 : PHYSICS.FLIGHT_GRAVITY_FACTOR;
    this.yVelocity += PHYSICS.GRAVITY * gravFactor * dt;

    this.mesh.rotation.y -= moveX * this.turnSpeed * dt;
    const targetPitch = moveZ > 0.2 ? 0.3 : -0.1;
    this.mesh.rotation.x += (targetPitch - this.mesh.rotation.x) * 0.15;
    this.mesh.rotation.x = Math.max(CONSTRAINTS.PITCH_MIN, Math.min(CONSTRAINTS.PITCH_MAX, this.mesh.rotation.x));
    const targetRoll = -moveX * 0.15;
    this.mesh.rotation.z += (targetRoll - this.mesh.rotation.z) * 0.1;

    const flyDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    this.mesh.position.add(flyDir.clone().multiplyScalar(this.currentFlightSpeed * dt));
    this.mesh.position.y += this.yVelocity * dt;

    this._animateWings(dt, time);
    this._animateTailFlight(moveZ, moveX);
    this._trackHeadFlight(flyDir);
    this._checkLanding();
  }

  _animateWings(dt, time) {
    const speedRatio = this.currentFlightSpeed / this.maxFlightSpeed;

    // GLTF mode: drive the baked animation clip speed only
    if (this.mixer) {
      if (this.action) {
        this.action.timeScale = this.isGliding
          ? 0.3
          : 1.0 + speedRatio * 1.5; // faster flap at speed
      }
      return;
    }

    // Procedural mode
    if (this.isGliding) {
      const rock     = Math.sin(time * 0.7) * 0.03;
      const dihedral = 0.22;
      this.wingLeft.rotation.z  += (dihedral  + rock  - this.wingLeft.rotation.z)  * Math.min(1, 6 * dt);
      this.wingRight.rotation.z += (-dihedral - rock  - this.wingRight.rotation.z) * Math.min(1, 6 * dt);
      this.wingLeft.rotation.x   = Math.sin(time * 0.4) * 0.02;
      this.wingRight.rotation.x  = Math.sin(time * 0.4) * 0.02;
    } else {
      const freq = 3 + speedRatio * 5;
      this.wingFlapPhase += dt * freq * Math.PI * 2;
      const flap = Math.sin(this.wingFlapPhase);
      const amt  = ANIMATION.FLIGHT_WING_BASE_AMOUNT + speedRatio * (ANIMATION.FLIGHT_WING_MAX_AMOUNT - ANIMATION.FLIGHT_WING_BASE_AMOUNT);
      this.wingLeft.rotation.z  =  flap * amt;
      this.wingRight.rotation.z = -flap * amt;
      this.wingLeft.rotation.x  = Math.sin(this.wingFlapPhase * 0.5) * 0.05;
      this.wingRight.rotation.x = Math.sin(this.wingFlapPhase * 0.5) * 0.05;
    }
  }

  _animateTailFlight(moveZ, moveX) {
    // Procedural mode only — in GLTF mode the mixer drives all tail bones
    if (!this.tailGroup) return;
    this.tailGroup.rotation.x = MESH.TAIL_BASE_TILT + (moveZ > 0.2 ? 0.08 : -0.04);
    this.tailGroup.rotation.z = Math.sin(this.wingFlapPhase * 0.3) * 0.12;
    this.tailGroup.rotation.y = moveX * 0.1;
  }

  _trackHeadFlight(flyDir) {
    // Procedural mode only — in GLTF mode the mixer owns all bone rotations
    if (!this.headChild || this.mixer) return;
    const yaw   = Math.atan2(flyDir.x, flyDir.z);
    const pitch = Math.atan2(flyDir.y, Math.sqrt(flyDir.x ** 2 + flyDir.z ** 2));
    this.headChild.rotation.y += (yaw   * 0.3 - this.headChild.rotation.y) * 0.1;
    this.headChild.rotation.x += (pitch * 0.2 - this.headChild.rotation.x) * 0.1;
  }

  _checkLanding() {
    if (this.mesh.position.y <= BOUNDS.GROUND_LEVEL && this.yVelocity < 0) {
      this.mesh.position.y = BOUNDS.GROUND_LEVEL;
      this.isFlying  = false;
      this.isLanding = true;
      this.yVelocity = 0;
      this.currentFlightSpeed *= 0.5;
      this.mesh.rotation.x = 0;
      this.mesh.rotation.z = 0;
      // Pause baked animation on landing
      if (this.action) this.action.timeScale = 0;
      if (this.wingLeft)  this.wingLeft.rotation.set(0, 0, 0);
      if (this.wingRight) this.wingRight.rotation.set(0, 0, 0);
    }
  }

  // ─── Ground ───────────────────────────────────────────────────────────────────

  _updateGround(dt, moveX, moveZ, time, input) {
    this.yVelocity += PHYSICS.GRAVITY * dt;
    this.mesh.position.y += this.yVelocity * dt;
    if (this.mesh.position.y <= BOUNDS.GROUND_LEVEL) {
      this.mesh.position.y = BOUNDS.GROUND_LEVEL;
      this.yVelocity = 0;
    }

    this.mesh.rotation.y -= moveX * this.turnSpeed * dt;
    this.mesh.rotation.z += (0 - this.mesh.rotation.z) * 0.15;

    const walkDir = new THREE.Vector3(0, 0, moveZ).applyQuaternion(this.mesh.quaternion);
    this.mesh.position.add(walkDir.multiplyScalar(MOVEMENT.WALK_SPEED * dt));

    this.cameraRig.rotation.y -= input.lookVector.x * this.turnSpeed * dt;

    const isIdle = Math.abs(moveZ) < MOVEMENT.IDLE_THRESHOLD && Math.abs(moveX) < MOVEMENT.IDLE_THRESHOLD;
    if (isIdle) this._animateIdle(dt, time);
    else        this._animateWalk(time);
  }

  _animateIdle(dt, time) {
    this.mesh.position.y += Math.sin(time * ANIMATION.IDLE_BOB_FREQUENCY) * ANIMATION.IDLE_BOB_AMOUNT;

    if (this.tailGroup) {
      this.tailGroup.rotation.z = Math.sin(time * ANIMATION.IDLE_TAIL_FREQUENCY) * ANIMATION.IDLE_TAIL_AMOUNT;
      this.tailGroup.rotation.x = MESH.TAIL_BASE_TILT + Math.sin(time * 0.8) * ANIMATION.IDLE_TAIL_AMOUNT * 0.6;
    }

    // Procedural head snap
    if (this.headChild && !this.mixer) {
      this.headSnapHoldRemaining -= dt;
      if (this.headSnapHoldRemaining <= 0) {
        this.headSnapTargetY         = (Math.random() - 0.5) * 0.5;
        this.headSnapTargetX         = (Math.random() - 0.5) * 0.2;
        this.headSnapHoldRemaining   = 0.6 + Math.random() * 1.4;
      }
      this.headChild.rotation.y += (this.headSnapTargetY - this.headChild.rotation.y) * Math.min(1, 12 * dt);
      this.headChild.rotation.x += (this.headSnapTargetX - this.headChild.rotation.x) * Math.min(1, 12 * dt);
    }

    if (this.wingLeft && this.wingRight) {
      const t = time * 1.5;
      this.wingLeft.rotation.z  =  Math.sin(t) * 0.05;
      this.wingRight.rotation.z = -Math.sin(t) * 0.05;
    }
  }

  _animateWalk(time) {
    if (this.wingLeft && this.wingRight) {
      const t      = time * ANIMATION.WALK_WING_FREQUENCY;
      const motion = Math.sin(t);
      this.wingLeft.rotation.z  =  motion * ANIMATION.WALK_WING_AMOUNT;
      this.wingRight.rotation.z = -motion * ANIMATION.WALK_WING_AMOUNT;
    }
    if (this.headChild && !this.mixer) {
      const t = time * ANIMATION.WALK_WING_FREQUENCY;
      this.headChild.position.y = MESH.HEAD_OFFSET.y + Math.sin(t * 0.5) * 0.03;
    }
    this.mesh.rotation.z = Math.sin(time * ANIMATION.WALK_WING_FREQUENCY * 0.5) * 0.05;
  }

  // ─── Takeoff squash-stretch ───────────────────────────────────────────────────

  _updateTakeoffAnim(dt) {
    if (this.takeoffAnimTime < 0) return;
    this.takeoffAnimTime += dt;
    if (this.takeoffAnimTime < 0.1) {
      this.mesh.scale.y = 1 - 0.15 * (this.takeoffAnimTime / 0.1);
    } else if (this.takeoffAnimTime < 0.25) {
      this.mesh.scale.y = 0.85 + 0.3 * ((this.takeoffAnimTime - 0.1) / 0.15);
    } else if (this.takeoffAnimTime < 0.5) {
      this.mesh.scale.y = 1.15 - 0.15 * ((this.takeoffAnimTime - 0.25) / 0.25);
    } else {
      this.mesh.scale.y = 1.0;
      this.takeoffAnimTime = -1;
    }
  }

  // ─── Camera ───────────────────────────────────────────────────────────────────

  _updateCamera(dt) {
    const offset = this.cameraOffset.clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRig.rotation.y)
      .applyQuaternion(this.mesh.quaternion)
      .add(this.mesh.position);

    this.camera.position.lerp(offset, CAMERA.LERP_SPEED * dt);

    const lookAt = this.mesh.position.clone();
    lookAt.y += CAMERA.LOOK_TARGET_OFFSET_Y;
    this.camera.lookAt(lookAt);
  }
}
