// The railway adapter on the replicated mirror (replication R1a, R1b): readiness, acks and refusals, predicted own
// actions with their effects at once, reconciliation (no pop on ack, a physical return on refusal or a lost race), the
// pile id remap, thresholds left to the server, disconnects and late join; against the real server rules and requests
// behind hand-driven rooms with a per-client one-way delay in steps.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRailwayAdapter,
  railMovement,
  type RailwayAccepted,
  type RailwayCorrection,
  type RailwayInspection,
} from '../src/adapters/railway.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { railCounts } from '../src/sim/railway.ts';
import { LINE1_INITIAL } from '../src/sim/railway-line-layout.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import { railwayAtTrains } from './helpers/railway-trains.ts';
import { edit, worldOf } from './railway-live.ts';
import { Account } from '../src/sim/railway-world.ts';

const MOVEMENT = {
  ...railMovement({ get: (k) => specOf(k)!.def }),
  beamSoloSpeed: 2,
  beamHelpSpeed: 5,
  jumpImpulse: 6,
  jumpTurn: 1,
  jumpSteer: 25,
  jumpApexSpeed: 1,
};
const TREE = RAILWAY_SOURCES[0]![0];

type Client = {
  cid: string;
  pid: string;
  adapter: ReturnType<typeof createRailwayAdapter>;
  mirror: ReturnType<typeof createRailwayMirror>;
  edits: Record<string, unknown>[];
  effects: RailwayAccepted[];
  corrections: RailwayCorrection[];
  remaps: [number, number][];
  resets: number;
  live: boolean;
  disconnect(): void;
  reconnect(): void;
};

/** A server room and its clients. `delay` is each client's one-way delay in steps (6 steps ~ 100 ms). */
function world({ reach = () => true }: { reach?: (pid: string) => boolean } = {}) {
  const sync = createSync();
  sync.setSelfId('server');
  const base = installRules(sync, homeLand());
  const replication = createReplicator();
  const api = installRailway(sync, base, replication);
  api.touchAll();
  const clients = new Map<string, Client>();
  const delays = new Map<string, number>();
  const handlers = new Map<string, Set<(m: unknown, from: string) => void>>();
  let step = 0;
  let now = 1000;
  const up: { at: number; cid: string; m: unknown }[] = [];
  const down: { at: number; cid: string; m: unknown }[] = [];
  const pidOf = (sid: string) => clients.get(sid)?.pid ?? null;
  const requests = createRailwayRequests({
    api,
    pidOf,
    send: (m) => down.push({ at: step + (delays.get(m.to) ?? 0), cid: m.to, m }),
    replication,
    available: () => true,
    unavailable: () => 'starting',
    actor: (facts) => ({ reach: () => reach(facts.pid), height: () => true, cadence: () => true }),
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
      pose: () => ({ x: -0.001, y: 0.0001, z: 995.62 }),
      now: () => now,
    });
    const c: Client = {
      cid,
      pid,
      adapter,
      mirror,
      edits: [],
      effects: [],
      corrections: [],
      remaps: [],
      resets: 0,
      live: true,
      disconnect() {
        c.live = false;
        // What was in flight on the old socket is gone with it.
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
    const room: WorldRoom = {
      selfId: cid,
      send(m) {
        if (!c.live) return;
        const msg = m as { t?: string; e?: Record<string, unknown> };
        if (msg.t === 'r:edit' && msg.e) c.edits.push(msg.e);
        up.push({ at: step + delay, cid, m });
      },
      onMessage: (h) => (hs.add(h), () => hs.delete(h)),
      onConnection: (h) => (connection.add(h), () => connection.delete(h)),
    };
    adapter.onAccepted((e) => c.effects.push(e));
    adapter.onCorrected((x) => c.corrections.push(x));
    adapter.onRemap((temp, id) => c.remaps.push([temp, id]));
    adapter.onReset(() => c.resets++);
    clients.set(cid, c);
    replication.addClient(cid);
    adapter.attach(room);
    return c;
  }
  const deliver = (cid: string, m: unknown) => {
    const c = clients.get(cid);
    if (c?.live) for (const h of handlers.get(cid)!) h(m, SERVER_ID);
  };
  // A hidden (frozen) tab: its socket backs up, so the server skips it and the next send carries everything at once;
  // it handles nothing until it comes back.
  const hidden = new Set<string>();
  // One server step: the arrivals due, the host's commit and flush, the addressed messages and the clock stamp (w:c),
  // each reaching its client after that client's delay.
  function run(n = 1) {
    for (let k = 0; k < n; k++) {
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
        (cid, _p, json) => down.push({ at: step + (delays.get(cid) ?? 0), cid, m: JSON.parse(json) }),
        (cid) => !hidden.has(cid),
      );
      for (const cid of clients.keys())
        if (!hidden.has(cid))
          down.push({ at: step + (delays.get(cid) ?? 0), cid, m: { t: 'w:c', ht: sync.world.tick } });
      for (const x of down.filter((x) => x.at <= step && !hidden.has(x.cid))) {
        down.splice(down.indexOf(x), 1);
        deliver(x.cid, x.m);
      }
      for (const c of clients.values()) if (!hidden.has(c.cid)) c.adapter.update(now);
    }
  }
  const ready = () => {
    for (let k = 0; k < 200 && ![...clients.values()].every((c) => c.adapter.inspect().ready); k++) run();
  };
  /** Wake the machine through `c` and wait until every client shows it ready. */
  function awake(c: Client) {
    assert.equal(c.adapter.wake(), true);
    for (let k = 0; k < 400 && ![...clients.values()].every((x) => x.adapter.inspect().phase === 'idle'); k++) run();
  }
  const quiet = (n = 60) => run(n);
  const hide = (cid: string, on: boolean) => void (on ? hidden.add(cid) : hidden.delete(cid));
  return { sync, api, replication, join, run, ready, awake, quiet, clients, deliver, hide };
}
type World = ReturnType<typeof world>;

