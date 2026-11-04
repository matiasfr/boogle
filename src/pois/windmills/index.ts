// Windmill farm: three rustic wooden windmills whose sails turn with the shared clock (everyone sees the same sails),
// plus hay bales and a fence along the track. The sails are solid: they bonk players and bat the ball about.
import * as THREE from 'three';
import { groundHeight } from '../../island/terrain.ts';
import { scene } from '../../render/scene.ts';
import { groundMat, GROUP, NOT_SCENERY } from '../../physics/physics.ts';
import { createBody, addBody, onPreStep, BODY } from '../../physics/engine.ts';
import { mergeParts } from '../../render/geometry-parts.ts';
import { onStart, onFrame } from '../../loop.ts';
import { siteFrame } from '../../island/stamps.ts';
import { mulberry32 } from '../../math.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import site, { MILLS, TRACK } from './site.ts';
import { freezeStatic } from '../../render/instances.ts';
import type { Body } from '../../physics/engine.ts';

type Geos = THREE.BufferGeometry[];
type Mill = { rotor: THREE.Mesh; body: Body; base: THREE.Quaternion; axis: THREE.Vector3; phase: number };

import { TOWER_H, R_BOTTOM, R_TOP, PLINTH_H, HUB_UP, SAIL_LEN, millBody, rotorParts, put } from './model.ts';
const SPIN = 0.55; // rad/s

const frame = siteFrame(site);
const mills: Mill[] = [];
const box = new THREE.BoxGeometry(1, 1, 1);

function build() {
  const staticParts: Geos = [];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  const rotorGeo = rotorParts();
  const fwd = new THREE.Vector3(frame.fx, 0, frame.fz);
  const yaw = Math.atan2(-frame.fx, -frame.fz); // local -z (sail side) faces the site's forward

  MILLS.forEach((p, k) => {
    const [x, z] = frame.toWorld(p.x, p.z);
    const y = groundHeight(x, z) - 0.15;
    // Static parts, merged across all mills (one draw call).
    const local: Geos = [];
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
          kind: 'box' as const,
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
  const [ax, az] = TRACK[1]!,
    [bx, bz] = TRACK[2]!;
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

  onPreStep(spinBodies, { order: 70 });
}

const sailAngle = (t: number, phase: number) => SPIN * t + 0.35 * Math.sin(t * 0.05 + phase) + phase;
const sailSpeed = (t: number, phase: number) => SPIN + 0.35 * 0.05 * Math.cos(t * 0.05 + phase);
const tmpQ = new THREE.Quaternion(),
  spinQ = new THREE.Quaternion(),
  zAxis = new THREE.Vector3(0, 0, 1);

function orient(mill: Mill, t: number, out: THREE.Quaternion) {
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
