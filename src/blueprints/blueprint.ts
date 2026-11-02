// A blueprint is a kind of static world object as data: what it collides with and how much ground it takes,
// kept apart from how it's drawn. A placement is one of them in the world, also data. Neither knows about three.js, so
// the game, a headless run and `npm run level-check` read the same thing (docs/research/level-design.md).
//
//   const rock: Blueprint = { footprint: 0.95, wet: true, colliders: [{ shape: 'sphere', y: 0.1, r: 0.82 }] };
//   collidersOf(rock, { blueprint: 'rock', x, z, h, size: 1.4 })   the spheres, in world metres
//
// Distances in a blueprint are metres at size 1 and scale with the placement's `size`; a `trunk` depends on its lean.

/** A collider sphere in world metres: what staticSpheresBody takes. */
export type Sphere = { x: number; y: number; z: number; r: number };

export type Collider =
  /** A sphere over the placement, `y` above the ground. */
  | { shape: 'sphere'; y: number; r: number }
  /** Spheres climbing a leaning trunk (`trunkPoints`), each `lift` above its joint. */
  | { shape: 'trunk'; segments: number; r: number; lift: number };

export type Blueprint = {
  /** Radius of the ground it takes, for what walks around it and for overlap checks. */
  footprint: number;
  colliders: Collider[];
  /** May stand below sea level (a rock on the wet sand). Otherwise `npm run level-check` reports it. */
  wet?: boolean;
};

/** One object in the world. `look` is the seeded numbers its drawing uses; nothing but the drawing reads it. */
export type Placement<Look = unknown> = {
  blueprint: string;
  x: number;
  z: number;
  h: number; // the ground's height under it
  size?: number;
  lean?: Lean;
  look?: Look;
};

/** How a trunk leans: towards `angle` (radians), `amount` of its `height` at the top. */
export type Lean = { angle: number; amount: number; height: number };

/** The joints of a leaning trunk, from just under the ground to its top. */
export function trunkPoints(x: number, h: number, z: number, lean: Lean, segments: number) {
  const points = [{ x, y: h - 0.3, z }];
  for (let k = 0; k < segments; k++) {
    const f = (k + 1) / segments;
    const off = lean.amount * f * f * lean.height;
    points.push({ x: x + Math.cos(lean.angle) * off, y: h + f * lean.height, z: z + Math.sin(lean.angle) * off });
  }
  return points;
}

/** A placement's collider spheres in world metres. */
export function collidersOf(bp: Blueprint, p: Placement): Sphere[] {
  const size = p.size ?? 1;
  const out: Sphere[] = [];
  for (const c of bp.colliders) {
    if (c.shape === 'sphere') {
      out.push({ x: p.x, y: p.h + c.y * size, z: p.z, r: c.r * size });
    } else {
      const points = trunkPoints(p.x, p.h, p.z, p.lean!, c.segments);
      for (let k = 0; k < c.segments; k++) out.push({ ...points[k]!, y: points[k]!.y + c.lift, r: c.r });
    }
  }
  return out;
}

/** A placement's footprint radius. */
export const footprintOf = (bp: Blueprint, p: Placement) => bp.footprint * (p.size ?? 1);
