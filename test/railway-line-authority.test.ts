// Accepted transfers, production and the one beam through line one's systems (on the world).
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import type { RailAction } from '../src/sim/railway.ts';
import {
  railAxeAvailable,
  railBeamChoppable,
  railMaxDuration,
  railPanelCount,
  railPanelStock,
} from '../src/sim/railway-queries-line1.ts';
import { railCounts } from '../src/sim/railway-queries-line2.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { railGrowthMask, railGrowthAllowed } from '../src/sim/railway-supply.ts';
import { Rail, createRailwayWorld } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import {
  account,
  apply,
  beam,
  createRailway,
  forge,
  hash,
  invariant,
  job,
  rail,
  railActiveStation,
  railBeamRelease,
  railCurrentJob,
  railJobs,
  railResume,
  railSession,
  railSupplyPulse,
  railTick,
  restore,
  rock,
  rocks,
  scheduleOf,
  tree,
  trees,
} from './helpers/rail.ts';
import { LINE1_STATIONS, LINE1_RAIL_PAIRS, linePanels } from '../src/sim/railway-line-layout.ts';

const tick = (s: World) => Math.max(100, ...railJobs(s).map((j) => j.run.lastTick)) + 1;
function act(s: World, pid: string, op: string, fields: Partial<RailAction> = {}) {
  const a = account(s, pid)!;
  const e = { op, epoch: a.epoch, request: a.request + 1, ...fields };
  const r = apply(s, pid, e, tick(s));
  assert.equal(invariant(s), null, op);
  return { r, e };
}
function fresh(pids = ['a', 'b']) {
  const s = createRailway();
  for (const pid of pids) railSession(s, pid, 1);
  apply(s, pids[0]!, { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  return s;
}
function logs(s: World, pid: string, n: number, station: string = LINE1_STATIONS[railActiveStation(s)]!.id) {
  while (n > 0) {
    while (account(s, pid)!.carry === 0) {
      const k = trees(s).findIndex((t) => t.left > 0);
      assert.ok(k >= 0);
      assert.ok(act(s, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }).r.accepted > 0);
    }
    const moved = act(s, pid, 'rail.deposit', { n: Math.min(n, account(s, pid)!.carry), station, kind: 0 }).r.accepted;
    assert.ok(moved > 0);
    n -= moved;
  }
}
function stones(s: World, pid: string, n: number, deposit = true) {
  while (n > 0) {
    // Line one's three rocks (the Works' limestone, slots 3-4, waits in the bowl).
    const k = rocks(s)
      .map((r) => r.left)
      .slice(0, 3)
      .findIndex((n) => n > 0);
    const moved = act(s, pid, 'rail.mine', { id: k }).r.accepted;
    assert.ok(moved > 0);
    if (deposit) assert.equal(act(s, pid, 'rail.deposit', { station: 'T2', kind: 1, n: moved }).r.accepted, moved);
    n -= moved;
  }
}
function finish(s: World) {
  const slot = railActiveStation(s);
  const current = railCurrentJob(s);
  assert.ok(current.job.start >= 0);
  railTick(s, current.run.lastTick + railMaxDuration(s));
  assert.equal(job(s, slot).completion, 1);
  assert.equal(invariant(s), null);
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
function giveBeam(s: World, pid = 'a') {
  for (let i = 0; i < 12; i++) assert.equal(act(s, pid, 'rail.beamChop').r.accepted, 1);
  assert.equal(act(s, pid, 'rail.beamTake', { revision: beam(s).revision }).r.accepted, 1);
  assert.equal(act(s, pid, 'rail.beamDeposit', { revision: beam(s).revision, station: 'T3' }).r.accepted, 1);
}
/** Station 3 done and the forge lit (56 logs): the proper axe waits on its stand. */
function toForge() {
  const s = toT3();
  logs(s, 'a', 40);
  giveBeam(s);
  finish(s);
  logs(s, 'a', 56, 'F');
  assert.ok(forge(s).lit >= 0);
  return s;
}

test('the great tree rebounds before Station 3, then the first axe fells it and the beam funds in either order', () => {
  // Before Station 3 opens the stroke is refused (the client rebounds it on the same check).
  const early = fresh();
  logs(early, 'a', 24);
  finish(early);
  assert.equal(railBeamChoppable(early), false);
  assert.equal(act(early, 'a', 'rail.beamChop').r.accepted, 0);
  assert.equal(beam(early).work, 0);
  // Beam first: laid on the empty frame, the job waits for the 40th log and starts on it.
  let s = toT3();
  assert.equal(railBeamChoppable(s), true);
  assert.equal(rail(s).axe, false);
  giveBeam(s);
  assert.equal(railBeamChoppable(s), false);
  assert.equal(beam(s).state, 'allocated');
  assert.equal(railCurrentJob(s).job.start, -1);
  s = restore(s);
  logs(s, 'a', 39);
  assert.equal(railCurrentJob(s).job.start, -1);
  s = restore(s);
  logs(s, 'a', 1);
  assert.ok(railCurrentJob(s).job.start >= 0, 'the 40th log starts the feed');
  finish(s);
  assert.equal(beam(s).state, 'used');
  // Logs part way, then the beam, then the rest: also fine.
  s = toT3();
  logs(s, 'a', 20);
  giveBeam(s, 'b');
  logs(s, 'a', 20);
  assert.ok(railCurrentJob(s).job.start >= 0);
  restore(s);
});

test('the proper axe is the lit forge first made thing, not Station 3', () => {
  let s = toT3();
  logs(s, 'a', 40);
  assert.equal(railAxeAvailable(s), false, 'the 40th log no longer offers the axe');
  assert.equal(act(s, 'a', 'rail.axe').r.accepted, 0);
  giveBeam(s);
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
  assert.equal(railCurrentJob(s).job.start, -1);
  assert.equal(railAxeAvailable(s), false);
  s = restore(s);
  for (let i = 0; i < 12; i++) {
    assert.equal(act(s, i % 2 ? 'a' : 'b', 'rail.beamChop').r.accepted, 1);
    s = restore(s);
  }
  assert.equal(beam(s).state, 'available');
  assert.equal(act(s, 'a', 'rail.beamChop').r.accepted, 0);
  const revision = beam(s).revision;
  const claim = act(s, 'a', 'rail.beamTake', { revision });
  assert.equal(claim.r.accepted, 1);
  assert.equal(act(s, 'b', 'rail.beamTake', { revision }).r.accepted, 0);
  assert.deepEqual(apply(s, 'a', claim.e, tick(s)), claim.r);
  assert.equal(
    act(s, 'a', 'rail.chop', { id: 0, yaw: 0, collapsed: false }).r.accepted,
    0,
    'held beam excludes ordinary carry',
  );
  s = restore(s);
  assert.equal(act(s, 'a', 'rail.beamDrop', { revision: beam(s).revision, x: 0, y: -1000, z: 0 }).r.accepted, 1);
  assert.equal(beam(s).state, 'available');
  assert.equal(beam(s).x, 99600, 'unsafe/unverified pose uses same source anchor');
  act(s, 'b', 'rail.beamTake', { revision: beam(s).revision });
  const heldRevision = beam(s).revision;
  assert.equal(act(s, 'b', 'rail.beamDeposit', { revision: heldRevision, station: 'T3' }).r.accepted, 1);
  assert.equal(railBeamRelease(s, 'b', 1, heldRevision), 0, 'late departure cannot resurrect allocated beam');
  s = restore(s);
  finish(s);
  s = restore(s);
  assert.equal(railCounts(s).used, 96);
  assert.equal(railCounts(s).stone!.used, 8);
  assert.equal(beam(s).state, 'used');
  assert.equal(railCounts(s).completion, 3);
  assert.equal(railCounts(s).total, 3910);
  assert.equal(railCounts(s).stone!.total, 40, 'line one 24 and the bowl 16');
});

test('mixed back, final deposit races and exact station identity cannot overflow or spill', () => {
  const s = fresh();
  logs(s, 'a', 24);
  finish(s);
  for (let i = 0; i < 3; i++) {
    const k = trees(s).findIndex((t) => t.left > 0);
    act(s, 'a', 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
  }
  act(s, 'a', 'rail.mine', { id: 0 });
  assert.equal(account(s, 'a')!.carry + account(s, 'a')!.stone!, 8);
  assert.equal(act(s, 'a', 'rail.mine', { id: 0 }).r.accepted, 0);
  assert.equal(act(s, 'a', 'rail.deposit', { station: 'T1', n: 8 }).r.accepted, 0);
  act(s, 'a', 'rail.deposit', { station: 'T2', n: 6 });
  act(s, 'a', 'rail.deposit', { station: 'T2', kind: 1, n: 2 });
  logs(s, 'a', 26);
  stones(s, 'b', 6);
  assert.ok(job(s, 1).start >= 0);
  assert.equal(act(s, 'b', 'rail.deposit', { station: 'T2', kind: 1, n: 8 }).r.accepted, 0);
  finish(s);
  logs(s, 'a', 39);
  // Two deposits each request four; only the missing log is accepted, never a second chest/unlock.
  for (const pid of ['a', 'b'])
    while (account(s, pid)!.carry < 4) {
      const k = trees(s).findIndex((t) => t.left > 0);
      act(s, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
    }
  const first = act(s, 'a', 'rail.deposit', { station: 'T3', n: 4 }),
    second = act(s, 'b', 'rail.deposit', { station: 'T3', n: 4 });
  assert.equal(first.r.accepted + second.r.accepted, 1);
  assert.equal(railAxeAvailable(s), false);
  assert.equal(railCurrentJob(s).job.start, -1);
  restore(s);
});

test('three departed stone carriers cannot strand T2: slow counted renewal never confiscates their backs', () => {
  const s = fresh(['a', 'b', 'c', 'visitor']);
  logs(s, 'visitor', 24);
  finish(s);
  for (const pid of ['a', 'b', 'c']) stones(s, pid, 8, false);
  assert.deepEqual(
    rocks(s).map((r) => r.left),
    [0, 0, 0, 8, 8],
  );
  assert.equal(railCounts(s).stone!.carry, 24);
  const pulse = (marker: number) => railSupplyPulse(s, { marker, grow: railGrowthMask([]), recover: [] });
  pulse(100);
  pulse(130);
  assert.deepEqual(
    rocks(s).map((r) => r.left),
    [0, 0, 0, 8, 8],
  );
  pulse(131);
  assert.deepEqual(
    rocks(s).map((r) => r.left),
    [8, 8, 8, 8, 8],
  );
  assert.equal(rail(s).stoneProduced, 24);
  pulse(131);
  assert.equal(rail(s).stoneProduced, 24);
  for (const pid of ['a', 'b', 'c']) assert.equal(account(s, pid)!.stone, 8);
  stones(s, 'visitor', 8);
  logs(s, 'visitor', 32);
  finish(s);
  restore(s);
  assert.equal(job(s, 1).completion, 1);
  assert.equal(railCounts(s).stone!.total, 64);
});

test('partial jobs stay partial offline; funded jobs finish once without funding the next receiver', () => {
  const s = fresh();
  logs(s, 'a', 24);
  finish(s);
  logs(s, 'a', 12);
  assert.equal(railResume(s, 99999, 1000, tick(s)), 0);
  assert.equal(job(s, 1).stock, 12);
  logs(s, 'a', 20);
  stones(s, 'b', 8);
  assert.ok(railResume(s, 99999, 2000, tick(s)) > 0);
  assert.equal(job(s, 1).completion, 1);
  assert.equal(railResume(s, 99999, 2000, tick(s)), 0);
  assert.equal(railCurrentJob(s).job.stock, 0);
  assert.equal(rail(s).axe, false);
  restore(s);
});

test('proper axe improvement is counted once, clipped source output remains, renewal cannot double-bonus', () => {
  const s = toForge();
  if (account(s, 'a')!.carry) act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -14000, n: 8 });
  assert.equal(act(s, 'a', 'rail.axe').r.accepted, 1);
  const k = trees(s).findIndex((t) => t.left === 10),
    id = RAILWAY_SOURCES[k]![0];
  const before = rail(s).produced;
  act(s, 'a', 'rail.chop', { id, yaw: 0, collapsed: false });
  assert.equal(rail(s).produced, before + 5);
  assert.equal(tree(s, k).left, 10);
  act(s, 'a', 'rail.chop', { id, yaw: 0, collapsed: false });
  assert.equal(tree(s, k).left, 7, 'only three free back slots');
  assert.equal(rail(s).produced, before + 5);
  restore(s);
  act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -14000, n: 8 });
  const eligible = trees(s).findIndex((t, k) => t.left === 10 && railGrowthAllowed(k, true));
  const eligibleId = RAILWAY_SOURCES[eligible]![0];
  while (tree(s, eligible).left > 0) {
    if (account(s, 'a')!.carry === 8) act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -14000, n: 8 });
    act(s, 'a', 'rail.chop', { id: eligibleId, yaw: 0, collapsed: false });
  }
  const produced = rail(s).produced;
  for (const marker of [100, 131, 132, 133, 134, 135])
    railSupplyPulse(s, { marker, grow: railGrowthMask([eligible]), recover: [] });
  assert.equal(tree(s, eligible).left, 15);
  assert.equal(rail(s).produced, produced + 15);
  if (account(s, 'a')!.carry) act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -14000, n: 8 });
  act(s, 'a', 'rail.chop', { id: eligibleId, yaw: 0, collapsed: false });
  assert.equal(rail(s).produced, produced + 15);
  restore(s);
});

