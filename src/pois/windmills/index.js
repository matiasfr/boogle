// Windmill farm: three rustic wooden windmills whose sails turn with the shared clock (everyone sees the same sails),
// plus hay bales and a fence along the track. The sails are solid: they bonk players and bat the ball about.
import * as THREE from 'three';
import { groundHeight } from '../../adapters/terrain.js';
import { scene } from '../../render/scene.js';
import { groundMat, GROUP, NOT_SCENERY } from '../../physics/physics.ts';
import { createBody, addBody, onPreStep, BODY } from '../../physics/engine.ts';
import { addPart, mergeParts } from '../../render/props.js';
import { onStart, onFrame } from '../../loop.ts';
import { siteFrame } from '../../island/stamps.js';
import { mulberry32 } from '../../math.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import site, { MILLS, TRACK } from './site.js';
import { freezeStatic } from '../../render/instances.ts';

const TOWER_H = 7.2;
const R_BOTTOM = 2.5,
  R_TOP = 1.6;
const PLINTH_H = 0.9;
const HUB_UP = PLINTH_H + TOWER_H + 1.1; // hub height above the mill's ground
const SAIL_LEN = 7.2;
const SPIN = 0.55; // rad/s

const frame = siteFrame(site);
const mills = []; // { rotor, body, base, axis, phase }

const m = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  s = new THREE.Vector3();
const box = new THREE.BoxGeometry(1, 1, 1);
const put = (parts, geo, x, y, z, sx, sy, sz, color, rot) => {
  q.setFromEuler(rot ?? new THREE.Euler());
  m.compose(new THREE.Vector3(x, y, z), q, s.set(sx, sy, sz));
  addPart(parts, geo, m, color);
};

// One mill's static body (local frame: origin at its foot, sails towards local -z).
function millBody(parts) {
  put(
    parts,
    new THREE.CylinderGeometry(R_BOTTOM + 0.35, R_BOTTOM + 0.5, 1, 8),
    0,
    PLINTH_H / 2,
    0,
    1,
    PLINTH_H,
    1,
    '#9b958a',
  );
  // Weatherboarding: alternating bands.
  const bands = 6;
  for (let k = 0; k < bands; k++) {
    const t0 = k / bands,
      t1 = (k + 1) / bands;
    const r0 = R_BOTTOM + (R_TOP - R_BOTTOM) * t0,
      r1 = R_BOTTOM + (R_TOP - R_BOTTOM) * t1;
    const g = new THREE.CylinderGeometry(r1, r0, 1, 8);
    put(parts, g, 0, PLINTH_H + TOWER_H * (t0 + t1) * 0.5, 0, 1, TOWER_H / bands, 1, k % 2 ? '#8d6a45' : '#9a774f');
  }
  // Cap: a thatched dome, and the windshaft's housing.
  put(
    parts,
    new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    0,
    PLINTH_H + TOWER_H,
    0,
    R_TOP + 0.45,
    1.9,
    R_TOP + 0.75,
    '#b88e52',
  );
  put(parts, box, 0, HUB_UP, -1.3, 0.7, 0.7, 1.6, '#6f5034');
  // Door, windows, a little balcony rail.
  put(parts, box, 0, PLINTH_H + 1.05, -R_BOTTOM + 0.05, 1.05, 1.9, 0.2, '#5c3f26');
  put(parts, box, 0, PLINTH_H + 1.05, -R_BOTTOM - 0.02, 1.25, 2.1, 0.1, '#e9dcc0');
  for (const [y, ang] of [
    [PLINTH_H + 3.6, 0.5],
    [PLINTH_H + 5.4, -0.9],
  ]) {
    const r = R_BOTTOM + (R_TOP - R_BOTTOM) * ((y - PLINTH_H) / TOWER_H) - 0.05;
    put(parts, box, Math.sin(ang) * r, y, -Math.cos(ang) * r, 0.55, 0.7, 0.15, '#3b2a1c', new THREE.Euler(0, -ang, 0));
  }
}

