import * as THREE from 'three';
import { PHYSICS, MOVEMENT, BOUNDS, CAMERA, ANIMATION, CONSTRAINTS, MESH } from './constants.js';
import { createPhoenixTextures } from './PhoenixTextures.js';
import { createPhoenixMesh } from './PhoenixMesh.js';

export class Player {
  constructor(scene, camera, inputManager) {
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

    // Wing animation
    this.wingFlapPhase = 0;

    // Head snap (idle)
    this.headSnapTargetY = 0;
    this.headSnapTargetX = 0;
    this.headSnapHoldRemaining = 0;

    const textures = createPhoenixTextures();
    const built = createPhoenixMesh(scene, textures);
    this.mesh = built.mesh;
    this.wingLeft = built.wingLeft;
    this.wingRight = built.wingRight;
    this.tailGroup = built.tailGroup;
    this.headChild = built.headChild;
    this.leftPrimaryFeathers = built.leftPrimaryFeathers;
    this.rightPrimaryFeathers = built.rightPrimaryFeathers;
    this.shaderMaterials = built.shaderMaterials;

    this.cameraOffset = new THREE.Vector3(CAMERA.OFFSET.x, CAMERA.OFFSET.y, CAMERA.OFFSET.z);
    this.cameraRig = new THREE.Object3D();
    this.mesh.add(this.cameraRig);
  }

  // ─── Public ──────────────────────────────────────────────────────────────────

  update(dt) {
    const input = this.inputManager;
    const moveZ = input.moveVector.y;
    const moveX = input.moveVector.x;
    const time = performance.now() * 0.001;

    for (const mat of this.shaderMaterials) mat.uniforms.uTime.value = time;

    if (input.isJumping) {
      if (!this.isFlying) this._startTakeoff();
      else this.yVelocity += PHYSICS.FLAP_THRUST * dt;
    }

    if (this.isFlying) this._updateFlight(dt, moveX, moveZ, time);
    else this._updateGround(dt, moveX, moveZ, time, input);

    this._updateTakeoffAnim(dt);

    this.mesh.position.x = Math.max(-BOUNDS.ARENA_BORDER, Math.min(BOUNDS.ARENA_BORDER, this.mesh.position.x));
    this.mesh.position.z = Math.max(-BOUNDS.ARENA_BORDER, Math.min(BOUNDS.ARENA_BORDER, this.mesh.position.z));

    this._updateCamera(dt, input);
  }

  // ─── Flight ───────────────────────────────────────────────────────────────────

  _startTakeoff() {
    this.isFlying = true;
    this.isLanding = false;
    this.yVelocity = PHYSICS.JUMP_FORCE;
    this.currentFlightSpeed = 5;
    this.mesh.position.y += 0.1;
    this.takeoffAnimTime = 0;
  }

  _updateFlight(dt, moveX, moveZ, time) {
    // Speed
    const targetSpeed = this.maxFlightSpeed * (0.3 + Math.max(0, moveZ));
    const diff = targetSpeed - this.currentFlightSpeed;
    this.currentFlightSpeed += Math.sign(diff) * Math.min(Math.abs(diff), this.flightAcceleration * dt);
    this.currentFlightSpeed *= this.airResistance;

    // Gravity (halved during glide)
    this.isGliding = !this.inputManager.isJumping && this.currentFlightSpeed > this.maxFlightSpeed * 0.35;
    const gravFactor = this.isGliding ? PHYSICS.FLIGHT_GRAVITY_FACTOR * 0.5 : PHYSICS.FLIGHT_GRAVITY_FACTOR;
    this.yVelocity += PHYSICS.GRAVITY * gravFactor * dt;

    // Rotation
    this.mesh.rotation.y -= moveX * this.turnSpeed * dt;
    const targetPitch = moveZ > 0.2 ? 0.3 : -0.1;
    this.mesh.rotation.x += (targetPitch - this.mesh.rotation.x) * 0.15;
    this.mesh.rotation.x = Math.max(CONSTRAINTS.PITCH_MIN, Math.min(CONSTRAINTS.PITCH_MAX, this.mesh.rotation.x));
    const targetRoll = -moveX * 0.15;
    this.mesh.rotation.z += (targetRoll - this.mesh.rotation.z) * 0.1;

    // Position
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

    if (this.isGliding) {
      const rock = Math.sin(time * 0.7) * 0.03;
      const dihedral = 0.22;
      this.wingLeft.rotation.z += (dihedral + rock - this.wingLeft.rotation.z) * Math.min(1, 6 * dt);
      this.wingRight.rotation.z += (-(dihedral + rock) - this.wingRight.rotation.z) * Math.min(1, 6 * dt);
      this.wingLeft.rotation.x = Math.sin(time * 0.4) * 0.02;
      this.wingRight.rotation.x = Math.sin(time * 0.4) * 0.02;
      for (let i = 0; i < this.leftPrimaryFeathers.length; i++) {
        this.leftPrimaryFeathers[i].rotation.y = -0.08;
        this.rightPrimaryFeathers[i].rotation.y = 0.08;
        this.leftPrimaryFeathers[i].rotation.x += (-0.1 - this.leftPrimaryFeathers[i].rotation.x) * Math.min(1, 4 * dt);
        this.rightPrimaryFeathers[i].rotation.x += (-0.1 - this.rightPrimaryFeathers[i].rotation.x) * Math.min(1, 4 * dt);
      }
    } else {
      const freq = 3 + speedRatio * 5;
      this.wingFlapPhase += dt * freq * Math.PI * 2;
      const flap = Math.sin(this.wingFlapPhase);
      const amt = 0.6 + speedRatio * 0.4;

      this.wingLeft.rotation.z = flap * amt;
      this.wingRight.rotation.z = -flap * amt;
      this.wingLeft.rotation.x = Math.sin(this.wingFlapPhase * 0.5) * 0.05;
      this.wingRight.rotation.x = Math.sin(this.wingFlapPhase * 0.5) * 0.05;

      const downstroke = Math.max(0, flap);
      for (let i = 0; i < this.leftPrimaryFeathers.length; i++) {
        const spread = i * 0.025 * downstroke;
        this.leftPrimaryFeathers[i].rotation.y = -0.08 - spread;
        this.rightPrimaryFeathers[i].rotation.y = 0.08 + spread;
        const featherFlap = Math.sin(this.wingFlapPhase - i * ANIMATION.FEATHER_WAVE_PHASE_LAG);
        const bend = featherFlap * ANIMATION.FEATHER_WAVE_BEND_AMOUNT;
        this.leftPrimaryFeathers[i].rotation.x = -0.1 + bend;
        this.rightPrimaryFeathers[i].rotation.x = -0.1 + bend;
      }
    }
  }

