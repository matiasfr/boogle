import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import { railValid } from '../src/world/railway-server.ts';
import type { RailAction } from '../src/sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../src/sim/railway-layout.ts';
import { Account, Rail, Forge, Pile } from '../src/sim/railway-components.ts';
import { LOOSE_PILE_CAPACITY, LOOSE_PIECE_CAPACITY } from '../src/sim/railway-supply.ts';
import { reservedDropSlots, spareDropSlots } from '../src/sim/railway-queries.ts';
import { railPredict } from '../src/world/railway-predict.ts';
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

test('reserved slots cannot be stolen; heavy carriers can shed every excess piece after reload', () => {
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
  for (let i = 0; i < 124; i++) {
    if (!account(w, 'a')!.carry) fill();
    assert.equal(send('rail.drop', { x: i * 100, y: 0, z: 0, n: 1 }), 1);
  }
  fill();
  assert.equal(heavyLoad(w, 'a'), true);
  assert.equal(reservedDropSlots(w), 4);
  assert.equal(spareDropSlots(w), 0);
  railSession(w, 'b', 1);
  chop(w, 'b');
  assert.equal(act(w, 'b', 'rail.drop', { x: 50000, y: 0, z: 0, n: 1 }).accepted, 0);
  const replay = restore(w);
  for (let i = 0; i < 4; i++) {
    const a = account(w, 'a')!;
    const e = { op: 'rail.drop', epoch: a.epoch, request: a.request + 1, x: -1000 - i * 100, y: 1800, z: 0, n: 1 };
    assert.equal(apply(w, 'a', e, 100000).accepted, 1);
    assert.equal(apply(replay, 'a', e, 100000).accepted, 1);
    assert.equal(w.hash(), replay.hash());
    assert.equal(invariant(w), null);
  }
  assert.equal(heavyLoad(w, 'a'), false);
  assert.equal(pilesWithIds(w).length, 128);
  assert.equal(chop(w).accepted, 0, 'no new heavy load without space to put it down');
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

for (const [kind, key] of ['carry', 'stone', 'rails'].entries()) {
  for (const topUp of [false, true]) {
    test(`overflow kind ${kind}, top-up ${topUp}: only local top-ups, predict and reload without loss`, () => {
      const { w, t } = buildSeedWorld('q1-done');
      for (const [k, field] of ['carry', 'stone', 'rails'].entries())
        while (account(w, 'a')![field as 'carry' | 'stone' | 'rails'])
          act(w, 'a', 'rail.drop', { kind: k, n: 8, x: -100, y: 0, z: k });
      const before = pilesWithIds(w)
        .filter((p) => p.kind === kind)
        .reduce((sum, p) => sum + p.n, 0);
      // Conserved fixture at the measured buffer boundary, including a partial oldest pile.
      const target = w.spawn([Pile, { kind, n: 1, x: 123, y: 0, z: 456, age: 0 }]);
      let added = 1;
      while (w.ids(Pile).length < LOOSE_PILE_CAPACITY) {
        w.spawn([Pile, { kind, n: 8, x: w.ids(Pile).length, y: 0, z: 999, age: 0 }]);
        added += 8;
      }
      const initialLoose = before + added;
      added += 16;
      const r = w.mut(Rail, w.single(Rail))!;
      const f = w.mut(Forge, w.single(Forge))!;
      r.pack = true;
      if (kind === 0) {
        const produced = Math.ceil(added / 5) * 5;
        r.produced += produced;
        r.rack += produced - added;
      } else if (kind === 1) {
        const produced = Math.ceil(added / 8) * 8;
        r.stoneProduced += produced;
        r.stoneRack += produced - added;
      } else f.poured += added;
      w.mut(Account, w.lookup(Account, 'a')!)![key as 'carry' | 'stone' | 'rails'] = 16;
      assert.equal(invariant(w), null);
      const oldIds = pilesWithIds(w)
        .filter((p) => p.kind === kind)
        .map((p) => p.id)
        .sort((a, b) => a - b);
      const stored = () => (kind === 0 ? r.rack : kind === 1 ? r.stoneRack : f.rack);
      const oldStored = stored();
      const a = account(w, 'a')!;
      const e = {
        op: 'rail.drop',
        epoch: a.epoch,
        request: a.request + 1,
        kind,
        n: 8,
        x: topUp ? 123 : 987,
        y: 0,
        z: topUp ? 456 : 654,
      };
      const predicted = restore(w);
      const n = topUp ? 7 : 0;
      assert.equal(railPredict(predicted, 'a', e, t).n, n);
      assert.equal(apply(w, 'a', e, t).accepted, n);
      const compare = () => {
        // A predicted new pile has a temporary negative id; its accepted contents and recoveries must agree.
        const rows = (world: World) =>
          pilesWithIds(world)
            .map(({ x, y, z, n, kind, age }) => ({ x, y, z, n, kind, age }))
            .sort((a, b) => a.x - b.x || a.z - b.z);
        assert.deepEqual(rows(predicted), rows(w));
        assert.deepEqual(account(predicted, 'a'), account(w, 'a'));
        assert.deepEqual(predicted.get(Rail, predicted.single(Rail)), w.get(Rail, w.single(Rail)));
        assert.deepEqual(predicted.get(Forge, predicted.single(Forge)), w.get(Forge, w.single(Forge)));
      };
      compare();
      const loose = pilesWithIds(w)
        .filter((p) => p.kind === kind)
        .reduce((sum, p) => sum + p.n, 0);
      assert.ok(loose <= LOOSE_PIECE_CAPACITY);
      assert.equal(
        loose + stored() - oldStored + account(w, 'a')![key as 'carry' | 'stone' | 'rails'],
        initialLoose + 16,
      );
      assert.equal(stored(), oldStored, 'Drop never transfers cargo to any store');
      assert.ok(
        oldIds.every((id) => w.has(Pile, id)),
        'all existing piles remain',
      );
      if (topUp) assert.equal(w.get(Pile, target)!.n, 8);
      assert.equal(invariant(w), null);
      assert.equal(restore(w).hash(), w.hash());
      const second = { ...e, request: e.request + 1, x: 888, z: 777 };
      const replay = restore(w);
      assert.equal(railPredict(predicted, 'a', second, t).n, 0);
      assert.equal(apply(w, 'a', second, t).accepted, 0);
      assert.equal(apply(replay, 'a', second, t).accepted, 0);
      compare();
      assert.equal(invariant(w), null);
      assert.equal(replay.hash(), w.hash());
    });
  }
}

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