// A client's predicted view equals the server once nothing is pending.
function agrees(w: World, s: RailwayInspection) {
  const server = w.api.railway;
  assert.equal(s.pending, 0);
  assert.deepEqual(s.counts, railCounts(server));
  assert.deepEqual(
    s.piles.map((p) => ({ ...p })),
    server.piles.map((p) => ({ ...p })),
  );
  assert.deepEqual(
    s.accounts.map((a) => [a.pid, a.carry, a.stone ?? 0]),
    server.accounts.map((a) => [a.pid, a.carry, a.stone ?? 0]),
  );
}
const conserved = (w: World) => {
  const c = railCounts(w.api.railway);
  assert.equal(c.total, LINE1_INITIAL[0] + c.produced, 'logs are conserved');
};

test('the adapter is ready once the whole state and its session have arrived', () => {
  const w = world();
  const a = w.join('a', 'alice');
  assert.equal(a.adapter.inspect().ready, false);
  w.ready();
  const s = a.adapter.inspect();
  assert.equal(s.ready, true, JSON.stringify({ status: s.status, epoch: s.epoch, synced: s.synced }));
  assert.equal(s.epoch, 1);
  assert.equal(s.counts.total, w.api.counts().total);
});

test('each request carries the actor position in whole centimetres (never -0), the action time and a wake its tick', () => {
  const w = world();
  const a = w.join('a', 'alice');
  w.ready();
  assert.equal(a.adapter.wake(), true);
  const tick = a.adapter.inspect().tick;
  assert.deepEqual(a.edits.at(-1), {
    op: 'rail.wake',
    tk: tick,
    epoch: 1,
    request: 1,
    ms: a.edits.at(-1)!.ms,
    at: [0, 0, 99562],
  });
  assert.ok(Object.is((a.edits.at(-1)!.at as number[])[0], 0), 'no -0, which railInt refuses');
});

test('a wake plays on the press and the server starts it at that tick, so the 3.1 s line up', () => {
  const w = world();
  const a = w.join('a', 'alice', 6); // ~200 ms round trip
  w.ready();
  const pressed = a.adapter.inspect().tick;
  assert.equal(a.adapter.wake(), true);
  assert.deepEqual(
    a.effects.map((e) => [e.op, e.predicted]),
    [['rail.wake', true]],
    'the wake effect plays on the press',
  );
  assert.equal(a.adapter.inspect().phase, 'waking', 'and the machine is waking at once');
  assert.equal(a.adapter.wake(), false, 'a second wake is not sent');
  w.run(20);
  assert.equal(w.api.railway.awake, pressed, 'the server starts the wake at the tick the actor pressed');
  assert.equal(a.adapter.inspect().awake, pressed);
  assert.equal(a.effects.length, 1, 'the confirmation plays nothing again');
  assert.equal(a.corrections.length, 0);
});

test('a wake claiming a tick far before its arrival is bounded', () => {
  const w = world();
  const a = w.join('a', 'alice');
  w.ready();
  w.run(120);
  w.api.act(
    'alice',
    { op: 'rail.wake', epoch: 1, request: 1, tk: 0 },
    { reach: () => true, height: () => true, cadence: () => true },
  );
  assert.equal(w.api.railway.awake, w.sync.world.tick - 10);
  void a;
});

