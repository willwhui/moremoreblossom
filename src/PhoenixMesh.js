import * as THREE from 'three';
import { MESH, COLORS, MATERIAL_PROPERTIES } from './constants.js';

export function createPhoenixMesh(scene, { fireTexture, glowTexture, emberTexture, featherAlphaTexture }) {
  const mesh = new THREE.Group();

  // ─── Solid body materials (no alpha — used on BoxGeometry / CylinderGeometry) ──
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

  // ─── Feather materials (PlaneGeometry + alphaMap for realistic feather shape) ──
  // Shared properties applied to all feather materials.
  const F = {
    alphaMap: featherAlphaTexture,
    alphaTest: 0.05,
    side: THREE.DoubleSide,
  };

  // Covert & body feathers — orange fire
  const featherMatFire = new THREE.MeshStandardMaterial({
    map: fireTexture, color: COLORS.BODY,
    emissiveMap: glowTexture, emissive: COLORS.BODY_GLOW,
    ...MATERIAL_PROPERTIES.BODY_FIRE, ...F,
  });

  // Secondary feathers — ember orange
  const featherMatEmber = new THREE.MeshStandardMaterial({
    map: emberTexture, color: COLORS.EMBER_COLOR,
    emissiveMap: glowTexture, emissive: COLORS.EMBER_GLOW,
    ...MATERIAL_PROPERTIES.BODY_EMBER, ...F,
  });

  // Primary feathers — deep crimson (golden pheasant / phoenix lore: "purple body")
  const featherMatCrimson = new THREE.MeshStandardMaterial({
    map: fireTexture, color: COLORS.CRIMSON_PRIMARY,
    emissiveMap: glowTexture, emissive: COLORS.CRIMSON_GLOW,
    ...MATERIAL_PROPERTIES.PRIMARY_FEATHER, ...F,
  });

  // Tail + crest feathers — gold
  const featherMatGold = new THREE.MeshStandardMaterial({
    map: fireTexture, color: COLORS.TAIL,
    emissiveMap: glowTexture, emissive: COLORS.TAIL_GLOW,
    ...MATERIAL_PROPERTIES.CREST, ...F,
  });

  // Neck ruff — deep orange collar
  const featherMatRuff = new THREE.MeshStandardMaterial({
    map: emberTexture, color: COLORS.RUFF,
    emissiveMap: glowTexture, emissive: COLORS.RUFF_GLOW,
    ...MATERIAL_PROPERTIES.NECK_RUFF, ...F,
  });

  _buildBody(mesh, bodyMatFire, bodyMatEmber);
  const headChild = _buildHead(mesh, bodyMatFire, bodyMatEmber, featherMatGold);
  _buildRuff(mesh, featherMatRuff);
  const tailGroup = _buildTail(mesh, featherMatGold);
  const { wingLeft, wingRight, leftPrimaryFeathers, rightPrimaryFeathers } =
    _buildWings(mesh, featherMatCrimson, featherMatEmber, featherMatFire);
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

function _buildHead(mesh, bodyMatFire, bodyMatEmber, crestMat) {
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
    head.add(eye);

    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(pupilOff.x, pupilOff.y, pupilOff.z);
    head.add(pupil);
  }

  // Hooked beak — upper mandible (main cone) + small lower tip for a curved look
  const beakMat = new THREE.MeshStandardMaterial({
    color: COLORS.BEAK,
    emissive: COLORS.BEAK_GLOW,
    ...MATERIAL_PROPERTIES.BEAK,
  });
  const upperBeak = new THREE.Mesh(
    new THREE.ConeGeometry(MESH.BEAK.radius, MESH.BEAK.height, MESH.BEAK.segments),
    beakMat
  );
  upperBeak.rotation.x = Math.PI / 2;
  upperBeak.position.set(MESH.BEAK_OFFSET.x, MESH.BEAK_OFFSET.y + 0.05, MESH.BEAK_OFFSET.z);
  head.add(upperBeak);

  // Lower mandible — smaller, angled slightly down for hooked silhouette
  const lowerBeak = new THREE.Mesh(
    new THREE.ConeGeometry(MESH.BEAK.radius * 0.7, MESH.BEAK.height * 0.7, MESH.BEAK.segments),
    beakMat
  );
  lowerBeak.rotation.x = Math.PI / 2 + 0.25;
  lowerBeak.position.set(MESH.BEAK_OFFSET.x, MESH.BEAK_OFFSET.y - 0.07, MESH.BEAK_OFFSET.z + 0.05);
  head.add(lowerBeak);

  _buildCrest(head, crestMat);

  return head;
}

