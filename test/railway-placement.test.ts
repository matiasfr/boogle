// Accepted collision placement must survive snapshots without another transfer or a rounded fall direction.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { RailAction } from '../src/sim/railway.ts';
import { Rail } from '../src/sim/railway-world.ts';
import { RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { RIDER_REACH, railValid } from '../src/world/railway-server.ts';
import { LINE_HALTS, TRAIN_STOPS } from '../src/sim/railway-train.ts';
import { railLinePoint } from '../src/sim/railway-line-path.ts';
import { createRailway, edit, hash, invariant, railApply, railSession, restore, worldOf } from './railway-live.ts';

function sourceFixture() {
  const state = createRailway();
  railSession(state, 'alice', 1);
  edit(state, (w) => (w.mut(Rail, w.single(Rail))!.awake = 0));
  let request = 0;
  const action = (e: Omit<RailAction, 'epoch' | 'request'>) =>
    railApply(state, 'alice', { ...e, epoch: 1, request: ++request }, 100);
  return { state, action };
}

test('wake accepts the whole machine prompt circle, including the side away from the receiving frame', () => {
  const w = worldOf(createRailway());
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
  assert.equal(state.accounts[0]!.carry, 8);
  assert.equal(state.falls!.yaw[0], 0);
  action({ op: 'rail.drop', x: 100000, y: 3201, z: -14000, n: 1 });
  action({ op: 'rail.chop', id: 0, yaw, collapsed: true });
  assert.equal(state.work[0], 15);
  assert.equal(state.sources[0], 1);
  assert.equal(state.falls!.yaw[0], 0, 'a clipped fifth hit is not a felled tree');
  action({ op: 'rail.drop', x: 100000, y: 3201, z: -14000, n: 1 });
  action({ op: 'rail.chop', id: 0, yaw, collapsed: true });
  assert.equal(state.sources[0], 0);
  assert.equal(state.falls!.yaw[0], yaw);
  assert.equal(state.falls!.collapsed[0], true);
  assert.equal(invariant(state), null);
  const restored = restore(state);
  assert.equal(restored.falls!.yaw[0], yaw, 'the float survives the save by its bits');
  assert.equal(hash(restored), hash(state));
});

test('the same horizontal position on two heights keeps distinct accepted piles through restore', () => {
  const { state, action } = sourceFixture();
  action({ op: 'rail.chop', id: 0, yaw: 0, collapsed: false });
  action({ op: 'rail.drop', x: 100000, y: 3201, z: -14000, n: 1 });
  action({ op: 'rail.drop', x: 100000, y: 2801, z: -14000, n: 1 });
  assert.equal(state.piles.length, 2);
  assert.deepEqual(
    restore(state).piles.map((p) => p.y),
    [3201, 2801],
  );
  action({ op: 'rail.take', id: state.piles[0]!.id });
  assert.equal(state.piles.length, 1);
  assert.equal(state.accounts[0]!.carry, 1);
  assert.equal(invariant(state), null);
});

test('the server refuses missing and invalid placement before it reaches the rule', () => {
  const w = worldOf(createRailway());
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
  const w = worldOf(createRailway());
  const at = (px: number, pz: number) => ({
    reach: (x: number, z: number, r: number) => Math.hypot(px - x, pz - z) <= r,
    height: () => true,
    cadence: () => true,
  });
  const quarry = LINE_HALTS[3]!;
  const e = { op: 'rail.call', epoch: 1, request: 1, id: 3, dir: 1 };
  assert.equal(railValid(w, e, at(quarry.x + 200, quarry.z), 50), true, 'at the lever, on the platform');
  // Line 2's train stands at its village stop (17 m along): a passenger beside it asks for the quarry.
  const train = railLinePoint(1, TRAIN_STOPS[1]![0]!);
  assert.equal(railValid(w, e, at(train.x + RIDER_REACH - 100, train.z), 50), true, 'aboard');
  assert.equal(railValid(w, e, at(train.x + RIDER_REACH + 300, train.z), 50), false, 'beside neither');
  assert.equal(railValid(w, { ...e, id: 0 }, at(train.x, train.z + 2000), 50), false, "line 1's halt, far from it");
  for (const dir of [undefined, 0, 2, -2])
    assert.equal(railValid(w, { ...e, dir }, at(quarry.x, quarry.z), 50), false, `dir ${dir}`);
});
