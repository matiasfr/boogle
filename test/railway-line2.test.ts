// Line two's accounts: forge bills and pour, Q1-Q3 funding and laying, the depot, lever and hook readiness.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRailway,
  railSession,
  railAccount,
  railApply,
  railTick,
  railResume,
  railCounts,
  serializeRailway,
  loadRailway,
  railwayInvariant,
  hashRailway,
  type Railway,
  type RailAction,
} from '../src/sim/railway.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { railSupplyPulse, railGrowthMask } from '../src/sim/railway-supply.ts';
import { line2Active, line2Completed, line2GateOpen, line2Schedule } from '../src/sim/railway-line2.ts';
import { LINE2_FORGE, LINE2_STATIONS, LINE2_DEPOT, line2Routes } from '../src/sim/railway-line2-layout.ts';

type World = { s: Railway; t: number };
function act(w: World, pid: string, op: string, fields: Partial<RailAction> = {}) {
  const a = railAccount(w.s, pid)!;
  const e = { op, epoch: a.epoch, request: a.request + 1, ...fields };
  const r = railApply(w.s, pid, e, w.t);
  assert.equal(railwayInvariant(w.s), null, op);
  return r.accepted;
}
function advance(w: World, ticks: number) {
  for (let i = 0; i < ticks; i++) railTick(w.s, ++w.t);
  assert.equal(railwayInvariant(w.s), null);
}
function chop(w: World, pid: string) {
  const a = railAccount(w.s, pid)!;
  while (a.carry + (a.stone ?? 0) + (a.rails ?? 0) < 8) {
    const k = w.s.sources.findIndex((n) => n > 0);
    assert.ok(k >= 0);
    act(w, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
    if (a.carry >= 8) break;
  }
}
function logs(w: World, pid: string, station: string, n: number) {
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
function finishLine1(s: Railway, w: World) {
  // Complete the three line-one jobs directly through accepted ops.
  const stations = ['T1', 'T2', 'T3'];
  logs(w, 'a', 'T1', 24);
  advance(w, 300);
  for (let i = 0; i < 8;) {
    const k = s.line!.rocks.findIndex((n) => n > 0);
    const n = act(w, 'b', 'rail.mine', { id: k });
    assert.equal(act(w, 'b', 'rail.deposit', { station: 'T2', kind: 1, n }), n);
    i += n;
  }
  logs(w, 'a', 'T2', 32);
  advance(w, 300);
  logs(w, 'a', 'T3', 40);
  for (let i = 0; i < 12; i++) act(w, 'a', 'rail.beamChop');
  act(w, 'a', 'rail.beamTake', { revision: s.line!.beam.revision });
  assert.equal(act(w, 'a', 'rail.beamDeposit', { revision: s.line!.beam.revision, station: 'T3' }), 1);
  advance(w, 600);
  assert.equal(s.line!.jobs[1].completion, 1, stations.join());
}
function pathOpen(): World {
  const s = createRailway(true, true);
  for (const pid of ['a', 'b']) railSession(s, pid, 1);
  railApply(s, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const w = { s, t: 40 };
  finishLine1(s, w);
  return w;
}
function restore(w: World) {
  const n = createRailway(true, true),
    pids = w.s.accounts.map((a) => a.pid);
  loadRailway(n, JSON.parse(JSON.stringify(serializeRailway(w.s, pids))), pids);
  assert.equal(hashRailway(w.s, pids), hashRailway(n, pids));
  w.s = n;
}
function finishQ(w: World, k: number) {
  const job = w.s.line2!.jobs[k]!;
  assert.ok(job.start >= 0);
  advance(w, line2Schedule(k, job).totalTicks);
  assert.equal(job.completion, 1);
}

test('forge refuses logs before the path, lights at exactly 56 and pours conserved rails to its rack', () => {
  const s = createRailway(true, true);
  railSession(s, 'a', 1);
  railApply(s, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const early = { s, t: 40 };
  chop(early, 'a');
  assert.equal(act(early, 'a', 'rail.deposit', { station: 'F', n: 4 }), 0, 'no forge before T3');
  const w = pathOpen();
  logs(w, 'a', 'F', 24);
  restore(w);
  assert.equal(w.s.line2!.forge.lit, -1);
  logs(w, 'b', 'F', 31);
  assert.equal(w.s.line2!.forge.lit, -1);
  chop(w, 'a');
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'F', n: 8 }), 1, 'clipped at the bill');
  assert.equal(w.s.line2!.forge.lit, w.t);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'F', n: 1 }), 0);
  advance(w, LINE2_FORGE.pourTicks * 3);
  assert.equal(w.s.line2!.forge.rack, 3);
  advance(w, LINE2_FORGE.pourTicks * 100);
  assert.equal(w.s.line2!.forge.rack, LINE2_FORGE.rackMax, 'pours only to the rack');
  restore(w);
  assert.equal(railCounts(w.s).rails!.total, railCounts(w.s).rails!.poured);
  assert.equal(railCounts(w.s).total, 3910 + railCounts(w.s).produced);
});

