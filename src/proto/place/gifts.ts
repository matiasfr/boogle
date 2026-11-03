// Gift Freight, small (docs/research/maximal-rewards.md, A). Every finished stretch delivers a crate that bursts open with
// a real payoff: a burst, a sound, a light and a beat where the thing is shown, and then it goes where you'll see it: on you
// or on the train. First gifts are cosmetic only (owner: "maybe to start with, it can even be just cosmetics"). The first few
// come in an authored order so the first is great, then a little surprise; no duplicates, no currency.
// The hint comes first (owner: "having a hint that there's something you can get later would be really cool"): a curio
// shelf at the station with shapes under dust sheets, and empty mounts on the train, from the start of the run. As gifts
// land, a sheet comes off and a mount fills. More shapes than there are crates, so some stay covered. Local.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { emit } from '../../render/particles.ts';
import { scene } from '../../render/scene.ts';
import { thump } from '../../render/machine-sfx.ts';
import { me } from '../../player/player.ts';
import { carry } from '../../physics/platforms.ts';
import { fanfare, knock, label, pop } from '../minis/common.ts';
import { H, addStatic } from './land.ts';
import { SHELF, toWorld } from './layout.ts';
import { dustRing } from './pieces.ts';
import { softGlow } from './look.ts';
import { addFoot } from './sites.ts';

// ---------------------------------------------------------------- shapes: a few primitives, merged, in their own colours
type Prim = 's' | 'c' | 'k' | 'b' | 't';
type Part = [
  shape: Prim,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: string,
  rx?: number,
  rz?: number,
];
const unit: Record<Prim, () => THREE.BufferGeometry> = {
  s: () => new THREE.SphereGeometry(1, 10, 8),
  c: () => new THREE.CylinderGeometry(1, 1, 1, 12),
  k: () => new THREE.ConeGeometry(1, 1, 10),
  b: () => new THREE.BoxGeometry(1, 1, 1),
  t: () => new THREE.TorusGeometry(1, 0.3, 6, 14).rotateX(Math.PI / 2),
};
const m4 = new THREE.Matrix4(),
  e4 = new THREE.Euler(),
  q4 = new THREE.Quaternion(),
  p4 = new THREE.Vector3(),
  s4 = new THREE.Vector3(),
  c4 = new THREE.Color();
export function merged(parts: Part[], grow = 1) {
  const geos = parts.map(([kind, x, y, z, sx, sy, sz, color, rx, rz]) => {
    const g = unit[kind]();
    g.applyMatrix4(
      m4.compose(
        p4.set(x, y, z),
        q4.setFromEuler(e4.set(rx ?? 0, 0, rz ?? 0)),
        s4.set(sx * grow, sy * grow, sz * grow),
      ),
    );
    const n = g.getAttribute('position').count;
    c4.set(color);
    const col = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) col.set([c4.r, c4.g, c4.b], k * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  return mergeGeometries(geos)!;
}
const giftMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.08 });
const sheetMat = new THREE.MeshStandardNodeMaterial({ color: '#ded5c2', roughness: 1, flatShading: true });
const darkMat = new THREE.MeshStandardNodeMaterial({ color: '#2c2a2e', roughness: 0.75 });
const GOLD = '#f2b134',
  NAVY = '#27386b',
  RED = '#d8392b',
  BRASS = '#d9a23a';

