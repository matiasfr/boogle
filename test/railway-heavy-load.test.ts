import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import { railValid } from '../src/world/railway-server.ts';
import type { RailAction } from '../src/sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../src/sim/railway-layout.ts';
import { Account, Rail } from '../src/sim/railway-components.ts';
import {
  account,
  apply,
  buildSeedWorld,
  carried,
  carryComfort,
  carryMax,
  carrySpeed,
  createRailway,
  free,
  heavyLoad,
  invariant,
  pilesWithIds,
  railSession,
  restore,
  trees,
} from './helpers/rail.ts';

function act(w: World, pid: string, op: string, fields: Partial<RailAction> = {}) {
  const a = account(w, pid)!;
  const result = apply(w, pid, { op, epoch: a.epoch, request: a.request + 1, ...fields }, 100000);
  assert.equal(invariant(w), null);
  return result;
}
function awake() {
  const w = createRailway();
  railSession(w, 'a', 1);
  railSession(w, 'b', 1);
  apply(w, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  return w;
}
function chop(w: World, pid = 'a') {
  const k = trees(w).findIndex((t) => t.left > 0);
  return act(w, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
}

test('comfort is free movement; each extra piece slows, maximum refuses without spending a tree', () => {
  const w = awake();
  assert.equal(carryComfort(w), 8);
  assert.equal(carryMax(w), 12);
  assert.equal(carrySpeed(w, 'missing'), 1);
  for (let i = 0; i < 4; i++) chop(w);
  assert.equal(carried(account(w, 'a')!), 8);
  assert.equal(heavyLoad(w, 'a'), false);
  assert.equal(carrySpeed(w, 'a'), 1);
  chop(w);
  assert.equal(carried(account(w, 'a')!), 10);
  assert.equal(heavyLoad(w, 'a'), true);
  assert.equal(carrySpeed(w, 'a'), 0.725);
  chop(w);
  assert.equal(carrySpeed(w, 'a'), 0.45);
  const before = trees(w).map((t) => t.left);
  assert.equal(chop(w).accepted, 0);
  assert.deepEqual(
    trees(w).map((t) => t.left),
    before,
  );
  assert.equal(free(w, account(w, 'a')!), 0);
  const saved = restore(w);
  assert.equal(saved.hash(), w.hash());
  assert.equal(heavyLoad(saved, 'a'), true);
  assert.equal(carrySpeed(saved, 'a'), 0.45);
  // Every cargo kind consumes the same space, never three separate allowances.
  const a = w.mut(Account, w.lookup(Account, 'a')!)!;
  a.carry = 4;
  a.stone = 3;
  a.rails = 5;
  assert.equal(free(w, a), 0);
  assert.equal(carrySpeed(w, 'a'), 0.45);
});

test('dropping the extra restores mobility; two claimants cannot duplicate the pile; deposit lightens', () => {
  const w = awake();
  for (let i = 0; i < 6; i++) chop(w);
  const drop = { n: 4, x: RAILWAY_T1.x, y: 0, z: RAILWAY_T1.z, kind: 0 };
  assert.equal(act(w, 'a', 'rail.drop', drop).accepted, 4);
  assert.equal(heavyLoad(w, 'a'), false);
  assert.equal(carrySpeed(w, 'a'), 1);
  const id = pilesWithIds(w)[0]!.id;
  assert.equal(act(w, 'b', 'rail.take', { id, n: 4 }).accepted, 4);
  assert.equal(act(w, 'a', 'rail.take', { id, n: 4 }).accepted, 0);
  assert.equal(carried(account(w, 'a')!) + carried(account(w, 'b')!), 12);
  chop(w);
  assert.equal(heavyLoad(w, 'a'), true);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'T1', kind: 0, n: 2 }).accepted, 2);
  assert.equal(heavyLoad(w, 'a'), false);
  assert.equal(restore(w).hash(), w.hash());
});

