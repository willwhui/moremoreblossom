import * as THREE from 'three';
import { MESH, COLORS, MATERIAL_PROPERTIES } from './constants.js';

// ─── GLSL shared across all phoenix ShaderMaterials ──────────────────────────
// glslVersion: THREE.GLSL3  →  #version 300 es is prepended by Three.js
// World-space sampling (vWorldPos) keeps fire coherent across adjacent feathers.

const _VERT = /* glsl */`
out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUv;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal   = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
  vUv       = uv;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}`;

// Fire color ramp + half-Lambert helper shared by all fragments via string concat.
const _FIRE_COMMON = /* glsl */`
precision highp float;
precision highp sampler3D;

uniform sampler3D uVolume;
uniform float uTime;
uniform float uScrollY;
uniform float uScrollZ;
uniform float uScale;
uniform float uStrength;

in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUv;

out vec4 fragColor;

// Deep red → orange → bright yellow
vec3 fireRamp(float n) {
  vec3 cool = vec3(0.58, 0.04, 0.00);
  vec3 warm = vec3(1.00, 0.48, 0.02);
  vec3 hot  = vec3(1.00, 0.92, 0.52);
  return n < 0.5 ? mix(cool, warm, n * 2.0) : mix(warm, hot, (n - 0.5) * 2.0);
}

float halfLambert() {
  return dot(normalize(vNormal), normalize(vec3(1.0, 2.0, 1.0))) * 0.38 + 0.62;
}

float volumeSample() {
  vec3 sp = vWorldPos * uScale;
  sp.y -= uTime * uScrollY;
  sp.z += uTime * uScrollZ;
  return texture(uVolume, fract(sp)).r;
}
`;

// Solid body/neck/head — no transparency
const _FRAG_BODY = _FIRE_COMMON + /* glsl */`
uniform vec3 uBaseColor;

void main() {
  float n    = volumeSample();
  vec3 fire  = fireRamp(n);
  vec3 col   = mix(uBaseColor, fire, n * uStrength);
  col       += fire * (n * n) * uStrength * 0.45;
  col       *= halfLambert();
  fragColor  = vec4(col, 1.0);
}`;

// Wing / legacy feathers — alphaMap silhouette (R channel) + fire on top
const _FRAG_FEATHER_ALPHA = _FIRE_COMMON + /* glsl */`
uniform sampler2D uMap;
uniform sampler2D uAlphaMap;

void main() {
  float alpha = texture(uAlphaMap, vUv).r;
  if (alpha < 0.05) discard;
  vec4 mc    = texture(uMap, vUv);
  float n    = volumeSample();
  vec3 fire  = fireRamp(n);
  vec3 col   = mix(mc.rgb, fire * 1.25, n * uStrength);
  col       += fire * (n * n) * uStrength * 0.28;
  col       *= halfLambert();
  fragColor  = vec4(col, alpha);
}`;

// Realistic contour feathers — canvas texture carries its own alpha (.a)
const _FRAG_FEATHER_CANVAS = _FIRE_COMMON + /* glsl */`
uniform sampler2D uMap;

void main() {
  vec4 mc = texture(uMap, vUv);
  if (mc.a < 0.08) discard;
  float n    = volumeSample();
  vec3 fire  = fireRamp(n);
  vec3 col   = mix(mc.rgb, fire * 1.18, n * uStrength);
  col       += fire * (n * n) * uStrength * 0.22;
  col       *= halfLambert();
  fragColor  = vec4(col, mc.a);
}`;

// Wing membrane — semi-transparent pure fire plane
const _FRAG_MEMBRANE = _FIRE_COMMON + /* glsl */`
void main() {
  float n   = volumeSample();
  vec3 fire = fireRamp(n);
  vec3 col  = fire * (0.55 + n * 0.65);
  col      += fire * n * uStrength;
  float a   = 0.22 + n * 0.28;
  fragColor = vec4(col, a);
}`;

// ─── Material factories ───────────────────────────────────────────────────────

function _baseUniforms(fireVolume3D, scrollY, scrollZ, scale, strength) {
  return {
    uVolume:  { value: fireVolume3D },
    uTime:    { value: 0.0 },
    uScrollY: { value: scrollY },
    uScrollZ: { value: scrollZ },
    uScale:   { value: scale },
    uStrength:{ value: strength },
  };
}