// The rotor: four lattice sails with canvas on the leading side. Local frame: hub at the origin, sails in the xy plane.
function rotorParts() {
  const parts = [];
  put(
    parts,
    new THREE.CylinderGeometry(0.42, 0.42, 0.5, 10),
    0,
    0,
    0,
    1,
    1,
    1,
    '#4d3622',
    new THREE.Euler(Math.PI / 2, 0, 0),
  );
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const rot = new THREE.Euler(0, 0, a);
    const along = (d, w) => [Math.cos(a) * d - Math.sin(a) * w, Math.sin(a) * d + Math.cos(a) * w];
    const [cx, cy] = along(SAIL_LEN / 2, 0);
    put(parts, box, cx, cy, 0, SAIL_LEN, 0.2, 0.2, '#6b4c30', rot); // whip
    for (const w of [-0.75, 0.75]) {
      const [rx, ry] = along(SAIL_LEN * 0.6, w);
      put(parts, box, rx, ry, -0.05, SAIL_LEN * 0.78, 0.08, 0.08, '#7d5a39', rot); // side rails
    }
    for (let b = 0; b < 7; b++) {
      const d = SAIL_LEN * 0.24 + b * SAIL_LEN * 0.12;
      const [bx, by] = along(d, 0);
      put(parts, box, bx, by, -0.05, 0.07, 1.6, 0.07, '#7d5a39', rot); // bars
    }
    const [sx, sy] = along(SAIL_LEN * 0.62, 0.28);
    put(parts, box, sx, sy, -0.1, SAIL_LEN * 0.72, 0.95, 0.03, '#efe4c9', rot); // canvas
  }
  return mergeParts(parts);
}