test('a full old pile pool cannot trap a heavy carrier; all cargo remains recoverable after reload', () => {
  const w = awake();
  const send = (op: string, fields: Partial<RailAction>) => {
    const a = account(w, 'a')!;
    return apply(w, 'a', { op, epoch: a.epoch, request: a.request + 1, ...fields }, 100000).accepted;
  };
  const fill = () => {
    while (carried(account(w, 'a')!) < carryMax(w)) {
      const k = trees(w).findIndex((t) => t.left > 0);
      assert.ok(send('rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }));
    }
  };
  for (let i = 0; i < 128; i++) {
    if (!account(w, 'a')!.carry) fill();
    assert.equal(send('rail.drop', { x: i * 100, y: 0, z: 0, n: 1 }), 1);
  }
  fill();
  assert.equal(heavyLoad(w, 'a'), true);
  assert.equal(send('rail.drop', { x: -1000, y: 1800, z: 0, n: 4 }), 4);
  assert.equal(heavyLoad(w, 'a'), false);
  assert.equal(pilesWithIds(w).length, 129);
  assert.equal(
    pilesWithIds(w).reduce((sum, p) => sum + p.n, 0),
    132,
  );
  assert.equal(invariant(w), null);
  assert.equal(restore(w).hash(), w.hash());
});

test('the shared pack restores an existing heavy load and permits 24 with the same speed curve', () => {
  const { w } = buildSeedWorld('q1-done');
  assert.equal(act(w, 'a', 'rail.pack').accepted, 1);
  assert.equal(carryComfort(w), 16);
  // Start empty without deleting cargo: ordinary drop rules preserve conservation.
  for (const kind of [0, 1, 2])
    while ((kind === 0 ? account(w, 'a')!.carry : kind === 1 ? account(w, 'a')!.stone : account(w, 'a')!.rails) > 0)
      act(w, 'a', 'rail.drop', { kind, n: 8, x: 0, y: 0, z: 0 });
  while (carried(account(w, 'a')!) < 24) chop(w);
  assert.equal(carryMax(w), 24);
  assert.equal(carrySpeed(w, 'a'), 0.45);
  assert.equal(chop(w).accepted, 0);
  assert.equal(restore(w).hash(), w.hash());
  // Query boundary for a pack arriving while carrying 12; no cached heavy flag survives the upgrade.
  const fresh = awake();
  for (let i = 0; i < 6; i++) chop(fresh);
  assert.equal(heavyLoad(fresh, 'a'), true);
  fresh.mut(Rail, fresh.single(Rail))!.pack = true;
  assert.equal(heavyLoad(fresh, 'a'), false);
  assert.equal(carrySpeed(fresh, 'a'), 1);
});

test('fixed input replay is identical across a save while overloaded', () => {
  const a = awake();
  for (let i = 0; i < 5; i++) chop(a);
  const b = restore(a);
  for (const w of [a, b]) {
    chop(w);
    chop(w);
    act(w, 'a', 'rail.drop', { n: 4, x: 0, y: 0, z: 0 });
    act(w, 'a', 'rail.deposit', { station: 'T1', kind: 0, n: 8 });
    chop(w, 'b');
  }
  assert.equal(a.hash(), b.hash());
  assert.deepEqual(a.snapshot(), b.snapshot());
});

test('host validation accepts a full upgraded deposit but rejects malformed counts', () => {
  const w = awake();
  const actor = { reach: () => true, height: () => true, cadence: () => true };
  const e = { op: 'rail.deposit', epoch: 1, request: 2, station: 'F', kind: 0, n: 24 };
  assert.equal(railValid(w, e, actor), true);
  for (const n of [25, 1.5, NaN, Infinity, -1]) assert.equal(railValid(w, { ...e, n }, actor), false);
});

test('a take stops at comfort before the player opts into extra mixed cargo', () => {
  const w = awake();
  const a = w.mut(Account, w.lookup(Account, 'a')!)!;
  a.carry = 4;
  a.rails = 3;
  assert.equal(free(w, a), 1);
  a.stone = 1;
  assert.equal(free(w, a), 4);
  a.stone = 5;
  assert.equal(free(w, a), 0);
});
