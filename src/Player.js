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

    this.createBirdMesh();

    // Camera rig for third person view
    this.cameraOffset = new THREE.Vector3(0, 3, -10); // x, y, z relative to player
    this.cameraRig = new THREE.Object3D();
    this.mesh.add(this.cameraRig);
  }

  createBirdMesh() {
    this.mesh = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1E90FF }); // DodgerBlue
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    this.mesh.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.2, 0.8);
    head.castShadow = true;
    this.mesh.add(head);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.2, 0.5, 4);
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 }); // Gold
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 1.2, 1.4);
    this.mesh.add(beak);

    // Wings
    const wingGeo = new THREE.BoxGeometry(2.5, 0.1, 1);
    this.wingLeft = new THREE.Mesh(wingGeo, bodyMat);
    this.wingLeft.position.set(-1.5, 0.8, 0);
    this.mesh.add(this.wingLeft);

    this.wingRight = new THREE.Mesh(wingGeo, bodyMat);
    this.wingRight.position.set(1.5, 0.8, 0);
    this.mesh.add(this.wingRight);

    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);
  }

  update(dt) {
    const input = this.inputManager;
    const moveZ = input.moveVector.y; // Forward/Backward
    const moveX = input.moveVector.x; // Left/Right turning

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

       // Animate wings flapping intensely
       const time = performance.now() * 0.015;
       this.wingLeft.rotation.z = Math.sin(time) * 0.8;
       this.wingRight.rotation.z = -Math.sin(time) * 0.8;

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
