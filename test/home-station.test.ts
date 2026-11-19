// Layout B's geometry (docs/plans/home-station.md, step 1): the heads meet today's lines, the station's pieces stand
// in order along road 2, every stop sits beside the island, the stalls are radial, the tracks clear the buildings, and
// the cart's road is continuous. Pure numbers: nothing here is drawn or reaches the rules.
import test from 'node:test';
import { COACH_STOP, HOME_CONSIST } from '../dev/level/home-cart.ts';
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
  CURIO_GAP,
  CURIO_Y,
  FINDERS_B,
  SHELF_B,
  SHELF_SIZE,
  SHUNT_CUSP_S,
  SPUR,
  STALLS,
  TABLE,
  axisPoint,
  cartRoadAt,
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
import { CART, FORGE, LINES, ORIGIN, ROOM_PLOTS, TOWN, lineAt, type Plot } from '../src/place/layout.ts';
import {
  STEEL_CAR,
  TRAILER,
  TRAIN_OFFSETS,
  WAGON_CAR,
  consistOf,
  consistBounds,
  offsetOf,
  RIDER_CAR,
} from '../src/entities/railway/cars.ts';
import { ENGINE, ENGINE_LONG_AHEAD } from '../src/entities/railway/engine.ts';
import { LINE_HALTS, TRAIN_STOPS } from '../src/sim/railway-train.ts';
import { WAGON_S } from '../src/sim/railway-works-layout.ts';
import { CART_ROAD } from '../src/sim/railway-cart.ts';
import { LINE2_FORGE } from '../src/sim/railway-line2-layout.ts';
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
  const line = s === STOP[0] ? 0 : 1;
  const layout = consistOf({ line, wagon: consist !== 'three', steel: consist === 'steel' });
  const first = layout[0]!.offset;
  const gap = first - ENGINE.hz - TRAILER.hz;
  const lead = TRAILER.hz * cars + gap + ENGINE.hz * engine;
  const tail = consistBounds(layout).lo * cars;
  return [s + tail, s + lead + ENGINE.hz * engine] as const;
}

test('R2b passenger cars stay on the straight; Home mark is 4.65 m ahead of abeam and long nose uses the idle arc', () => {
  const [l1, l2] = STOP as [number, number];
  assert.equal(l1, 14);
  assert.equal(l2, 21.65); // R2b: approved stop for the real coach consist
  // R2b: the approved stop moves a further 3.4 m; the player and coach remain beside the existing island.
  assert.ok(Math.abs(toAxis(roadAt(1, l2)).a - toAxis(roadAt(0, l1)).a - 4.65) < 0.2, '4.65 m ahead of abeam');
  for (const engine of ENGINES) {
    assert.ok(
      trainSpan(l1, 1, 'three', engine)[1] <= HEADS[0].segs[0].len,
      `line 1's front on the straight at ${engine}x`,
    );
    assert.ok(
      trainSpan(l2, 1, 'steel', engine)[1] <= HEADS[1].segs[0].len + 3.35 + 1e-9,
      `line 2's front on the straight at ${engine}x`,
    );
  }
  // R1a invariant (railway-check-line2.ts): trains on implies cart at REST, so no vehicle runs on the leg.
  // Only the production engine may leave the straight; all boardable and freight cars stay on it.
  for (const v of HOME_CONSIST) {
    const nose = COACH_STOP + v.d + v.hz;
    assert.ok(nose <= HEADS[1].segs[0].len + (v.role === 'engine' ? 3.5 : 0), `${v.role} straight/arc allowance`);
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
    ]);
  }
  // R1a: trains on implies cart at REST; the leg is idle. The production train may pass its idle points.
  const plannedTail = COACH_STOP + HOME_CONSIST.at(-1)!.d - STEEL_CAR.hz;
  const plannedEngine = HOME_CONSIST[0]!;
  inOrder([
    ['buffer', BUFFERS[1], BUFFERS[1]],
    ['the cart', -CART.hz, CART.hz],
    ["the spur's points", SPUR.s, SPUR.s],
    ['production coach train', plannedTail, COACH_STOP + plannedEngine.d + plannedEngine.hz],
  ]);
  assert.ok(COACH_STOP + plannedEngine.d + plannedEngine.hz > LEG.to, 'nose past idle leg points');
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
        // R2b freight positions stay fixed; the engine moves 3.4 m forward (4.15 / 4.65 m overhang), each
        // bounded with 5 cm in hand, so a later stop or car change re-measures it.
        const behind = ISLAND_A.deck0 - (rear - shift),
          ahead = front - shift - ISLAND_A.deck1;
        assert.ok(behind <= 0.2, `road 2 at ${engine}x overhangs the deck ${behind.toFixed(2)} m behind`);
        assert.ok(ahead <= (engine === 1 ? 4.2 : 4.7), `road 2 at ${engine}x overhangs it ${ahead.toFixed(2)} m ahead`);
      }
      // Line 1's whole train; line 2's complete passenger area, from coach rear to players' front.
      const near =
        road === 0
          ? rear
          : STOP[road]! + offsetOf(consistOf({ line: road, wagon: false, steel: false }), 'rider') - RIDER_CAR.hz;
      const far = road === 0 ? front : passenger[1]!;
      for (let s = near; s <= far; s += 0.5) {
        const at = toAxis(roadAt(road, s));
        assert.ok(Math.abs(Math.abs(at.c - ISLAND_C) - (ISLAND.width / 2 + ISLAND.edge)) < 0.01, `road ${road} s ${s}`);
        assert.ok(dist(roadAt(road, s), centre) <= halt.reach / 100, `road ${road} s ${s} within ${halt.name}'s reach`);
      }
    }
});

