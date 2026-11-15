// Authored tree identities and sizes, shared by the legacy and production renderers.
// Finite production balances use the separately pinned integer railway catalog.
import { mulberry32 } from '../sim/rng.ts';
import { GREAT_TREE, GROVES, OAK, ORIGIN } from './layout.ts';
import { LAND_TREES, shoreTreeCleared } from './tree-catalog.ts';
import { treeSeat } from './support.ts';
import type { TreeRoot } from '../render/tree-roots.ts';
export type TreeSource = {
  index: number;
  root: TreeRoot;
  x: number;
  y: number;
  z: number;
  size: number;
  great: boolean;
  hardwood: boolean;
  cleared: boolean;
};
import type { Placement, SceneryGenerator } from '../prefab/types.ts';
const source = (x: number, z: number, size: number, great = false, hardwood = false): TreeSource => {
  const root = treeSeat({ x, z, size, great: false, hardwood });
  return { index: 0, x, z, y: root.top, root, size, great, hardwood, cleared: shoreTreeCleared(x, z, size) };
};
/** LAND_TREES stays the catalog authority; ids are assigned before scenery clearance as before. */
export function treePlacements(generator: SceneryGenerator): Placement[] {
  if (generator.name !== 'land-trees' || generator.seeds[0] !== 31)
    throw new Error('prefabs: land tree planting seed must match the frozen catalog');
  const rng = mulberry32(generator.seeds[1]!);
  const sources: readonly TreeSource[] = [
    ...GROVES.flatMap((g) =>
      Array.from({ length: g.n }, (_, k) => {
        const a = (k / g.n) * Math.PI * 2 + rng() * 0.5,
          r = g.r * (0.35 + rng() * 0.65);
        return source(g.x + Math.cos(a) * r + ORIGIN.x, g.z + Math.sin(a) * r + ORIGIN.z, 0.9 + rng() * 0.3);
      }),
    ),
    source(OAK.x + ORIGIN.x, OAK.z + ORIGIN.z, 1.1),
    source(GREAT_TREE.x + ORIGIN.x, GREAT_TREE.z + ORIGIN.z, 2.1, true),
  ]
    .map((t, index) => ({ ...t, index }))
    .concat(LAND_TREES.map((t) => ({ ...source(t.x, t.z, t.size, false, t.hardwood), index: t.id })));
  return sources.map((t) => ({
    id: String(t.index),
    prefab: 'scenery.tree',
    pos: [t.x, t.y, t.z],
    scale: [t.size, t.size, t.size],
    params: { index: t.index, root: t.root, great: t.great, hardwood: t.hardwood, cleared: t.cleared },
  }));
}
