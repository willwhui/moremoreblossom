import * as THREE from 'three';
import { MESH, COLORS, MATERIAL_PROPERTIES } from './constants.js';

export function createPhoenixMesh(scene, { fireTexture, glowTexture, emberTexture, featherAlphaTexture }) {
  const mesh = new THREE.Group();

  // ─── Solid body materials ────────────────────────────────────────────────────
  const bodyMatFire = new THREE.MeshStandardMaterial({
    map: fireTexture, color: COLORS.BODY,
    emissiveMap: glowTexture, emissive: COLORS.BODY_GLOW,
    ...MATERIAL_PROPERTIES.BODY_FIRE,
  });

  const bodyMatEmber = new THREE.MeshStandardMaterial({
    map: emberTexture, color: COLORS.EMBER_COLOR,
    emissiveMap: glowTexture, emissive: COLORS.EMBER_GLOW,
    ...MATERIAL_PROPERTIES.BODY_EMBER,
  });

  // ─── Feather materials: alphaMap gives pointed-oval silhouette ───────────────
  // DoubleSide renders both faces; alphaTest clips outside the feather vane.
  const F = { alphaMap: featherAlphaTexture, alphaTest: 0.05, side: THREE.DoubleSide };

  const featherMatFire    = new THREE.MeshStandardMaterial({ map: fireTexture,   color: COLORS.BODY,           emissiveMap: glowTexture, emissive: COLORS.BODY_GLOW,    ...MATERIAL_PROPERTIES.BODY_FIRE,       ...F });
  const featherMatEmber   = new THREE.MeshStandardMaterial({ map: emberTexture,  color: COLORS.EMBER_COLOR,    emissiveMap: glowTexture, emissive: COLORS.EMBER_GLOW,   ...MATERIAL_PROPERTIES.BODY_EMBER,      ...F });
  const featherMatCrimson = new THREE.MeshStandardMaterial({ map: fireTexture,   color: COLORS.CRIMSON_PRIMARY,emissiveMap: glowTexture, emissive: COLORS.CRIMSON_GLOW, ...MATERIAL_PROPERTIES.PRIMARY_FEATHER, ...F });
  const featherMatGold    = new THREE.MeshStandardMaterial({ map: fireTexture,   color: COLORS.TAIL,           emissiveMap: glowTexture, emissive: COLORS.TAIL_GLOW,    ...MATERIAL_PROPERTIES.CREST,           ...F });
  const featherMatRuff    = new THREE.MeshStandardMaterial({ map: emberTexture,  color: COLORS.RUFF,           emissiveMap: glowTexture, emissive: COLORS.RUFF_GLOW,    ...MATERIAL_PROPERTIES.NECK_RUFF,       ...F });

  // Wing surface membrane — semi-transparent fire plane that makes wing mass visible
  const membraneMat = new THREE.MeshStandardMaterial({
    map: fireTexture, color: new THREE.Color(0xFF5000),
    emissiveMap: glowTexture, emissive: new THREE.Color(0xFF3000),
    emissiveIntensity: 1.8,
    transparent: true, opacity: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.3, metalness: 0.1,
    depthWrite: false,
  });

  _buildBody(mesh, bodyMatFire, bodyMatEmber);
  _buildBodyFeathers(mesh, featherMatCrimson);   // crimson stands out from the orange body
  _buildNeckFeathers(mesh, featherMatRuff);      // deep orange neck
  const headChild = _buildHead(mesh, bodyMatFire, bodyMatEmber, featherMatGold);
  _buildHeadFeathers(mesh, featherMatGold);      // gold crown feathers
  _buildRuff(mesh, featherMatRuff);
  const tailGroup = _buildTail(mesh, featherMatGold);
  _buildTailBodyFeathers(tailGroup, featherMatGold);   // radial feathers cover tail body
  _buildTailCoverts(tailGroup, featherMatGold);        // gold upper coverts
  const { wingLeft, wingRight, leftPrimaryFeathers, rightPrimaryFeathers } =
    _buildWings(mesh, featherMatCrimson, featherMatEmber, featherMatFire, membraneMat);
  _buildFeet(mesh);

  mesh.position.set(0, 0, 0);
  scene.add(mesh);

  return { mesh, wingLeft, wingRight, tailGroup, headChild, leftPrimaryFeathers, rightPrimaryFeathers };
}

// ─── Body ─────────────────────────────────────────────────────────────────────
// CapsuleGeometry gives a rounded bird-like oval torso instead of a box.

function _buildBody(mesh, bodyMatFire, bodyMatEmber) {
  const bodyCap = new THREE.CapsuleGeometry(
    MESH.BODY_CAPSULE_RADIUS, MESH.BODY_CAPSULE_LENGTH, 4, 10
  );
  bodyCap.rotateX(Math.PI / 2); // lie along Z axis (forward-backward)
  const body = new THREE.Mesh(bodyCap, bodyMatFire);
  body.position.set(0, MESH.BODY_OFFSET.y, MESH.BODY_OFFSET.z);
  body.castShadow = true;
  mesh.add(body);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(MESH.NECK.radius, MESH.NECK.radiusTop, MESH.NECK.height, 8),
    bodyMatEmber
  );
  neck.position.set(MESH.NECK_OFFSET.x, MESH.NECK_OFFSET.y, MESH.NECK_OFFSET.z);
  // Tilt forward so the cylinder actually bridges the capsule body (z≈0.6) to the
  // head (z=1.0). Without this tilt the neck hangs vertically and leaves a gap.
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

  // Hooked beak — upper mandible + smaller lower for a curved raptor-like hook
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

