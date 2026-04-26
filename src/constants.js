/**
 * Game Constants
 * Central location for all physics values, dimensions, colors, and configuration.
 * Follow DRY principle - edit here, not in individual files.
 */

// ========== PHYSICS CONSTANTS ==========
export const PHYSICS = {
  GRAVITY: -20,              // Downward acceleration
  JUMP_FORCE: 15,            // Initial upward velocity on jump
  FLIGHT_GRAVITY_FACTOR: 0.5, // Reduced gravity while flying
  FLAP_THRUST: 25,           // Extra upward thrust when flapping
    AIR_RESISTANCE: 0.95,      // Damping factor for flight (0.95 = 5% per frame)
    FLIGHT_ACCELERATION: 8,    // Units per second squared for speed changes
};

// ========== MOVEMENT CONSTANTS ==========
export const MOVEMENT = {
  WALK_SPEED: 10,            // Units per second walking
  FLIGHT_SPEED: 20,          // Units per second flying
  TURN_SPEED: 2,             // Radians per second rotation
  IDLE_THRESHOLD: 0.1,       // Input magnitude below this is "idle"
};

// ========== PLAYER BOUNDS ==========
export const BOUNDS = {
  ARENA_BORDER: 98,          // Maximum X and Z distance from center
  ARENA_MAX: 100,            // Arena radius (floor is 200x200)
  GROUND_LEVEL: 0,            // Y position of ground
};

// ========== CAMERA CONSTANTS ==========
export const CAMERA = {
  OFFSET: { x: 0, y: 3, z: -10 },  // Third-person camera offset
  LOOK_TARGET_OFFSET_Y: 2,         // Height above player to look at
  LERP_SPEED: 5,                   // Smooth camera follow speed
};

// ========== ANIMATION CONSTANTS ==========
export const ANIMATION = {
    IDLE_BOB_FREQUENCY: 0.8,     // Bobbing animation frequency (idle)
    IDLE_BOB_AMOUNT: 0.02,       // Bobbing animation magnitude
    IDLE_TAIL_FREQUENCY: 0.6,    // Tail sway frequency
    IDLE_TAIL_AMOUNT: 0.1,       // Tail sway magnitude
    IDLE_HEAD_FREQUENCY: 0.3,    // Head rotation frequency
    IDLE_HEAD_AMOUNT: 0.05,      // Head rotation magnitude
  WALK_WING_FREQUENCY: 3,      // Wing flap frequency while walking
  WALK_WING_AMOUNT: 0.3,       // Wing flap magnitude while walking
  // Flight wing animation (speed-based)
  FLIGHT_WING_BASE_FREQUENCY: 3,
  FLIGHT_WING_MAX_FREQUENCY: 8,
  FLIGHT_WING_BASE_AMOUNT: 0.6,
  FLIGHT_WING_MAX_AMOUNT: 1.0,
};

// ========== ROTATION CONSTRAINTS ==========
export const CONSTRAINTS = {
  PITCH_MIN: -Math.PI / 3,    // Max look down (-60 degrees)
  PITCH_MAX: Math.PI / 3,     // Max look up (60 degrees)
};

