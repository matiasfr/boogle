// The line catalog (docs/plans/generic-lines.md, step 1): v25's stop and halt tables are views of RAIL_LINES, value for
// value. The literals below are v25's (#1409), copied before the move; a change here is a WORLD_NS break.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAIL_HALTS, RAIL_LINES, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { LINE_HALTS, TRAIN, TRAIN_HOME, TRAIN_STOPS, trainStopsOf } from '../src/sim/railway-train.ts';
import { railLinePoint } from '../src/sim/railway-line-path.ts';
import { PIER_STOP_CM } from '../src/sim/railway-works-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';

const V25_STOPS = [
  [1400, 20700],
  [1700, 17400, 52400, PIER_STOP_CM],
];
const V25_HOME = [1, 0];
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

test("v25's stop, home and halt tables are views of the catalog", () => {
  assert.deepEqual(TRAIN_STOPS, V25_STOPS);
  assert.deepEqual([...TRAIN_HOME], V25_HOME);
  assert.deepEqual(LINE_HALTS, V25_HALTS);
  assert.deepEqual(
    RAIL_TRAINS.map((t) => t.line),
    [0, 1],
    'one train a line, slot = line',
  );
  assert.equal(RAIL_HALTS.length, V25_HALTS.length);
  RAIL_HALTS.forEach((h, id) => {
    assert.equal(h.s, V25_STOPS[h.line]![h.stop], `halt ${id} stands at its stop`);
    assert.deepEqual(h.platforms[0], h.platforms[1], `halt ${id}: both platforms are v25's one until double track`);
  });
});

test('the pier opens with Q6, as v25 (BEFORE_PIER)', () => {
  assert.deepEqual(trainStopsOf(0, false), V25_STOPS[0]);
  assert.deepEqual(trainStopsOf(0, true), V25_STOPS[0]);
  assert.deepEqual(trainStopsOf(1, false), V25_STOPS[1]!.slice(0, 3));
  assert.deepEqual(trainStopsOf(1, true), V25_STOPS[1]);
  // By count of complete QJob slots: the pier is slot 5, Q6.
  for (let laid = 0; laid <= LINE2_STATIONS.length; laid++)
    assert.deepEqual(trainStopsOf(1, laid), laid >= 6 ? V25_STOPS[1] : V25_STOPS[1]!.slice(0, 3), `${laid} laid`);
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

test("railLinePoint reads the catalog's path, v25's PATHS", () => {
  RAIL_LINES.forEach((l, line) => {
    assert.deepEqual(l.path, V25_PATHS[line]);
    for (let k = 0; k < l.path.length / 2; k++)
      assert.deepEqual(railLinePoint(line, k * 1000), { x: V25_PATHS[line]![k * 2], z: V25_PATHS[line]![k * 2 + 1] });
  });
});
