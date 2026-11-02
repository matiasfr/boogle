// Characters for the hand-made clips (./clips.ts): &body=<look>. Clips rotate bones, so a figure with other limb lengths
// can play them. Each look rescales the library's mannequin bone by bone (uniform scales, children inherit them), thickens
// the skin along its normals, and adds simple rigid parts (a head, eyes, clothes) to bones in the rest pose. The goal is
// to compare silhouettes under the same motion, so they're quick to change and not final art. Eyes and blush, no mouth.
import * as THREE from 'three/webgpu';
import { normalLocal, positionLocal } from 'three/tsl';
import { patchNode } from '../../render/material-patch.ts';
import { shadeOnce } from '../../player/hero.ts';

export type Look = {
  bones: Record<string, number>; // uniform scale per bone
  inflate: number; // m the skin swells along its normals
  shoulders?: number; // how far out the arms sit, as a factor: a round body would swallow them otherwise
  height: number; // m, cap or ears included
  build?: (c: Kit) => void;
};
type Mat = 'cream' | 'leather' | 'sole' | 'brass' | 'pupil' | 'white' | 'blush' | 'body';
/** A part in the mannequin's rest pose: faces +z, its left is +x, y up. */
type Kit = {
  at(bone: string): THREE.Vector3;
  ball(bone: string, mat: Mat, pos: THREE.Vector3, size: V, rot?: V): void;
  dome(bone: string, mat: Mat, pos: THREE.Vector3, size: V, rot?: V, lower?: boolean): void;
};
type V = [number, number, number];
const up = (p: THREE.Vector3, y: number, z = 0, x = 0) => p.clone().add(new THREE.Vector3(x, y, z));

const BALL = new THREE.SphereGeometry(1, 28, 20);
const UPPER = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
const LOWER = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
const make = (color: string, roughness: number) => new THREE.MeshStandardNodeMaterial({ color, roughness });
const MATS: Record<Exclude<Mat, 'body'>, THREE.MeshStandardNodeMaterial> = {
  cream: make('#f2e6cc', 0.9),
  leather: make('#9a5a2c', 0.65),
  sole: make('#4a2f1e', 0.8),
  brass: make('#c9a046', 0.35),
  pupil: make('#13243f', 0.25),
  white: make('#ffffff', 0.25),
  blush: make('#ff8fa3', 0.6),
};
let shaded = false;

/** Bead eyes with a glint and blush, on the front of an ellipsoid centred at c. */
function face(k: Kit, bone: string, c: THREE.Vector3, r: V, eye: { x: number; y: number; size: number }) {
  const onFront = (x: number, y: number, out: number) => {
    const t = 1 - (x / r[0]) ** 2 - (y / r[1]) ** 2;
    return up(c, y, r[2] * Math.sqrt(Math.max(t, 0)) + out, x);
  };
  for (const sx of [1, -1]) {
    const yaw = Math.asin(Math.min(1, (sx * eye.x) / r[0])); // lying on the curve of the head
    const s = eye.size;
    k.ball(bone, 'pupil', onFront(sx * eye.x, eye.y, -0.004), [s * 0.62, s, s * 0.3], [0, yaw, 0]);
    k.ball(
      bone,
      'white',
      onFront(sx * eye.x + s * 0.15, eye.y + s * 0.42, s * 0.2),
      [s * 0.2, s * 0.24, s * 0.1],
      [0, yaw, 0],
    );
    k.ball(
      bone,
      'blush',
      onFront(sx * r[0] * 0.68, eye.y - s * 1.25, -0.004),
      [s * 0.55, s * 0.32, s * 0.12],
      [0, yaw * 1.6, 0],
    );
  }
}

