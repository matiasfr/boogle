// The line catalog (docs/plans/generic-lines.md, step 1): v25's stop and halt tables are views of RAIL_LINES, value for
// value. The literals below are v25's (#1409), copied before the move; a change here is a WORLD_NS break.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RAIL_HALTS,
  RAIL_LINES,
  RAIL_TRAINS,
  TRAIN_EXTENT,
  TURNOUT_CM,
  BALANCE_MAX_TICKS,
  balanceOk,
  PIER_EAST,
  haltPlatform,
  trainPlaces,
} from '../src/sim/railway-lines.ts';
import {
  RING_END,
  RING_END_BRAKE_CMS2,
  RING_HALT,
  RING_HEAD,
  RING_JOINT_UP,
  RING_PATH,
} from '../src/sim/railway-ring-layout.ts';
import { LINE2_ROWS, line2Stops } from './helpers/rail-rows.ts';
import { TRAIN_CARS, TRAIN_OFFSETS } from '../src/entities/railway/cars.ts';
import { ENGINE_LONG_AHEAD } from '../src/entities/railway/engine.ts';
import { FORMATION, TURNOUT } from '../src/place/layout.ts';
import { LINE_HALTS, TRAIN, TRAIN_HOME, TRAIN_STOPS, trainStopsOf } from '../src/sim/railway-train.ts';
import { railLinePoint } from '../src/sim/railway-line-path.ts';
import { PIER_STOP_CM } from '../src/sim/railway-works-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';

const V25_STOPS = [
  [1400, 20700],
  [1700, 17400, 52400, PIER_STOP_CM],
];
const V25_HOME = [1, 0];
/** v27 (ring-island-build1, R3b): line 2 runs three trains, at the Village (up), Far Head (down) and Quarry (down). */
const V27_HOME = [1, 0, 2, 1];
/** v27's two halts after the Pier: the Railhead at its first head, Ring Island. */
const V27_STOPS = [RING_HEAD[0]!.s, RING_END.s];
const V25_HALTS = [
  { name: 'Village', line: 0, stop: 0, x: 92819, z: -434, y: 1902, reach: 1260 },
  { name: 'Camp', line: 0, stop: 1, x: 100964, z: -14610, y: 3102, reach: 1360 },
  { name: 'Village, line 2', line: 1, stop: 0, x: 92779, z: 2617, y: 1902, reach: 1260 },
  { name: 'Quarry', line: 1, stop: 1, x: 108132, z: 4114, y: 2502, reach: 1160 },
  { name: 'Far Head', line: 1, stop: 2, x: 136361, z: -16353, y: 2502, reach: 1260 },
  { name: 'Pier', line: 1, stop: 3, x: 139969, z: -35833, y: 2502, reach: 1260 },
];
const V25_PATHS = [
  [
    91800, 1200, 92451, 441, 93103, -318, 93774, -1059, 94378, -1855, 94920, -2695, 95390, -3577, 95751, -4509, 96044,
    -5465, 96322, -6426, 96578, -7392, 96828, -8361, 97099, -9323, 97442, -10263, 97592, -11243, 97320, -12203, 97213,
    -13188, 97478, -14143, 98294, -14683, 99267, -14911, 100264, -14922, 101264, -14900, 102264, -14900,
  ],
  [
    91800, 1200, 92507, 1907, 93204, 2624, 93863, 3375, 94762, 3785, 95758, 3828, 96728, 3600, 97662, 3242, 98624, 2980,
    99620, 2900, 100617, 2976, 101600, 3153, 102571, 3391, 103543, 3627, 104527, 3803, 105525, 3865, 106525, 3850,
    107523, 3799, 108509, 3738, 109387, 3260, 110221, 2710, 111042, 2138, 111857, 1559, 112662, 966, 113457, 359,
    114252, -247, 115057, -841, 115881, -1407, 116715, -1959, 117541, -2522, 118349, -3112, 119138, -3725, 119919,
    -4350, 120695, -4981, 121471, -5612, 122249, -6240, 123029, -6866, 123808, -7493, 124588, -8119, 125369, -8743,
    126153, -9363, 126940, -9981, 127726, -10599, 128515, -11214, 129306, -11825, 130103, -12430, 130906, -13025,
    131718, -13608, 132537, -14183, 133360, -14751, 134185, -15316, 135015, -15874, 135868, -16396, 136720, -16919,
    137516, -17522, 138198, -18253, 138754, -19083, 139192, -19981, 139523, -20924, 139759, -21895, 139944, -22878,
    140106, -23865, 140236, -24856, 140330, -25852, 140393, -26850, 140427, -27849, 140438, -28849, 140434, -29849,
    140421, -30849, 140403, -31849, 140378, -32848, 140343, -33848, 140303, -34847, 140259, -35846, 140215, -36845,
  ],
];

