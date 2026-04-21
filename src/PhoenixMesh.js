import * as THREE from 'three';
import { MESH, COLORS, MATERIAL_PROPERTIES } from './constants.js';

/**
 * Builds the full Phoenix scene graph from pre-created textures.
 * Returns the root mesh and all animated part references needed by Player.
 */
export function createPhoenixMesh(scene, { fireTexture, glowTexture, emberTexture }) {
  const mesh = new THREE.Group();

  const bodyMatFire = new THREE.MeshStandardMaterial({
    map: fireTexture,
    color: COLORS.BODY,
    emissiveMap: glowTexture,
    emissive: COLORS.BODY_GLOW,
    ...MATERIAL_PROPERTIES.BODY_FIRE,
  });

  const bodyMatEmber = new THREE.MeshStandardMaterial({
    map: emberTexture,
    color: COLORS.EMBER_COLOR,
    emissiveMap: glowTexture,
    emissive: COLORS.EMBER_GLOW,
    ...MATERIAL_PROPERTIES.BODY_EMBER,
  });

  const tailMat = new THREE.MeshStandardMaterial({
    map: fireTexture,
    color: COLORS.TAIL,
    emissiveMap: glowTexture,
    emissive: COLORS.TAIL_GLOW,
    ...MATERIAL_PROPERTIES.TAIL_FIRE,
  });

  _buildBody(mesh, bodyMatFire, bodyMatEmber);
  const headChild = _buildHead(mesh, bodyMatFire, bodyMatEmber);
  const tailGroup = _buildTail(mesh, tailMat);
  const { wingLeft, wingRight, leftPrimaryFeathers, rightPrimaryFeathers } =
    _buildWings(mesh, bodyMatFire, bodyMatEmber);
  _buildFeet(mesh);

  mesh.position.set(0, 0, 0);
  scene.add(mesh);

  return { mesh, wingLeft, wingRight, tailGroup, headChild, leftPrimaryFeathers, rightPrimaryFeathers };
}

// ─── Body / Neck ─────────────────────────────────────────────────────────────

function _buildBody(mesh, bodyMatFire, bodyMatEmber) {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(MESH.BODY.width, MESH.BODY.height, MESH.BODY.depth),
    bodyMatFire
  );
  body.position.set(0, MESH.BODY_OFFSET.y, MESH.BODY_OFFSET.z);
  body.castShadow = true;
  mesh.add(body);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(MESH.NECK.radius, MESH.NECK.radiusTop, MESH.NECK.height, 8),
    bodyMatEmber
  );
  neck.position.set(MESH.NECK_OFFSET.x, MESH.NECK_OFFSET.y, MESH.NECK_OFFSET.z);
  neck.castShadow = true;
  mesh.add(neck);
}

// ─── Head ─────────────────────────────────────────────────────────────────────

function _buildHead(mesh, bodyMatFire, bodyMatEmber) {
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(MESH.HEAD.width, MESH.HEAD.height, MESH.HEAD.depth),
    bodyMatFire
  );
  head.position.set(MESH.HEAD_OFFSET.x, MESH.HEAD_OFFSET.y, MESH.HEAD_OFFSET.z);
  head.castShadow = true;
  mesh.add(head);

  const eyeGeo = new THREE.SphereGeometry(MESH.EYE.radius, MESH.EYE.segments, MESH.EYE.segments);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: COLORS.EYE_IRIS,
    emissive: COLORS.EYE_GLOW,
    ...MATERIAL_PROPERTIES.EYE_IRIS,
  });
  const pupilGeo = new THREE.SphereGeometry(MESH.PUPIL.radius, MESH.PUPIL.segments, MESH.PUPIL.segments);
  const pupilMat = new THREE.MeshStandardMaterial({ color: COLORS.PUPIL });

  for (const [eyeOff, pupilOff] of [
    [MESH.EYE_LEFT_OFFSET, MESH.PUPIL_LEFT_OFFSET],
    [MESH.EYE_RIGHT_OFFSET, MESH.PUPIL_RIGHT_OFFSET],
  ]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(eyeOff.x, eyeOff.y, eyeOff.z);
    eye.castShadow = true;
    head.add(eye);

    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(pupilOff.x, pupilOff.y, pupilOff.z);
    head.add(pupil);
  }

  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(MESH.BEAK.radius, MESH.BEAK.height, MESH.BEAK.segments),
    new THREE.MeshStandardMaterial({
      color: COLORS.BEAK,
      emissive: COLORS.BEAK_GLOW,
      ...MATERIAL_PROPERTIES.BEAK,
    })
  );
  beak.rotation.x = Math.PI / 2;
  beak.position.set(MESH.BEAK_OFFSET.x, MESH.BEAK_OFFSET.y, MESH.BEAK_OFFSET.z);
  beak.castShadow = true;
  head.add(beak);

  return head;
}

// ─── Wings ────────────────────────────────────────────────────────────────────

