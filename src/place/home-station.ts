// Home as one terminus station, layout B (docs/plans/home-station.md), as data: both lines' new first stretches, the
// buffer stops, the island, the hall, the engine spur and its table, the three stall roads, the cart's leg and the
// moved yard props. Place-local metres (world x = local x + 1000), north is -z, bearings in degrees clockwise from
// north, `s` metres along a line from its start. Local, no three.js; the rules pin these anchors in centimetres.
import type { Line } from './layout.ts';

/** Both lines' first spline point. It was the turntable's centre; the table moves, the lines must not. */
export const LINE_ORIGIN = { x: -82, z: 12 };

export type XZ = { x: number; z: number };
export type Pose = XZ & { bearing: number };
/** A straight, or an arc of radius `r` turning right (+1) or left (-1). */
export type Seg = { len: number; r?: number; side?: 1 | -1 };
const rad = (deg: number) => (deg * Math.PI) / 180;
const dir = (bearing: number): XZ => ({ x: Math.sin(rad(bearing)), z: -Math.cos(rad(bearing)) });
const straight = (len: number): Seg => ({ len });
const arc = (len: number, r: number, side: 1 | -1): Seg => ({ len, r, side });

/** The pose `s` metres along `segs` from `start`; straight on past either end. */
export function march(start: Pose, segs: readonly Seg[], s: number): Pose {
  let { x, z, bearing } = start;
  if (s < 0) {
    const u = dir(bearing);
    return { x: x + u.x * s, z: z + u.z * s, bearing };
  }
  let left = s;
  for (const seg of segs) {
    const len = Math.min(left, seg.len);
    if (seg.r === undefined) {
      const u = dir(bearing);
      x += u.x * len;
      z += u.z * len;
    } else {
      const side = seg.side!,
        turn = (side * (len / seg.r) * 180) / Math.PI;
      // The centre is on the turning side: the right-hand normal of bearing b is (cos b, sin b).
      const cx = x + side * seg.r * Math.cos(rad(bearing)),
        cz = z + side * seg.r * Math.sin(rad(bearing));
      bearing += turn;
      x = cx - side * seg.r * Math.cos(rad(bearing));
      z = cz - side * seg.r * Math.sin(rad(bearing));
    }
    left -= len;
    if (left <= 0) return { x, z, bearing };
  }
  const u = dir(bearing);
  return { x: x + u.x * left, z: z + u.z * left, bearing };
}
const length = (segs: readonly Seg[]) => segs.reduce((n, seg) => n + seg.len, 0);

/** The station's axis: both roads run at bearing 70° beside the island. `d` along it, `n` its right-hand normal. */
export const AXIS = { bearing: 70, d: dir(70), n: { x: Math.cos(rad(70)), z: Math.sin(rad(70)) } };

/** Each line's new first stretch, from its buffer end (s 0) to where it meets today's line, on 18 m curves. */
export const HEADS = [
  {
    start: { x: -82.506, z: 4.203, bearing: 70 },
    segs: [straight(22), arc(18.49, 18, -1), straight(15.391), arc(4.119, 18, 1)],
    join: 60,
  },
  {
    start: { x: -82.663, z: 12.348, bearing: 70 },
    segs: [straight(25), arc(20.421, 18, 1), straight(22.774), arc(15.804, 18, -1)],
    join: 84,
  },
] as const;
/** Road `road`'s point at `s` on its new head (behind s 0, straight back toward the buffers). */
export const roadAt = (road: 0 | 1, s: number) => march(HEADS[road].start, HEADS[road].segs, s);
/** A head as the line samples it: join + 1 points 1 m apart, s 0 to the join. */
export function headPoints(road: 0 | 1): XZ[] {
  return Array.from({ length: HEADS[road].join + 1 }, (_, s) => {
    const p = roadAt(road, s);
    return { x: p.x, z: p.z };
  });
}
/** Today's line with its first metres replaced by `head`: the same 1 m samples, so every `s` past the join is where
 * it was. */
