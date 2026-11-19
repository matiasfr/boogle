// Local greybox geometry, world metres. J1's centimetre catalog remains the authority for interaction anchors.
import { WORKS_SEAMS, WORKS_CLEFT, WORKS_RACK, WORKS_ROCKS, PIER_FRAME } from '../../sim/railway-works-layout.ts';
import { ROTUNDA_HOME, STALLS, TABLE } from '../../place/home-station.ts';
import { ROTUNDA_BLOCK, ROTUNDA_KIT, bayFrame } from '../../place/rotunda.ts';
import { LINES, ORIGIN, railY } from '../../place/layout.ts';
export type WorksPoint = { x: number; z: number };
export type WorksBox = WorksPoint & {
  y: number;
  w: number;
  h: number;
  d: number;
  yaw: number;
  colour?: `#${string}`;
  solid?: boolean;
};
export const metres = (p: { x: number; z: number }): WorksPoint => ({ x: p.x / 100, z: p.z / 100 });
export function beam(a: WorksPoint, b: WorksPoint, y: number, w: number, h: number): WorksBox {
  return {
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2,
    y,
    w,
    h,
    d: Math.hypot(b.x - a.x, b.z - a.z),
    yaw: Math.atan2(b.x - a.x, b.z - a.z),
  };
}
export const box = (x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0): WorksBox => ({
  x,
  y,
  z,
  w,
  h,
  d,
  yaw,
});
export function boxDistance(p: WorksPoint, b: WorksBox) {
  const dx = p.x - b.x,
    dz = p.z - b.z,
    c = Math.cos(b.yaw),
    s = Math.sin(b.yaw);
  return Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - b.w / 2), Math.max(0, Math.abs(dx * s + dz * c) - b.d / 2));
}
const throat = metres(WORKS_SEAMS[1]);
const cut = (offset: number) => ({ x: throat.x + offset / Math.SQRT2, z: throat.z - offset / Math.SQRT2 });
const cleft = metres(WORKS_CLEFT);
export const CLEFT = { ...cleft, width: 1.4 };
const gap = (offset: number) => ({ x: cleft.x + offset / Math.SQRT2, z: cleft.z - offset / Math.SQRT2 });
// The sea face falls below 18 m: bury the base at 16 m, keeping the authored 40 m rim.
const wall = (a: WorksPoint, b: WorksPoint) => beam(a, b, 28, 3.5, 24);
const corners = [
  cut(4),
  { x: 132 + 1000, z: 72 },
  { x: 156 + 1000, z: 78 },
  { x: 168 + 1000, z: 96 },
  { x: 168 + 1000, z: 112 },
  gap(0.7),
];
const back = [
  gap(-0.7),
  { x: 152 + 1000, z: 128 },
  { x: 132 + 1000, z: 126 },
  { x: 115 + 1000, z: 110 },
  { x: 113 + 1000, z: 94 },
  cut(-4),
];
/** Inside the outcrop's ring, or within `margin` metres of one of its walls: Local scenery clearance for the trees
 * that grew through the bowl floor and the back wall (their harvest ids keep their accepted state). */
export function insideSplitRock(p: WorksPoint, margin = 3) {
  const ring = [...corners, ...back];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!,
      b = ring[j]!;
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside || SPLIT_ROCK_BOXES.some((b) => boxDistance(p, b) < margin);
}
export const SPLIT_ROCK_BOXES = [
  ...corners.slice(1).map((p, i) => wall(corners[i]!, p)),
  ...back.slice(1).map((p, i) => wall(back[i]!, p)),
];
export const THROAT_SLAB = [-8 / 3, 0, 8 / 3].map((offset) => {
  const p = cut(offset);
  return box(p.x, 28, p.z, 8 / 3 + 0.04, 8, 1.2, Math.PI / 4);
});
export const WORKS_BOULDERS = WORKS_ROCKS.map((p) => box(p.x / 100, p.y / 100 + 1, p.z / 100, 2.8, 2, 2.4, 0.3));
export const WORKS_WALK: WorksPoint[] = [
  { x: 1081.3, z: 41.1 },
  { x: 1096, z: 39 },
  { x: 1130, z: 40 },
  { x: 1150, z: 58 },
  { x: 1174, z: 78 },
  { x: 1174, z: 111 },
  { x: 1168, z: 128 },
  { x: 1164, z: 124 },
  cleft,
  { x: 1155, z: 115 },
  { x: 1139, z: 111 },
  { x: 1133, z: 94 },
];
// Bend round both camp states; the straight throat-to-rack candidate crosses their footprints.
export const ROLLER_ROAD: WorksPoint[] = [
  throat,
  { x: 1104, z: 78 },
  { x: 1096, z: 72 },
  { x: 1096, z: 50 },
  metres(WORKS_RACK),
];
/** The working bay in its own frame: the origin is the bay's middle, local +z runs from the door to the back, `yaw`
 * turns it into the world. `pier` is a door pier's place (across the bay, and along it): where a footing goes. */