// ─── Head crest — dramatic golden crown plumes ────────────────────────────────

function _buildCrest(head, crestMat) {
  const count = MESH.CREST_FEATHER_COUNT;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0 = front, 1 = back

    // Plane in XY, tip at +Y. Visible from front/side; animates with head.
    const geo = new THREE.PlaneGeometry(MESH.CREST_FEATHER_WIDTH, MESH.CREST_FEATHER_LENGTH, 1, 1);
    geo.translate(0, MESH.CREST_FEATHER_LENGTH / 2, 0);

    const feather = new THREE.Mesh(geo, crestMat);
    feather.position.set(
      (t - 0.5) * 0.38,        // spread across head width
      MESH.HEAD.height / 2,    // on top of head
      (t - 0.5) * 0.4,         // spread front-to-back
    );
    // Lean backward increasingly; fan out sideways
    feather.rotation.set(-0.5 - t * 0.4, 0, (t - 0.5) * 0.45);
    head.add(feather);
  }
}

// ─── Neck ruff — bold scale-like collar ──────────────────────────────────────

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

// _featherPlane: PlaneGeometry with base at local origin, tip pointing in -Z (backward),
// plane lying HORIZONTAL (normal = +Y). This makes each feather visible from the
// typical above-behind camera angle. Player.js rotation.x tilts the feather up/down
// (wing flap) and rotation.y sweeps it left/right (feather spread/splay).
function _featherPlane(length, width) {
  const geo = new THREE.PlaneGeometry(width, length, 1, 1);
  geo.translate(0, length / 2, 0); // tip at +Y
  geo.rotateX(-Math.PI / 2);       // lay flat: tip now in -Z (backward), normal in +Y (up)
  return geo;
}