export function spliceHead(line: Line, head: readonly XZ[]): Line {
  const xs = Float32Array.from(line.xs),
    zs = Float32Array.from(line.zs);
  head.forEach((p, s) => {
    xs[s] = p.x;
    zs[s] = p.z;
  });
  return { ...line, xs, zs };
}

// ---------------------------------------------------------------- the station, in axis coordinates
// `a` is metres along the axis, measured as road 1's `s` abeam; `c` metres across it from road 1 toward road 2.
const R1 = HEADS[0].start;
/** The Place-local point at axis coordinates (a, c). */
export const axisPoint = (a: number, c: number): XZ => ({
  x: R1.x + AXIS.d.x * a + AXIS.n.x * c,
  z: R1.z + AXIS.d.z * a + AXIS.n.z * c,
});
/** Axis coordinates of a Place-local point. */
export function toAxis(p: XZ) {
  const dx = p.x - R1.x,
    dz = p.z - R1.z;
  return { a: dx * AXIS.d.x + dz * AXIS.d.z, c: dx * AXIS.n.x + dz * AXIS.n.z };
}
/** Road 2's `s` is road 1's `s` abeam plus this; road 2's centre is `ROAD_GAP` across. */
export const ROAD2_S = -toAxis(HEADS[1].start).a;
export const ROAD_GAP = toAxis(HEADS[1].start).c;

/** Buffer stops, by road's `s`: abeam, so the island's head is square. Road 1's stub is the forge's goods dock. */
export const BUFFERS = [-5.53, -2.6] as const;
/** The island between the roads: a ground-level apron off the buffers (the forge rack stands on it), a head ramp, the
 * deck at rail + 0.72 (level with the flat cars), an end ramp. No ramp off the back: it would cross a track. */
export const ISLAND = { width: 4.3, edge: 1.65, apron: 3.3, headRamp: 5, deck: 18, endRamp: 4, lift: 0.72 };
const A0 = BUFFERS[0];
/** The island along the axis: buffers, apron's end, deck's start and end, the end ramp's foot. */
export const ISLAND_A = {
  buffers: A0,
  apron: A0 + ISLAND.apron,
  deck0: A0 + ISLAND.apron + ISLAND.headRamp,
  deck1: A0 + ISLAND.apron + ISLAND.headRamp + ISLAND.deck,
  foot: A0 + ISLAND.apron + ISLAND.headRamp + ISLAND.deck + ISLAND.endRamp,
};
/** The island's centreline, across. */
export const ISLAND_C = ROAD_GAP / 2;

/** The concourse: an open hall on posts with end walls, its long side across the axis, 1 m behind the buffers. Its
 * roof stands `height` up on posts; the end walls stop at `endWall`, so the hall stays open to the forge yard beside it
 * (owner, 9 November: "Lower end walls"). `floor` is its slab's top: 0.12 m over the highest ground under it. */
export const HALL = (() => {
  const w = 13,
    d = 6,
    a = A0 - 1 - d / 2;
  const yaw = Math.atan2(AXIS.d.x, AXIS.d.z);
  /** The goods door: a 1.5 m gap in the north end wall's back half, behind road 1's buffer, toward the forge. */
  const goodsDoor = { a0: -8.9, a1: -7.4 };
  return { ...axisPoint(a, ISLAND_C), a, c: ISLAND_C, w, d, yaw, height: 4.6, endWall: 2.4, floor: 18.34, goodsDoor };
})();

// ---------------------------------------------------------------- the engine spur, the table and the stalls
/** Off road 2 at s 5.5 to the right on a 15 m curve through 60°, then 1.5 m to the table's rim. */
export const SPUR = { road: 1 as const, s: 5.5, segs: [arc((15 * Math.PI) / 3, 15, 1), straight(1.5)] };
const spurStart = roadAt(1, SPUR.s);
const spurEnd = march(spurStart, SPUR.segs, length(SPUR.segs));
/** The 9.6 m table at the spur's end. */
export const TABLE = (() => {
  const u = dir(spurEnd.bearing),
    r = 4.8;
  return { x: spurEnd.x + u.x * r, z: spurEnd.z + u.z * r, r, y: 18, spur: spurEnd.bearing + 180 };
})();
/** Stall roads, radial from the table: the middle one open, the others ruin outlines. Doors 8.5 m from the centre so
 * 4.4 m frames 30° apart don't overlap; 9 m deep; the door 3.6 m clear and 4 m high (today's frame). */