export type GiftId = 'hat' | 'flag' | 'critter' | 'cap' | 'bunting' | 'bell' | 'lantern' | 'scarf' | 'egg' | 'scope';
type Gift = { id: GiftId; name: string; line: string; parts: Part[] };
// Each drawn at about the size it sits on the shelf, base at y = 0.
const GIFTS: Gift[] = [
  {
    id: 'hat',
    name: "A conductor's hat",
    line: 'Yours. It suits you.',
    parts: [
      ['c', 0, 0.03, 0.06, 0.4, 0.05, 0.42, '#1b2a55'],
      ['c', 0, 0.2, 0, 0.3, 0.3, 0.3, NAVY],
      ['c', 0, 0.12, 0, 0.31, 0.08, 0.31, GOLD],
      ['s', 0, 0.36, 0, 0.34, 0.1, 0.34, NAVY],
      ['s', 0, 0.2, 0.3, 0.06, 0.06, 0.03, GOLD],
    ],
  },
  {
    id: 'flag',
    name: 'Your own flag',
    line: 'It flies from every engine you own.',
    parts: [
      ['c', 0, 0.42, 0, 0.018, 0.84, 0.018, '#e8d3a2'],
      ['s', 0, 0.86, 0, 0.04, 0.04, 0.04, GOLD],
      ['k', 0.24, 0.66, 0, 0.17, 0.48, 0.02, '#ff5f8f', 0, -Math.PI / 2],
      ['k', 0.15, 0.66, 0.003, 0.08, 0.22, 0.02, '#fff0c9', 0, -Math.PI / 2],
    ],
  },
  {
    id: 'critter',
    name: 'A small stowaway',
    line: 'It was in the crate. It seems to like you.',
    parts: [
      ['s', 0, 0.2, 0, 0.21, 0.2, 0.24, '#f08c3a'],
      ['s', 0, 0.2, 0.08, 0.14, 0.14, 0.18, '#ffe1b8'],
      ['s', 0, 0.42, 0.1, 0.17, 0.16, 0.16, '#f08c3a'],
      ['k', -0.1, 0.59, 0.08, 0.05, 0.12, 0.05, '#c9601f'],
      ['k', 0.1, 0.59, 0.08, 0.05, 0.12, 0.05, '#c9601f'],
      ['s', -0.07, 0.45, 0.24, 0.03, 0.035, 0.02, '#1b1a1e'],
      ['s', 0.07, 0.45, 0.24, 0.03, 0.035, 0.02, '#1b1a1e'],
      ['s', 0, 0.2, -0.26, 0.08, 0.08, 0.13, '#c9601f'],
    ],
  },
  {
    id: 'cap',
    name: 'A golden chimney crown',
    line: "Now it's the fanciest engine on the island.",
    parts: [
      ['t', 0, 0.05, 0, 0.3, 0.3, 0.3, GOLD],
      ...[0, 1, 2, 3, 4, 5].map((k): Part => {
        const a = (k / 6) * Math.PI * 2;
        return ['k', Math.cos(a) * 0.3, 0.18, Math.sin(a) * 0.3, 0.07, 0.24, 0.07, GOLD];
      }),
    ],
  },
  {
    id: 'bunting',
    name: 'Bunting',
    line: 'Every flatbed is a parade now.',
    parts: [
      ['c', 0, 0.5, 0, 0.012, 0.92, 0.012, '#e8d3a2', 0, Math.PI / 2],
      ...['#ff5f8f', '#ffcf33', '#4fb7ff', '#62d67a', '#ff8a3a'].map((c, k): Part => [
        'k',
        -0.36 + k * 0.18,
        0.38,
        0,
        0.07,
        -0.22,
        0.012,
        c,
      ]),
    ],
  },
  {
    id: 'bell',
    name: 'A brass bell',
    line: 'The engines ring it when they come in.',
    parts: [
      ['k', 0, 0.2, 0, 0.21, 0.36, 0.21, BRASS],
      ['c', 0, 0.03, 0, 0.23, 0.05, 0.23, BRASS],
      ['s', 0, 0.39, 0, 0.05, 0.05, 0.05, GOLD],
      ['s', 0, 0.02, 0, 0.05, 0.05, 0.05, '#7a5a20'],
    ],
  },
  {
    id: 'lantern',
    name: 'A red lantern',
    line: "It hangs off the back, so they see you've been.",
    parts: [
      ['c', 0, 0.22, 0, 0.13, 0.3, 0.13, '#ff5a3a'],
      ['c', 0, 0.05, 0, 0.16, 0.04, 0.16, '#2c2a2e'],
      ['c', 0, 0.39, 0, 0.16, 0.04, 0.16, '#2c2a2e'],
      ['t', 0, 0.47, 0, 0.07, 0.07, 0.07, '#2c2a2e', Math.PI / 2],
    ],
  },
  {
    id: 'scarf',
    name: 'A very long scarf',
    line: 'Knitted by someone in the village, probably.',
    parts: [
      ['t', 0, 0.32, 0, 0.28, 0.22, 0.28, '#d8392b'],
      ['b', 0.14, 0.14, 0.26, 0.11, 0.42, 0.04, '#d8392b'],
      ['b', 0.14, 0.02, 0.26, 0.115, 0.06, 0.045, '#fff0c9'],
    ],
  },
  // Shapes that never come out of this run's crates. They promise more.
  {
    id: 'egg',
    name: 'Something round',
    line: '',
    parts: [
      ['s', 0, 0.3, 0, 0.24, 0.32, 0.24, '#5fd0c0'],
      ['c', 0, 0.03, 0, 0.2, 0.06, 0.2, BRASS],
    ],
  },
  {
    id: 'scope',
    name: 'Something on legs',
    line: '',
    parts: [
      ['c', 0, 0.5, 0, 0.07, 0.56, 0.07, BRASS, 0, 0.9],
      ['c', -0.13, 0.2, 0, 0.018, 0.5, 0.018, '#7a5a20', 0, -0.3],
      ['c', 0.13, 0.2, 0, 0.018, 0.5, 0.018, '#7a5a20', 0, 0.3],
      ['c', 0, 0.2, 0.1, 0.018, 0.5, 0.018, '#7a5a20', 0.3],
    ],
  },
];
const byId = (id: GiftId) => GIFTS.find((g) => g.id === id)!;
const geos = new Map<GiftId, THREE.BufferGeometry>();
const geoOf = (id: GiftId) => {
  let g = geos.get(id);
  if (!g) geos.set(id, (g = merged(byId(id).parts)));
  return g;
};
const AUTHORED: GiftId[] = ['hat', 'flag', 'critter'];
const THEN: GiftId[] = ['cap', 'bunting', 'bell', 'lantern', 'scarf'];