function _bodyMat(fireVolume3D, baseColor, scrollY, scrollZ, scale, strength) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader:   _VERT,
    fragmentShader: _FRAG_BODY,
    uniforms: {
      ..._baseUniforms(fireVolume3D, scrollY, scrollZ, scale, strength),
      uBaseColor: { value: new THREE.Color(baseColor) },
    },
  });
}

function _featherAlphaMat(fireVolume3D, map, alphaMap, scrollY, scrollZ, scale, strength) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader:   _VERT,
    fragmentShader: _FRAG_FEATHER_ALPHA,
    uniforms: {
      ..._baseUniforms(fireVolume3D, scrollY, scrollZ, scale, strength),
      uMap:      { value: map },
      uAlphaMap: { value: alphaMap },
    },
    side: THREE.DoubleSide,
    transparent: true,
  });
}

function _featherCanvasMat(fireVolume3D, map, scrollY, scrollZ, scale, strength) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader:   _VERT,
    fragmentShader: _FRAG_FEATHER_CANVAS,
    uniforms: {
      ..._baseUniforms(fireVolume3D, scrollY, scrollZ, scale, strength),
      uMap: { value: map },
    },
    side: THREE.DoubleSide,
    transparent: true,
  });
}

function _membraneMat(fireVolume3D) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader:   _VERT,
    fragmentShader: _FRAG_MEMBRANE,
    uniforms: _baseUniforms(fireVolume3D, 0.38, 0.14, 0.45, 0.42),
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function createPhoenixMesh(scene, {
  fireTexture, glowTexture, emberTexture,
  featherAlphaTexture,
  crimsonFeatherTex, goldFeatherTex, ruffFeatherTex,
  fireVolume3D,
}) {
  const mesh = new THREE.Group();

  // Body / head / neck — solid fire surfaces
  const bodyMatFire  = _bodyMat(fireVolume3D, COLORS.BODY,        0.30, 0.10, 0.48, 0.65);
  const bodyMatEmber = _bodyMat(fireVolume3D, COLORS.EMBER_COLOR, 0.20, 0.08, 0.52, 0.50);

  // Wing / legacy feathers — featherAlphaTexture silhouette
  const FA = featherAlphaTexture;
  const featherMatFire    = _featherAlphaMat(fireVolume3D, fireTexture,  FA, 0.25, 0.08, 0.40, 0.55);
  const featherMatEmber   = _featherAlphaMat(fireVolume3D, emberTexture, FA, 0.20, 0.06, 0.40, 0.45);
  const featherMatCrimson = _featherAlphaMat(fireVolume3D, fireTexture,  FA, 0.35, 0.12, 0.44, 0.60);
  const featherMatGold    = _featherAlphaMat(fireVolume3D, fireTexture,  FA, 0.20, 0.07, 0.38, 0.50);
  const featherMatRuff    = _featherAlphaMat(fireVolume3D, emberTexture, FA, 0.26, 0.09, 0.42, 0.55);

  // Realistic contour feathers — canvas textures carry alpha in their own .a
  const realFeatherCrimson = _featherCanvasMat(fireVolume3D, crimsonFeatherTex, 0.30, 0.10, 0.34, 0.50);
  const realFeatherGold    = _featherCanvasMat(fireVolume3D, goldFeatherTex,    0.22, 0.07, 0.34, 0.45);
  const realFeatherRuff    = _featherCanvasMat(fireVolume3D, ruffFeatherTex,    0.28, 0.09, 0.34, 0.48);

  // Wing membrane
  const membraneMat = _membraneMat(fireVolume3D);

  // Collect every ShaderMaterial so Player.js can tick uTime each frame
  const shaderMaterials = [
    bodyMatFire, bodyMatEmber,
    featherMatFire, featherMatEmber, featherMatCrimson, featherMatGold, featherMatRuff,
    realFeatherCrimson, realFeatherGold, realFeatherRuff,
    membraneMat,
  ];

  _buildBody(mesh, bodyMatFire, bodyMatEmber);
  _buildBodyFeathers(mesh, realFeatherCrimson);
  _buildNeckFeathers(mesh, realFeatherRuff);
  const headChild = _buildHead(mesh, bodyMatFire, bodyMatEmber, featherMatGold);
  _buildHeadFeathers(mesh, realFeatherGold);
  _buildRuff(mesh, featherMatRuff);
  const tailGroup = _buildTail(mesh, featherMatGold);
  _buildTailBodyFeathers(tailGroup, realFeatherGold);
  _buildTailCoverts(tailGroup, realFeatherGold);
  const { wingLeft, wingRight, leftPrimaryFeathers, rightPrimaryFeathers } =
    _buildWings(mesh, featherMatCrimson, featherMatEmber, featherMatFire, membraneMat);
  _buildFeet(mesh);

  mesh.position.set(0, 0, 0);
  scene.add(mesh);

  return { mesh, wingLeft, wingRight, tailGroup, headChild, leftPrimaryFeathers, rightPrimaryFeathers, shaderMaterials };
}