export const STALLS = {
  bearings: [160, 190, 220] as const,
  open: 190,
  door: 8.5,
  depth: 9,
  width: 4.4,
  clear: 3.6,
  high: 4,
};
/** One stall's frame: `u` out from the table, `yaw` turns local +z onto it (three.js rotation.y), the door and back. */
export function stallFrame(bearing: number) {
  const u = dir(bearing),
    at = (r: number): XZ => ({ x: TABLE.x + u.x * r, z: TABLE.z + u.z * r });
  const centre = at(STALLS.door + STALLS.depth / 2);
  return {
    bearing,
    u,
    yaw: Math.atan2(u.x, u.z),
    centre,
    rim: at(TABLE.r),
    door: at(STALLS.door),
    back: at(STALLS.door + STALLS.depth),
  };
}

// ---------------------------------------------------------------- the cart's leg
/** From line 1 at s 54, heading in, round into road 2 at s 26 just past the island: left, straight, right, R 15. */
export const LEG = (() => {
  const from = roadAt(0, 54),
    start = { ...from, bearing: from.bearing + 180 };
  const segs = [arc(3.33323, 15, -1), straight(15.41081), arc(19.5749, 15, 1)];
  return { from: 54, to: 26, start, segs, len: length(segs) };
})();
const sampled = (start: Pose, segs: readonly Seg[], step = 1): XZ[] => {
  const len = length(segs),
    n = Math.ceil(len / step);
  return Array.from({ length: n + 1 }, (_, k) => {
    const p = march(start, segs, Math.min(len, k * step));
    return { x: p.x, z: p.z };
  });
};
/** The leg, line 1 to road 2, about every metre. */
export const legPoints = () => sampled(LEG.start, LEG.segs);
/** The spur, road 2 to the table's rim, about every metre. */
export const spurPoints = () => sampled(spurStart, SPUR.segs);

// ---------------------------------------------------------------- the cart's road and the shunt
/** The cart's camp stop, line 1's s (unchanged), and its forge stop: road 2's s 0, beside the rack on the apron. */
const CAMP_S = 196;
export const CART_FORGE = CAMP_S - LEG.from + LEG.len + LEG.to;
type Sampled = Pick<Line, 'xs' | 'zs'>;
function sample(line: Sampled, s: number): XZ {
  const n = line.xs.length,
    f = Math.max(0, Math.min(n - 1.001, s)),
    k = Math.floor(f),
    t = f - k;
  return { x: line.xs[k]! + (line.xs[k + 1]! - line.xs[k]!) * t, z: line.zs[k]! + (line.zs[k + 1]! - line.zs[k]!) * t };
}
/** The cart's road `d` metres from the camp, on layout B's lines (`north` and `east` with their heads spliced): down
 * line 1 to s 54, the leg, road 2 to the buffers (the forge stop, `CART_FORGE`), then back out along line 2. */
export function cartRoadAt(d: number, lines: { north: Sampled; east: Sampled }): XZ {
  const legFrom = CAMP_S - LEG.from;
  if (d <= legFrom) return sample(lines.north, CAMP_S - d);
  if (d <= legFrom + LEG.len) {
    const p = march(LEG.start, LEG.segs, d - legFrom);
    return { x: p.x, z: p.z };
  }
  if (d <= CART_FORGE) return sample(lines.east, CART_FORGE - d);
  return sample(lines.east, d - CART_FORGE);
}
/** The rail's height `d` metres along the cart's road, from each line's own height by its `s`; the leg runs evenly
 * from line 1's height at its points to road 2's. */
