// The read facade's session members and M10's two line-one queries (docs/plans/ecs-migration-railway.md, M10): what
// the view groups read once they leave inspect(). Each new member of `adapter.read` (ready, pending, stalled,
// movement) equals inspect()'s field at the same moment, along a random action stream behind simulated lag, a full
// pending window, a stall, a full-state resend, a hidden tab and tune edits, in and out of the frame loop; and
// `treeGrowth` and `freeCarryIgnoringBig` on `read.world()` equal inspect()'s `growth` and `freeCarry`, and the read
// model's arithmetic on seeded worlds. Temporary with inspect(): M12 deletes the inspect() side.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailwayAdapter, railMovement, type RailwayMovement } from '../src/adapters/railway.ts';
import { specOf, type TuneKey } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { railwayOf } from '../src/world/railway-predict.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { RAILWAY_WINDOW, railAccount as oldAccount, type Railway } from '../src/sim/railway.ts';
import { railCarryMax as oldCarryMax } from '../src/sim/railway-line2.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { buildSeedWorld, type SeedStage } from '../src/sim/railway-seeds.ts';
import { Account, Boiler, Tree } from '../src/sim/railway-components.ts';
import { boilerId, free, railAccount } from '../src/sim/railway-queries.ts';
import { freeCarryIgnoringBig, railPhase, treeGrowth } from '../src/sim/railway-queries-line1.ts';
import { homeLand } from './helpers/land.ts';

const KEYS = Object.keys(railMovement({ get: (k) => specOf(k)!.def })) as (keyof RailwayMovement)[];

/** A server room and two clients behind one-way delays in steps (6 steps ~ 100 ms), the adapter test's harness cut
 * to what this needs. The tune values and their rev are the client's own, as rules.tune is in the game. */
function room() {
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const api = installRailway(sync, installRules(sync, homeLand()), replication);
  api.touchAll();
  let step = 0;
  let now = 1000;
  const up: { at: number; cid: string; m: unknown }[] = [];
  const down: { at: number; cid: string; m: unknown }[] = [];
  const clients = new Map<string, ReturnType<typeof client>>();
  const requests = createRailwayRequests({
    api,
    pidOf: (sid) => clients.get(sid)?.pid ?? null,
    send: (m) => down.push({ at: step + (clients.get(m.to)?.delay ?? 0), cid: m.to, m }),
    replication,
    available: () => true,
    unavailable: () => 'starting',
    actor: () => ({ reach: () => true, height: () => true, cadence: () => true }),
  });
  const hidden = new Set<string>();
  function client(cid: string, pid: string, delay: number, withRev: boolean) {
    const tune = { v: new Map<TuneKey, number>(), rev: 0 };
    const handlers = new Set<(m: unknown, from: string) => void>();
    const connection = new Set<(live: boolean) => void>();
    let movementReads = 0;
    const adapter = createRailwayAdapter({
      mirror: createRailwayMirror(),
      movement: () => (movementReads++, railMovement({ get: (k) => tune.v.get(k) ?? specOf(k)!.def })),
      ...(withRev ? { movementRev: () => tune.rev } : {}),
      pid,
      pose: () => ({ x: T1.x / 100, y: 30, z: T1.z / 100 }),
      now: () => now,
    });
    const c = {
      cid,
      pid,
      delay,
      adapter,
      tune,
      live: true,
      handlers,
      movementReads: () => movementReads,
      /** A tune edit as rules.tune makes one: the value, then the rev. */
      set(key: TuneKey, v: number) {
        tune.v.set(key, v);
        tune.rev++;
      },
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
        if (c.live) up.push({ at: step + c.delay, cid, m });
      },
      onMessage: (h) => (handlers.add(h), () => handlers.delete(h)),
      onConnection: (h) => (connection.add(h), () => connection.delete(h)),
    };
    clients.set(cid, c);
    replication.addClient(cid);
    adapter.attach(r);
    return c;
  }
  /** One server step, then each client's frame (update), as the game's loop runs them. */
  function run(loop: boolean) {
    step++;
    for (const x of up.filter((x) => x.at <= step)) {
      up.splice(up.indexOf(x), 1);
      if (clients.get(x.cid)?.live) requests.receive(x.m, x.cid);
    }
    sync.stepWorld(1000 / 60 + 1);
    now += 17;
    replication.commit(sync.roomStep());
    replication.flush(
      sync.roomStep(),
      (cid, _p, json) => down.push({ at: step + (clients.get(cid)?.delay ?? 0), cid, m: JSON.parse(json) }),
      (cid) => !hidden.has(cid),
    );
    for (const c of clients.values())
      if (!hidden.has(c.cid)) down.push({ at: step + c.delay, cid: c.cid, m: { t: 'w:c', ht: sync.world.tick } });
    for (const x of down.filter((x) => x.at <= step && !hidden.has(x.cid))) {
      down.splice(down.indexOf(x), 1);
      const c = clients.get(x.cid);
      if (c?.live) for (const h of c.handlers) h(x.m, SERVER_ID);
    }
    if (loop) for (const c of clients.values()) if (!hidden.has(c.cid)) c.adapter.update(now);
  }
  /** The head of a frame on every client (the railway entity's update). */
  const frame = () => clients.forEach((c) => c.adapter.update(now));
  return { api, client, run, frame, hidden, advance: (ms: number) => void (now += ms) };
}
type Client = ReturnType<ReturnType<typeof room>['client']>;

