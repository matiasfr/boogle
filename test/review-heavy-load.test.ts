// Independent review of a91bd8663: actual transfers, prediction and reconnect at the new boundaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import type { RailAction } from '../src/sim/railway.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { railPredict } from '../src/world/railway-predict.ts';
import { railValid } from '../src/world/railway-server.ts';
import {
  account,
  apply,
  buildSeedWorld,
  carried,
  carryComfort,
  carryMax,
  carrySpeed,
  cloneWorld,
  heavyLoad,
  invariant,
  pilesWithIds,
  railSession,
  restore,
  trees,
} from './helpers/rail.ts';

function command(w: World, pid: string, op: string, fields: Partial<RailAction> = {}): RailAction {
  const a = account(w, pid)!;
  return { op, epoch: a.epoch, request: a.request + 1, ...fields };
}
function act(w: World, pid: string, op: string, fields: Partial<RailAction> = {}) {
  return apply(w, pid, command(w, pid, op, fields), 100000).accepted;
}
function empty(w: World, pid: string) {
  for (const [kind, key] of ['carry', 'stone', 'rails'].entries()) {
    while (account(w, pid)![key as 'carry' | 'stone' | 'rails'] > 0)
      assert.ok(act(w, pid, 'rail.drop', { kind, n: 8, x: 0, y: 0, z: kind * 100 }));
  }
}
function fill(w: World, pid: string, n: number) {
  for (let tries = 0; carried(account(w, pid)!) < n; tries++) {
    assert.ok(tries < 24, 'bounded collection');
    const k = trees(w).findIndex((t) => t.left > 0);
    assert.ok(act(w, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }));
  }
  const extra = carried(account(w, pid)!) - n;
  if (extra) assert.equal(act(w, pid, 'rail.drop', { n: extra, x: 0, y: 0, z: 0 }), extra);
}

for (const [op, stage] of [
  ['rail.forgeTake', 'q1-done'],
  ['rail.depotTake', 'q5-shelved'],
  ['rail.depotRailTake', 'q5-shelved'],
] as const) {
  test(`review: ${op} stops at comfort, then fills the heavy allowance with matching prediction`, () => {
    const { w } = buildSeedWorld(stage);
    assert.equal(act(w, 'a', 'rail.pack'), 1);
    empty(w, 'a');
    fill(w, 'a', carryComfort(w) - 1);
    const take = () => {
      const e = command(w, 'a', op);
      const predicted = cloneWorld(w);
      const n = railPredict(predicted, 'a', e, 100000).n;
      assert.equal(apply(w, 'a', e, 100000).accepted, n);
      assert.equal(carried(account(predicted, 'a')!), carried(account(w, 'a')!));
      assert.equal(carrySpeed(predicted, 'a'), carrySpeed(w, 'a'));
      assert.equal(heavyLoad(predicted, 'a'), heavyLoad(w, 'a'));
      return n;
    };
    assert.equal(take(), 1);
    assert.equal(heavyLoad(w, 'a'), false);
    assert.equal(take(), carryMax(w) - carryComfort(w));
    assert.equal(carrySpeed(w, 'a'), 0.6);
    assert.equal(take(), 0);
    assert.equal(invariant(w), null);
  });
}

test('review: two comfortable players race for an extra pile without duplication or a latched slowdown', () => {
  const { w } = buildSeedWorld('awake');
  if (!account(w, 'b')) railSession(w, 'b', 1);
  fill(w, 'a', 12);
  assert.equal(act(w, 'a', 'rail.drop', { n: 4, x: 123, y: 0, z: 456 }), 4);
  fill(w, 'b', 8);
  const pile = pilesWithIds(w).find((p) => p.x === 123)!;
  const a = command(w, 'a', 'rail.take', { id: pile.id });
  const b = command(w, 'b', 'rail.take', { id: pile.id });
  const shown = cloneWorld(w);
  assert.equal(railPredict(shown, 'b', b, 100000).n, 4);
  assert.equal(carrySpeed(shown, 'b'), 0.6);
  assert.equal(apply(w, 'a', a, 100000).accepted, 4);
  assert.equal(apply(w, 'b', b, 100000).accepted, 0);
  assert.equal(carried(account(w, 'a')!) + carried(account(w, 'b')!), 20);
  const corrected = cloneWorld(w);
  assert.equal(heavyLoad(corrected, 'b'), false);
  assert.equal(carrySpeed(corrected, 'b'), 1);
  assert.equal(invariant(w), null);
});

test('review: every packed and unpacked load survives reload and epoch renewal with the same speed', () => {
  for (const stage of ['awake', 'q1-done'] as const) {
    let { w } = buildSeedWorld(stage);
    if (stage !== 'awake') assert.equal(act(w, 'a', 'rail.pack'), 1);
    empty(w, 'a');
    fill(w, 'a', carryMax(w));
    const comfortable = carryComfort(w),
      maximum = carryMax(w);
    let previous = 0;
    for (let n = maximum; n >= comfortable; n--) {
      assert.equal(carried(account(w, 'a')!), n);
      const speed = carrySpeed(w, 'a');
      assert.ok(Math.abs(speed - (1 - (0.4 * (n - comfortable)) / (maximum - comfortable))) < 1e-15);
      assert.ok(speed > previous);
      previous = speed;
      w = restore(w);
      assert.equal(railSession(w, 'a', account(w, 'a')!.epoch + 1), true);
      assert.equal(carrySpeed(w, 'a'), speed);
      assert.equal(heavyLoad(w, 'a'), n > comfortable);
      const drop = command(w, 'a', 'rail.drop', { n: 1, x: 0, y: 4000, z: 0 });
      assert.equal(railValid(w, drop, { reach: () => true, height: () => true, cadence: () => true }), true);
      assert.equal(apply(w, 'a', drop, 100000).accepted, 1);
    }
    assert.equal(invariant(w), null);
  }
});