function _buildWingFeathers(group, isLeft, matCrimson, matEmber, matFire, membraneMat, primaryStore) {
  const dir = isLeft ? -1 : 1;

  // Wing surface membrane — large glowing fire plane, makes wing mass visible from above.
  // Lives in XY (the wing's native flapping plane), so it tilts with every stroke.
  const memGeo = new THREE.PlaneGeometry(2.4, 1.1, 2, 2);
  memGeo.translate(1.2 * dir, -0.15, 0);
  const membrane = new THREE.Mesh(memGeo, membraneMat);
  group.add(membrane);

  // Primary feathers — crimson, horizontal, animated individually.
  // Each is a Group (animation target) containing the horizontal plane mesh.
  // Player.js sets group.rotation.x (tilt/wave) and .y (splay); both work naturally
  // for horizontal feathers seen from above.
  for (let i = 0; i < MESH.WING_PRIMARY_FEATHERS; i++) {
    const pivot = new THREE.Group();
    pivot.position.set((i * 0.22) * dir, 0.1 - i * 0.015, 0.3 - i * 0.04);

    const featherMesh = new THREE.Mesh(_featherPlane(MESH.FEATHER_PRIMARY_LENGTH, MESH.FEATHER_PRIMARY_WIDTH), matCrimson);
    // Rotate the feather tip to point OUTWARD along the wing (±X direction).
    // _featherPlane tip is in -Z; Ry(+π/2) maps -Z→-X (outward for left wing, dir=-1).
    // Ry(-π/2) maps -Z→+X (outward for right wing, dir=+1). So: Ry(-(π/2)*dir).
    featherMesh.rotation.y = -(Math.PI / 2) * dir;
    pivot.add(featherMesh);
    group.add(pivot);
    primaryStore.push(pivot); // Player.js animates the pivot group
  }

  // Secondary feathers — ember orange, static (no individual animation)
  for (let i = 0; i < MESH.WING_SECONDARY_FEATHERS; i++) {
    const feather = new THREE.Mesh(_featherPlane(MESH.FEATHER_SECONDARY_LENGTH, MESH.FEATHER_SECONDARY_WIDTH), matEmber);
    feather.position.set((i * 0.12) * dir, -0.1 - i * 0.01, -i * 0.03);
    // Tip outward + natural 10° droop downward
    feather.rotation.set(-0.18, (Math.PI / 2) * dir, 0);
    group.add(feather);
  }

  // Covert feathers — orange fire, two overlapping rows at wing base
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
// Each feather base sits on the body surface. rotation.x = TILT lifts the tip
// away from the surface; rotation.z = -theta fans it radially around the body's
// Z axis. Euler XYZ applies X first then Z, so the tilt is correctly radialised.

function _buildBodyFeathers(mesh, mat) {
  const ROWS = MESH.BODY_FEATHER_ROWS;
  const PER  = MESH.BODY_FEATHER_PER_ROW;
  const TILT = MESH.BODY_FEATHER_TILT;
  const r    = MESH.BODY_CAPSULE_RADIUS + 0.02;

  for (let row = 0; row < ROWS; row++) {
    const t   = row / (ROWS - 1);
    // Extend from front hemisphere (z≈+0.42) to back hemisphere (z≈-0.90)
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
// Same tilt+radial approach inside a Group that matches the neck's transform,
// so feathers wrap the cylinder in neck-local space (cylinder runs along local Y).

function _buildNeckFeathers(mesh, mat) {
  const ROWS = MESH.NECK_FEATHER_ROWS;
  const PER  = MESH.NECK_FEATHER_PER_ROW;
  const TILT = MESH.NECK_FEATHER_TILT;

  const frame = new THREE.Group();
  frame.position.set(MESH.NECK_OFFSET.x, MESH.NECK_OFFSET.y, MESH.NECK_OFFSET.z);
  frame.rotation.x = -0.62;
  mesh.add(frame);

  // "Hanging" plane: base at y=0, tip at y=-length (tip points toward body end of neck).
  // rotation.y=theta fans each feather outward radially around the Y cylinder axis.
  // rotation.x=-TILT leans the face outward so it's visible (Euler XYZ: X applied first).
  // Geometry is shared; only mesh transform differs per feather.
  const geo = new THREE.PlaneGeometry(MESH.NECK_FEATHER_WIDTH, MESH.NECK_FEATHER_LENGTH, 1, 1);
  geo.translate(0, -MESH.NECK_FEATHER_LENGTH / 2, 0); // base at origin, tip hangs to -Y
  const r = 0.36;

  for (let row = 0; row < ROWS; row++) {
    const t   = row / (ROWS - 1);
    const y   = 0.30 - t * 0.60; // head end (+Y) down to body end (-Y) in neck-local space
    const off = (row % 2) * (Math.PI / PER);
    for (let i = 0; i < PER; i++) {
      const theta = off + (i / PER) * Math.PI * 2;
      const f = new THREE.Mesh(geo, mat);
      f.position.set(Math.sin(theta) * r, y, Math.cos(theta) * r);
      f.rotation.x = -TILT; // lean face outward from neck surface
      f.rotation.y = theta;  // face outward radially
      frame.add(f);
    }
  }
}

// ─── Head contour feathers ────────────────────────────────────────────────────
// Frame at the head position; feathers fan around the head's Z axis (forward
// direction) and flow toward -Z (toward neck). Tilt lifts tips off the surface.

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
// Identical radial technique as _buildHeadFeathers: rows of tilted _featherPlane
// meshes fanned around the tail's Z axis. Feathers taper in size toward the tip.
// Lives inside tailGroup so it inherits the tail's world position automatically.

function _buildTailBodyFeathers(tailGroup, mat) {
  const ROWS = MESH.TAIL_BODY_FEATHER_ROWS;
  const PER  = MESH.TAIL_BODY_FEATHER_PER_ROW;
  const TILT = MESH.BODY_FEATHER_TILT;

  for (let row = 0; row < ROWS; row++) {
    const t   = row / (ROWS - 1);
    const z   = -t * 2.40;               // base (z=0) → 2.4 units along tail
    const r   = 0.26 - t * 0.10;        // taper radius: 0.26 → 0.16
    const len = 0.65 - t * 0.20;        // taper length: 0.65 → 0.45
    const wid = 0.32 - t * 0.10;        // taper width:  0.32 → 0.22
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
// Shorter feathers layered on top of the main tail fan, covering the tail base.
// Called with the already-built tailGroup so coverts inherit its position/rotation.

function _buildTailCoverts(tailGroup, mat) {
  const ROWS = MESH.TAIL_COVERT_ROWS;
  const PER  = MESH.TAIL_COVERT_PER_ROW;
  const count = MESH.TAIL_FEATHER_COUNT;

  for (let row = 0; row < ROWS; row++) {
    const t = row / (ROWS - 1);
    // Coverts sit above the fan and get shorter toward the body end
    const scale  = 0.5 + t * 0.5;           // 50%→100% of covert length
    const yOff   = 0.04 + row * 0.03;       // slightly above previous row
    const zStart = -t * 0.30;               // stagger rows back along tail

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
// Long horizontal fan of gold feathers. Each lies flat (normal = +Y) and fans
// left/right in the XZ plane — clearly visible from the behind-above camera.

function _buildTail(mesh, tailMat) {
  const tailGroup = new THREE.Group();
  tailGroup.position.set(MESH.TAIL_GROUP_OFFSET.x, MESH.TAIL_GROUP_OFFSET.y, MESH.TAIL_GROUP_OFFSET.z);

  const count = MESH.TAIL_FEATHER_COUNT;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(MESH.TAIL_FEATHER_WIDTH, MESH.TAIL_FEATHER_LENGTH, 1, 2);
    geo.translate(0, -MESH.TAIL_FEATHER_LENGTH / 2, 0);  // base at origin, tip in -Y
    // rotation.x = π/2 maps -Y → -Z (tip points backward)
    // rotation.y = fanAngle fans the feathers left/right in the horizontal plane
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