let compared = 0;
/** Every new member against inspect()'s field, read in both orders (a member first, then inspect(), and back). */
function same(c: Client, where: string) {
  const { adapter } = c;
  const read = adapter.read;
  const first = {
    ready: read.ready(),
    pending: read.pending(),
    stalled: read.stalled(),
    tick: read.tick(),
    movement: read.movement(),
  };
  const s = adapter.inspect();
  const w = read.world();
  const want = {
    ready: s.ready,
    pending: s.pending,
    stalled: s.stalled,
    tick: s.tick,
    movement: Object.fromEntries(KEYS.map((k) => [k, s[k]])),
    growth: s.growth,
    freeCarry: s.freeCarry,
  };
  const got = (m: RailwayMovement) => ({
    ready: read.ready(),
    pending: read.pending(),
    stalled: read.stalled(),
    tick: read.tick(),
    movement: Object.fromEntries(KEYS.map((k) => [k, m[k]])),
    growth: RAILWAY_SOURCES.map((_s, k) => treeGrowth(w, k)),
    freeCarry: freeCarryIgnoringBig(w, c.pid),
  });
  assert.deepEqual(got(first.movement), { ...want, ...first, movement: want.movement }, `${where}: before inspect()`);
  assert.deepEqual(got(read.movement()), want, `${where}: after inspect()`);
  assert.equal(read.movement(), first.movement, `${where}: one movement object`);
  assert.ok(Object.isFrozen(first.movement));
  compared++;
}