test('a chop shows its logs at once at 200 ms; the ack adopts the same result with no pop', () => {
  const w = world();
  const a = w.join('a', 'alice', 6);
  w.ready();
  w.awake(a);
  const before = a.effects.length;
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  const shown = a.adapter.inspect();
  assert.equal(shown.carry, 2, 'carry shows the stroke at once');
  assert.equal(shown.sources[0], T1.sourceYield - 2);
  const effect = a.effects.at(-1)!;
  assert.equal(a.effects.length, before + 1);
  assert.deepEqual([effect.op, effect.accepted, effect.carried, effect.predicted], ['rail.chop', 2, 2, true]);
  // Every frame until the ack shows the same values; so does every frame after it.
  for (let k = 0; k < 20; k++) {
    w.run();
    const s = a.adapter.inspect();
    assert.equal(s.carry, 2, `carry at step ${k}`);
    assert.equal(s.sources[0], T1.sourceYield - 2, `tree at step ${k}`);
  }
  assert.equal(a.effects.length, before + 1, 'the server event for it plays nothing');
  assert.equal(a.corrections.length, 0);
  agrees(w, a.adapter.inspect());
  assert.equal(a.adapter.inspect().prediction.confirmed, 2, 'wake and chop confirmed as shown');
});

test('a refused action rolls back with a correction, never silently; a reconnect rebuilds from the whole state', () => {
  const w = world({ reach: () => false });
  const a = w.join('a', 'alice', 3);
  w.ready();
  assert.equal(a.adapter.wake(), true);
  assert.equal(a.adapter.inspect().phase, 'waking');
  w.run(10);
  const s = a.adapter.inspect();
  assert.equal(s.pending, 0);
  assert.equal(s.ready, true, 'a refusal is about the action, not the session');
  assert.equal(s.phase, 'asleep', 'the wake is rolled back');
  assert.deepEqual(
    a.corrections.map((c) => [c.event.op, c.lost, c.kept, c.reason]),
    [['rail.wake', 1, 0, 'refused']],
  );
  assert.equal(w.api.railway.awake, -1);
  a.disconnect();
  assert.equal(a.adapter.inspect().ready, false);
  assert.equal(a.adapter.wake(), false, 'disconnected input is gated');
  a.reconnect();
  w.ready();
  w.run(5);
  const back = a.adapter.inspect();
  assert.equal(back.ready, true);
  assert.equal(back.epoch, 1, 'the same socket id resumes its session (a server restart issues a new epoch)');
  assert.equal(back.next, w.api.account('alice')!.request + 1);
  assert.equal(a.effects.length, 1, 'the late join replays no effects');
  assert.equal(back.counts.total, w.api.counts().total);
});

test('a refused chop gives its logs back to the tree and leaves the tree standing', () => {
  let allow = true;
  const w = world({ reach: () => allow });
  const a = w.join('a', 'alice', 6);
  w.ready();
  w.awake(a);
  for (let k = 0; k < 4; k++) {
    assert.equal(a.adapter.chop(TREE, 0, false), true);
    w.run(15);
  }
  w.quiet(20);
  assert.equal(a.adapter.inspect().carry, 8);
  assert.equal(a.adapter.drop(T1.x, 3000, T1.z, 8), true);
  w.quiet(20);
  // The last stroke fells the tree locally; the server refuses it.
  allow = false;
  assert.equal(a.adapter.chop(TREE, 1, true), true);
  assert.equal(a.adapter.inspect().sources[0], 0, 'predicted: the tree is down');
  assert.equal(a.adapter.inspect().falls.collapsed[0], true);
  w.quiet(20);
  const s = a.adapter.inspect();
  assert.equal(s.sources[0], 2, 'the tree is back up');
  assert.equal(s.falls.collapsed[0], false);
  assert.equal(s.carry, 0);
  assert.deepEqual(
    a.corrections.map((c) => [c.event.op, c.lost, c.reason]),
    [['rail.chop', 2, 'refused']],
  );
  agrees(w, s);
});

