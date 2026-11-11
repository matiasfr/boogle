// Accepted collision placement must survive snapshots without another transfer or a rounded fall direction.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { RailAction } from '../src/sim/railway.ts';
import { Pile, Rail } from '../src/sim/railway-components.ts';
import { RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { RIDER_REACH, RIDER_SPAN, railValid } from '../src/world/railway-server.ts';
import { LINE_HALTS, TRAIN_STOPS } from '../src/sim/railway-train.ts';
import { RAIL_HALTS } from '../src/sim/railway-lines.ts';
import { railLinePoint } from '../src/sim/railway-line-path.ts';
import { account, apply, createRailway, hash, invariant, piles, railSession, restore, tree } from './helpers/rail.ts';

function sourceFixture() {
  const state = createRailway();
  railSession(state, 'alice', 1);
  const w = state;
  w.mut(Rail, w.single(Rail))!.awake = 0;
  let request = 0;
  const action = (e: Omit<RailAction, 'epoch' | 'request'>) =>
    apply(state, 'alice', { ...e, epoch: 1, request: ++request }, 100);
  return { state, action };
}

test('wake accepts the whole machine prompt circle, including the side away from the receiving frame', () => {
  const w = createRailway();
  const e = { op: 'rail.wake', epoch: 1, request: 1 };
  // This live-reproduced point offered Wake it up but was over 10 m from the old frame-centred check.
  for (const [px, pz, expected] of [
    [99636, -15489, true],
    [T1.wake.x + 600, T1.wake.z, true],
    [T1.wake.x - 600, T1.wake.z, true],
    [T1.wake.x, T1.wake.z + 600, true],
    [T1.wake.x, T1.wake.z - 600, true],
    [T1.x, T1.z, true], // Preserve the previously accepted receiving-frame position.
    [T1.wake.x, T1.wake.z - 1001, false],
  ] as const) {
    const actor = {
      reach: (x: number, z: number, r: number) => Math.hypot(px - x, pz - z) <= r,
      height: () => true,
      cadence: () => true,
    };
    assert.equal(railValid(w, e, actor), expected, `${px}, ${pz}`);
  }
});

test('a fall keeps its exact direction, and collapse only on the accepted final output', () => {
  const { state, action } = sourceFixture();
  const yaw = 1.2345678901234567;
  for (let k = 0; k < 4; k++) action({ op: 'rail.chop', id: 0, yaw, collapsed: true });
  assert.equal(account(state, 'alice')!.carry, 8);
  assert.equal(tree(state, 0).yaw, 0);
  action({ op: 'rail.drop', x: 100000, y: 3201, z: -14000, n: 1 });
  action({ op: 'rail.chop', id: 0, yaw, collapsed: true });
  assert.equal(tree(state, 0).work, 15);
  assert.equal(tree(state, 0).left, 1);
  assert.equal(tree(state, 0).yaw, 0, 'a clipped fifth hit is not a felled tree');
  action({ op: 'rail.drop', x: 100000, y: 3201, z: -14000, n: 1 });
  action({ op: 'rail.chop', id: 0, yaw, collapsed: true });
  assert.equal(tree(state, 0).left, 0);
  assert.equal(tree(state, 0).yaw, yaw);
  assert.equal(tree(state, 0).fell, true);
  assert.equal(invariant(state), null);
  const restored = restore(state);
  assert.equal(tree(restored, 0).yaw, yaw, 'the float survives the save by its bits');
  assert.equal(hash(restored), hash(state));
});

test('the same horizontal position on two heights keeps distinct accepted piles through restore', () => {
  const { state, action } = sourceFixture();
  action({ op: 'rail.chop', id: 0, yaw: 0, collapsed: false });
  action({ op: 'rail.drop', x: 100000, y: 3201, z: -14000, n: 1 });
  action({ op: 'rail.drop', x: 100000, y: 2801, z: -14000, n: 1 });
  assert.equal(piles(state).length, 2);
  assert.deepEqual(
    piles(restore(state)).map((p) => p.y),
    [3201, 2801],
  );
  action({ op: 'rail.take', id: state.ids(Pile)[0]! });
  assert.equal(piles(state).length, 1);
  assert.equal(account(state, 'alice')!.carry, 1);
  assert.equal(invariant(state), null);
});

test('the server refuses missing and invalid placement before it reaches the rule', () => {
  const w = createRailway();
  const actor = { reach: () => true, height: () => true, cadence: () => true };
  const token = { epoch: 1, request: 1 };
  for (const e of [
    { op: 'rail.chop', id: 0 },
    { op: 'rail.chop', id: 0, yaw: NaN, collapsed: false },
    { op: 'rail.chop', id: 0, yaw: 7, collapsed: false },
    { op: 'rail.drop', x: 100000, z: -14000, n: 1 },
    { op: 'rail.drop', x: 100000, y: 0.5, z: -14000, n: 1 },
    { op: 'rail.take', id: 1, kind: 0 },
  ])
    assert.equal(railValid(w, { ...token, ...e }, actor), false, JSON.stringify(e));
  assert.equal(railValid(w, { ...token, op: 'rail.chop', id: 0, yaw: 0, collapsed: false }, actor), true);
  assert.equal(
    railValid(w, { ...token, op: 'rail.chop', id: 0, yaw: 0, collapsed: false }, { ...actor, reach: () => false }),
    false,
  );
});
test("a stop request is judged from the halt's lever or aboard its line's train", () => {
  const w = createRailway();
  const at = (px: number, pz: number) => ({
    reach: (x: number, z: number, r: number) => Math.hypot(px - x, pz - z) <= r,
    height: () => true,
    cadence: () => true,
  });
  // Since v26 each platform's lever asks for its own way: today's (down, towards the village), the new up one.
  const quarry = LINE_HALTS[3]!,
    [up] = RAIL_HALTS[3]!.platforms;
  const e = { op: 'rail.call', epoch: 1, request: 1, id: 3, dir: -1 };
  assert.equal(railValid(w, e, at(quarry.x + 200, quarry.z), 50), true, 'at the lever, on the platform');
  assert.equal(railValid(w, { ...e, dir: 1 }, at(quarry.x + 200, quarry.z), 50), false, 'the other way: across');
  assert.equal(railValid(w, { ...e, dir: 1 }, at(up.x + 200, up.z), 50), true, 'the up platform asks up');
  // Line 2's first train (slot 1) stands at its village stop (17 m along): a passenger on its rear car asks for the
  // quarry, naming the train. Standing, the reach is the rider's own plus the train's length (no travel in the lag
  // window).
  const ride = { ...e, dir: 1, train: 1 };
  const train = railLinePoint(1, TRAIN_STOPS[1]![0]!);
  const reach = RIDER_REACH + RIDER_SPAN;
  assert.equal(railValid(w, ride, at(train.x + reach - 100, train.z), 50), true, 'aboard');
  assert.equal(railValid(w, ride, at(train.x + reach + 300, train.z), 50), false, 'beside neither');
  assert.equal(railValid(w, { ...ride, train: 0 }, at(train.x, train.z), 50), false, "line 1's train");
  assert.equal(railValid(w, { ...ride, train: 3 }, at(train.x, train.z), 50), false, 'no such train');
  assert.equal(railValid(w, { ...ride, train: 0.5 }, at(train.x, train.z), 50), false, 'malformed train');
  assert.equal(railValid(w, { ...e, dir: 1 }, at(train.x, train.z), 50), false, 'aboard, no train named');
  assert.equal(railValid(w, { ...e, id: 0 }, at(train.x, train.z + 2000), 50), false, "line 1's halt, far from it");
  for (const dir of [undefined, 0, 2, -2])
    assert.equal(railValid(w, { ...e, dir }, at(quarry.x, quarry.z), 50), false, `dir ${dir}`);
});
