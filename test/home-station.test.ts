// Layout B's geometry (docs/plans/home-station.md, step 1): the heads meet today's lines, the station's pieces stand
// in order along road 2, every stop sits beside the island, the stalls are radial, the tracks clear the buildings, and
// the cart's road is continuous. Pure numbers: nothing here is drawn or reaches the rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AXIS,
  BUFFERS,
  CART_FORGE,
  HALL,
  HEADS,
  ISLAND,
  ISLAND_A,
  ISLAND_C,
  LEG,
  PROPS,
  ROAD2_S,
  ROAD_GAP,
  SHELF_B,
  SHELF_SIZE,
  SHUNT_CUSP_S,
  SPUR,
  STALLS,
  TABLE,
  axisPoint,
  cartRoadAt,
  headPoints,
  legPoints,
  march,
  roadAt,
  shuntPath,
  spliceHead,
  spurPoints,
  stallFrame,
  toAxis,
  type XZ,
} from '../src/place/home-station.ts';
import { CART, FORGE, LINES, ROOM_PLOTS, TOWN, lineAt, type Plot } from '../src/place/layout.ts';
import { STEEL_CAR, TRAILER, TRAIN_OFFSETS, WAGON_CAR, steelCarOffset } from '../src/entities/railway/cars.ts';
import { ENGINE, ENGINE_LONG_AHEAD } from '../src/entities/railway/engine.ts';
import { LINE_HALTS, TRAIN_STOPS } from '../src/sim/railway-train.ts';
import { WAGON_S } from '../src/sim/railway-works-layout.ts';
import { H } from '../src/place/terrain.ts';

const bearingOf = (ux: number, uz: number) => ((((Math.atan2(ux, -uz) * 180) / Math.PI) % 360) + 360) % 360;
const angleGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const dist = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);
const STOP = TRAIN_STOPS.map((stops) => stops[0]! / 100);
const P = { x: 0, z: 0, ux: 0, uz: 0 };

test('each head is 1 m samples from s 0 to its join, meeting today line at the join on the same heading', () => {
  const today = [LINES.north, LINES.east];
  for (const road of [0, 1] as const) {
    const head = headPoints(road),
      join = HEADS[road].join;
    assert.equal(head.length, join + 1);
    for (let s = 1; s <= join; s++)
      assert.ok(Math.abs(dist(head[s - 1]!, head[s]!) - 1) < 0.002, `road ${road} s ${s}`);
    lineAt(today[road]!, join, P);
    assert.ok(dist(head[join]!, P) < 0.03, `road ${road} meets today's line: ${dist(head[join]!, P)} m`);
    assert.ok(angleGap(roadAt(road, join).bearing, bearingOf(P.ux, P.uz)) < 0.5, `road ${road} heading at the join`);
  }
});

/** The engine's lengths: A as built (src/entities/railway/engine.ts) and with the longer boiler, its frame 0.5 m longer
 * ahead (docs/plans/engine-previz.md: 4.5 m, 1.5× the old LOCO, the longest these halts allow). */
const ENGINES = [1, 1 + ENGINE_LONG_AHEAD / (2 * ENGINE.hz)];
/** A train's extent along its road at stop `s`: cars from TRAIN_OFFSETS, the engine scaled by `engine` and moved out
 * so the gap behind its cab stays, every car scaled by `cars`. `consist`: three cars, three and the footing wagon, or
 * (v33, docs/plans/fourth-car.md) the wagon's train on the longer boiler, the steel car last (steelCarOffset(true)). */
function trainSpan(s: number, cars: number, consist: 'three' | 'wagon' | 'steel', engine = cars) {
  const [first, , third, fourth] = TRAIN_OFFSETS as [number, number, number, number];
  const gap = first - ENGINE.hz - TRAILER.hz;
  const lead = TRAILER.hz * cars + gap + ENGINE.hz * engine;
  const tail =
    consist === 'steel'
      ? (steelCarOffset(true) - STEEL_CAR.hz) * cars
      : consist === 'wagon'
        ? (fourth - WAGON_CAR.hz) * cars
        : (third - TRAILER.hz) * cars;
  return [s + tail, s + lead + ENGINE.hz * engine] as const;
}