test('two actors race for the last log: one keeps it, the other sees it fly to them', () => {
  const w = world();
  const a = w.join('a', 'alice', 6);
  const b = w.join('b', 'bob', 3);
  w.ready();
  w.awake(a);
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  w.quiet(20);
  assert.equal(a.adapter.drop(T1.x, 3000, T1.z, 1), true);
  w.quiet(20);
  const pile = w.api.railway.piles[0]!;
  assert.equal(pile.n, 1);
  // Both press at once; bob is closer to the server, so his take lands first.
  assert.equal(a.adapter.take(pile.id), true);
  assert.equal(b.adapter.take(pile.id), true);
  assert.equal(a.adapter.inspect().carry, 2, 'alice is shown the log');
  assert.equal(b.adapter.inspect().carry, 1, 'so is bob');
  w.quiet(30);
  assert.equal(w.api.account('bob')!.carry, 1, 'bob got it');
  assert.equal(w.api.account('alice')!.carry, 1);
  assert.deepEqual(
    a.corrections.map((c) => [c.event.op, c.lost, c.winner]),
    [['rail.take', 1, 'bob']],
    'alice gives it back, to bob',
  );
  const bobs = a.effects.find((e) => e.op === 'rail.take' && e.pid === 'bob')!;
  assert.equal(bobs.returned, 1, "bob's take does not also fly the log from the pile on alice's screen");
  assert.equal(b.corrections.length, 0);
  for (const c of [a, b]) agrees(w, c.adapter.inspect());
  conserved(w);
});

test('a drop shows its pile at once under a temporary id, re-keyed when the server names it', () => {
  const w = world();
  const a = w.join('a', 'alice', 6);
  w.ready();
  w.awake(a);
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  w.quiet(20);
  assert.equal(a.adapter.drop(T1.x, 3000, T1.z, 2), true);
  const shown = a.adapter.inspect();
  assert.equal(shown.carry, 0);
  assert.equal(shown.piles.length, 1);
  const temp = shown.piles[0]!.id;
  assert.ok(temp < 0, 'a temporary id');
  assert.equal(a.effects.at(-1)!.pile, temp, 'the drop flies to it');
  assert.equal(a.adapter.take(temp), false, 'not taken before the server names it');
  w.quiet(20);
  const id = w.api.railway.piles[0]!.id;
  assert.deepEqual(a.remaps, [[-temp, id]], "the drop of that request landed in the server's pile");
  assert.equal(a.adapter.inspect().piles[0]!.id, id);
  assert.equal(a.adapter.take(id), true);
  assert.equal(a.adapter.inspect().carry, 2);
  w.quiet(20);
  agrees(w, a.adapter.inspect());
});

test('each effect carries what its own action left, so two drops in one packet both fly to the right pile', () => {
  const w = world();
  const a = w.join('a', 'alice');
  const b = w.join('b', 'bob');
  const c = w.join('c', 'carol');
  w.ready();
  w.awake(a);
  for (let k = 0; k < 2; k++) {
    assert.equal(a.adapter.chop(TREE, 0, false), true);
    w.run(15);
  }
  assert.equal(b.adapter.chop(TREE, 0, false), true);
  w.run(15);
  assert.equal(a.adapter.inspect().carry, 4);
  // Two drops, two piles, applied in one step and so carried by one packet to the observer.
  assert.equal(a.adapter.drop(T1.x, 3000, T1.z, 2), true);
  assert.equal(b.adapter.drop(T1.x + 100, 3000, T1.z, 1), true);
  w.run(2);
  const drops = c.effects.filter((e) => e.op === 'rail.drop');
  assert.equal(drops.length, 2);
  const piles = w.api.railway.piles;
  assert.deepEqual(
    drops.map((e) => [e.pile, e.level, e.carried]),
    [
      [piles[0]!.id, 2, 2],
      [piles[1]!.id, 1, 1],
    ],
  );
  // A take carries where its pile stood, even though the pile is gone by the end of the packet.
  assert.equal(a.adapter.take(piles[1]!.id), true);
  w.run(2);
  const take = c.effects.find((e) => e.op === 'rail.take')!;
  assert.deepEqual([take.px, take.pz, take.level, take.carried], [T1.x + 100, T1.z, 0, 3]);
});

test('a chop pressed before the wake is ready is not sent ("not yet"); the first one predicted is the first accepted', () => {
  const w = world();
  const a = w.join('a', 'alice', 6);
  w.ready();
  assert.equal(a.adapter.wake(), true);
  assert.equal(a.adapter.chop(TREE, 0, false), false, 'waking: not yet');
  let first = -1;
  for (let k = 0; k < 400 && first < 0; k++) {
    w.run();
    if (a.adapter.chop(TREE, 0, false)) first = k;
  }
  assert.ok(first > 0);
  w.quiet(30);
  assert.equal(a.corrections.length, 0, 'the server accepts what the prediction accepted at the boundary');
  assert.equal(w.api.account('alice')!.carry, 2);
  assert.ok(a.adapter.inspect().prediction.notYet > 0);
});

