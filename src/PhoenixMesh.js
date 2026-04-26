import * as THREE from 'three';
import { MESH, COLORS, MATERIAL_PROPERTIES } from './constants.js';

// ─── Shared vertex shader ─────────────────────────────────────────────────────
// GLSL 3.0 — outputs world-space position, normal and UV for all fragment shaders.

const _VERT = /* glsl */`
out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUv;

void main() {
  vec4 worldPos  = modelMatrix * vec4(position, 1.0);
  vWorldPos      = worldPos.xyz;
  vNormal        = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
  vUv            = uv;
  gl_Position    = projectionMatrix * viewMatrix * worldPos;
}`;

// ─── Shared fire preamble ─────────────────────────────────────────────────────
// Perlin fBm volume, colour ramp and half-Lambert diffuse — appended to every
// fragment shader so all phoenix parts share one coherent animated fire look.

const _FIRE_COMMON = /* glsl */`
precision highp float;
precision highp sampler3D;

uniform sampler3D uVolume;
uniform float     uTime;
uniform float     uScrollY;
uniform float     uScrollZ;
uniform float     uScale;
uniform float     uStrength;

in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUv;

out vec4 fragColor;

// Deep crimson → orange → bright gold ramp
vec3 fireRamp(float n) {
  vec3 cool = vec3(0.60, 0.04, 0.02);
  vec3 warm = vec3(1.00, 0.46, 0.02);
  vec3 hot  = vec3(1.00, 0.90, 0.45);
  return n < 0.5 ? mix(cool, warm, n * 2.0) : mix(warm, hot, (n - 0.5) * 2.0);
}

float halfLambert() {
  return dot(normalize(vNormal), normalize(vec3(1.0, 2.0, 1.0))) * 0.38 + 0.62;
}

float volumeSample() {
  vec3 sp  = vWorldPos * uScale;
  sp.y    -= uTime * uScrollY;
  sp.z    += uTime * uScrollZ;
  return texture(uVolume, fract(sp)).r;
}
`;

// ─── Fragment shaders ─────────────────────────────────────────────────────────

// Body / neck / head — samples a feather colour map; fire modulates on top.
const _FRAG_BODY = _FIRE_COMMON + /* glsl */`
uniform sampler2D uColorMap;

void main() {
  vec4  texel = texture(uColorMap, vUv);
  float n     = volumeSample();
  vec3  fire  = fireRamp(n);
  // Blend feather map with fire; fire is additive at hot spots
  vec3  col   = mix(texel.rgb, fire * 1.15, n * uStrength * 0.70);
  col        += fire * (n * n) * uStrength * 0.40;
  col        *= halfLambert();
  fragColor   = vec4(col, 1.0);
}`;

// Wing surface — feather map carries its own alpha for the silhouette.
const _FRAG_WING = _FIRE_COMMON + /* glsl */`
uniform sampler2D uColorMap;

void main() {
  vec4  texel = texture(uColorMap, vUv);
  if (texel.a < 0.04) discard;
  float n    = volumeSample();
  vec3  fire = fireRamp(n);
  vec3  col  = mix(texel.rgb, fire * 1.20, n * uStrength * 0.65);
  col       += fire * (n * n) * uStrength * 0.30;
  col       *= halfLambert();
  fragColor  = vec4(col, texel.a);
}`;

// Tail — feather map on an opaque fan shape.
const _FRAG_TAIL = _FIRE_COMMON + /* glsl */`
uniform sampler2D uColorMap;

void main() {
  vec4  texel = texture(uColorMap, vUv);
  float n     = volumeSample();
  vec3  fire  = fireRamp(n);
  vec3  col   = mix(texel.rgb, fire * 1.25, n * uStrength * 0.60);
  col        += fire * (n * n) * uStrength * 0.45;
  col        *= halfLambert();
  // Soft edge fade from alpha in texture (feather tips)
  float a     = max(0.55, texel.a);
  fragColor   = vec4(col, a);
}`;

// ─── Material factories ───────────────────────────────────────────────────────

