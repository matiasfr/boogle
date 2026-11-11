// Review of M10 c (branch ecs/m10c-line2): line 2's views read rows and queries through the read facade. These tests
// attack what the branch's own proof (test/railway-m10c-views.test.ts) does not run: line2-view's per-view memo
// (`seen()`, `activeIn`, `jobsIn`: the active stretch and line2Jobs kept for a world and a tick), reproduced here as
// written, against a fresh read and against `inspect()` (main's read), in the view's frame and in its packet handlers
// (accepted, the reset's restore). Plus the press closures' revision, forgeTake's bundle aim and waitsForTrainOn.
// Modelled on test/railway-m10d-review.test.ts; the room harness is M10 b's, as the branch's proof copies it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailwayAdapter, railMovement, type RailwayInspection } from '../src/adapters/railway.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import { buildSeedWorld, type Seed, type SeedStage } from './helpers/rail.ts';
import { account, boiler, type ReadWorld } from '../src/sim/railway-rows.ts';
import { line2Jobs, type QJobRead } from '../src/sim/railway-queries.ts';
import { line2Active } from '../src/sim/railway-queries-line2.ts';
import { waitsForTrain, waitsForTrainOn } from '../src/entities/railway/forge-offer.ts';

type Adapter = ReturnType<typeof createRailwayAdapter>;
const MOVEMENT = railMovement({ get: (k) => specOf(k)!.def });

// ---------------------------------------------------------------- a room and its clients (as M10 b's review)
type Client = { cid: string; pid: string; adapter: Adapter; mirror: ReturnType<typeof createRailwayMirror> } & {
  live: boolean;
  disconnect(): void;
  reconnect(): void;
};
function room(seed?: Seed) {
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const api = installRailway(sync, installRules(sync, homeLand()), replication);
  if (seed) {
    while (sync.world.tick < seed.t) sync.stepWorld(100);
    api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  }
  api.touchAll();
  const clients = new Map<string, Client>();
  const delays = new Map<string, number>();
  const handlers = new Map<string, Set<(m: unknown, from: string) => void>>();
  let step = 0;
  const clock = { now: 1000 };
  const up: { at: number; cid: string; m: unknown }[] = [];
  const down: { at: number; cid: string; m: unknown }[] = [];
  const requests = createRailwayRequests({
    api,
    pidOf: (sid) => clients.get(sid)?.pid ?? null,
    send: (m) => down.push({ at: step + (delays.get(m.to) ?? 0), cid: m.to, m }),
    replication,
    available: () => true,
    unavailable: () => 'starting',
    actor: () => ({ reach: () => true, height: () => true, cadence: () => true }),
  });
  function join(cid: string, pid: string, delay = 0) {
    delays.set(cid, delay);
    const hs = new Set<(m: unknown, from: string) => void>();
    handlers.set(cid, hs);
    const connection = new Set<(live: boolean) => void>();
    const mirror = createRailwayMirror();
    const adapter = createRailwayAdapter({
      mirror,
      movement: () => MOVEMENT,
      pid,
      pose: () => ({ x: T1.x / 100, y: 30, z: T1.z / 100 }),
      now: () => clock.now,
    });
    const c: Client = {
      cid,
      pid,
      adapter,
      mirror,
      live: true,
      disconnect() {
        c.live = false;
        for (const q of [up, down]) for (let i = q.length - 1; i >= 0; i--) if (q[i]!.cid === cid) q.splice(i, 1);
        replication.removeClient(cid);
        for (const h of connection) h(false);
      },
      reconnect() {
        c.live = true;
        replication.addClient(cid);
        for (const h of connection) h(true);
      },
    };
    const r: WorldRoom = {
      selfId: cid,
      send(m) {
        if (c.live) up.push({ at: step + delay, cid, m });
      },
      onMessage: (h) => (hs.add(h), () => hs.delete(h)),
      onConnection: (h) => (connection.add(h), () => connection.delete(h)),
    };
    clients.set(cid, c);
    replication.addClient(cid);
    adapter.attach(r);
    return c;
  }
  /** One server step; `each` runs on every client after its frame's update, as the views' frame would. */
  function run(n = 1, each?: (c: Client) => void) {
    for (let k = 0; k < n; k++) {
      step++;
      for (const x of up.filter((x) => x.at <= step)) {
        up.splice(up.indexOf(x), 1);
        if (clients.get(x.cid)?.live) requests.receive(x.m, x.cid);
      }
      sync.stepWorld(1000 / 60 + 1);
      clock.now += 17;
      replication.commit(sync.roomStep());
      replication.flush(sync.roomStep(), (cid, _p, json) =>
        down.push({ at: step + (delays.get(cid) ?? 0), cid, m: JSON.parse(json) }),
      );
      for (const cid of clients.keys())
        down.push({ at: step + (delays.get(cid) ?? 0), cid, m: { t: 'w:c', ht: sync.world.tick } });
      for (const x of down.filter((x) => x.at <= step)) {
        down.splice(down.indexOf(x), 1);
        const c = clients.get(x.cid);
        if (c?.live) for (const h of handlers.get(x.cid)!) h(x.m, SERVER_ID);
      }
      for (const c of clients.values()) {
        c.adapter.update(clock.now);
        each?.(c);
      }
    }
  }
  const ready = () => {
    for (let k = 0; k < 300 && ![...clients.values()].every((c) => c.adapter.inspect().ready); k++) run();
  };
  return { sync, api, join, run, ready, clients, clock };
}