test("both stops are on the straight, line 2's 1.25 m ahead of abeam (v33), with room for the longer boiler past them", () => {
  const [l1, l2] = STOP as [number, number];
  assert.equal(l1, 14);
  assert.equal(l2, 18.25); // v33 (fourth-car R2, level finding 1): the only mark that fits four cars on road 2
  // Abeam until v33: line 2's mark moved 1.25 m on (fourth-car R2) for its four-car train, so it stands that far ahead.
  assert.ok(Math.abs(toAxis(roadAt(1, l2)).a - toAxis(roadAt(0, l1)).a - 1.25) < 0.2, '1.25 m ahead of abeam');
  for (const engine of ENGINES) {
    assert.ok(
      trainSpan(l1, 1, 'three', engine)[1] <= HEADS[0].segs[0].len,
      `line 1's front on the straight at ${engine}x`,
    );
    assert.ok(
      trainSpan(l2, 1, 'steel', engine)[1] <= HEADS[1].segs[0].len,
      `line 2's front on the straight at ${engine}x`,
    );
  }
});

/** In order along the road and not touching. */
function inOrder(spans: [string, number, number][]) {
  for (let k = 1; k < spans.length; k++) {
    const [a, , aEnd] = spans[k - 1]!,
      [b, bStart] = spans[k]!;
    assert.ok(aEnd < bStart, `${a} ends at ${aEnd.toFixed(2)}, before ${b} starts at ${bStart.toFixed(2)}`);
  }
}

test('road 2: buffer, cart, points, waiting wagon, train and leg in order and apart; no stop overlaps a buffer', () => {
  const wagon = WAGON_S / 100;
  // The wagon waits only until it first couples, long before the install: a waiting wagon meets a three-car train.
  for (const engine of ENGINES) {
    const train = trainSpan(STOP[1]!, 1, 'three', engine);
    inOrder([
      ['buffer', BUFFERS[1], BUFFERS[1]],
      ['the cart at its forge stop', -CART.hz, CART.hz],
      ["the spur's points", SPUR.s, SPUR.s],
      ['the waiting wagon', wagon - WAGON_CAR.hz, wagon + WAGON_CAR.hz],
      [`the train, engine ${engine}x`, train[0], train[1]],
      ["the leg's points", LEG.to, LEG.to],
    ]);
  }
  // The whole train at 1.25x stands with its wagon coupled: the scaled cars reach back past the waiting wagon's place
  // (the engine pass must move WAGON_S, or the stop, before it scales the cars).
  const whole = trainSpan(STOP[1]!, 1.25, 'wagon');
  inOrder([
    ['buffer', BUFFERS[1], BUFFERS[1]],
    ['the cart', -CART.hz, CART.hz],
    ["the spur's points", SPUR.s, SPUR.s],
    ['the whole train at 1.25x, wagon coupled', whole[0], whole[1]],
    ["the leg's points", LEG.to, LEG.to],
  ]);
  // v33 (docs/plans/fourth-car.md, level finding 1): the wagon's train on the longer boiler, four cars and the steel
  // car last, at 1x: its rear just past the spur's points (5.55 against 5.5), its nose short of the leg's points.
  // Not layout B finished for four cars: the Home flip owns road 2's deck and the car's road.
  for (const engine of ENGINES) {
    const four = trainSpan(STOP[1]!, 1, 'steel', engine);
    inOrder([
      ['buffer', BUFFERS[1], BUFFERS[1]],
      ['the cart', -CART.hz, CART.hz],
      ["the spur's points", SPUR.s, SPUR.s],
      [`the wagon's fitted train, engine ${engine}x`, four[0], four[1]],
      ["the leg's points", LEG.to, LEG.to],
    ]);
  }
  const one = trainSpan(STOP[0]!, 1.25, 'three');
  assert.ok(BUFFERS[0] < one[0], "line 1's whole train at 1.25x clears road 1's buffer");
  assert.ok(one[1] <= HEADS[0].segs[0].len, "and stays on road 1's straight");
});