test("v25's stop, home and halt tables are views of the catalog, with v27's two halts appended", () => {
  assert.deepEqual(TRAIN_STOPS, [V25_STOPS[0], [...V25_STOPS[1]!, ...V27_STOPS]]);
  assert.deepEqual([...TRAIN_HOME].slice(0, 2), V25_HOME, 'the first train of each line stands where v25s did');
  assert.deepEqual([...TRAIN_HOME], V27_HOME);
  // Halt ids 0-4 keep v25's down platform; the Pier's moved east of the down track (call 53).
  assert.deepEqual(LINE_HALTS.slice(0, 5), V25_HALTS.slice(0, 5));
  assert.deepEqual(LINE_HALTS[5], { name: 'Pier', line: 1, stop: 3, ...PIER_EAST });
  assert.deepEqual(
    LINE_HALTS.slice(6).map((h) => [h.name, h.line, h.stop]),
    [
      ['Railhead', 1, 4],
      ['Ring Island', 1, 5],
    ],
  );
  assert.deepEqual(
    RAIL_TRAINS.map((t) => t.line),
    [0, 1, 1, 1],
    'line 1 one train, line 2 three',
  );
  assert.equal(RAIL_HALTS.length, V25_HALTS.length + 2);
  RAIL_HALTS.slice(0, 5).forEach((h, id) => {
    assert.equal(h.s, V25_STOPS[h.line]![h.stop], `halt ${id} stands at its stop`);
    // Today's platform serves the down track; Quarry and Far Head have an up one (step 2), the stubs' ends one.
    assert.deepEqual(h.platforms[1], {
      x: V25_HALTS[id]!.x,
      z: V25_HALTS[id]!.z,
      y: V25_HALTS[id]!.y,
      reach: V25_HALTS[id]!.reach,
    });
    assert.equal(h.platforms[0] === h.platforms[1], h.name !== 'Quarry' && h.name !== 'Far Head', h.name);
  });
});

test('the pier opens with Q6, as v25 (BEFORE_PIER); the Railhead with Q7', () => {
  assert.deepEqual(trainStopsOf(0, false), V25_STOPS[0]);
  assert.deepEqual(trainStopsOf(0, true), V25_STOPS[0]);
  assert.deepEqual(trainStopsOf(1, false), V25_STOPS[1]!.slice(0, 3));
  assert.deepEqual(trainStopsOf(1, true), V25_STOPS[1]);
  // By count of complete QJob slots: the pier is slot 5, Q6; the Railhead slot 6, Q7; the island waits for the rivet.
  for (let laid = 0; laid <= LINE2_STATIONS.length; laid++)
    assert.deepEqual(
      trainStopsOf(1, laid),
      laid >= 7 ? [...V25_STOPS[1]!, V27_STOPS[0]] : laid >= 6 ? V25_STOPS[1] : V25_STOPS[1]!.slice(0, 3),
      `${laid} laid`,
    );
});