test('beam departure is epoch/revision fenced and reconnect cannot duplicate its location', () => {
  const s = toT3();
  logs(s, 'a', 40);
  for (let i = 0; i < 12; i++) act(s, 'a', 'rail.beamChop');
  act(s, 'a', 'rail.beamTake', { revision: beam(s).revision });
  const old = beam(s).revision;
  assert.equal(railBeamRelease(s, 'a', 2, old), 0);
  assert.equal(railBeamRelease(s, 'a', 1, old), 1);
  railSession(s, 'a', 2);
  act(s, 'a', 'rail.beamTake', { revision: beam(s).revision });
  assert.equal(railBeamRelease(s, 'a', 1, old), 0);
  assert.equal(beam(s).state, 'held');
  restore(s);
});

test('safe loose beam keeps its identity; recovery is slow, explicit, revision-fenced and never steals a held beam', () => {
  const s = toT3();
  logs(s, 'a', 40);
  for (let i = 0; i < 12; i++) act(s, 'a', 'rail.beamChop');
  act(s, 'a', 'rail.beamTake', { revision: beam(s).revision });
  act(s, 'a', 'rail.beamDrop', { revision: beam(s).revision, x: 99650, y: 3000, z: -13800 });
  assert.equal(beam(s).state, 'ground');
  assert.equal(beam(s).x, 99650);
  restore(s);
  const pulse = (marker: number, revision?: number) =>
    railSupplyPulse(s, {
      marker,
      grow: railGrowthMask([]),
      recover: [],
      ...(revision === undefined ? {} : { beam: revision }),
    });
  pulse(100);
  pulse(120, beam(s).revision);
  assert.equal(beam(s).state, 'ground');
  pulse(121);
  assert.equal(beam(s).state, 'ground', 'age alone is not recovery clearance');
  pulse(122, beam(s).revision - 1);
  assert.equal(beam(s).state, 'ground');
  pulse(123, beam(s).revision);
  assert.equal(beam(s).state, 'available');
  act(s, 'a', 'rail.beamTake', { revision: beam(s).revision });
  pulse(200, beam(s).revision);
  assert.equal(beam(s).state, 'held');
  assert.equal(invariant(s), null);
});

