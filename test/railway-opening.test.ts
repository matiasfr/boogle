import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import type { RailAction } from '../src/sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { railEngineStart, railPhase } from '../src/sim/railway-queries-line1.ts';
import { account, apply, createRailway, hash, invariant, job, railSession, restore } from './helpers/rail.ts';

function act(w: World, pid: string, op: string, fields: Partial<RailAction> = {}, tick = 100) {
  const a = account(w, pid)!;
  const e = { op, epoch: a.epoch, request: a.request + 1, ...fields } as RailAction;
  const result = apply(w, pid, e, tick);
  assert.equal(invariant(w), null);
  return { e, result };
}
function fresh() {
  const w = createRailway();
  railSession(w, 'a', 1);
  railSession(w, 'b', 1);
  return w;
}
function handoff(w: World) {
  assert.equal(act(w, 'a', 'rail.wake', {}, 0).result.accepted, 1);
  assert.equal(act(w, 'b', 'rail.wake', {}, 1).result.accepted, 0, 'one shared handoff, even with two visitors');
}
function logs(w: World, pid: string, source: number) {
  // A hit gives 1 until Station 3 is funded: eight strokes fill the row of 8 logs.
  for (let k = 0; k < 8; k++)
    assert.equal(
      act(w, pid, 'rail.chop', { id: RAILWAY_SOURCES[source]![0], yaw: 0, collapsed: false }).result.accepted,
      1,
    );
}
function first23(w: World) {
  for (let k = 0; k < 3; k++) {
    const pid = k === 1 ? 'b' : 'a';
    logs(w, pid, k);
    assert.equal(act(w, pid, 'rail.deposit', { station: 'T1', n: k === 2 ? 7 : 8 }).result.accepted, k === 2 ? 7 : 8);
    assert.equal(railEngineStart(w), -1, 'partial funding never ignites');
  }
}

test('camp handoff unlocks the room’s axe, and only the last of 24 logs ignites the engine', () => {
  const w = fresh();
  assert.equal(railEngineStart(w), -1);
  assert.equal(act(w, 'a', 'rail.chop', { id: 0, yaw: 0, collapsed: false }, 0).result.accepted, 0);
  handoff(w);
  assert.equal(railEngineStart(w), -1, 'receiving the axe leaves the engine cold');
  assert.equal(railPhase(w, T1.wakeTicks - 1), 'waking', 'existing tool handoff window');
  assert.equal(railPhase(w, T1.wakeTicks), 'idle');
  first23(w);
  const before = restore(w);
  const last = act(w, 'a', 'rail.deposit', { station: 'T1', n: 1 });
  assert.equal(last.result.accepted, 1);
  assert.equal(railEngineStart(w), 100);
  assert.equal(job(w, 0).delivered, 24);
  assert.equal(account(w, 'a')!.carry + account(w, 'b')!.carry, 0);
  const fundedHash = hash(w);
  assert.deepEqual(apply(w, 'a', last.e, 101), last.result, 'lost-receipt retry is idempotent');
  assert.equal(hash(w), fundedHash, 'no second spend or ignition');
  assert.equal(railEngineStart(restore(w)), 100, 'funded save restores the ignition tick');
  assert.deepEqual(act(before, 'a', 'rail.deposit', { station: 'T1', n: 1 }).result, last.result);
  assert.equal(hash(before), fundedHash, 'save/reload and uninterrupted final deposit agree');
});