export const LOOKS: Record<string, Look> = {
  // The library's figure, for judging motion alone.
  mannequin: { bones: {}, inflate: 0, height: 1.75 },

  // Small and big-headed: a round head on a little body, short legs, big hands and feet.
  cute: {
    bones: {
      thigh_l: 0.62,
      thigh_r: 0.62,
      foot_l: 1.9,
      foot_r: 1.9,
      spine_01: 0.85,
      Head: 1.6,
      upperarm_l: 0.9,
      upperarm_r: 0.9,
      hand_l: 1.7,
      hand_r: 1.7,
    },
    inflate: 0.045,
    height: 1.5,
    build(k) {
      const c = up(k.at('Head'), 0.17);
      const r: V = [0.27, 0.25, 0.25];
      k.ball('Head', 'body', c, r);
      face(k, 'Head', c, r, { x: 0.11, y: 0.03, size: 0.092 });
    },
  },

  // Athletic, in the spirit of Ratchet's proportions as our own figure: long legs, big feet and mitts, a big head with
  // tall rounded ears for a silhouette you can read from behind.
  ears: {
    bones: {
      thigh_l: 0.88,
      thigh_r: 0.88,
      foot_l: 1.5,
      foot_r: 1.5,
      spine_01: 0.72,
      Head: 1.6,
      upperarm_l: 0.95,
      upperarm_r: 0.95,
      hand_l: 1.55,
      hand_r: 1.55,
    },
    inflate: 0.012,
    height: 1.8,
    build(k) {
      const c = up(k.at('Head'), 0.14);
      const r: V = [0.2, 0.185, 0.19];
      k.ball('Head', 'body', c, r);
      face(k, 'Head', c, r, { x: 0.085, y: 0.03, size: 0.07 });
      for (const sx of [1, -1]) {
        const e = up(c, 0.25, -0.05, sx * 0.14);
        k.ball('Head', 'body', e, [0.075, 0.2, 0.045], [-0.15, 0, -sx * 0.3]);
        k.ball('Head', 'cream', up(e, 0, 0.022), [0.045, 0.14, 0.03], [-0.15, 0, -sx * 0.3]);
      }
    },
  },

  // Stout, in the spirit of a Castle Story Bricktron: a barrel of a body, short legs, long arms with big hands, a hard hat
  // and work trousers.
  stout: {
    bones: {
      thigh_l: 0.5,
      thigh_r: 0.5,
      foot_l: 2.3,
      foot_r: 2.3,
      spine_01: 1.05,
      Head: 1.25,
      upperarm_l: 1.02,
      upperarm_r: 1.02,
      hand_l: 1.45,
      hand_r: 1.45,
    },
    inflate: 0.05,
    shoulders: 2.3,
    height: 1.5,
    build(k) {
      const chest = up(k.at('spine_02'), 0.1, 0.01);
      k.ball('spine_02', 'body', chest, [0.36, 0.34, 0.29]);
      const hips = up(k.at('pelvis'), 0.04);
      k.dome('pelvis', 'cream', up(hips, 0.08), [0.33, 0.24, 0.27], undefined, true);
      const belt = up(hips, 0.08);
      k.ball('pelvis', 'leather', belt, [0.335, 0.03, 0.275]);
      for (const side of ['l', 'r']) {
        const t = k.at('thigh_' + side);
        k.ball('thigh_' + side, 'cream', up(t, -0.08), [0.13, 0.15, 0.13]);
      }
      const c = up(k.at('Head'), 0.13, 0.03);
      const r: V = [0.22, 0.2, 0.2];
      k.ball('Head', 'body', c, r);
      face(k, 'Head', c, r, { x: 0.09, y: -0.005, size: 0.07 });
      k.dome('Head', 'cream', up(c, 0.08), [0.232, 0.165, 0.22]);
      k.ball('Head', 'cream', up(c, 0.082, 0.03), [0.285, 0.02, 0.27]);
    },
  },

  // Bib Buddies: a one-piece bean for head and body, low cream overalls with straps and buttons, a cap, short legs.
  bib: {
    bones: {
      thigh_l: 0.6,
      thigh_r: 0.6,
      foot_l: 2,
      foot_r: 2,
      spine_01: 0.95,
      Head: 0.5,
      upperarm_l: 0.9,
      upperarm_r: 0.9,
      hand_l: 1.8,
      hand_r: 1.8,
    },
    inflate: 0.03,
    shoulders: 1.85,
    height: 1.6,
    build(k) {
      const c = up(k.at('spine_03'), 0.14, 0.02);
      const r: V = [0.34, 0.5, 0.3];
      k.ball('spine_03', 'body', c, r);
      face(k, 'spine_03', c, r, { x: 0.125, y: 0.17, size: 0.1 });
      k.dome('spine_03', 'cream', up(c, -0.13), [0.345, 0.38, 0.305], undefined, true);
      const hips = k.at('pelvis');
      k.ball('pelvis', 'cream', up(hips, 0.03), [0.27, 0.14, 0.23]);
      k.ball('spine_03', 'cream', up(c, -0.12, 0.262), [0.16, 0.13, 0.05]);
      for (const sx of [1, -1]) k.ball('spine_03', 'brass', up(c, -0.04, 0.297, sx * 0.115), [0.03, 0.03, 0.016]);
      const top = up(c, 0.32, -0.005);
      k.dome('spine_03', 'cream', top, [0.28, 0.2, 0.26]);
      k.ball('spine_03', 'cream', up(top, 0.008, 0.24), [0.19, 0.015, 0.14]);
    },
  },
};

/** Fit a figure to its look, in the rest pose, with the holder untransformed. Returns the hips' scale for the clips. */
export function applyLook(look: Look, root: THREE.Object3D, body: THREE.Material) {
  if (!shaded) {
    shaded = true;
    const g = new THREE.Group();
    for (const m of Object.values(MATS)) g.add(new THREE.Mesh(BALL, m));
    shadeOnce(g);
  }
  const b = look.bones;
  const scaled: [THREE.Object3D, number][] = Object.entries(b).map(([n, k]) => [root.getObjectByName(n)!, k]);
  for (const [bone, k] of scaled) bone.scale.setScalar(k);
  // Hip height over the mannequin's 0.932 m: thigh 0.4, calf 0.428, ankle 0.104 below, with the look's scales.
  const t = b.thigh_l ?? 1,
    legs = ((0.4 + 0.428) * t + 0.104 * t * (b.foot_l ?? 1)) / 0.932;
  const pelvis = root.getObjectByName('pelvis')!;
  pelvis.position.multiplyScalar(legs);
  root.updateMatrixWorld(true);

  const bone = (n: string) => root.getObjectByName(n)!;
  const add = (n: string, geo: THREE.BufferGeometry, mat: Mat, pos: THREE.Vector3, size: V, rot?: V) => {
    const m = new THREE.Mesh(geo, mat === 'body' ? body : MATS[mat]);
    m.position.copy(pos);
    m.scale.set(...size);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    bone(n).attach(m);
  };
  look.build?.({
    at: (n) => bone(n).getWorldPosition(new THREE.Vector3()),
    ball: (n, mat, pos, size, rot) => add(n, BALL, mat, pos, size, rot),
    dome: (n, mat, pos, size, rot, lower) => add(n, lower ? LOWER : UPPER, mat, pos, size, rot),
  });
  const spread: [THREE.Object3D, number][] = look.shoulders
    ? ['upperarm_l', 'upperarm_r'].map((n) => [bone(n), look.shoulders!])
    : [];
  return { scaled, pelvis, legs, spread };
}

/** Swell a skinned material along its normals. */
export const inflate = (m: THREE.Material, by: number) =>
  by ? patchNode(m, 'positionNode', (prev) => (prev ?? positionLocal).add(normalLocal.mul(by))) : m;
