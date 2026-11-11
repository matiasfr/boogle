// Review of ECS migration M1 (the frame memo in inspect()): reads that the memo leaves stale. Harness copied from
// test/railway-adapter.test.ts. Original header: the railway adapter on the replicated mirror (replication R1a, R1b): readiness, acks and refusals, predicted own
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
} from '../src/adapters/railway.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { homeLand } from './helpers/land.ts';

const MOVEMENT = {
  ...railMovement({ get: (k) => specOf(k)!.def }),
  beamSoloSpeed: 2,
  beamHelpSpeed: 5,
  jumpImpulse: 6,
  jumpTurn: 1,
  jumpSteer: 25,
  jumpApexSpeed: 1,
};

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
function world({
  reach = () => true,
  movement = () => MOVEMENT,
}: { reach?: (pid: string) => boolean; movement?: () => typeof MOVEMENT } = {}) {
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
      movement,
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

// dispose() makes available() false (it checks !disposed), but no keyed field of the frame memo moves: with nothing
// pending, the same frame keeps returning ready: true. Before M1 every call re-ran available() and showed false.
test('M1 review: a disposed adapter does not stay ready inside the frame it was disposed in', () => {
  const w = world();
  const a = w.join('a', 'alice');
  w.ready();
  w.quiet(5);
  const before = a.adapter.inspect();
  assert.equal(before.ready, true);
  assert.equal(before.pending, 0);
  a.adapter.dispose();
  assert.equal(a.adapter.inspect().ready, false, 'ready after dispose');
});

// update() returns before moving `frame` once disposed, so the memo never expires: still ready frames later.
test('M1 review: a disposed adapter does not stay ready in later frames', () => {
  const w = world();
  const a = w.join('a', 'alice');
  w.ready();
  w.quiet(5);
  assert.equal(a.adapter.inspect().ready, true);
  a.adapter.dispose();
  w.run(30);
  assert.equal(a.adapter.inspect().ready, false, 'ready 30 frames after dispose');
});
