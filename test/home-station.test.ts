// Layout B's geometry (docs/plans/home-station.md, step 1): the heads meet today's lines, the station's pieces stand
// in order along road 2, every stop sits beside the island, the stalls are radial, the tracks clear the buildings, and
// the cart's road is continuous. Pure numbers: nothing here is drawn or reaches the rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AXIS,
  BUFFERS,
  CART_FORGE,
  CROSSING,
  HALL,
  HEADS,
  ISLAND,
  ISLAND_A,
  ISLAND_C,
  LEG,
  LEVER_REACH,
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
  cartRoadFrom,
  cartRoadY,
  headPoints,
  islandLever,
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

// docs/plans/home-flip.md, F1 (the spatial review's three, and the design review's call 13).
test('the rack stands on the apron and leaves a lane along road 1; its posts clear the cart on road 2', () => {
  const at = toAxis(PROPS.rack);
  const half = ISLAND.width / 2;
  assert.ok(at.a > ISLAND_A.buffers && at.a < ISLAND_A.apron, `on the apron along the axis: a ${at.a.toFixed(2)}`);
  assert.ok(Math.abs(at.c - ISLAND_C) < half, `on the apron across: c ${at.c.toFixed(2)}`);
  // Its four 0.2 m posts (opening-models.ts rackModel: ±1.25 east, ±1.2 south; it is not turned to the axis).
  const posts = [-1.25, 1.25].flatMap((dx) =>
    [-1.2, 1.2].flatMap((dz) =>
      [-0.1, 0.1].flatMap((ex) =>
        [-0.1, 0.1].map((ez) => toAxis({ x: PROPS.rack.x + dx + ex, z: PROPS.rack.z + dz + ez })),
      ),
    ),
  );
  const near = Math.min(...posts.map((p) => p.c)),
    far = Math.max(...posts.map((p) => p.c));
  // The lane from the hall's back bay to the head ramp: between road 1's sleeper ends (2.3 m sleepers) and the posts.
  const lane = near - 1.15;
  assert.ok(lane >= 1.9, `the lane beside road 1 is ${lane.toFixed(2)} m`);
  assert.ok(near - (ISLAND_C - half) >= 1.4, 'and 1.4 m of it is on the apron itself');
  assert.ok(
    far <= ROAD_GAP - CART.hx - 0.2,
    `the far posts are ${(ROAD_GAP - CART.hx - far).toFixed(2)} m off the cart`,
  );
});

test('the greeter stands in front of the hall, before a post and not in a bay, outside the shelf’s reach', () => {
  const at = toAxis(PROPS.greeter);
  assert.ok(at.a < HALL.a - HALL.d / 2 - 1, 'out on the square, over a metre in front of the hall');
  // The front posts' lines across; the way in is the two bays north of the shelf, either side of the second post.
  const posts = [-(HALL.w / 2 - 0.15), -HALL.w / 4, 0, HALL.w / 4, HALL.w / 2 - 0.15].map((x) => HALL.c + x);
  const before = Math.min(...posts.map((c) => Math.abs(c - at.c)));
  assert.ok(before < 0.3, `he stands ${before.toFixed(2)} m off a post's line, beside the open bay`);
  assert.ok(at.c < toAxis(SHELF_B).c - SHELF_SIZE.crown, 'north of the shelf');
  // The shelf's prompt reaches 4.4 m from its centre (the spatial review's figure).
  const away = dist(PROPS.greeter, SHELF_B);
  assert.ok(away > 4.4 + 1, `he is ${away.toFixed(2)} m from the shelf`);
});

test('the goods door: 1.5 m in the north wall’s back half, behind road 1’s buffer, clear of the posts', () => {
  const { a0, a1 } = HALL.goodsDoor;
  assert.ok(Math.abs(a1 - a0 - 1.5) < 1e-9);
  assert.ok(a0 >= HALL.a && a1 <= HALL.a + HALL.d / 2 - 0.2 - 0.175, 'in the back half, short of the corner post');
  assert.ok(a1 < BUFFERS[0], 'behind the buffers');
  // The north wall is on road 1's side, the forge's.
  assert.ok(toAxis(FORGE).c < HALL.c - HALL.w / 2, 'the forge is beyond the north wall');
});

