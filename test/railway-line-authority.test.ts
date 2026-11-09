// Accepted transfers, production and the one beam through line one's systems (on E: ./railway-live.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  railAccount,
  railCounts,
  railMaxDuration,
  railJobs,
  railCurrentJob,
  railActiveStation,
  railAxeAvailable,
  railBeamChoppable,
  railPanelCount,
  railPanelStock,
  type Railway,
  type RailAction,
} from '../src/sim/railway.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { railGrowthMask, railGrowthAllowed } from '../src/sim/railway-supply.ts';
import { Rail, createRailwayWorld, railwayCheck } from '../src/sim/railway-world.ts';
import {
  createRailway,
  edit,
  hash,
  invariant as railwayInvariant,
  railApply,
  railBeamRelease,
  railResume,
  railSession,
  railSupplyPulse,
  railTick,
  restore,
  worldOf,
} from './railway-live.ts';
import { LINE1_STATIONS, LINE1_RAIL_PAIRS, linePanels } from '../src/sim/railway-line-layout.ts';
import { lineSchedule } from '../src/sim/railway-line-schedule.ts';

const tick = (s: Railway) => Math.max(100, ...railJobs(s).map((j) => j.lastTick)) + 1;
function act(s: Railway, pid: string, op: string, fields: Partial<RailAction> = {}) {
  const a = railAccount(s, pid)!;
  const e = { op, epoch: a.epoch, request: a.request + 1, ...fields };
  const r = railApply(s, pid, e, tick(s));
  assert.equal(railwayInvariant(s), null, op);
  return { r, e };
}
function fresh(pids = ['a', 'b']) {
  const s = createRailway();
  for (const pid of pids) railSession(s, pid, 1);
  railApply(s, pids[0]!, { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  return s;
}
function logs(s: Railway, pid: string, n: number, station: string = LINE1_STATIONS[railActiveStation(s)]!.id) {
  while (n > 0) {
    const a = railAccount(s, pid)!;
    while (a.carry === 0) {
      const k = s.sources.findIndex((n) => n > 0);
      assert.ok(k >= 0);
      assert.ok(act(s, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }).r.accepted > 0);
    }
    const moved = act(s, pid, 'rail.deposit', { n: Math.min(n, a.carry), station, kind: 0 }).r.accepted;
    assert.ok(moved > 0);
    n -= moved;
  }
}
function stones(s: Railway, pid: string, n: number, deposit = true) {
  while (n > 0) {
    // Line one's three rocks (the Works' limestone, slots 3-4, waits in the bowl).
    const k = s.line!.rocks.slice(0, 3).findIndex((n) => n > 0);
    const moved = act(s, pid, 'rail.mine', { id: k }).r.accepted;
    assert.ok(moved > 0);
    if (deposit) assert.equal(act(s, pid, 'rail.deposit', { station: 'T2', kind: 1, n: moved }).r.accepted, moved);
    n -= moved;
  }
}
function finish(s: Railway) {
  const job = railCurrentJob(s);
  assert.ok(job.start >= 0);
  railTick(s, job.lastTick + railMaxDuration(s));
  assert.equal(job.completion, 1);
  assert.equal(railwayInvariant(s), null);
}
function toT3() {
  const s = fresh();
  logs(s, 'a', 24);
  finish(s);
  stones(s, 'b', 8);
  logs(s, 'a', 32);
  finish(s);
  return s;
}
/** Fell the great tree with the first axe and lay the beam (no axe asked for). */
function beam(s: Railway, pid = 'a') {
  for (let i = 0; i < 12; i++) assert.equal(act(s, pid, 'rail.beamChop').r.accepted, 1);
  assert.equal(act(s, pid, 'rail.beamTake', { revision: s.line!.beam.revision }).r.accepted, 1);
  assert.equal(act(s, pid, 'rail.beamDeposit', { revision: s.line!.beam.revision, station: 'T3' }).r.accepted, 1);
}
/** Station 3 done and the forge lit (56 logs): the proper axe waits on its stand. */
function toForge() {
  const s = toT3();
  logs(s, 'a', 40);
  beam(s);
  finish(s);
  logs(s, 'a', 56, 'F');
  assert.ok(s.line2!.forge.lit >= 0);
  return s;
}

test('the great tree rebounds before Station 3, then the first axe fells it and the beam funds in either order', () => {
  // Before Station 3 opens the stroke is refused (the client rebounds it on the same check).
  const early = fresh();
  logs(early, 'a', 24);
  finish(early);
  assert.equal(railBeamChoppable(early), false);
  assert.equal(act(early, 'a', 'rail.beamChop').r.accepted, 0);
  assert.equal(early.line!.beam.work, 0);
  // Beam first: laid on the empty frame, the job waits for the 40th log and starts on it.
  let s = toT3();
  assert.equal(railBeamChoppable(s), true);
  assert.equal(s.line!.axe, false);
  beam(s);
  assert.equal(railBeamChoppable(s), false);
  assert.equal(s.line!.beam.state, 'allocated');
  assert.equal(railCurrentJob(s).start, -1);
  s = restore(s);
  logs(s, 'a', 39);
  assert.equal(railCurrentJob(s).start, -1);
  s = restore(s);
  logs(s, 'a', 1);
  assert.ok(railCurrentJob(s).start >= 0, 'the 40th log starts the feed');
  finish(s);
  assert.equal(s.line!.beam.state, 'used');
  // Logs part way, then the beam, then the rest: also fine.
  s = toT3();
  logs(s, 'a', 20);
  beam(s, 'b');
  logs(s, 'a', 20);
  assert.ok(railCurrentJob(s).start >= 0);
  restore(s);
});

test('the proper axe is the lit forge first made thing, not Station 3', () => {
  let s = toT3();
  logs(s, 'a', 40);
  assert.equal(railAxeAvailable(s), false, 'the 40th log no longer offers the axe');
  assert.equal(act(s, 'a', 'rail.axe').r.accepted, 0);
  beam(s);
  finish(s);
  assert.equal(railAxeAvailable(s), false, 'path open, forge cold');
  logs(s, 'a', 55, 'F');
  assert.equal(act(s, 'a', 'rail.axe').r.accepted, 0);
  logs(s, 'a', 1, 'F');
  assert.equal(railAxeAvailable(s), true);
  s = restore(s);
  // Hardwoods rebound the first axe and bite the proper one.
  assert.equal(act(s, 'b', 'rail.chop', { id: 209, yaw: 0, collapsed: false }).r.accepted, 0);
  assert.equal(act(s, 'a', 'rail.axe').r.accepted, 1);
  assert.equal(act(s, 'b', 'rail.axe').r.accepted, 0);
  assert.equal(railAxeAvailable(s), false);
  assert.equal(act(s, 'b', 'rail.chop', { id: 209, yaw: 0, collapsed: false }).r.accepted, 5);
  restore(s);
});

test('line-one bills, unique beam and funded completion survive every stage restore', () => {
  let s = toT3();
  assert.equal(act(s, 'a', 'rail.axe').r.accepted, 0);
  logs(s, 'a', 40);
  assert.equal(railCurrentJob(s).start, -1);
  assert.equal(railAxeAvailable(s), false);
  s = restore(s);
  for (let i = 0; i < 12; i++) {
    assert.equal(act(s, i % 2 ? 'a' : 'b', 'rail.beamChop').r.accepted, 1);
    s = restore(s);
  }
  assert.equal(s.line!.beam.state, 'available');
  assert.equal(act(s, 'a', 'rail.beamChop').r.accepted, 0);
  const revision = s.line!.beam.revision;
  const claim = act(s, 'a', 'rail.beamTake', { revision });
  assert.equal(claim.r.accepted, 1);
  assert.equal(act(s, 'b', 'rail.beamTake', { revision }).r.accepted, 0);
  assert.deepEqual(railApply(s, 'a', claim.e, tick(s)), claim.r);
  assert.equal(
    act(s, 'a', 'rail.chop', { id: 0, yaw: 0, collapsed: false }).r.accepted,
    0,
    'held beam excludes ordinary carry',
  );
  s = restore(s);
  assert.equal(act(s, 'a', 'rail.beamDrop', { revision: s.line!.beam.revision, x: 0, y: -1000, z: 0 }).r.accepted, 1);
  assert.equal(s.line!.beam.state, 'available');
  assert.equal(s.line!.beam.x, 99600, 'unsafe/unverified pose uses same source anchor');
  act(s, 'b', 'rail.beamTake', { revision: s.line!.beam.revision });
  const heldRevision = s.line!.beam.revision;
  assert.equal(act(s, 'b', 'rail.beamDeposit', { revision: heldRevision, station: 'T3' }).r.accepted, 1);
  assert.equal(railBeamRelease(s, 'b', 1, heldRevision), 0, 'late departure cannot resurrect allocated beam');
  s = restore(s);
  finish(s);
  s = restore(s);
  assert.equal(railCounts(s).used, 96);
  assert.equal(railCounts(s).stone!.used, 8);
  assert.equal(s.line!.beam.state, 'used');
  assert.equal(railCounts(s).completion, 3);
  assert.equal(railCounts(s).total, 3910);
  assert.equal(railCounts(s).stone!.total, 40, 'line one 24 and the bowl 16');
});

test('mixed back, final deposit races and exact station identity cannot overflow or spill', () => {
  const s = fresh();
  logs(s, 'a', 24);
  finish(s);
  for (let i = 0; i < 3; i++) {
    const k = s.sources.findIndex((n) => n > 0);
    act(s, 'a', 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
  }
  act(s, 'a', 'rail.mine', { id: 0 });
  assert.equal(railAccount(s, 'a')!.carry + railAccount(s, 'a')!.stone!, 8);
  assert.equal(act(s, 'a', 'rail.mine', { id: 0 }).r.accepted, 0);
  assert.equal(act(s, 'a', 'rail.deposit', { station: 'T1', n: 8 }).r.accepted, 0);
  act(s, 'a', 'rail.deposit', { station: 'T2', n: 6 });
  act(s, 'a', 'rail.deposit', { station: 'T2', kind: 1, n: 2 });
  logs(s, 'a', 26);
  stones(s, 'b', 6);
  assert.ok(s.line!.jobs[0].start >= 0);
  assert.equal(act(s, 'b', 'rail.deposit', { station: 'T2', kind: 1, n: 8 }).r.accepted, 0);
  finish(s);
  logs(s, 'a', 39);
  // Two deposits each request four; only the missing log is accepted, never a second chest/unlock.
  for (const pid of ['a', 'b'])
    while (railAccount(s, pid)!.carry < 4) {
      const k = s.sources.findIndex((n) => n > 0);
      act(s, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
    }
  const first = act(s, 'a', 'rail.deposit', { station: 'T3', n: 4 }),
    second = act(s, 'b', 'rail.deposit', { station: 'T3', n: 4 });
  assert.equal(first.r.accepted + second.r.accepted, 1);
  assert.equal(railAxeAvailable(s), false);
  assert.equal(railCurrentJob(s).start, -1);
  restore(s);
});

test('three departed stone carriers cannot strand T2: slow counted renewal never confiscates their backs', () => {
  const s = fresh(['a', 'b', 'c', 'visitor']);
  logs(s, 'visitor', 24);
  finish(s);
  for (const pid of ['a', 'b', 'c']) stones(s, pid, 8, false);
  assert.deepEqual(s.line!.rocks, [0, 0, 0, 8, 8]);
  assert.equal(railCounts(s).stone!.carry, 24);
  const pulse = (marker: number) => railSupplyPulse(s, { marker, grow: railGrowthMask([]), recover: [] });
  pulse(100);
  pulse(130);
  assert.deepEqual(s.line!.rocks, [0, 0, 0, 8, 8]);
  pulse(131);
  assert.deepEqual(s.line!.rocks, [8, 8, 8, 8, 8]);
  assert.equal(s.line!.stoneProduced, 24);
  pulse(131);
  assert.equal(s.line!.stoneProduced, 24);
  for (const pid of ['a', 'b', 'c']) assert.equal(railAccount(s, pid)!.stone, 8);
  stones(s, 'visitor', 8);
  logs(s, 'visitor', 32);
  finish(s);
  restore(s);
  assert.equal(s.line!.jobs[0].completion, 1);
  assert.equal(railCounts(s).stone!.total, 64);
});

test('partial jobs stay partial offline; funded jobs finish once without funding the next receiver', () => {
  const s = fresh();
  logs(s, 'a', 24);
  finish(s);
  logs(s, 'a', 12);
  assert.equal(railResume(s, 99999, 1000, tick(s)), 0);
  assert.equal(s.line!.jobs[0].stock, 12);
  logs(s, 'a', 20);
  stones(s, 'b', 8);
  assert.ok(railResume(s, 99999, 2000, tick(s)) > 0);
  assert.equal(s.line!.jobs[0].completion, 1);
  assert.equal(railResume(s, 99999, 2000, tick(s)), 0);
  assert.equal(railCurrentJob(s).stock, 0);
  assert.equal(s.line!.axe, false);
  restore(s);
});

test('proper axe improvement is counted once, clipped source output remains, renewal cannot double-bonus', () => {
  const s = toForge();
  if (railAccount(s, 'a')!.carry) act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -14000, n: 8 });
  assert.equal(act(s, 'a', 'rail.axe').r.accepted, 1);
  const k = s.sources.findIndex((n) => n === 10),
    id = RAILWAY_SOURCES[k]![0];
  const before = s.supply!.produced;
  act(s, 'a', 'rail.chop', { id, yaw: 0, collapsed: false });
  assert.equal(s.supply!.produced, before + 5);
  assert.equal(s.sources[k], 10);
  act(s, 'a', 'rail.chop', { id, yaw: 0, collapsed: false });
  assert.equal(s.sources[k], 7, 'only three free back slots');
  assert.equal(s.supply!.produced, before + 5);
  restore(s);
  act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -14000, n: 8 });
  const eligible = s.sources.findIndex((n, k) => n === 10 && railGrowthAllowed(k, true));
  const eligibleId = RAILWAY_SOURCES[eligible]![0];
  while (s.sources[eligible]! > 0) {
    if (railAccount(s, 'a')!.carry === 8) act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -14000, n: 8 });
    act(s, 'a', 'rail.chop', { id: eligibleId, yaw: 0, collapsed: false });
  }
  const produced = s.supply!.produced;
  for (const marker of [100, 131, 132, 133, 134, 135])
    railSupplyPulse(s, { marker, grow: railGrowthMask([eligible]), recover: [] });
  assert.equal(s.sources[eligible], 15);
  assert.equal(s.supply!.produced, produced + 15);
  if (railAccount(s, 'a')!.carry) act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -14000, n: 8 });
  act(s, 'a', 'rail.chop', { id: eligibleId, yaw: 0, collapsed: false });
  assert.equal(s.supply!.produced, produced + 15);
  restore(s);
});