test('a deposit that completes a bill shows it full, and the job starts only when the server confirms it', () => {
  const w = world();
  const a = w.join('a', 'alice', 6);
  w.ready();
  w.awake(a);
  let delivered = 0;
  for (let tree = 0; delivered < T1.bill; tree++) {
    const id = RAILWAY_SOURCES[tree]![0];
    while (a.adapter.inspect().sources[tree]! > 0 && a.adapter.inspect().carry < 8) {
      assert.equal(a.adapter.chop(id, 0, false), true);
      w.run(15);
    }
    w.quiet(20);
    while (a.adapter.inspect().carry > 0 && delivered < T1.bill - 1) {
      assert.equal(a.adapter.deposit(1, 0), true);
      delivered++;
      w.run(5);
    }
    w.quiet(20);
    if (delivered === T1.bill - 1 && a.adapter.inspect().carry > 0) {
      assert.equal(a.adapter.deposit(1, 0), true);
      delivered++;
      const s = a.adapter.inspect();
      assert.equal(s.stations[0]!.stock, T1.bill, 'shown full at once');
      assert.equal(s.stations[0]!.start, -1, 'but the job waits for the server');
      assert.equal(s.phase, 'idle');
      w.quiet(30);
      assert.ok(a.adapter.inspect().stations[0]!.start >= 0, 'started once confirmed');
      assert.notEqual(a.adapter.inspect().phase, 'idle');
    }
  }
  assert.equal(a.corrections.length, 0);
  conserved(w);
});

test('a disconnect with pending predictions drops them without replays; the reconnect shows the server', () => {
  const w = world();
  const a = w.join('a', 'alice', 12); // a 400 ms round trip: two swings fit inside it
  w.ready();
  w.awake(a);
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  w.run(15);
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  assert.equal(a.adapter.inspect().pending, 2);
  const effects = a.effects.length;
  a.disconnect();
  assert.equal(a.corrections.length, 0, 'a lost socket rebuilds the views rather than playing returns');
  assert.ok(a.resets > 0);
  a.reconnect();
  w.ready();
  w.quiet(20);
  const s = a.adapter.inspect();
  assert.equal(a.effects.length, effects, 'nothing replays');
  assert.equal(s.carry, w.api.account('alice')!.carry);
  agrees(w, s);
});

test('a late joiner mirrors the predicted players exactly and plays nothing', () => {
  const w = world();
  const a = w.join('a', 'alice', 6);
  w.ready();
  w.awake(a);
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  w.run(15);
  assert.equal(a.adapter.drop(T1.x, 3000, T1.z, 1), true);
  w.quiet(20);
  const late = w.join('c', 'carol', 6);
  w.ready();
  w.quiet(20);
  assert.equal(late.effects.length, 0, 'the whole state replays nothing');
  for (const c of [a, late]) agrees(w, c.adapter.inspect());
  // From then on it sees the others' actions as they are confirmed.
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  w.quiet(30);
  assert.deepEqual(
    late.effects.map((e) => [e.op, e.pid, e.predicted ?? false]),
    [['rail.chop', 'alice', false]],
  );
});

test('random play by four predicting clients at 0-200 ms converges on the server with corrections only for contests', () => {
  const w = world();
  const delays = [0, 3, 6, 6];
  const cs = delays.map((d, k) => w.join(`c${k}`, `p${k}`, d));
  w.ready();
  w.awake(cs[0]!);
  const rnd = mulberry32(7);
  for (let step = 0; step < 1500; step++) {
    for (const c of cs) {
      if (rnd() > 0.08) continue;
      const s = c.adapter.inspect();
      const r = rnd();
      const tree = Math.floor(rnd() * 3);
      if (r < 0.4) c.adapter.chop(RAILWAY_SOURCES[tree]![0], 0, false);
      else if (r < 0.65 && s.carry > 0) c.adapter.drop(T1.x + tree * 100, 3000, T1.z, 1 + Math.floor(rnd() * 2));
      else if (r < 0.9 && s.piles.length) c.adapter.take(s.piles[Math.floor(rnd() * s.piles.length)]!.id);
      else c.adapter.deposit(1, 0);
    }
    w.run();
  }
  w.quiet(60);
  for (const c of cs) agrees(w, c.adapter.inspect());
  conserved(w);
  const stats = cs.map((c) => c.adapter.inspect().prediction);
  const predicted = stats.reduce((n, s) => n + s.predicted, 0);
  const corrected = stats.reduce((n, s) => n + s.corrected, 0);
  assert.ok(predicted > 100, `${predicted} predicted`);
  for (const c of cs)
    for (const x of c.corrections)
      assert.ok(
        // A take whose pile someone else emptied first is refused outright (out of reach of a pile that is gone).
        x.reason === 'contested' || x.reason === 'noop' || (x.reason === 'refused' && x.event.op === 'rail.take'),
        `only contests are corrected (${x.event.op} ${x.reason})`,
      );
  // Four players grabbing at the same three piles at up to 200 ms is the worst case: about one in seven is a contest
  // (a lost take, or a later drop or deposit of the logs it would have given), and each is a physical return.
  assert.ok(corrected / predicted < 0.25, `${corrected} of ${predicted} corrected`);
});

