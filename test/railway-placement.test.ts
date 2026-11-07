// Accepted collision placement must survive snapshots without another transfer or a rounded fall direction.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRailway,
  hashRailway,
  loadRailway,
  railApply,
  railSession,
  railwayInvariant,
  serializeRailway,
  type RailAction,
} from '../src/sim/railway.ts';
import { railValid } from '../src/world/railway-server.ts';

function sourceFixture(playable = true) {
  const state = createRailway(playable);
  railSession(state, 'alice', 1);
  state.awake = 0;
  let request = 0;
  const action = (e: Omit<RailAction, 'epoch' | 'request'>) =>
    railApply(state, 'alice', { ...e, epoch: 1, request: ++request }, 100);
  return { state, action };
}

test('playable fall keeps exact direction and collapse only on accepted final output', () => {
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
  assert.equal(railwayInvariant(state), null);
  const rosterPids = ['visitor', 'alice'];
  const json = serializeRailway(state, rosterPids);
  assert.equal(json.accounts[0]![0], 1);
  const restored = createRailway(true);
  loadRailway(restored, JSON.parse(JSON.stringify(json)), rosterPids);
  assert.equal(restored.falls!.yaw[0], yaw);
  assert.deepEqual(restored, state);
  assert.equal(hashRailway(restored, rosterPids), hashRailway(state, rosterPids));
});

test('same horizontal position on two heights keeps distinct accepted piles through restore', () => {
  const { state, action } = sourceFixture();
  action({ op: 'rail.chop', id: 0, yaw: 0, collapsed: false });
  action({ op: 'rail.drop', x: 100000, y: 3201, z: -14000, n: 1 });
  action({ op: 'rail.drop', x: 100000, y: 2801, z: -14000, n: 1 });
  assert.equal(state.piles.length, 2);
  const restored = createRailway(true);
  loadRailway(restored, serializeRailway(state), ['alice']);
  assert.deepEqual(
    restored.piles.map((p) => p.y),
    [3201, 2801],
  );
  action({ op: 'rail.take', id: state.piles[0]!.id });
  assert.equal(state.piles.length, 1);
  assert.equal(state.accounts[0]!.carry, 1);
  assert.equal(railwayInvariant(state), null);
});

test('playable placement schema rejects corruption atomically and old namespace retains its exact fields', () => {
  const { state, action } = sourceFixture();
  action({ op: 'rail.chop', id: 0, yaw: 0, collapsed: false });
  action({ op: 'rail.drop', x: 100000, y: 3201, z: -14000, n: 1 });
  const json = serializeRailway(state);
  const before = JSON.stringify(state);
  for (const mutate of [
    (j: typeof json) => {
      const bytes = Buffer.from(j.falls!.yaw, 'base64');
      bytes.writeDoubleBE(NaN, 0);
      j.falls!.yaw = bytes.toString('base64');
    },
    (j: typeof json) => {
      j.falls!.yaw = j.falls!.yaw.slice(0, -2) + 'B='; // valid alphabet with nonzero unused padding bits
    },
    (j: typeof json) => {
      j.falls!.yaw = '#' + j.falls!.yaw.slice(1);
    },
    (j: typeof json) => {
      j.falls!.collapsed = '1' + j.falls!.collapsed.slice(1);
    },
    (j: typeof json) => {
      j.accounts[0]![0] = 1;
    },
    (j: typeof json) => {
      j.piles[0]![4] = 200001;
    },
    (j: typeof json) => {
      delete j.falls;
    },
  ]) {
    const corrupt = structuredClone(json);
    mutate(corrupt);
    assert.throws(() => loadRailway(state, corrupt, ['alice']));
    assert.equal(JSON.stringify(state), before);
  }
  const old = sourceFixture(false);
  old.action({ op: 'rail.chop', id: 0 });
  old.action({ op: 'rail.drop', x: 100000, z: -14000, n: 1 });
  const oldJson = serializeRailway(old.state);
  assert.equal(Object.hasOwn(oldJson, 'falls'), false);
  assert.equal(oldJson.accounts[0]![0], 'alice');
  assert.equal(oldJson.piles[0]!.length, 4);
  const restored = createRailway();
  loadRailway(restored, oldJson);
  assert.deepEqual(restored, old.state);
  assert.throws(() => loadRailway(createRailway(true), oldJson, ['alice']));
  assert.throws(() => loadRailway(createRailway(), json));
});

test('the server refuses missing and invalid placement before it reaches the rule', () => {
  const s = createRailway(true, true);
  const actor = { reach: () => true, height: () => true, cadence: () => true };
  const token = { epoch: 1, request: 1 };
  for (const edit of [
    { op: 'rail.chop', id: 0 },
    { op: 'rail.chop', id: 0, yaw: NaN, collapsed: false },
    { op: 'rail.chop', id: 0, yaw: 7, collapsed: false },
    { op: 'rail.drop', x: 100000, z: -14000, n: 1 },
    { op: 'rail.drop', x: 100000, y: 0.5, z: -14000, n: 1 },
  ])
    assert.equal(railValid(s, { ...token, ...edit }, actor), false, JSON.stringify(edit));
  assert.equal(railValid(s, { ...token, op: 'rail.chop', id: 0, yaw: 0, collapsed: false }, actor), true);
  assert.equal(
    railValid(s, { ...token, op: 'rail.chop', id: 0, yaw: 0, collapsed: false }, { ...actor, reach: () => false }),
    false,
  );
});