// ---------------------------------------------------------------- the curio shelf
const SX = toWorld(SHELF.x),
  SZ = SHELF.z,
  SY = H(SX, SZ),
  COLS = 5,
  WIDE = 5.4,
  ROWS_Y = [1.32, 2.2],
  CRYSTAL_Y = 0.82;
const shelf = new THREE.Group();
shelf.position.set(SX, SY, SZ);
shelf.rotation.y = SHELF.yaw;
scene.add(shelf);
{
  const o = '#7f5630',
    b = '#a9794c',
    back = '#5c4530';
  const parts: Part[] = [
    ['b', 0, 1.65, -0.3, WIDE, 3.1, 0.1, back],
    ['b', -WIDE / 2, 1.65, 0, 0.18, 3.3, 0.7, o],
    ['b', WIDE / 2, 1.65, 0, 0.18, 3.3, 0.7, o],
    ['b', 0, 0.42, 0.04, WIDE, 0.1, 0.68, b],
    ['b', 0, 1.26, 0.04, WIDE, 0.1, 0.68, b],
    ['b', 0, 2.14, 0.04, WIDE, 0.1, 0.68, b],
    ['b', 0, 3.1, 0.04, WIDE + 0.5, 0.14, 1.1, o],
    ['b', 0, 3.3, 0, WIDE + 0.1, 0.34, 0.5, '#c4453a'],
    ['b', 0, 0.12, 0.04, WIDE, 0.22, 0.68, o],
  ];
  const frame = new THREE.Mesh(merged(parts), giftMat);
  frame.castShadow = frame.receiveShadow = true;
  shelf.add(frame);
}
addStatic(
  { kind: 'box', hx: WIDE / 2 + 0.1, hy: 1.7, hz: 0.4 },
  { x: SX, y: SY + 1.7, z: SZ },
  new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, SHELF.yaw),
);
addFoot(SX, SZ, SHELF.yaw, WIDE / 2 + 0.3, 0.6);
// What's on the shelf is two meshes, whatever's uncovered and whatever's still under its sheet, remade when a sheet comes
// off: two draws however many shapes it holds.
const slots = new Map<GiftId, { x: number; y: number }>();
GIFTS.forEach((g, k) => {
  const col = k % COLS,
    row = Math.floor(k / COLS);
  slots.set(g.id, { x: (col - (COLS - 1) / 2) * (WIDE / COLS), y: ROWS_Y[1 - row]! });
});
const open_ = new Set<GiftId>();
const placed = (g: Gift, parts: Part[]): Part[] => {
  const at = slots.get(g.id)!;
  return parts.map((p) => {
    const q = [...p] as Part;
    q[1] += at.x;
    q[2] += at.y;
    q[3] += 0.08;
    return q;
  });
};
const shelfReal = new THREE.Mesh(new THREE.BufferGeometry(), giftMat);
const shelfCover = new THREE.Mesh(new THREE.BufferGeometry(), sheetMat);
shelf.add(shelfReal, shelfCover);
function redrawShelf() {
  shelfReal.geometry.dispose();
  shelfCover.geometry.dispose();
  const real = GIFTS.filter((g) => open_.has(g.id));
  const covered = GIFTS.filter((g) => !open_.has(g.id));
  shelfReal.visible = real.length > 0;
  shelfCover.visible = covered.length > 0;
  if (real.length) shelfReal.geometry = merged(real.flatMap((g) => placed(g, g.parts)));
  // Under its sheet: the same shape, a little fuller, in cloth, with a skirt to the shelf.
  if (covered.length)
    shelfCover.geometry = merged(
      covered.flatMap((g) => placed(g, [...g.parts, ['k', 0, 0.2, 0, 0.36, 0.4, 0.36, '#fff']])),
      1.12,
    );
}
redrawShelf();
const sheet = new THREE.Color('#ded5c2'),
  glint = new THREE.Color('#ffe9a8'),
  v = new THREE.Vector3(),
  v2 = new THREE.Vector3();
function reveal(id: GiftId, show: boolean) {
  const q = slots.get(id)!;
  open_.add(id);
  redrawShelf();
  if (!show) return;
  shelf.localToWorld(v.set(q.x, q.y, 0.08));
  for (let k = 0; k < 18; k++) {
    const a = Math.random() * Math.PI * 2;
    emit({
      x: v.x,
      y: v.y + 0.3,
      z: v.z,
      vx: Math.cos(a) * 1.5,
      vy: 1 + Math.random() * 2,
      vz: Math.sin(a) * 1.5,
      life: 1,
      size: 0.14,
      color: k % 3 ? sheet : glint,
      gravity: 3,
      shrink: 0.4,
    });
  }
}
/** The crystals' row on the shelf, in shelf space: one peg per crystal, along the bottom board. */
export const shelfGroup = shelf;
export const crystalPeg = (k: number, n: number, out: THREE.Vector3) =>
  out.set(((k + 0.5) / n - 0.5) * (WIDE - 0.4), CRYSTAL_Y, 0.08);