function _baseUniforms(fireVolume3D, scrollY, scrollZ, scale, strength) {
  return {
    uVolume:   { value: fireVolume3D },
    uTime:     { value: 0.0 },
    uScrollY:  { value: scrollY },
    uScrollZ:  { value: scrollZ },
    uScale:    { value: scale },
    uStrength: { value: strength },
  };
}

function _bodyMat(fireVolume3D, colorMap, scrollY, scrollZ, scale, strength) {
  return new THREE.ShaderMaterial({
    glslVersion:    THREE.GLSL3,
    vertexShader:   _VERT,
    fragmentShader: _FRAG_BODY,
    uniforms: {
      ..._baseUniforms(fireVolume3D, scrollY, scrollZ, scale, strength),
      uColorMap: { value: colorMap },
    },
  });
}

function _wingMat(fireVolume3D, colorMap, scrollY, scrollZ, scale, strength) {
  return new THREE.ShaderMaterial({
    glslVersion:    THREE.GLSL3,
    vertexShader:   _VERT,
    fragmentShader: _FRAG_WING,
    uniforms: {
      ..._baseUniforms(fireVolume3D, scrollY, scrollZ, scale, strength),
      uColorMap: { value: colorMap },
    },
    side:        THREE.DoubleSide,
    transparent: true,
    depthWrite:  false,
  });
}

