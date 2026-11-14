// Home's terminus station in greybox (docs/plans/home-station.md): the hall, the buffer stops, the
// apron, a kerb outline of the island (its deck drops in with the trains, as halts do: ./halts-view.ts), the stubs, the
// spur, the stall roads and, once line 2 has its first stretch, the cart's leg, and the two ruined stalls beside the
// open one (./roundhouse-view.ts). Local view over the station's data rows.
import type { OwnedView } from '../../render/owned-view.ts';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import { line2Completed } from '../../sim/railway-queries-line2.ts';
import { drawWorksBoxes } from './works-box-view.ts';
import { beam, box, type WorksBox, type WorksPoint } from './works-shape.ts';

const STONE = '#c8c0b0',
  KERB = '#ddd6c6',
  BRICK = '#a6614a',
  POST = '#5c4530',
  ROOF = '#c4453a',
  RUIN = '#9a958b',
  SLEEPER = '#8a6236',
  RAIL = '#4c5058',
  BUFFER = '#a33a2c',
  BRASS = '#e6a33e',
  PLANK = '#b98a52';

export async function createHomeStation(adapter: RailwayAdapter, owner: OwnedView) {
  const [{ H }, layout, home, { addFoot }] = await Promise.all([
    import('../../place/land.ts'),
    import('../../place/layout.ts'),
    import('../../place/home-station.ts'),
    import('../../place/sites.ts'),
  ]);
  const world = (p: { x: number; z: number }): WorksPoint => ({ x: p.x + layout.ORIGIN.x, z: p.z });
  const ground = (p: WorksPoint) => H(p.x, p.z);
  const at = (a: number, c: number) => world(home.axisPoint(a, c));
  const yaw = home.HALL.yaw;
  /** Local x of a box turned `yaw`, in world: across the station axis (toward road 1). */
  const across = { x: Math.cos(yaw), z: -Math.sin(yaw) };
  const boxes: WorksBox[] = [];
  const add = (b: WorksBox, colour: `#${string}`, solid = false) => boxes.push({ ...b, colour, solid });
  const highest = (pts: WorksPoint[]) => Math.max(...pts.map(ground));

  /** Sleepers and rails along a polyline (world points about a metre apart), the rail head at `y(k)`. */
  function track(pts: WorksPoint[], y: (k: number) => number, into: WorksBox[]) {
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)]!,
        b = pts[Math.min(pts.length - 1, k + 1)]!;
      const heading = Math.atan2(b.x - a.x, b.z - a.z);
      into.push({ ...box(pts[k]!.x, y(k) - 0.02, pts[k]!.z, 2.3, 0.12, 0.42, heading), colour: SLEEPER, solid: false });
      if (k === 0) continue;
      const p = pts[k - 1]!,
        q = pts[k]!,
        len = Math.hypot(q.x - p.x, q.z - p.z) || 1;
      for (const r of [-0.5, 0.5]) {
        const ox = ((q.z - p.z) / len) * r,
          oz = (-(q.x - p.x) / len) * r;
        into.push({
          ...beam({ x: p.x + ox, z: p.z + oz }, { x: q.x + ox, z: q.z + oz }, (y(k - 1) + y(k)) / 2 + 0.16, 0.1, 0.12),
          colour: RAIL,
          solid: false,
        });
      }
    }
  }
  const railAt = (road: 0 | 1, s: number) =>
    layout.railY(road ? layout.LINES.east : layout.LINES.north, Math.max(0, s));
  const TABLE_RAIL = layout.railY(layout.LINES.east, 0);

  // ---------------------------------------------------------------- the stubs and the buffer stops
  for (const road of [0, 1] as const) {
    const from = home.BUFFERS[road] + 0.4;
    const pts: WorksPoint[] = [];
    for (let s = from; s < 0.6; s += 1) pts.push(world(home.roadAt(road, s)));
    track(pts, () => railAt(road, 0), boxes);
    const p = world(home.roadAt(road, home.BUFFERS[road])),
      y = railAt(road, 0);
    const off = (x: number, ahead: number) => ({
      x: p.x + across.x * x + Math.sin(yaw) * ahead,
      z: p.z + across.z * x + Math.cos(yaw) * ahead,
    });
    const beamAt = off(0, 0.15);
    add(box(beamAt.x, y + 0.85, beamAt.z, 2.3, 0.45, 0.3, yaw), BUFFER, true);
    for (const x of [-0.75, 0.75]) {
      const post = off(x, -0.15);
      add(box(post.x, y + 0.5, post.z, 0.26, 1.15, 0.26, yaw), RAIL, true);
      const head = off(x * 0.8, 0.45);
      add(box(head.x, y + 0.85, head.z, 0.3, 0.3, 0.3, yaw), '#2f3131');
    }
  }

  // ---------------------------------------------------------------- the hall: posts, low end walls, roof, on its floor
  {
    const { a, c, w, d, height, endWall, floor, posts } = home.HALL;
    const mid = at(a, c);
    add(box(mid.x, floor - 0.12, mid.z, w + 0.2, 0.24, d + 0.2, yaw), STONE, true);
    // The way in from the square: the slab's top is 0.12 m over the highest ground under the hall, so over the sand
    // at the open north bays its front stands a third of a metre up, more than a walking step. Stone treads across
    // those bays, from the north wall to the shelf's end, each rise a walking step; the kerb stays everywhere else.
    {
      const STEP = 0.115,
        TREAD = 0.4;
      const c0 = c - w / 2 + 0.3,
        c1 = home.toAxis(home.SHELF_B).c - home.SHELF_SIZE.crown,
        edge = a - d / 2 - 0.1;
      const low = Math.min(...[c0, (c0 + c1) / 2, c1].map((cc) => ground(at(edge - TREAD, cc))));
      const n = Math.ceil((floor - low) / STEP);
      for (let k = 1; k < n; k++) {
        const top = floor - (k * (floor - low)) / n,
          tread = at(edge - (k - 0.5) * TREAD, (c0 + c1) / 2);
        add(box(tread.x, top - 0.3, tread.z, c1 - c0, 0.6, TREAD, yaw), STONE, true);
      }
    }
    // The end walls stop at 2.4 m, with a stone coping; the roof stands on the posts, the corner ones included.
    // The north wall (toward the forge) is in two lengths round the goods door, behind road 1's buffer.
    const door = home.HALL.goodsDoor;
    for (const j of [-1, 1]) {
      const spans: [number, number][] =
        j < 0
          ? [
              [a - d / 2, door.a0],
              [door.a1, a + d / 2],
            ]
          : [[a - d / 2, a + d / 2]];
      for (const [a0, a1] of spans) {
        // A length that ends at a corner stops 0.2 m short of it (the wall) or 0.1 m (the coping), as the whole wall did.
        const end = (v: number, inset: number) => (v === a - d / 2 ? v + inset : v === a + d / 2 ? v - inset : v);
        const wall0 = end(a0, 0.2),
          wall1 = end(a1, 0.2),
          cope0 = end(a0, 0.1),
          cope1 = end(a1, 0.1);
        const wall = at((wall0 + wall1) / 2, c + j * (w / 2 - 0.15)),
          cope = at((cope0 + cope1) / 2, c + j * (w / 2 - 0.15));
        add(box(wall.x, floor + endWall / 2, wall.z, 0.3, endWall, wall1 - wall0, yaw), BRICK, true);
        add(box(cope.x, floor + endWall + 0.06, cope.z, 0.42, 0.12, cope1 - cope0, yaw), STONE);
      }
    }
    for (const i of [-1, 1])
      for (const x of i < 0 ? posts.front : posts.back) {
        const post = at(a + i * (d / 2 - 0.2), c + x);
        add(box(post.x, floor + height / 2, post.z, 0.35, height, 0.35, yaw), POST, true);
      }
    for (const i of [-1, 1]) {
      const fascia = at(a + i * (d / 2 - 0.1), c);
      add(box(fascia.x, floor + height - 0.25, fascia.z, w, 0.5, 0.2, yaw), POST);
    }
    add(box(mid.x, floor + height + 0.15, mid.z, w + 0.8, 0.3, d + 0.8, yaw), ROOF, true);
    // The little guys walk round the hall (src/place/sites.ts).
    addFoot(mid.x, mid.z, yaw, w / 2, d / 2, owner);
  }

  // ---------------------------------------------------------------- the island: the apron and the kerb outline
  {
    const { buffers, apron, foot } = home.ISLAND_A;
    const half = home.ISLAND.width / 2,
      c = home.ISLAND_C;
    const pts = [at(buffers, c - half), at(buffers, c + half), at(apron, c - half), at(apron, c + half)];
    const top = highest(pts) + 0.1;
    const mid = at((buffers + apron) / 2, c);
    add(box(mid.x, top - 0.15, mid.z, home.ISLAND.width, 0.3, home.ISLAND.apron, yaw), STONE, true);
    // The kerb, from the apron's end round the island's far end: a station waiting for its trains.
    const pieces = Math.ceil((foot - apron) / 4);
    for (const j of [-1, 1])
      for (let k = 0; k < pieces; k++) {
        const a0 = apron + ((foot - apron) * k) / pieces,
          a1 = apron + ((foot - apron) * (k + 1)) / pieces;
        const p = at((a0 + a1) / 2, c + j * (half - 0.15));
        add(box(p.x, ground(p) + 0.1, p.z, 0.3, 0.24, a1 - a0 - 0.05, yaw), KERB);
      }
    const end = at(foot - 0.15, c);
    add(box(end.x, ground(end) + 0.1, end.z, home.ISLAND.width, 0.24, 0.3, yaw), KERB);
  }

  // ---------------------------------------------------------------- the board crossing over road 2
  // Planks along the road, level with the rail heads, with a gap at each rail for the wheels: the short way from the
  // island to the stall, drawn on the ground. No collider: a train runs through it and a player walks the rails anyway.
  {
    const { s, len, c0, c1 } = home.CROSSING;
    const a = s - home.ROAD2_S,
      top = railAt(1, s) + 0.22,
      rails = [home.ROAD_GAP - 0.5, home.ROAD_GAP + 0.5];
    const edges = [c0 + 0.05, rails[0]! - 0.09, rails[0]! + 0.09, rails[1]! - 0.09, rails[1]! + 0.09, c1];
    for (let k = 0; k < edges.length; k += 2) {
      // Each run of the crossing is planks about 0.3 m wide, a finger apart.
      const from = edges[k]!,
        to = edges[k + 1]!,
        n = Math.max(1, Math.round((to - from) / 0.3));
      for (let i = 0; i < n; i++) {
        const mid = at(a, from + ((to - from) * (i + 0.5)) / n);
        add(box(mid.x, top - 0.04, mid.z, (to - from) / n - 0.03, 0.08, len, yaw), PLANK);
      }
    }
    // A bright post at each far corner, so the crossing reads from the deck and from the stall.
    for (const da of [-len / 2, len / 2]) {
      const post = at(a + da, c1 + 0.12);
      add(box(post.x, ground(post) + 0.45, post.z, 0.14, 0.9, 0.14, yaw), BRASS);
    }
  }

  // ---------------------------------------------------------------- the spur, the stall roads and the ruined stalls
  track(home.spurPoints().map(world), () => TABLE_RAIL, boxes);
  const lever = (p: WorksPoint, heading: number) => {
    add(box(p.x, ground(p) + 0.18, p.z, 0.5, 0.36, 0.8, heading), POST, true);
    add(box(p.x, ground(p) + 0.75, p.z, 0.08, 0.9, 0.08, heading), BRASS);
  };
  const side = (road: 0 | 1, s: number, lat: number) => {
    const p = home.roadAt(road, s);
    const n = { x: Math.cos((p.bearing * Math.PI) / 180), z: Math.sin((p.bearing * Math.PI) / 180) };
    return world({ x: p.x + n.x * lat, z: p.z + n.z * lat });
  };
  lever(side(1, home.SPUR.s - 1.5, 2.4), yaw);
  const FLOOR = 18.05;
  for (const bearing of home.STALLS.bearings) {
    const f = home.stallFrame(bearing);
    const rim = world(f.rim),
      door = world(f.door);
    if (bearing === home.STALLS.open) {
      // The open stall is the Roundhouse's to draw (./roundhouse-view.ts); the little guys walk round it too.
      const mid = world(f.centre);
      addFoot(mid.x, mid.z, f.yaw, home.STALLS.width / 2, home.STALLS.depth / 2, owner);
    } else {
      const n = Math.ceil(home.STALLS.door - home.TABLE.r);
      track(
        Array.from({ length: n + 1 }, (_, k) => ({
          x: rim.x + ((door.x - rim.x) * k) / n,
          z: rim.z + ((door.z - rim.z) * k) / n,
        })),
        () => TABLE_RAIL + 0.05,
        boxes,
      );
      // A ruin's outline: a cracked floor and broken low walls, the shape of the stall that isn't built.
      const right = { x: Math.cos(f.yaw), z: -Math.sin(f.yaw) };
      const p = (r: number, x: number) =>
        world({ x: home.TABLE.x + f.u.x * r + right.x * x, z: home.TABLE.z + f.u.z * r + right.z * x });
      const { door: d0, depth, width } = home.STALLS;
      const centre = p(d0 + depth / 2, 0);
      add(box(centre.x, FLOOR, centre.z, width, 0.12, depth, f.yaw), '#8f8a80');
      addFoot(centre.x, centre.z, f.yaw, width / 2, depth / 2, owner);
      for (const x of [-1, 1]) {
        const heights = x < 0 ? [0.9, 0.35, 0.6] : [0.5, 0.8, 0.3];
        heights.forEach((h, k) => {
          const q = p(d0 + (depth * (k + 0.5)) / 3, x * (width / 2 - 0.2));
          add(box(q.x, FLOOR + h / 2, q.z, 0.4, h, depth / 3 - 0.4, f.yaw), RUIN, true);
        });
      }
      for (const [x, h] of [
        [-1, 0.7],
        [1, 0.45],
      ] as const) {
        const q = p(d0 + depth - 0.2, (x * width) / 4);
        add(box(q.x, FLOOR + h / 2, q.z, width / 2 - 0.3, h, 0.4, f.yaw), RUIN, true);
      }
    }
  }
  const statics = await drawWorksBoxes(owner, boxes);
  statics.castShadow = true;

  // ---------------------------------------------------------------- the cart's leg, laid with line 2's first stretch
  const legBoxes: WorksBox[] = [];
  const leg = home.legPoints().map(world);
  const fromY = railAt(0, home.LEG.from),
    toY = railAt(1, home.LEG.to);
  track(leg, (k) => fromY + ((toY - fromY) * k) / (leg.length - 1), legBoxes);
  const legMesh = await drawWorksBoxes(owner, [
    ...legBoxes,
    ...[side(0, home.LEG.from + 1.5, -2.4), side(1, home.LEG.to + 1.5, 2.4)].flatMap((p): WorksBox[] => [
      { ...box(p.x, ground(p) + 0.18, p.z, 0.5, 0.36, 0.8, yaw), colour: POST, solid: false },
      { ...box(p.x, ground(p) + 0.75, p.z, 0.08, 0.9, 0.08, yaw), colour: BRASS, solid: false },
    ]),
  ]);
  legMesh.castShadow = true;
  const legLaid = () => line2Completed(adapter.read.world()) >= 1;
  legMesh.visible = legLaid();
  return {
    update() {
      legMesh.visible = legLaid();
    },
  };
}
