// Independent review of f47a39743. The parent has identical rules, components and seed builders;
// only the read-only railEngineStart query changed in src/sim. These snapshots therefore use the
// parent's saved shape and semantics. No renderer substitutes and no golden regeneration.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { RailAction } from '../src/sim/railway.ts';
import { railEngineStart } from '../src/sim/railway-queries-line1.ts';
import { railPredict } from '../src/world/railway-predict.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import {
  account,
  apply,
  createRailway,
  invariant,
  job,
  rail,
  railSession,
  railTick,
  restore,
  type Seed,
} from './helpers/rail.ts';
import { railRoom } from './helpers/rail-room.ts';

function prepared(logs: 0 | 8 | 23 | 24): Seed {
  const w = createRailway();
  railSession(w, 'a', 1);
  railSession(w, 'b', 1);
  const act = (op: string, fields: Partial<RailAction> = {}) =>
    apply(w, 'a', { op, epoch: 1, request: account(w, 'a')!.request + 1, ...fields } as RailAction, 100);
  assert.equal(act('rail.wake').accepted, 1);
  // The unchanged handoff requires 31 ticks before harvesting.
  for (let t = 101; t <= 140; t++) railTick(w, t);
  for (let source = 0; source < Math.ceil(logs / 8); source++) {
    for (let chop = 0; chop < 4; chop++) {
      const a = account(w, 'a')!;
      assert.equal(
        apply(
          w,
          'a',
          {
            op: 'rail.chop',
            epoch: 1,
            request: a.request + 1,
            id: RAILWAY_SOURCES[source]![0],
            yaw: 0,
            collapsed: false,
          },
          140,
        ).accepted,
        2,
      );
    }
    assert.equal(
      apply(
        w,
        'a',
        {
          op: 'rail.deposit',
          epoch: 1,
          request: account(w, 'a')!.request + 1,
          station: 'T1',
          n: Math.min(8, logs - source * 8),
        },
        140,
      ).accepted,
      Math.min(8, logs - source * 8),
    );
  }
  assert.equal(invariant(w), null);
  return { w, t: 140 };
}

for (const logs of [0, 8, 23, 24] as const) {
  test(`review: pre-change save with ${logs} T1 logs preserves the axe, bill and ignition through JSON reload`, () => {
    const seed = prepared(logs);
    const w = restore(seed.w);
    assert.equal(rail(w).awake, 100);
    assert.equal(job(w, 0).delivered, logs);
    assert.equal(railEngineStart(w), logs === 24 ? 140 : -1);
    assert.deepEqual(w.snapshot(), seed.w.snapshot());
    const before = job(w, 0);
    railSession(w, 'a', 2);
    assert.equal(apply(w, 'a', { op: 'rail.wake', epoch: 2, request: 1 }, 141).accepted, 0);
    assert.deepEqual(job(w, 0), before, 'reconnecting cannot hand out another axe or change the bill');
    assert.equal(invariant(w), null);
  });
}

test('review: completed T1 save retains ignition and T2 progress after reload', () => {
  const seed = prepared(24);
  while (!job(seed.w, 0).completion && seed.t < 3000) railTick(seed.w, ++seed.t);
  assert.equal(job(seed.w, 0).completion, 1);
  const w = restore(seed.w);
  assert.equal(railEngineStart(w), 140);
  assert.deepEqual(job(w, 0), job(seed.w, 0));
  assert.deepEqual(job(w, 1), job(seed.w, 1));
  assert.equal(invariant(w), null);
});

test('review: predicted final log cannot ignite before authority, including a refused funding attempt', () => {
  const seed = prepared(23);
  const action: RailAction = {
    op: 'rail.deposit',
    epoch: 1,
    request: account(seed.w, 'a')!.request + 1,
    station: 'T1',
    n: 1,
  };
  const predicted = restore(seed.w);
  assert.equal(railPredict(predicted, 'a', action, 141).n, 1);
  assert.equal(job(predicted, 0).delivered, 24);
  assert.equal(railEngineStart(predicted), -1, 'funding is deliberately held back by prediction');
  const r = railRoom(seed);
  assert.equal(r.api.act('a', action, { reach: () => false, height: () => true, cadence: () => true }).accepted, 0);
  assert.equal(railEngineStart(r.serverWorld()), -1);
  assert.equal(job(r.serverWorld(), 0).delivered, 23);
});

test('review: co-op final deposit publishes one ignition edge, reconnect and a late join preserve its timestamp', () => {
  const r = railRoom(prepared(23));
  const a = r.join('a', 'a', 6);
  const b = r.join('b', 'b', 3);
  r.ready();
  assert.ok(a.adapter.read.ready() && b.adapter.read.ready());
  const edges = new Map([
    ['a', [] as number[]],
    ['b', [] as number[]],
  ]);
  const previous = new Map([
    ['a', -1],
    ['b', -1],
  ]);
  assert.equal(a.adapter.deposit(1, 0), true);
  assert.equal(railEngineStart(a.adapter.read.world()), -1);
  r.run(35, {
    each(c) {
      const start = railEngineStart(c.adapter.read.world());
      if (start !== previous.get(c.cid)) edges.get(c.cid)!.push(start);
      previous.set(c.cid, start);
    },
  });
  const start = railEngineStart(r.serverWorld());
  assert.ok(start >= 140);
  for (const c of [a, b]) {
    assert.deepEqual(edges.get(c.cid), [start], 'confirmation does not restart the ignition edge');
    assert.equal(c.adapter.read.pending(), 0);
  }
  a.disconnect();
  r.run(20);
  a.reconnect();
  r.ready();
  const late = r.join('late', 'late', 6);
  r.ready();
  r.run(20);
  for (const c of [a, b, late]) {
    assert.ok(c.adapter.read.ready());
    assert.equal(railEngineStart(c.adapter.read.world()), start);
    assert.equal(job(c.adapter.read.world(), 0).delivered, 24);
  }
});

test('review: final deposit accepted while disconnected restores through one soft reset without replaying effects', () => {
  const r = railRoom(prepared(23));
  const a = r.join('a', 'a', 6);
  const b = r.join('b', 'b', 3);
  r.ready();
  const resets: boolean[] = [];
  let effects = 0;
  b.adapter.onReset((soft) => resets.push(soft));
  b.adapter.onAccepted(() => effects++);
  b.disconnect();
  assert.equal(a.adapter.deposit(1, 0), true);
  r.run(35);
  const start = railEngineStart(r.serverWorld());
  assert.ok(start >= 140);
  b.reconnect();
  r.ready();
  r.run(20);
  assert.deepEqual(resets, [true]);
  assert.equal(effects, 0);
  assert.equal(railEngineStart(b.adapter.read.world()), start);
});