// ---------------------------------------------------------------- what the train has waiting
type Mount = { car: number; x: number; y: number; z: number; scale: number; ry?: number };
/** Where each kind of ornament goes, on a car (0 the loco, then flatbeds), in the car's frame. */
const MOUNTS: Partial<Record<GiftId, Mount[]>> = {
  flag: [{ car: 0, x: 0, y: 2.08, z: -1.05, scale: 1.9 }],
  cap: [{ car: 0, x: 0, y: 2.4, z: 1.05, scale: 1.1 }],
  bell: [{ car: 0, x: 0, y: 1.72, z: 0.1, scale: 0.8 }],
  bunting: [{ car: 1, x: 0.98, y: 0, z: 0, scale: 3.1, ry: Math.PI / 2 }],
  lantern: [{ car: 1, x: 0.86, y: 1.12, z: -1.5, scale: 0.85 }],
};
const IRON = '#3a3a40';
const EMPTY: Part[][] = [
  // the loco: a bare pole on the cab roof, a collar on the chimney, a little bell-bracket
  [
    ['c', 0, 2.2, -1.05, 0.03, 0.26, 0.03, IRON],
    ['t', 0, 2.42, 1.05, 0.31, 0.2, 0.31, IRON],
    ['b', 0, 1.68, 0.1, 0.5, 0.05, 0.05, IRON],
    ['b', -0.22, 1.86, 0.1, 0.04, 0.34, 0.04, IRON],
    ['b', 0.22, 1.86, 0.1, 0.04, 0.34, 0.04, IRON],
    ['b', 0, 2.03, 0.1, 0.48, 0.04, 0.04, IRON],
  ],
  // the flatbed: posts down one side for a string, and a hook at the back
  [
    ['c', 0.98, 1.1, -1.4, 0.025, 0.9, 0.025, IRON],
    ['c', 0.98, 1.1, 1.4, 0.025, 0.9, 0.025, IRON],
    ['b', 0.92, 1.55, -1.5, 0.2, 0.03, 0.03, IRON],
  ],
];
const mountGeos = EMPTY.map((p) => merged(p));
type Vehicle = { cars: THREE.Object3D[]; flag: THREE.Object3D[] };
const vehicles: Vehicle[] = [];
const filled = new Map<GiftId, THREE.Object3D[]>();
/** A vehicle's empty mounts, on show from the start. Cars in train order, each in its own frame. */
export function fitMounts(cars: THREE.Object3D[]) {
  EMPTY.forEach((_, k) => {
    const m = new THREE.Mesh(mountGeos[k], darkMat);
    cars[k]?.add(m);
  });
  vehicles.push({ cars, flag: [] });
}
function fill(id: GiftId) {
  const list = MOUNTS[id];
  if (!list || filled.has(id)) return;
  const made: THREE.Object3D[] = [];
  for (const veh of vehicles)
    for (const t of list) {
      const m = new THREE.Mesh(geoOf(id), giftMat);
      m.position.set(t.x, t.y, t.z);
      m.scale.setScalar(t.scale);
      m.rotation.y = t.ry ?? 0;
      veh.cars[t.car]?.add(m);
      made.push(m);
      if (id === 'flag') veh.flag.push(m);
    }
  filled.set(id, made);
}
function unfill() {
  for (const list of filled.values()) for (const m of list) m.removeFromParent();
  filled.clear();
  for (const veh of vehicles) veh.flag.length = 0;
}

// ---------------------------------------------------------------- what you wear, and who follows you
const worn = new Map<GiftId, THREE.Mesh>();
type Named = THREE.Object3D & { getObjectByName: (n: string) => THREE.Object3D | undefined };
const WEAR: Partial<Record<GiftId, { bone: string; y: number; z: number; scale: number }>> = {
  hat: { bone: 'head', y: 0.075, z: 0, scale: 0.86 }, // brim down round the head, not perched on its crown
  scarf: { bone: 'neck_01', y: -0.2, z: 0, scale: 0.62 },
};
function wear(id: GiftId) {
  const w = WEAR[id];
  const a = me.avatar;
  if (!w || !a || worn.has(id)) return;
  const m = new THREE.Mesh(geoOf(id), giftMat);
  m.castShadow = true;
  m.scale.setScalar(w.scale);
  m.rotation.y = Math.PI; // the avatar faces -z, and these have their fronts at +z
  a.add(m);
  worn.set(id, m);
}
/** Each frame: on the avatar, upright, where the bone has got to in its clip. Works in the avatar's space, so a fast train
 * can't leave it a frame behind. */