export function cartRoadY(d: number, y: { north: (s: number) => number; east: (s: number) => number }): number {
  const legFrom = CAMP_S - LEG.from;
  if (d <= legFrom) return y.north(CAMP_S - d);
  if (d <= legFrom + LEG.len) {
    const from = y.north(LEG.from);
    return from + ((y.east(LEG.to) - from) * (d - legFrom)) / LEG.len;
  }
  return y.east(Math.abs(CART_FORGE - d));
}
/** Where the wagon's centre turns back on road 2's buffer stub: the shunter, leading, stops 0.3 m short of the buffer
 * and the wagon's rear is clear of the spur's points. */
export const SHUNT_CUSP_S = 3;
/** The shunt's track, as the wagon's centre follows it: stall back to door, across the table (it swings from the
 * stall to the spur), up the spur to road 2, on to the stub (`cusp`), then out along road 2 to `wagonS`. */
export function shuntPath(wagonS: number): { pts: XZ[]; cusp: number } {
  const stall = stallFrame(STALLS.open);
  const pts: XZ[] = [stall.back, stall.door, stall.rim, { x: TABLE.x, z: TABLE.z }];
  pts.push(...spurPoints().reverse());
  for (let s = Math.floor(SPUR.s); s > SHUNT_CUSP_S; s--) {
    const p = roadAt(1, s);
    pts.push({ x: p.x, z: p.z });
  }
  const cusp = pts.length;
  for (let s = SHUNT_CUSP_S; s < wagonS; s++) {
    const p = roadAt(1, s);
    pts.push({ x: p.x, z: p.z });
  }
  const end = roadAt(1, wagonS);
  pts.push({ x: end.x, z: end.z });
  return { pts, cusp };
}

// ---------------------------------------------------------------- the board crossing
/** A board crossing over road 2, the short way from the island to the stall (design review of the Home flip, finding
 * 2): `s` its middle by road 2's `s`, `len` along the road, from the island's edge (`c0`, across the axis) to past
 * road 2's sleepers (`c1`). It lies on the buffer stub beside the foot of the head ramp: behind the tail of a train
 * standing at line 2's stop (the steel car, s 5.55), short of the spur's points (s 5.5) and clear of the cart at its
 * forge stop (s ±1.35). The island's far end, where home-station's review first put it, no longer has room: since
 * v33 the engine's nose stands at s 24.45 to 24.95 and the leg's points are at s 26. From here the walk to the open
 * stall passes west of the table and crosses no track a vehicle runs on (only the ruined 220° stall's dead road). Drawn only: boards on the ground, no collider. */
export const CROSSING = {
  road: 1 as const,
  s: 2.8,
  len: 1.6,
  c0: ISLAND_C + ISLAND.width / 2,
  c1: ROAD_GAP + 1.75,
};

// ---------------------------------------------------------------- what moves to make room
/** Yard props drawn in B's places (Place-local): the forge rack on the apron's road 2 side (a lane stays open along
 * road 1's edge, from the hall's back bay to the head ramp), the pedestal on the forge side of road 1, the crane and
 * dock beside road 1, the stone yard off the table, and the greeter in front of the hall's north end, beside the open
 * bay and outside the shelf's reach. Q1's frame flips to road 2's south side. */
export const PROPS = {
  rack: { x: -84.53, z: 10.05 },
  greeter: { x: -95.86, z: 9.65 },
  pedestal: { x: -78.0, z: -1.17 }, // the existing 3.5 m rail clearance, including the pedestal's footprint
  crane: { x: -72.4, z: -3.1 },
  dock: { x: -76.07, z: -1.73 }, // retain 2 m between the dock and the pedestal
  yard: { x: -46, z: 22 },
};
/** The curio shelf's footprint in its own frame (`curio-shelf.ts`): the crown's half-width, how far the crown reaches in
 * front and the back panel behind, and the crown's top over its floor. `sideWay` is the gap kept on its +x side, toward
 * the south wall: the side way into the works board's bay (it was the finds board's room until that was cut, 9
 * November; curio placement plan, 10 November). */