test('every stop stands beside the island, 1.65 m in from its edge and within its halt reach', () => {
  assert.ok(Math.abs(ROAD_GAP - (ISLAND.width + 2 * ISLAND.edge)) < 0.01, 'the roads are 7.6 m apart');
  const centre = axisPoint((ISLAND_A.deck0 + ISLAND_A.deck1) / 2, ISLAND_C);
  const cases = [
    { road: 0 as const, halt: LINE_HALTS[0], shift: 0, consist: 'three' as const },
    { road: 1 as const, halt: LINE_HALTS[2], shift: ROAD2_S, consist: 'steel' as const },
  ];
  for (const { road, halt, shift, consist } of cases)
    for (const engine of ENGINES) {
      const [rear, front] = trainSpan(STOP[road]!, 1, consist, engine);
      // From v33 (fourth-car, level finding 1) road 2's longest train overhangs the island's deck at both ends (by
      // 0.15 m behind and about 1.25 m ahead); its passenger car, where the seats are, stands on it.
      const passenger = [STOP[road]! + TRAIN_OFFSETS[1]! - TRAILER.hz, STOP[road]! + TRAIN_OFFSETS[1]! + TRAILER.hz];
      assert.ok(
        passenger[0]! - shift >= ISLAND_A.deck0 && passenger[1]! - shift <= ISLAND_A.deck1,
        `road ${road}'s passenger car on the deck`,
      );
      if (road === 0)
        assert.ok(
          rear - shift >= ISLAND_A.deck0 && front - shift <= ISLAND_A.deck1,
          `road ${road} at ${engine}x on the deck`,
        );
      else {
        // The overhang as measured (0.15 m behind; 0.75 m ahead on the standard engine, 1.25 m on the longer), each
        // bounded with 5 cm in hand, so a later stop or car change re-measures it.
        const behind = ISLAND_A.deck0 - (rear - shift),
          ahead = front - shift - ISLAND_A.deck1;
        assert.ok(behind <= 0.2, `road 2 at ${engine}x overhangs the deck ${behind.toFixed(2)} m behind`);
        assert.ok(ahead <= (engine === 1 ? 0.8 : 1.3), `road 2 at ${engine}x overhangs it ${ahead.toFixed(2)} m ahead`);
      }
      for (let s = rear; s <= front; s += 0.5) {
        const at = toAxis(roadAt(road, s));
        assert.ok(Math.abs(Math.abs(at.c - ISLAND_C) - (ISLAND.width / 2 + ISLAND.edge)) < 0.01, `road ${road} s ${s}`);
        assert.ok(dist(roadAt(road, s), centre) <= halt.reach / 100, `road ${road} s ${s} within ${halt.name}'s reach`);
      }
    }
});

/** Separating axes: two rectangles (centre, unit `u` along their depth, half sizes) overlap. */
function overlaps(a: Rect, b: Rect) {
  const corners = (r: Rect) =>
    [-1, 1].flatMap((i) =>
      [-1, 1].map((j) => ({
        x: r.c.x + r.u.x * r.hd * i - r.u.z * r.hw * j,
        z: r.c.z + r.u.z * r.hd * i + r.u.x * r.hw * j,
      })),
    );
  for (const r of [a, b])
    for (const axis of [r.u, { x: -r.u.z, z: r.u.x }]) {
      const pa = corners(a).map((p) => p.x * axis.x + p.z * axis.z),
        pb = corners(b).map((p) => p.x * axis.x + p.z * axis.z);
      if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false;
    }
  return true;
}
type Rect = { c: XZ; u: XZ; hw: number; hd: number };

test('the table and stalls are radial: the spur and each stall road point at its centre, stalls 30 degrees apart', () => {
  const end = march(
    roadAt(1, SPUR.s),
    SPUR.segs,
    SPUR.segs.reduce((n, s) => n + s.len, 0),
  );
  assert.ok(Math.abs(dist(end, TABLE) - TABLE.r) < 1e-6, "the spur ends at the table's rim");
  assert.ok(angleGap(bearingOf(TABLE.x - end.x, TABLE.z - end.z), end.bearing) < 0.01, 'the spur runs at the centre');
  assert.ok(
    Math.abs(TABLE.x + 57.9) < 0.05 && Math.abs(TABLE.z - 17.12) < 0.05,
    'the plan put the table at (-57.90, 17.12)',
  );
  const frames = STALLS.bearings.map(stallFrame);
  for (const f of frames) {
    for (const p of [f.rim, f.door, f.back, f.centre])
      assert.ok(angleGap(bearingOf(p.x - TABLE.x, p.z - TABLE.z), f.bearing) < 1e-6, `stall ${f.bearing} radial`);
    assert.ok(Math.abs(dist(f.door, TABLE) - STALLS.door) < 1e-9);
  }
  for (let k = 1; k < frames.length; k++) {
    assert.equal(frames[k]!.bearing - frames[k - 1]!.bearing, 30);
    const rect = (f: (typeof frames)[number]): Rect => ({
      c: f.centre,
      u: f.u,
      hw: STALLS.width / 2,
      hd: STALLS.depth / 2,
    });
    assert.ok(
      !overlaps(rect(frames[k - 1]!), rect(frames[k]!)),
      `stalls ${frames[k - 1]!.bearing} and ${frames[k]!.bearing}`,
    );
  }
  // The open stall is not straight through from the spur, so a turn shows: it swings 60 degrees.
  assert.equal(angleGap(TABLE.spur, STALLS.open), 120);
  const open = frames[1]!;
  assert.ok(dist(open.door, { x: -59.37, z: 25.49 }) < 0.05 && dist(open.back, { x: -60.94, z: 34.35 }) < 0.05);
});