function updateWorn() {
  const a = me.avatar as Named | null | undefined;
  if (!a) return;
  a.updateWorldMatrix(true, false);
  for (const [id, m] of worn) {
    const w = WEAR[id]!;
    const bone = a.getObjectByName(w.bone);
    if (bone) a.worldToLocal(bone.getWorldPosition(m.position));
    else m.position.set(0, 0.9, 0);
    m.position.y += w.y;
    m.position.z += w.z;
  }
}
const critter = new THREE.Mesh(geoOf('critter'), giftMat);
critter.visible = false;
critter.castShadow = true;
scene.add(critter);
const crit = { on: false, x: 0, y: 0, z: 0, yaw: 0, hop: 0, t: 0, riding: false };
const CRIT_SEAT = { side: 0.62, back: 0.45 }; // m beside and behind you, riding
function updateCritter(dt: number) {
  const b = me.body;
  if (!crit.on || !b) return;
  const p = b.interpolatedPosition;
  // On a moving deck it hops up beside you and sits: no chasing a train along the ground and through its wheels.
  if (carry.on) {
    const sx = p.x + Math.cos(me.yaw) * CRIT_SEAT.side + Math.sin(me.yaw) * CRIT_SEAT.back,
      sz = p.z - Math.sin(me.yaw) * CRIT_SEAT.side + Math.cos(me.yaw) * CRIT_SEAT.back;
    const sy = p.y - 0.46;
    if (!crit.riding) crit.t = 0;
    crit.riding = true;
    crit.t = Math.min(1, crit.t + dt / 0.28); // the hop aboard
    const u = crit.t;
    crit.x += (sx - crit.x) * (u < 1 ? u : 1);
    crit.z += (sz - crit.z) * (u < 1 ? u : 1);
    crit.y += (sy - crit.y) * (u < 1 ? u : 1);
    crit.yaw = me.yaw + Math.PI;
    critter.position.set(crit.x, crit.y + (u < 1 ? Math.sin(u * Math.PI) * 0.9 : 0), crit.z);
    critter.rotation.y = crit.yaw;
    critter.scale.setScalar(0.8);
    return;
  }
  crit.riding = false;
  const bx = p.x + Math.sin(me.yaw) * 1.1 + Math.cos(me.yaw) * 0.7,
    bz = p.z + Math.cos(me.yaw) * 1.1 - Math.sin(me.yaw) * 0.7;
  const dx = bx - crit.x,
    dz = bz - crit.z,
    d = Math.hypot(dx, dz);
  if (d > 24) {
    crit.x = bx;
    crit.z = bz;
    crit.y = p.y - 0.5;
  }
  const moving = d > 0.5;
  if (moving) {
    const sp = Math.min(d * 3.2, 14);
    crit.x += (dx / d) * sp * dt;
    crit.z += (dz / d) * sp * dt;
    crit.yaw = Math.atan2(dx, dz);
  }
  crit.t += dt * (moving ? 11 : 2.4);
  crit.hop = moving ? Math.abs(Math.sin(crit.t)) * 0.36 : Math.max(0, Math.sin(crit.t) * 0.02);
  crit.y += (p.y - 0.5 - crit.y) * Math.min(1, dt * 10);
  critter.position.set(crit.x, crit.y + crit.hop, crit.z);
  critter.rotation.y = crit.yaw;
  const sq = 1 + (moving ? 0.1 * Math.cos(crit.t * 2) : 0.03 * Math.sin(crit.t));
  critter.scale.set(0.8 / sq, 0.8 * sq, 0.8 / sq);
}

// ---------------------------------------------------------------- the crate
const CRATE: Part[] = [
  ['b', 0, 0.5, 0, 1, 1, 1, '#b57f44'],
  ['b', 0, 0.5, 0, 1.04, 0.14, 1.04, GOLD],
  ['b', 0, 0.5, 0, 0.14, 1.04, 1.04, GOLD],
  ['b', 0, 0.5, 0, 1.04, 1.04, 0.14, GOLD],
  ['b', 0, 1.03, 0, 1.06, 0.06, 1.06, '#8a6236'],
  ['s', 0, 1.1, 0, 0.13, 0.1, 0.13, RED],
];
const crateGeo = merged(CRATE);
// The shaft over a waiting crate: soft all the time, reads from across the place, and it flares as the crate lands.
const crateGlow = softGlow('#ffb52e', 0.5, 'up'),
  crateBeam = crateGlow.mat;