// docs/plans/home-flip.md, F2.
test('the rules’ cart distance lands on layout B’s road: the forge stop on road 2’s s 0, the rail height unbroken', () => {
  const lines = { north: spliceHead(LINES.north, headPoints(0)), east: spliceHead(LINES.east, headPoints(1)) };
  const F = 196; // today's forge stop in the rules (CART_ROAD.forgeCm), until the flip
  assert.equal(cartRoadFrom(0, F), 0);
  assert.ok(Math.abs(cartRoadFrom(F, F) - CART_FORGE) < 1e-9);
  assert.ok(Math.abs(cartRoadFrom(F + 30, F) - (CART_FORGE + 30)) < 1e-9, 'metre for metre past the stop');
  assert.ok(dist(cartRoadAt(cartRoadFrom(F, F), lines), roadAt(1, 0)) < 0.01);
  // Heights from each line's own s: the leg joins line 1's at its points to road 2's with no step.
  const y = { north: (s: number) => 20 + s * 0.01, east: (s: number) => 19 + s * 0.02 };
  let prev = cartRoadY(0, y);
  for (let d = 0.25; d <= CART_FORGE + 60; d += 0.25) {
    const at = cartRoadY(d, y);
    assert.ok(Math.abs(at - prev) < 0.02, `d ${d}: a ${(at - prev).toFixed(3)} m step in the rail`);
    prev = at;
  }
  assert.equal(cartRoadY(CART_FORGE, y), y.east(0));
});

test('the board crossing over road 2: behind a standing train’s tail, off the spur’s points, beside the head ramp', () => {
  const { s, len, c0, c1 } = CROSSING;
  const from = s - len / 2,
    to = s + len / 2;
  // The longest train line 2 stands at its stop: the longer boiler ahead, the steel car last.
  const [tail, head] = trainSpan(STOP[1]!, 1, 'steel', ENGINES[1]);
  assert.ok(to <= tail - 1, `the boards end ${(tail - to).toFixed(2)} m behind the steel car`);
  assert.ok(to <= SPUR.s - 1.5, `and ${(SPUR.s - to).toFixed(2)} m short of the spur's points`);
  assert.ok(from >= CART.hz + 0.5, `the cart at its forge stop is ${(from - CART.hz).toFixed(2)} m clear`);
  // The island's far end has no room for it: the nose stands within 1.6 m of the leg's points.
  assert.ok(LEG.to - head < 1.6, `the far end leaves ${(LEG.to - head).toFixed(2)} m`);
  // Beside the head ramp's lower half: a short step down from it, never from the full deck.
  const a = s - ROAD2_S,
    up = (v: number) => (ISLAND.lift * (v - ISLAND_A.apron)) / ISLAND.headRamp;
  assert.ok(a - len / 2 >= ISLAND_A.apron && a + len / 2 <= ISLAND_A.deck0, 'beside the head ramp');
  assert.ok(up(a + len / 2) < 0.45, `the ramp is at most ${up(a + len / 2).toFixed(2)} m up there`);
  // From the island's edge to past road 2's sleepers (2.3 m wide), on the straight.
  assert.ok(Math.abs(c0 - (ISLAND_C + ISLAND.width / 2)) < 1e-9 && c1 >= ROAD_GAP + 1.15 + 0.5);
  assert.ok(Math.abs(roadAt(1, to).bearing - AXIS.bearing) < 1e-9, 'road 2 is straight there');
  // The straight walk from its far side to the open stall's door misses the table and crosses no track a vehicle
  // runs on: it stays off the spur (it steps over the ruined 220° stall's dead road, between the rim and that ruin).
  const start = axisPoint(a, c1),
    door = stallFrame(STALLS.open).door;
  for (let k = 0; k <= 100; k++) {
    const p = { x: start.x + ((door.x - start.x) * k) / 100, z: start.z + ((door.z - start.z) * k) / 100 };
    assert.ok(dist(p, TABLE) > TABLE.r + 0.5, 'west of the table');
    for (const r of spurPoints()) assert.ok(dist(p, r) > 1.5, `clear of the spur at step ${k}`);
  }
  assert.ok(dist(start, door) < 25, `${dist(start, door).toFixed(1)} m from the boards to the stall's door`);
});

test('the island’s two levers stand more than twice the prompt’s reach apart, each on its own edge of the deck', () => {
  const levers = [islandLever(0), islandLever(1)] as const;
  const apart = dist(levers[0], levers[1]);
  assert.ok(apart > 2 * LEVER_REACH, `${apart.toFixed(2)} m apart against ${2 * LEVER_REACH} m`);
  levers.forEach((p, road) => {
    const at = toAxis(p);
    assert.ok(at.a > ISLAND_A.deck0 && at.a < ISLAND_A.deck1, `lever ${road} on the deck along the axis`);
    assert.ok(Math.abs(at.c - ISLAND_C) <= ISLAND.width / 2 - 0.17, `lever ${road}'s frame on the deck across`);
    // Nearer its own road than the other.
    assert.ok(Math.abs(at.c - road * ROAD_GAP) < Math.abs(at.c - (1 - road) * ROAD_GAP));
  });
});