test('no track centre comes within 2.8 m of a building', () => {
  const plots: Plot[] = [
    ...TOWN.start,
    ...TOWN.wood.flat(),
    ...TOWN.stone.flat(),
    ...TOWN.camps.flatMap((c) => [...c.asleep, ...c.awake]),
  ];
  const rects: (Rect & { name: string })[] = [
    { name: 'the forge', c: FORGE, u: { x: 0, z: 1 }, hw: FORGE.w / 2, hd: FORGE.d / 2 },
    ...plots.map((p) => ({
      name: `${p.type} at (${p.x}, ${p.z})`,
      c: p,
      u: { x: Math.sin(p.yaw ?? 0), z: Math.cos(p.yaw ?? 0) },
      hw: (p.w ?? 6) / 2,
      hd: (p.d ?? 6) / 2,
    })),
    ...Object.entries(ROOM_PLOTS).map(([name, p]) => ({
      name,
      c: p,
      u: { x: Math.sin(p.yaw), z: Math.cos(p.yaw) },
      hw: p.w / 2,
      hd: p.d / 2,
    })),
  ];
  const gap = (p: XZ, r: Rect) => {
    const dx = p.x - r.c.x,
      dz = p.z - r.c.z;
    const along = dx * r.u.x + dz * r.u.z,
      across = -dx * r.u.z + dz * r.u.x;
    return Math.hypot(Math.max(0, Math.abs(across) - r.hw), Math.max(0, Math.abs(along) - r.hd));
  };
  const stubs = ([0, 1] as const).flatMap((road) =>
    Array.from({ length: Math.ceil(-BUFFERS[road]) + 1 }, (_, k) => roadAt(road, Math.min(0, BUFFERS[road] + k))),
  );
  const roads = STALLS.bearings.flatMap((b) => {
    const f = stallFrame(b);
    return Array.from({ length: 5 }, (_, k) => ({
      x: f.rim.x + ((f.door.x - f.rim.x) * k) / 4,
      z: f.rim.z + ((f.door.z - f.rim.z) * k) / 4,
    }));
  });
  const track = [...headPoints(0), ...headPoints(1), ...stubs, ...legPoints(), ...spurPoints(), ...roads];
  for (const r of rects)
    for (const p of track)
      assert.ok(
        gap(p, r) >= 2.8,
        `track at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) is ${gap(p, r).toFixed(2)} m from ${r.name}`,
      );
});

test("the cart's road is continuous: line 1, the leg, road 2 to the buffers (the forge stop), then out along line 2", () => {
  const lines = { north: spliceHead(LINES.north, headPoints(0)), east: spliceHead(LINES.east, headPoints(1)) };
  const legEnd = march(LEG.start, LEG.segs, LEG.len);
  assert.ok(dist(legEnd, roadAt(1, LEG.to)) < 0.03, 'the leg lands on road 2 at s 26');
  assert.ok(angleGap(legEnd.bearing, roadAt(1, LEG.to).bearing + 180) < 0.5, 'heading in');
  assert.ok(dist(cartRoadAt(CART_FORGE, lines), roadAt(1, 0)) < 0.01, "the forge stop is road 2's s 0");
  assert.ok(dist(roadAt(1, 0), PROPS.rack) < 4, 'beside the forge rack');
  const step = 0.25;
  let prev = cartRoadAt(0, lines);
  for (let d = step; d <= CART_FORGE + 120; d += step) {
    const at = cartRoadAt(d, lines);
    const moved = dist(prev, at);
    // A reversal at the forge stop moves nothing for one step.
    assert.ok(moved <= step + 0.03, `d ${d.toFixed(2)}: a ${moved.toFixed(3)} m jump`);
    prev = at;
  }
});

