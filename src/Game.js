import * as THREE from 'three';
import { Player } from './Player.js';
import { InputManager } from './InputManager.js';
import { COLORS, ENVIRONMENT, CAMERA_SETUP } from './constants.js';

export class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.player = null;
    this.inputManager = null;
    this.clock = new THREE.Clock();
  }

  init() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.SKY);
    this.scene.fog = new THREE.Fog(COLORS.SKY, CAMERA_SETUP.FOG_NEAR, CAMERA_SETUP.FOG_FAR);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_SETUP.FOV,
      window.innerWidth / window.innerHeight,
      CAMERA_SETUP.NEAR_PLANE,
      CAMERA_SETUP.FAR_PLANE
    );
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, ENVIRONMENT.LIGHT_AMBIENT_INTENSITY);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, ENVIRONMENT.LIGHT_DIRECTIONAL_INTENSITY);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = ENVIRONMENT.LIGHT_SHADOW_TOP;
    dirLight.shadow.camera.bottom = ENVIRONMENT.LIGHT_SHADOW_BOTTOM;
    dirLight.shadow.camera.left = ENVIRONMENT.LIGHT_SHADOW_LEFT;
    dirLight.shadow.camera.right = ENVIRONMENT.LIGHT_SHADOW_RIGHT;
    this.scene.add(dirLight);

    // Environment
    this.createEnvironment();

    // Input manager
    this.inputManager = new InputManager();
    this.inputManager.init();

    // Player
    this.player = new Player(this.scene, this.camera, this.inputManager);

    // Handle Resize
    window.addEventListener('resize', () => this.onWindowResize(), false);

    // Game loop
    this.renderer.setAnimationLoop(() => this.animate());
  }

  createEnvironment() {
    // Simple ground plane
    const geometry = new THREE.PlaneGeometry(ENVIRONMENT.GROUND_SIZE, ENVIRONMENT.GROUND_SIZE);
    const material = new THREE.MeshStandardMaterial({
      color: COLORS.GROUND,
      roughness: 0.8,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Add some trees
    const treeGeoCone = new THREE.ConeGeometry(ENVIRONMENT.TREE_CANOPY_RADIUS, ENVIRONMENT.TREE_CANOPY_HEIGHT, 8);
    const treeGeoSphere = new THREE.DodecahedronGeometry(ENVIRONMENT.TREE_CANOPY_RADIUS * 1.5, 1);
    const treeMat = new THREE.MeshStandardMaterial({ color: COLORS.TREE_CANOPY, roughness: 0.9, flatShading: true });
    
    const trunkGeo = new THREE.CylinderGeometry(
      ENVIRONMENT.TREE_TRUNK_RADIUS * 0.8,
      ENVIRONMENT.TREE_TRUNK_RADIUS * 1.2,
      ENVIRONMENT.TREE_TRUNK_HEIGHT,
      8
    );
    const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.TREE_TRUNK, roughness: 1.0 });

    const arenaRadius = ENVIRONMENT.GROUND_SIZE / 2 - 10;
    for (let i = 0; i < ENVIRONMENT.TREE_COUNT; i++) {
      const x = (Math.random() - 0.5) * (arenaRadius * 2);
      const z = (Math.random() - 0.5) * (arenaRadius * 2);
        
        // Don't spawn exactly at center
      if (Math.abs(x) < ENVIRONMENT.TREE_CENTER_EXCLUSION && Math.abs(z) < ENVIRONMENT.TREE_CENTER_EXCLUSION) continue;

      const treeGroup = new THREE.Group();

      // Randomize base size between 0.6 and 2.0
      const scale = 0.6 + Math.random() * 1.4;
      treeGroup.scale.set(scale, scale, scale);
      treeGroup.rotation.y = Math.random() * Math.PI * 2;
      
      // Variable trunk height
      const trunkHeight = ENVIRONMENT.TREE_TRUNK_HEIGHT * (0.7 + Math.random() * 0.6);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.scale.y = trunkHeight / ENVIRONMENT.TREE_TRUNK_HEIGHT;
      trunk.position.y = trunkHeight / 2;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      treeGroup.add(trunk);

      // Random tree type: Pine (cones) vs Oak (spheres/dodecahedrons)
      const isPine = Math.random() > 0.4;
      
      if (isPine) {
          const numCones = 3 + Math.floor(Math.random() * 2);
          for (let j = 0; j < numCones; j++) {
              const leaves = new THREE.Mesh(treeGeoCone, treeMat);
              const heightOffset = trunkHeight + (ENVIRONMENT.TREE_CANOPY_HEIGHT / 2) + (j * ENVIRONMENT.TREE_CANOPY_HEIGHT * 0.35);
              leaves.position.y = heightOffset;
              const leafScale = 1 - (j * 0.22);
              leaves.scale.set(leafScale, leafScale, leafScale);
              leaves.castShadow = true;
              leaves.receiveShadow = true;
              treeGroup.add(leaves);
          }
      } else {
          const numSpheres = 3 + Math.floor(Math.random() * 3);
          for (let j = 0; j < numSpheres; j++) {
              const leaves = new THREE.Mesh(treeGeoSphere, treeMat);
              leaves.position.set(
                  (Math.random() - 0.5) * ENVIRONMENT.TREE_CANOPY_RADIUS,
                  trunkHeight + ENVIRONMENT.TREE_CANOPY_RADIUS * 0.5 + Math.random() * ENVIRONMENT.TREE_CANOPY_RADIUS,
                  (Math.random() - 0.5) * ENVIRONMENT.TREE_CANOPY_RADIUS
              );
              const leafScale = 0.5 + Math.random() * 0.5;
              leaves.scale.set(leafScale, leafScale, leafScale);
              leaves.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
              leaves.castShadow = true;
              leaves.receiveShadow = true;
              treeGroup.add(leaves);
          }
      }

      treeGroup.position.set(x, 0, z);
      this.scene.add(treeGroup);
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    const dt = this.clock.getDelta();
    if (this.player) {
      this.player.update(dt);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
