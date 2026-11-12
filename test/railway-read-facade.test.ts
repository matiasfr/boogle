// The read facade's guards (docs/plans/ecs-migration-railway.md, M8; its review's three P3s, fixed in M8b): a mirror
// reset leaves `read.world()` whole, a timed fact on a client's world without `at` throws rather than answering with no
// progress, and `read.world()` is typed read-only. The first two came from branch review/m8 (58a3a2531), where they
// failed; the second now states the chosen fix (a client's world needs `at`) instead of an equal answer. Since M12b-1
// also jobProgress against the tick's run rows, and read.world() through a predicted wake and a refill.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import type { World } from '../src/ecs/index.ts';
import { install as installRailway, type Actor } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayAdapter } from '../src/adapters/railway-session.ts';
import { railMovement } from '../src/adapters/railway-read.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { homeLand } from './helpers/land.ts';
import * as q from '../src/sim/railway-queries.ts';
import * as q2 from '../src/sim/railway-queries-line2.ts';
import * as ql1 from '../src/sim/railway-queries-line1.ts';
import { RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { LINE1_STATIONS } from '../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { Account, Forge, Job, JobRun, QJob, QJobRun, Rail } from '../src/sim/railway-components.ts';
import type { RailAction } from '../src/sim/railway.ts';
import { cloneWorld } from '../src/sim/railway-queries.ts';

function room() {
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const api = installRailway(sync, installRules(sync, homeLand()), replication);
  api.touchAll();
  const mirror = createRailwayMirror();
  replication.addClient('a');
  let flushed = -1;
  const pump = () => {
    if (sync.roomStep() === flushed) sync.stepWorld(1000 / 60 + 1);
    const step = (flushed = sync.roomStep());
    replication.commit(step);
    replication.flush(step, (_cid, _p, json) => assert.ok(mirror.mirror.apply(JSON.parse(json), 0)));
  };
  return { sync, api, mirror, pump };
}

// Claim (railway-predict.ts worldOf, and the plan's "Reviewer attacks, answered"): "after [a reset] the confirmed model
// stays linked to its last whole world until the next whole state relinks it"; worldOf "never returns a half-filled
// world". But the mirror's reset() notifies a despawn for every row into the world the model is still linked to
// before it swaps in a fresh one, so that world is emptied: read.world() has no Rail and every query throws.
// Reachability: nothing in src/ calls the railway mirror's reset() today (the adapter refills instead).
test('read.world() after a mirror reset is still a whole world', () => {
  const r = room();
  r.api.session('a', 1);
  const adapter = createRailwayAdapter({
    mirror: r.mirror,
    movement: () => railMovement({ get: (k) => specOf(k)!.def }),
    pid: 'a',
    pose: () => ({ x: T1.x / 100, y: 30, z: T1.z / 100 }),
    now: () => 1000,
  });
  adapter.attach({
    selfId: 'a',
    send: () => {},
    onMessage: (fn) => {
      fn({ t: 'r:session', to: 'a', epoch: 1, next: 1 }, SERVER_ID);
      return () => {};
    },
    onConnection: () => () => {},
  });
  r.pump();
  assert.equal(adapter.read.world().count(Rail), 1, 'whole once the state arrived');
  r.mirror.reset();
  const w = adapter.read.world();
  assert.equal(w.count(Rail), 1, 'whole after a reset (the last whole world, as claimed)');
  assert.doesNotThrow(() => q.railActiveStation(w));
  adapter.dispose();
});

// Claim (M8 "Built"): a fact without `at` reads "the run rows the tick advances (server, seeds, tests)". A mirror's
// world, and a predicted clone of it, hold run rows that never move, so the same call there would answer with no
// progress while a job lays. It throws instead; with `at` it equals the server's answer.
test('a timed fact on a mirror or a predicted clone needs `at`, and with it equals the server', () => {
  const r = room();
  assert.ok(r.api.session('alice', 1));
  const w = r.api.world();
  // T1 funded now on the server's world (marked, so it replicates), then laid for a while by the rule tick.
  const tick = r.sync.world.tick;
  const bill = LINE1_STATIONS[0]!.bill[0];
  Object.assign(w.mut(Rail, q.railId(w))!, { awake: 0 });
  Object.assign(w.mut(Job, q.jobId(w, 0))!, { start: tick, stock: 0, delivered: bill });
  Object.assign(w.mut(JobRun, q.jobId(w, 0))!, { allocation: bill, used: 0, elapsed: 0, lastTick: tick });
  r.api.touchAll();
  for (let k = 0; k < 400; k++) r.sync.stepWorld(100);
  r.pump();
  const server = q2.railCounts(w);
  assert.ok(server.used > 0, 'laying on the server');
  const now = r.sync.world.tick;
  // The predictor's clone of the confirmed world (M12), and both mirror worlds.
  const clone = cloneWorld(r.mirror.confirmed());
  for (const [name, client] of [
    ['mirror', r.mirror.world()],
    ['confirmed', r.mirror.confirmed()],
    ['clone', clone],
  ] as const) {
    assert.throws(() => q2.railCounts(client), /needs the tick/, name);
    for (const f of [ql1.railPanelCount, ql1.railPhase, q2.line2Rails, q2.line2Logs, q.railCurrentJob])
      assert.throws(() => JSON.stringify(f(client)), /needs the tick/, `${name} ${f.name}`);
    // The rows alone still read: a job's stock is not timed.
    assert.equal(q.railJobs(client)[0]!.job.stock, 0, name);
    assert.throws(() => q.railJobs(client)[0]!.run, /needs the tick/, name);
    assert.throws(() => q.line2Jobs(client)[0]!.run, /needs the tick/, name);
    const at = q2.railCounts(client, now);
    assert.deepEqual(
      { used: at.used, allocation: at.allocation },
      { used: server.used, allocation: server.allocation },
    );
  }
});

// The facade's world is typed read-only: the writers and the change drain are not callable, and each() takes no
// writes. Checked by the typecheck (each line must be a type error); never run.
export function readOnlyWorld(read: ReturnType<typeof createRailwayAdapter>['read']) {
  const w = read.world();
  // @ts-expect-error a view may not write a row
  w.mut(Rail, 0);
  // @ts-expect-error nor spawn
  w.spawn([Rail, {}]);
  // @ts-expect-error nor despawn
  w.despawn(0);
  // @ts-expect-error nor drain the change marks
  w.changes(Rail);
  // @ts-expect-error nor load a snapshot
  w.load({});
  // @ts-expect-error nor ask each() for writable rows
  w.each([Rail], () => {}, [Rail]);
  // Reads, and the queries, still take it.
  w.each([Rail], (_id, rail) => void rail.awake);
  return [w.count(Rail), q.railActiveStation(w), q2.railCounts(w, read.tick()).total];
}

// jobProgress is "the same arithmetic as the tick": on the server's world, whose run rows the rule tick writes, every
// job's clock at the tick equals its run row, on both lines, unfunded, laying and laid (moved from M8's differential,
// test/railway-queries.test.ts, which held it through the read model's copy of those rows).
test('jobProgress at the tick equals the run rows the rule tick leaves, every job on both lines, as they lay', () => {
  const r = room();
  assert.ok(r.api.session('alice', 1));
  const w = r.api.world();
  let checks = 0,
    laying = 0;
  const agree = (where: string) => {
    const tick = r.sync.world.tick;
    for (let k = 0; k < LINE1_STATIONS.length; k++) {
      const id = q.jobId(w, k);
      assert.deepEqual(q.jobProgress(w, Job, id, tick), { ...w.get(JobRun, id)! }, `T${k + 1} ${where}`);
      if (w.get(Job, id)!.start >= 0 && !w.get(Job, id)!.completion) laying++;
    }
    for (let k = 0; k < LINE2_STATIONS.length; k++) {
      const id = q.qjobId(w, k);
      assert.deepEqual(q.jobProgress(w, QJob, id, tick), { ...w.get(QJobRun, id)! }, `Q${k + 1} ${where}`);
      if (w.get(QJob, id)!.start >= 0 && !w.get(QJob, id)!.completion) laying++;
    }
    checks++;
  };
  agree('fresh');
  // T1 funded now (as a funding leaves it), then laid by the rule tick to the end.
  const bill = LINE1_STATIONS[0]!.bill[0];
  Object.assign(w.mut(Rail, q.railId(w))!, { awake: 0 });
  Object.assign(w.mut(Job, q.jobId(w, 0))!, { start: r.sync.world.tick, stock: 0, delivered: bill });
  Object.assign(w.mut(JobRun, q.jobId(w, 0))!, { allocation: bill, used: 0, elapsed: 0, lastTick: r.sync.world.tick });
  r.api.touchAll();
  const t1 = q.scheduleOf(LINE1_STATIONS[0]!, w.get(Job, q.jobId(w, 0))!).totalTicks;
  for (let k = 0; k < t1 + 20; k++) {
    r.sync.stepWorld(100);
    agree(`T1 tick ${k}`);
  }
  assert.ok(w.get(Job, q.jobId(w, 0))!.completion, 'T1 laid');
  // Line two: line one laid, the forge lit and Q1 one log short; a deposit funds it and the tick lays it out.
  LINE1_STATIONS.forEach((spec, k) => {
    const id = q.jobId(w, k);
    const done = q.scheduleOf(spec, w.get(Job, id)!).totalTicks;
    Object.assign(w.mut(Job, id)!, { start: 0, completion: 1, stock: 0, delivered: spec.bill[0] });
    Object.assign(w.mut(JobRun, id)!, { elapsed: done, used: spec.bill[0], allocation: 0, lastTick: 0 });
    Object.assign(w.mut(JobRun, id)!, { stoneUsed: spec.bill[1], stoneAllocation: 0 });
  });
  w.mut(Forge, q.forgeId(w))!.lit = 0;
  const qspec = LINE2_STATIONS[0]!;
  Object.assign(w.mut(QJob, q.qjobId(w, 0))!, { stock: qspec.bill[0] - 1, railStock: qspec.bill[1] });
  Object.assign(w.mut(Account, w.lookup(Account, 'alice')!)!, { carry: 1, stone: 0, rails: 0 });
  r.api.touchAll();
  const anywhere: Actor = { reach: () => true, height: () => true, cadence: () => true };
  const e = { op: 'rail.deposit', station: 'Q1', n: 1, kind: 0, epoch: 1, request: 1 } as RailAction;
  assert.equal(r.api.act('alice', e, anywhere).status, 'accepted');
  assert.ok(w.get(QJob, q.qjobId(w, 0))!.start >= 0, 'Q1 funded');
  const q1 = q.scheduleOf(qspec, w.get(QJob, q.qjobId(w, 0))!).totalTicks;
  for (let k = 0; k < q1 + 20; k++) {
    r.sync.stepWorld(100);
    agree(`Q1 tick ${k}`);
  }
  assert.ok(w.get(QJob, q.qjobId(w, 0))!.completion, 'Q1 laid');
  assert.ok(laying > 100, `the clocks were compared while jobs laid (${laying} reads, ${checks} ticks)`);
});

// Moved from test/railway-queries.test.ts (M8's differential) with the read model's deletion.
test('read.world() is the world behind what the views see: whole before a packet, the clone while pending, kept in a refill', () => {
  const r = room();
  r.api.session('a', 1);
  const mirror = r.mirror;
  const adapter = createRailwayAdapter({
    mirror,
    movement: () => railMovement({ get: (k) => specOf(k)!.def }),
    pid: 'a',
    pose: () => ({ x: T1.x / 100, y: 30, z: T1.z / 100 }),
    now: () => 1000,
  });
  const read = adapter.read;
  assert.equal(read.pid, 'a');
  assert.equal(read.world().count(Rail), 1, 'whole before any packet (a fresh railway)');
  let hear: ((message: unknown, from: string) => void) | undefined;
  let connection: ((live: boolean) => void) | undefined;
  adapter.attach({
    selfId: 'a',
    send: () => {},
    onMessage: (fn) => {
      hear = fn;
      return () => {};
    },
    onConnection: (fn) => {
      connection = fn;
      return () => {};
    },
  });
  hear!({ t: 'r:session', to: 'a', epoch: 1, next: 1 }, SERVER_ID);
  r.pump();
  assert.equal(read.status(), 'ready');
  assert.equal(read.world(), mirror.confirmed(), 'nothing pending: the confirmed mirror');
  // A predicted wake: the views see the clone, and so does read.world().
  assert.equal(adapter.wake(), true);
  const clone = read.world();
  assert.notEqual(clone, mirror.confirmed());
  assert.equal(clone.count(Rail), 1);
  assert.equal(read.pending(), 1);
  const awake = (w: World) => w.get(Rail, q.railId(w))!.awake;
  assert.equal(awake(mirror.confirmed()), -1);
  assert.ok(awake(clone) >= 0);
  assert.equal(read.world(), clone, 'the same world on a second read in the frame');
  // A lost socket: the last shown state stays shown while the whole state comes again, and its world with it.
  connection!(false);
  assert.equal(read.world(), clone, 'kept through the refill');
  assert.equal(read.world().count(Rail), 1);
  adapter.dispose();
});