  _animateTailFlight(moveZ, moveX) {
    if (!this.tailGroup) return;
    // Animate around the anatomical base tilt (not from zero) so the fan stays correctly angled.
    this.tailGroup.rotation.x = MESH.TAIL_BASE_TILT + (moveZ > 0.2 ? 0.08 : -0.04);
    this.tailGroup.rotation.z = Math.sin(this.wingFlapPhase * 0.3) * 0.12;
    this.tailGroup.rotation.y = moveX * 0.1;
  }

  _trackHeadFlight(flyDir) {
    if (!this.headChild) return;
    const yaw = Math.atan2(flyDir.x, flyDir.z);
    const pitch = Math.atan2(flyDir.y, Math.sqrt(flyDir.x ** 2 + flyDir.z ** 2));
    this.headChild.rotation.y += (yaw * 0.3 - this.headChild.rotation.y) * 0.1;
    this.headChild.rotation.x += (pitch * 0.2 - this.headChild.rotation.x) * 0.1;
  }

  _checkLanding() {
    if (this.mesh.position.y <= BOUNDS.GROUND_LEVEL && this.yVelocity < 0) {
      this.mesh.position.y = BOUNDS.GROUND_LEVEL;
      this.isFlying = false;
      this.isLanding = true;
      this.yVelocity = 0;
      this.currentFlightSpeed *= 0.5;
      this.mesh.rotation.x = 0;
      this.mesh.rotation.z = 0;
      this.wingLeft.rotation.set(0, 0, 0);
      this.wingRight.rotation.set(0, 0, 0);
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
    else this._animateWalk(time);
  }

  _animateIdle(dt, time) {
    this.mesh.position.y += Math.sin(time * ANIMATION.IDLE_BOB_FREQUENCY) * ANIMATION.IDLE_BOB_AMOUNT;

    if (this.tailGroup) {
      this.tailGroup.rotation.z = Math.sin(time * ANIMATION.IDLE_TAIL_FREQUENCY) * ANIMATION.IDLE_TAIL_AMOUNT;
      this.tailGroup.rotation.x = MESH.TAIL_BASE_TILT + Math.sin(time * 0.8) * ANIMATION.IDLE_TAIL_AMOUNT * 0.6;
    }

    if (this.headChild) {
      this.headSnapHoldRemaining -= dt;
      if (this.headSnapHoldRemaining <= 0) {
        this.headSnapTargetY = (Math.random() - 0.5) * 0.5;
        this.headSnapTargetX = (Math.random() - 0.5) * 0.2;
        this.headSnapHoldRemaining = 0.6 + Math.random() * 1.4;
      }
      this.headChild.rotation.y += (this.headSnapTargetY - this.headChild.rotation.y) * Math.min(1, 12 * dt);
      this.headChild.rotation.x += (this.headSnapTargetX - this.headChild.rotation.x) * Math.min(1, 12 * dt);
    }

    const t = time * 1.5;
    this.wingLeft.rotation.z = Math.sin(t) * 0.05;
    this.wingRight.rotation.z = -Math.sin(t) * 0.05;
  }

  _animateWalk(time) {
    const t = time * ANIMATION.WALK_WING_FREQUENCY;
    const motion = Math.sin(t);
    this.wingLeft.rotation.z = motion * ANIMATION.WALK_WING_AMOUNT;
    this.wingRight.rotation.z = -motion * ANIMATION.WALK_WING_AMOUNT;
    if (this.headChild) {
      this.headChild.position.y = MESH.HEAD_OFFSET.y + Math.sin(t * 0.5) * 0.03;
    }
    this.mesh.rotation.z = Math.sin(t * 0.5) * 0.05;
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