// ─── Body ─────────────────────────────────────────────────────────────────────

function _buildBody(mesh, bodyMatFire, bodyMatEmber) {
  const bodyCap = new THREE.CapsuleGeometry(
    MESH.BODY_CAPSULE_RADIUS, MESH.BODY_CAPSULE_LENGTH, 4, 10
  );
  bodyCap.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyCap, bodyMatFire);
  body.position.set(0, MESH.BODY_OFFSET.y, MESH.BODY_OFFSET.z);
  body.castShadow = true;
  mesh.add(body);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(MESH.NECK.radius, MESH.NECK.radiusTop, MESH.NECK.height, 8),
    bodyMatEmber
  );
  neck.position.set(MESH.NECK_OFFSET.x, MESH.NECK_OFFSET.y, MESH.NECK_OFFSET.z);
  neck.rotation.x = -0.62;
  neck.castShadow = true;
  mesh.add(neck);
}

// ─── Head ─────────────────────────────────────────────────────────────────────

function _buildHead(mesh, bodyMatFire, bodyMatEmber, crestMat) {
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(MESH.HEAD.width, MESH.HEAD.height, MESH.HEAD.depth),
    bodyMatFire
  );
  head.position.set(MESH.HEAD_OFFSET.x, MESH.HEAD_OFFSET.y, MESH.HEAD_OFFSET.z);
  head.castShadow = true;
  mesh.add(head);

  const eyeGeo   = new THREE.SphereGeometry(MESH.EYE.radius,   MESH.EYE.segments,   MESH.EYE.segments);
  const pupilGeo = new THREE.SphereGeometry(MESH.PUPIL.radius, MESH.PUPIL.segments, MESH.PUPIL.segments);
  const eyeMat   = new THREE.MeshStandardMaterial({ color: COLORS.EYE_IRIS, emissive: COLORS.EYE_GLOW, ...MATERIAL_PROPERTIES.EYE_IRIS });
  const pupilMat = new THREE.MeshStandardMaterial({ color: COLORS.PUPIL });

  for (const [eyeOff, pupilOff] of [
    [MESH.EYE_LEFT_OFFSET, MESH.PUPIL_LEFT_OFFSET],
    [MESH.EYE_RIGHT_OFFSET, MESH.PUPIL_RIGHT_OFFSET],
  ]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(eyeOff.x, eyeOff.y, eyeOff.z);
    head.add(eye);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(pupilOff.x, pupilOff.y, pupilOff.z);
    head.add(pupil);
  }

  const beakMat = new THREE.MeshStandardMaterial({ color: COLORS.BEAK, emissive: COLORS.BEAK_GLOW, ...MATERIAL_PROPERTIES.BEAK });
  const upperBeak = new THREE.Mesh(new THREE.ConeGeometry(MESH.BEAK.radius, MESH.BEAK.height, MESH.BEAK.segments), beakMat);
  upperBeak.rotation.x = Math.PI / 2;
  upperBeak.position.set(MESH.BEAK_OFFSET.x, MESH.BEAK_OFFSET.y + 0.05, MESH.BEAK_OFFSET.z);
  head.add(upperBeak);
  const lowerBeak = new THREE.Mesh(new THREE.ConeGeometry(MESH.BEAK.radius * 0.7, MESH.BEAK.height * 0.65, MESH.BEAK.segments), beakMat);
  lowerBeak.rotation.x = Math.PI / 2 + 0.3;
  lowerBeak.position.set(MESH.BEAK_OFFSET.x, MESH.BEAK_OFFSET.y - 0.08, MESH.BEAK_OFFSET.z + 0.04);
  head.add(lowerBeak);

  _buildCrest(head, crestMat);
  return head;
}