test("every halt's opening slot exists, and halts run in s order", () => {
  for (const l of RAIL_LINES) {
    for (const h of l.halts)
      assert.ok(
        h.opens === -1 || (Number.isInteger(h.opens) && h.opens >= 0 && h.opens < LINE2_STATIONS.length),
        `${h.name} opens at ${h.opens}`,
      );
    for (let k = 1; k < l.halts.length; k++) assert.ok(l.halts[k]!.s > l.halts[k - 1]!.s, `${l.id} in s order`);
    assert.ok(l.home >= 0 && l.home < l.halts.length && l.halts[l.home]!.opens === -1, `${l.id}'s home is open`);
    assert.equal(l.speed, TRAIN.speed);
    assert.equal(l.accel, TRAIN.accel);
  }
  assert.deepEqual(
    RAIL_LINES.map((l) => l.id),
    ['line1', 'line2'],
  );
});

test("railLinePoint reads the catalog's path, v25's PATHS and line 2's on to Ring Island", () => {
  const paths = [V25_PATHS[0]!, [...V25_PATHS[1]!, ...RING_PATH]];
  RAIL_LINES.forEach((l, line) => {
    assert.deepEqual(l.path, paths[line]);
    for (let k = 0; k < l.path.length / 2; k++)
      assert.deepEqual(railLinePoint(line, k * 1000), { x: paths[line]![k * 2], z: paths[line]![k * 2 + 1] });
  });
});

test("every halt that can be its line's open end says how it turns trains back, inside the line", () => {
  for (const l of RAIL_LINES)
    l.halts.forEach((h, k) => {
      const last = k === 0 || k === l.halts.length - 1 || l.halts[k + 1]!.opens >= 0;
      assert.equal(!!h.end, last, `${h.name}`);
      if (h.end) {
        assert.ok(h.end.kind !== 'loop', 'no loop before v27');
        const inward = k === 0 ? h.end.mergeCm > h.s : h.end.mergeCm < h.s;
        assert.ok(inward && h.end.mergeCm > l.halts[k === 0 ? 0 : k - 1]!.s - (k === 0 ? 1 : 0), `${h.name}'s merge`);
      }
    });
});

// Review of v26, P2-1: a train held at a stub's signal stood on the drawn turnout. The signals are derived from the
// turnout and the train's reach, so these must be the drawn ones.
test("the sim's train reach and turnout are the drawn ones, and every signal stands clear of its block", () => {
  const ahead = Math.max(...TRAIN_CARS.map((c, n) => TRAIN_OFFSETS[n]! + c.hz)),
    behind = Math.max(...TRAIN_CARS.map((c, n) => c.hz - TRAIN_OFFSETS[n]!));
  // From v28 (ring-island-build2, R3, call 15) the reach ahead is rail-map's long train (8.2 m) on either boiler: at
  // least the drawn engine's with the longer boiler's frame (6.7 m), the wagon's tail behind as drawn.
  assert.equal(TRAIN_EXTENT.behindCm, Math.round(behind * 100));
  assert.equal(TRAIN_EXTENT.aheadCm, 820);
  assert.ok(TRAIN_EXTENT.aheadCm >= Math.round((ahead + ENGINE_LONG_AHEAD) * 100), 'covers the longer engine as drawn');
  assert.equal(TURNOUT * 100, TURNOUT_CM);
  const drawn = [FORMATION.timber, FORMATION.quarry];
  RAIL_LINES.forEach((l, line) =>
    l.halts.forEach((h, k) => {
      // The Railhead's and Ring Island's ends are the ring layout's (test/railway-ring-layout.test.ts, R1b), not
      // FORMATION's.
      if (!h.end || h.heads || h.ring) return;
      const side = k === 0 ? -1 : 1,
        lead = side < 0 ? TRAIN_EXTENT.behindCm : TRAIN_EXTENT.aheadCm;
      if (h.end.kind === 'stub') {
        assert.equal(
          h.end.mergeCm,
          (side < 0 ? drawn[line]!.from : drawn[line]!.to) * 100,
          `${h.name}: the drawn merge`,
        );
        assert.equal(h.end.edgeCm, h.end.mergeCm - side * TURNOUT_CM, `${h.name}: past the turnout`);
      } else assert.equal(h.end.mergeCm, drawn[line]!.crossover![0] * 100, `${h.name}: the drawn crossover`);
      assert.equal(h.end.signalCm, h.end.edgeCm - side * lead, `${h.name}: a held train's lead stops at the block`);
    }),
  );
  // The reviewer's numbers: the village's signal about 63 m, the pier's about 530 m.
  assert.equal(RAIL_LINES[1]!.halts[0]!.end!.signalCm, 6300);
  assert.equal(RAIL_LINES[1]!.halts[3]!.end!.signalCm, 52780);
});

