import * as THREE from 'three';
import { Player } from './Player.js';
import { InputManager } from './InputManager.js';

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
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    this.scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
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
    const geometry = new THREE.PlaneGeometry(200, 200);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x2e8b57, // Sea green
      roughness: 0.8,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Add some trees
    const treeGeo = new THREE.ConeGeometry(2, 5, 8);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x006400 });
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.5, 2);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

    for (let i = 0; i < 50; i++) {
        const x = (Math.random() - 0.5) * 180;
        const z = (Math.random() - 0.5) * 180;
        
        // Don't spawn exactly at center
        if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;

        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(x, 1, z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;

        const leaves = new THREE.Mesh(treeGeo, treeMat);
        leaves.position.set(0, 3.5, 0);
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