// ---------------------------------------------------------------- line2-view.ts's memo, as written on the branch
/** line2-view.ts `seen()`, `activeIn`, `jobsIn` (createRailwayLine2, the `rd` block): kept for a world and a tick. */
function viewMemo(adapter: Adapter) {
  const rd = adapter.read;
  let seenW: ReadWorld | null = null,
    seenAt = -1,
    seenActive = -1,
    seenJobs: QJobRead[] | null = null;
  function seen(w: ReadWorld) {
    const at = rd.tick();
    if (w !== seenW || at !== seenAt) {
      seenW = w;
      seenAt = at;
      seenActive = line2Active(w);
      seenJobs = null;
    }
  }
  const activeIn = (w: ReadWorld) => (seen(w), seenActive);
  const jobsIn = (w: ReadWorld) => (seen(w), (seenJobs ??= line2Jobs(w, seenAt)));
  return { activeIn, jobsIn };
}
type Memo = ReturnType<typeof viewMemo>;
/** What line2-view takes from the memo: the active stretch, waitsForTrainOn's answer on it, and each job's fields. */
function memoRead(adapter: Adapter, m: Memo) {
  const w = adapter.read.world();
  const active = m.activeIn(w);
  return {
    active,
    owed: waitsForTrainOn(w, active),
    jobs: m.jobsIn(w).map(({ job, run }) => [job.start, job.completion, job.stock, job.railStock, run.elapsed]),
  };
}
/** The same, read fresh off the rows (what the memo stands in for). */
function freshRead(adapter: Adapter) {
  const w = adapter.read.world(),
    active = line2Active(w);
  return {
    active,
    owed: waitsForTrainOn(w, active),
    jobs: line2Jobs(w, adapter.read.tick()).map(({ job, run }) => [
      job.start,
      job.completion,
      job.stock,
      job.railStock,
      run.elapsed,
    ]),
  };
}
/** main's: the inspection line2-view read (`state = adapter.inspect()` at the head of update and each handler). */
function inspectRead(s: RailwayInspection) {
  const l = s.line2;
  return {
    active: l.active,
    owed: waitsForTrain(l),
    jobs: l.stations.map((j) => [j.start, j.completion, j.stock, j.railStock, j.elapsed]),
  };
}
type Miss = { where: string; frame: number; memo: unknown; inspect: unknown };
/** Mount the memo on a client as the view is mounted: read in its frame (update) and in its accepted and reset
 * handlers, each compared with main's inspection at the same moment. */