test('a swing sooner than the server allows is "not yet": never sent, shown or refused', () => {
  const w = world();
  const a = w.join('a', 'alice', 6);
  w.ready();
  w.awake(a);
  const sent = a.edits.length;
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  w.run(5); // 85 ms: inside the 240 ms swing cadence
  assert.equal(a.adapter.chop(TREE, 0, false), false);
  assert.equal(a.edits.length, sent + 1, 'nothing sent for it');
  assert.equal(a.adapter.inspect().carry, 2);
  w.run(10); // 255 ms since the first
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  assert.equal(a.adapter.inspect().next, 4, 'request numbers stay consecutive after a withdrawn press');
  w.quiet(30);
  assert.equal(a.corrections.length, 0);
  assert.equal(w.api.account('alice')!.carry, 4);
  agrees(w, a.adapter.inspect());
});

test('a session refusal returns what that action and later ones showed, never earlier ones', () => {
  const w = world();
  const a = w.join('a', 'alice', 12); // the first chop is still unanswered when the status comes
  w.ready();
  w.awake(a);
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  w.run(15);
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  const request = a.adapter.inspect().next - 1;
  // The room says it stopped taking actions at this one (a storage failure): an addressed status naming it.
  w.deliver('a', { t: 'r:state', to: 'a', state: 'storage', epoch: 1, request });
  assert.deepEqual(
    a.corrections.map((c) => [c.event.request, c.reason]),
    [[request, 'session']],
  );
  assert.equal(a.adapter.inspect().status, 'storage');
});

test('a resync while predictions are out returns nothing: the refill is read only once whole', () => {
  const w = world();
  const a = w.join('a', 'alice', 6);
  w.ready();
  w.awake(a);
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  w.run(2);
  // A packet the mirror must refuse: it resets and asks for the whole state, which arrives in several chunks.
  w.deliver('a', { t: 's', tk: w.sync.roomStep(), c: [['nope', 1, {}]] });
  assert.equal(a.adapter.inspect().synced, false);
  w.quiet(40);
  const s = a.adapter.inspect();
  assert.equal(s.synced, true);
  assert.equal(a.corrections.length, 0, 'no chunk of the refill reads as the chop losing');
  assert.equal(s.carry, 2);
  agrees(w, s);
});

test('two players waking the machine together: the later one gives nothing back and replays nothing', () => {
  const w = world();
  const a = w.join('a', 'alice', 2);
  const b = w.join('b', 'bob', 8);
  w.ready();
  assert.equal(a.adapter.wake(), true);
  assert.equal(b.adapter.wake(), true);
  w.quiet(40);
  for (const c of [a, b]) {
    assert.equal(c.corrections.length, 0, `${c.pid}: no return`);
    assert.equal(c.effects.filter((e) => e.op === 'rail.wake').length, 1, `${c.pid}: one wake played, its own`);
  }
  assert.equal(b.adapter.inspect().awake, w.api.railway.awake);
});

test('a take that the newer mirror makes bigger plays the extra pieces', () => {
  const w = world();
  const a = w.join('a', 'alice', 8);
  const b = w.join('b', 'bob', 0);
  w.ready();
  w.awake(a);
  for (const c of [a, b]) assert.equal(c.adapter.chop(TREE, 0, false), true);
  w.quiet(30);
  assert.equal(a.adapter.drop(T1.x, 3000, T1.z, 1), true);
  w.quiet(30);
  const pile = w.api.railway.piles[0]!;
  // Alice takes the one log she sees; Bob's drop of two more onto that pile reaches the server first.
  assert.equal(a.adapter.take(pile.id), true);
  assert.equal(b.adapter.drop(T1.x, 3000, T1.z, 2), true);
  w.quiet(40);
  const takes = a.effects.filter((e) => e.op === 'rail.take' && e.predicted);
  assert.deepEqual(
    takes.map((e) => e.accepted),
    [1, 2],
    'the extra two play as they become hers',
  );
  assert.equal(a.corrections.length, 0);
  assert.equal(w.api.account('alice')!.carry, 4);
  agrees(w, a.adapter.inspect());
});

