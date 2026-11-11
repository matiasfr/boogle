// Ring Island's station house for ?ring=greybox (docs/brainstorms/junction-stations.md, section 6 and the design review,
// finding 1): a leaning, walk-in house at the halt's north-west corner, its waiting room's bench facing a tall tilted
// window that the lean points at the shard. Pure numbers, no three.js, so test/ring-house.test.ts reads the same
// colliders the greybox builds (src/proto/greybox/ring.ts). A layout proposal, not a catalog; nothing here is shared.
//
// Frames. World metres (x east, z south). `u` is metres out from the pier head along line 2's track and `lat` metres east
// of it (the greybox's own, slightly skewed axes; HX per metre of u). The house has a local frame: +x its right, +y up,
// -z the way it faces (toward the shard), origin on the floor at the room's middle. The room is 5 m wide (x), 4 m deep
// (z) inside and 3.2 m to the ceiling; its two long walls (north: the window; south: the door) lean back together by
// LEAN degrees, so the whole house reads as leaning, while the floor stays flat and level with the platforms.
import { FAR, ORIGIN } from '../../place/layout.ts';

/** Line 2's track at the pier head and its heading (x per unit of -z). */
export const HEAD = { x: 1402.0, z: -372 };
export const HX = 0.0272;
/** World (x, z) of u metres along line 2 and lat metres right (east) of its track, as the greybox lays things out. */
export const at = (u: number, lat = 0) => ({ x: HEAD.x + HX * u + lat, z: HEAD.z - u + HX * lat });

/** Place's shard, as buildFar draws it (src/place/land.ts): the ring's middle, 140 m up. */
export const SHARD = { x: FAR.x + ORIGIN.x + 10, y: 140, z: FAR.z + ORIGIN.z };

/** The platforms and the north end they share (ring.ts's halt: u 428-468, decks 8.0 m, platforms 0.9 m up). */
export const HALT = {
  u0: 428,
  u1: 468,
  deckY: 8.0,
  platformY: 8.9,
  eastLat: [1.8, 5.3],
  westLat: [-9.3, -5.8],
} as const;

/** The concourse: a plank crossing at platform height from the east platform's end over the two tracks, and the terrace
 * beyond it on which the house stands. All one level with the platforms: no step, no jump. */
export const CONCOURSE = {
  y: HALT.platformY,
  crossing: { u0: 468, u1: 471.5, lat0: -9.3, lat1: 5.3 },
  terrace: { u0: 468, u1: 477.5, lat0: -20, lat1: -9.3 },
} as const;

export const HOUSE = {
  u: 474,
  lat: -16,
  floorY: CONCOURSE.y,
  room: { w: 5, d: 4, h: 3.2 },
  wall: 0.3,
  /** Degrees the north and south walls lean back (top toward +z, away from the shard). */
  lean: 24,
  /** In the south wall, near its east end, toward the platforms: 1.8 m wide, 2.6 m clear, no leaf. */
  door: { x: 1.5, w: 1.8, h: 2.6 },
  /** In the north wall: 2 m wide, its sill and head given along the leaning wall, in metres of slab. */
  window: { w: 2, s0: 1.0, s1: 3.0 },
  /** The bench faces the window: a 1.8 m seat 0.45 m up, a low back behind it. */
  bench: { x: 0, z: 0.5, w: 1.8, d: 0.5, seat: 0.45, eye: 1.2 },
} as const;