// ─── Head crest — golden plumes (golden pheasant style) ──────────────────────

function _buildCrest(head, crestMat) {
  const count = MESH.CREST_FEATHER_COUNT;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0 → front, 1 → back
    const geo = new THREE.PlaneGeometry(MESH.CREST_FEATHER_WIDTH, MESH.CREST_FEATHER_LENGTH, 1, 1);
    geo.translate(0, MESH.CREST_FEATHER_LENGTH / 2, 0);

    const feather = new THREE.Mesh(geo, crestMat);
    feather.position.set(
      (t - 0.5) * 0.25,         // slight X spread across head width
      MESH.HEAD.height / 2,     // sit on top of head
      (t - 0.5) * 0.35,         // spread front-to-back
    );
    // Lean backward (more so for back feathers) with slight sideways fan
    feather.rotation.set(-0.45 - t * 0.3, 0, (t - 0.5) * 0.28);
    head.add(feather);
  }
}

// ─── Neck ruff — scale-like collar around neck base ──────────────────────────

function _buildRuff(mesh, ruffMat) {
  const count = MESH.NECK_RUFF_COUNT;
  const centerY = MESH.NECK_OFFSET.y - 0.18;
  const centerZ = MESH.NECK_OFFSET.z;
  const radius = 0.4;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const geo = new THREE.PlaneGeometry(MESH.NECK_RUFF_WIDTH, MESH.NECK_RUFF_LENGTH, 1, 1);
    geo.translate(0, MESH.NECK_RUFF_LENGTH / 2, 0);

    const feather = new THREE.Mesh(geo, ruffMat);
    feather.position.set(
      Math.sin(angle) * radius,
      centerY,
      Math.cos(angle) * radius + centerZ,
    );
    // rotation.y faces the feather outward; rotation.x tilts it back/outward
    feather.rotation.set(-0.5, angle, (Math.random() - 0.5) * 0.18);
    mesh.add(feather);
  }
}

// ─── Wings ────────────────────────────────────────────────────────────────────

function _buildWings(mesh, matCrimson, matEmber, matFire) {
  const leftPrimaryFeathers = [];
  const rightPrimaryFeathers = [];

  const wingLeft = new THREE.Group();
  wingLeft.position.set(MESH.WING_LEFT_PIVOT.x, MESH.WING_LEFT_PIVOT.y, MESH.WING_LEFT_PIVOT.z);
  const wingLeftStructure = new THREE.Group();
  _buildWingFeathers(wingLeftStructure, true, matCrimson, matEmber, matFire, leftPrimaryFeathers);
  wingLeft.add(wingLeftStructure);
  mesh.add(wingLeft);

  const wingRight = new THREE.Group();
  wingRight.position.set(MESH.WING_RIGHT_PIVOT.x, MESH.WING_RIGHT_PIVOT.y, MESH.WING_RIGHT_PIVOT.z);
  const wingRightStructure = new THREE.Group();
  _buildWingFeathers(wingRightStructure, false, matCrimson, matEmber, matFire, rightPrimaryFeathers);
  wingRight.add(wingRightStructure);
  mesh.add(wingRight);

  return { wingLeft, wingRight, leftPrimaryFeathers, rightPrimaryFeathers };
}