function _tailMat(fireVolume3D, colorMap, scrollY, scrollZ, scale, strength) {
  return new THREE.ShaderMaterial({
    glslVersion:    THREE.GLSL3,
    vertexShader:   _VERT,
    fragmentShader: _FRAG_TAIL,
    uniforms: {
      ..._baseUniforms(fireVolume3D, scrollY, scrollZ, scale, strength),
      uColorMap: { value: colorMap },
    },
    side:        THREE.DoubleSide,
    transparent: true,
  });
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function createPhoenixMesh(scene, { bodyFeatherMap, wingFeatherMap, tailFeatherMap, fireVolume3D }) {
  const mesh = new THREE.Group();

  // Body uses body feather map with moderate fire scroll
  const bodyMat  = _bodyMat(fireVolume3D, bodyFeatherMap, 0.28, 0.10, 0.44, 0.60);
  // Neck/head use the same map tiled more tightly
  const neckMat  = _bodyMat(fireVolume3D, bodyFeatherMap, 0.22, 0.08, 0.50, 0.52);
  // Wings get the dedicated wing feather map
  const wingMat  = _wingMat(fireVolume3D, wingFeatherMap, 0.32, 0.12, 0.40, 0.58);
  // Tail fan with streaming feather map
  const tailMat  = _tailMat(fireVolume3D, tailFeatherMap, 0.18, 0.07, 0.36, 0.65);

  const shaderMaterials = [bodyMat, neckMat, wingMat, tailMat];

  _buildBody(mesh, bodyMat, neckMat);
  const headChild = _buildHead(mesh, neckMat);
  const tailGroup = _buildTail(mesh, tailMat);
  const { wingLeft, wingRight } = _buildWings(mesh, wingMat);
  _buildFeet(mesh);

  scene.add(mesh);

  return { mesh, wingLeft, wingRight, tailGroup, headChild, shaderMaterials };
}

// ─── Body ─────────────────────────────────────────────────────────────────────

function _buildBody(mesh, bodyMat, neckMat) {
  const bodyCap = new THREE.CapsuleGeometry(
    MESH.BODY_CAPSULE_RADIUS, MESH.BODY_CAPSULE_LENGTH, 8, 16
  );
  bodyCap.rotateX(Math.PI / 2);
  // Tile the feather map 3× around the circumference, 2× vertically
  _scaleCapsuleUVs(bodyCap, 3, 2);
  const body = new THREE.Mesh(bodyCap, bodyMat);
  body.position.set(0, MESH.BODY_OFFSET.y, MESH.BODY_OFFSET.z);
  body.castShadow = true;
  mesh.add(body);

  const neckGeo = new THREE.CylinderGeometry(
    MESH.NECK.radius, MESH.NECK.radiusTop, MESH.NECK.height, 12
  );
  // Tile 2× around neck circumference
  _scaleCylinderUVs(neckGeo, 2, 1);
  const neck = new THREE.Mesh(neckGeo, neckMat);
  neck.position.set(MESH.NECK_OFFSET.x, MESH.NECK_OFFSET.y, MESH.NECK_OFFSET.z);
  neck.rotation.x = MESH.NECK_ROTATION_X;
  neck.castShadow = true;
  mesh.add(neck);
}

// ─── Head ─────────────────────────────────────────────────────────────────────

function _buildHead(mesh, headMat) {
  const headGeo = new THREE.SphereGeometry(MESH.HEAD.radius, 16, 12);
  _scaleUVs(headGeo, 2, 1.5);
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(MESH.HEAD_OFFSET.x, MESH.HEAD_OFFSET.y, MESH.HEAD_OFFSET.z);
  head.castShadow = true;
  mesh.add(head);

  // Eyes
  const eyeGeo   = new THREE.SphereGeometry(MESH.EYE.radius,   MESH.EYE.segments,   MESH.EYE.segments);
  const pupilGeo = new THREE.SphereGeometry(MESH.PUPIL.radius, MESH.PUPIL.segments, MESH.PUPIL.segments);
  const eyeMat   = new THREE.MeshStandardMaterial({
    color:             COLORS.EYE_IRIS,
    emissive:          COLORS.EYE_GLOW,
    ...MATERIAL_PROPERTIES.EYE_IRIS,
  });
  const pupilMat = new THREE.MeshStandardMaterial({ color: COLORS.PUPIL });

  for (const [eyeOff, pupilOff] of [
    [MESH.EYE_LEFT_OFFSET,   MESH.PUPIL_LEFT_OFFSET],
    [MESH.EYE_RIGHT_OFFSET,  MESH.PUPIL_RIGHT_OFFSET],
  ]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(eyeOff.x, eyeOff.y, eyeOff.z);
    head.add(eye);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(pupilOff.x, pupilOff.y, pupilOff.z);
    head.add(pupil);
  }

  // Beak
  const beakMat  = new THREE.MeshStandardMaterial({
    color:    COLORS.BEAK,
    emissive: COLORS.BEAK_GLOW,
    ...MATERIAL_PROPERTIES.BEAK,
  });
  const upperBeak = new THREE.Mesh(
    new THREE.ConeGeometry(MESH.BEAK.radius, MESH.BEAK.height, MESH.BEAK.segments), beakMat
  );
  upperBeak.rotation.x = Math.PI / 2;
  upperBeak.position.set(MESH.BEAK_OFFSET.x, MESH.BEAK_OFFSET.y + 0.05, MESH.BEAK_OFFSET.z);
  head.add(upperBeak);

  const lowerBeak = new THREE.Mesh(
    new THREE.ConeGeometry(MESH.BEAK.radius * 0.7, MESH.BEAK.height * 0.65, MESH.BEAK.segments), beakMat
  );
  lowerBeak.rotation.x = Math.PI / 2 + 0.3;
  lowerBeak.position.set(MESH.BEAK_OFFSET.x, MESH.BEAK_OFFSET.y - 0.08, MESH.BEAK_OFFSET.z + 0.04);
  head.add(lowerBeak);

  return head;
}

// ─── Wings ────────────────────────────────────────────────────────────────────
// Each wing is a single ShapeGeometry (smooth membrane outline) textured with the
// wing feather map — no individual PlaneGeometry feathers.

function _buildWings(mesh, wingMat) {
  const wingLeft  = _buildWing(mesh, wingMat, true);
  const wingRight = _buildWing(mesh, wingMat, false);
  return { wingLeft, wingRight };
}

function _buildWing(mesh, mat, isLeft) {
  const dir  = isLeft ? -1 : 1;
  const wing = new THREE.Group();
  wing.position.set(
    isLeft ? MESH.WING_LEFT_PIVOT.x  : MESH.WING_RIGHT_PIVOT.x,
    isLeft ? MESH.WING_LEFT_PIVOT.y  : MESH.WING_RIGHT_PIVOT.y,
    isLeft ? MESH.WING_LEFT_PIVOT.z  : MESH.WING_RIGHT_PIVOT.z,
  );

  // Wing outline: swept leading edge, broad chord, tapers to tip
  const shape = new THREE.Shape();
  shape.moveTo(0,          -0.22);
  shape.quadraticCurveTo(dir * 1.10, -0.32, dir * 2.20, -0.08);
  shape.quadraticCurveTo(dir * 2.50,  0.10, dir * 2.10,  0.55);
  shape.quadraticCurveTo(dir * 1.20,  0.65, dir * 0.40,  0.60);
  shape.quadraticCurveTo(dir * 0.10,  0.58,          0,   0.52);
  shape.closePath();

  const geo = new THREE.ShapeGeometry(shape, 24);
  geo.rotateX(-Math.PI / 2);

  // For the left wing, flip UV.x so the feather texture reads body→tip correctly
  if (isLeft) {
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) uvs.setX(i, 1.0 - uvs.getX(i));
    uvs.needsUpdate = true;
  }

  const surface = new THREE.Mesh(geo, mat);
  surface.castShadow = true;
  wing.add(surface);
  mesh.add(wing);
  return wing;
}