test('Q1-Q3 fund atomically from logs and rails; depot, hook and lever follow accepted completions only', () => {
  const w = pathOpen();
  logs(w, 'a', 'F', 56);
  assert.equal(line2Active(w.s), 0);
  chop(w, 'b');
  assert.equal(act(w, 'b', 'rail.deposit', { station: 'Q1', n: 2 }), 0, 'machine still on the turntable');
  advance(w, LINE2_FORGE.turnTicks);
  assert.equal(act(w, 'b', 'rail.deposit', { station: 'Q2', n: 2 }), 0, 'only the active frame takes');
  logs(w, 'b', 'Q1', 16);
  assert.equal(w.s.line2!.jobs[0]!.start, -1, 'logs alone never fund');
  rails(w, 'a', 'Q1', 6);
  assert.ok(w.s.line2!.jobs[0]!.start >= 0);
  assert.equal(w.s.line2!.depotLast, -1, 'no depot before Q1 completes');
  restore(w);
  // Lever and hook do nothing before their stretches, even when the request reaches the authority.
  assert.equal(act(w, 'a', 'rail.lever'), 0);
  assert.equal(act(w, 'a', 'rail.hook'), 0);
  finishQ(w, 0);
  assert.equal(line2Active(w.s), 1);
  advance(w, LINE2_DEPOT.everyTicks + 1);
  assert.equal(w.s.line2!.depot, LINE2_DEPOT.load, 'cart brings one load');
  const leftover = railAccount(w.s, 'a')!.carry;
  if (leftover) assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q2', n: leftover }), leftover);
  const r = railAccount(w.s, 'a')!.rails ?? 0;
  if (r) assert.equal(act(w, 'a', 'rail.drop', { x: 94900, y: 2000, z: 3000, n: r, kind: 2 }), r);
  assert.equal(act(w, 'a', 'rail.depotTake'), LINE2_DEPOT.load);
  assert.equal(w.s.line2!.depot, 0);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q2', n: 8 }), 8);
  logs(w, 'a', 'Q2', 16 - leftover);
  advance(w, LINE2_DEPOT.everyTicks * 3);
  assert.equal(w.s.line2!.depot, 0, 'depot never exceeds what the frame still needs');
  rails(w, 'b', 'Q2', 12);
  restore(w);
  finishQ(w, 1);
  assert.deepEqual(line2Routes(line2Completed(w.s)), { hook: true, quarry: false });
  assert.equal(act(w, 'a', 'rail.lever'), 0, 'drive uncoupled before Q3');
  assert.equal(act(w, 'a', 'rail.hook'), 1);
  assert.equal(act(w, 'b', 'rail.hook'), 0, 'one shared device');
  logs(w, 'a', 'Q3', 16);
  rails(w, 'b', 'Q3', 12);
  finishQ(w, 2);
  restore(w);
  assert.equal(line2GateOpen(w.s), false, 'Q3 alone does not open the gate');
  assert.equal(act(w, 'a', 'rail.lever'), 1);
  assert.equal(act(w, 'b', 'rail.lever'), 0);
  assert.equal(line2GateOpen(w.s), true);
  assert.equal(line2Active(w.s), -1);
  const c = railCounts(w.s);
  assert.equal(c.rails!.stations, 30);
  assert.equal(c.total, 3910 + c.produced);
  restore(w);
});