test("a beam drop's point is checked: never -0, never out of range, and the room still saves", () => {
  const s = toT3();
  logs(s, 'a', 40);
  for (let i = 0; i < 12; i++) act(s, 'a', 'rail.beamChop');
  for (const [x, y, z] of [
    [99650, 3000, -0],
    [-0, 3000, -13800],
    [99650, 1e300, -13800],
    [200001, 3000, -13800],
    [99650, 3000, 0.5],
    [NaN, 3000, -13800],
  ]) {
    act(s, 'a', 'rail.beamTake', { revision: beam(s).revision });
    assert.equal(beam(s).state, 'held');
    assert.doesNotThrow(() => s.snapshot(), `held: ${x}, ${y}, ${z}`);
    // The release still happens; the point is refused, so it goes back to the tree, as an off-ground drop does.
    assert.equal(act(s, 'a', 'rail.beamDrop', { revision: beam(s).revision, x: x!, y: y!, z: z! }).r.accepted, 1);
    assert.equal(beam(s).state, 'available', `${x}, ${y}, ${z}`);
    assert.doesNotThrow(() => s.snapshot(), `dropped: ${x}, ${y}, ${z}`);
  }
  act(s, 'a', 'rail.beamTake', { revision: beam(s).revision });
  act(s, 'a', 'rail.beamDrop', { revision: beam(s).revision, x: 99650, y: 3000, z: -13800 });
  assert.deepEqual(
    [beam(s).state, beam(s).x, beam(s).y, beam(s).z],
    ['ground', 99650, 3000, -13800],
    'a valid point still lands',
  );
  assert.equal(invariant(s), null);
});

