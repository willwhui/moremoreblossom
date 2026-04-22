import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Player } from './Player.js';
import { InputManager } from './InputManager.js';
import { EmberParticles } from './EmberParticles.js';
import { COLORS, ENVIRONMENT, CAMERA_SETUP, BLOOM } from './constants.js';

export class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.emberParticles = null;
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
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.7;
    this.container.appendChild(this.renderer.domElement);

    // Post-processing: bloom
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      BLOOM.STRENGTH,
      BLOOM.RADIUS,
      BLOOM.THRESHOLD
    );
    this.composer.addPass(bloomPass);

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

    // Ember particle trail
    this.emberParticles = new EmberParticles(this.scene);

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
    const arenaRadius = ENVIRONMENT.GROUND_SIZE / 2 - 10;
    for (let i = 0; i < ENVIRONMENT.TREE_COUNT; i++) {
      const x = (Math.random() - 0.5) * (arenaRadius * 2);
      const z = (Math.random() - 0.5) * (arenaRadius * 2);
        
      // Don't spawn exactly at center
      if (Math.abs(x) < ENVIRONMENT.TREE_CENTER_EXCLUSION && Math.abs(z) < ENVIRONMENT.TREE_CENTER_EXCLUSION) continue;

      this.createTree(x, z);
    }
  }

  createTree(x, z) {
    const type = ENVIRONMENT.TREE_TYPES[Math.floor(Math.random() * ENVIRONMENT.TREE_TYPES.length)];
    const scale = ENVIRONMENT.TREE_SCALE_MIN + Math.random() * (ENVIRONMENT.TREE_SCALE_MAX - ENVIRONMENT.TREE_SCALE_MIN);
    const canopyColor = ENVIRONMENT.TREE_CANOPY_COLORS[Math.floor(Math.random() * ENVIRONMENT.TREE_CANOPY_COLORS.length)];
    const trunkColor = ENVIRONMENT.TREE_TRUNK_COLORS[Math.floor(Math.random() * ENVIRONMENT.TREE_TRUNK_COLORS.length)];

    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);
    treeGroup.scale.set(scale, scale, scale);
    treeGroup.rotation.y = Math.random() * Math.PI * 2;

    // Trunk
    const trunkHeight = ENVIRONMENT.TREE_TRUNK_HEIGHT;
    const trunkGeo = new THREE.CylinderGeometry(
      ENVIRONMENT.TREE_TRUNK_RADIUS,
      ENVIRONMENT.TREE_TRUNK_RADIUS * 1.2, // Tapered trunk
      trunkHeight,
      8
    );
    const trunkMat = new THREE.MeshStandardMaterial({ 
      color: trunkColor,
      flatShading: true 
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Canopy
    if (type === 'pine') {
      this.createPineCanopy(treeGroup, trunkHeight, canopyColor);
    } else {
      this.createDeciduousCanopy(treeGroup, trunkHeight, canopyColor);
    }

    this.scene.add(treeGroup);
  }

  createPineCanopy(group, trunkHeight, color) {
    const layers = 3;
    const baseRadius = ENVIRONMENT.TREE_CANOPY_RADIUS;
    const layerHeight = ENVIRONMENT.TREE_CANOPY_HEIGHT / layers;
    const material = new THREE.MeshStandardMaterial({ 
      color: color,
      flatShading: true 
    });

    for (let i = 0; i < layers; i++) {
      const radius = baseRadius * (1 - (i / layers) * 0.7);
      const geo = new THREE.ConeGeometry(radius, layerHeight * 1.5, 8);
      const mesh = new THREE.Mesh(geo, material);
      
      // Stack them with some overlap
      mesh.position.y = trunkHeight + (i * layerHeight * 0.8) + (layerHeight / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // Add slight random rotation to each layer
      mesh.rotation.y = Math.random() * Math.PI;
      group.add(mesh);
    }
  }

  createDeciduousCanopy(group, trunkHeight, color) {
    const material = new THREE.MeshStandardMaterial({ 
      color: color,
      flatShading: true 
    });

    // Create a cluster of spheres/octahedrons
    const clusters = 5;
    for (let i = 0; i < clusters; i++) {
      const radius = ENVIRONMENT.TREE_CANOPY_RADIUS * (0.6 + Math.random() * 0.5);
      const geo = new THREE.IcosahedronGeometry(radius, 0); // Low poly spheres
      const mesh = new THREE.Mesh(geo, material);
      
      // Randomize position within a canopy area
      mesh.position.set(
        (Math.random() - 0.5) * radius * 0.8,
        trunkHeight + ENVIRONMENT.TREE_CANOPY_RADIUS + (Math.random() - 0.5) * radius * 0.5,
        (Math.random() - 0.5) * radius * 0.8
      );
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    const dt = this.clock.getDelta();
    if (this.player) {
      this.player.update(dt);
      this.emberParticles.update(dt, this.player.mesh.position, this.player.isFlying);
    }
    this.composer.render();
  }
}