// ========== MESH DIMENSIONS ==========
export const MESH = {
  // Body proportions
  BODY: { width: 0.8, height: 0.9, depth: 2 },
  // Neck: slim tapered cylinder — radius (head end) much smaller than body radius.
  // CylinderGeometry(radiusTop, radiusBottom, height) → NECK.radius = head end, NECK.radiusTop = body end.
  NECK: { radius: 0.15, radiusTop: 0.21, height: 0.76 },
  // Head: sphere (not box) — radius drives SphereGeometry and crest/feather placement.
  HEAD: { radius: 0.26 },
  EYE: { radius: 0.09, segments: 8 },
  PUPIL: { radius: 0.038, segments: 8 },
  BEAK: { radius: 0.11, height: 0.38, segments: 4 },
  WING: { width: 3, height: 0.15, depth: 1.2 },
  TAIL_FEATHER: { width: 0.3, height: 0.1, depth: 1.5 },
  TALON: { radius: 0.08, height: 0.4, segments: 4 },

  // Neck tilt: POSITIVE angle tilts narrow end UP-FORWARD toward head (anatomically correct).
  NECK_ROTATION_X: 0.50,
  // Tail base tilt: slight downward angle matching a real bird's resting tail angle.
  TAIL_BASE_TILT: 0.22,

  // Positioning offsets
  BODY_OFFSET: { y: 0.5, z: -0.2 },
  // Neck center bridges body-top-front to head-sphere-bottom.
  NECK_OFFSET: { x: 0, y: 1.02, z: 0.62 },
  HEAD_OFFSET: { x: 0, y: 1.52, z: 0.84 },
  // Eyes on upper-side of sphere (x ≈ ±0.20 places them on the lateral face).
  EYE_LEFT_OFFSET:    { x: -0.20, y: 0.07, z: 0.14 },
  EYE_RIGHT_OFFSET:   { x:  0.20, y: 0.07, z: 0.14 },
  PUPIL_LEFT_OFFSET:  { x: -0.19, y: 0.07, z: 0.22 },
  PUPIL_RIGHT_OFFSET: { x:  0.19, y: 0.07, z: 0.22 },
  // Beak starts just inside the front hemisphere so it looks fused to the face.
  BEAK_OFFSET: { x: 0, y: -0.04, z: 0.20 },
  // Wings attach at the shoulder: top-lateral body edge, front third of torso.
  WING_LEFT_PIVOT:  { x: -0.44, y: 0.90, z: 0.10 },
  WING_LEFT_MESH:   { x: 0, y: 0, z: 0 },
  WING_RIGHT_PIVOT: { x:  0.44, y: 0.90, z: 0.10 },
  WING_RIGHT_MESH:  { x: 0, y: 0, z: 0 },
  // Tail exits the upper-back of the body; TAIL_BASE_TILT applies a downward angle.
  TAIL_GROUP_OFFSET: { x: 0, y: 0.70, z: -1.08 },
  LEFT_FOOT_OFFSET:  { x: -0.3, y: 0, z: 0 },
  RIGHT_FOOT_OFFSET: { x:  0.3, y: 0, z: 0 },

  // Bird body capsule dimensions
  BODY_CAPSULE_RADIUS: 0.42,
  BODY_CAPSULE_LENGTH: 0.8,

  // Talon configuration
  TALONS_PER_FOOT: 3,
  TALON_ROTATION_SPREAD: 0.3,
  TALON_Y_OFFSET: 0.1,
};

// ========== MATERIAL COLORS ==========
export const COLORS = {
  SKY: 0x4682B4,              // Steel blue sky
  GROUND: 0x2e8b57,           // Sea green
  TREE_CANOPY: 0x006400,      // Dark green
  TREE_TRUNK: 0x8B4513,       // Brown
  BODY: 0xFF6B00,             // Phoenix body orange
  BODY_GLOW: 0xFF4500,        // Darker orange for glow
  EMBER_COLOR: 0xFF8C00,      // Ember orange
  EMBER_GLOW: 0xFF6B00,       // Darker orange for ember glow
  TAIL: 0xFFD700,             // Gold for tail
  TAIL_GLOW: 0xFFA500,        // Orange-gold for tail glow
  BEAK: 0xFFD700,             // Gold beak
  BEAK_GLOW: 0xFFA500,        // Orange for beak glow
  EYE_IRIS: 0xFF4500,         // Red-orange iris
  EYE_GLOW: 0xFF6B00,         // Red-orange glow
  PUPIL: 0x000000,            // Black pupil
  TALON: 0xB8860B,            // Dark gold talons
  // Feather color zones (inspired by golden pheasant / phoenix lore)
  CRIMSON_PRIMARY: 0xC41E3A,  // Deep crimson for primary wing feathers
  CRIMSON_GLOW: 0x8B0000,     // Dark red glow
  RUFF: 0xFF6600,             // Deep orange for neck ruff
  RUFF_GLOW: 0xFF3300,        // Orange-red ruff glow
};

// ========== MATERIAL PROPERTIES ==========
// emissiveIntensity > BLOOM.THRESHOLD so the phoenix visibly blooms
export const MATERIAL_PROPERTIES = {
  BODY_FIRE: {
    roughness: 0.4,
    metalness: 0.1,
    emissiveIntensity: 1.5,
  },
  BODY_EMBER: {
    roughness: 0.5,
    metalness: 0.05,
    emissiveIntensity: 1.2,
  },
  TAIL_FIRE: {
    roughness: 0.3,
    metalness: 0.2,
    emissiveIntensity: 1.8,
  },
  BEAK: {
    roughness: 0.3,
    metalness: 0,
    emissiveIntensity: 0.8,
  },
  EYE_IRIS: {
    emissiveIntensity: 2.0,
  },
  TALON: {
    roughness: 0.6,
    metalness: 0,
  },
  PRIMARY_FEATHER: {
    roughness: 0.3,
    metalness: 0.15,
    emissiveIntensity: 1.2,
  },
  CREST: {
    roughness: 0.25,
    metalness: 0.35,
    emissiveIntensity: 2.0,
  },
  NECK_RUFF: {
    roughness: 0.4,
    metalness: 0.1,
    emissiveIntensity: 1.2,
  },
};