test('beam departure is epoch/revision fenced and reconnect cannot duplicate its location', () => {
  const s = toT3();
  logs(s, 'a', 40);
  for (let i = 0; i < 12; i++) act(s, 'a', 'rail.beamChop');
  act(s, 'a', 'rail.beamTake', { revision: s.line!.beam.revision });
  const old = s.line!.beam.revision;
  assert.equal(railBeamRelease(s, 'a', 2, old), 0);
  assert.equal(railBeamRelease(s, 'a', 1, old), 1);
  railSession(s, 'a', 2);
  act(s, 'a', 'rail.beamTake', { revision: s.line!.beam.revision });
  assert.equal(railBeamRelease(s, 'a', 1, old), 0);
  assert.equal(s.line!.beam.state, 'held');
  restore(s);
});

test('safe loose beam keeps its identity; recovery is slow, explicit, revision-fenced and never steals a held beam', () => {
  const s = toT3();
  logs(s, 'a', 40);
  for (let i = 0; i < 12; i++) act(s, 'a', 'rail.beamChop');
  const b = s.line!.beam;
  act(s, 'a', 'rail.beamTake', { revision: b.revision });
  act(s, 'a', 'rail.beamDrop', { revision: b.revision, x: 99650, y: 3000, z: -13800 });
  assert.equal(b.state, 'ground');
  assert.equal(b.x, 99650);
  restore(s);
  const pulse = (marker: number, revision?: number) =>
    railSupplyPulse(s, {
      marker,
      grow: railGrowthMask([]),
      recover: [],
      ...(revision === undefined ? {} : { beam: revision }),
    });
  pulse(100);
  pulse(120, b.revision);
  assert.equal(b.state, 'ground');
  pulse(121);
  assert.equal(b.state, 'ground', 'age alone is not recovery clearance');
  pulse(122, b.revision - 1);
  assert.equal(b.state, 'ground');
  pulse(123, b.revision);
  assert.equal(b.state, 'available');
  act(s, 'a', 'rail.beamTake', { revision: b.revision });
  pulse(200, b.revision);
  assert.equal(b.state, 'held');
  assert.equal(railwayInvariant(s), null);
});