test('rails share the back and loose piles; final-rail race funds once; abandoned rails return to the forge', () => {
  const w = pathOpen();
  logs(w, 'a', 'F', 56);
  advance(w, LINE2_FORGE.pourTicks * 30);
  logs(w, 'b', 'Q1', 16);
  for (const pid of ['a', 'b']) {
    const n = railAccount(w.s, pid)!.carry;
    if (n)
      assert.equal(act(w, pid, 'rail.drop', { x: 92000 + (pid === 'a' ? 0 : 300), y: 1830, z: 1000, n, kind: 0 }), n);
  }
  assert.equal(act(w, 'a', 'rail.forgeTake'), 8);
  act(w, 'b', 'rail.chop', { id: RAILWAY_SOURCES[w.s.sources.findIndex((n) => n >= 5)]![0], yaw: 0, collapsed: false });
  const before = railAccount(w.s, 'b')!.carry;
  assert.ok(before > 0);
  assert.equal(act(w, 'b', 'rail.forgeTake'), 8 - before, 'one back for all materials');
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q1', n: 5, kind: 2 }), 5);
  assert.equal(act(w, 'b', 'rail.deposit', { station: 'Q1', n: 8 - before, kind: 2 }), 1, 'final rail clipped');
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q1', n: 1, kind: 2 }), 0);
  assert.equal(act(w, 'a', 'rail.drop', { x: 92600, y: 1830, z: 1000, n: 3, kind: 2 }), 3);
  const pile = w.s.piles.find((p) => p.kind === 2)!;
  assert.equal(pile.n, 3);
  assert.ok(w.s.line2!.jobs[0]!.start >= 0);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'T3', n: 1, kind: 2 }), 0, 'rails never become logs');
  restore(w);
  // The loose rails age out and return to the forge rack, never to the log rack.
  const logRack = w.s.supply!.rack,
    forgeRack = w.s.line2!.forge.rack;
  railSupplyPulse(w.s, { marker: 1, grow: railGrowthMask([]), recover: [] });
  railSupplyPulse(w.s, { marker: 40, grow: railGrowthMask([]), recover: [pile.id] });
  assert.equal(w.s.supply!.rack, logRack);
  assert.equal(w.s.line2!.forge.rack, forgeRack + 3);
  assert.equal(railwayInvariant(w.s), null);
  // Offline catch-up finishes only the funded stretch.
  const job = w.s.line2!.jobs[0]!;
  const rest = line2Schedule(0, job).totalTicks - job.elapsed;
  assert.equal(railResume(w.s, 100000, 7, w.t), rest);
  assert.equal(job.completion, 1);
  assert.equal(w.s.line2!.jobs[1]!.start, -1);
});

test('malformed line-two documents fail atomically', () => {
  const w = pathOpen();
  logs(w, 'a', 'F', 56);
  advance(w, 40);
  const pids = w.s.accounts.map((a) => a.pid);
  const good = serializeRailway(w.s, pids);
  const hash = hashRailway(w.s, pids);
  const set = (text: string, i: number, n: number) =>
    text
      .split('.')
      .map((v, k) => (k === i ? n.toString(36) : v))
      .join('.');
  const cases: [string, (j: ReturnType<typeof serializeRailway>) => void][] = [
    ['lever before Q3', (j) => (j.line2!.v = 1)],
    ['hook before Q2', (j) => (j.line2!.v = 2)],
    ['minted rail', (j) => (j.line2!.f = set(j.line2!.f, 2, w.s.line2!.forge.rack + 1))],
    ['unlit pour', (j) => (j.line2!.f = set(j.line2!.f, 1, -1))],
    ['funded without rails', (j) => (j.line2!.j[0] = set(set(j.line2!.j[0]!, 2, w.t), 4, w.t))],
    ['noncanonical number', (j) => (j.line2!.f = `0${j.line2!.f}`)],
    ['extra key', (j) => ((j.line2 as unknown as Record<string, unknown>).x = 1)],
    ['early depot', (j) => (j.line2!.d = '8.5.0.8.0')],
    ['depot output over bill', (j) => (j.line2!.d = '0.5.0.25.0')],
  ];
  for (const [name, change] of cases) {
    const j = JSON.parse(JSON.stringify(good)) as ReturnType<typeof serializeRailway>;
    change(j);
    assert.throws(() => loadRailway(w.s, j, pids), Error, name);
    assert.equal(hashRailway(w.s, pids), hash, name);
  }
  assert.equal(LINE2_STATIONS.length, 3);
});

function toQ2(): World {
  const w = pathOpen();
  logs(w, 'a', 'F', 56);
  advance(w, LINE2_FORGE.turnTicks);
  logs(w, 'b', 'Q1', 16);
  rails(w, 'a', 'Q1', 6);
  finishQ(w, 0);
  return w;
}

test('taking depot logs and dropping them elsewhere never makes the depot exceed its stretch bill', () => {
  const w = toQ2();
  for (const pid of ['a', 'b']) {
    const a = railAccount(w.s, pid)!;
    for (const kind of [0, 2] as const) {
      const n = kind ? (a.rails ?? 0) : a.carry;
      if (n) act(w, pid, 'rail.drop', { x: 95000 + kind * 100, y: 2000, z: 3000, n, kind });
    }
  }
  const before = railCounts(w.s).produced;
  // Ten rounds of take-and-drop: a hoarder cannot make the cart mint past Q2's 24-log bill.
  for (let round = 0; round < 10; round++) {
    advance(w, LINE2_DEPOT.everyTicks + 1);
    const n = act(w, 'a', 'rail.depotTake');
    if (n) assert.equal(act(w, 'a', 'rail.drop', { x: 96000 + round * 10, y: 2000, z: 3000, n }), n);
  }
  assert.equal(w.s.line2!.depotOut[1], 24);
  assert.equal(railCounts(w.s).produced - before, 24);
  assert.equal(w.s.line2!.depot, 0);
  restore(w);
  assert.equal(railCounts(w.s).total, 3910 + railCounts(w.s).produced);
});