crateBeam.blending = THREE.NormalBlending; // gold, not added light: added to a bright sky it's gone
let crateFlare = 0;
const beamGeo = new THREE.CylinderGeometry(0.75, 1.1, 34, 12, 1, true).translate(0, 18.3, 0); // from over the crate's lid
type Crate = {
  x: number;
  y: number;
  z: number;
  mesh: THREE.Mesh;
  beam: THREE.Mesh;
  t: number;
  from: THREE.Vector3 | null;
  id: number;
};
const crates: Crate[] = [];
let crateId = 0;
function makeCrate(x: number, y: number, z: number, from: THREE.Vector3 | null) {
  const mesh = new THREE.Mesh(crateGeo, giftMat);
  mesh.castShadow = true;
  const beam = new THREE.Mesh(beamGeo, crateBeam);
  beam.position.set(x, y, z);
  mesh.position.set(x, y, z);
  scene.add(mesh, beam);
  crates.push({ x, y, z, mesh, beam, t: from ? 0 : 1, from: from?.clone() ?? null, id: crateId++ });
}
function dropCrate(c: Crate) {
  scene.remove(c.mesh, c.beam);
  crates.splice(crates.indexOf(c), 1);
}

// ---------------------------------------------------------------- the show
const boards = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.72, 0.07, 0.22),
  new THREE.MeshStandardNodeMaterial({ color: '#b57f44', roughness: 0.9 }),
  14,
);
boards.count = 0;
boards.frustumCulled = false;
boards.castShadow = true;
scene.add(boards);
const flying: {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  a: number;
  va: number;
  t: number;
}[] = [];
const flashGlow = softGlow('#fff0c0', 1);
const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), flashGlow.mat);
flash.visible = false;
const shaftGlow = softGlow('#ffe08a', 0.8, true);
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.1, 40, 14, 1, true).translate(0, 20, 0), shaftGlow.mat);
shaft.visible = false;
scene.add(flash, shaft);
const shown = new THREE.Mesh(new THREE.BufferGeometry(), giftMat);
shown.visible = false;
scene.add(shown);
const tag = label(5.6, 2.8);
tag.sprite.visible = false;
scene.add(tag.sprite);
const CONFETTI = ['#ff4f4f', '#ffcf33', '#2f8cff', '#4fdc7a', '#ff7ad9', '#ffffff'].map((c) => new THREE.Color(c));
const gold = new THREE.Color('#ffd76a');
function sparkles(x: number, y: number, z: number, n: number, sp: number, color = gold) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2,
      u = Math.random() * 1.4 - 0.2;
    emit({
      x,
      y,
      z,
      vx: Math.cos(a) * sp,
      vy: u * sp,
      vz: Math.sin(a) * sp,
      life: 0.7 + Math.random() * 0.6,
      size: 0.16 + Math.random() * 0.1,
      color,
      gravity: 5,
      drag: 1,
      shrink: 0.5,
    });
  }
}
function confettiBurst(x: number, y: number, z: number) {
  for (let k = 0; k < 110; k++) {
    const a = Math.random() * Math.PI * 2,
      s = 1.5 + Math.random() * 5;
    emit({
      x,
      y,
      z,
      vx: Math.cos(a) * s,
      vy: 6 + Math.random() * 8,
      vz: Math.sin(a) * s,
      life: 1.6 + Math.random() * 1,
      size: 0.17 + Math.random() * 0.13,
      color: CONFETTI[k % CONFETTI.length]!,
      gravity: 8,
      drag: 1.5,
      shrink: 0.3,
    });
  }
}
type Show = {
  gift: Gift;
  t: number;
  x: number;
  y: number;
  z: number;
  boomed: boolean;
  flew: boolean;
  landed: boolean;
  from: THREE.Vector3;
  n: number;
};
let show: Show | null = null;
const BIG = 3,
  SHAKE = 0.3,
  HOLD = 2.5,
  FLY = 0.55;