test('production ceiling refuses an unrepresentable proper-axe bonus atomically', () => {
  const s = toForge();
  if (railAccount(s, 'a')!.carry) act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -14000, n: 8 });
  assert.equal(act(s, 'a', 'rail.axe').r.accepted, 1);
  edit(s, (w) => Object.assign(w.mut(Rail, w.single(Rail))!, { produced: 2147479735, rack: 2147479735 }));
  const k = s.sources.findIndex((n) => n === 10);
  assert.equal(railwayInvariant(s), null);
  assert.equal(act(s, 'a', 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }).r.accepted, 0);
  restore(s);
});

test('malformed line loads are atomic and replay hashes match through accepted actions and restoration', () => {
  const s = toT3();
  const saved = worldOf(s).snapshot(),
    before = hash(s);
  type Snap = typeof saved;
  const col = (j: Snap, kind: string, field: string) => {
    const c = worldOf(s).components.find((row) => row.kind === kind)!;
    return j.c[kind]![1 + c.names.indexOf(field)]!;
  };
  for (const mutate of [
    (j: Snap) => (col(j, 'rock', 'left')[0] = (col(j, 'rock', 'left')[0] as number) - 1),
    (j: Snap) => (col(j, 'rail', 'axe')[0] = 1),
    (j: Snap) => (col(j, 'beam', 'state')[0] = 'held'),
    (j: Snap) => (col(j, 'account', 'carry')[0] = 80),
    (j: Snap) => (col(j, 'tree', 'slot')[1] = 0),
  ]) {
    const bad = structuredClone(saved);
    mutate(bad);
    assert.throws(() => worldOf(s).load(bad, railwayCheck));
    assert.throws(() => createRailwayWorld().load(bad, railwayCheck));
    assert.equal(hash(s), before);
  }
  const copy = restore(s);
  for (let i = 0; i < 12; i++) {
    const a = railAccount(s, 'a')!,
      k = s.sources.findIndex((n) => n > 0);
    const e = {
      op: i % 2 ? 'rail.deposit' : 'rail.chop',
      epoch: 1,
      request: a.request + 1,
      station: 'T3',
      n: 8,
      id: RAILWAY_SOURCES[k]![0],
      yaw: 0,
      collapsed: false,
    };
    assert.deepEqual(railApply(s, 'a', e, 500 + i), railApply(copy, 'a', e, 500 + i));
    assert.equal(hash(s), hash(copy));
  }
});

