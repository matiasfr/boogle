// The leaf's counterweight bracket, pure numbers in the leaf's local frame (docs/plans/ring-island-build1.md, R2c and
// R4c; owner, 11 November: "what are the stones in the middle of the tracks?"). Local +z runs from the heel (the hinge)
// toward the toe, +x across the formation from its middle, +y out of the top face, whose rails are at y 0.15; the plate's
// underside is y -0.8. The cradle and the four weights hang UNDER the plate, so nothing sits on the running line once the
// leaf is down; raised, the underside faces the railhead's jib, where the weights are hung. Pure: no three.js.
import { RING_FORMATION, RING_GAP } from '../../sim/railway-ring-layout.ts';

/** The leaf's length, and the bracket's place along it (m from the hinge). */
export const LEAF_LEN = RING_GAP.leaf / 100;
export const BRACKET_Z = LEAF_LEN * 0.3;
/** The plate's underside, and the tracks' x in the leaf's frame (the middle of the formation is x 0). */
export const PLATE_BOTTOM = -0.8;
export const TRACK_X = RING_FORMATION.tracks.map((t) => (t - RING_FORMATION.mid) / 100);
/** The formation's width, and the weights' x slots (m), 1.6 apart. */
export const FORM_W = (RING_FORMATION.right - RING_FORMATION.left) / 100;
export const WEIGHT_X = [-2.4, -0.8, 0.8, 2.4] as const;

export type Solid = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };
const solid = (cx: number, cy: number, cz: number, w: number, h: number, d: number): Solid => ({
  x0: cx - w / 2,
  x1: cx + w / 2,
  y0: cy - h / 2,
  y1: cy + h / 2,
  z0: cz - d / 2,
  z1: cz + d / 2,
});

/** One weight (a footing): 1.4 by 1.0 by 1.4 m, hung 0.4 m under the cradle. */
export const WEIGHT = { w: 1.4, h: 1.0, d: 1.4, y: -2.1 } as const;
/** The cradle: a bar across the underside, and a short hanger to each weight. */
export const CRADLE = { w: FORM_W - 1.2, h: 0.3, d: 0.6, y: -0.95 } as const;
export const HANGER = { w: 0.14, d: 0.14, y: -1.4, h: 0.8 } as const;

export const cradleSolid = () => solid(0, CRADLE.y, BRACKET_Z, CRADLE.w, CRADLE.h, CRADLE.d);
export const hangerSolids = () => WEIGHT_X.map((x) => solid(x, HANGER.y, BRACKET_Z, HANGER.w, HANGER.h, HANGER.d));
export const weightSolids = () => WEIGHT_X.map((x) => solid(x, WEIGHT.y, BRACKET_Z, WEIGHT.w, WEIGHT.h, WEIGHT.d));
/** Everything the bracket draws that is solid. */
export const bracketSolids = () => [cradleSolid(), ...hangerSolids(), ...weightSolids()];

/** The loading gauge over each track, in the leaf's frame: half a train's width plus clearance either side of the track's
 * centre, from the rail's top up (a car's body is 2.2 m wide with its bottom 0.4 m up: src/entities/railway/car.ts). */
export const GAUGE = { half: 1.4, y0: 0.15, y1: 4.5 } as const;
export const gaugeBoxes = (): Solid[] =>
  TRACK_X.map((x) => ({ x0: x - GAUGE.half, x1: x + GAUGE.half, y0: GAUGE.y0, y1: GAUGE.y1, z0: 0, z1: LEAF_LEN }));
/** Whether two boxes share volume. */
export const overlaps = (a: Solid, b: Solid) =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0 && a.z0 < b.z1 && a.z1 > b.z0;

/** A point of the leaf (z along it from the hinge, y out of its top face, so negative y is under it) in the hinge's
 * plane when the leaf is `deg` degrees up: `h` metres toward Home from the hinge, `v` metres up. The top face tips away
 * from Home as the toe rises (leaf.rotation about x by -deg). */
export function hingePlane(z: number, y: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { h: z * Math.cos(a) - y * Math.sin(a), v: z * Math.sin(a) + y * Math.cos(a) };
}