/** The house's yaw, so local -z points from its middle at the shard (three.js rotation.y). */
export function houseYaw() {
  const c = at(HOUSE.u, HOUSE.lat);
  return Math.atan2(-(SHARD.x - c.x), -(SHARD.z - c.z));
}
/** Local (x, y, z) to world. */
export function toWorld(x: number, y: number, z: number) {
  const c = at(HOUSE.u, HOUSE.lat),
    a = houseYaw(),
    cos = Math.cos(a),
    sin = Math.sin(a);
  return { x: c.x + x * cos + z * sin, y: HOUSE.floorY + y, z: c.z - x * sin + z * cos };
}
/** World direction of a local vector (no translation). */
export function dirToWorld(x: number, y: number, z: number) {
  const a = houseYaw(),
    cos = Math.cos(a),
    sin = Math.sin(a);
  return { x: x * cos + z * sin, y, z: -x * sin + z * cos };
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const LEAN = rad(HOUSE.lean);

/** A solid box in the house's local frame, tilted `rx` radians about its own x axis. */
export type HouseBox = {
  name: string;
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
  rx: number;
};

/** One piece of a leaning wall through z = `zp` (the slab's middle plane at the floor): x between x0 and x1, slab metres
 * s0 to s1 up the lean. */
export function slab(name: string, zp: number, x0: number, x1: number, s0: number, s1: number): HouseBox {
  const mid = (s0 + s1) / 2;
  return {
    name,
    x: (x0 + x1) / 2,
    y: mid * Math.cos(LEAN),
    z: zp + mid * Math.sin(LEAN),
    hx: (x1 - x0) / 2,
    hy: (s1 - s0) / 2,
    hz: HOUSE.wall / 2,
    rx: LEAN,
  };
}

/** The wall's length up its lean for the ceiling height. */
export const SLAB_H = HOUSE.room.h / Math.cos(LEAN);
const ZN = -(HOUSE.room.d / 2 + HOUSE.wall / 2),
  ZS = HOUSE.room.d / 2 + HOUSE.wall / 2;
const XO = HOUSE.room.w / 2 + HOUSE.wall;

/** Every solid of the house, local frame: the leaning north and south walls (with the window and the door left open),
 * the two plain side walls, the roof and the bench. */
export function houseBoxes(): HouseBox[] {
  const { door, window: win } = HOUSE;
  const dx0 = door.x - door.w / 2,
    dx1 = door.x + door.w / 2,
    sDoor = door.h / Math.cos(LEAN);
  const boxes: HouseBox[] = [
    // north: the window wall
    slab('north-left', ZN, -XO, -win.w / 2, 0, SLAB_H),
    slab('north-right', ZN, win.w / 2, XO, 0, SLAB_H),
    slab('north-sill', ZN, -win.w / 2, win.w / 2, 0, win.s0),
    slab('north-head', ZN, -win.w / 2, win.w / 2, win.s1, SLAB_H),
    // south: the door wall
    slab('south-left', ZS, -XO, dx0, 0, SLAB_H),
    slab('south-right', ZS, dx1, XO, 0, SLAB_H),
    slab('south-head', ZS, dx0, dx1, sDoor, SLAB_H),
  ];
  for (const s of [-1, 1])
    boxes.push({
      name: s < 0 ? 'west' : 'east',
      x: (s * (HOUSE.room.w + HOUSE.wall)) / 2,
      y: HOUSE.room.h / 2,
      z: 0,
      hx: HOUSE.wall / 2,
      hy: HOUSE.room.h / 2,
      hz: HOUSE.room.d / 2 + HOUSE.wall,
      rx: 0,
    });
  // the roof: from the north wall's top to the south wall's, a little proud of the side walls
  const topN = ZN + HOUSE.room.h * Math.tan(LEAN),
    topS = ZS + HOUSE.room.h * Math.tan(LEAN);
  boxes.push({
    name: 'roof',
    x: 0,
    y: HOUSE.room.h + 0.15,
    z: (topN + topS) / 2,
    hx: XO + 0.3,
    hy: 0.15,
    hz: (topS - topN) / 2 + 0.3,
    rx: 0,
  });
  const b = HOUSE.bench;
  boxes.push({ name: 'bench', x: b.x, y: b.seat / 2, z: b.z, hx: b.w / 2, hy: b.seat / 2, hz: b.d / 2, rx: 0 });
  boxes.push({
    name: 'bench-back',
    x: b.x,
    y: b.seat + 0.25,
    z: b.z + b.d / 2 - 0.04,
    hx: b.w / 2,
    hy: 0.25,
    hz: 0.04,
    rx: 0,
  });
  return boxes;
}

/** The window's outward axis (unit, world): the north wall's outward normal, pitched up by the lean. */
export function windowAxis() {
  return dirToWorld(0, Math.sin(LEAN), -Math.cos(LEAN));
}
/** The seated eye on the bench, world. */
export function benchEye() {
  return toWorld(HOUSE.bench.x, HOUSE.bench.eye, HOUSE.bench.z);
}
/** The unit direction from the seated eye to the shard. */
export function benchToShard() {
  const e = benchEye(),
    dx = SHARD.x - e.x,
    dy = SHARD.y - e.y,
    dz = SHARD.z - e.z,
    n = Math.hypot(dx, dy, dz);
  return { x: dx / n, y: dy / n, z: dz / n };
}
/** Degrees between the window's axis and the line from the bench to the shard. */
export function windowOffAxisDeg() {
  const a = windowAxis(),
    b = benchToShard();
  return (Math.acos(Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)) * 180) / Math.PI;
}
