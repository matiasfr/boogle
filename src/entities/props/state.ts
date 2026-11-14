// The island's scenery with no view: where each prop stands (src/blueprints/props.ts), the footprints things walk
// around, and the collider bodies. src/render/props.ts draws from the same placements.
import { collidersOf, footprintOf, type Sphere } from '../../blueprints/blueprint.ts';
import { isHomePalm, PROP_BLUEPRINTS, scatterProps, tileKey, type PropPlacement } from '../../blueprints/props.ts';
import { groundHeight } from '../../island/heights.ts';
import { island } from '../../island/index.ts';
import { clearedAt } from '../../island/layout.ts';
import { staticSpheresBody } from '../../physics/physics.ts';
import type { Body } from '../../physics/engine.ts';

/** A footprint on the ground plane. */
export type Obstacle = { x: number; z: number; r: number };

export const placements: PropPlacement[] = scatterProps({ groundHeight, keptOut: island.keptOut });

// Footprints of trees, rocks and POIs ({ x, z, r } on the ground plane), for things that walk around them. POIs keep
// their ground clear and are walked around. Push freely; blockedAt() re-indexes when the list grows.
export const obstacles: Obstacle[] = island.keepOut.map((k) => ({ x: k.x, z: k.z, r: k.r }));
for (const p of placements)
  if (isHomePalm(p) || !clearedAt(p.x, p.z))
    obstacles.push({ x: p.x, z: p.z, r: footprintOf(PROP_BLUEPRINTS[p.blueprint], p) });

const BUCKET = 16; // metres, spatial index cell for obstacles
let indexed = -1;
const buckets = new Map<number, Obstacle[]>();
const bkey = (bx: number, bz: number) => bx * 4096 + bz;
// True when (x, z) is within r + pad of an obstacle.
export function blockedAt(x: number, z: number, pad = 0) {
  if (indexed !== obstacles.length) {
    buckets.clear();
    // In every cell its disc touches: a farm's 32 m disc reaches well past the cells next to its centre.
    for (const o of obstacles)
      for (let a = Math.floor((o.x - o.r) / BUCKET); a <= Math.floor((o.x + o.r) / BUCKET); a++)
        for (let b = Math.floor((o.z - o.r) / BUCKET); b <= Math.floor((o.z + o.r) / BUCKET); b++) {
          const k = bkey(a, b);
          if (!buckets.has(k)) buckets.set(k, []);
          buckets.get(k)!.push(o);
        }
    indexed = obstacles.length;
  }
  const bx = Math.floor(x / BUCKET),
    bz = Math.floor(z / BUCKET);
  for (let a = bx - 1; a <= bx + 1; a++)
    for (let b = bz - 1; b <= bz + 1; b++) {
      const near = buckets.get(bkey(a, b));
      if (!near) continue;
      for (let k = 0; k < near.length; k++) {
        const o = near[k]!;
        const r = o.r + pad;
        if ((o.x - x) ** 2 + (o.z - z) ** 2 < r * r) return true;
      }
    }
  return false;
}

// A home palm has a body of its own. What a layout clears away has no collider.
function buildBodies() {
  const bodies: Body[] = [];
  const shapes = new Map<number, Sphere[]>();
  for (const p of placements) {
    const spheres = collidersOf(PROP_BLUEPRINTS[p.blueprint], p);
    if (isHomePalm(p)) {
      bodies.push(staticSpheresBody(spheres));
      continue;
    }
    if (clearedAt(p.x, p.z)) continue;
    const k = tileKey(p.x, p.z);
    if (!shapes.has(k)) shapes.set(k, []);
    shapes.get(k)!.push(...spheres);
  }
  for (const list of shapes.values()) bodies.push(staticSpheresBody(list));
  return bodies;
}
export const propBodies = buildBodies();