export const showing = () => !!show;
export const giftState = {
  got: [] as GiftId[],
  order: [] as GiftId[],
  /** Crates waiting to be opened, as where they stand. */
  crates: () => crates.map((c) => ({ x: c.x, y: c.y, z: c.z })),
  count: () => crates.length,
};
const nextGift = (): GiftId | null => {
  if (!giftState.order.length) {
    const rest = THEN.slice();
    for (let k = rest.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [rest[k], rest[j]] = [rest[j]!, rest[k]!];
    }
    giftState.order = [...AUTHORED, ...rest];
  }
  return giftState.order.find((g) => !giftState.got.includes(g)) ?? null;
};
/** The machine hands a crate down at (x, y, z). */
export function deliver(x: number, y: number, z: number, from: THREE.Vector3 | null) {
  makeCrate(x, y, z, from);
}
/** Open the crate: bursts, shows what's in it, and sends it home. */
export function openCrate(c: { x: number; z: number }) {
  if (show) return;
  const crate = crates.find((q) => q.x === c.x && q.z === c.z);
  if (!crate) return;
  const id = nextGift();
  if (!id) return dropCrate(crate);
  const gift = byId(id);
  giftState.got.push(id);
  show = {
    gift,
    t: 0,
    x: crate.x,
    y: crate.y,
    z: crate.z,
    boomed: false,
    flew: false,
    landed: false,
    from: new THREE.Vector3(),
    n: giftState.got.length,
  };
  crate.t = -1; // shaking
  shown.geometry = geoOf(id);
  saveHook();
}
let saveHook = () => {};
export const onGiftSaved = (fn: () => void) => void (saveHook = fn);
function target(gift: Gift, out: THREE.Vector3) {
  const b = me.body;
  if ((gift.id === 'hat' || gift.id === 'scarf') && b) return out.set(b.position.x, b.position.y + 1.1, b.position.z);
  if (gift.id === 'critter' && b) return out.set(b.position.x, b.position.y, b.position.z);
  const mount = MOUNTS[gift.id]?.[0];
  if (mount) {
    let best = Infinity;
    for (const veh of vehicles) {
      const car = veh.cars[mount.car];
      if (!car) continue;
      car.localToWorld(v2.set(mount.x, mount.y, mount.z));
      const d = b ? v2.distanceToSquared(b.position as unknown as THREE.Vector3) : 0;
      if (d < best) {
        best = d;
        out.copy(v2);
      }
    }
    return out;
  }
  return out.set(show!.x, show!.y + 20, show!.z);
}
function wearOrFit(id: GiftId, quiet: boolean) {
  if (WEAR[id]) wear(id);
  else if (id === 'critter') {
    crit.on = true;
    critter.visible = true;
    const b = me.body;
    if (b && quiet) {
      crit.x = b.position.x;
      crit.y = b.position.y - 0.5;
      crit.z = b.position.z;
    } else if (show) {
      crit.x = show.x;
      crit.y = show.y;
      crit.z = show.z;
    }
  } else fill(id);
}
function updateShow(dt: number) {
  const s = show;
  if (!s) return;
  s.t += dt;
  const crate = crates.find((q) => q.t === -1);
  if (!s.boomed) {
    // The lid rattles, and it's about to go.
    if (crate) {
      const w = Math.sin(s.t * 60) * 0.06 * (0.4 + s.t / SHAKE);
      crate.mesh.rotation.set(w, 0, -w);
      crate.mesh.scale.setScalar(1 + (s.t / SHAKE) * 0.14);
    }
    if (s.t < SHAKE) return;
    s.boomed = true;
    if (crate) dropCrate(crate);
    flying.length = 0;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2,
        sp = 3 + Math.random() * 3.5;
      flying.push({
        x: s.x,
        y: s.y + 0.5,
        z: s.z,
        vx: Math.cos(a) * sp,
        vy: 4 + Math.random() * 5,
        vz: Math.sin(a) * sp,
        a: Math.random() * 6,
        va: 6 + Math.random() * 9,
        t: 0,
      });
    }
    confettiBurst(s.x, s.y + 0.8, s.z);
    sparkles(s.x, s.y + 0.8, s.z, 34, 6);
    dustRing(s.x, s.y + 0.1, s.z, 12, 3.2, 0.45);
    knock(0.25, 1.3);
    thump(s.x, s.z);
    fanfare(s.n === 1 || s.n === 3);
    flash.visible = shaft.visible = true;
    flash.position.set(s.x, s.y + 0.9, s.z);
    shaft.position.set(s.x, s.y, s.z);
    shown.visible = true;
    tag.sprite.visible = true;
    tag.set(s.gift.name, s.gift.line);
    tag.punch();
  }
  const u = s.t - SHAKE; // since the boom
  const fb = Math.min(1, u / 0.42);
  flash.scale.setScalar(0.6 + fb * 6);
  flashGlow.strength.value = (1 - fb) * 1.1;
  flash.visible = fb < 1;
  const fs = Math.min(1, u / HOLD);
  shaft.scale.set(1 + fs * 0.3, 1, 1 + fs * 0.3);
  shaftGlow.strength.value = 0.7 * (1 - fs * fs);
  shaft.visible = fs < 1;
  if (u < HOLD) {
    // Up out of the wreck, turning, big enough to read: this is the beat where the thing is shown.
    const rise = 1 - (1 - Math.min(1, u / 0.5)) ** 3,
      pulse = Math.min(1, u / 0.3);
    const sc =
      (pulse < 1 ? BIG * (1 + 2.70158 * (pulse - 1) ** 3 + 1.70158 * (pulse - 1) ** 2) : 2.2) *
      (1 + 0.04 * Math.sin(u * 5));
    shown.position.set(s.x, s.y + 0.6 + rise * 2 + Math.sin(u * 2.4) * 0.07, s.z);
    shown.rotation.y = u * 1.8;
    shown.scale.setScalar(Math.max(0.01, sc));
    tag.sprite.position.set(s.x, s.y + 6.2, s.z);
    if (Math.floor(u * 8) !== Math.floor((u - dt) * 8))
      sparkles(shown.position.x, shown.position.y + 0.5, shown.position.z, 3, 2);
    return;
  }
  if (!s.flew) {
    s.flew = true;
    s.from.copy(shown.position);
    tag.sprite.visible = false;
    pop(3, 0.6);
    reveal(s.gift.id, near(SX, SZ));
  }
  const fu = Math.min(1, (u - HOLD) / FLY);
  target(s.gift, v);
  shown.position.lerpVectors(s.from, v, fu * fu);
  shown.position.y += Math.sin(fu * Math.PI) * 2;
  shown.rotation.y += dt * 14;
  shown.scale.setScalar(BIG + (0.75 - BIG) * fu);
  if (fu < 1) return;
  shown.visible = false;
  sparkles(v.x, v.y, v.z, 26, 4);
  pop(7, 0.8);
  pop(5, 0.5);
  wearOrFit(s.gift.id, false);
  show = null;
  saveHook();
}
const near = (x: number, z: number) => {
  const b = me.body;
  return !!b && Math.hypot(b.position.x - x, b.position.z - z) < 40;
};