export type StallFrame = {
  centre: WorksPoint;
  yaw: number;
  rim: WorksPoint;
  door: WorksPoint;
  back: WorksPoint;
  pier: { x: number; z: number };
};
/** The working bay's anchors and road from its frame. Its walls and roof are the rotunda's own blocks
 * (src/content/prefabs/roundhouse.ts); what is here is what the story works on: the two sockets where the bay's door
 * piers go, and the cracked slab that seals it just behind them. */
export function stallShape({ centre, yaw, rim, door, back, pier }: StallFrame) {
  const STALL_YAW = yaw;
  const stallPoint = (x: number, z: number): WorksPoint => ({
    x: centre.x + Math.sin(yaw) * z + Math.cos(yaw) * x,
    z: centre.z + Math.cos(yaw) * z - Math.sin(yaw) * x,
  });
  // The sockets take the footings the door piers stand on; the sealed slab stands a pier's depth behind them, across
  // the doorway, and never over a socket or under a waiting vehicle.
  const STALL_SOCKETS = [-pier.x, pier.x].map((x) => stallPoint(x, pier.z));
  const SLAB_Z = pier.z + 0.8;
  const slab = stallPoint(0, SLAB_Z);
  const STALL_SLAB = box(slab.x, 19.9, slab.z, 4.4, 3.8, 0.65, STALL_YAW);
  const STALL_ROAD = [rim, door, back];
  return { STALL_YAW, stallPoint, STALL_SLAB, STALL_ROAD, STALL_SOCKETS, SLAB_Z, PIER: pier };
}
const toWorld = (p: WorksPoint): WorksPoint => ({ x: p.x + ORIGIN.x, z: p.z });
/** Home's working bay: the first in the rotunda's build order (190°). The piers' places are the kit's: across, midway
 * between the door's clear edge and the bay's own edge; along, the middle of the door reveal behind the flat door
 * wall (the chord between the door ring's corners). */
const workingBay = (() => {
  const f = bayFrame(ROTUNDA_HOME, ROTUNDA_HOME.order[0]!),
    half = (ROTUNDA_KIT.bayDeg * Math.PI) / 360,
    wallR = ROTUNDA_KIT.doorR * Math.cos(half);
  return {
    centre: toWorld(f.centre),
    yaw: f.yaw,
    rim: toWorld(f.rim),
    door: toWorld(f.door),
    back: toWorld(f.back),
    pier: {
      x: (ROTUNDA_KIT.door.clear / 2 + wallR * Math.tan(half)) / 2,
      z: wallR + ROTUNDA_BLOCK.reveal / 2 - (ROTUNDA_KIT.doorR + ROTUNDA_KIT.depth / 2),
    },
  };
})();
export const { STALL_YAW, stallPoint, STALL_SLAB, STALL_ROAD, STALL_SOCKETS, SLAB_Z, PIER } = stallShape(workingBay);
/** The stall roads' rail height (as layout.railY) from each stall's door to its back: sleepers on the yard's ground
 * (18 m). From the table's rim (the lines' 18.3) each road ramps down to it at the door. The station draws the roads
 * (./home-station-view.ts); the shunt rides them (./roundhouse-view.ts). */
export const STALL_RAIL = 18.06;
/** A rail's head over its track's rail height (./yard-track.ts and the lines: the foot 0.1 over it, the rail 0.135). */
export const RAIL_HEAD = 0.235;
/** The table's rail height (as layout.railY): the deck's, and the spur's and every stall road's where they meet the
 * rim. Road 2's at s 0, which the spur runs level from (src/place/junctions.ts, J1). */
export const TABLE_RAIL = railY(LINES.east, 0);
/** The stall shunter and its wagon, in each one's own frame (origin on the track's centreline, y up): the wheels'
 * centres across the track (on the rails, a metre apart), each one's wheel blocks and frame slab (centre and height),
 * and how far the frame rides over the rail height so the wheels stand on the rail heads. The slabs' tops are where
 * they were in the frame (the wagon's 0.475, what stands on it unchanged), so the wagon's deck stays level with the
 * train's (railY + 0.5, ./cars.ts) that it couples to; the wheels and slabs are shallower, to clear the rails. */