function _buildCrest(head, crestMat) {
  const count = MESH.CREST_FEATHER_COUNT;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const geo = new THREE.PlaneGeometry(MESH.CREST_FEATHER_WIDTH, MESH.CREST_FEATHER_LENGTH, 1, 1);
    geo.translate(0, MESH.CREST_FEATHER_LENGTH / 2, 0);
    const feather = new THREE.Mesh(geo, crestMat);
    feather.position.set(
      (t - 0.5) * 0.38,
      MESH.HEAD.height / 2,
      (t - 0.5) * 0.4,
    );
    feather.rotation.set(-0.5 - t * 0.4, 0, (t - 0.5) * 0.45);
    head.add(feather);
  }
}

function _buildRuff(mesh, ruffMat) {
  const count  = MESH.NECK_RUFF_COUNT;
  const baseY  = MESH.NECK_OFFSET.y - 0.2;
  const baseZ  = MESH.NECK_OFFSET.z;
  const radius = 0.44;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const geo = new THREE.PlaneGeometry(MESH.NECK_RUFF_WIDTH, MESH.NECK_RUFF_LENGTH, 1, 1);
    geo.translate(0, MESH.NECK_RUFF_LENGTH / 2, 0);
    const feather = new THREE.Mesh(geo, ruffMat);
    feather.position.set(
      Math.sin(angle) * radius,
      baseY,
      Math.cos(angle) * radius + baseZ,
    );
    feather.rotation.set(-0.55, angle, (Math.random() - 0.5) * 0.2);
    mesh.add(feather);
  }
}

// ─── Wings ────────────────────────────────────────────────────────────────────

function _buildWings(mesh, matCrimson, matEmber, matFire, membraneMat) {
  const leftPrimaryFeathers  = [];
  const rightPrimaryFeathers = [];

  const wingLeft = new THREE.Group();
  wingLeft.position.set(MESH.WING_LEFT_PIVOT.x, MESH.WING_LEFT_PIVOT.y, MESH.WING_LEFT_PIVOT.z);
  const wLS = new THREE.Group();
  _buildWingFeathers(wLS, true,  matCrimson, matEmber, matFire, membraneMat, leftPrimaryFeathers);
  wingLeft.add(wLS);
  mesh.add(wingLeft);

  const wingRight = new THREE.Group();
  wingRight.position.set(MESH.WING_RIGHT_PIVOT.x, MESH.WING_RIGHT_PIVOT.y, MESH.WING_RIGHT_PIVOT.z);
  const wRS = new THREE.Group();
  _buildWingFeathers(wRS, false, matCrimson, matEmber, matFire, membraneMat, rightPrimaryFeathers);
  wingRight.add(wRS);
  mesh.add(wingRight);

  return { wingLeft, wingRight, leftPrimaryFeathers, rightPrimaryFeathers };
}