function _buildWings(mesh, bodyMatFire, bodyMatEmber) {
  const leftPrimaryFeathers = [];
  const rightPrimaryFeathers = [];

  const wingLeft = new THREE.Group();
  wingLeft.position.set(MESH.WING_LEFT_PIVOT.x, MESH.WING_LEFT_PIVOT.y, MESH.WING_LEFT_PIVOT.z);
  const wingLeftStructure = new THREE.Group();
  wingLeftStructure.position.set(MESH.WING_LEFT_MESH.x, MESH.WING_LEFT_MESH.y, MESH.WING_LEFT_MESH.z);
  _buildWingFeathers(wingLeftStructure, true, bodyMatFire, bodyMatEmber, leftPrimaryFeathers);
  wingLeft.add(wingLeftStructure);
  mesh.add(wingLeft);

  const wingRight = new THREE.Group();
  wingRight.position.set(MESH.WING_RIGHT_PIVOT.x, MESH.WING_RIGHT_PIVOT.y, MESH.WING_RIGHT_PIVOT.z);
  const wingRightStructure = new THREE.Group();
  wingRightStructure.position.set(MESH.WING_RIGHT_MESH.x, MESH.WING_RIGHT_MESH.y, MESH.WING_RIGHT_MESH.z);
  _buildWingFeathers(wingRightStructure, false, bodyMatFire, bodyMatEmber, rightPrimaryFeathers);
  wingRight.add(wingRightStructure);
  mesh.add(wingRight);

  return { wingLeft, wingRight, leftPrimaryFeathers, rightPrimaryFeathers };
}

function _featherGeo(length, width) {
  const geo = new THREE.ConeGeometry(width / 2, length, 4);
  geo.translate(0, length / 2, 0);
  return geo;
}

function _buildWingFeathers(group, isLeft, matFire, matEmber, primaryStore) {
  const dir = isLeft ? -1 : 1;

  // Primary feathers (outer, longest)
  for (let i = 0; i < MESH.WING_PRIMARY_FEATHERS; i++) {
    const feather = new THREE.Mesh(_featherGeo(MESH.FEATHER_PRIMARY_LENGTH, MESH.FEATHER_PRIMARY_WIDTH), matFire);
    feather.position.set((i * 0.22) * dir, 0.1 - i * 0.015, 0.3 - i * 0.04);
    feather.rotation.set(-0.1, 0.08 * dir, (Math.PI / 2) * -dir);
    feather.castShadow = true;
    group.add(feather);
    primaryStore.push(feather);
  }

  // Secondary feathers (middle)
  for (let i = 0; i < MESH.WING_SECONDARY_FEATHERS; i++) {
    const feather = new THREE.Mesh(_featherGeo(MESH.FEATHER_SECONDARY_LENGTH, MESH.FEATHER_SECONDARY_WIDTH), matEmber);
    feather.position.set((i * 0.12) * dir, -0.1 - i * 0.01, -i * 0.03);
    feather.rotation.set(-0.05, 0.05 * dir, (Math.PI / 2) * -dir);
    feather.castShadow = true;
    group.add(feather);
  }

  // Covert feathers (base, two rows)
  for (let i = 0; i < MESH.WING_COVERT_FEATHERS; i++) {
    const row = Math.floor(i / 10);
    const col = i % 10;
    const feather = new THREE.Mesh(_featherGeo(MESH.FEATHER_COVERT_LENGTH, MESH.FEATHER_COVERT_WIDTH), matFire);
    feather.position.set((col * 0.14) * dir, -0.15 - row * 0.06, -0.05 + row * 0.08);
    feather.rotation.set(0, 0.02 * dir, (Math.PI / 2) * -dir);
    feather.castShadow = true;
    group.add(feather);
  }
}

// ─── Tail ─────────────────────────────────────────────────────────────────────

function _buildTail(mesh, tailMat) {
  const tailGroup = new THREE.Group();
  tailGroup.position.set(MESH.TAIL_GROUP_OFFSET.x, MESH.TAIL_GROUP_OFFSET.y, MESH.TAIL_GROUP_OFFSET.z);

  for (let i = 0; i < MESH.TAIL_FEATHER_COUNT; i++) {
    const feather = new THREE.Mesh(
      new THREE.BoxGeometry(MESH.TAIL_FEATHER.width, MESH.TAIL_FEATHER.height, MESH.TAIL_FEATHER.depth),
      tailMat
    );
    feather.rotation.z = (i - (MESH.TAIL_FEATHER_COUNT - 1) / 2) * MESH.TAIL_FEATHER_ANGLE_RANGE;
    feather.position.y = i * MESH.TAIL_FEATHER_SPREAD - (MESH.TAIL_FEATHER_COUNT - 1) * MESH.TAIL_FEATHER_SPREAD / 2;
    feather.castShadow = true;
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
      talon.rotation.z = (i - 1) * MESH.TALON_ROTATION_SPREAD;
      talon.position.y = -i * MESH.TALON_Y_OFFSET;
      talon.castShadow = true;
      footGroup.add(talon);
    }
    mesh.add(footGroup);
  }
}