function build() {
  const staticParts = [];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  const rotorGeo = rotorParts();
  const fwd = new THREE.Vector3(frame.fx, 0, frame.fz);
  const yaw = Math.atan2(-frame.fx, -frame.fz); // local -z (sail side) faces the site's forward

  MILLS.forEach((p, k) => {
    const [x, z] = frame.toWorld(p.x, p.z);
    const y = groundHeight(x, z) - 0.15;
    // Static parts, merged across all mills (one draw call).
    const local = [];
    millBody(local);
    const mm = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    for (const g of local) staticParts.push(g.applyMatrix4(mm));

    // Rotor in front of the cap.
    const hub = new THREE.Vector3(x, y + HUB_UP, z).addScaledVector(fwd, 2.25);
    const rotor = new THREE.Mesh(rotorGeo, mat);
    rotor.position.copy(hub);
    rotor.castShadow = true;
    rotor.rotation.order = 'YXZ';
    rotor.rotation.set(0.08, yaw, 0); // tipped back a little, like real sails
    scene.add(rotor);

    // Colliders: the tower (static) and the four sails (kinematic, spun to match the mesh every step).
    addBody(
      createBody({
        material: groundMat,
        group: GROUP.SCENERY,
        position: { x, y: y + (TOWER_H + PLINTH_H) / 2, z },
        shapes: [
          { kind: 'cylinder', rTop: R_TOP, rBottom: R_BOTTOM + 0.4, h: TOWER_H + PLINTH_H, segments: 8 },
          { kind: 'sphere', r: R_TOP + 0.5, offset: { x: 0, y: (TOWER_H + PLINTH_H) / 2, z: 0 } },
        ],
      }),
    );
    const body = createBody({
      type: BODY.KINEMATIC,
      material: groundMat,
      mask: NOT_SCENERY,
      position: hub,
      shapes: [0, 1, 2, 3].map((a) => {
        const ang = (a / 4) * Math.PI * 2;
        return {
          kind: 'box',
          hx: SAIL_LEN * 0.42,
          hy: 0.75,
          hz: 0.15,
          offset: { x: Math.cos(ang) * SAIL_LEN * 0.55, y: Math.sin(ang) * SAIL_LEN * 0.55, z: 0 },
          rotation: { x: 0, y: 0, z: Math.sin(ang / 2), w: Math.cos(ang / 2) },
        };
      }),
    });
    addBody(body);
    mills.push({
      rotor,
      body,
      base: rotor.quaternion.clone(), // fixed tilt + yaw; the spin is applied on top of this, never on itself
      axis: new THREE.Vector3(0, 0, -1).applyEuler(rotor.rotation),
      phase: k * 0.7,
    });
  });

  // Hay bales round the fields, a fence along the track.
  const rng = mulberry32(31);
  const bale = new THREE.CylinderGeometry(0.75, 0.75, 1.3, 10);
  for (let k = 0; k < 14; k++) {
    const lx = -25 + rng() * 50,
      lz = -22 + rng() * 44;
    if (MILLS.some((p) => Math.hypot(p.x - lx, p.z - lz) < 8)) continue;
    const [x, z] = frame.toWorld(lx, lz);
    const y = groundHeight(x, z);
    put(staticParts, bale, x, y + 0.72, z, 1, 1, 1, '#d6b35d', new THREE.Euler(Math.PI / 2, rng() * 3, 0));
    addBody(
      createBody({
        material: groundMat,
        group: GROUP.SCENERY,
        position: { x, y: y + 0.72, z },
        shapes: [{ kind: 'sphere', r: 0.78 }],
      }),
    );
  }
  // Fences either side of the track where it runs through the wheat (local z 13 to 22.5).
  const [[ax, az], [bx, bz]] = TRACK.slice(1);
  const slope = (bx - ax) / (bz - az);
  const railYaw = Math.atan2(frame.fx, frame.fz) + Math.atan2(bx - ax, bz - az);
  for (const side of [-2.1, 2.1])
    for (let d = 13; d <= 22; d += 2.25) {
      const lx = ax + (d - az) * slope + side;
      const [x, z] = frame.toWorld(lx, d);
      put(staticParts, box, x, groundHeight(x, z) + 0.45, z, 0.13, 1, 0.13, '#7b5a3a');
      if (d + 2.25 > 22) continue;
      const [x2, z2] = frame.toWorld(lx + 1.125 * slope, d + 1.125);
      for (const h of [0.45, 0.8])
        put(
          staticParts,
          box,
          x2,
          groundHeight(x2, z2) + h,
          z2,
          0.06,
          0.08,
          2.3,
          '#8f6d47',
          new THREE.Euler(0, railYaw, 0),
        );
    }

  const statics = new THREE.Mesh(mergeParts(staticParts), mat);
  statics.castShadow = statics.receiveShadow = true;
  scene.add(statics);
  freezeStatic(statics); // never moves: no per-frame matrix work

  onPreStep(spinBodies);
}

const sailAngle = (t, phase) => SPIN * t + 0.35 * Math.sin(t * 0.05 + phase) + phase;
const sailSpeed = (t, phase) => SPIN + 0.35 * 0.05 * Math.cos(t * 0.05 + phase);
const tmpQ = new THREE.Quaternion(),
  spinQ = new THREE.Quaternion(),
  zAxis = new THREE.Vector3(0, 0, 1);

function orient(mill, t, out) {
  spinQ.setFromAxisAngle(zAxis, sailAngle(t, mill.phase));
  return out.copy(mill.base).multiply(spinQ);
}

function spinBodies() {
  const t = sharedSeconds();
  for (const mill of mills) {
    orient(mill, t, tmpQ);
    mill.body.quaternion.set(tmpQ.x, tmpQ.y, tmpQ.z, tmpQ.w);
    const w = sailSpeed(t, mill.phase);
    mill.body.angularVelocity.set(mill.axis.x * -w, mill.axis.y * -w, mill.axis.z * -w);
  }
}

onStart(build);
onFrame(() => {
  if (!mills.length) return;
  const t = sharedSeconds();
  for (const mill of mills) orient(mill, t, mill.rotor.quaternion);
});