test('a drop shown merging into a pile the server no longer has is re-keyed to the new pile', () => {
  const w = world();
  const a = w.join('a', 'alice', 8);
  const b = w.join('b', 'bob', 0);
  w.ready();
  w.awake(a);
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  w.quiet(30);
  assert.equal(a.adapter.drop(T1.x, 3000, T1.z, 1), true);
  w.quiet(30);
  const old = w.api.railway.piles[0]!.id;
  // Alice drops onto the pile she sees while Bob, closer to the server, takes it away.
  assert.equal(a.adapter.drop(T1.x, 3000, T1.z, 1), true);
  const request = a.adapter.inspect().next - 1;
  assert.equal(a.effects.at(-1)!.pile, old, 'shown merging');
  assert.equal(b.adapter.take(old), true);
  w.quiet(40);
  const fresh = w.api.railway.piles[0]!.id;
  assert.notEqual(fresh, old);
  assert.deepEqual(a.remaps.at(-1), [request, fresh]);
  agrees(w, a.adapter.inspect());
});

test('a tab hidden for 30 s while carrying, a stroke still out, comes back with nothing rolled back', () => {
  const w = world();
  const a = w.join('a', 'alice', 6);
  const others = [w.join('b', 'bob', 2), w.join('c', 'carol', 4), w.join('d', 'dan', 3)];
  w.ready();
  w.awake(a);
  for (let k = 0; k < 2; k++) {
    assert.equal(a.adapter.chop(TREE, 0, false), true);
    w.run(15);
  }
  assert.equal(a.adapter.chop(TREE, 0, false), true);
  const shown = a.adapter.inspect().carry;
  assert.equal(shown, 6);
  w.hide('a', true);
  // Thirty seconds of everyone else working: hundreds of events (past MAX_EVENTS) and a catch-up big enough to split.
  for (let step = 0; step < 1800; step++) {
    if (step % 12 === 0)
      for (const [k, c] of others.entries()) {
        const s = c.adapter.inspect();
        const tree = (step / 12 + k * 7) % RAILWAY_SOURCES.length;
        if (s.carry >= 6) c.adapter.drop(T1.x + k * 100 + (step % 600), 3000, T1.z, 1);
        else c.adapter.chop(RAILWAY_SOURCES[tree]![0], 0, false);
      }
    w.run();
  }
  const before = a.mirror.mirror.stats.applied;
  w.hide('a', false);
  w.quiet(40);
  const packets = a.mirror.mirror.stats.applied - before;
  assert.ok(packets > 1, `the catch-up came in ${packets} chunks`);
  assert.equal(a.corrections.length, 0, 'nothing flew off the back');
  assert.equal(a.adapter.inspect().carry, shown, 'the carry never dropped');
  agrees(w, a.adapter.inspect());
});

/** Chop and deliver T1's whole bill through the adapter, then chop two more to carry while it lays. */
function fundT1(w: World, a: Client) {
  w.awake(a);
  let tree = 0;
  const chop = () => {
    while (!a.adapter.inspect().sources[tree]) tree++;
    assert.equal(a.adapter.chop(RAILWAY_SOURCES[tree]![0], 0, false), true);
    w.run(15);
  };
  for (let load = 0; load < 3; load++) {
    while (a.adapter.inspect().carry < 8) chop();
    w.quiet(20);
    assert.equal(a.adapter.deposit(8, 0), true);
    w.quiet(20);
  }
  chop();
  w.quiet(20);
  assert.ok(a.adapter.inspect().stations[0]!.start >= 0, 'T1 is laying');
  assert.equal(a.adapter.inspect().carry, 2);
}

for (const how of ['a lost connection', 'a resync'] as const)
  test(`through ${how} mid-laying, every frame shows the job going forward and the logs on the back`, () => {
    const w = world();
    const a = w.join('a', 'alice', 6);
    w.ready();
    fundT1(w, a);
    const frames: { elapsed: number; carry: number; accounts: number; tick: number }[] = [];
    const frame = (n: number) => {
      for (let k = 0; k < n; k++) {
        w.run();
        const s = a.adapter.inspect();
        frames.push({ elapsed: s.stations[0]!.elapsed, carry: s.carry, accounts: s.accounts.length, tick: s.tick });
      }
    };
    frame(30);
    if (how === 'a lost connection') {
      a.disconnect();
      frame(120); // two seconds away
      const away = frames.at(-1)!.elapsed - frames[29]!.elapsed;
      assert.ok(away >= 15, `the laying goes on while away (${away} ticks in 2 s), so coming back is no jump`);
      a.reconnect();
    } else w.deliver('a', { t: 's', tk: w.sync.roomStep(), c: [['nope', 1, {}]] });
    frame(90);
    assert.equal(a.adapter.inspect().ready, true, 'actions are back');
    for (let k = 1; k < frames.length; k++) {
      const [was, now] = [frames[k - 1]!, frames[k]!];
      assert.ok(now.elapsed >= was.elapsed, `frame ${k}: laying never steps back (${was.elapsed} -> ${now.elapsed})`);
      assert.ok(now.tick >= was.tick, `frame ${k}: the tick never goes back`);
      assert.equal(now.carry, 2, `frame ${k}: the carried logs never blink`);
      assert.ok(now.accounts > 0, `frame ${k}: the accounts never empty`);
    }
    assert.ok(frames.at(-1)!.elapsed > frames[0]!.elapsed);
    assert.equal(a.corrections.length, 0);
    // (The laying's own progress is shown at the client's estimate of the server tick, a one-way delay behind.)
    const s = a.adapter.inspect();
    assert.equal(s.counts.total, w.api.counts().total);
    assert.equal(s.carry, w.api.account('alice')!.carry);
    assert.equal(s.stations[0]!.start, w.api.railway.start);
  });