test('ready, pending, stalled and movement equal inspect() along a lagged random stream, in and out of the loop', () => {
  const r = room();
  const rng = mulberry32(1010);
  const int = (n: number) => Math.floor(rng() * n);
  const a = r.client('a', 'alice', 6, true);
  const b = r.client('b', 'bob', 3, false);
  const all = [a, b];
  const check = (where: string) => all.forEach((c) => same(c, `${c.pid} ${where}`));
  check('before the first state');
  for (let k = 0; k < 40; k++) r.run(k % 2 === 0);
  check('the first state in');
  assert.equal(a.adapter.read.ready(), true, 'ready once the state and session arrived');
  assert.equal(a.adapter.wake(), true);
  for (let k = 0; k < 200; k++) r.run(true);
  const seen = { full: 0, stalled: 0, pending: 0, notReady: 0, statusReady: 0, refills: 0, tunes: 0 };
  const trees = RAILWAY_SOURCES.map((s) => s[0]);
  for (let k = 0; k < 1500; k++) {
    const c = all[int(2)]!;
    const roll = rng();
    // Presses: chops and drops, sometimes a burst that fills the pending window behind the lag.
    if (roll < 0.35) c.adapter.chop(trees[int(trees.length)]!, 0, rng() < 0.5);
    else if (roll < 0.45) c.adapter.drop(T1.x + int(3) * 100, 3000, T1.z, 1);
    else if (roll < 0.5) c.adapter.deposit(1);
    else if (roll < 0.52) for (let n = 0; n < RAILWAY_WINDOW + 2; n++) c.adapter.mine(int(3));
    else if (roll < 0.54) {
      // A tune edit: inside a frame both keep the frame's values, at the next frame both show it.
      c.set(['railJumpImpulse', 'railBeamSoloSpeed', 'railGlideSpeed'][int(3)] as TuneKey, 100 + int(500));
      seen.tunes++;
    } else if (roll < 0.555) {
      // A full-state resend: the socket drops and comes back, the refill arrives behind the lag.
      c.disconnect();
      same(c, `disconnected ${k}`);
      c.reconnect();
      seen.refills++;
    } else if (roll < 0.56) r.hidden.add(c.cid);
    else if (roll < 0.58) r.hidden.delete(c.cid);
    else if (roll < 0.6)
      c.delay = int(70); // up to ~1.2 s one way: long enough to stall
    else if (roll < 0.62) r.advance(int(1500)); // a long frame: pending actions go stale
    check(`after ${k}`);
    if (rng() < 0.6) r.run(rng() < 0.85);
    check(`stepped ${k}`);
    for (const x of all) {
      const s = x.adapter.inspect();
      if (s.pending >= RAILWAY_WINDOW) seen.full++;
      if (s.stalled) seen.stalled++;
      if (s.pending) seen.pending++;
      if (!s.ready) seen.notReady++;
      if (!s.ready && s.status === 'ready') seen.statusReady++;
    }
  }
  r.hidden.clear();
  for (let k = 0; k < 300; k++) r.run(true);
  check('settled');
  console.log(`[railway-read-session] ${compared} comparisons`, JSON.stringify(seen));
  assert.ok(seen.full > 0, 'the pending window filled');
  assert.ok(seen.stalled > 0, 'an action stalled');
  assert.ok(seen.statusReady > 0, "status() was 'ready' while ready() was not (a full window)");
  assert.ok(seen.refills > 0 && seen.tunes > 0);
});

test('read.movement() reads the tunables only when their rev moves, and is the same object until a value changes', () => {
  const r = room();
  const a = r.client('a', 'alice', 0, true);
  const m = a.adapter.read.movement();
  const reads = a.movementReads();
  for (let k = 0; k < 100; k++) assert.equal(a.adapter.read.movement(), m);
  assert.equal(a.movementReads(), reads, 'out of the loop: a rev check per call, no tunable read');
  a.set('railRegrowMinutes', 40); // not a movement tunable: read again, the same object
  assert.equal(a.adapter.read.movement(), m);
  assert.equal(a.movementReads(), reads + 1);
  a.set('railJumpTurn', 250);
  const n = a.adapter.read.movement();
  assert.notEqual(n, m);
  assert.equal(n.jumpTurn, 2.5);
  assert.equal(a.adapter.inspect().jumpTurn, 2.5);
  // In the loop: taken once a frame at its first read, so an edit after it shows at the next frame, in inspect() too.
  r.run(true);
  assert.equal(a.adapter.read.movement(), n);
  a.set('railJumpTurn', 300);
  assert.equal(a.adapter.read.movement(), n);
  assert.equal(a.adapter.inspect().jumpTurn, 2.5);
  r.run(true);
  assert.equal(a.adapter.read.movement().jumpTurn, 3);
  assert.equal(a.adapter.inspect().jumpTurn, 3);
  a.adapter.dispose();
});

/** The read model's arithmetic for the two (the adapter's buildState and inspection()). */
const oldGrowth = (s: Railway, k: number) => Math.max(0, (s.supply!.ages[k] ?? 0) - 31);
function oldFree(s: Railway, pid: string) {
  const a = oldAccount(s, pid);
  return Math.max(0, oldCarryMax(s) - (a?.carry ?? 0) - (a?.stone ?? 0) - (a?.rails ?? 0));
}

// Built at module scope (the unit tests' 5 s timeout): line one waking, and laid with line two begun.
const SEEDED = (['awake', 'q1-done'] as SeedStage[]).map((stage) => [stage, buildSeedWorld(stage).w] as const);