test('wrong material deposits and spent-rock strokes remain material no-ops', () => {
  const s = fresh();
  stones(s, 'a', 8, false);
  assert.equal(act(s, 'a', 'rail.deposit', { station: 'T1', kind: 1, n: 8 }).r.accepted, 0);
  // T1 takes no stone: its job's stone counts stay zero.
  assert.equal(s.stoneStock, 0);
  assert.equal(s.stoneDelivered, 0);
  restore(s);
  railSupplyPulse(s, { marker: 100, grow: railGrowthMask([]), recover: [] });
  railSupplyPulse(s, { marker: 110, grow: railGrowthMask([]), recover: [] });
  assert.equal(s.line!.rockAge[0], 10);
  assert.equal(act(s, 'b', 'rail.mine', { id: 0 }).r.accepted, 0);
  assert.equal(s.line!.rockAge[0], 10);
  railSupplyPulse(s, { marker: 131, grow: railGrowthMask([]), recover: [] });
  assert.equal(s.line!.rocks[0], 8);
  assert.equal(s.line!.stoneProduced, 8);
  restore(s);
});

test('every rail-pair contact derives stock and survives restore without a continuous frontier', () => {
  let s = fresh(),
    committed = 0;
  assert.equal(railPanelStock(s), LINE1_RAIL_PAIRS);
  for (const [index, station] of LINE1_STATIONS.entries()) {
    logs(s, 'a', station.bill[0]);
    if (station.bill[1]) stones(s, 'a', station.bill[1]);
    if (station.beam) {
      for (let i = 0; i < 12; i++) act(s, 'a', 'rail.beamChop');
      act(s, 'a', 'rail.beamTake', { revision: s.line!.beam.revision });
      act(s, 'a', 'rail.beamDeposit', { revision: s.line!.beam.revision, station: 'T3' });
    }
    const job = railJobs(s)[index]!,
      start = job.start;
    const schedule = lineSchedule(station, job.timing!);
    for (const panel of schedule.panels) {
      const at = start + schedule.depositTicks + schedule.feedTicks + panel.tick;
      railTick(s, at - 1);
      assert.equal(railPanelCount(s), committed, 'head travel before contact cannot create panel collision');
      assert.equal(railPanelStock(s), LINE1_RAIL_PAIRS - committed);
      s = restore(s);
      assert.equal(railPanelCount(s), committed, 'quiet restore keeps the same frontier');
      railTick(s, at);
      assert.equal(railPanelCount(s), ++committed);
      assert.equal(railPanelStock(s), LINE1_RAIL_PAIRS - committed);
      s = restore(s);
      assert.equal(railPanelCount(s), committed);
    }
    // Pairs left after each stop: the same stock-unit boundaries as before the split (9, 6 and 0 units).
    assert.equal(
      railPanelStock(s),
      LINE1_RAIL_PAIRS -
        linePanels().filter((p) => LINE1_STATIONS.findIndex((st) => st.id === p.station) <= index).length,
    );
    assert.equal(railPanelStock(s), [42, 30, 0][index]);
  }
  assert.equal(committed, LINE1_RAIL_PAIRS);
  railTick(s, tick(s) + 10000);
  assert.equal(railPanelStock(s), 0, 'completion never replenishes the magazine');
});

test('offline panel catch-up consumes one funded interval and cannot advance the next station', () => {
  let s = fresh();
  logs(s, 'a', 24);
  finish(s);
  logs(s, 'a', 32);
  stones(s, 'a', 8);
  assert.equal(railPanelCount(s), 14, 'T1 laid as its 14 rail pairs');
  const now = railCurrentJob(s).lastTick;
  railResume(s, railMaxDuration(s), 123, now);
  assert.equal(railPanelCount(s), 26);
  assert.equal(railPanelStock(s), 30);
  s = restore(s);
  railResume(s, railMaxDuration(s), 123, now);
  railResume(s, railMaxDuration(s), 124, now + 10000);
  assert.equal(railPanelCount(s), 26);
  assert.equal(railPanelStock(s), 30);
  assert.equal(railCurrentJob(s).start, -1);
  assert.equal(railwayInvariant(s), null);
});
