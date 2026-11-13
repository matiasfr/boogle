// The land the server's world runs on (docs/plans/server-host.md, "Land on the server"): src/world/home-land.json,
// pinned by dev/scenarios/world-inputs.ts in the running game. The rules need only { n, layout }.
//
//   const { land } = loadHomeLand()
import fs from 'node:fs';
import { heightIn } from '../../../src/world/heights.ts';
import { GRID_RES } from '../../../src/world/grid.ts';
import type { BooglerLand, BooglerLandBake } from '../../../src/world/boogler-land.ts';

const HOME_LAND = new URL('../../../src/world/home-land.json', import.meta.url);
const BOOGLER_LAND = new URL('../../../src/world/boogler-land.json', import.meta.url);

export type HomeLand = { land: { n: number; layout: Record<string, unknown> } };

export function loadHomeLand(file: URL | string = HOME_LAND): HomeLand {
  const { n, layout } = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { land: { n, layout } };
}

/** Read once when installing the future server brain; step 3 does not install or run it. */
export function loadBooglerLand(file: URL | string = BOOGLER_LAND): BooglerLand {
  const bake = JSON.parse(fs.readFileSync(file, 'utf8')) as BooglerLandBake;
  if (bake.n !== GRID_RES || typeof bake.heights !== 'string') throw new Error('Boogler land: invalid grid');
  const bytes = Buffer.from(bake.heights, 'base64');
  if (bytes.length !== bake.n * bake.n * 2) throw new Error('Boogler land: invalid heights');
  const columns = Array.from({ length: bake.n }, (_, i) =>
    Array.from({ length: bake.n }, (_, j) => bytes.readInt16LE((i * bake.n + j) * 2) / 100),
  );
  const discs = (list: [number, number, number][]) => {
    if (!Array.isArray(list)) throw new Error('Boogler land: invalid discs');
    return list.map((disc) => {
      if (!Array.isArray(disc) || disc.length !== 3 || !disc.every(Number.isFinite) || disc[2] < 0)
        throw new Error('Boogler land: invalid disc');
      const [x, z, r] = disc;
      return { x, z, r };
    });
  };
  const obstacles = discs(bake.obstacles);
  const keepOut = discs(bake.keepOut);
  const mainland = bake.mainland;
  if (!mainland || ![mainland.x, mainland.z, mainland.rx, mainland.rz].every(Number.isFinite))
    throw new Error('Boogler land: invalid mainland');

  // Same disc index as client blockedAt: include every bucket a footprint touches, not just its centre.
  const BUCKET = 16;
  const buckets = new Map<number, typeof obstacles>();
  const key = (x: number, z: number) => x * 4096 + z;
  for (const o of obstacles)
    for (let x = Math.floor((o.x - o.r) / BUCKET); x <= Math.floor((o.x + o.r) / BUCKET); x++)
      for (let z = Math.floor((o.z - o.r) / BUCKET); z <= Math.floor((o.z + o.r) / BUCKET); z++) {
        const k = key(x, z);
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k)!.push(o);
      }
  return {
    height: (x, z) => heightIn(columns, x, z),
    blocked(x, z, pad = 0) {
      const bx = Math.floor(x / BUCKET),
        bz = Math.floor(z / BUCKET);
      const reach = Math.max(1, Math.ceil(pad / BUCKET));
      for (let a = bx - reach; a <= bx + reach; a++)
        for (let b = bz - reach; b <= bz + reach; b++)
          for (const o of buckets.get(key(a, b)) ?? []) {
            const r = o.r + pad;
            if ((o.x - x) ** 2 + (o.z - z) ** 2 < r * r) return true;
          }
      return false;
    },
    keepOut,
    mainland,
  };
}