// PlaneGeometry feather: base at local origin, tip at +Y (length).
// The existing rotation.z = ±π/2 maps the +Y tip direction to ±X (outward along wing).
// alphaMap gives the pointed-oval feather silhouette.
function _featherPlane(length, width) {
  const geo = new THREE.PlaneGeometry(width, length, 1, 1);
  geo.translate(0, length / 2, 0);
  return geo;
}

function _buildWingFeathers(group, isLeft, matCrimson, matEmber, matFire, primaryStore) {
  const dir = isLeft ? -1 : 1;

  // Primary feathers — crimson, outer edge, animated during flight
  for (let i = 0; i < MESH.WING_PRIMARY_FEATHERS; i++) {
    const feather = new THREE.Mesh(_featherPlane(MESH.FEATHER_PRIMARY_LENGTH, MESH.FEATHER_PRIMARY_WIDTH), matCrimson);
    feather.position.set((i * 0.22) * dir, 0.1 - i * 0.015, 0.3 - i * 0.04);
    feather.rotation.set(-0.1, 0.08 * dir, (Math.PI / 2) * -dir);
    group.add(feather);
    primaryStore.push(feather);
  }

  // Secondary feathers — ember orange, middle of wing
  for (let i = 0; i < MESH.WING_SECONDARY_FEATHERS; i++) {
    const feather = new THREE.Mesh(_featherPlane(MESH.FEATHER_SECONDARY_LENGTH, MESH.FEATHER_SECONDARY_WIDTH), matEmber);
    feather.position.set((i * 0.12) * dir, -0.1 - i * 0.01, -i * 0.03);
    feather.rotation.set(-0.05, 0.05 * dir, (Math.PI / 2) * -dir);
    group.add(feather);
  }

  // Covert feathers — orange fire, base of wing in two overlapping rows
  for (let i = 0; i < MESH.WING_COVERT_FEATHERS; i++) {
    const row = Math.floor(i / 10);
    const col = i % 10;
    const feather = new THREE.Mesh(_featherPlane(MESH.FEATHER_COVERT_LENGTH, MESH.FEATHER_COVERT_WIDTH), matFire);
    feather.position.set((col * 0.14) * dir, -0.15 - row * 0.06, -0.05 + row * 0.08);
    feather.rotation.set(0, 0.02 * dir, (Math.PI / 2) * -dir);
    group.add(feather);
  }
}

// ─── Tail ─────────────────────────────────────────────────────────────────────
// Long horizontal fan of gold feathers extending backward — like a golden pheasant's tail
// (tail is ~2/3 of total body length in reference birds).

function _buildTail(mesh, tailMat) {
  const tailGroup = new THREE.Group();
  tailGroup.position.set(MESH.TAIL_GROUP_OFFSET.x, MESH.TAIL_GROUP_OFFSET.y, MESH.TAIL_GROUP_OFFSET.z);

  const count = MESH.TAIL_FEATHER_COUNT;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(MESH.TAIL_FEATHER_WIDTH, MESH.TAIL_FEATHER_LENGTH, 1, 2);
    // Translate so base is at local origin, feather tip points in -Y.
    // rotation.x = π/2 (below) converts -Y → -Z (backward in phoenix local space).
    geo.translate(0, -MESH.TAIL_FEATHER_LENGTH / 2, 0);

    const feather = new THREE.Mesh(geo, tailMat);
    const fanAngle = (i - (count - 1) / 2) * MESH.TAIL_FEATHER_ANGLE_RANGE;
    // Rx(π/2): -Y → -Z (feather lies horizontal, tip pointing backward)
    // Ry(fanAngle): fans out left/right in the horizontal plane
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
      talon.rotation.z = (i - 1) * MESH.TALON_ROTATION_SPREAD;
      talon.position.y = -i * MESH.TALON_Y_OFFSET;
      talon.castShadow = true;
      footGroup.add(talon);
    }
    mesh.add(footGroup);
  }
}
