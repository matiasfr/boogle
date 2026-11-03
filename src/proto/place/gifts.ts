// Crates: cosmetic boxes (owner, Design Table, 2 November: "cosmetic boxes only, with rarity tiers, common first and rarer later").
// Numbers from docs/research/cosmetic-rarity.md, "A small round-4 set", all hypotheses: three tiers, told apart by marks on the lid
// and the seal's shape as well as colour; odds by box; a Wonder by the third box, and never more than five in a row without one.
// What's in a box goes in a slot, hat, accessory or outfit. An empty slot puts it on; a slot with something in it keeps it, and
// you can swap at the curio shelf (Interact), which is your wardrobe: what you've got stands on it, what you haven't is under
// dust sheets. The stowaway has a slot of its own. No curios or train ornaments as prizes: train slots wait for the roundhouse.
// No duplicates. The ladder's tool chests use the same show (./ladder.ts). Personal, and Local.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { emit } from '../../render/particles.ts';
import { scene } from '../../render/scene.ts';
import { thump } from '../../render/machine-sfx.ts';
import { me } from '../../player/player.ts';
import { addPresenceField, onPeerRemoved, onRemotePresence, remotes } from '../../netplay/net.ts';
import { carry } from '../../physics/platforms.ts';
import { fanfare, knock, label, pop } from '../minis/common.ts';
import { H, addStatic } from './land.ts';
import { personalSlice } from './job.ts';
import { SHELF, toWorld } from './layout.ts';
import { FINDERS } from './tech-layout.ts';
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
const GOLD = '#f2b134',
  NAVY = '#27386b',
  RED = '#d8392b',
  BRASS = '#d9a23a';

export type GiftId =
  | 'hat'
  | 'beanie'
  | 'teacup'
  | 'scarf'
  | 'glasses'
  | 'headphones'
  | 'overalls'
  | 'raincoat'
  | 'festival'
  | 'critter'
  | 'egg'
  | 'scope'
  | 'strawhat'
  | 'lampcap'
  | 'mossscarf'
  | 'whistle'
  | 'goggles'
  | 'bucket'
  | 'pennant'
  | 'hardhat'
  | 'aviator'
  | 'diving';
