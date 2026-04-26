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

    // AnimationMixer — used when the real GLB model is loaded
    this.mixer = null;
    this.action = null;
    this.shaderMaterials = [];

    // Root physics group — all movement/rotation applied here
    this.mesh = new THREE.Group();
    scene.add(this.mesh);

    if (gltf) {
      this._setupGLTFModel(gltf);
    } else {
      this._setupProceduralModel();
    }

    this.cameraOffset = new THREE.Vector3(CAMERA.OFFSET.x, CAMERA.OFFSET.y, CAMERA.OFFSET.z);
    this.cameraRig = new THREE.Object3D();
    this.mesh.add(this.cameraRig);
  }

  // ─── Model setup ─────────────────────────────────────────────────────────────

  _setupGLTFModel(gltf) {
    const model = gltf.scene;

    // Scale model to a consistent target height (~2.2 units)
    const box = new THREE.Box3().setFromObject(model);
    const modelHeight = box.max.y - box.min.y;
    const scale = 5.0 / modelHeight;
    model.scale.setScalar(scale);

    // Lift feet to y = 0 within the mesh group
    box.setFromObject(model);
    model.position.y = -box.min.y;

    // Shadows + fire-glow emissive on every mesh in the model
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        mat.emissive = new THREE.Color(0xFF3300);
        mat.emissiveIntensity = 0.35;
        mat.needsUpdate = true;
      }
    });

    this.mesh.add(model);

    // AnimationMixer — plays the baked 'Take 001' flight cycle
    this.mixer = new THREE.AnimationMixer(model);
    if (gltf.animations.length > 0) {
      this.action = this.mixer.clipAction(gltf.animations[0]);
      this.action.play();
      this.action.timeScale = 0; // start paused; unpaused on takeoff
    }

    // Bone references used by the camera and idle head-bob
    this.headChild  = model.getObjectByName('b_Head_06') ?? model;
    this.tailGroup  = null; // mixer drives all tail bones
    this.wingLeft   = null; // mixer drives all wing bones
    this.wingRight  = null;
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

    // Tick GLTF animation mixer
    if (this.mixer) this.mixer.update(dt);

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