test('production ceiling refuses an unrepresentable proper-axe bonus atomically', () => {
  const s = toForge();
  if (account(s, 'a')!.carry) act(s, 'a', 'rail.drop', { x: 100000, y: 3000, z: -14000, n: 8 });
  assert.equal(act(s, 'a', 'rail.axe').r.accepted, 1);
  Object.assign(s.mut(Rail, s.single(Rail))!, { produced: 2147479735, rack: 2147479735 });
  const k = trees(s).findIndex((t) => t.left === 10);
  assert.equal(invariant(s), null);
  assert.equal(act(s, 'a', 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }).r.accepted, 0);
  restore(s);
});

test('malformed line loads are atomic and replay hashes match through accepted actions and restoration', () => {
  const s = toT3();
  const saved = s.snapshot(),
    before = hash(s);
  type Snap = typeof saved;
  const col = (j: Snap, kind: string, field: string) => {
    const c = s.components.find((row) => row.kind === kind)!;
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
    assert.throws(() => s.load(bad, railwayCheck));
    assert.throws(() => createRailwayWorld().load(bad, railwayCheck));
    assert.equal(hash(s), before);
  }
  const copy = restore(s);
  for (let i = 0; i < 12; i++) {
    const a = account(s, 'a')!,
      k = trees(s).findIndex((t) => t.left > 0);
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
    assert.deepEqual(apply(s, 'a', e, 500 + i), apply(copy, 'a', e, 500 + i));
    assert.equal(hash(s), hash(copy));
  }
});