export type Slot = 'hat' | 'accessory' | 'outfit' | 'pet';
export type Tier = 'common' | 'rare' | 'wonder';
// `area`: a find, not a box's luck: it comes only from its own hidden place in the world (./tech.ts), or the hub if you missed it.
type Gift = { id: GiftId; name: string; line: string; parts: Part[]; slot?: Slot; tier?: Tier; area?: string };
// Each drawn at about the size it sits on the shelf, base at y = 0.
const overalls = (body: string, strap: string, trim: string): Part[] => [
  ['s', 0, -0.06, 0, 0.3, 0.36, 0.25, body],
  ['b', -0.15, 0.3, 0.2, 0.06, 0.34, 0.04, strap],
  ['b', 0.15, 0.3, 0.2, 0.06, 0.34, 0.04, strap],
  ['b', 0, 0.02, 0.26, 0.2, 0.14, 0.03, trim],
];
// New pieces carry no line yet: those wait for the owner's writing pass. Existing lines stay as they were.
const GIFTS: Gift[] = [
  {
    id: 'hat',
    slot: 'hat',
    tier: 'common',
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
    id: 'beanie',
    slot: 'hat',
    tier: 'common',
    name: 'A beanie',
    line: '',
    parts: [
      ['s', 0, 0.06, 0, 0.32, 0.26, 0.32, '#3f9a8a'],
      ['c', 0, 0.02, 0, 0.33, 0.12, 0.33, '#2f7d70'],
      ['s', 0, 0.34, 0, 0.08, 0.08, 0.08, '#fff0c9'],
    ],
  },
  {
    id: 'teacup',
    slot: 'hat',
    tier: 'wonder',
    name: 'A teacup',
    line: '',
    parts: [
      ['c', 0, 0.02, 0, 0.42, 0.04, 0.42, '#f4f1e8'],
      ['c', 0, 0.22, 0, 0.32, 0.36, 0.32, '#f4f1e8'],
      ['c', 0, 0.38, 0, 0.33, 0.05, 0.33, '#d8392b'],
      ['t', 0.38, 0.22, 0, 0.14, 0.2, 0.14, '#f4f1e8', Math.PI / 2],
    ],
  },
  {
    id: 'scarf',
    slot: 'accessory',
    tier: 'common',
    name: 'A very long scarf',
    line: 'Knitted by someone in the village, probably.',
    parts: [
      ['t', 0, 0.32, 0, 0.28, 0.22, 0.28, '#d8392b'],
      ['b', 0.14, 0.14, 0.26, 0.11, 0.42, 0.04, '#d8392b'],
      ['b', 0.14, 0.02, 0.26, 0.115, 0.06, 0.045, '#fff0c9'],
    ],
  },
  {
    id: 'glasses',
    slot: 'accessory',
    tier: 'common',
    name: 'Round glasses',
    line: '',
    parts: [
      ['t', -0.12, 0.16, 0.26, 0.09, 0.09, 0.09, '#24262c', Math.PI / 2],
      ['t', 0.12, 0.16, 0.26, 0.09, 0.09, 0.09, '#24262c', Math.PI / 2],
      ['b', 0, 0.17, 0.27, 0.08, 0.02, 0.02, '#24262c'],
    ],
  },
  {
    id: 'headphones',
    slot: 'accessory',
    tier: 'rare',
    name: 'Oversized headphones',
    line: '',
    parts: [
      ['c', -0.3, 0.12, 0, 0.13, 0.12, 0.13, '#e8392a', 0, Math.PI / 2],
      ['c', 0.3, 0.12, 0, 0.13, 0.12, 0.13, '#e8392a', 0, Math.PI / 2],
      ['b', 0, 0.35, 0, 0.5, 0.05, 0.08, '#24262c'],
      ['b', -0.27, 0.24, 0, 0.05, 0.22, 0.08, '#24262c'],
      ['b', 0.27, 0.24, 0, 0.05, 0.22, 0.08, '#24262c'],
    ],
  },
  {
    id: 'overalls',
    slot: 'outfit',
    tier: 'common',
    name: 'Work overalls',
    line: '',
    parts: overalls('#3f6fb0', '#34609c', '#2f5589'),
  },
  {
    id: 'raincoat',
    slot: 'outfit',
    tier: 'rare',
    name: 'A raincoat',
    line: '',
    parts: [
      ['s', 0, 0.06, 0, 0.31, 0.34, 0.26, '#f2c81a'],
      ['k', 0, -0.32, -0.01, 0.42, 0.62, 0.34, '#e8bc14'],
      ['b', 0, 0.04, 0.26, 0.04, 0.5, 0.03, '#3a3d44'],
    ],
  },
  {
    id: 'festival',
    slot: 'outfit',
    tier: 'wonder',
    name: 'Festival overalls',
    line: '',
    parts: [
      ...overalls('#ff5f8f', '#ffcf33', '#ffcf33'),
      ['b', -0.17, -0.1, 0.22, 0.12, 0.3, 0.05, '#4fb7ff'],
      ['b', 0.17, -0.1, 0.22, 0.12, 0.3, 0.05, '#62d67a'],
    ],
  },
  {
    id: 'critter',
    slot: 'pet',
    tier: 'rare',
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
  // What's hidden in each area (./tech-layout.ts, SECRETS). They carry no line yet either.
  {
    id: 'strawhat',
    slot: 'hat',
    tier: 'common',
    area: 'village',
    name: 'A straw hat',
    line: '',
    parts: [
      ['c', 0, 0.03, 0, 0.56, 0.04, 0.56, '#e6c76a'],
      ['c', 0, 0.16, 0, 0.27, 0.24, 0.27, '#e0bd5c'],
      ['c', 0, 0.1, 0, 0.28, 0.07, 0.28, '#c4453a'],
    ],
  },
  {
    id: 'lampcap',
    slot: 'hat',
    tier: 'common',
    area: 'timber',
    name: "A lamplighter's cap",
    line: '',
    parts: [
      ['s', 0, 0.1, 0, 0.32, 0.2, 0.32, '#5a4a3a'],
      ['b', 0, 0.03, 0.3, 0.3, 0.03, 0.2, '#463a2e'],
      ['s', 0, 0.2, 0.28, 0.07, 0.07, 0.05, '#ffd76a'],
    ],
  },
  {
    id: 'mossscarf',
    slot: 'accessory',
    tier: 'common',
    area: 'timber',
    name: 'A mossy scarf',
    line: '',
    parts: [
      ['t', 0, 0.32, 0, 0.28, 0.24, 0.28, '#5f8f3e'],
      ['b', -0.14, 0.14, 0.26, 0.11, 0.42, 0.04, '#4f7f36'],
    ],
  },
  {
    id: 'whistle',
    slot: 'accessory',
    tier: 'common',
    area: 'timber',
    name: 'A brass whistle on a cord',
    line: '',
    parts: [
      ['t', 0, 0.3, 0, 0.26, 0.05, 0.26, '#3a302c'],
      ['c', 0, 0.02, 0.26, 0.05, 0.16, 0.05, '#d9a23a', Math.PI / 2],
    ],
  },
  {
    id: 'goggles',
    slot: 'accessory',
    tier: 'rare',
    area: 'timber',
    name: 'Cable goggles',
    line: '',
    parts: [
      ['c', -0.13, 0.17, 0.26, 0.1, 0.06, 0.1, '#d9a23a', Math.PI / 2],
      ['c', 0.13, 0.17, 0.26, 0.1, 0.06, 0.1, '#d9a23a', Math.PI / 2],
      ['c', -0.13, 0.17, 0.29, 0.07, 0.02, 0.07, '#7fe0d0', Math.PI / 2],
      ['c', 0.13, 0.17, 0.29, 0.07, 0.02, 0.07, '#7fe0d0', Math.PI / 2],
      ['b', 0, 0.17, 0, 0.62, 0.05, 0.56, '#3a302c'],
    ],
  },
  {
    id: 'bucket',
    slot: 'hat',
    tier: 'common',
    area: 'tower',
    name: 'A bucket',
    line: '',
    parts: [
      ['c', 0, 0.17, 0, 0.33, 0.34, 0.33, '#9aa0a8'],
      ['t', 0, 0.34, 0, 0.33, 0.1, 0.33, '#7d838b'],
      ['t', 0, 0.42, 0, 0.3, 0.05, 0.3, '#5c6168'],
    ],
  },
  {
    id: 'pennant',
    slot: 'accessory',
    tier: 'rare',
    area: 'tower',
    name: 'A tower pennant',
    line: '',
    parts: [
      ['c', 0.06, 0.3, -0.26, 0.018, 1.0, 0.018, '#7f5630'],
      ['b', 0.26, 0.62, -0.26, 0.38, 0.22, 0.02, '#f0752c'],
    ],
  },
  {
    id: 'hardhat',
    slot: 'hat',
    tier: 'rare',
    area: 'quarry',
    name: 'A hard hat',
    line: '',
    parts: [
      ['s', 0, 0.08, 0, 0.34, 0.26, 0.34, '#f2c81a'],
      ['c', 0, 0.03, 0, 0.42, 0.03, 0.42, '#e8bc14'],
      ['b', 0, 0.24, 0, 0.06, 0.04, 0.5, '#d4aa10'],
    ],
  },
  {
    id: 'aviator',
    slot: 'hat',
    tier: 'rare',
    area: 'village',
    name: "An aviator's cap",
    line: '',
    parts: [
      ['s', 0, 0.08, 0, 0.33, 0.26, 0.33, '#7a4b28'],
      ['c', -0.3, -0.06, 0, 0.09, 0.05, 0.13, '#6a3f20', 0, Math.PI / 2],
      ['c', 0.3, -0.06, 0, 0.09, 0.05, 0.13, '#6a3f20', 0, Math.PI / 2],
      ['c', -0.12, 0.2, 0.25, 0.08, 0.05, 0.08, '#7fd0e0', Math.PI / 2],
      ['c', 0.12, 0.2, 0.25, 0.08, 0.05, 0.08, '#7fd0e0', Math.PI / 2],
    ],
  },
  {
    id: 'diving',
    slot: 'hat',
    tier: 'wonder',
    area: 'Far Head',
    name: 'A brass diving helmet',
    line: '',
    parts: [
      ['s', 0, 0.08, 0, 0.42, 0.42, 0.42, '#c79a3e'],
      ['c', 0, 0.1, 0.36, 0.17, 0.08, 0.17, '#3a302c', Math.PI / 2],
      ['c', 0, 0.1, 0.39, 0.13, 0.03, 0.13, '#7fd0e0', Math.PI / 2],
      ['c', 0, -0.3, 0, 0.46, 0.08, 0.46, '#8a6a2c'],
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
// The ladder's tool chests.
type Extra = 'axe' | 'pack';
const EXTRAS: Record<Extra, { name: string; line: string; parts: Part[] }> = {
  axe: {
    name: 'A proper axe',
    line: '',
    parts: [
      ['b', 0, 0.55, 0, 0.11, 1.3, 0.11, '#a9794c'],
      ['b', 0, 1.02, -0.2, 0.15, 0.38, 0.42, '#dfe4ec'],
      ['b', 0, 1.02, -0.43, 0.16, 0.46, 0.08, '#f2b134'],
    ],
  },
  pack: {
    name: 'A pack frame',
    line: '',
    parts: [
      ['b', -0.34, 0.65, 0, 0.09, 1.3, 0.09, '#c9a86a'],
      ['b', 0.34, 0.65, 0, 0.09, 1.3, 0.09, '#c9a86a'],
      ['b', 0, 0.2, 0, 0.8, 0.09, 0.09, '#a9794c'],
      ['b', 0, 1.2, 0, 0.8, 0.09, 0.09, '#a9794c'],
    ],
  },
};
const byId = (id: GiftId) => GIFTS.find((g) => g.id === id)!;
const geos = new Map<GiftId, THREE.BufferGeometry>();
const geoOf = (id: GiftId) => {
  let g = geos.get(id);
  if (!g) geos.set(id, (g = merged(byId(id).parts)));
  return g;
};
const extraGeos = new Map<Extra, THREE.BufferGeometry>();
const extraGeo = (id: Extra) => {
  let g = extraGeos.get(id);
  if (!g) extraGeos.set(id, (g = merged(EXTRAS[id].parts)));
  return g;
};
// The box each crate is, in the order they come. The first Rare box is after the first path (./layout.ts: stations 1 and 2 first).
const BOXES: Tier[] = ['common', 'common', 'rare', 'common', 'rare', 'common', 'wonder'];
/** Odds of what's in a box: Common, Rare, Wonder. */
const ODDS: Record<Tier, [number, number, number]> = {
  common: [0.6, 0.3, 0.1],
  rare: [0, 0.7, 0.3],
  wonder: [0, 0, 1],
};
const PITY = { firstWonderBy: 3, mostWithout: 5 };
const TIER_COLOR: Record<Tier, string> = { common: '#fff7e8', rare: '#8fd0ff', wonder: '#ffd76a' };
const TIER_MARKS: Record<Tier, string> = { common: '★', rare: '★★', wonder: '★★★' };
const REVEAL: Record<Tier, { shake: number; hold: number; fly: number }> = {
  common: { shake: 0.12, hold: 0.4, fly: 0.28 },
  rare: { shake: 0.18, hold: 0.8, fly: 0.32 },
  wonder: { shake: 0.3, hold: 1.3, fly: 0.4 },
};

// ---------------------------------------------------------------- the curio shelf
const SX = toWorld(SHELF.x),
  SZ = SHELF.z,
  SY = H(SX, SZ),
  COLS = 6,
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
const isFind = (g: Gift) => !!g.area;
GIFTS.filter((g) => !isFind(g)).forEach((g, k) => {
  const col = k % COLS,
    row = Math.floor(k / COLS);
  slots.set(g.id, { x: (col - (COLS - 1) / 2) * (WIDE / COLS), y: ROWS_Y[1 - row]! });
});
GIFTS.filter(isFind).forEach((g, k) => {
  const col = k % 5,
    row = Math.floor(k / 5);
  slots.set(g.id, { x: (col - 2) * (WIDE / 5), y: ROWS_Y[1 - row]! });
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
// The finders' bay, across the path from the wardrobe, in the village: what's hidden out there, under sheets until it's yours.
const FX = toWorld(FINDERS.x),
  FZ = FINDERS.z,
  FY = H(FX, FZ);
const finders = new THREE.Group();
finders.position.set(FX, FY, FZ);
finders.rotation.y = FINDERS.yaw;
scene.add(finders);
{
  const o = '#6a5a48',
    b = '#8f7a60';
  const frame = new THREE.Mesh(
    merged([
      ['b', 0, 1.3, -0.3, WIDE, 2.4, 0.1, '#4c4238'],
      ['b', -WIDE / 2, 1.3, 0, 0.18, 2.6, 0.7, o],
      ['b', WIDE / 2, 1.3, 0, 0.18, 2.6, 0.7, o],
      ['b', 0, 1.26, 0.04, WIDE, 0.1, 0.68, b],
      ['b', 0, 2.14, 0.04, WIDE, 0.1, 0.68, b],
      ['b', 0, 2.62, 0.04, WIDE + 0.5, 0.14, 1.1, o],
      ['b', 0, 2.76, 0, WIDE + 0.1, 0.16, 0.5, '#2fb7a0'],
    ]),
    giftMat,
  );
  frame.castShadow = frame.receiveShadow = true;
  finders.add(frame);
}
addStatic(
  { kind: 'box', hx: WIDE / 2 + 0.1, hy: 1.4, hz: 0.4 },
  { x: FX, y: FY + 1.4, z: FZ },
  new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, FINDERS.yaw),
);
addFoot(FX, FZ, FINDERS.yaw, WIDE / 2 + 0.3, 0.6);
const findReal = new THREE.Mesh(new THREE.BufferGeometry(), giftMat);
const findCover = new THREE.Mesh(new THREE.BufferGeometry(), sheetMat);
finders.add(findReal, findCover);
function drawBay(real: THREE.Mesh, cover: THREE.Mesh, list: Gift[]) {
  real.geometry.dispose();
  cover.geometry.dispose();
  const out = list.filter((g) => open_.has(g.id));
  const covered = list.filter((g) => !open_.has(g.id));
  real.visible = out.length > 0;
  cover.visible = covered.length > 0;
  if (out.length) real.geometry = merged(out.flatMap((g) => placed(g, g.parts)));
  // Under its sheet: the same shape, a little fuller, in cloth, with a skirt to the shelf.
  if (covered.length)
    cover.geometry = merged(
      covered.flatMap((g) => placed(g, [...g.parts, ['k', 0, 0.2, 0, 0.36, 0.4, 0.36, '#fff']])),
      1.12,
    );
}
function redrawShelf() {
  drawBay(
    shelfReal,
    shelfCover,
    GIFTS.filter((g) => !isFind(g)),
  );
  drawBay(findReal, findCover, GIFTS.filter(isFind));
}
redrawShelf();
const sheet = new THREE.Color('#ded5c2'),
  glint = new THREE.Color('#ffe9a8'),
  v = new THREE.Vector3();
function reveal(id: GiftId, show: boolean) {
  const q = slots.get(id)!;
  open_.add(id);
  redrawShelf();
  if (!show) return;
  (isFind(byId(id)) ? finders : shelf).localToWorld(v.set(q.x, q.y, 0.08));
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

// ---------------------------------------------------------------- what you wear, and who follows you
// One thing a slot, put on by a crate, swapped at the shelf. Each follows a bone but stays upright, in the avatar's space.
type Named = THREE.Object3D & { getObjectByName: (n: string) => THREE.Object3D | undefined };
const WEAR: Partial<Record<GiftId, { bone: string; y: number; z: number; scale: number }>> = {
  hat: { bone: 'Head', y: 0.33, z: 0, scale: 0.86 }, // brim down round the head, not perched on its crown
  beanie: { bone: 'Head', y: 0.3, z: 0, scale: 0.92 },
  teacup: { bone: 'Head', y: 0.42, z: 0, scale: 0.85 },
  scarf: { bone: 'neck_01', y: -0.2, z: 0, scale: 0.62 },
  glasses: { bone: 'Head', y: 0.03, z: 0.01, scale: 0.92 },
  headphones: { bone: 'Head', y: 0.08, z: 0, scale: 1 },
  overalls: { bone: 'spine_02', y: 0, z: 0, scale: 1 },
  raincoat: { bone: 'spine_02', y: 0, z: 0, scale: 1 },
  festival: { bone: 'spine_02', y: 0, z: 0, scale: 1 },
  strawhat: { bone: 'Head', y: 0.33, z: 0, scale: 0.9 },
  lampcap: { bone: 'Head', y: 0.31, z: 0, scale: 0.92 },
  mossscarf: { bone: 'neck_01', y: -0.2, z: 0, scale: 0.62 },
  whistle: { bone: 'neck_01', y: -0.2, z: 0, scale: 0.62 },
  goggles: { bone: 'Head', y: 0.1, z: 0.01, scale: 0.92 },
  bucket: { bone: 'Head', y: 0.3, z: 0, scale: 0.9 },
  pennant: { bone: 'spine_02', y: 0.1, z: 0, scale: 1 },
  hardhat: { bone: 'Head', y: 0.32, z: 0, scale: 0.92 },
  aviator: { bone: 'Head', y: 0.3, z: 0, scale: 0.92 },
  diving: { bone: 'Head', y: 0.22, z: 0, scale: 0.92 },
};
const on: Partial<Record<Slot, GiftId>> = {};
const worn = new Map<Slot, { id: GiftId; m: THREE.Mesh }>();
type ClothesSlot = 'hat' | 'accessory' | 'outfit';
export type PlaceClothes = Partial<Record<ClothesSlot, GiftId>>;
const clothesSlots: ClothesSlot[] = ['hat', 'accessory', 'outfit'];
const remoteClothes = new Map<
  string,
  { ids: PlaceClothes; avatar: THREE.Object3D | null; worn: Map<Slot, { id: GiftId; m: THREE.Mesh }> }
>();
const coopClothes = new URLSearchParams(location.search).get('coop') === '1';
addPresenceField('placeClothes', () => {
  const ids: PlaceClothes = {};
  for (const slot of clothesSlots) if (on[slot]) ids[slot] = on[slot];
  return coopClothes && Object.keys(ids).length ? ids : null;
});
onRemotePresence((r, pr) => {
  const ids: PlaceClothes = {};
  const value = pr.placeClothes;
  if (coopClothes && r.entered && value && typeof value === 'object' && !Array.isArray(value)) {
    for (const slot of clothesSlots) {
      const id = (value as Record<string, unknown>)[slot];
      const gift = GIFTS.find((g) => g.id === id && g.slot === slot);
      if (gift && WEAR[gift.id]) ids[slot] = gift.id;
    }
  }
  const entry = remoteClothes.get(r.peer) ?? { ids: {}, avatar: null, worn: new Map() };
  entry.ids = ids;
  remoteClothes.set(r.peer, entry);
});
function clearRemoteClothes(peer: string) {
  const entry = remoteClothes.get(peer);
  if (!entry) return;
  for (const { m } of entry.worn.values()) m.removeFromParent();
  remoteClothes.delete(peer);
}
onPeerRemoved((r) => clearRemoteClothes(r.peer));
function makeWorn(id: GiftId, avatar: THREE.Object3D) {
  const w = WEAR[id]!;
  const m = new THREE.Mesh(geoOf(id), giftMat);
  m.castShadow = true;
  m.scale.setScalar(w.scale);
  m.rotation.y = Math.PI;
  avatar.add(m);
  return m;
}
function putOn(id: GiftId | null, slot: Slot) {
  worn.get(slot)?.m.removeFromParent();
  worn.delete(slot);
  if (slot === 'pet') {
    crit.on = id === 'critter';
    critter.visible = crit.on;
  }
  if (id) on[slot] = id;
  else delete on[slot];
  const w = id ? WEAR[id] : null;
  const a = me.avatar;
  if (!id || !w || !a) return;
  const m = makeWorn(id, a);
  worn.set(slot, { id, m });
}
/** Each frame: on the avatar, upright, where the bone has got to in its clip. Works in the avatar's space, so a fast train
 * can't leave it a frame behind. */
function updateWorn(a: Named | null | undefined, items: Map<Slot, { id: GiftId; m: THREE.Mesh }>) {
  if (!a) return;
  a.updateWorldMatrix(true, false);
  for (const { id, m } of items.values()) {
    const w = WEAR[id]!;
    const bone = a.getObjectByName(w.bone);
    if (bone) a.worldToLocal(bone.getWorldPosition(m.position));
    else m.position.set(0, 0.9, 0);
    m.position.y += w.y;
    m.position.z += w.z;
  }
}
export const owned = (slot: Slot) => GIFTS.filter((g) => g.slot === slot && giftState.got.includes(g.id));
/** On to the next thing you own in this slot, or nothing. */
export function swapSlot(slot: Slot) {
  const list = owned(slot),
    k = list.findIndex((g) => g.id === on[slot]);
  const next = list[k + 1];
  putOn(next?.id ?? null, slot);
  pop(next ? 5 : 2, 0.5);
  saveHook();
}
const SLOT_X: Record<Slot, number> = { hat: -2, accessory: -0.7, outfit: 0.7, pet: 2 };
/** Where a slot's prompt stands on the shelf. */
export function shelfSpot(slot: Slot, out: THREE.Vector3) {
  return shelf.localToWorld(out.set(SLOT_X[slot], 1.8, 0.4));
}
const critter = new THREE.Mesh(geoOf('critter'), giftMat);
critter.visible = false;
critter.castShadow = true;
scene.add(critter);
const crit = { on: false, x: 0, y: 0, z: 0, yaw: 0, hop: 0, t: 0, riding: false };
const CRIT = { scale: 0.55, shoulderScale: 0.42, side: 0.3, up: 0.78 }; // small; and up on your shoulder, riding
function updateCritter(dt: number) {
  const b = me.body;
  if (!crit.on || !b) return;
  const p = b.interpolatedPosition;
  // On a train it hops up onto your shoulder and stays small: no chasing a train along the ground and through its wheels.
  if (carry.on) {
    const sx = p.x + Math.cos(me.yaw) * CRIT.side,
      sz = p.z - Math.sin(me.yaw) * CRIT.side,
      sy = p.y + CRIT.up;
    if (!crit.riding) crit.t = 0;
    crit.riding = true;
    crit.t = Math.min(1, crit.t + dt / 0.28); // the hop up
    const u = crit.t;
    crit.x += (sx - crit.x) * (u < 1 ? u : 1);
    crit.z += (sz - crit.z) * (u < 1 ? u : 1);
    crit.y += (sy - crit.y) * (u < 1 ? u : 1);
    crit.yaw = me.yaw + Math.PI;
    critter.position.set(crit.x, crit.y + (u < 1 ? Math.sin(u * Math.PI) * 0.7 : 0), crit.z);
    critter.rotation.y = crit.yaw;
    critter.scale.setScalar(CRIT.shoulderScale);
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
  critter.scale.set(CRIT.scale / sq, CRIT.scale * sq, CRIT.scale / sq);
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
// Each tier's box, so you can tell before you open it: its bands, one to three marks on the lid and the seal's shape.
const TIER_BAND: Record<Tier, string> = { common: '#c9a86a', rare: '#3f8ee0', wonder: GOLD };
const SEAL: Record<Tier, Part> = {
  common: ['s', 0, 1.1, 0, 0.13, 0.1, 0.13, RED],
  rare: ['b', 0, 1.14, 0, 0.17, 0.17, 0.17, '#3f8ee0', 0.785, 0.615],
  wonder: ['k', 0, 1.26, 0, 0.17, 0.42, 0.17, GOLD],
};
const MARKS: Record<Tier, number> = { common: 1, rare: 2, wonder: 3 };
const crateGeos = Object.fromEntries(
  (Object.keys(TIER_BAND) as Tier[]).map((t) => [
    t,
    merged([
      ...CRATE.filter((p) => p[1] === 0 && p[2] !== 1.1).map((p) =>
        p[7] === GOLD ? (p.map((q, k) => (k === 7 ? TIER_BAND[t] : q)) as Part) : p,
      ),
      SEAL[t],
      ...Array.from({ length: MARKS[t] }, (_, k): Part => [
        's',
        (k - (MARKS[t] - 1) / 2) * 0.24,
        0.8,
        0.53,
        0.07,
        0.07,
        0.03,
        '#fff0c9',
      ]),
    ]),
  ]),
) as Record<Tier, THREE.BufferGeometry>;
const TIER_GLOW: Record<Tier, ReturnType<typeof softGlow>> = {
  common: softGlow('#ffe9b0', 0.32, 'up'),
  rare: softGlow('#4fa8ff', 0.5, 'up'),
  wonder: softGlow('#ffb52e', 0.75, 'up'),
};
for (const g of Object.values(TIER_GLOW)) g.mat.blending = THREE.NormalBlending;
// A tool chest: iron bands, not gold, and a blue shaft over it. It isn't a surprise: it's the thing you were wishing for.
const CHEST: Part[] = [
  ['b', 0, 0.55, 0, 1.5, 1.1, 1, '#6d5136'],
  ['b', -0.5, 0.55, 0, 0.14, 1.14, 1.04, '#3a3d44'],
  ['b', 0.5, 0.55, 0, 0.14, 1.14, 1.04, '#3a3d44'],
  ['c', 0, 1.1, 0, 0.5, 1.5, 0.5, '#7f5f3f', 0, Math.PI / 2],
  ['b', 0, 0.75, 0.52, 0.22, 0.28, 0.06, '#f2b134'],
];
const chestGeo = merged(CHEST);
const chestGlow = softGlow('#7fd0ff', 0.5, 'up');
chestGlow.mat.blending = THREE.NormalBlending;
// The shaft over a waiting crate: soft all the time, reads from across the place, and it flares as the crate lands.
let crateFlare = 0;
const beamGeo = new THREE.CylinderGeometry(0.75, 1.1, 34, 12, 1, true).translate(0, 18.3, 0); // from over the crate's lid
/** What's in a crate: the next gift, or a rung of the ladder. */
export type Content = 'gift' | Extra | GiftId;
const isChest = (c: Content) => c === 'axe' || c === 'pack';
/** A find: its box says what it is, and it doesn't stand under a shaft for the whole place to see. */
const isFound = (c: Content) => c !== 'gift' && !isChest(c);
/** Boxes opened that count towards the order of the run's boxes: a find isn't one of them. */
const boxesGot = () => giftState.got.filter((id) => !isFind(byId(id))).length;
type Crate = {
  content: Content;
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
function makeCrate(x: number, y: number, z: number, from: THREE.Vector3 | null, content: Content = 'gift') {
  const chest = isChest(content);
  const tier = isFound(content)
    ? byId(content as GiftId).tier!
    : BOXES[Math.min(BOXES.length - 1, boxesGot() + crates.filter((c) => c.content === 'gift').length)]!;
  const mesh = new THREE.Mesh(chest ? chestGeo : crateGeos[tier], giftMat);
  mesh.castShadow = true;
  const beam = new THREE.Mesh(beamGeo, chest ? chestGlow.mat : TIER_GLOW[tier].mat);
  beam.position.set(x, y, z);
  beam.visible = !isFound(content);
  mesh.position.set(x, y, z);
  scene.add(mesh, beam);
  crates.push({ content, x, y, z, mesh, beam, t: from ? 0 : 1, from: from?.clone() ?? null, id: crateId++ });
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
  gift: { id: GiftId | Extra; name: string; line: string };
  content: Content;
  tier: Tier;
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
const BIG = 3;
export const showing = () => !!show;
export const giftState = {
  got: [] as GiftId[],
  dry: 0, // boxes in a row with no Wonder: saved, so a reload can't dodge the ceiling
  /** Crates waiting to be opened, as where they stand. */
  crates: () => crates.map((c) => ({ x: c.x, y: c.y, z: c.z, content: c.content })),
  count: () => crates.length,
};
/** What a crate does when it's opened, beyond the show: ./ladder.ts fills it in. */
export const prizeHooks = {
  /** `what`: a gift's id, or a rung of the ladder coming out of its chest. */
  opened: null as ((what: string) => void) | null,
  /** A find came out of its box (./tech.ts). */
  found: null as ((id: GiftId) => void) | null,
};
const inTier = (t: Tier) => GIFTS.filter((g) => g.tier === t && !isFind(g) && !giftState.got.includes(g.id));
/** What's in the next box. The first two are authored: a hat, then an accessory; then a Wonder; then an outfit if you've none. */
function nextGift(): GiftId | null {
  const n = boxesGot();
  if (n === 0) return 'hat';
  if (n === 1) return 'scarf';
  const box = BOXES[Math.min(BOXES.length - 1, n)]!;
  const firstWonder = !giftState.got.some((id) => byId(id).tier === 'wonder');
  let tier: Tier;
  if ((firstWonder && n + 1 >= PITY.firstWonderBy) || giftState.dry >= PITY.mostWithout) tier = 'wonder';
  else if (n === 3 && !giftState.got.some((id) => byId(id).slot === 'outfit')) return 'overalls';
  else {
    const [c, r] = ODDS[box];
    const roll = Math.random();
    tier = roll < c ? 'common' : roll < c + r ? 'rare' : 'wonder';
  }
  // That tier's run out: up a tier, then down.
  const order: Tier[] =
    tier === 'common'
      ? ['common', 'rare', 'wonder']
      : tier === 'rare'
        ? ['rare', 'wonder', 'common']
        : ['wonder', 'rare', 'common'];
  for (const t of order) {
    const these = inTier(t);
    if (these.length) return these[Math.floor(Math.random() * these.length)]!.id;
  }
  return null;
}
/** The machine hands a crate down at (x, y, z). */
export function deliver(x: number, y: number, z: number, from: THREE.Vector3 | null, content: Content = 'gift') {
  makeCrate(x, y, z, from, content);
}
/** A rung's chest goes: someone else opened it, or Start over. */
export function dropChest(id: Content) {
  for (const c of [...crates]) if (c.content === id && c.t !== -1) dropCrate(c);
}
/** Open the crate: bursts, shows what's in it, and sends it home. */
export function openCrate(c: { x: number; z: number }) {
  if (show) return;
  const crate = crates.find((q) => q.x === c.x && q.z === c.z);
  if (!crate) return;
  const content = crate.content;
  const id = content === 'gift' ? nextGift() : content;
  if (!id) return dropCrate(crate);
  crate.t = -1; // shaking
  const chest = isChest(content);
  const gift = chest ? { id, ...EXTRAS[content as Extra] } : byId(id as GiftId);
  if (!chest) {
    giftState.got.push(id as GiftId); // saved before the show: a reload mid-reveal keeps what you got
    // A find's outside the boxes' odds and their count of how long it's been since a Wonder.
    if (content === 'gift') giftState.dry = byId(id as GiftId).tier === 'wonder' ? 0 : giftState.dry + 1;
  }
  prizeHooks.opened?.(chest ? content : id);
  if (isFound(content)) prizeHooks.found?.(content as GiftId);
  show = {
    gift,
    content,
    tier: chest ? 'wonder' : byId(id as GiftId).tier!,
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
  shown.geometry = chest ? extraGeo(id as Extra) : geoOf(id as GiftId);
  saveHook();
}
let saveHook = () => {};
export const onGiftSaved = (fn: () => void) => void (saveHook = fn);
personalSlice('gifts', {
  get: () => ({
    got: giftState.got,
    dry: giftState.dry,
    on,
    crates: giftState.crates().filter((c) => c.content === 'gift'), // ./tech.ts puts the finds back
  }),
  set: (v) => {
    const j = (v ?? {}) as {
      got?: GiftId[];
      dry?: unknown;
      on?: Partial<Record<Slot, GiftId>>;
      crates?: { x: number; y: number; z: number; content?: Content }[];
    };
    snapGifts(
      Array.isArray(j.got) ? j.got : [],
      typeof j.dry === 'number' ? j.dry : 0,
      Array.isArray(j.crates) ? j.crates : [],
      j.on,
    );
  },
});
function target(out: THREE.Vector3) {
  const b = me.body;
  if (b) return out.set(b.position.x, b.position.y + 1.1, b.position.z);
  return out.set(show!.x, show!.y + 20, show!.z);
}
function wearIt(id: GiftId) {
  const g = byId(id);
  // An empty slot puts it on. Something you're wearing stays: it's on the shelf, to swap to.
  if (!g.slot || on[g.slot]) return;
  const b = me.body;
  if (id === 'critter' && b) {
    crit.x = b.position.x;
    crit.y = b.position.y - 0.5;
    crit.z = b.position.z;
  }
  putOn(id, g.slot);
}
function updateShow(dt: number) {
  const s = show;
  if (!s) return;
  s.t += dt;
  const { shake: SHAKE, hold: HOLD, fly: FLY } = REVEAL[s.tier];
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
    fanfare(s.tier === 'wonder' || s.n === 1);
    flash.visible = shaft.visible = true;
    flash.position.set(s.x, s.y + 0.9, s.z);
    shaft.position.set(s.x, s.y, s.z);
    shown.visible = true;
    tag.sprite.visible = true;
    const tier = !isChest(s.content) ? byId(s.gift.id as GiftId).tier : null;
    tag.set(s.gift.name, s.gift.line || (tier ? TIER_MARKS[tier] : ''), tier ? TIER_COLOR[tier] : TIER_COLOR.rare);
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
    if (!isChest(s.content)) reveal(s.gift.id as GiftId, near(SX, SZ));
  }
  const fu = Math.min(1, (u - HOLD) / FLY);
  target(v);
  shown.position.lerpVectors(s.from, v, fu * fu);
  shown.position.y += Math.sin(fu * Math.PI) * 2;
  shown.rotation.y += dt * 14;
  shown.scale.setScalar(BIG + (0.75 - BIG) * fu);
  if (fu < 1) return;
  shown.visible = false;
  sparkles(v.x, v.y, v.z, 26, 4);
  pop(7, 0.8);
  pop(5, 0.5);
  if (!isChest(s.content)) wearIt(s.gift.id as GiftId);
  show = null;
  saveHook();
}
const near = (x: number, z: number) => {
  const b = me.body;
  return !!b && Math.hypot(b.position.x - x, b.position.z - z) < 40;
};

// ---------------------------------------------------------------- saving and frames
/** Puts the gifts as a save says, with no show. */
export function snapGifts(
  got: GiftId[],
  dry: number,
  waiting: { x: number; y: number; z: number; content?: Content }[],
  wearing?: Partial<Record<Slot, GiftId>>,
) {
  while (crates.length) dropCrate(crates[0]!);
  open_.clear();
  redrawShelf();
  for (const q of worn.values()) q.m.removeFromParent();
  worn.clear();
  for (const k of Object.keys(on) as Slot[]) delete on[k];
  crit.on = false;
  critter.visible = false;
  show = null;
  shown.visible = flash.visible = shaft.visible = tag.sprite.visible = false;
  giftState.got = got.slice();
  giftState.dry = dry;
  for (const id of got) reveal(id, false);
  // What was on, or the last you got in each slot.
  pendingWear.clear();
  for (const id of got) {
    const g = byId(id);
    if (g.slot && !wearing?.[g.slot]) pendingWear.set(g.slot, id);
  }
  for (const k of Object.keys(wearing ?? {}) as Slot[]) pendingWear.set(k, wearing![k]!);
  for (const c of waiting) makeCrate(c.x, c.y, c.z, null, c.content ?? 'gift');
}
const pendingWear = new Map<Slot, GiftId>();
const bump = new THREE.Vector3();
export function nearestCrate(x: number, z: number, reach: number) {
  const y = me.body?.position.y;
  for (const c of crates) {
    if (c.t < 1) continue;
    // One up on a ledge isn't in reach from under it.
    if (y !== undefined && Math.abs(y - c.y) > 2.6) continue;
    if (Math.hypot(c.x - x, c.z - z) < reach) return { c, at: bump.set(c.x, c.y + 1.5, c.z) };
  }
  return null;
}
export function updateGifts(dt: number, now: number) {
  // The avatar may not be there yet on a reload.
  if (pendingWear.size && me.avatar) {
    for (const [slot, id] of pendingWear) {
      const w = WEAR[id];
      // The body arrives a moment after the avatar does.
      if (w && !(me.avatar as Named).getObjectByName(w.bone) && performance.now() < 8000) continue;
      putOn(id, slot);
      if (id === 'critter' && me.body) {
        crit.x = me.body.position.x;
        crit.y = me.body.position.y - 0.5;
        crit.z = me.body.position.z;
      }
      pendingWear.delete(slot);
    }
  }
  crateFlare = Math.max(0, crateFlare - dt / 1.6);
  TIER_GLOW.common.strength.value = 0.32 + crateFlare * crateFlare * 0.4;
  chestGlow.strength.value = 0.5 + Math.sin(now * 0.004) * 0.12;
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
  updateWorn(me.avatar as Named | null, worn);
  for (const [peer, entry] of remoteClothes) {
    const avatar = remotes.get(peer)?.avatar ?? null;
    if (entry.avatar !== avatar) {
      for (const { m } of entry.worn.values()) m.removeFromParent();
      entry.worn.clear();
      entry.avatar = avatar;
    }
    for (const slot of clothesSlots) {
      const id = entry.ids[slot];
      const existing = entry.worn.get(slot);
      if (existing && existing.id !== id) {
        existing.m.removeFromParent();
        entry.worn.delete(slot);
      }
      if (avatar && id && !entry.worn.has(slot)) entry.worn.set(slot, { id, m: makeWorn(id, avatar) });
    }
    updateWorn(avatar as Named | null, entry.worn);
  }
}