test('the shunt fits the stub, over the cart forge stop', () => {
  const SHUNTER_HZ = 1.7,
    GAP = 3.6;
  const shunter = SHUNT_CUSP_S - GAP;
  assert.ok(shunter - SHUNTER_HZ >= BUFFERS[1] + 0.25, 'the shunter stops short of the buffer');
  assert.ok(SHUNT_CUSP_S + WAGON_CAR.hz < SPUR.s, "the wagon's rear clears the points");
  const path = shuntPath(WAGON_S / 100);
  for (let k = 1; k < path.pts.length; k++) assert.ok(dist(path.pts[k - 1]!, path.pts[k]!) < 9.1, `shunt step ${k}`);
  // The stub move and the cart's forge stop share road 2's first metres: safe only because by the Works the cart
  // serves nothing (its stretches are train-fed) and rests at the camp. test/railway-works.test.ts asserts that
  // against the cart's phase through the roll-out, so a rule that wakes the cart then fails there.
  assert.ok(shunter - SHUNTER_HZ < CART.hz && SHUNT_CUSP_S + WAGON_CAR.hz > -CART.hz, 'they overlap on the road');
});

test('the hall and shelf: 1 m behind the buffers, centred on the island; the shelf in the front, facing the square', () => {
  assert.ok(Math.abs(HALL.a + HALL.d / 2 - (BUFFERS[0] - 1)) < 1e-9);
  assert.ok(dist(HALL, { x: -90.16, z: 11.03 }) < 0.05, 'the plan put the hall at (-90.16, 11.03)');
  assert.equal(SHELF_B.y, HALL.floor, 'on the hall floor');
  // Its footprint along the axis (front toward the square) and across (its side way on +x, toward the south wall).
  const s = toAxis(SHELF_B),
    S = SHELF_SIZE;
  const face = { x: Math.sin(SHELF_B.yaw), z: Math.cos(SHELF_B.yaw) };
  assert.ok(face.x * AXIS.d.x + face.z * AXIS.d.z < -0.999, 'it faces the square');
  const a0 = s.a - S.front,
    a1 = s.a + S.back,
    c0 = s.c - S.crown,
    c1 = s.c + S.crown;
  // Backed onto the front posts' line, 5 cm clear of their inner face, and clear of every post.
  const front = HALL.a - HALL.d / 2 + 0.2;
  assert.ok(Math.abs(a0 - (front + 0.175 + 0.05)) < 1e-9, 'just behind the front posts');
  for (const i of [-1, 1])
    for (const x of [-(HALL.w / 2 - 0.15), -HALL.w / 4, 0, HALL.w / 4, HALL.w / 2 - 0.15]) {
      const pa = HALL.a + i * (HALL.d / 2 - 0.2),
        pc = HALL.c + x;
      const apart = pa + 0.175 <= a0 || pa - 0.175 >= a1 || pc + 0.175 <= c0 || pc - 0.175 >= c1;
      assert.ok(apart, `clear of the post at a ${pa.toFixed(2)}, c ${pc.toFixed(2)}`);
    }
  // The south wall's inside face keeps 0.15 m for the works board; the back span (the line map) keeps 3 m clear.
  assert.ok(c1 + S.sideWay <= HALL.c + HALL.w / 2 - 0.3 - 0.15 + 1e-9, 'the side way and the works board fit');
  assert.ok(HALL.a + HALL.d / 2 - 0.2 - a1 > 3, 'off the line map span at the back');
  // The way in from the square, between the north end wall's inside face and the shelf's end, stays wide open.
  assert.ok(c0 - (HALL.c - HALL.w / 2 + 0.3) > 4.5, 'the way in is over 4.5 m wide');
  // The floor is a slab 0.1 to 0.2 m over the highest ground under the hall, so nothing stands in it.
  const ground = [-1, 0, 1].flatMap((i) =>
    [-1, 0, 1].map((j) => {
      const p = axisPoint(HALL.a + (i * HALL.d) / 2, HALL.c + (j * HALL.w) / 2);
      return H(p.x + 1000, p.z);
    }),
  );
  const top = Math.max(...ground);
  assert.ok(HALL.floor - top > 0.1 && HALL.floor - top < 0.2, `floor ${HALL.floor} over ground up to ${top}`);
  assert.ok(HALL.endWall < 2.5 && HALL.endWall < HALL.height, 'low end walls, the roof on posts');
});
