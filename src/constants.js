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
  NECK: { radius: 0.3, radiusTop: 0.35, height: 0.7 },
  HEAD: { width: 0.6, height: 0.7, depth: 0.6 },
  EYE: { radius: 0.12, segments: 8 },
  PUPIL: { radius: 0.05, segments: 8 },
  BEAK: { radius: 0.15, height: 0.6, segments: 4 },
  WING: { width: 3, height: 0.15, depth: 1.2 },
  TAIL_FEATHER: { width: 0.3, height: 0.1, depth: 1.5 },
  TALON: { radius: 0.08, height: 0.4, segments: 4 },

  // Positioning offsets
  BODY_OFFSET: { y: 0.5, z: -0.2 },
  NECK_OFFSET: { x: 0, y: 1.2, z: 0.5 },
  HEAD_OFFSET: { x: 0, y: 1.8, z: 1.0 },
  EYE_LEFT_OFFSET: { x: -0.2, y: 1.95, z: 1.35 },
  EYE_RIGHT_OFFSET: { x: 0.2, y: 1.95, z: 1.35 },
  PUPIL_LEFT_OFFSET: { x: -0.2, y: 1.95, z: 1.45 },
  PUPIL_RIGHT_OFFSET: { x: 0.2, y: 1.95, z: 1.45 },
  BEAK_OFFSET: { x: 0, y: 1.8, z: 1.55 },
  WING_LEFT_PIVOT: { x: 0, y: 0.8, z: -0.2 },
  WING_LEFT_MESH: { x: 0, y: 0, z: 0 },
  WING_RIGHT_PIVOT: { x: 0, y: 0.8, z: -0.2 },
  WING_RIGHT_MESH: { x: 0, y: 0, z: 0 },
  TAIL_GROUP_OFFSET: { x: 0, y: 0.6, z: -1.2 },
  LEFT_FOOT_OFFSET: { x: -0.3, y: 0, z: 0 },
  RIGHT_FOOT_OFFSET: { x: 0.3, y: 0, z: 0 },

  // Tail feather configuration
  TAIL_FEATHER_COUNT: 5,
  TAIL_FEATHER_ANGLE_RANGE: 0.25, // Max angle spread (-0.5 to 0.5 rad)
  TAIL_FEATHER_SPREAD: 0.15,      // Y offset between feathers
  
    // Wing feather configuration - Realistic multi-layer system
    WING_PRIMARY_FEATHERS: 10,       // Outer flight feathers
    WING_SECONDARY_FEATHERS: 12,     // Middle flight feathers
    WING_COVERT_FEATHERS: 20,        // Small overlapping feathers
    FEATHER_PRIMARY_LENGTH: 1.4,     // Primary feather length
    FEATHER_PRIMARY_WIDTH: 0.12,     // Primary feather width
    FEATHER_SECONDARY_LENGTH: 1.0,   // Secondary feather length
    FEATHER_SECONDARY_WIDTH: 0.14,   // Secondary feather width
    FEATHER_COVERT_LENGTH: 0.6,      // Covert feather length
    FEATHER_COVERT_WIDTH: 0.16,      // Covert feather width
    FEATHER_THICKNESS: 0.02,         // All feathers thickness
    WING_FEATHER_SPREAD: 0.15,       // Spacing between feathers along wing
    WING_FEATHER_ANGLE: 0.12,        // Slight angle between feathers
    WING_FEATHER_LAYBACK: 0.08,      // How much feathers lean back

  // Talon configuration
  TALONS_PER_FOOT: 3,
  TALON_ROTATION_SPREAD: 0.3,
  TALON_Y_OFFSET: 0.1,
};

// ========== MATERIAL COLORS ==========
export const COLORS = {
  SKY: 0x87CEEB,              // Sky blue background
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
};

// ========== MATERIAL PROPERTIES ==========
export const MATERIAL_PROPERTIES = {
  BODY_FIRE: {
    roughness: 0.4,
    metalness: 0.1,
    emissiveIntensity: 0.5,
  },
  BODY_EMBER: {
    roughness: 0.5,
    metalness: 0.05,
    emissiveIntensity: 0.4,
  },
  TAIL_FIRE: {
    roughness: 0.3,
    metalness: 0.2,
    emissiveIntensity: 0.6,
  },
  BEAK: {
    roughness: 0.3,
    metalness: 0,
    emissiveIntensity: 0.2,
  },
  EYE_IRIS: {
    emissiveIntensity: 0.3,
  },
  TALON: {
    roughness: 0.6,
    metalness: 0,
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
  TREE_COUNT: 50,            // Number of trees to spawn
  TREE_CANOPY_RADIUS: 2,     // Tree canopy radius
  TREE_CANOPY_HEIGHT: 5,     // Tree canopy height
  TREE_TRUNK_RADIUS: 0.5,    // Tree trunk radius
  TREE_TRUNK_HEIGHT: 2,      // Tree trunk height
  TREE_CENTER_EXCLUSION: 10, // Don't spawn trees within 10 units of center
  LIGHT_AMBIENT_INTENSITY: 0.6,
  LIGHT_DIRECTIONAL_INTENSITY: 0.8,
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

// ========== INPUT CONSTANTS ==========
export const INPUT = {
  JOYSTICK_SIZE: 150,        // Joystick zone size (pixels)
  JOYSTICK_BOTTOM_OFFSET: 50, // Distance from bottom
  JOYSTICK_SIDE_OFFSET: 50,   // Distance from sides
};
