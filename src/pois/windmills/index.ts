// Windmill farm: three rustic wooden windmills whose sails turn with the shared clock (everyone sees the same sails),
// plus hay bales and a fence along the track. The sails are solid: they bonk players and bat the ball about.
//
// Every thing is a record (content/prefabs/pois.ts). The mills stand where content/levels/pois.ts puts them in the
// farm's frame, on the ground there; their rotors sit in front of the caps. The bales are a seeded scatter and the
// fence follows the cart track (site.ts), so their placements are worked out here. All of it stands under one owner;
// the static pieces merge into one draw.
import * as THREE from 'three';
import { groundHeight } from '../../island/terrain.ts';
import { NOT_SCENERY, groundMat } from '../../physics/physics.ts';
import { createBody, BODY } from '../../physics/engine.ts';
import { addPart, mergeParts } from '../../render/geometry-parts.ts';
import { onStart } from '../../loop.ts';
import { siteFrame } from '../../island/stamps.ts';
import { mulberry32 } from '../../math.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { windmillKit } from '../../prefab/builders/poi-windmills.ts';
import level from '../../../content/built/levels/windmills.json' with { type: 'json' };
import { standHut } from './hut.ts';
import site, { MILLS, TRACK } from './site.ts';
import { HUB_UP, SAIL_LEN } from './model.ts';
import { sailAngle, sailSpeed } from './motion.ts';
import type { Body } from '../../physics/engine.ts';
import type { Placement } from '../../prefab/types.ts';

type Mill = { rotor: THREE.Object3D; body: Body; base: THREE.Quaternion; axis: THREE.Vector3; phase: number };

const frame = siteFrame(site);
const BALES = { seed: 31, count: 14 };
defineKind('windmills', { fixedPre: 70, update: 0 });

/** The mills, stood on the ground in the world, and a rotor in front of each cap. */
function millPlacements() {
  const fwd = new THREE.Vector3(frame.fx, 0, frame.fz);
  const yaw = Math.atan2(-frame.fx, -frame.fz); // local -z (sail side) faces the site's forward
  return loadLevelArtifact(level, definitions).placements.map((p) => {
    const [x, z] = frame.toWorld(p.pos[0], p.pos[2]);
    const y = groundHeight(x, z) + p.pos[1];
    const hub = new THREE.Vector3(x, y + HUB_UP, z).addScaledVector(fwd, 2.25);
    const mill: Placement = { ...p, pos: [x, y, z], params: { yaw } };
    // Tipped back a little, like real sails.
    const rotor: Placement = {
      id: `${p.id}/rotor`,
      prefab: 'poi.windmill-rotor',
      pos: [hub.x, hub.y, hub.z],
      rot: [yaw, 0.08, 0],
    };
    return { mill, rotor };
  });
}

/** Hay bales round the fields (seeded), a fence either side of the track where it runs through the wheat. */
function farmPlacements() {
  const out: Placement[] = [];
  const rng = mulberry32(BALES.seed);
  for (let k = 0; k < BALES.count; k++) {
    const lx = -25 + rng() * 50,
      lz = -22 + rng() * 44;
    if (MILLS.some((p) => Math.hypot(p.x - lx, p.z - lz) < 8)) continue;
    const [x, z] = frame.toWorld(lx, lz);
    const y = groundHeight(x, z);
    out.push({ id: `bale${k}`, prefab: 'poi.hay-bale', pos: [x, y + 0.72, z], params: { spin: rng() * 3 } });
  }
  // Local z 13 to 22.5.
  const [ax, az] = TRACK[1]!,
    [bx, bz] = TRACK[2]!;
  const slope = (bx - ax) / (bz - az);
  const railYaw = Math.atan2(frame.fx, frame.fz) + Math.atan2(bx - ax, bz - az);
  for (const side of [-2.1, 2.1])
    for (let d = 13; d <= 22; d += 2.25) {
      const lx = ax + (d - az) * slope + side;
      const [x, z] = frame.toWorld(lx, d);
      out.push({ id: `post${out.length}`, prefab: 'poi.fence-post', pos: [x, groundHeight(x, z) + 0.45, z] });
      if (d + 2.25 > 22) continue;
      const [x2, z2] = frame.toWorld(lx + 1.125 * slope, d + 1.125);
      for (const h of [0.45, 0.8])
        out.push({
          id: `rail${out.length}`,
          prefab: 'poi.fence-rail',
          pos: [x2, groundHeight(x2, z2) + h, z2],
          rot: [railYaw, 0, 0],
        });
    }
  return out;
}

function build() {
  const owner = createOwnedView();
  const kit = windmillKit();
  const staticParts: THREE.BufferGeometry[] = [];
  const stand = (p: Placement) => {
    const thing = instantiate(p.prefab, p, { owner, still: true });
    thing.setEnabled(true);
    for (const piece of thing.pieces) addPart(staticParts, piece.geometry, piece.matrix, piece.color);
  };
  const mills: Mill[] = [];
  millPlacements().forEach(({ mill, rotor: at }, k) => {
    stand(mill);
    const turning = instantiate(at.prefab, at, { owner });
    turning.setEnabled(true);
    const rotor = turning.root;
    // The four sails: kinematic, spun to match the mesh every step.
    const body = owner.addBody(
      createBody({
        type: BODY.KINEMATIC,
        material: groundMat,
        mask: NOT_SCENERY,
        position: rotor.position.clone(),
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
      }),
    );
    mills.push({
      rotor,
      body,
      base: rotor.quaternion.clone(), // fixed tilt + yaw; the spin is applied on top of this, never on itself
      axis: new THREE.Vector3(0, 0, -1).applyEuler(rotor.rotation),
      phase: k * 0.7,
    });
  });
  for (const p of farmPlacements()) stand(p);
  // Inside the farm's existing 32 m exclusion, beyond the fields, bales and track.
  const [hx, hz] = frame.toWorld(10, 26);
  standHut(owner, kit.material, hx, groundHeight(hx, hz), hz);

  const statics = new THREE.Mesh(mergeParts(staticParts), kit.material);
  statics.castShadow = statics.receiveShadow = true;
  owner.add(statics);
  statics.updateMatrixWorld();
  statics.matrixAutoUpdate = false; // never moves: no per-frame matrix work

  const tmpQ = new THREE.Quaternion(),
    spinQ = new THREE.Quaternion(),
    zAxis = new THREE.Vector3(0, 0, 1);
  const orient = (mill: Mill, t: number, out: THREE.Quaternion) => {
    spinQ.setFromAxisAngle(zAxis, sailAngle(t, mill.phase));
    return out.copy(mill.base).multiply(spinQ);
  };
  spawn({
    kind: 'windmills',
    mesh: owner.root,
    fixedPre() {
      const t = sharedSeconds();
      for (const mill of mills) {
        orient(mill, t, tmpQ);
        mill.body.quaternion.set(tmpQ.x, tmpQ.y, tmpQ.z, tmpQ.w);
        const w = sailSpeed(t, mill.phase);
        mill.body.angularVelocity.set(mill.axis.x * -w, mill.axis.y * -w, mill.axis.z * -w);
      }
    },
    update() {
      const t = sharedSeconds();
      for (const mill of mills) orient(mill, t, mill.rotor.quaternion);
    },
    dispose: () => owner.dispose(),
  });
}

onStart(build);