// ========== TEXTURE CONSTANTS ==========
export const TEXTURE = {
  CANVAS_SIZE: 256,          // Width and height for procedural textures
  FIRE_GRADIENT_LAYERS: 100, // Number of circles in fire texture
  FIRE_GRADIENT_FOCUS: 0.7,  // Focus area for flames (lower half)
  EMBER_PARTICLES: 80,       // Number of ember particles in texture
  GLOW_CENTER_X: 128,        // Glow center X coordinate
  GLOW_CENTER_Y: 128,        // Glow center Y coordinate
  GLOW_RADIUS: 150,          // Glow radius
};

// ========== ENVIRONMENT CONSTANTS ==========
export const ENVIRONMENT = {
  GROUND_SIZE: 200,          // Ground plane dimensions (200x200)
  // Tree variety settings
  TREE_COUNT: 60,            // Increased tree count for more density
  TREE_TYPES: ['pine', 'deciduous'],
  TREE_SCALE_MIN: 0.8,
  TREE_SCALE_MAX: 1.6,
  TREE_CENTER_EXCLUSION: 15, // Slightly larger exclusion zone
  
  // Color palettes
  TREE_CANOPY_COLORS: [
    0x2d5a27, // Forest Green
    0x3a5f0b, // Olive Green
    0x4e7c32, // Dark Moss Green
    0x1e3f1a, // Deep Jungle Green
    0x228b22  // Forest Green
  ],
  TREE_TRUNK_COLORS: [
    0x8B4513, // Saddle Brown
    0xA0522D, // Sienna
    0x5D4037  // Dark Brown
  ],

  // Base dimensions (will be scaled)
  TREE_CANOPY_RADIUS: 2,
  TREE_CANOPY_HEIGHT: 5,
  TREE_TRUNK_RADIUS: 0.5,
  TREE_TRUNK_HEIGHT: 2,

  LIGHT_AMBIENT_INTENSITY: 0.35,
  LIGHT_DIRECTIONAL_INTENSITY: 0.55,
  LIGHT_SHADOW_TOP: 50,
  LIGHT_SHADOW_BOTTOM: -50,
  LIGHT_SHADOW_LEFT: -50,
  LIGHT_SHADOW_RIGHT: 50,
};

// ========== CAMERA SETUP ==========
export const CAMERA_SETUP = {
  FOV: 75,                   // Field of view in degrees
  NEAR_PLANE: 0.1,           // Near clipping plane
  FAR_PLANE: 1000,           // Far clipping plane
  FOG_COLOR: 0x87CEEB,       // Same as sky color
  FOG_NEAR: 20,              // Fog start distance
  FOG_FAR: 100,              // Fog end distance
};

// ========== BLOOM POST-PROCESSING ==========
export const BLOOM = {
  STRENGTH: 1.5,
  RADIUS: 0.4,
  // Environment lit surfaces reach ~0.35 luminance; phoenix emissive reaches ~0.7+.
  // Threshold sits between them so only the phoenix glows, not trees/ground.
  THRESHOLD: 0.5,
};

// ========== EMBER PARTICLES ==========
export const PARTICLES = {
  MAX_COUNT: 300,
  SPAWN_RATE_FLYING: 50,   // particles per second while flying
  SPAWN_RATE_GROUND: 15,   // particles per second on ground
  SPAWN_SPREAD_XZ: 0.5,    // random spawn radius around phoenix center
  SPAWN_Y_OFFSET: 0.5,     // above phoenix origin
  VEL_Y_MIN: 1.5,          // upward velocity range (m/s)
  VEL_Y_MAX: 3.0,
  VEL_XZ: 0.6,             // random horizontal speed
  GRAVITY: 0.8,            // downward acceleration on particles
  LIFE_MIN: 0.6,           // particle lifetime range (seconds)
  LIFE_MAX: 1.4,
  SIZE: 0.18,
};

// ========== INPUT CONSTANTS ==========
export const INPUT = {
  JOYSTICK_SIZE: 150,        // Joystick zone size (pixels)
  JOYSTICK_BOTTOM_OFFSET: 50, // Distance from bottom
  JOYSTICK_SIDE_OFFSET: 50,   // Distance from sides
};
