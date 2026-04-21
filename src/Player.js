import * as THREE from 'three';
import {
  PHYSICS, MOVEMENT, BOUNDS, CAMERA, ANIMATION, CONSTRAINTS, MESH,
  COLORS, MATERIAL_PROPERTIES, TEXTURE
} from './constants.js';

export class Player {
  constructor(scene, camera, inputManager) {
    this.scene = scene;
    this.camera = camera;
    this.inputManager = inputManager;

    // Physics - Enhanced for realism
    this.velocity = new THREE.Vector3();
    this.speed = MOVEMENT.WALK_SPEED;
    this.flightSpeed = MOVEMENT.FLIGHT_SPEED;
    this.turnSpeed = MOVEMENT.TURN_SPEED;
    this.currentFlightSpeed = 0; // Current flight speed for smooth acceleration
    this.maxFlightSpeed = MOVEMENT.FLIGHT_SPEED;
    this.flightAcceleration = 8; // Units per second squared
    
    this.isFlying = false;
    this.isLanding = false; // Landing state for smooth transitions
    this.yVelocity = 0;
    this.gravity = PHYSICS.GRAVITY;
    this.jumpForce = PHYSICS.JUMP_FORCE;
    this.airResistance = 0.95; // Damping factor for flight

    // Wing mechanics
    this.wingFlapPhase = 0;
    this.leftPrimaryFeathers = [];
    this.rightPrimaryFeathers = [];
    this.isGliding = false;

    // Takeoff squash-stretch
    this.takeoffAnimTime = -1;

    // Head tracking
    this.headLookTarget = new THREE.Vector3();
    this.headChild = null;

    // Head snap state (idle)
    this.headSnapTargetY = 0;
    this.headSnapTargetX = 0;
    this.headSnapHoldRemaining = 0;

    // Create textures before building bird mesh
    this.fireTexture = this.createFireTexture();
    this.glowTexture = this.createGlowTexture();
    this.emberTexture = this.createEmberTexture();

    this.createPhoenixMesh();

    // Camera rig for third person view
    this.cameraOffset = new THREE.Vector3(CAMERA.OFFSET.x, CAMERA.OFFSET.y, CAMERA.OFFSET.z);
    this.cameraRig = new THREE.Object3D();
    this.mesh.add(this.cameraRig);
  }

  // ========== Procedural Texture Functions ==========
  createFireTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE.CANVAS_SIZE;
    canvas.height = TEXTURE.CANVAS_SIZE;
    const ctx = canvas.getContext('2d');

    // Fill with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TEXTURE.CANVAS_SIZE, TEXTURE.CANVAS_SIZE);

    // Create flame gradient effect with multiple layers
    for (let y = 0; y < TEXTURE.CANVAS_SIZE; y++) {
      const progress = 1 - (y / TEXTURE.CANVAS_SIZE);
      // Gradient from yellow at bottom to red to black at top
      const hue = Math.max(0, progress * 40); // Yellow (60°) to red (0°)
      const lightness = Math.max(0, progress * 50);
      ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
      ctx.fillRect(0, y, TEXTURE.CANVAS_SIZE, 1);
    }

