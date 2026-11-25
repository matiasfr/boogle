// The west cove, the arrival shore: the ground's shape there, static Local geometry, never lockstep state. One metre per
// unit, Y up. Original code recipe; references: docs/plans/terrain-pilot.md. Its bluff is ground (coveBluff); the cliff
// kit's shore faces stand over its front (dev/prefab/cliff-kit-shore.ts; docs/plans/cliff-kit-everywhere.md, step 1).
import { smoothstep } from '../math.ts';

export const coveFront = (z: number) =>
  -192 - 5 * Math.sin(((Math.max(42, Math.min(66, z)) - 42) * Math.PI) / 24) + 0.12 * Math.max(0, z - 66) ** 2;

/** Fade is separate from corridor protection, supplied by the finished terrain owner. */
export function coveWeight(x: number, z: number) {
  return (
    smoothstep(-216, -208, x) * (1 - smoothstep(-166, -154, x)) * smoothstep(30, 38, z) * (1 - smoothstep(68, 80, z))
  );
}

export function coveGround(x: number, z: number) {
  const across = x - coveFront(z);
  // Continuous submerged bench, then the beach in front of the bluff.
  const shelf = -1.8 + 1.2 * smoothstep(-16, -5, across);
  // Spread the first 0.3 m of run-up over about 1.8 m, rather than squeezing it onto
  // the old 2.3 m-high pocket wall. The dry back beach meets the bluff's foot.
  const beach = -0.45 + 1.1 * smoothstep(-13, -3, across);
  const pocket = smoothstep(-18, -13, across) * (1 - smoothstep(42, 48, z));
  const bed = shelf + (beach - shelf) * pocket;
  // The backing soil meets the bluff's top a little under it; the bluff is ground too (coveBluff).
  const soil = bed + (coveCrest(z) - 0.2 - bed) * smoothstep(1.8, 5.5, across) + 14 * smoothstep(8, 35, across);
  return Math.max(soil, coveBluff(x, z));
}

/** The bluff's top height along it: up from under the sand at z 34 to 1.7 m at z 38, then to 4.5 m by z 48. */
function coveCrest(z: number) {
  return z < 38
    ? -1.08 + 2.78 * smoothstep(34, 38, z)
    : 1.7 + 2.78 * smoothstep(38, 48, z) + 0.06 * Math.sin((z - 42) * 0.15) * smoothstep(38, 48, z);
}

/** The cove bluff's front line (the sculpted face's front until 24 November): where its rise from the beach tops out.
 * South of z 50 it swings out west to the walkable end. */
export function coveEdge(z: number) {
  return z < 38
    ? -199 + 3.5 * smoothstep(34, 38, z)
    : z < 50
      ? -195.5 + (coveFront(50) + 195.5) * smoothstep(38, 50, z)
      : coveFront(z);
}
function coveRear(z: number) {
  const toe = smoothstep(34, 42, z);
  return z < 42 ? -196.6 + 10.4 * toe : coveFront(z) + 5.8;
}
/** The bluff as ground: the walk the sculpted face's top carried, now the heightfield's (docs/plans/cliff-kit-everywhere.md,
 * step 1). Its front rises steeply from under the sand to its top within 2.5 m, where the kit's sea-cliff faces stand
 * over it; at the beachward end (south of z 51) it rolls up broad, a quarter-ellipse 5.5 m wide, so the end from the
 * sand at z 34 to 36 up to its 1.7 m top at z 38 and on up to 4.5 m by z 48 is walked on ground, never on a kit top.
 * Behind its back edge it falls to the ground behind (the pocket's water at its walkable end, the soil beyond). */
export function coveBluff(x: number, z: number) {
  if (z < 33 || z > 75) return -Infinity;
  const d = x - coveEdge(z),
    rear = coveRear(z);
  // The face's profile as the sculpted face had it: each height fraction h stood at d = across(h) from its front, a
  // steep face blended toward a broad quarter-ellipse south of z 51, blended in d, not in height. Solved for h.
  const broad = 1 - smoothstep(42, 51, z);
  // The broad end's top reaches 0.6 m further out than the sculpted face's did: a walker on its west lip keeps footing.
  const across = (f: number) => -2 + 2.5 * f + (-0.1 - 5.5 * Math.sqrt(1 - f) - (-2 + 2.5 * f)) * broad;
  let h = 0,
    hi = 1;
  if (d >= across(1)) h = 1;
  else if (d > across(0))
    for (let k = 0; k < 24; k++) {
      const mid = (h + hi) / 2;
      if (across(mid) < d) h = mid;
      else hi = mid;
    }
  // Its far end tucks under the beach there by z 74, as the sculpted face's did.
  const end = 1 - smoothstep(69, 74, z);
  return -2.4 + (coveCrest(z) + 2.4) * h * end * smoothstep(rear + 1.5, rear - 0.5, x);
}
