// The island's scattered scenery as data: palms, round trees and rocks (./blueprint.ts). No three.js: src/entities/props/
// builds the colliders from this, src/render/props.ts draws it, and `npm run level-check` reads it.
//
// A placement is seeded, so scatterProps() gives every client the same list on the same ground. It draws everything a
// placement needs in one go, in the order the props have always drawn it. Each draw feeds the next one, so adding or
// reordering a single draw here moves everything after it.
import { COURT, HALF, SPAWN } from '../constants.ts';
import { MASSIF } from '../island/shape.ts';
import { mulberry32 } from '../sim/rng.ts';
import type { Blueprint, Lean, Placement } from './blueprint.ts';

export const TRUNK_SEGMENTS = 7;

// Props are split into TILE-metre tiles: the view's merged meshes, so the camera and the shadow pass skip the ones out
// of view, and the colliders, merged into one body per tile (the physics step pays per body).
const TILE = 64;
export const tileKey = (x: number, z: number) => Math.floor((x + HALF) / TILE) * 4096 + Math.floor((z + HALF) / TILE);

export const PROP_BLUEPRINTS: Record<PropPlacement['blueprint'], Blueprint> = {
  palm: {
    footprint: 0.5,
    colliders: [{ shape: 'trunk', segments: TRUNK_SEGMENTS, r: 0.32, lift: 0.25 }],
  },
  broadleaf: {
    footprint: 0.45,
    colliders: [
      { shape: 'sphere', y: 0.4, r: 0.3 },
      { shape: 'sphere', y: 1.2, r: 0.3 },
    ],
  },
  rock: { footprint: 0.95, wet: true, colliders: [{ shape: 'sphere', y: 0.1, r: 0.82 }] },
};

export type PalmLook = { fronds: { angle: number; droop: number }[] };
export type BroadleafLook = { height: number; crown: number; blobs: { angle: number; spin: number[] }[] };
export type RockLook = { spin: number[]; dark: boolean };
export type PropPlacement =
  | (Placement<PalmLook> & { blueprint: 'palm'; lean: Lean; look: PalmLook; home?: boolean })
  | (Placement<BroadleafLook> & { blueprint: 'broadleaf'; look: BroadleafLook })
  | (Placement<RockLook> & { blueprint: 'rock'; size: number; look: RockLook });
/** Home palms are the wood age's log spots: a layout's `clear` leaves them standing, and each has a body of its own. */
export const isHomePalm = (p: PropPlacement) => p.blueprint === 'palm' && !!p.home;

/** What the scatter asks of the island. */
export type ScatterGround = {
  groundHeight: (x: number, z: number) => number;
  keptOut: (x: number, z: number, pad?: number) => boolean;
  /** Keep the original scenery layout during the low-island comparison; reproject its heights. */
  placementGroundHeight?: (x: number, z: number) => number;
};

type Rng = () => number;
const palm = (x: number, z: number, h: number, rng: Rng): PropPlacement & { blueprint: 'palm' } => {
  const lean = { angle: rng() * Math.PI * 2, amount: 0.18 + rng() * 0.3, height: 4.4 + rng() * 2.2 };
  const count = 7 + Math.floor(rng() * 2);
  const fronds = [];
  for (let k = 0; k < count; k++) {
    const angle = (k / count) * Math.PI * 2 + rng() * 0.4;
    fronds.push({ angle, droop: 0.25 + rng() * 0.45 });
  }
  for (let k = 0; k < 3; k++) rng(); // these three once chose nothing, but they feed the seeded layout after them
  return { blueprint: 'palm', x, z, h, lean, look: { fronds } };
};
const spin = (rng: Rng) => [rng() * 3, rng() * 3, rng() * 3];
const rock = (x: number, z: number, h: number, size: number, rng: Rng): PropPlacement => {
  const look = { spin: spin(rng), dark: rng() >= 0.5 };
  return { blueprint: 'rock', x, z, h, size, look };
};
const broadleaf = (x: number, z: number, h: number, rng: Rng): PropPlacement => {
  const height = 2.2 + rng() * 1.6,
    crown = 1.6 + rng() * 1.1;
  const blobs = [];
  for (let k = 0; k < 3; k++) {
    const angle = rng() * Math.PI * 2;
    blobs.push({ angle, spin: spin(rng) });
  }
  return { blueprint: 'broadleaf', x, z, h, look: { height, crown, blobs } };
};