function watch(c: Client, label: string) {
  const m = viewMemo(c.adapter);
  const misses: Miss[] = [];
  let frame = 0,
    run = 0,
    longest = 0,
    frames = 0,
    lastTick = -1,
    lastSeen = '',
    lastWorld: ReadWorld | null = null,
    sameTick = 0,
    sameTickSameWorld = 0,
    activeMoves = 0;
  const check = (where: string) => {
    const got = memoRead(c.adapter, m),
      want = inspectRead(c.adapter.inspect());
    // The fresh read must agree with inspect() (else the memo is not the thing being tested).
    assert.deepEqual(freshRead(c.adapter), want, `${label} ${where} frame ${frame}: the fresh read`);
    const bad = JSON.stringify(got) !== JSON.stringify(want);
    if (bad) misses.push({ where, frame, memo: got, inspect: want });
    return bad;
  };
  c.adapter.onAccepted(() => void check('accepted'));
  // line2-view's onReset: restore() on a hard reset, which reads activeIn/jobsIn (feedLaunched, the head, the sea gate).
  c.adapter.onReset((soft) => void (!soft && check('restore')));
  return {
    misses,
    /** The view's update, once a frame after the adapter's update. */
    frame() {
      frame++;
      frames++;
      // Coverage: a frame whose line 2 facts moved while the tick the memo is keyed on did not (the attack's case).
      const tick = c.adapter.read.tick(),
        seen = JSON.stringify(inspectRead(c.adapter.inspect())),
        sameWorld = c.adapter.read.world() === lastWorld;
      if (tick === lastTick && seen !== lastSeen) sameTick++;
      if (tick === lastTick && seen !== lastSeen && sameWorld) sameTickSameWorld++;
      if (lastSeen && JSON.parse(seen).active !== JSON.parse(lastSeen).active) activeMoves++;
      [lastTick, lastSeen, lastWorld] = [tick, seen, c.adapter.read.world()];
      if (check('update')) longest = Math.max(longest, ++run);
      else run = 0;
    },
    stats: () => ({ frames, longest, misses: misses.length, sameTick, sameTickSameWorld, activeMoves }),
  };
}
const show = (label: string, w: ReturnType<typeof watch>) => {
  const first = w.misses[0];
  return `${label}: ${JSON.stringify(w.stats())}${first ? `; first: ${JSON.stringify(first)}` : ''}`;
};

// ---------------------------------------------------------------- (1) the memo against a packet that moves no tick
// A passive client (no pending action, so world() is the confirmed mirror: the same object across packets) watches a
// stretch finish by the server's rule and a second player's deposits. A packet writes the mirror in place; if the
// estimated tick has not moved since the memo was keyed, the memo still answers the old active stretch and old elapsed.
const FINISHING: readonly SeedStage[] = [
  'q5-finishing',
  'q6-finishing',
  'crossing-finishing',
  'q3-stocked',
  'q4-arriving',
];
for (const stage of FINISHING)
  test(`line2-view's memo at ${stage}: every frame and handler equal to inspect() for a passive client`, () => {
    const r = room(buildSeedWorld(stage));
    const a = r.join('a', 'a', 3);
    const b = r.join('b', 'b', 1);
    const wa = watch(a, `${stage} a`);
    r.ready();
    const rand = mulberry32(stage.length * 104729 + 7);
    for (let k = 0; k < 900; k++) {
      // Only b presses: deposits at the active stretch and the forge, so the stocks and the stretch move by packet.
      if (k % 3 === 0) {
        const spec = LINE2_STATIONS[Math.floor(rand() * LINE2_STATIONS.length)]!;
        const x = Math.floor(rand() * 5);
        if (x === 0) b.adapter.chop(RAILWAY_SOURCES[Math.floor(rand() * RAILWAY_SOURCES.length)]![0], 0, false);
        else if (x === 1) b.adapter.depositLine2('F', 1, 0);
        else if (x === 2) b.adapter.depotTake();
        else b.adapter.depositLine2(spec.id, 1, x === 3 ? 0 : 2);
      }
      r.run(1, (c) => c === a && wa.frame());
    }
    console.log(show(stage, wa));
    assert.deepEqual(wa.misses, [], show(stage, wa));
  });

// Q5 laid by the server's rule (q5-finishing is 450 ticks short): the active stretch moves from 4 to 5 by a packet,
// on two lags, while the passive clients press nothing. The stretch moving must show the frame inspect() shows it.
test("line2-view's memo as Q5 is laid by the rule: the active stretch moves the frame inspect()'s does", () => {
  const r = room(buildSeedWorld('q5-finishing'));
  const a = r.join('a', 'a', 3);
  const b = r.join('b', 'b', 0);
  const wa = watch(a, 'q5 laid a'),
    wb = watch(b, 'q5 laid b');
  r.ready();
  for (let k = 0; k < 3300 && line2Active(a.adapter.read.world()) === 4; k++)
    r.run(1, (c) => (c === a ? wa : wb).frame());
  r.run(60, (c) => (c === a ? wa : wb).frame());
  console.log(show('q5 laid a', wa));
  console.log(show('q5 laid b', wb));
  assert.ok(wa.stats().activeMoves > 0 && wb.stats().activeMoves > 0, 'the active stretch moved in the run');
  assert.deepEqual([...wa.misses, ...wb.misses], [], `${show('a', wa)} | ${show('b', wb)}`);
});

