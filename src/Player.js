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

    // Physics
    this.velocity = new THREE.Vector3();
    this.speed = MOVEMENT.WALK_SPEED;
    this.flightSpeed = MOVEMENT.FLIGHT_SPEED;
    this.turnSpeed = MOVEMENT.TURN_SPEED;
    
    this.isFlying = false;
    this.yVelocity = 0;
    this.gravity = PHYSICS.GRAVITY;
    this.jumpForce = PHYSICS.JUMP_FORCE;

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
    this.mesh.add(eyeLeft);

    const eyeRight = new THREE.Mesh(eyeGeo, eyeMatIris);
    eyeRight.position.set(MESH.EYE_RIGHT_OFFSET.x, MESH.EYE_RIGHT_OFFSET.y, MESH.EYE_RIGHT_OFFSET.z);
    eyeRight.castShadow = true;
    this.mesh.add(eyeRight);

    // PUPILS
    const pupilGeo = new THREE.SphereGeometry(MESH.PUPIL.radius, MESH.PUPIL.segments, MESH.PUPIL.segments);
    const pupilMat = new THREE.MeshStandardMaterial({ color: COLORS.PUPIL });

    const pupilLeft = new THREE.Mesh(pupilGeo, pupilMat);
    pupilLeft.position.set(MESH.PUPIL_LEFT_OFFSET.x, MESH.PUPIL_LEFT_OFFSET.y, MESH.PUPIL_LEFT_OFFSET.z);
    this.mesh.add(pupilLeft);

    const pupilRight = new THREE.Mesh(pupilGeo, pupilMat);
    pupilRight.position.set(MESH.PUPIL_RIGHT_OFFSET.x, MESH.PUPIL_RIGHT_OFFSET.y, MESH.PUPIL_RIGHT_OFFSET.z);
    this.mesh.add(pupilRight);

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
    this.mesh.add(beak);

    // WINGS - Larger and more detailed
    const wingGeo = new THREE.BoxGeometry(MESH.WING.width, MESH.WING.height, MESH.WING.depth);
    
    // Left Wing (Pivot)
    this.wingLeft = new THREE.Group();
    this.wingLeft.position.set(MESH.WING_LEFT_PIVOT.x, MESH.WING_LEFT_PIVOT.y, MESH.WING_LEFT_PIVOT.z);
    const wingLeftMesh = new THREE.Mesh(wingGeo, bodyMatFire);
    wingLeftMesh.position.set(MESH.WING_LEFT_MESH.x, MESH.WING_LEFT_MESH.y, MESH.WING_LEFT_MESH.z);
    wingLeftMesh.castShadow = true;
    this.wingLeft.add(wingLeftMesh);
    this.mesh.add(this.wingLeft);

    // Right Wing (Pivot)
    this.wingRight = new THREE.Group();
    this.wingRight.position.set(MESH.WING_RIGHT_PIVOT.x, MESH.WING_RIGHT_PIVOT.y, MESH.WING_RIGHT_PIVOT.z);
    const wingRightMesh = new THREE.Mesh(wingGeo, bodyMatFire);
    wingRightMesh.position.set(MESH.WING_RIGHT_MESH.x, MESH.WING_RIGHT_MESH.y, MESH.WING_RIGHT_MESH.z);
    wingRightMesh.castShadow = true;
    this.wingRight.add(wingRightMesh);
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
        this.yVelocity = this.jumpForce;
      } else {
        // Flap wings to ascend
        this.yVelocity += PHYSICS.FLAP_THRUST * dt;
      }
    }

    if (this.isFlying) {
       // Flight Physics
      this.yVelocity += this.gravity * PHYSICS.FLIGHT_GRAVITY_FACTOR * dt;
       
       // Handle turning (Yaw) - Invert X so moving stick right turns right
       this.mesh.rotation.y -= moveX * this.turnSpeed * dt;

       // Pitch (look up/down) based on right joystick Y
       this.mesh.rotation.x += input.lookVector.y * this.turnSpeed * dt;
       // Clamp pitch
      this.mesh.rotation.x = Math.max(CONSTRAINTS.PITCH_MIN, Math.min(CONSTRAINTS.PITCH_MAX, this.mesh.rotation.x));

       // Move forward/backward
       // If joystick is pushed forward, fly faster forward. 
       const flyDir = new THREE.Vector3(0, 0, 1); // Local forward
       flyDir.applyQuaternion(this.mesh.quaternion);
       
       // Apply speed based on input (default moving forward slightly if flying)
       const forwardSpeed = this.flightSpeed * (0.5 + Math.max(0, moveZ)); 
       
       this.mesh.position.add(flyDir.multiplyScalar(forwardSpeed * dt));
       this.mesh.position.y += this.yVelocity * dt;

      // Animate wings flapping intensely during flight
      const flightWingTime = time * ANIMATION.FLIGHT_WING_FREQUENCY;
      this.wingLeft.rotation.z = Math.sin(flightWingTime) * ANIMATION.FLIGHT_WING_AMOUNT;
      this.wingRight.rotation.z = -Math.sin(flightWingTime) * ANIMATION.FLIGHT_WING_AMOUNT;

      // Tail follows flight movement with trailing animation
      if (this.tailGroup) {
        this.tailGroup.rotation.x = Math.sin(flightWingTime * ANIMATION.FLIGHT_TAIL_ROTATION_FREQ) * ANIMATION.FLIGHT_TAIL_ROTATION_AMOUNT;
        this.tailGroup.rotation.z = Math.cos(flightWingTime * ANIMATION.FLIGHT_TAIL_SIDE_FREQ) * ANIMATION.FLIGHT_TAIL_SIDE_AMOUNT;
      }

       // Ground collision (Landing)
      if (this.mesh.position.y <= BOUNDS.GROUND_LEVEL) {
        this.mesh.position.y = BOUNDS.GROUND_LEVEL;
         this.isFlying = false;
         this.yVelocity = 0;
         this.wingLeft.rotation.z = 0;
         this.wingRight.rotation.z = 0;
         // Reset pitch smoothly in future, for now snap
         this.mesh.rotation.x = 0;
       }

    } else {
        // Walking Physics
        this.yVelocity += this.gravity * dt;
        this.mesh.position.y += this.yVelocity * dt;

      if (this.mesh.position.y <= BOUNDS.GROUND_LEVEL) {
        this.mesh.position.y = BOUNDS.GROUND_LEVEL;
            this.yVelocity = 0;
        }

        // Handle turning (Yaw)
        this.mesh.rotation.y -= moveX * this.turnSpeed * dt;

        // Move forward/backward
        const walkDir = new THREE.Vector3(0, 0, moveZ);
        walkDir.applyQuaternion(this.mesh.quaternion);
        this.mesh.position.add(walkDir.multiplyScalar(this.speed * dt));

        // Camera manual rotation (right stick X)
        this.cameraRig.rotation.y -= input.lookVector.x * this.turnSpeed * dt;

      // IDLE ANIMATIONS - Gentle bobbing and tail sway when stationary
      if (Math.abs(moveZ) < MOVEMENT.IDLE_THRESHOLD && Math.abs(moveX) < MOVEMENT.IDLE_THRESHOLD) {
        // Gentle vertical bobbing
        this.mesh.position.y += Math.sin(time * ANIMATION.IDLE_BOB_FREQUENCY) * ANIMATION.IDLE_BOB_AMOUNT;

        // Tail sway animation
        if (this.tailGroup) {
          this.tailGroup.rotation.z = Math.sin(time * ANIMATION.IDLE_TAIL_FREQUENCY) * ANIMATION.IDLE_TAIL_AMOUNT;
          this.tailGroup.rotation.x = Math.sin(time * 0.8) * ANIMATION.IDLE_TAIL_AMOUNT;
        }

        // Subtle head rotation
        const headChild = this.mesh.children.find(child =>
          child.geometry && child.geometry.type === 'BoxGeometry' &&
          child.geometry.parameters.width === MESH.HEAD.width
        );
        if (headChild) {
          headChild.rotation.y = Math.sin(time * ANIMATION.IDLE_HEAD_FREQUENCY) * ANIMATION.IDLE_HEAD_AMOUNT;
        }
      } else {
        // Walking animation - subtle wing motion while walking
        const walkingWingTime = time * ANIMATION.WALK_WING_FREQUENCY;
        this.wingLeft.rotation.z = Math.sin(walkingWingTime) * ANIMATION.WALK_WING_AMOUNT;
        this.wingRight.rotation.z = -Math.sin(walkingWingTime) * ANIMATION.WALK_WING_AMOUNT;
      }
    }

    // Keep bird within platform border (-100 to 100 on X and Z axis)
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