/** Every prop, in a fixed order: home palms, home rocks, then the mainland's palms, round trees and rocks. */
export function scatterProps({
  groundHeight,
  keptOut,
  placementGroundHeight = groundHeight,
}: ScatterGround): PropPlacement[] {
  const surfaceHeight = groundHeight;
  groundHeight = placementGroundHeight;
  const out: PropPlacement[] = [];
  const flatEnough = (x: number, z: number, h: number, max: number) =>
    Math.abs(groundHeight(x + 1, z) - h) <= max && Math.abs(groundHeight(x, z + 1) - h) <= max;

  // Home: the original palms and rocks, from the same seed and in the same order as always.
  const rng = mulberry32(20261028);
  // The meadow stays open: this rectangle also keeps the seeded sequence, so every home palm and rock stays where it is.
  const clear = (x: number, z: number, r: number) =>
    Math.hypot(x - SPAWN.x, z - SPAWN.z) > r &&
    Math.hypot(x - COURT.x, z - COURT.z) > COURT.r + 3 &&
    !(x > 11.5 && x < 45.5 && z > -13 && z < 19) &&
    !keptOut(x, z, 2);
  const spots: { x: number; z: number; h: number }[] = [];
  for (let tries = 0; tries < 900 && spots.length < 36; tries++) {
    const x = (rng() * 2 - 1) * 62,
      z = (rng() * 2 - 1) * 58;
    const h = groundHeight(x, z);
    if (h < 0.9 || h > 6.5 || !clear(x, z, 9)) continue;
    if (!flatEnough(x, z, h, 0.7)) continue;
    if (spots.some((t) => Math.hypot(t.x - x, t.z - z) < 4.5)) continue;
    spots.push({ x, z, h });
  }
  for (const t of spots) out.push({ ...palm(t.x, t.z, t.h, rng), home: true });
  let rocks = 0;
  for (let tries = 0; tries < 600 && rocks < 22; tries++) {
    const x = (rng() * 2 - 1) * 60,
      z = (rng() * 2 - 1) * 56;
    const h = groundHeight(x, z);
    if (h < -1.2 || h > 8 || !clear(x, z, 8)) continue;
    if (spots.some((t) => Math.hypot(t.x - x, t.z - z) < 3)) continue;
    const size = 0.6 + rng() * 1.3;
    out.push(rock(x, z, h, size, rng));
    rocks++;
  }

  // Mainland: palms along the coasts, round trees in the meadows, boulders (more of them up on the massif).
  const wild = mulberry32(20261029);
  // Beyond the home island's shore, clear of spawn, the court and home's own palms.
  const outsideHome = (x: number, z: number) =>
    x * x + z * z > 48 * 48 && clear(x, z, 9) && !spots.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 16);
  const onMassif = (x: number, z: number) =>
    ((x - MASSIF.x) / MASSIF.rx) ** 2 + ((z - MASSIF.z) / MASSIF.rz) ** 2 < 1.5;
  const taken: { x: number; z: number }[] = [];
  const spaced = (x: number, z: number, d: number) => !taken.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < d * d);
  const place = (
    count: number,
    tries: number,
    test: (x: number, z: number, h: number) => boolean,
    add: (x: number, z: number, h: number) => PropPlacement,
  ) => {
    for (let n = 0, k = 0; k < tries && n < count; k++) {
      const x = (wild() * 2 - 1) * 140,
        z = -40 + (wild() * 2 - 1) * 110;
      const h = groundHeight(x, z);
      if (!outsideHome(x, z) || keptOut(x, z, 3) || !test(x, z, h)) continue;
      taken.push({ x, z });
      out.push(add(x, z, h));
      n++;
    }
  };
  place(
    55,
    6000,
    (x, z, h) => h > 0.9 && h < 3.2 && flatEnough(x, z, h, 0.7) && spaced(x, z, 5),
    (x, z, h) => palm(x, z, h, wild),
  );
  place(
    70,
    6000,
    (x, z, h) => h > 2.4 && h < 15 && flatEnough(x, z, h, 0.9) && spaced(x, z, 6.5),
    (x, z, h) => broadleaf(x, z, h, wild),
  );
  place(
    55,
    4000,
    (x, z, h) => h > 0.4 && (onMassif(x, z) ? wild() < 0.9 : wild() < 0.3) && spaced(x, z, 3.5),
    (x, z, h) => rock(x, z, h, 0.6 + wild() * (onMassif(x, z) ? 2.2 : 1.3), wild),
  );
  return surfaceHeight === groundHeight ? out : out.map((p) => ({ ...p, h: surfaceHeight(p.x, p.z) }));
}