function _featherPlane(length, width) {
  const geo = new THREE.PlaneGeometry(width, length, 1, 1);
  geo.translate(0, length / 2, 0);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function _buildWingFeathers(group, isLeft, matCrimson, matEmber, matFire, membraneMat, primaryStore) {
  const dir = isLeft ? -1 : 1;

  const memGeo = new THREE.PlaneGeometry(2.4, 1.1, 2, 2);
  memGeo.translate(1.2 * dir, -0.15, 0);
  group.add(new THREE.Mesh(memGeo, membraneMat));

  for (let i = 0; i < MESH.WING_PRIMARY_FEATHERS; i++) {
    const pivot = new THREE.Group();
    pivot.position.set((i * 0.22) * dir, 0.1 - i * 0.015, 0.3 - i * 0.04);
    const featherMesh = new THREE.Mesh(_featherPlane(MESH.FEATHER_PRIMARY_LENGTH, MESH.FEATHER_PRIMARY_WIDTH), matCrimson);
    featherMesh.rotation.y = -(Math.PI / 2) * dir;
    pivot.add(featherMesh);
    group.add(pivot);
    primaryStore.push(pivot);
  }

  for (let i = 0; i < MESH.WING_SECONDARY_FEATHERS; i++) {
    const feather = new THREE.Mesh(_featherPlane(MESH.FEATHER_SECONDARY_LENGTH, MESH.FEATHER_SECONDARY_WIDTH), matEmber);
    feather.position.set((i * 0.12) * dir, -0.1 - i * 0.01, -i * 0.03);
    feather.rotation.set(-0.18, (Math.PI / 2) * dir, 0);
    group.add(feather);
  }

  for (let i = 0; i < MESH.WING_COVERT_FEATHERS; i++) {
    const row = Math.floor(i / 10);
    const col = i % 10;
    const feather = new THREE.Mesh(_featherPlane(MESH.FEATHER_COVERT_LENGTH, MESH.FEATHER_COVERT_WIDTH), matFire);
    feather.position.set((col * 0.14) * dir, -0.15 - row * 0.06, -0.05 + row * 0.08);
    feather.rotation.set(-0.1, (Math.PI / 2) * dir, 0);
    group.add(feather);
  }
}

// ─── Body contour feathers ────────────────────────────────────────────────────

function _buildBodyFeathers(mesh, mat) {
  const ROWS = MESH.BODY_FEATHER_ROWS;
  const PER  = MESH.BODY_FEATHER_PER_ROW;
  const TILT = MESH.BODY_FEATHER_TILT;
  const r    = MESH.BODY_CAPSULE_RADIUS + 0.02;

  for (let row = 0; row < ROWS; row++) {
    const t   = row / (ROWS - 1);
    const z   = MESH.BODY_OFFSET.z + 0.62 - t * 1.30;
    const off = (row % 2) * (Math.PI / PER);
    for (let i = 0; i < PER; i++) {
      const theta = off + (i / PER) * Math.PI * 2;
      const geo = _featherPlane(MESH.BODY_FEATHER_LENGTH, MESH.BODY_FEATHER_WIDTH);
      const f = new THREE.Mesh(geo, mat);
      f.position.set(
        Math.sin(theta) * r,
        MESH.BODY_OFFSET.y + Math.cos(theta) * r,
        z,
      );
      f.rotation.x = TILT;
      f.rotation.z = -theta;
      f.castShadow = true;
      mesh.add(f);
    }
  }
}

// ─── Neck contour feathers ────────────────────────────────────────────────────

function _buildNeckFeathers(mesh, mat) {
  const ROWS = MESH.NECK_FEATHER_ROWS;
  const PER  = MESH.NECK_FEATHER_PER_ROW;
  const TILT = MESH.NECK_FEATHER_TILT;

  const frame = new THREE.Group();
  frame.position.set(MESH.NECK_OFFSET.x, MESH.NECK_OFFSET.y, MESH.NECK_OFFSET.z);
  frame.rotation.x = -0.62;
  mesh.add(frame);

  const geo = new THREE.PlaneGeometry(MESH.NECK_FEATHER_WIDTH, MESH.NECK_FEATHER_LENGTH, 1, 1);
  geo.translate(0, -MESH.NECK_FEATHER_LENGTH / 2, 0);
  const r = 0.36;

  for (let row = 0; row < ROWS; row++) {
    const t   = row / (ROWS - 1);
    const y   = 0.30 - t * 0.60;
    const off = (row % 2) * (Math.PI / PER);
    for (let i = 0; i < PER; i++) {
      const theta = off + (i / PER) * Math.PI * 2;
      const f = new THREE.Mesh(geo, mat);
      f.position.set(Math.sin(theta) * r, y, Math.cos(theta) * r);
      f.rotation.x = -TILT;
      f.rotation.y = theta;
      frame.add(f);
    }
  }
}

// ─── Head contour feathers ────────────────────────────────────────────────────

function _buildHeadFeathers(mesh, mat) {
  const ROWS = MESH.HEAD_FEATHER_ROWS;
  const PER  = MESH.HEAD_FEATHER_PER_ROW;
  const TILT = MESH.HEAD_FEATHER_TILT;

  const frame = new THREE.Group();
  frame.position.set(MESH.HEAD_OFFSET.x, MESH.HEAD_OFFSET.y, MESH.HEAD_OFFSET.z);
  mesh.add(frame);

  const r = 0.32;

  for (let row = 0; row < ROWS; row++) {
    const t   = row / (ROWS - 1);
    const z   = 0.10 - t * 0.26;
    const off = (row % 2) * (Math.PI / PER);
    for (let i = 0; i < PER; i++) {
      const theta = off + (i / PER) * Math.PI * 2;
      const geo = _featherPlane(MESH.HEAD_FEATHER_LENGTH, MESH.HEAD_FEATHER_WIDTH);
      const f = new THREE.Mesh(geo, mat);
      f.position.set(Math.sin(theta) * r, Math.cos(theta) * r, z);
      f.rotation.x = TILT;
      f.rotation.z = -theta;
      frame.add(f);
    }
  }
}

// ─── Tail body feathers ───────────────────────────────────────────────────────

function _buildTailBodyFeathers(tailGroup, mat) {
  const ROWS = MESH.TAIL_BODY_FEATHER_ROWS;
  const PER  = MESH.TAIL_BODY_FEATHER_PER_ROW;
  const TILT = MESH.BODY_FEATHER_TILT;

  for (let row = 0; row < ROWS; row++) {
    const t   = row / (ROWS - 1);
    const z   = -t * 2.40;
    const r   = 0.26 - t * 0.10;
    const len = MESH.TAIL_BODY_FEATHER_LEN_BASE + t * (MESH.TAIL_BODY_FEATHER_LEN_TIP - MESH.TAIL_BODY_FEATHER_LEN_BASE);
    const wid = MESH.TAIL_BODY_FEATHER_WIDTH_BASE + t * (MESH.TAIL_BODY_FEATHER_WIDTH_TIP - MESH.TAIL_BODY_FEATHER_WIDTH_BASE);
    const off = (row % 2) * (Math.PI / PER);

    for (let i = 0; i < PER; i++) {
      const theta = off + (i / PER) * Math.PI * 2;
      const geo = _featherPlane(len, wid);
      const f = new THREE.Mesh(geo, mat);
      f.position.set(Math.sin(theta) * r, Math.cos(theta) * r, z);
      f.rotation.x = TILT;
      f.rotation.z = -theta;
      tailGroup.add(f);
    }
  }
}

// ─── Tail upper-covert feathers ───────────────────────────────────────────────

function _buildTailCoverts(tailGroup, mat) {
  const ROWS  = MESH.TAIL_COVERT_ROWS;
  const PER   = MESH.TAIL_COVERT_PER_ROW;

  for (let row = 0; row < ROWS; row++) {
    const t     = row / (ROWS - 1);
    const scale = 0.5 + t * 0.5;
    const yOff  = 0.04 + row * 0.03;
    const zStart = -t * 0.30;

    for (let i = 0; i < PER; i++) {
      const fanAngle = (i - (PER - 1) / 2) * (MESH.TAIL_FEATHER_ANGLE_RANGE * 0.9);
      const geo = new THREE.PlaneGeometry(MESH.TAIL_COVERT_WIDTH, MESH.TAIL_COVERT_LENGTH * scale, 1, 1);
      geo.translate(0, -(MESH.TAIL_COVERT_LENGTH * scale) / 2, 0);
      const f = new THREE.Mesh(geo, mat);
      f.rotation.set(Math.PI / 2, fanAngle, 0);
      f.position.set(0, yOff, zStart);
      tailGroup.add(f);
    }
  }
}

// ─── Tail ─────────────────────────────────────────────────────────────────────

function _buildTail(mesh, tailMat) {
  const tailGroup = new THREE.Group();
  tailGroup.position.set(MESH.TAIL_GROUP_OFFSET.x, MESH.TAIL_GROUP_OFFSET.y, MESH.TAIL_GROUP_OFFSET.z);

  const count = MESH.TAIL_FEATHER_COUNT;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(MESH.TAIL_FEATHER_WIDTH, MESH.TAIL_FEATHER_LENGTH, 1, 2);
    geo.translate(0, -MESH.TAIL_FEATHER_LENGTH / 2, 0);
    const feather = new THREE.Mesh(geo, tailMat);
    const fanAngle = (i - (count - 1) / 2) * MESH.TAIL_FEATHER_ANGLE_RANGE;
    feather.rotation.set(Math.PI / 2, fanAngle, 0);
    tailGroup.add(feather);
  }

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
      talon.rotation.z  = (i - 1) * MESH.TALON_ROTATION_SPREAD;
      talon.position.y  = -i * MESH.TALON_Y_OFFSET;
      talon.castShadow  = true;
      footGroup.add(talon);
    }
    mesh.add(footGroup);
  }
}