export const SHUNT = (() => {
  // `z` is each wheel's place along the frame (and its mirror), `d` a block's or slab's length along it.
  const wagon = { wheel: { y: 0.3425, h: 0.265, z: 1, d: 0.5 }, body: { y: 0.3975, h: 0.155, d: 3.2 } },
    shunter = { wheel: { y: 0.36, h: 0.3, z: 1, d: 0.55 }, body: { y: 0.46, h: 0.28, d: 3.4 } };
  return { gauge: 0.5, bogie: 1, wagon, shunter, ride: RAIL_HEAD - (wagon.wheel.y - wagon.wheel.h / 2) };
})();
/** Where rails meet the table's rim (docs/plans/turnouts.md, (e)): every approach rail is cut on the circle
 * `TABLE.r + RIM_GAP` and the deck's on `TABLE.r - RIM_GAP`, so each join is a 6 cm gap square to its road.
 * `rimCut(side)` is how far from the table's centre, along a radial road, its rails (`SHUNT.gauge` either side of the
 * centreline) are cut: outside the rim for `1`, on the deck for `-1`. */
const RIM_GAP = 0.03;
export const rimCut = (side: 1 | -1) => Math.sqrt((TABLE.r + side * RIM_GAP) ** 2 - SHUNT.gauge ** 2);
/** The timber under each road's rail ends at the rim: the kit's sleeper (2.3 m across its road, 0.42 m along it), its
 * inner edge on the pit's kerb (the coping, `TABLE.r` + 0.15 to + `ROTUNDA_KIT.rim`, its top `ROTUNDA_BLOCK.kerb`
 * over the table's ground) and its outer edge 2 cm inside it, stretched down from the rails' foot onto the kerb. `at`
 * is its centre's distance from the table's centre, `bottom` the kerb's top. */
export const RIM_TIMBER = {
  length: 2.3,
  depth: 0.42,
  at: TABLE.r + ROTUNDA_KIT.rim - 0.02 - 0.21,
  bottom: TABLE.y + ROTUNDA_BLOCK.kerb,
} as const;
/** The roads that meet the table, by bearing (degrees clockwise from north): the spur, then every bay's. */
export const rimBearings = () => [
  TABLE.spur,
  ...ROTUNDA_HOME.order.map((bay) => bayFrame(ROTUNDA_HOME, bay).bearing),
];
/** Each rim timber's footprint (world metres; `yaw` runs along its road, `w` across it), in `rimBearings` order. */
export const rimTimbers = (): WorksBox[] =>
  rimBearings().map((bearing) => {
    const a = (bearing * Math.PI) / 180,
      u = { x: Math.sin(a), z: -Math.cos(a) };
    const p = toWorld({ x: TABLE.x + u.x * RIM_TIMBER.at, z: TABLE.z + u.z * RIM_TIMBER.at });
    return box(p.x, RIM_TIMBER.bottom, p.z, RIM_TIMBER.length, 0, RIM_TIMBER.depth, Math.atan2(u.x, u.z));
  });
type RailPoint = { x: number; y: number; z: number };
/** A shunt vehicle's frame from its two bogie points on the track (`SHUNT.bogie` either side of its middle, each at
 * the track's rail height there), as the trains are posed on a chord: midway between them, heading and pitched along
 * them, riding `SHUNT.ride` over, so every wheel stands on its rail head on a ramp as on the level. `pitch` lifts the
 * front. */
export function shuntPose(front: RailPoint, rear: RailPoint) {
  const dx = front.x - rear.x,
    dz = front.z - rear.z;
  return {
    x: (front.x + rear.x) / 2,
    y: (front.y + rear.y) / 2 + SHUNT.ride,
    z: (front.z + rear.z) / 2,
    yaw: Math.atan2(dx, dz),
    pitch: Math.atan2(front.y - rear.y, Math.hypot(dx, dz) || 1),
  };
}
/** A stall road's rail height `l` metres out from the table's rim, whose rail height is `deck`: the ramp down to the
 * door, then level. */
export function stallRoadY(l: number, deck: number) {
  const ramp = STALLS.door - TABLE.r;
  return l < ramp ? deck + ((STALL_RAIL - deck) * Math.max(0, l)) / ramp : STALL_RAIL;
}
const pier = metres(PIER_FRAME);
export const PIER_SOCKETS = Array.from({ length: 12 }, (_, i) => ({
  x: pier.x + (i % 2 ? 2.5 : -2.5),
  z: pier.z - Math.floor(i / 2) * 2,
}));