test('no breaker and no strike sent while you haul the boiler', () => {
  const seed = railwayAtTrains('boiler'),
    w = world();
  while (w.sync.world.tick < seed.t) w.sync.stepWorld(100);
  w.api.world().load(JSON.parse(JSON.stringify(worldOf(seed.s).snapshot())));
  w.api.touchAll();
  const a = w.join('a', 'a'),
    b = w.join('b', 'b');
  w.ready();
  assert.equal(a.adapter.takeBoiler(w.api.boiler().revision), true);
  w.quiet();
  assert.equal(w.api.boiler().state, 'held');
  assert.equal(a.adapter.takeBreaker(), false);
  assert.equal(a.adapter.strike(0), false);
  assert.equal(b.adapter.takeBreaker(), true, 'someone else may still ask');
});
test('a footing on your back still lets you take the breaker, as the sim does', () => {
  const seed = railwayAtTrains('boiler'),
    w = world();
  edit(seed.s, (e) => void (e.mut(Account, e.lookup(Account, 'a')!)!.foot = 1));
  while (w.sync.world.tick < seed.t) w.sync.stepWorld(100);
  w.api.world().load(JSON.parse(JSON.stringify(worldOf(seed.s).snapshot())));
  w.api.touchAll();
  const a = w.join('a', 'a');
  w.ready();
  assert.equal(w.api.account('a')!.foot, 1);
  assert.equal(a.adapter.takeBreaker(), true);
});

test("a tune edit changes the boiler's haul pace the views read", () => {
  let solo = 300;
  const adapter = createRailwayAdapter({
    mirror: createRailwayMirror(),
    movement: () => railMovement({ get: (k) => (k === 'railBoilerSoloSpeed' ? solo : specOf(k)!.def) }),
    pid: 'a',
    pose: () => ({ x: 0, y: 0, z: 0 }),
    now: () => 0,
  });
  assert.equal(adapter.inspect().boilerSoloSpeed, 3);
  assert.equal(adapter.inspect().boilerHelpSpeed, 5.4);
  solo = 340;
  assert.equal(adapter.inspect().boilerSoloSpeed, 3.4);
});

test('a back set down as two drops 100 ms apart: both predicted, both accepted by the host, nothing left on the back', () => {
  // The client half of build 0 (docs/brainstorms/station-deposit.md): src/entities/railway/back-down.ts sends one drop a pile.
  const w = world();
  const a = w.join('a', 'alice');
  w.ready();
  w.awake(a);
  for (let k = 0; k < 4; k++) {
    assert.equal(a.adapter.chop(TREE, 0, false), true);
    w.run(15);
  }
  const held = a.adapter.inspect().carry;
  assert.ok(held >= 2);
  const first = Math.floor(held / 2);
  assert.equal(a.adapter.drop(T1.x, 3000, T1.z, first), true);
  assert.equal(a.adapter.drop(T1.x + 100, 3000, T1.z, held - first), false, 'a second drop inside unloadMs is "not yet"');
  w.run(6); // back-down.ts sends the next one 100 ms later (frames of 17 ms)
  assert.equal(a.adapter.drop(T1.x + 100, 3000, T1.z, held - first), true, 'the second sees the first already spent');
  assert.equal(a.adapter.inspect().carry, 0, 'predicted straight away');
  assert.equal(a.adapter.drop(T1.x + 200, 3000, T1.z, 1), false, 'and nothing is left to drop');
  w.run(20);
  assert.equal(a.adapter.inspect().carry, 0);
  assert.equal(
    w.api.railway.piles.reduce((n, p) => n + p.n, 0),
    held,
  );
  agrees(w, a.adapter.inspect());
});
