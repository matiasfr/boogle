// A railway played through line one, the forge lit and Q1 laid: Q2 takes materials and the depot cart runs. Built
// from accepted sim ops only (the same path as test/railway-line2.test.ts), for tests that need line two's yards. The
// state is an E world behind ./railway-live.ts's read-only view.
import assert from 'node:assert/strict';
import { railAccount, type Railway, type RailAction } from '../../src/sim/railway.ts';
import { createRailway, invariant as railwayInvariant, railApply, railSession, railTick } from '../railway-live.ts';
import { RAILWAY_SOURCES } from '../../src/sim/railway-layout.ts';
import { line2Schedule } from '../../src/sim/railway-line2.ts';
import { LINE2_FORGE } from '../../src/sim/railway-line2-layout.ts';

export type World = { s: Railway; t: number };
export function act(w: World, pid: string, op: string, fields: Partial<RailAction> = {}) {
  const a = railAccount(w.s, pid)!;
  const r = railApply(w.s, pid, { op, epoch: a.epoch, request: a.request + 1, ...fields }, w.t);
  assert.equal(railwayInvariant(w.s), null, op);
  return r.accepted;
}
export function advance(w: World, ticks: number) {
  for (let i = 0; i < ticks; i++) railTick(w.s, ++w.t);
}
function chop(w: World, pid: string) {
  const a = railAccount(w.s, pid)!;
  while (a.carry + (a.stone ?? 0) + (a.rails ?? 0) < 8) {
    const k = w.s.sources.findIndex((n) => n > 0);
    assert.ok(k >= 0);
    act(w, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
  }
}
export function logs(w: World, pid: string, station: string, n: number) {
  while (n > 0) {
    if (!railAccount(w.s, pid)!.carry) chop(w, pid);
    const moved = act(w, pid, 'rail.deposit', { station, n: Math.min(n, railAccount(w.s, pid)!.carry), kind: 0 });
    assert.ok(moved > 0, `${station} took logs`);
    n -= moved;
  }
}
function rails(w: World, pid: string, station: string, n: number) {
  while (n > 0) {
    if (!railAccount(w.s, pid)!.rails) {
      if (!w.s.line2!.forge.rack) advance(w, LINE2_FORGE.pourTicks * 8);
      assert.ok(act(w, pid, 'rail.forgeTake') > 0);
    }
    const moved = act(w, pid, 'rail.deposit', { station, n: Math.min(n, railAccount(w.s, pid)!.rails!), kind: 2 });
    assert.ok(moved > 0, `${station} took rails`);
    n -= moved;
  }
}
/** Players `a` and `b`, at Q2 with nothing delivered there yet. */
export function railwayAtQ2(): World {
  const s = createRailway();
  for (const pid of ['a', 'b']) railSession(s, pid, 1);
  railApply(s, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const w = { s, t: 40 };
  logs(w, 'a', 'T1', 24);
  advance(w, 300);
  for (let i = 0; i < 8;) {
    const n = act(w, 'b', 'rail.mine', { id: s.line!.rocks.findIndex((r) => r > 0) });
    assert.equal(act(w, 'b', 'rail.deposit', { station: 'T2', kind: 1, n }), n);
    i += n;
  }
  logs(w, 'a', 'T2', 32);
  advance(w, 300);
  logs(w, 'a', 'T3', 40);
  act(w, 'a', 'rail.axe');
  for (let i = 0; i < 12; i++) act(w, 'a', 'rail.beamChop');
  act(w, 'a', 'rail.beamTake', { revision: s.line!.beam.revision });
  assert.equal(act(w, 'a', 'rail.beamDeposit', { revision: s.line!.beam.revision, station: 'T3' }), 1);
  advance(w, 600);
  logs(w, 'a', 'F', LINE2_FORGE.logs);
  advance(w, LINE2_FORGE.turnTicks);
  logs(w, 'b', 'Q1', 16);
  rails(w, 'a', 'Q1', 6);
  const q1 = s.line2!.jobs[0]!;
  advance(w, line2Schedule(0, q1).totalTicks);
  assert.equal(q1.completion, 1);
  assert.equal(railwayInvariant(s), null);
  return w;
}