export const SHELF_SIZE = { crown: 2.95, sideWay: 1.4, front: 0.59, back: 0.35, top: 3.47 };
/** The curio shelf (owner, 9 November: "move shelf off north wall"): in the hall's front, south of the way in, just
 * behind the front posts and facing the square, its side way toward the south wall. North of it the way in from the
 * square to the trains stays open, nearly 5 m wide; it keeps off the back span (the line map, step 12) and leaves the
 * south wall 0.15 m clear for the works board (call 29). */
export const SHELF_B = (() => {
  const a = HALL.a - HALL.d / 2 + 0.2 + 0.175 + 0.05 + SHELF_SIZE.front,
    c = HALL.c + HALL.w / 2 - 0.3 - 0.15 - SHELF_SIZE.sideWay - SHELF_SIZE.crown;
  return { ...axisPoint(a, c), yaw: Math.atan2(-AXIS.d.x, -AXIS.d.z), y: HALL.floor };
})();
/** The finders' bay, in both layouts (owner, 10 November: layout A of docs/plans/curio-shelves-placement.md, "for
 * now"): on the shelf's centreline 16.3 m out across the square, facing back up the station's axis at the hall, so
 * the south street passes between them. On the ground. */
export const FINDERS_B = (() => {
  const s = toAxis(SHELF_B);
  return { ...axisPoint(s.a - 16.3, s.c), yaw: HALL.yaw };
})();
/** A Place-local point in the bay's own frame: `across` metres along its front (its +x), `out` metres in front of it. */
export function bayPoint(across: number, out: number): XZ {
  const c = Math.cos(FINDERS_B.yaw),
    s = Math.sin(FINDERS_B.yaw);
  return { x: FINDERS_B.x + across * c + out * s, z: FINDERS_B.z - across * s + out * c };
}
/** Missed secrets' boxes wait 3 by 3 in front of the bay, in its frame: filled middle first, nearest the bay first. */
export const BAY_BOXES = { across: [0, -1.1, 1.1], out: [1.5, 2.6, 3.7] } as const;
/** The bay box for missed secret k (0–8), Place-local. */
export const bayBoxPoint = (k: number) => bayPoint(BAY_BOXES.across[k % 3]!, BAY_BOXES.out[Math.floor(k / 3)]!);
/** The jump trophy's plinth: outermost on the bay's centreline, on the street's edge where people pass. */
export const PLINTH_OUT = 5.3;
/** The two village halts become one island: each line's platform edge, by its own `s`. */
export const ISLAND_HALTS = [
  { s0: ISLAND_A.deck0, s1: ISLAND_A.deck1, lat: ISLAND_C },
  { s0: ISLAND_A.deck0 + ROAD2_S, s1: ISLAND_A.deck1 + ROAD2_S, lat: ISLAND_C - ROAD_GAP },
] as const;
/** How near a request lever's knob its prompt is offered (m, flat). */
export const LEVER_REACH = 1.8;
/** The island's two request levers: each on its own edge under its own signal mast, `edge` in from the deck's side
 * and `fromEnd` short of the deck's far end. They stand further apart than twice `LEVER_REACH`, so no spot on the
 * island offers both (design review of the Home flip, call 13: a lever calls its own line's train). */
export const ISLAND_LEVER = { edge: 0.3, fromEnd: 1.4 };
/** Road `road`'s lever frame on the island, Place-local (halts-view.ts stands it there). */
export function islandLever(road: 0 | 1): XZ {
  const h = ISLAND_HALTS[road],
    p = roadAt(road, h.s1 - ISLAND_LEVER.fromEnd),
    lat = h.lat - Math.sign(h.lat) * (ISLAND.width / 2 - ISLAND_LEVER.edge);
  return { x: p.x + Math.cos(rad(p.bearing)) * lat, z: p.z + Math.sin(rad(p.bearing)) * lat };
}
