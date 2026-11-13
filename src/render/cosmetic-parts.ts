// The cosmetics catalog: every wearable's name, line, slot, tier and shape, and where it sits when worn. Moved verbatim
// from Place's gifts.ts (docs/plans/place-retirement.md, T4); names and lines are the owner's, never edited here.
// Pure data with no three.js: the wardrobe (src/entities/wardrobe/), Place's crates and the shop all read it.
import { CONDUCTOR_HAT_FIT } from './head-clearance.ts';
import { T1_REWARD } from './t1-reward-parts.ts';

/** One coloured primitive: shape, position, scale, colour and optional tilts (built by Place's part-geometry.ts). */
export type PartShape = 's' | 'c' | 'k' | 'b' | 't' | 'tube' | 'brim' | 'vest' | 'bib' | 'strap' | 'packstrap';
export type Part = [
  shape: PartShape,
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
const BRASS = '#d9a23a';
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
  | 'diving'
  | 'paperhat'
  | 'bigbutton'
  | 'sandwich'
  | 'tallhat'
  | 'stationwhistle';
export type Slot = 'hat' | 'accessory' | 'outfit' | 'pet';
export type Tier = 'common' | 'rare' | 'wonder';
// `area`: a find, not a box's luck: it comes only from its own hidden place in the world (Place's tech.ts), or the hub if you missed it.
export type Gift = { id: GiftId; name: string; line: string; parts: Part[]; slot?: Slot; tier?: Tier; area?: string };
// Each drawn at about the size it sits on the shelf, base at y = 0.
const overalls = (body: string, strap: string, trim: string): Part[] => [
  ['vest', 0, -0.19, 0, 0.283, 0.19, 0.24, body],
  ['bib', 0, -0.015, 0, 0.283, 0.3, 0.248, body],
  ['bib', 0, -0.015, 0, 0.283, 0.3, 0.248, body, Math.PI],
  ['strap', -0.14, 0, 0, 1, 1, 1, strap],
  ['strap', 0.14, 0, 0, 1, 1, 1, strap],
  ['b', 0, -0.055, 0.246, 0.15, 0.11, 0.012, trim],
  ['s', -0.13, 0.065, 0.225, 0.022, 0.022, 0.012, BRASS],
  ['s', 0.13, 0.065, 0.225, 0.022, 0.022, 0.012, BRASS],
];
// New pieces carry no line yet: those wait for the owner's writing pass. Existing lines stay as they were.
export const GIFTS: Gift[] = [
  T1_REWARD,
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
      ['vest', 0, -0.14, 0, 0.32, 0.65, 0.27, '#f2c81a'],
      ['b', 0, -0.12, 0.27, 0.035, 0.4, 0.025, '#b38b16'],
      ['b', -0.16, -0.2, 0.245, 0.14, 0.13, 0.035, '#e0ac13'],
      ['b', 0.16, -0.2, 0.245, 0.14, 0.13, 0.035, '#e0ac13'],
      ['t', 0, 0.19, 0, 0.18, 0.1, 0.14, '#e0ac13'],
    ],
  },
  {
    id: 'festival',
    slot: 'outfit',
    tier: 'wonder',
    name: 'Festival overalls',
    line: '',
    parts: overalls('#ed6685', '#ed6685', '#ce4e70'),
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
  // What's hidden in each area (Place's tech-layout.ts, SECRETS). They carry no line yet either.
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
      ['c', 0, 0.02, 0.26, 0.05, 0.16, 0.05, BRASS, Math.PI / 2],
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
      ['c', -0.13, 0.17, 0.26, 0.1, 0.06, 0.1, BRASS, Math.PI / 2],
      ['c', 0.13, 0.17, 0.26, 0.1, 0.06, 0.1, BRASS, Math.PI / 2],
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
/** What the shop sells (Place's shop.ts): never in a box, and never counted with what boxes gave you, so the boxes' order doesn't move.
 * `price` is a real number that you don't pay. `after`: it arrives with that. */
export type Stock = Gift & { price: number; after?: 'forge' | 'trains' };
export const STOCK: Stock[] = [
  {
    id: 'paperhat',
    slot: 'hat',
    name: 'A paper work hat',
    line: '',
    price: 40_000_000,
    parts: [
      ['k', 0, 0.22, 0, 0.43, 0.44, 0.38, '#f4f1e8'],
      ['b', 0, 0.03, 0, 0.74, 0.07, 0.62, '#e4dfd2'],
      ['b', 0, 0.1, 0.33, 0.16, 0.08, 0.02, '#c4453a'],
    ],
  },
  {
    id: 'bigbutton',
    slot: 'accessory',
    name: 'A very large button',
    line: '',
    price: 8_000_000,
    parts: [
      ['c', 0, 0.14, 0.29, 0.17, 0.05, 0.17, '#e4574a', Math.PI / 2],
      ['c', 0, 0.14, 0.32, 0.11, 0.02, 0.11, '#fff0c9', Math.PI / 2],
    ],
  },
  {
    id: 'sandwich',
    slot: 'outfit',
    name: 'A sandwich board',
    line: '',
    price: 125_000_000,
    parts: [
      ['b', 0, -0.12, 0.33, 0.66, 0.92, 0.05, '#fff3d6'],
      ['b', 0, -0.12, -0.33, 0.66, 0.92, 0.05, '#fff3d6'],
      ['b', 0, 0.12, 0.36, 0.5, 0.14, 0.02, '#c4453a'],
      ['b', 0, -0.12, 0.36, 0.5, 0.14, 0.02, '#c4453a'],
      ['b', 0, -0.36, 0.36, 0.5, 0.14, 0.02, '#c4453a'],
      ['b', 0, 0.12, -0.36, 0.5, 0.14, 0.02, '#c4453a'],
      ['b', 0, -0.12, -0.36, 0.5, 0.14, 0.02, '#c4453a'],
      ['b', 0, -0.36, -0.36, 0.5, 0.14, 0.02, '#c4453a'],
      ['b', -0.2, 0.38, 0, 0.05, 0.03, 0.68, '#7f5630'],
      ['b', 0.2, 0.38, 0, 0.05, 0.03, 0.68, '#7f5630'],
    ],
  },
  {
    id: 'tallhat',
    slot: 'hat',
    name: 'A very tall hat',
    line: '',
    price: 900_000_000,
    after: 'forge',
    parts: [
      ['c', 0, 0.03, 0, 0.42, 0.05, 0.42, '#24262c'],
      ['c', 0, 0.62, 0, 0.27, 1.15, 0.27, '#24262c'],
      ['c', 0, 0.12, 0, 0.28, 0.1, 0.28, '#d8392b'],
    ],
  },
  {
    id: 'stationwhistle',
    slot: 'accessory',
    name: "A station master's whistle",
    line: '',
    price: 3_000_000_000,
    after: 'trains',
    parts: [
      ['t', 0, 0.3, 0, 0.26, 0.2, 0.26, '#3f6fb0'],
      ['c', 0, 0.02, 0.28, 0.06, 0.2, 0.06, BRASS, Math.PI / 2],
      ['s', 0, 0.02, 0.2, 0.09, 0.09, 0.09, BRASS],
    ],
  },
];
// The box each crate is, in the order they come. The first Rare box is after the first path (Place's layout.ts: stations 1 and 2 first).
export const BOXES: Tier[] = ['common', 'common', 'rare', 'common', 'rare', 'common', 'wonder'];
/** Odds of what's in a box: Common, Rare, Wonder. */
export const ODDS: Record<Tier, [number, number, number]> = {
  common: [0.6, 0.3, 0.1],
  rare: [0, 0.7, 0.3],
  wonder: [0, 0, 1],
};
export const PITY = { firstWonderBy: 3, mostWithout: 5 };
/** What's in box `n` (how many boxes were opened before it; the T1 hat and T2 scarf are boxes 0 and 1), a `box`-tier
 * box: the hat, then the scarf; then a Wonder by PITY.firstWonderBy or after PITY.mostWithout without one; the fourth
 * an outfit if you've none; else the box's odds. A tier that's run out goes up one, then down. Finds never come out of
 * a box, nor anything you've got. Place's gifts.ts nextGift, shared with the live game's station boxes. */
export function boxGift(
  n: number,
  box: Tier,
  got: readonly string[],
  dry: number,
  random: () => number = Math.random,
): GiftId | null {
  if (n === 0) return 'hat';
  if (n === 1) return 'scarf';
  const gift = (id: string) => GIFTS.find((g) => g.id === id);
  const firstWonder = !got.some((id) => gift(id)?.tier === 'wonder');
  let tier: Tier;
  if ((firstWonder && n + 1 >= PITY.firstWonderBy) || dry >= PITY.mostWithout) tier = 'wonder';
  else if (n === 3 && !got.some((id) => gift(id)?.slot === 'outfit')) return 'overalls';
  else {
    const [c, r] = ODDS[box];
    const roll = random();
    tier = roll < c ? 'common' : roll < c + r ? 'rare' : 'wonder';
  }
  const order: Tier[] =
    tier === 'common'
      ? ['common', 'rare', 'wonder']
      : tier === 'rare'
        ? ['rare', 'wonder', 'common']
        : ['wonder', 'rare', 'common'];
  for (const t of order) {
    const these = GIFTS.filter(
      (g) => g.tier === t && !g.area && g.id !== 'hat' && g.id !== 'scarf' && !got.includes(g.id),
    );
    if (these.length) return these[Math.floor(random() * these.length)]!.id;
  }
  return null;
}
// A box's look, so you can tell its tier before you open it: its bands, one to three marks on the lid and the seal's
// shape. Then how its card reads, and how long its lid rattles first. Moved from Place's gifts.ts.
const BOX_GOLD = '#f2b134',
  BOX_RED = '#d8392b';
const CRATE: Part[] = [
  ['b', 0, 0.5, 0, 1, 1, 1, '#b57f44'],
  ['b', 0, 0.5, 0, 1.04, 0.14, 1.04, BOX_GOLD],
  ['b', 0, 0.5, 0, 0.14, 1.04, 1.04, BOX_GOLD],
  ['b', 0, 0.5, 0, 1.04, 1.04, 0.14, BOX_GOLD],
  ['b', 0, 1.03, 0, 1.06, 0.06, 1.06, '#8a6236'],
];
const TIER_BAND: Record<Tier, string> = { common: '#c9a86a', rare: '#3f8ee0', wonder: BOX_GOLD };
const SEAL: Record<Tier, Part> = {
  common: ['s', 0, 1.1, 0, 0.13, 0.1, 0.13, BOX_RED],
  rare: ['b', 0, 1.14, 0, 0.17, 0.17, 0.17, '#3f8ee0', 0.785, 0.615],
  wonder: ['k', 0, 1.26, 0, 0.17, 0.42, 0.17, BOX_GOLD],
};
const MARKS: Record<Tier, number> = { common: 1, rare: 2, wonder: 3 };
/** A `tier` box's parts. */
export const crateParts = (tier: Tier): Part[] => [
  ...CRATE.map((p) => (p[7] === BOX_GOLD ? (p.map((q, k) => (k === 7 ? TIER_BAND[tier] : q)) as Part) : p)),
  SEAL[tier],
  ...Array.from({ length: MARKS[tier] }, (_, k): Part => [
    's',
    (k - (MARKS[tier] - 1) / 2) * 0.24,
    0.8,
    0.53,
    0.07,
    0.07,
    0.03,
    '#fff0c9',
  ]),
];
export const TIER_COLOR: Record<Tier, string> = { common: '#fff7e8', rare: '#8fd0ff', wonder: '#ffd76a' };
export const TIER_MARKS: Record<Tier, string> = { common: '★', rare: '★★', wonder: '★★★' };
/** How long the lid rattles before it goes. */
export const REVEAL_SHAKE: Record<Tier, number> = { common: 0.12, rare: 0.18, wonder: 0.3 };
// One thing a slot, put on by a crate, swapped at the shelf. The conductor follows Head rigidly; other items stay upright.
export const WEAR: Partial<Record<GiftId, { bone: string; y: number; z: number; scale: number }>> = {
  hat: { bone: 'Head', y: CONDUCTOR_HAT_FIT.buddySeat, z: 0, scale: CONDUCTOR_HAT_FIT.scale },
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
  paperhat: { bone: 'Head', y: 0.36, z: 0, scale: 0.92 },
  bigbutton: { bone: 'spine_02', y: 0, z: 0, scale: 1 },
  sandwich: { bone: 'spine_02', y: 0, z: 0, scale: 1 },
  tallhat: { bone: 'Head', y: 0.33, z: 0, scale: 0.86 },
  stationwhistle: { bone: 'neck_01', y: -0.22, z: 0, scale: 0.62 },
};

/** Every cosmetic: boxes and finds first, then the shop's stock (the wardrobe's catalog, ../entities/wardrobe/). */
export const COSMETICS: readonly Gift[] = [...GIFTS, ...STOCK];
const byId = new Map<string, Gift>(COSMETICS.map((g) => [g.id, g]));
/** A catalog entry by id, or undefined for anything not in it (receivers and saves validate with this). */
export const cosmetic = (id: unknown): Gift | undefined => (typeof id === 'string' ? byId.get(id) : undefined);
/** A catalog id that is worn on you in that slot (the pet slot's stowaway follows instead). */
export const wearableIn = (id: unknown, slot: Slot): id is GiftId => {
  const g = cosmetic(id);
  return g?.slot === slot && !!WEAR[g.id];
};