/** A rectangle's four corners, in order round it. */
const corners = (r: Rect) =>
  [
    [-1, -1],
    [-1, 1],
    [1, 1],
    [1, -1],
  ].map(([i, j]) => ({
    x: r.c.x + r.u.x * r.hd * i! - r.u.z * r.hw * j!,
    z: r.c.z + r.u.z * r.hd * i! + r.u.x * r.hw * j!,
  }));
/** Separating axes: two rectangles (centre, unit `u` along their depth, half sizes) overlap. */
function overlaps(a: Rect, b: Rect) {
  for (const r of [a, b])
    for (const axis of [r.u, { x: -r.u.z, z: r.u.x }]) {
      const pa = corners(a).map((p) => p.x * axis.x + p.z * axis.z),
        pb = corners(b).map((p) => p.x * axis.x + p.z * axis.z);
      if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false;
    }
  return true;
}
type Rect = { c: XZ; u: XZ; hw: number; hd: number };

test('the table and stalls are radial: the spur and each stall road point at its centre, stalls 20 degrees apart', () => {
  const end = march(
    roadAt(1, SPUR.s),
    SPUR.segs,
    SPUR.segs.reduce((n, s) => n + s.len, 0),
  );
  assert.ok(Math.abs(dist(end, TABLE) - TABLE.r) < 1e-6, "the spur ends at the table's rim");
  assert.ok(angleGap(bearingOf(TABLE.x - end.x, TABLE.z - end.z), end.bearing) < 0.01, 'the spur runs at the centre');
  assert.ok(
    Math.abs(TABLE.x + 55.445) < 0.005 && Math.abs(TABLE.z - 19.178) < 0.005,
    'the table follows the unchanged spur end by its 8 m radius',
  );
  const frames = STALLS.bearings.map(stallFrame);
  for (const f of frames) {
    for (const p of [f.rim, f.door, f.back, f.centre])
      assert.ok(angleGap(bearingOf(p.x - TABLE.x, p.z - TABLE.z), f.bearing) < 1e-6, `stall ${f.bearing} radial`);
    assert.ok(Math.abs(dist(f.door, TABLE) - STALLS.door) < 1e-9);
  }
  for (let k = 1; k < frames.length; k++) {
    assert.equal(frames[k]!.bearing - frames[k - 1]!.bearing, 20);
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
  assert.ok(dist(open.door, { x: -57.88, z: 32.97 }) < 0.01 && dist(open.back, { x: -59.79, z: 43.8 }) < 0.01);
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
  for (let k = 1; k < path.pts.length; k++)
    assert.ok(dist(path.pts[k - 1]!, path.pts[k]!) <= STALLS.depth + 0.01, `shunt step ${k}`);
  // The stub move and the cart's forge stop share road 2's first metres: safe only because by the Works the cart
  // serves nothing (its stretches are train-fed) and rests at the camp. test/railway-works.test.ts asserts that
  // against the cart's phase through the roll-out, so a rule that wakes the cart then fails there.
  assert.ok(shunter - SHUNTER_HZ < CART.hz && SHUNT_CUSP_S + WAGON_CAR.hz > -CART.hz, 'they overlap on the road');
});

test('the hall: 1 m behind the buffers, centred on the island, five posts in four even bays; the curio pair beside it', () => {
  assert.ok(Math.abs(HALL.a + HALL.d / 2 - (BUFFERS[0] - 1)) < 1e-9);
  assert.ok(dist(HALL, { x: -90.16, z: 11.03 }) < 0.05, 'the plan put the hall at (-90.16, 11.03)');
  // The same five post lines front and back, symmetric about the centreline, the bays within 0.15 m of each other.
  assert.equal(HALL.posts.length, 5);
  const bays = HALL.posts.slice(1).map((x, k) => x - HALL.posts[k]!);
  assert.ok(Math.max(...bays) - Math.min(...bays) < 0.16, `bays ${bays.map((b) => b.toFixed(2)).join(', ')}`);
  HALL.posts.forEach((x, k) => assert.ok(Math.abs(x + HALL.posts[4 - k]!) < 1e-9, 'symmetric'));
  // Owner, 14 November: the shelf left the hall ("more inviting and open") and stands beside the finders' bay ("the
  // other blue rack... next to each other"): the same facing and level, fronts in line, a small gap, the bay 1 m off
  // the hall's south wall and the shelf beyond it. Nothing of either is inside the hall or under its roof.
  const s = toAxis(SHELF_B),
    b = toAxis(FINDERS_B),
    S = SHELF_SIZE;
  for (const p of [SHELF_B, FINDERS_B]) {
    const face = { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
    assert.ok(face.x * AXIS.d.x + face.z * AXIS.d.z < -0.999, 'it faces the square');
    assert.equal(p.y, CURIO_Y, 'both on one level');
  }
  assert.ok(Math.abs(s.a - b.a) < 1e-9, 'fronts in line');
  assert.ok(
    Math.abs(s.c - b.c - (2 * S.crown + CURIO_GAP)) < 1e-9 && CURIO_GAP > 0.1 && CURIO_GAP < 0.5,
    'a small gap',
  );
  const wall = HALL.c + HALL.w / 2;
  assert.ok(Math.abs(b.c - S.crown - wall - 1) < 0.01, 'the bay is 1 m from the south wall');
  assert.ok(b.c - S.crown > wall + (HALL.w + 0.8) / 2 - HALL.w / 2, 'clear of the roof’s eave');
  // Set back a little from the hall's front edge (so the shelf clears the Round's plot 3), never in front of it.
  const back = b.a - S.front - (HALL.a - HALL.d / 2);
  assert.ok(back > 0.5 && back < 1.2, `the pair's face is ${back.toFixed(2)} m behind the hall's front edge`);
  // Each frame's foot is at or under the ground all along it, never floating, and at most 0.25 m into it.
  for (const [name, at] of [
    ['shelf', s],
    ['bay', b],
  ] as const)
    for (const x of [-S.crown, 0, S.crown])
      for (const da of [-S.front, S.back]) {
        const p = axisPoint(at.a + da, at.c + x),
          g = H(p.x + 1000, p.z);
        assert.ok(g - CURIO_Y > -0.02 && g - CURIO_Y < 0.25, `${name} foot at ${x}, ${da}: ground ${g.toFixed(2)}`);
      }
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

// The forge rack's footprint in axis coordinates: its four 0.2 m posts (opening-models.ts rackModel: ±1.25 along,
// ±1.2 across, turned by `yaw` square to the axis) and the ends of its stacked 2.6 m rails (line2-view.ts rackSlot).
function rackFootprint() {
  const cos = Math.cos(PROPS.rack.yaw),
    sin = Math.sin(PROPS.rack.yaw);
  const at = (x: number, z: number) =>
    toAxis({ x: PROPS.rack.x + x * cos + z * sin, z: PROPS.rack.z - x * sin + z * cos });
  const posts = [-1.25, 1.25].flatMap((dx) =>
    [-1.2, 1.2].flatMap((dz) => [-0.1, 0.1].flatMap((ex) => [-0.1, 0.1].map((ez) => at(dx + ex, dz + ez)))),
  );
  const railEnds = [-1 - 0.07, -1 + 7 * 0.285 + 0.07].flatMap((x) => [-1.3, 1.3].map((z) => at(x, z)));
  const all = [...posts, ...railEnds];
  return {
    a0: Math.min(...all.map((p) => p.a)),
    a1: Math.max(...all.map((p) => p.a)),
    c0: Math.min(...all.map((p) => p.c)),
    c1: Math.max(...all.map((p) => p.c)),
  };
}

// docs/plans/forge-rack-move.md, step 1. The owner, 17 November: "Right now it's kind of in the middle of the station
// and I don't think I like it there." Off the island, square to the axis; the forge's mouth, the cart and the rack lie
// on one line across the station.
test("the forge rack stands off the island on road 2's outer side, abeam the cart's forge stop and the forge's mouth", () => {
  const at = toAxis(PROPS.rack);
  const { a0, a1, c0 } = rackFootprint();
  assert.ok(a1 - a0 < 2.71, 'square to the axis');
  const sleepers = ROAD_GAP + 1.15;
  assert.ok(c0 >= sleepers + 1.0, `${(c0 - sleepers).toFixed(2)} m off road 2's sleeper ends`);
  assert.ok(c0 >= ROAD_GAP + CART.hx + 1.5, `${(c0 - ROAD_GAP - CART.hx).toFixed(2)} m off the cart at its stop`);
  assert.ok(c0 > ISLAND_C + ISLAND.width / 2, 'nothing on the island');
  const eave = HALL.a + HALL.d / 2 + 0.4;
  assert.ok(a0 >= eave + 1.5, `a lane of ${(a0 - eave).toFixed(2)} m past the hall's eave`);
  const boards = { a0: CROSSING.s - ROAD2_S - CROSSING.len / 2, a1: CROSSING.s - ROAD2_S + CROSSING.len / 2 };
  const gap = Math.hypot(Math.max(boards.a0 - a1, a0 - boards.a1, 0), Math.max(c0 - CROSSING.c1, 0));
  assert.ok(gap >= 0.8, `${gap.toFixed(2)} m from the board crossing`);
  assert.ok(Math.abs(at.a - toAxis(roadAt(1, 0)).a) < 0.1, "abeam the cart's forge stop");
  assert.ok(Math.abs(at.a - toAxis({ x: FORGE.x, z: FORGE.z + FORGE.d / 2 - 0.5 }).a) < 0.1, "abeam the forge's mouth");
  const sim = { x: LINE2_FORGE.rackX / 100 - ORIGIN.x, z: LINE2_FORGE.rackZ / 100 - ORIGIN.z };
  assert.ok(dist(sim, PROPS.rack) < 0.01, `the sim's point is ${dist(sim, PROPS.rack).toFixed(3)} m off the drawing`);
});

test('the island stays open: no yard prop stands on it', () => {
  for (const [name, p] of Object.entries(PROPS)) {
    const at = toAxis(p);
    const on = at.a >= ISLAND_A.buffers && at.a <= ISLAND_A.foot && Math.abs(at.c - ISLAND_C) <= ISLAND.width / 2;
    assert.ok(!on, `${name} stands on the island at a ${at.a.toFixed(2)}, c ${at.c.toFixed(2)}`);
  }
});

test('the greeter stands in front of the hall, before a post and not in a bay, well off the curio pair', () => {
  const at = toAxis(PROPS.greeter);
  assert.ok(at.a < HALL.a - HALL.d / 2 - 1, 'out on the square, over a metre in front of the hall');
  // The front posts' lines across: he stands before the second, so every bay of the open front is clear.
  const posts = HALL.posts.map((x) => HALL.c + x);
  const before = Math.min(...posts.map((c) => Math.abs(c - at.c)));
  assert.ok(before < 0.3, `he stands ${before.toFixed(2)} m off a post's line, beside the open bay`);
  for (const p of [SHELF_B, FINDERS_B])
    assert.ok(dist(PROPS.greeter, p) > 10, 'the curio pair is the hall’s other end');
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
test('the rules’ cart distance lands on Home’s road: the forge stop on road 2’s s 0, the rail height unbroken', () => {
  const lines = { north: spliceHead(LINES.north, headPoints(0)), east: spliceHead(LINES.east, headPoints(1)) };
  const forge = CART_ROAD.forgeCm / 100;
  assert.equal(CART_ROAD.forgeCm, Math.round(CART_FORGE * 100));
  assert.ok(dist(cartRoadAt(forge, lines), roadAt(1, 0)) < 0.01);
  assert.ok(dist(cartRoadAt(forge + 30, lines), roadAt(1, 30)) < 0.01, 'metre for metre past the stop');
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
  const [tail] = trainSpan(STOP[1]!, 1, 'steel', ENGINES[1]);
  assert.ok(to <= tail - 1, `the boards end ${(tail - to).toFixed(2)} m behind the steel car`);
  assert.ok(to <= SPUR.s - 1.5, `and ${(SPUR.s - to).toFixed(2)} m short of the spur's points`);
  assert.ok(from >= CART.hz + 0.5, `the cart at its forge stop is ${(from - CART.hz).toFixed(2)} m clear`);
  // R1a: trains on implies cart at REST; the planned nose may pass the idle leg's points.
  // The crossing still belongs behind the tail: exact planned margin 1.95 m, independent of that nose.
  const plannedTail = COACH_STOP + HOME_CONSIST.at(-1)!.d - STEEL_CAR.hz;
  assert.ok(Math.abs(plannedTail - to - 1.95) < 0.01, 'boards end 1.95 m behind planned steel tail');
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
  const rack = rackFootprint();
  for (let k = 0; k <= 100; k++) {
    const p = { x: start.x + ((door.x - start.x) * k) / 100, z: start.z + ((door.z - start.z) * k) / 100 };
    assert.ok(dist(p, TABLE) > TABLE.r + 0.5, 'west of the table');
    for (const r of spurPoints()) assert.ok(dist(p, r) > 1.5, `clear of the spur at step ${k}`);
    // And it heads away from the forge rack on road 2's outer side.
    const q = toAxis(p),
      off = Math.hypot(Math.max(rack.a0 - q.a, q.a - rack.a1, 0), Math.max(rack.c0 - q.c, q.c - rack.c1, 0));
    assert.ok(off >= 1.5, `${off.toFixed(2)} m from the forge rack at step ${k}`);
  }
  assert.ok(
    dist(start, door) > 29 && dist(start, door) < 30,
    `${dist(start, door).toFixed(1)} m from the boards to the moved stall's door`,
  );
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

test("the deck rests on the spur's and the stall's bearings", async () => {
  const [{ tableYaws }, { rimCut }, { layHomeYard }, THREE] = await Promise.all([
    import('../src/entities/railway/table-bridge.ts'),
    import('../src/entities/railway/works-shape.ts'),
    import('../src/entities/railway/home-yard.ts'),
    import('three/webgpu'),
  ]);
  const bearingOfYaw = (yaw: number) => bearingOf(Math.sin(yaw), Math.cos(yaw));
  const end = march(
    roadAt(1, SPUR.s),
    SPUR.segs,
    SPUR.segs.reduce((n, s) => n + s.len, 0),
  );
  const [toStall, toSpur] = tableYaws().map(bearingOfYaw);
  // The deck is one straight across the table: lying along a road either way round is resting on it.
  const along = (a: number, b: number) => Math.min(angleGap(a, b), angleGap(a, b + 180));
  assert.ok(along(toSpur!, bearingOf(end.x - TABLE.x, end.z - TABLE.z)) < 1e-6, `spur ${toSpur}`);
  const open = stallFrame(STALLS.open);
  assert.ok(along(toStall!, bearingOf(open.rim.x - TABLE.x, open.rim.z - TABLE.z)) < 1e-6, `stall ${toStall}`);
  // At either rest each rail meets the road's across 6 cm: the deck's are cut 3 cm inside the rim, and every rail
  // the yard lays that reaches the rim is cut 3 cm outside it (docs/plans/turnouts.md, (e)).
  assert.ok(Math.abs(Math.hypot(rimCut(-1), 0.5) - (TABLE.r - 0.03)) < 1e-9, 'the deck rails end on r - 0.03');
  const centre = { x: TABLE.x + ORIGIN.x, z: TABLE.z };
  const ends = layHomeYard(H)
    .rails()
    .flatMap((m) => {
      const half = new THREE.Vector3(0, 0, 3.05 / 2).applyMatrix4(m),
        mid = new THREE.Vector3().setFromMatrixPosition(m);
      return [half, mid.multiplyScalar(2).sub(half)].map((p) => Math.hypot(p.x - centre.x, p.z - centre.z));
    })
    .filter((r) => r < TABLE.r + 1);
  // The spur's two and the seven stall roads' two each.
  assert.equal(ends.length, 2 * (1 + 7));
  for (const r of ends)
    assert.ok(Math.abs(r - (TABLE.r + 0.03)) < 0.001, `a rail ends ${(r - TABLE.r).toFixed(4)} m out`);
});

test('rim timbers clear each other', async () => {
  const [{ layHomeYard }, { SLEEPER }, { segDist }, { prefabs }] = await Promise.all([
    import('../src/entities/railway/home-yard.ts'),
    import('../src/entities/railway/works-shape.ts'),
    import('../src/island/stamps.ts'),
    import('../src/content/prefabs/roundhouse.ts'),
  ]);
  const kerb = prefabs.find((p) => p.key === 'roundhouse.table')!.layout as { inner: number; outer: number };
  const centre = { x: TABLE.x + ORIGIN.x, z: TABLE.z };
  // The timbers the yard lays, as footprints: a sleeper's size, square to its road.
  const timbers = layHomeYard(H)
    .rimTimbers()
    .map((p): Rect => ({
      c: p,
      u: { x: Math.sin(p.yaw), z: Math.cos(p.yaw) },
      hw: SLEEPER.length / 2,
      hd: SLEEPER.depth / 2,
    }));
  assert.equal(timbers.length, 8, 'the spur and seven bays');
  // Each lies along its road, out from the centre, on the pit's kerb: its inner edge on it, its outer inside it.
  for (const t of timbers) {
    const r = dist(t.c, centre);
    // Along its road either way: the spur runs in to the table, the stall roads out from it.
    const across = angleGap(bearingOf(t.u.x, t.u.z), bearingOf(t.c.x - centre.x, t.c.z - centre.z));
    assert.ok(Math.min(across, 180 - across) < 1e-6, `a timber ${across.toFixed(4)} degrees off radial`);
    assert.ok(r - t.hd >= kerb.inner && r + t.hd <= kerb.outer, `a timber's middle ${r.toFixed(3)} m out`);
  }
  /** Two rectangles that do not overlap are as far apart as a corner of one is from an edge of the other. */
  const gap = (a: Rect, b: Rect) =>
    Math.min(
      ...[
        [a, b],
        [b, a],
      ].flatMap(([p, q]) =>
        corners(p!).flatMap((c) =>
          corners(q!).map((e, k, all) => segDist(c.x, c.z, e.x, e.z, all[(k + 1) % 4]!.x, all[(k + 1) % 4]!.z).d),
        ),
      ),
    );
  let nearest = Infinity;
  for (let i = 0; i < timbers.length; i++)
    for (let j = i + 1; j < timbers.length; j++) {
      assert.ok(!overlaps(timbers[i]!, timbers[j]!));
      nearest = Math.min(nearest, gap(timbers[i]!, timbers[j]!));
    }
  assert.ok(nearest >= 0.18, `the nearest two rim timbers are ${nearest.toFixed(3)} m apart`);
});