// The crossing completed by an action (b sets the pier's last footing): Works.crossing is written by rail.footSet, not
// by a rule tick, so its packet can land between two estimated ticks. qActive goes -1 -> 6 (Q7 opens at the crossing)
// on a's confirmed mirror, written in place: the same world object, and the memo's tick has not moved.
for (const delay of [0, 1, 2, 3, 4, 5])
  test(`line2-view's memo as b completes the crossing by a press (a on lag ${delay}): Q7 goes active the frame inspect()'s does`, () => {
    const r = room(buildSeedWorld('crossing-finishing'));
    const a = r.join('a', 'a', delay);
    const b = r.join('b', 'b', 1);
    const wa = watch(a, `crossing a lag ${delay}`);
    r.ready();
    r.run(7, () => void 0);
    // Step b's two carries apart so their packets land at different phases of a's tick.
    for (let set = 0; set < 2; set++) {
      assert.ok(b.adapter.shoulderFooting(1), `b shoulders footing ${set + 1}`);
      r.run(4 + set, (c) => c === a && wa.frame());
      assert.ok(b.adapter.setFooting(2), `b sets footing ${set + 1}`);
      r.run(9, (c) => c === a && wa.frame());
    }
    r.run(60, (c) => c === a && wa.frame());
    console.log(show(`crossing lag ${delay}`, wa));
    assert.equal(line2Active(a.adapter.read.world()), 6, 'Q7 is the active stretch once the crossing is complete');
    assert.ok(wa.stats().activeMoves > 0, 'the active stretch moved in the run');
    assert.deepEqual(wa.misses, [], show(`crossing lag ${delay}`, wa));
  });

// ---------------------------------------------------------------- (2) the memo across a late join's chunks
test("line2-view's memo for a late joiner mounted before its state: the restore and first frames equal inspect()", () => {
  const r = room(buildSeedWorld('q6-done'));
  const a = r.join('a', 'a', 2);
  r.ready();
  r.run(10);
  const b = r.join('b', 'b', 5);
  const wb = watch(b, 'late b');
  // The view is up before the state (it is mounted at load): it reads every frame while the chunks come in.
  for (let k = 0; k < 120; k++) r.run(1, (c) => c === b && wb.frame());
  console.log(show('late joiner', wb));
  assert.deepEqual(wb.misses, [], show('late joiner', wb));
  void a;
});

// ---------------------------------------------------------------- (3) the memo across a disconnect and refill
test("line2-view's memo across a disconnect and refill at q5-finishing equals inspect() every frame", () => {
  const r = room(buildSeedWorld('q5-finishing'));
  const a = r.join('a', 'a', 2);
  r.join('b', 'b', 1);
  const wa = watch(a, 'refill a');
  r.ready();
  r.run(30, (c) => c === a && wa.frame());
  a.disconnect();
  r.run(60, (c) => c === a && wa.frame());
  a.reconnect();
  r.run(200, (c) => c === a && wa.frame());
  console.log(show('refill', wa));
  assert.deepEqual(wa.misses, [], show('refill', wa));
});

