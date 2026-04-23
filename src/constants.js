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
    // Flight wing animation is now speed-based and calculated dynamically
    FLIGHT_WING_BASE_FREQUENCY: 3,    // Base wing flap frequency while flying
    FLIGHT_WING_MAX_FREQUENCY: 8,     // Max wing flap frequency at full speed
    FLIGHT_WING_BASE_AMOUNT: 0.6,     // Base wing flap magnitude
    FLIGHT_WING_MAX_AMOUNT: 1.0,      // Max wing flap magnitude at full speed
    // Tail animation
  FLIGHT_TAIL_ROTATION_FREQ: 0.5, // Tail rotation frequency during flight
  FLIGHT_TAIL_ROTATION_AMOUNT: 0.15,
  FLIGHT_TAIL_SIDE_FREQ: 0.3,  // Tail side-to-side frequency
  FLIGHT_TAIL_SIDE_AMOUNT: 0.1,
  // Primary feather wave deformation
  FEATHER_WAVE_PHASE_LAG: 0.15,   // radians of lag added per feather (tip trails root)
  FEATHER_WAVE_BEND_AMOUNT: 0.12, // max flex at feather tip per half-stroke
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
  NECK: { radius: 0.3, radiusTop: 0.35, height: 0.85 },
  HEAD: { width: 0.6, height: 0.7, depth: 0.6 },
  EYE: { radius: 0.12, segments: 8 },
  PUPIL: { radius: 0.05, segments: 8 },
  BEAK: { radius: 0.15, height: 0.6, segments: 4 },
  WING: { width: 3, height: 0.15, depth: 1.2 },
  TAIL_FEATHER: { width: 0.3, height: 0.1, depth: 1.5 },
  TALON: { radius: 0.08, height: 0.4, segments: 4 },

  // Positioning offsets
  BODY_OFFSET: { y: 0.5, z: -0.2 },
  NECK_OFFSET: { x: 0, y: 1.08, z: 0.68 },
  HEAD_OFFSET: { x: 0, y: 1.8, z: 1.0 },
  EYE_LEFT_OFFSET: { x: -0.2, y: 0.15, z: 0.35 },
  EYE_RIGHT_OFFSET: { x: 0.2, y: 0.15, z: 0.35 },
  PUPIL_LEFT_OFFSET: { x: -0.2, y: 0.15, z: 0.45 },
  PUPIL_RIGHT_OFFSET: { x: 0.2, y: 0.15, z: 0.45 },
  BEAK_OFFSET: { x: 0, y: 0, z: 0.55 },
  WING_LEFT_PIVOT: { x: -0.4, y: 0.8, z: -0.2 },
  WING_LEFT_MESH: { x: 0, y: 0, z: 0 },
  WING_RIGHT_PIVOT: { x: 0.4, y: 0.8, z: -0.2 },
  WING_RIGHT_MESH: { x: 0, y: 0, z: 0 },
  TAIL_GROUP_OFFSET: { x: 0, y: 0.6, z: -1.2 },
  LEFT_FOOT_OFFSET: { x: -0.3, y: 0, z: 0 },
  RIGHT_FOOT_OFFSET: { x: 0.3, y: 0, z: 0 },

  // Tail feather configuration (long horizontal fan, like golden pheasant 2/3-body-length tail)
  TAIL_FEATHER_COUNT: 9,
  TAIL_FEATHER_LENGTH: 3.5,       // PlaneGeometry length (was BoxGeometry depth 1.5)
  TAIL_FEATHER_WIDTH: 0.42,       // PlaneGeometry width
  TAIL_FEATHER_ANGLE_RANGE: 0.2,  // Per-feather fan angle (total spread ~±0.8 rad)

  // Head crest — dramatic golden crown plumes (3× original size)
  CREST_FEATHER_COUNT: 7,
  CREST_FEATHER_LENGTH: 1.6,
  CREST_FEATHER_WIDTH: 0.28,

  // Neck ruff — bold scale-like collar (2.5× original size)
  NECK_RUFF_COUNT: 10,
  NECK_RUFF_LENGTH: 0.75,
  NECK_RUFF_WIDTH: 0.38,

  // Body contour feathers — overlapping rows that cover the capsule torso
  BODY_FEATHER_ROWS: 6,
  BODY_FEATHER_PER_ROW: 8,
  BODY_FEATHER_LENGTH: 0.70,
  BODY_FEATHER_WIDTH: 0.35,
  BODY_FEATHER_TILT: 0.40,   // radians — lifts tip away from body surface

  // Neck contour feathers — small feathers wrapping the neck cylinder
  NECK_FEATHER_ROWS: 4,
  NECK_FEATHER_PER_ROW: 6,
  NECK_FEATHER_LENGTH: 0.42,
  NECK_FEATHER_WIDTH: 0.22,
  NECK_FEATHER_TILT: 0.35,

  // Head contour feathers — small feathers covering the head box
  HEAD_FEATHER_ROWS: 3,
  HEAD_FEATHER_PER_ROW: 6,
  HEAD_FEATHER_LENGTH: 0.26,
  HEAD_FEATHER_WIDTH: 0.15,
  HEAD_FEATHER_TILT: 0.35,

  // Tail upper-covert feathers — shorter feathers covering the tail base
  TAIL_COVERT_ROWS: 3,
  TAIL_COVERT_PER_ROW: 7,
  TAIL_COVERT_LENGTH: 1.20,
  TAIL_COVERT_WIDTH: 0.30,

    // Wing feather configuration - Realistic multi-layer system
    WING_PRIMARY_FEATHERS: 10,       // Outer flight feathers
    WING_SECONDARY_FEATHERS: 12,     // Middle flight feathers
    WING_COVERT_FEATHERS: 20,        // Small overlapping feathers
    FEATHER_PRIMARY_LENGTH: 2.5,     // Primary feather length
    FEATHER_PRIMARY_WIDTH: 0.5,      // Primary feather width (4× original — visible as a surface)
    FEATHER_SECONDARY_LENGTH: 1.9,   // Secondary feather length
    FEATHER_SECONDARY_WIDTH: 0.42,   // Secondary feather width (3×)
    FEATHER_COVERT_LENGTH: 1.1,      // Covert feather length
    FEATHER_COVERT_WIDTH: 0.36,      // Covert feather width (2.25×)
    FEATHER_THICKNESS: 0.02,
    WING_FEATHER_SPREAD: 0.15,
    WING_FEATHER_ANGLE: 0.12,
    WING_FEATHER_LAYBACK: 0.08,

    // Bird body (capsule replaces box)
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