// ─── Tail ─────────────────────────────────────────────────────────────────────
// Single fan-shaped mesh with the tail feather texture — replaces the old array
// of individual PlaneGeometry tail feathers.

function _buildTail(mesh, tailMat) {
  const tailGroup = new THREE.Group();
  tailGroup.position.set(MESH.TAIL_GROUP_OFFSET.x, MESH.TAIL_GROUP_OFFSET.y, MESH.TAIL_GROUP_OFFSET.z);
  tailGroup.rotation.x = MESH.TAIL_BASE_TILT;

  const fanHalf = Math.PI * 0.32;    // ~58° each side
  const length  = 3.4;
  const segs    = 32;

  const fanShape = new THREE.Shape();
  fanShape.moveTo(0, 0);
  for (let i = 0; i <= segs; i++) {
    const angle = -fanHalf + (i / segs) * fanHalf * 2;
    fanShape.lineTo(Math.sin(angle) * length, -Math.cos(angle) * length);
  }
  fanShape.closePath();

  const fanGeo = new THREE.ShapeGeometry(fanShape, segs);
  fanGeo.rotateX(Math.PI / 2);         // lay flat in XZ plane

  const fan = new THREE.Mesh(fanGeo, tailMat);
  fan.castShadow = true;
  tailGroup.add(fan);
  mesh.add(tailGroup);
  return tailGroup;
}

// ─── Feet ─────────────────────────────────────────────────────────────────────

function _buildFeet(mesh) {
  const footGeo = new THREE.ConeGeometry(MESH.TALON.radius, MESH.TALON.height, MESH.TALON.segments);
  const footMat = new THREE.MeshStandardMaterial({ color: COLORS.TALON, ...MATERIAL_PROPERTIES.TALON });

  for (const offset of [MESH.LEFT_FOOT_OFFSET, MESH.RIGHT_FOOT_OFFSET]) {
    const footGroup = new THREE.Group();
    footGroup.position.set(offset.x, offset.y, offset.z);
    for (let i = 0; i < MESH.TALONS_PER_FOOT; i++) {
      const talon = new THREE.Mesh(footGeo, footMat);
      talon.rotation.z = (i - 1) * MESH.TALON_ROTATION_SPREAD;
      talon.position.y = -i * MESH.TALON_Y_OFFSET;
      talon.castShadow = true;
      footGroup.add(talon);
    }
    mesh.add(footGroup);
  }
}

// ─── UV helpers ───────────────────────────────────────────────────────────────
// Scale UV coordinates of built-in geometries so the tiling feather texture
// wraps the correct number of times around each body part.

function _scaleUVs(geo, uRepeat, vRepeat) {
  const uvs = geo.attributes.uv;
  for (let i = 0; i < uvs.count; i++) {
    uvs.setXY(i, uvs.getX(i) * uRepeat, uvs.getY(i) * vRepeat);
  }
  uvs.needsUpdate = true;
}

function _scaleCapsuleUVs(geo, uRepeat, vRepeat) { _scaleUVs(geo, uRepeat, vRepeat); }
function _scaleCylinderUVs(geo, uRepeat, vRepeat) { _scaleUVs(geo, uRepeat, vRepeat); }