// ---------------------------------------------------------------- (4) the press closures keep the revision seen
// boiler-view.ts targets(): `const { revision, holder } = b` when the prompt is built (the row is live). main kept the
// frozen inspection's `b`, so its closure sent the revision seen when the prompt was built too. Same value: a stale
// press is refused by the server's revision check either side. The row moving shows the copy is load-bearing.
test("boiler-view's press closure sends the revision seen when its prompt was built, as main's did", () => {
  const r = room(buildSeedWorld('boiler'));
  const a = r.join('a', 'a', 2);
  const b = r.join('b', 'b', 2);
  r.ready();
  r.run(5);
  const row = boiler(a.adapter.read.world());
  const promptRevision = row.revision;
  const mainRevision = a.adapter.inspect().line2.boiler.revision;
  assert.equal(promptRevision, mainRevision, 'the prompt is built on the same revision either side');
  assert.ok(b.adapter.takeBoiler(b.adapter.inspect().line2.boiler.revision), 'b takes the boiler');
  r.run(30);
  const live = boiler(a.adapter.read.world()).revision;
  assert.notEqual(live, promptRevision, 'the boiler moved on while the prompt stood');
  // a presses the stale prompt: both builds send `promptRevision`; it is not accepted.
  a.adapter.takeBoiler(promptRevision);
  r.run(30);
  assert.equal(boiler(a.adapter.read.world()).holder, 'b', 'the stale press changed nothing');
});

// ---------------------------------------------------------------- (5) forgeTake's bundle aim
// line2-view.ts accepted(), rail.forgeTake: main's aim closure read `state.railsCarry` when it ran (each frame of the
// flight; `state` is the view's, reassigned every frame). The branch takes `railsHeld` once, at the accept. A second
// take (or a deposit or a correction) during the 0.3 s flight leaves the branch's rails aiming at the old bundle slot.
test("line2-view's forgeTake flight aims where main's did after the back's rails change during it", () => {
  const tried: string[] = [];
  for (const stage of [
    'q1-done',
    'q2-arriving',
    'q3-done',
    'q4-arriving',
    'q4-done',
    'q5-carry',
    'works-lit',
  ] as const) {
    const r = room(buildSeedWorld(stage));
    const a = r.join('a', 'a', 4);
    r.ready();
    r.run(5);
    const flights: { branch: number; main: () => number }[] = [];
    a.adapter.onAccepted((e) => {
      if (e.op !== 'rail.forgeTake' || e.pid !== a.pid) return;
      const branch = account(a.adapter.read.world(), a.pid)?.rails ?? 0;
      flights.push({ branch, main: () => a.adapter.inspect().railsCarry });
    });
    const took = a.adapter.forgeTake();
    r.run(3);
    // Within the flight: a second take, else one rail set down (both change the back's rails).
    const changed = took && (a.adapter.forgeTake() || a.adapter.drop(T1.x + 150, 3000, T1.z + 150, 1, 2 as 0 | 1 | 2));
    tried.push(`${stage}: took ${took}, changed ${changed}, flights ${flights.length}`);
    if (!took || !changed || !flights.length) continue;
    // The first flight is still in the air (0.3 s, about 18 frames): its aim runs now, each frame.
    const first = flights[0]!;
    assert.equal(first.branch, first.main(), `${stage}: the first take's rails aim at the bundle slot main aims at`);
    return;
  }
  assert.fail(`no seed let the back's rails change during a forge take's flight: ${tried.join('; ')}`);
});

// ---------------------------------------------------------------- (6) waitsForTrainOn across every seed and the wake
const ALL: readonly SeedStage[] = [
  'awake',
  'q1-done',
  'q2-arriving',
  'q3-stocked',
  'q3-done',
  'q4-arriving',
  'q4-done',
  'q5-carry',
  'q5-finishing',
  'glide-earned',
  'boiler',
  'boiler-camp',
  'trains-on',
  'q6-finishing',
  'q6-done',
  'works-arrive',
  'works-open',
  'works-stocked',
  'works-lit',
  'stall-done',
  'cradle-fitted',
  'wagon-on',
  'crossing-finishing',
  'crossing-done',
  'deck-laid',
  'ring-joined',
];
test('waitsForTrainOn (its default active and the passed one) equals waitsForTrain at every seed, frame by frame', () => {
  for (const stage of ['fresh' as const, ...ALL]) {
    const r = room(stage === 'fresh' ? undefined : buildSeedWorld(stage));
    const a = r.join('a', 'a', 2);
    const check = (k: number) => {
      const w = a.adapter.read.world(),
        want = waitsForTrain(a.adapter.inspect().line2);
      assert.equal(waitsForTrainOn(w), want, `${stage} frame ${k}: default active`);
      assert.equal(waitsForTrainOn(w, line2Active(w)), want, `${stage} frame ${k}: passed active`);
    };
    check(-1);
    for (let k = 0; k < 80; k++) r.run(1, () => check(k));
  }
});
