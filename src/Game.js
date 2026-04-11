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
    const treeGeo = new THREE.ConeGeometry(ENVIRONMENT.TREE_CANOPY_RADIUS, ENVIRONMENT.TREE_CANOPY_HEIGHT, 8);
    const treeMat = new THREE.MeshStandardMaterial({ color: COLORS.TREE_CANOPY });
    const trunkGeo = new THREE.CylinderGeometry(
      ENVIRONMENT.TREE_TRUNK_RADIUS,
      ENVIRONMENT.TREE_TRUNK_RADIUS,
      ENVIRONMENT.TREE_TRUNK_HEIGHT
    );
    const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.TREE_TRUNK });

    const arenaRadius = ENVIRONMENT.GROUND_SIZE / 2 - 10;
    for (let i = 0; i < ENVIRONMENT.TREE_COUNT; i++) {
      const x = (Math.random() - 0.5) * (arenaRadius * 2);
      const z = (Math.random() - 0.5) * (arenaRadius * 2);
        
        // Don't spawn exactly at center
      if (Math.abs(x) < ENVIRONMENT.TREE_CENTER_EXCLUSION && Math.abs(z) < ENVIRONMENT.TREE_CENTER_EXCLUSION) continue;

        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, ENVIRONMENT.TREE_TRUNK_HEIGHT / 2, z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;

        const leaves = new THREE.Mesh(treeGeo, treeMat);
      leaves.position.set(0, ENVIRONMENT.TREE_TRUNK_HEIGHT + ENVIRONMENT.TREE_CANOPY_HEIGHT / 2, 0);
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        trunk.add(leaves);

        this.scene.add(trunk);
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