test('a peer resuming mid-Q2 after a restart matches one that never went offline', () => {
  const live = toQ2();
  logs(live, 'a', 'Q2', 24);
  rails(live, 'b', 'Q2', 12);
  const job = live.s.line2!.jobs[1]!;
  assert.ok(job.start >= 0);
  advance(live, 20);
  // The host restarts from the saved document; the stretch catches up once for the time it was down.
  const pids = live.s.accounts.map((a) => a.pid);
  const saved = JSON.parse(JSON.stringify(serializeRailway(live.s, pids)));
  const restarted = createRailway(true, true);
  loadRailway(restarted, saved, pids);
  assert.equal(hashRailway(restarted, pids), hashRailway(live.s, pids));
  const gap = 40;
  // A restarted room's clock resumes from its saved tick: downtime arrives only as the bounded resume.
  assert.equal(railResume(restarted, gap, 11, live.t), gap);
  assert.equal(railResume(restarted, gap, 11, live.t), 0, 'a repeated marker never resumes twice');
  // The peer that stayed online ticked through the same span (the forge pours only while ticking).
  advance(live, gap);
  const a = restarted.line2!.jobs[1]!,
    b = live.s.line2!.jobs[1]!;
  for (const key of ['elapsed', 'used', 'allocation', 'railUsed', 'railAllocation', 'completion'] as const)
    assert.equal(a[key], b[key], key);
  assert.equal(railwayInvariant(restarted), null);
  // Finishing offline completes Q2 once and never funds Q3.
  const rest = line2Schedule(1, a).totalTicks - a.elapsed;
  assert.equal(railResume(restarted, 100000, 12, live.t + 1), rest);
  assert.equal(a.completion, 1);
  assert.equal(restarted.line2!.jobs[2]!.start, -1);
  assert.equal(railwayInvariant(restarted), null);
});

test('the away credit fills the forge rack and the depot cart once, never past the rack or the stretch bill', () => {
  const w = toQ2();
  const l = w.s.line2!;
  const k = line2Active(w.s);
  assert.equal(k, 1, 'Q2 takes materials: the depot runs');
  const before = { rack: l.forge.rack, poured: l.forge.poured, depot: l.depot, out: l.depotOut[k]! };
  const produced = railCounts(w.s).produced;
  const stock = l.jobs[k]!.stock;
  // One depot interval of production: one load, and the rack as far as that many pours reach.
  const yard = LINE2_DEPOT.everyTicks;
  assert.equal(railResume(w.s, 0, 20, w.t, yard), 0, 'no funded job to advance');
  const pours = Math.min(LINE2_FORGE.rackMax - before.rack, Math.floor(yard / LINE2_FORGE.pourTicks));
  assert.equal(l.forge.rack, before.rack + pours);
  assert.equal(l.forge.poured, before.poured + pours, 'every poured rail is counted');
  const bill = LINE2_STATIONS[k]!.bill[0];
  const need = Math.min(bill - stock - before.depot, bill - before.out);
  assert.equal(l.depot, before.depot + Math.min(need, LINE2_DEPOT.load));
  assert.equal(railCounts(w.s).produced, produced + (l.depot - before.depot), 'depot logs are counted production');
  assert.equal(railwayInvariant(w.s), null);
  // The same marker never credits twice; a long absence fills the yards to their limits, no further.
  const pids = w.s.accounts.map((a) => a.pid);
  const hash = hashRailway(w.s, pids);
  assert.equal(railResume(w.s, 0, 20, w.t, 1000000), 0);
  assert.equal(hashRailway(w.s, pids), hash, 'a repeated marker credits nothing');
  railResume(w.s, 0, 21, w.t, 1000000);
  assert.equal(l.forge.rack, LINE2_FORGE.rackMax, 'the rack caps the forge');
  assert.equal(Math.min(bill - stock - l.depot, bill - l.depotOut[k]!), 0, 'the depot fills what the stretch needs');
  assert.ok(l.depotOut[k]! <= bill, 'and no more');
  assert.equal(railwayInvariant(w.s), null);
  restore(w);
});