// ---------------------------------------------------------------- v27's line 2 (ring-island-build1, R3b)
test("v27's line 2 keeps v26's halts, moves the Pier east of the down track and appends the Railhead and the island", () => {
  const line2 = RAIL_LINES[1]!,
    halts = line2.halts;
  assert.deepEqual(
    halts.map((h) => h.name),
    ['Village, line 2', 'Quarry', 'Far Head', 'Pier', 'Railhead', 'Ring Island'],
  );
  halts.slice(0, 4).forEach((h, k) => assert.equal(h.s, V25_STOPS[1]![k], `${h.name} stands where v26's did`));
  halts.slice(0, 3).forEach((h, k) => {
    const v = V25_HALTS[k + 2]!;
    assert.deepEqual(h.platforms[1], { x: v.x, z: v.z, y: v.y, reach: v.reach }, `${h.name}: v26's down platform`);
  });
  // The Pier's one platform, both ways: 2.9 m east of line 2's path at s 730 m (x greater: east), its lever's reach.
  const [px, pz] = [line2.path[73 * 2]!, line2.path[73 * 2 + 1]!];
  assert.deepEqual([px, pz], [140259, -35846]);
  for (const p of halts[3]!.platforms) {
    assert.equal(p, PIER_EAST);
    assert.ok(Math.abs(Math.sqrt((p.x - px) ** 2 + (p.z - pz) ** 2) - 290) <= 2, 'about 2.9 m off the path');
    assert.ok(p.x > px, 'east');
    assert.equal(p.reach, 1260);
  }
  assert.equal(halts[3]!.only, -1);
  // The path runs on: line 2's, then RING_PATH, its index still s / 1000.
  assert.equal(line2.path.length, V25_PATHS[1]!.length + RING_PATH.length);
  assert.deepEqual(line2.path.slice(0, V25_PATHS[1]!.length), V25_PATHS[1]);
  assert.equal(line2.trains, 3);
  assert.equal(line2.balance, 600, 'the balanced hold, capped 60 s past the dwell (call 47)');
  for (const h of halts)
    assert.ok(h.opens === -1 || (Number.isInteger(h.opens) && h.opens >= 0 && h.opens <= 6), `${h.name} opens`);
  // The Railhead: every number from the ring layout, its end at bent 6 (R1b's numbers).
  const head = halts[4]!;
  assert.deepEqual(
    head.heads,
    RING_HEAD.map((h) => h.s),
  );
  assert.deepEqual(head.heads, [85200, 87200, 89200, 91200, 93200, 95200, 97200, 99200]);
  assert.equal(head.s, RING_HEAD[0]!.s);
  assert.deepEqual(head.platforms, [RING_JOINT_UP, RING_HEAD[0]!.platform]);
  assert.equal(head.brake, RING_END_BRAKE_CMS2 / 100);
  assert.deepEqual(head.end, { kind: 'stub', mergeCm: 83200, edgeCm: 81200, signalCm: 80380 });
  // Ring Island: the crossover on the Way, the buffers 15 m on.
  const island = halts[5]!;
  assert.equal(island.s, RING_END.s);
  assert.equal(island.s, 119000);
  assert.deepEqual(island.platforms, [RING_HALT.up, RING_HALT.down]);
  assert.equal(island.ring, true);
  assert.deepEqual(island.end, { kind: 'crossover', mergeCm: 113700, edgeCm: 113700, signalCm: 112880 });
  // A heads halt's down side is the railhead's platform where it stands now.
  for (let k = 0; k < RING_HEAD.length; k++) {
    assert.equal(haltPlatform(head, -1, k), RING_HEAD[k]!.platform);
    assert.equal(haltPlatform(head, 1, k), RING_JOINT_UP);
  }
  assert.equal(haltPlatform(halts[3]!, 1), PIER_EAST);
});

