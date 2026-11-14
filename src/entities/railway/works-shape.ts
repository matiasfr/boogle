// Local greybox geometry, world metres. J1's centimetre catalog remains the authority for interaction anchors.
import { WORKS_SEAMS, WORKS_CLEFT, WORKS_RACK, WORKS_ROCKS, PIER_FRAME } from '../../sim/railway-works-layout.ts';
import { stallFrame, STALLS, TABLE } from '../../place/home-station.ts';
import { ORIGIN } from '../../place/layout.ts';
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
/** The stall in its own frame: local +z runs from the door (z -4.5) to the back, `yaw` turns it into the world. */
export type StallFrame = { centre: WorksPoint; yaw: number; slabZ: number; rim: WorksPoint };
/** The stall's greybox, anchors and road from its frame. */
export function stallShape({ centre, yaw, slabZ, rim }: StallFrame) {
  const STALL_YAW = yaw;
  const stallPoint = (x: number, z: number): WorksPoint => ({
    x: centre.x + Math.sin(yaw) * z + Math.cos(yaw) * x,
    z: centre.z + Math.cos(yaw) * z - Math.sin(yaw) * x,
  });
  const STALL_BOXES = [
    ...[-2, 2].map((x) => {
      const p = stallPoint(x, 0);
      return box(p.x, 18.7, p.z, 0.4, 1.4, 9, STALL_YAW);
    }),
    ...[-4, 0, 4].map((z) => {
      const p = stallPoint(0, z);
      return box(p.x, 22.5, p.z, 4.4, 0.35, 0.35, STALL_YAW);
    }),
    ...[-2, 2].flatMap((x) =>
      [-4, 0, 4].map((z) => {
        const p = stallPoint(x, z);
        return box(p.x, 20.2, p.z, 0.4, 4.4, 0.4, STALL_YAW);
      }),
    ),
  ];
  const slab = stallPoint(0, slabZ);
  const STALL_SLAB = box(slab.x, 19.9, slab.z, 4.4, 3.8, 0.65, STALL_YAW);
  const STALL_ROAD = [rim, stallPoint(0, -4), stallPoint(0, 4.5)];
  // Footing sockets occupy the clear apron in front of the sealed slab, never underneath a waiting vehicle.
  const STALL_SOCKETS = [-1.5, 1.5].map((x) => stallPoint(x, -3.7));
  return { STALL_YAW, stallPoint, STALL_BOXES, STALL_SLAB, STALL_ROAD, STALL_SOCKETS };
}
const openStall = stallFrame(STALLS.open);
const toWorld = (p: WorksPoint): WorksPoint => ({ x: p.x + ORIGIN.x, z: p.z });
export const { STALL_YAW, stallPoint, STALL_BOXES, STALL_SLAB, STALL_ROAD, STALL_SOCKETS } = stallShape({
  centre: toWorld(openStall.centre),
  yaw: openStall.yaw,
  slabZ: -2.9,
  rim: toWorld(openStall.rim),
});
/** The stall roads' rail height (as layout.railY) from each stall's door to its back: sleepers on the yard's ground
 * (18 m). From the table's rim (the lines' 18.3) each road ramps down to it at the door. The station draws the roads
 * (./home-station-view.ts); the shunt rides them (./roundhouse-view.ts). */
export const STALL_RAIL = 18.06;
/** A rail's head over its track's rail height (./yard-track.ts and the lines: the foot 0.1 over it, the rail 0.135). */
export const RAIL_HEAD = 0.235;
/** The stall shunter and its wagon, in each one's own frame (origin on the track's centreline, y up): the wheels'
 * centres across the track (on the rails, a metre apart), each one's wheel blocks and frame slab (centre and height),
 * and how far the frame rides over the rail height so the wheels stand on the rail heads. The slabs' tops are where
 * they were in the frame (the wagon's 0.475, what stands on it unchanged), so the wagon's deck stays level with the
 * train's (railY + 0.5, ./cars.ts) that it couples to; the wheels and slabs are shallower, to clear the rails. */
export const SHUNT = (() => {
  const wagon = { wheel: { y: 0.3425, h: 0.265 }, body: { y: 0.3975, h: 0.155 } },
    shunter = { wheel: { y: 0.36, h: 0.3 }, body: { y: 0.46, h: 0.28 } };
  return { gauge: 0.5, wagon, shunter, ride: RAIL_HEAD - (wagon.wheel.y - wagon.wheel.h / 2) };
})();
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