// ---------------------------------------------------------------- saving and frames
/** Puts the gifts as a save says, with no show. */
export function snapGifts(got: GiftId[], order: GiftId[], waiting: { x: number; y: number; z: number }[]) {
  while (crates.length) dropCrate(crates[0]!);
  open_.clear();
  redrawShelf();
  unfill();
  for (const m of worn.values()) m.removeFromParent();
  worn.clear();
  crit.on = false;
  critter.visible = false;
  show = null;
  shown.visible = flash.visible = shaft.visible = tag.sprite.visible = false;
  giftState.got = got.slice();
  giftState.order = order.slice();
  for (const id of got) {
    reveal(id, false);
    pendingWear.add(id);
  }
  for (const c of waiting) makeCrate(c.x, c.y, c.z, null);
}
const pendingWear = new Set<GiftId>();
const bump = new THREE.Vector3();
export function nearestCrate(x: number, z: number, reach: number) {
  for (const c of crates) {
    if (c.t < 1) continue;
    if (Math.hypot(c.x - x, c.z - z) < reach) return { c, at: bump.set(c.x, c.y + 1.5, c.z) };
  }
  return null;
}
export function updateGifts(dt: number, now: number) {
  // The avatar may not be there yet on a reload.
  if (pendingWear.size && me.avatar) {
    for (const id of pendingWear) {
      // The body arrives a moment after the avatar does.
      if (WEAR[id] && !(me.avatar as Named).getObjectByName(WEAR[id].bone) && performance.now() < 8000) continue;
      wearOrFit(id, true);
      pendingWear.delete(id);
    }
  }
  crateFlare = Math.max(0, crateFlare - dt / 1.6);
  crateGlow.strength.value = 0.42 + Math.sin(now * 0.0025) * 0.07 + crateFlare * crateFlare * 0.55;
  for (const c of crates) {
    if (c.t === -1) continue;
    if (c.t < 1) {
      c.t = Math.min(1, c.t + dt / 0.7);
      const f = c.from!;
      c.mesh.position.lerpVectors(f, v.set(c.x, c.y, c.z), c.t);
      c.mesh.position.y += Math.sin(c.t * Math.PI) * 2.4;
      c.mesh.rotation.x = (1 - c.t) * 3;
      if (c.t >= 1) {
        crateFlare = 1;
        thump(c.x, c.z);
        knock(0.5, 0.9);
        dustRing(c.x, c.y + 0.1, c.z, 10, 2.4, 0.4);
        sparkles(c.x, c.y + 0.6, c.z, 18, 3.4);
        pop(4, 0.6);
        c.mesh.rotation.x = 0;
      }
      continue;
    }
    c.mesh.position.y = c.y + Math.max(0, Math.sin(now * 0.004)) * 0.06;
    c.mesh.rotation.z = Math.sin(now * 0.0035) * 0.02;
    if (Math.random() < dt * 3) sparkles(c.x, c.y + 1.2, c.z, 1, 1.2);
  }
  updateShow(dt);
  if (flying.length) {
    let n = 0;
    for (const f of flying) {
      f.t += dt;
      f.vy -= 14 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.z += f.vz * dt;
      f.a += f.va * dt;
      const floor = H(f.x, f.z) + 0.05;
      if (f.y < floor) {
        f.y = floor;
        f.vy *= -0.3;
        f.vx *= 0.6;
        f.vz *= 0.6;
        f.va *= 0.5;
      }
      boards.setMatrixAt(
        n++,
        m4.compose(p4.set(f.x, f.y, f.z), q4.setFromEuler(e4.set(f.a, f.a * 0.6, 0)), s4.set(1, 1, 1)),
      );
    }
    boards.count = n;
    boards.instanceMatrix.needsUpdate = true;
    if (flying[0]!.t > 2.4) {
      flying.length = 0;
      boards.count = 0;
    }
  }
  updateCritter(dt);
  updateWorn();
  for (const veh of vehicles)
    for (let k = 0; k < veh.flag.length; k++) veh.flag[k]!.rotation.y = Math.sin(now * 0.006 + k) * 0.35;
}