test("the catalog: every fixed halt's platform by way is its own; v27's fields only on the Pier, Railhead and island", () => {
  RAIL_HALTS.forEach((h, id) => {
    assert.equal(haltPlatform(id, 1), h.platforms[0]);
    if (!h.heads) assert.equal(haltPlatform(id, -1), h.platforms[1]);
    const v27 = [
      h.ring ? 'ring' : '',
      h.heads ? 'heads' : '',
      h.only !== undefined ? 'only' : '',
      h.brake ? 'brake' : '',
    ]
      .filter(Boolean)
      .join();
    assert.equal(v27, { Pier: 'only', Railhead: 'heads,brake', 'Ring Island': 'ring' }[h.name] ?? '', h.name);
  });
});

test('v27 stops: Q6 opens the Pier, Q7 the Railhead at its bent, the rivet the island', () => {
  assert.deepEqual(trainStopsOf(1, true), V25_STOPS[1], "v26's shim: true is Q6 laid");
  assert.deepEqual(line2Stops(0), [1700, 17400, 52400]);
  assert.deepEqual(line2Stops(6), [1700, 17400, 52400, 72650]);
  assert.deepEqual(trainStopsOf(LINE2_ROWS, true), line2Stops(6), 'the shim means Q6, not every slot');
  for (let k = 0; k < RING_HEAD.length; k++) {
    assert.deepEqual(line2Stops(7, k), [1700, 17400, 52400, 72650, RING_HEAD[k]!.s]);
    assert.deepEqual(line2Stops(7, k, true), [1700, 17400, 52400, 72650, RING_HEAD[k]!.s, 119000]);
    assert.deepEqual(line2Stops(6, k, true), line2Stops(6), 'nothing past the pier before Q7');
  }
  // 1173 m end to end once joined (the plan's v27 numbers).
  const joined = line2Stops(7, 7, true);
  assert.deepEqual(joined, [1700, 17400, 52400, 72650, 99200, 119000]);
  assert.equal(joined[joined.length - 1]! - joined[0]!, 117300);
});

test('three trains stand on three places: the Village (up), Far Head (down) and Quarry (down)', () => {
  assert.deepEqual(trainPlaces(LINE2_ROWS, line2Stops(0)), [
    { stop: 0, track: 0 },
    { stop: 2, track: 1 },
    { stop: 1, track: 1 },
  ]);
  for (const stops of [line2Stops(6), line2Stops(7, 3), line2Stops(7, 7, true)]) {
    const places = trainPlaces(LINE2_ROWS, stops).map((p) => `${p.stop}/${p.track}`);
    assert.equal(new Set(places).size, 3, `${places.join(' ')}`);
  }
  // The catalog's line 2 is the same row.
  assert.deepEqual(trainPlaces(1, TRAIN_STOPS[1]!.slice(0, 3)), trainPlaces(LINE2_ROWS, line2Stops(0)));
});

test("a line's balanced hold is absent or 1 to BALANCE_MAX_TICKS whole ticks; trainPlaces refuses any other", () => {
  const stops = line2Stops(7, 7, true);
  for (const balance of [undefined, 1, 600, BALANCE_MAX_TICKS]) {
    assert.ok(balanceOk(balance), `${balance}`);
    assert.doesNotThrow(() => trainPlaces({ ...LINE2_ROWS, balance }, stops));
  }
  for (const balance of [0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, BALANCE_MAX_TICKS + 1, 2 ** 53]) {
    assert.ok(!balanceOk(balance), `${balance}`);
    assert.throws(() => trainPlaces({ ...LINE2_ROWS, balance }, stops), /balance/);
  }
  for (const l of RAIL_LINES) assert.ok(balanceOk(l.balance), l.id);
});