test('wrong material deposits and spent-rock strokes remain material no-ops', () => {
  const s = fresh();
  stones(s, 'a', 8, false);
  assert.equal(act(s, 'a', 'rail.deposit', { station: 'T1', kind: 1, n: 8 }).r.accepted, 0);
  // T1 takes no stone: its job's stone counts stay zero.
  assert.equal(job(s, 0).stoneStock, 0);
  assert.equal(job(s, 0).stoneDelivered, 0);
  restore(s);
  railSupplyPulse(s, { marker: 100, grow: railGrowthMask([]), recover: [] });
  railSupplyPulse(s, { marker: 110, grow: railGrowthMask([]), recover: [] });
  assert.equal(rock(s, 0).age, 10);
  assert.equal(act(s, 'b', 'rail.mine', { id: 0 }).r.accepted, 0);
  assert.equal(rock(s, 0).age, 10);
  railSupplyPulse(s, { marker: 131, grow: railGrowthMask([]), recover: [] });
  assert.equal(rocks(s).map((r) => r.left)[0], 8);
  assert.equal(rail(s).stoneProduced, 8);
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
      act(s, 'a', 'rail.beamTake', { revision: beam(s).revision });
      act(s, 'a', 'rail.beamDeposit', { revision: beam(s).revision, station: 'T3' });
    }
    const funded = railJobs(s)[index]!.job,
      start = funded.start;
    const schedule = scheduleOf(station, funded);
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
  const now = railCurrentJob(s).run.lastTick;
  railResume(s, railMaxDuration(s), 123, now);
  assert.equal(railPanelCount(s), 26);
  assert.equal(railPanelStock(s), 30);
  s = restore(s);
  railResume(s, railMaxDuration(s), 123, now);
  railResume(s, railMaxDuration(s), 124, now + 10000);
  assert.equal(railPanelCount(s), 26);
  assert.equal(railPanelStock(s), 30);
  assert.equal(railCurrentJob(s).job.start, -1);
  assert.equal(invariant(s), null);
});