    // Add Perlin-like noise with circles
    for (let i = 0; i < TEXTURE.FIRE_GRADIENT_LAYERS; i++) {
      const x = Math.random() * TEXTURE.CANVAS_SIZE;
      const y = Math.random() * TEXTURE.CANVAS_SIZE * TEXTURE.FIRE_GRADIENT_FOCUS;
      const radius = Math.random() * 20 + 5;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grd.addColorStop(0, 'rgba(255, 200, 0, 0.3)');
      grd.addColorStop(1, 'rgba(255, 100, 0, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE.CANVAS_SIZE;
    canvas.height = TEXTURE.CANVAS_SIZE;
    const ctx = canvas.getContext('2d');

    // Create radial glow from center
    const grd = ctx.createRadialGradient(TEXTURE.GLOW_CENTER_X, TEXTURE.GLOW_CENTER_Y, 0, TEXTURE.GLOW_CENTER_X, TEXTURE.GLOW_CENTER_Y, TEXTURE.GLOW_RADIUS);
    grd.addColorStop(0, 'rgba(255, 150, 0, 1)');
    grd.addColorStop(0.4, 'rgba(255, 100, 0, 0.6)');
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, TEXTURE.CANVAS_SIZE, TEXTURE.CANVAS_SIZE);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  createEmberTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE.CANVAS_SIZE;
    canvas.height = TEXTURE.CANVAS_SIZE;
    const ctx = canvas.getContext('2d');

    // Start with dark background
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(0, 0, TEXTURE.CANVAS_SIZE, TEXTURE.CANVAS_SIZE);

    // Add ember particles
    for (let i = 0; i < TEXTURE.EMBER_PARTICLES; i++) {
      const x = Math.random() * TEXTURE.CANVAS_SIZE;
      const y = Math.random() * TEXTURE.CANVAS_SIZE;
      const radius = Math.random() * 3 + 1;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grd.addColorStop(0, `hsl(${Math.random() * 30 + 20}, 100%, 60%)`);
      grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  // ========== Feather Creation Helper ==========
  createFeatherGeometry(length, width) {
    // Create a tapered feather shape using a cone that points outward
    // This creates a proper feather shape that tapers to a point
    const featherGeo = new THREE.ConeGeometry(width / 2, length, 4);
    featherGeo.translate(0, length / 2, 0); // Offset origin to base of cone
    return featherGeo;
  }

  createWingStructure(wingGroup, isLeftWing, bodyMatFire, bodyMatEmber) {
    // Direction multiplier (1 for right, -1 for left)
    const dir = isLeftWing ? -1 : 1;

    // ===== PRIMARY FEATHERS (outer flight feathers - longest) =====
    for (let i = 0; i < MESH.WING_PRIMARY_FEATHERS; i++) {
      const featherGeo = this.createFeatherGeometry(MESH.FEATHER_PRIMARY_LENGTH, MESH.FEATHER_PRIMARY_WIDTH);
      const feather = new THREE.Mesh(featherGeo, bodyMatFire);

      // Cascading position: Outward, slightly downward, and slightly backward
      const xPos = (i * 0.22) * dir; 
      const yPos = 0.1 - (i * 0.015); 
      const zPos = 0.3 - (i * 0.04); 

      feather.position.set(xPos, yPos, zPos);

      // Nearly parallel rotation
      feather.rotation.z = (Math.PI / 2) * -dir; 
      feather.rotation.y = 0.08 * dir; // Almost parallel with a tiny outward slant
      feather.rotation.x = -0.1;

      feather.castShadow = true;
      wingGroup.add(feather);
      if (isLeftWing) this.leftPrimaryFeathers.push(feather);
      else this.rightPrimaryFeathers.push(feather);
    }

    // ===== SECONDARY FEATHERS (middle flight feathers) =====
    for (let i = 0; i < MESH.WING_SECONDARY_FEATHERS; i++) {
      const featherGeo = this.createFeatherGeometry(MESH.FEATHER_SECONDARY_LENGTH, MESH.FEATHER_SECONDARY_WIDTH);
      const feather = new THREE.Mesh(featherGeo, bodyMatEmber);

      // Positioned underneath and slightly inside the primaries
      const xPos = (i * 0.12) * dir; 
      const yPos = -0.1 - (i * 0.01);
      const zPos = 0.0 - (i * 0.03);

      feather.position.set(xPos, yPos, zPos);

      feather.rotation.z = (Math.PI / 2) * -dir;
      feather.rotation.y = 0.05 * dir;
      feather.rotation.x = -0.05;

      feather.castShadow = true;
      wingGroup.add(feather);
    }

    // ===== COVERT FEATHERS (small overlapping feathers - covers wing base) =====
    for (let i = 0; i < MESH.WING_COVERT_FEATHERS; i++) {
      const featherGeo = this.createFeatherGeometry(MESH.FEATHER_COVERT_LENGTH, MESH.FEATHER_COVERT_WIDTH);
      const feather = new THREE.Mesh(featherGeo, bodyMatFire);

      // Two tight parallel rows cascading from the wing joint
      const row = Math.floor(i / 10); 
      const col = i % 10;

      const xPos = (col * 0.14) * dir; 
      const yPos = -0.15 - (row * 0.06); 
      const zPos = -0.05 + (row * 0.08); 

      feather.position.set(xPos, yPos, zPos);

      // Perfect parallel rotation
      feather.rotation.z = (Math.PI / 2) * -dir;
      feather.rotation.y = 0.02 * dir;
      feather.rotation.x = 0;

      feather.castShadow = true;
      wingGroup.add(feather);
    }
  }

  // ========== Phoenix Mesh Creation ==========
  createPhoenixMesh() {
    this.mesh = new THREE.Group();

    // Create materials with fire textures
    const bodyMatFire = new THREE.MeshStandardMaterial({
      map: this.fireTexture,
      color: COLORS.BODY,
      emissiveMap: this.glowTexture,
      emissive: COLORS.BODY_GLOW,
      ...(MATERIAL_PROPERTIES.BODY_FIRE),
    });

    const bodyMatEmber = new THREE.MeshStandardMaterial({
      map: this.emberTexture,
      color: COLORS.EMBER_COLOR,
      emissiveMap: this.glowTexture,
      emissive: COLORS.EMBER_GLOW,
      ...(MATERIAL_PROPERTIES.BODY_EMBER),
    });

    const tailMatFireGrad = new THREE.MeshStandardMaterial({
      map: this.fireTexture,
      color: COLORS.TAIL,
      emissiveMap: this.glowTexture,
      emissive: COLORS.TAIL_GLOW,
      ...(MATERIAL_PROPERTIES.TAIL_FIRE),
    });

    // BODY - More refined phoenix body
    const bodyGeo = new THREE.BoxGeometry(MESH.BODY.width, MESH.BODY.height, MESH.BODY.depth);
    const body = new THREE.Mesh(bodyGeo, bodyMatFire);
    body.position.y = MESH.BODY_OFFSET.y;
    body.position.z = MESH.BODY_OFFSET.z;
    body.castShadow = true;
    this.mesh.add(body);

    // NECK - Connect head to body
    const neckGeo = new THREE.CylinderGeometry(MESH.NECK.radius, MESH.NECK.radiusTop, MESH.NECK.height, 8);
    const neck = new THREE.Mesh(neckGeo, bodyMatEmber);
    neck.position.set(MESH.NECK_OFFSET.x, MESH.NECK_OFFSET.y, MESH.NECK_OFFSET.z);
    neck.castShadow = true;
    this.mesh.add(neck);

    // HEAD - More proportional phoenix head
    const headGeo = new THREE.BoxGeometry(MESH.HEAD.width, MESH.HEAD.height, MESH.HEAD.depth);
    const head = new THREE.Mesh(headGeo, bodyMatFire);
    head.position.set(MESH.HEAD_OFFSET.x, MESH.HEAD_OFFSET.y, MESH.HEAD_OFFSET.z);
    head.castShadow = true;
    this.mesh.add(head);
    this.headChild = head; // Store reference for head tracking

    // EYES
    const eyeGeo = new THREE.SphereGeometry(MESH.EYE.radius, MESH.EYE.segments, MESH.EYE.segments);
    const eyeMatIris = new THREE.MeshStandardMaterial({
      color: COLORS.EYE_IRIS,
      emissive: COLORS.EYE_GLOW,
      ...(MATERIAL_PROPERTIES.EYE_IRIS),
    });

    const eyeLeft = new THREE.Mesh(eyeGeo, eyeMatIris);
    eyeLeft.position.set(MESH.EYE_LEFT_OFFSET.x, MESH.EYE_LEFT_OFFSET.y, MESH.EYE_LEFT_OFFSET.z);
    eyeLeft.castShadow = true;
    head.add(eyeLeft);

    const eyeRight = new THREE.Mesh(eyeGeo, eyeMatIris);
    eyeRight.position.set(MESH.EYE_RIGHT_OFFSET.x, MESH.EYE_RIGHT_OFFSET.y, MESH.EYE_RIGHT_OFFSET.z);
    eyeRight.castShadow = true;
    head.add(eyeRight);

    // PUPILS
    const pupilGeo = new THREE.SphereGeometry(MESH.PUPIL.radius, MESH.PUPIL.segments, MESH.PUPIL.segments);
    const pupilMat = new THREE.MeshStandardMaterial({ color: COLORS.PUPIL });

    const pupilLeft = new THREE.Mesh(pupilGeo, pupilMat);
    pupilLeft.position.set(MESH.PUPIL_LEFT_OFFSET.x, MESH.PUPIL_LEFT_OFFSET.y, MESH.PUPIL_LEFT_OFFSET.z);
    head.add(pupilLeft);

    const pupilRight = new THREE.Mesh(pupilGeo, pupilMat);
    size: pupilRight.position.set(MESH.PUPIL_RIGHT_OFFSET.x, MESH.PUPIL_RIGHT_OFFSET.y, MESH.PUPIL_RIGHT_OFFSET.z);
    head.add(pupilRight);

    // BEAK - Refined cone shape
    const beakGeo = new THREE.ConeGeometry(MESH.BEAK.radius, MESH.BEAK.height, MESH.BEAK.segments);
    const beakMat = new THREE.MeshStandardMaterial({
      color: COLORS.BEAK,
      emissive: COLORS.BEAK_GLOW,
      ...(MATERIAL_PROPERTIES.BEAK),
    });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(MESH.BEAK_OFFSET.x, MESH.BEAK_OFFSET.y, MESH.BEAK_OFFSET.z);
    beak.castShadow = true;
    head.add(beak);

    // WINGS - Compound structure with many individual feathers
    
    // Left Wing (Pivot)
    this.wingLeft = new THREE.Group();
    this.wingLeft.position.set(MESH.WING_LEFT_PIVOT.x, MESH.WING_LEFT_PIVOT.y, MESH.WING_LEFT_PIVOT.z);

    const wingLeftStructure = new THREE.Group();
    wingLeftStructure.position.set(MESH.WING_LEFT_MESH.x, MESH.WING_LEFT_MESH.y, MESH.WING_LEFT_MESH.z);
    this.createWingStructure(wingLeftStructure, true, bodyMatFire, bodyMatEmber, tailMatFireGrad);
    this.wingLeft.add(wingLeftStructure);
    this.mesh.add(this.wingLeft);

    // Right Wing (Pivot)
    this.wingRight = new THREE.Group();
    this.wingRight.position.set(MESH.WING_RIGHT_PIVOT.x, MESH.WING_RIGHT_PIVOT.y, MESH.WING_RIGHT_PIVOT.z);

    const wingRightStructure = new THREE.Group();
    wingRightStructure.position.set(MESH.WING_RIGHT_MESH.x, MESH.WING_RIGHT_MESH.y, MESH.WING_RIGHT_MESH.z);
    this.createWingStructure(wingRightStructure, false, bodyMatFire, bodyMatEmber, tailMatFireGrad);
    this.wingRight.add(wingRightStructure);
    this.mesh.add(this.wingRight);

    // ELABORATE TAIL - Fan-shaped feathers
    const tailGroup = new THREE.Group();
    tailGroup.position.set(MESH.TAIL_GROUP_OFFSET.x, MESH.TAIL_GROUP_OFFSET.y, MESH.TAIL_GROUP_OFFSET.z);

    // Create 5 tail feather sections
    for (let i = 0; i < MESH.TAIL_FEATHER_COUNT; i++) {
      const tailFatherGeo = new THREE.BoxGeometry(MESH.TAIL_FEATHER.width, MESH.TAIL_FEATHER.height, MESH.TAIL_FEATHER.depth);
      const tailFeather = new THREE.Mesh(tailFatherGeo, tailMatFireGrad);

      // Spread feathers in a fan pattern
      const angle = (i - (MESH.TAIL_FEATHER_COUNT - 1) / 2) * MESH.TAIL_FEATHER_ANGLE_RANGE;
      tailFeather.rotation.z = angle;
      tailFeather.position.y = i * MESH.TAIL_FEATHER_SPREAD - (MESH.TAIL_FEATHER_COUNT - 1) * MESH.TAIL_FEATHER_SPREAD / 2;
      tailFeather.castShadow = true;
      tailGroup.add(tailFeather);
    }
    this.mesh.add(tailGroup);
    this.tailGroup = tailGroup;

    // FEET/TALONS
    const leftFootGroup = new THREE.Group();
    leftFootGroup.position.set(MESH.LEFT_FOOT_OFFSET.x, MESH.LEFT_FOOT_OFFSET.y, MESH.LEFT_FOOT_OFFSET.z);

    const footGeo = new THREE.ConeGeometry(MESH.TALON.radius, MESH.TALON.height, MESH.TALON.segments);
    const footMat = new THREE.MeshStandardMaterial({
      color: COLORS.TALON,
      ...(MATERIAL_PROPERTIES.TALON),
    });

    // Three talons per foot
    for (let i = 0; i < MESH.TALONS_PER_FOOT; i++) {
      const talon = new THREE.Mesh(footGeo, footMat);
      talon.rotation.z = (i - 1) * MESH.TALON_ROTATION_SPREAD;
      talon.position.y = -i * MESH.TALON_Y_OFFSET;
      talon.castShadow = true;
      leftFootGroup.add(talon);
    }
    this.mesh.add(leftFootGroup);

    const rightFootGroup = new THREE.Group();
    rightFootGroup.position.set(MESH.RIGHT_FOOT_OFFSET.x, MESH.RIGHT_FOOT_OFFSET.y, MESH.RIGHT_FOOT_OFFSET.z);

    for (let i = 0; i < MESH.TALONS_PER_FOOT; i++) {
      const talon = new THREE.Mesh(footGeo, footMat);
      talon.rotation.z = (i - 1) * MESH.TALON_ROTATION_SPREAD;
      talon.position.y = -i * MESH.TALON_Y_OFFSET;
      talon.castShadow = true;
      rightFootGroup.add(talon);
    }
    this.mesh.add(rightFootGroup);

    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);
  }

  update(dt) {
    const input = this.inputManager;
    const moveZ = input.moveVector.y; // Forward/Backward
    const moveX = input.moveVector.x; // Left/Right turning
    const time = performance.now() * 0.001; // Time in seconds

    // State machine (walking vs flying)
    if (input.isJumping) {
      if (!this.isFlying) {
        // Takeoff
        this.isFlying = true;
        this.isLanding = false;
        this.yVelocity = this.jumpForce;
        this.currentFlightSpeed = 5;
        this.mesh.position.y += 0.1;
        this.takeoffAnimTime = 0; // start squash-stretch
      } else {
        // Flap wings to ascend
        this.yVelocity += PHYSICS.FLAP_THRUST * dt;
      }
    }

    if (this.isFlying) {
      // ===== REALISTIC FLIGHT PHYSICS =====

      // Accelerate/decelerate smoothly based on input
      const targetSpeed = this.maxFlightSpeed * (0.3 + Math.max(0, moveZ));
      const speedDifference = targetSpeed - this.currentFlightSpeed;
      this.currentFlightSpeed += Math.sign(speedDifference) * Math.min(Math.abs(speedDifference), this.flightAcceleration * dt);

      // Apply air resistance
      this.currentFlightSpeed *= this.airResistance;

      // Gravity: gliding birds lose altitude more slowly than powered flight
      const gravFactor = this.isGliding ? PHYSICS.FLIGHT_GRAVITY_FACTOR * 0.5 : PHYSICS.FLIGHT_GRAVITY_FACTOR;
      this.yVelocity += this.gravity * gravFactor * dt;

      // ===== ROTATION & MOVEMENT =====

      // Handle turning (Yaw) - smoother turning
      this.mesh.rotation.y -= moveX * this.turnSpeed * dt;

      // Pitch (look up/down) with head tracking
      const targetPitch = moveZ > 0.2 ? 0.3 : -0.1; // Pitch up when flying forward
      this.mesh.rotation.x += (targetPitch - this.mesh.rotation.x) * 0.15; // Smooth pitch transition
      this.mesh.rotation.x = Math.max(CONSTRAINTS.PITCH_MIN, Math.min(CONSTRAINTS.PITCH_MAX, this.mesh.rotation.x));

      // Roll (bank) when turning - more realistic flight
      const targetRoll = -moveX * 0.15; // Bank into turns
      this.mesh.rotation.z += (targetRoll - this.mesh.rotation.z) * 0.1;

      // Move forward/backward based on flight speed
      const flyDir = new THREE.Vector3(0, 0, 1); // Local forward
      flyDir.applyQuaternion(this.mesh.quaternion);
      this.mesh.position.add(flyDir.multiplyScalar(this.currentFlightSpeed * dt));
      this.mesh.position.y += this.yVelocity * dt;

      // ===== WING ANIMATIONS =====
      const speedRatio = this.currentFlightSpeed / this.maxFlightSpeed;
      this.isGliding = !input.isJumping && this.currentFlightSpeed > this.maxFlightSpeed * 0.35;

      if (this.isGliding) {
        // Glide: wings held at dihedral with gentle soaring rock
        const glideRock = Math.sin(time * 0.7) * 0.03;
        const dihedral = 0.22;
        this.wingLeft.rotation.z += (dihedral + glideRock - this.wingLeft.rotation.z) * Math.min(1, 6 * dt);
        this.wingRight.rotation.z += (-(dihedral + glideRock) - this.wingRight.rotation.z) * Math.min(1, 6 * dt);
        this.wingLeft.rotation.x = Math.sin(time * 0.4) * 0.02;
        this.wingRight.rotation.x = Math.sin(time * 0.4) * 0.02;
        // Reset primary feather spread during glide
        for (let i = 0; i < this.leftPrimaryFeathers.length; i++) {
          this.leftPrimaryFeathers[i].rotation.y = -0.08;
          this.rightPrimaryFeathers[i].rotation.y = 0.08;
        }
      } else {
        // Active flapping
        const wingFlapFrequency = 3 + speedRatio * 5;
        this.wingFlapPhase += dt * wingFlapFrequency * Math.PI * 2;
        const wingFlap = Math.sin(this.wingFlapPhase);

        const wingAmt = 0.6 + speedRatio * 0.4;
        this.wingLeft.rotation.z = wingFlap * wingAmt;
        this.wingRight.rotation.z = -wingFlap * wingAmt;
        this.wingLeft.rotation.x = Math.sin(this.wingFlapPhase * 0.5) * 0.05;
        this.wingRight.rotation.x = Math.sin(this.wingFlapPhase * 0.5) * 0.05;

        // Primary feather spread: fan open on downstroke, fold on upstroke
        const downstroke = Math.max(0, wingFlap);
        for (let i = 0; i < this.leftPrimaryFeathers.length; i++) {
          const spread = i * 0.025 * downstroke;
          this.leftPrimaryFeathers[i].rotation.y = -0.08 - spread;
          this.rightPrimaryFeathers[i].rotation.y = 0.08 + spread;
        }
      }

      // ===== TAIL DYNAMICS =====
      if (this.tailGroup) {
        // Tail follows flight direction smoothly
        const tailPitch = moveZ > 0.2 ? 0.1 : -0.05;
        this.tailGroup.rotation.x = tailPitch;

        // Tail wagging for stability
        this.tailGroup.rotation.z = Math.sin(this.wingFlapPhase * 0.3) * 0.12;
        this.tailGroup.rotation.y = moveX * 0.1; // React to turning
      }

      // ===== HEAD TRACKING =====
      if (this.headChild) {
        // Head looks toward direction of travel
        const headLookDir = flyDir.clone();
        const headYaw = Math.atan2(headLookDir.x, headLookDir.z);
        const headPitch = Math.atan2(headLookDir.y,
          Math.sqrt(headLookDir.x * headLookDir.x + headLookDir.z * headLookDir.z));

        this.headChild.rotation.y += (headYaw * 0.3 - this.headChild.rotation.y) * 0.1;
        this.headChild.rotation.x += (headPitch * 0.2 - this.headChild.rotation.x) * 0.1;
      }

      // ===== LANDING DETECTION =====
      if (this.mesh.position.y <= BOUNDS.GROUND_LEVEL && this.yVelocity < 0) {
        this.mesh.position.y = BOUNDS.GROUND_LEVEL;
        this.isFlying = false;
        this.isLanding = true;
        this.yVelocity = 0;
        this.currentFlightSpeed *= 0.5; // Slow down on landing

        // Reset rotations smoothly
        this.mesh.rotation.x = 0;
        this.mesh.rotation.z = 0;
        this.wingLeft.rotation.z = 0;
        this.wingRight.rotation.z = 0;
        this.wingLeft.rotation.x = 0;
        this.wingRight.rotation.x = 0;
      }

    } else {
      // ===== WALKING PHYSICS =====

      // Gravity while walking
      this.yVelocity += this.gravity * dt;
      this.mesh.position.y += this.yVelocity * dt;

      if (this.mesh.position.y <= BOUNDS.GROUND_LEVEL) {
        this.mesh.position.y = BOUNDS.GROUND_LEVEL;
        this.yVelocity = 0;
      }

      // Handle turning (Yaw)
      this.mesh.rotation.y -= moveX * this.turnSpeed * dt;

      // Smooth rotation back to level
      this.mesh.rotation.z += (0 - this.mesh.rotation.z) * 0.15;

      // Move forward/backward
      const walkDir = new THREE.Vector3(0, 0, moveZ);
      walkDir.applyQuaternion(this.mesh.quaternion);
      this.mesh.position.add(walkDir.multiplyScalar(this.speed * dt));

      // Camera manual rotation (right stick X)
      this.cameraRig.rotation.y -= input.lookVector.x * this.turnSpeed * dt;

      // ===== IDLE/WALK ANIMATIONS =====
      if (Math.abs(moveZ) < MOVEMENT.IDLE_THRESHOLD && Math.abs(moveX) < MOVEMENT.IDLE_THRESHOLD) {
        // IDLE STATE - Gentle bobbing and tail sway when stationary
        this.mesh.position.y += Math.sin(time * ANIMATION.IDLE_BOB_FREQUENCY) * ANIMATION.IDLE_BOB_AMOUNT;

        // Tail sway animation
        if (this.tailGroup) {
          this.tailGroup.rotation.z = Math.sin(time * ANIMATION.IDLE_TAIL_FREQUENCY) * ANIMATION.IDLE_TAIL_AMOUNT;
          this.tailGroup.rotation.x = Math.sin(time * 0.8) * ANIMATION.IDLE_TAIL_AMOUNT * 0.6;
        }

        // Head snaps discretely to random targets like a real bird
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

        // Wings folded but slightly rustling
        const idleWingTime = time * 1.5;
        this.wingLeft.rotation.z = Math.sin(idleWingTime) * 0.05;
        this.wingRight.rotation.z = -Math.sin(idleWingTime) * 0.05;

      } else {
        // WALKING STATE - Subtle wing motion and head bobbing
        const walkingWingTime = time * ANIMATION.WALK_WING_FREQUENCY;
        const walkMotion = Math.sin(walkingWingTime);

        // Wings flap lightly while walking
        this.wingLeft.rotation.z = walkMotion * ANIMATION.WALK_WING_AMOUNT;
        this.wingRight.rotation.z = -walkMotion * ANIMATION.WALK_WING_AMOUNT;

        // Head bobs as the bird walks
        if (this.headChild) {
          this.headChild.position.y = MESH.HEAD_OFFSET.y + Math.sin(walkingWingTime * 0.5) * 0.03;
        }

        // Subtle body sway
        this.mesh.rotation.z = Math.sin(walkingWingTime * 0.5) * 0.05;
      }
    }

    // Squash-stretch on takeoff
    if (this.takeoffAnimTime >= 0) {
      this.takeoffAnimTime += dt;
      if (this.takeoffAnimTime < 0.1) {
        this.mesh.scale.y = 1 - 0.15 * (this.takeoffAnimTime / 0.1);
      } else if (this.takeoffAnimTime < 0.25) {
        const t = (this.takeoffAnimTime - 0.1) / 0.15;
        this.mesh.scale.y = 0.85 + 0.3 * t;
      } else if (this.takeoffAnimTime < 0.5) {
        const t = (this.takeoffAnimTime - 0.25) / 0.25;
        this.mesh.scale.y = 1.15 - 0.15 * t;
      } else {
        this.mesh.scale.y = 1.0;
        this.takeoffAnimTime = -1;
      }
    }

    // Keep bird within platform border (-98 to 98 on X and Z axis)
    this.mesh.position.x = Math.max(-BOUNDS.ARENA_BORDER, Math.min(BOUNDS.ARENA_BORDER, this.mesh.position.x));
    this.mesh.position.z = Math.max(-BOUNDS.ARENA_BORDER, Math.min(BOUNDS.ARENA_BORDER, this.mesh.position.z));

    // Update Camera position to follow player smoothly
    const idealOffset = this.cameraOffset.clone();
    // Rotate offset by cameraRig's rotation so right stick orbits camera
    idealOffset.applyAxisAngle(new THREE.Vector3(0,1,0), this.cameraRig.rotation.y);
    idealOffset.applyQuaternion(this.mesh.quaternion);
    idealOffset.add(this.mesh.position);

    this.camera.position.lerp(idealOffset, CAMERA.LERP_SPEED * dt);
    
    // Look at slightly above player
    const lookAtTarget = this.mesh.position.clone();
    lookAtTarget.y += CAMERA.LOOK_TARGET_OFFSET_Y;
    this.camera.lookAt(lookAtTarget);
  }
}
