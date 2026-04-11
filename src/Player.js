import * as THREE from 'three';

export class Player {
  constructor(scene, camera, inputManager) {
    this.scene = scene;
    this.camera = camera;
    this.inputManager = inputManager;

    // Physics
    this.velocity = new THREE.Vector3();
    this.speed = 10;
    this.flightSpeed = 20;
    this.turnSpeed = 2;
    
    this.isFlying = false;
    this.yVelocity = 0;
    this.gravity = -20;
    this.jumpForce = 15;

    // Create textures before building bird mesh
    this.fireTexture = this.createFireTexture();
    this.glowTexture = this.createGlowTexture();
    this.emberTexture = this.createEmberTexture();

    this.createPhoenixMesh();

    // Camera rig for third person view
    this.cameraOffset = new THREE.Vector3(0, 3, -10); // x, y, z relative to player
    this.cameraRig = new THREE.Object3D();
    this.mesh.add(this.cameraRig);
  }

  // ========== Procedural Texture Functions ==========
  createFireTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Fill with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);

    // Create flame gradient effect with multiple layers
    for (let y = 0; y < 256; y++) {
      const progress = 1 - (y / 256);
      // Gradient from yellow at bottom to red to black at top
      const hue = Math.max(0, progress * 40); // Yellow (60°) to red (0°)
      const lightness = Math.max(0, progress * 50);
      ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
      ctx.fillRect(0, y, 256, 1);
    }

    // Add Perlin-like noise with circles
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256 * 0.7; // Focus on lower half
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
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Create radial glow from center
    const grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 150);
    grd.addColorStop(0, 'rgba(255, 150, 0, 1)');
    grd.addColorStop(0.4, 'rgba(255, 100, 0, 0.6)');
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  createEmberTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Start with dark background
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(0, 0, 256, 256);

    // Add ember particles
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
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
      color: 0xFF6B00,
      emissiveMap: this.glowTexture,
      emissive: 0xFF4500,
      emissiveIntensity: 0.5,
      roughness: 0.4,
      metalness: 0.1,
    });

    const bodyMatEmber = new THREE.MeshStandardMaterial({
      map: this.emberTexture,
      color: 0xFF8C00,
      emissiveMap: this.glowTexture,
      emissive: 0xFF6B00,
      emissiveIntensity: 0.4,
      roughness: 0.5,
      metalness: 0.05,
    });

    const tailMatFireGrad = new THREE.MeshStandardMaterial({
      map: this.fireTexture,
      color: 0xFFD700,
      emissiveMap: this.glowTexture,
      emissive: 0xFFA500,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.2,
    });

    // BODY - More refined phoenix body
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.9, 2);
    const body = new THREE.Mesh(bodyGeo, bodyMatFire);
    body.position.y = 0.5;
    body.position.z = -0.2;
    body.castShadow = true;
    this.mesh.add(body);

    // NECK - Connect head to body
    const neckGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.7, 8);
    const neck = new THREE.Mesh(neckGeo, bodyMatEmber);
    neck.position.set(0, 1.2, 0.5);
    neck.castShadow = true;
    this.mesh.add(neck);

    // HEAD - More proportional phoenix head
    const headGeo = new THREE.BoxGeometry(0.6, 0.7, 0.6);
    const head = new THREE.Mesh(headGeo, bodyMatFire);
    head.position.set(0, 1.8, 1.0);
    head.castShadow = true;
    this.mesh.add(head);

    // EYES
    const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeMatIris = new THREE.MeshStandardMaterial({
      color: 0xFF4500,
      emissive: 0xFF6B00,
      emissiveIntensity: 0.3,
    });

    const eyeLeft = new THREE.Mesh(eyeGeo, eyeMatIris);
    eyeLeft.position.set(-0.2, 1.95, 1.35);
    eyeLeft.castShadow = true;
    this.mesh.add(eyeLeft);

    const eyeRight = new THREE.Mesh(eyeGeo, eyeMatIris);
    eyeRight.position.set(0.2, 1.95, 1.35);
    eyeRight.castShadow = true;
    this.mesh.add(eyeRight);

    // PUPILS
    const pupilGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

    const pupilLeft = new THREE.Mesh(pupilGeo, pupilMat);
    pupilLeft.position.set(-0.2, 1.95, 1.45);
    this.mesh.add(pupilLeft);

    const pupilRight = new THREE.Mesh(pupilGeo, pupilMat);
    pupilRight.position.set(0.2, 1.95, 1.45);
    this.mesh.add(pupilRight);

    // BEAK - Refined cone shape
    const beakGeo = new THREE.ConeGeometry(0.15, 0.6, 4);
    const beakMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFA500,
      emissiveIntensity: 0.2,
      roughness: 0.3,
    });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 1.8, 1.55);
    beak.castShadow = true;
    this.mesh.add(beak);

    // WINGS - Larger and more detailed
    const wingGeo = new THREE.BoxGeometry(3, 0.15, 1.2);
    
    // Left Wing (Pivot)
    this.wingLeft = new THREE.Group();
    this.wingLeft.position.set(-0.5, 0.8, -0.2);
    const wingLeftMesh = new THREE.Mesh(wingGeo, bodyMatFire);
    wingLeftMesh.position.set(-1.5, 0, 0);
    wingLeftMesh.castShadow = true;
    this.wingLeft.add(wingLeftMesh);
    this.mesh.add(this.wingLeft);

    // Right Wing (Pivot)
    this.wingRight = new THREE.Group();
    this.wingRight.position.set(0.5, 0.8, -0.2);
    const wingRightMesh = new THREE.Mesh(wingGeo, bodyMatFire);
    wingRightMesh.position.set(1.5, 0, 0);
    wingRightMesh.castShadow = true;
    this.wingRight.add(wingRightMesh);
    this.mesh.add(this.wingRight);

    // ELABORATE TAIL - Fan-shaped feathers
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.6, -1.2);

    // Create 5 tail feather sections
    for (let i = 0; i < 5; i++) {
      const tailFatherGeo = new THREE.BoxGeometry(0.3, 0.1, 1.5);
      const tailFeather = new THREE.Mesh(tailFatherGeo, tailMatFireGrad);

      // Spread feathers in a fan pattern
      const angle = (i - 2) * 0.25; // -0.5 to 0.5 radians
      tailFeather.rotation.z = angle;
      tailFeather.position.y = i * 0.15 - 0.3;
      tailFeather.castShadow = true;
      tailGroup.add(tailFeather);
    }
    this.mesh.add(tailGroup);
    this.tailGroup = tailGroup;

    // FEET/TALONS
    const leftFootGroup = new THREE.Group();
    leftFootGroup.position.set(-0.3, 0, 0);

    const footGeo = new THREE.ConeGeometry(0.08, 0.4, 4);
    const footMat = new THREE.MeshStandardMaterial({
      color: 0xB8860B,
      roughness: 0.6,
    });

    // Three talons per foot
    for (let i = 0; i < 3; i++) {
      const talon = new THREE.Mesh(footGeo, footMat);
      talon.rotation.z = (i - 1) * 0.3;
      talon.position.y = -i * 0.1;
      talon.castShadow = true;
      leftFootGroup.add(talon);
    }
    this.mesh.add(leftFootGroup);

    const rightFootGroup = new THREE.Group();
    rightFootGroup.position.set(0.3, 0, 0);

    for (let i = 0; i < 3; i++) {
      const talon = new THREE.Mesh(footGeo, footMat);
      talon.rotation.z = (i - 1) * 0.3;
      talon.position.y = -i * 0.1;
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
        this.yVelocity += 25 * dt; // Add upward thrust
      }
    }

    if (this.isFlying) {
       // Flight Physics
       this.yVelocity += this.gravity * 0.5 * dt; // Less gravity while flying
       
       // Handle turning (Yaw) - Invert X so moving stick right turns right
       this.mesh.rotation.y -= moveX * this.turnSpeed * dt;

       // Pitch (look up/down) based on right joystick Y
       this.mesh.rotation.x += input.lookVector.y * this.turnSpeed * dt;
       // Clamp pitch
       this.mesh.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.mesh.rotation.x));

       // Move forward/backward
       // If joystick is pushed forward, fly faster forward. 
       const flyDir = new THREE.Vector3(0, 0, 1); // Local forward
       flyDir.applyQuaternion(this.mesh.quaternion);
       
       // Apply speed based on input (default moving forward slightly if flying)
       const forwardSpeed = this.flightSpeed * (0.5 + Math.max(0, moveZ)); 
       
       this.mesh.position.add(flyDir.multiplyScalar(forwardSpeed * dt));
       this.mesh.position.y += this.yVelocity * dt;

      // Animate wings flapping intensely during flight
      const flightWingTime = time * 5; // Faster wing flapping
      this.wingLeft.rotation.z = Math.sin(flightWingTime) * 0.8;
      this.wingRight.rotation.z = -Math.sin(flightWingTime) * 0.8;

      // Tail follows flight movement with trailing animation
      if (this.tailGroup) {
        this.tailGroup.rotation.x = Math.sin(flightWingTime * 0.5) * 0.15;
        this.tailGroup.rotation.z = Math.cos(flightWingTime * 0.3) * 0.1;
      }

       // Ground collision (Landing)
       if (this.mesh.position.y <= 0) {
         this.mesh.position.y = 0;
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

        if (this.mesh.position.y <= 0) {
            this.mesh.position.y = 0;
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
      if (Math.abs(moveZ) < 0.1 && Math.abs(moveX) < 0.1) {
        // Gentle vertical bobbing
        this.mesh.position.y += Math.sin(time * 1.5) * 0.05;

        // Tail sway animation
        if (this.tailGroup) {
          this.tailGroup.rotation.z = Math.sin(time * 1.2) * 0.2;
          this.tailGroup.rotation.x = Math.sin(time * 0.8) * 0.1;
        }

        // Subtle head rotation
        const headChild = this.mesh.children.find(child =>
          child.geometry && child.geometry.type === 'BoxGeometry' &&
          child.geometry.parameters.width === 0.6
        );
        if (headChild) {
          headChild.rotation.y = Math.sin(time * 0.6) * 0.1;
        }
      } else {
        // Walking animation - subtle wing motion while walking
        const walkingWingTime = time * 3;
        this.wingLeft.rotation.z = Math.sin(walkingWingTime) * 0.3;
        this.wingRight.rotation.z = -Math.sin(walkingWingTime) * 0.3;
      }
    }

    // Keep bird within platform border (-100 to 100 on X and Z axis)
    const border = 98;
    this.mesh.position.x = Math.max(-border, Math.min(border, this.mesh.position.x));
    this.mesh.position.z = Math.max(-border, Math.min(border, this.mesh.position.z));

    // Update Camera position to follow player smoothly
    const idealOffset = this.cameraOffset.clone();
    // Rotate offset by cameraRig's rotation so right stick orbits camera
    idealOffset.applyAxisAngle(new THREE.Vector3(0,1,0), this.cameraRig.rotation.y);
    idealOffset.applyQuaternion(this.mesh.quaternion);
    idealOffset.add(this.mesh.position);

    this.camera.position.lerp(idealOffset, 5 * dt);
    
    // Look at slightly above player
    const lookAtTarget = this.mesh.position.clone();
    lookAtTarget.y += 2;
    this.camera.lookAt(lookAtTarget);
  }
}