test('treeGrowth and freeCarryIgnoringBig equal the read model on seeded worlds with felled trees and big loads', () => {
  const rng = mulberry32(31);
  const int = (n: number) => Math.floor(rng() * n);
  let differs = 0;
  for (const [stage, w] of SEEDED) {
    const pids: string[] = [];
    w.each([Account], (_id, a) => void pids.push(a.pid));
    for (let round = 0; round < 20; round++) {
      for (let slot = 0; slot < RAILWAY_SOURCES.length; slot++)
        if (rng() < 0.3) Object.assign(w.mut(Tree, w.lookup(Tree, slot)!)!, { left: 0, age: int(36) });
      const pid = pids[int(pids.length)]!;
      if (rng() < 0.3) Object.assign(w.mut(Boiler, boilerId(w))!, { state: 'held', holder: pid });
      if (rng() < 0.3) Object.assign(w.mut(Account, w.lookup(Account, pid)!)!, { foot: 1 });
      const model = railwayOf(w);
      for (let k = 0; k < RAILWAY_SOURCES.length; k++)
        assert.equal(treeGrowth(w, k), oldGrowth(model, k), `${stage} tree ${k}`);
      for (const p of [...pids, 'nobody']) {
        assert.equal(freeCarryIgnoringBig(w, p), oldFree(model, p), `${stage} ${p}`);
        const a = railAccount(w, p);
        if (a && free(w, a) === 0 && freeCarryIgnoringBig(w, p) > 0) differs++;
      }
    }
    assert.equal(treeGrowth(w, RAILWAY_SOURCES.length), 0, 'no such tree');
  }
  assert.ok(differs > 0, 'a big load made free 0 where freeCarryIgnoringBig was not');
});

// The review of M10 b: a view that read the tick twice in one frame across a tick boundary lost the waking to idle edge.
test('read.tick() holds one value for a whole frame, inspect().tick, and world() at it reads what inspect() shows', () => {
  const r = room();
  const a = r.client('a', 'alice', 2, true);
  for (let k = 0; k < 40; k++) r.run(true);
  assert.equal(a.adapter.wake(), true);
  const read = a.adapter.read;
  let frames = 0,
    held = 0,
    edges = 0,
    last = read.tick(),
    phase = a.adapter.inspect().phase;
  // Frames of three server steps each (a slow client): the sim, its packets and clock stamps advance inside a frame.
  for (let k = 0; k < 120 && phase !== 'idle'; k++) {
    r.frame();
    frames++;
    const t = read.tick();
    assert.ok(t >= last, 'never backwards');
    if (t > last) held++;
    for (let step = 0; step < 3; step++) {
      r.run(false);
      assert.equal(read.tick(), t, `frame ${k} step ${step}: one tick in the frame`);
      assert.equal(a.adapter.inspect().tick, t, 'the same as inspect()');
      const s = a.adapter.inspect();
      assert.equal(railPhase(read.world(), t, t), s.phase, `frame ${k}: the world at read.tick() is what inspect() shows`);
    }
    // A press inside the frame rebuilds the read; the frame keeps its tick.
    if (k % 7 === 3) a.adapter.chop(RAILWAY_SOURCES[0]![0], 0, false);
    assert.equal(read.tick(), t);
    assert.equal(a.adapter.inspect().tick, t);
    if (a.adapter.inspect().phase !== phase) edges++;
    phase = a.adapter.inspect().phase;
    last = t;
  }
  assert.equal(phase, 'idle', 'woke');
  assert.ok(edges >= 1, 'the waking to idle edge was seen');
  assert.ok(held > frames / 2, `the tick advanced across frames (${held} of ${frames})`);
  // tickNow() stays live: it moves inside a frame.
  r.frame();
  const now0 = read.tickNow();
  r.run(false);
  r.run(false);
  assert.ok(read.tickNow() > now0, 'tickNow() is live');
  // Outside the loop (no update() yet) read.tick() is live, as inspect().tick is.
  const b = r.client('b', 'bob', 0, true);
  for (let k = 0; k < 40; k++) r.run(false);
  const t0 = b.adapter.read.tick();
  r.run(false);
  r.run(false);
  assert.ok(b.adapter.read.tick() > t0);
  assert.equal(b.adapter.read.tick(), b.adapter.inspect().tick);
});
