// Review of M10 a (branch ecs/m10a-trains-halts): the trains and halts views read rows and queries through the read
// facade (`adapter.read.world()`, `read.pid`, `read.ready()`). These tests run the very reads train-view.ts and
// halts-view.ts make against a client's worlds (the mirror and the predicted clone) and compare each value for value
// with the `inspect()` field or adapter function it replaced (main's code), frame by frame over a scripted stream of
// presses (lever asks, abilities, loads) at every seed M10 b to f used, plus `deck-laid` and `ring-joined`. The views
// need three.js and the DOM, so their reads are reproduced here as written; a change to a view's read is a change to
// its function below. Modelled on test/railway-m10e-review.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRailwayAdapter, railMovement, type RailwayInspection } from '../src/adapters/railway.ts';
import {
  railServing as oldServing,
  railStopsNow,
  railTrainAsked as oldAsked,
  railTrainHeld as oldHeld,
  railOpenEnd as oldOpenEnd,
  railTrainsOf as oldTrainsOf,
} from './helpers/railway-m10a-twins.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import { buildSeedWorld, type Seed, type SeedStage } from './helpers/rail.ts';
import { line, rail, train, trains, works, type ReadWorld } from '../src/sim/railway-rows.ts';
import { railJobs, wagonSlot } from '../src/sim/railway-queries.ts';
import { line2Completed, line2Trains } from '../src/sim/railway-queries-line2.ts';
import {
  railOpenEnd,
  railServing,
  railTrainAsked,
  railTrainHeld,
  railTrainsOf,
  trainStops,
} from '../src/sim/railway-queries-trains.ts';
import { RAIL_LINES, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { LINE_HALTS, trainAlong, trainRequestable } from '../src/sim/railway-train.ts';
import type { World as EWorld } from '../src/ecs/index.ts';

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

// ---------------------------------------------------------------- the two files' reads, as written on the branch
const DIRS = [-1, 1] as const;
/** Every read train-view.ts and halts-view.ts make in a frame, at the tick `tick` (tickNow, as the views take it). */
function newReads(adapter: Adapter, tick: number) {
  const w = adapter.read.world() as ReadWorld;
  const on = line2Trains(w);
  const stops = RAIL_LINES.map((_l, k) => [...trainStops(w, k)]);
  return {
    pid: adapter.read.pid, // train-view.ts riderOf
    ready: adapter.read.ready(), // train-view.ts step
    on, // line2.trains: step, restore, targets, update, halts-view wanted/update/restore
    trainsAt: rail(w).trains, // restore's wake
    completed: line2Completed(w), // halts-view wanted, maps
    glide: rail(w).glide, // halts-view maps
    stops, // railStopsNow(s, k): halts-view refreshStops (over, signals, maps)
    // train-view step/update/restore/wagon: the rows
    rows: trains(w).map((r) => ({ ...r })),
    wagon: wagonSlot(w), // train-view wagonTrain
    works: {
      rack: works(w).rack,
      pierRack: works(w).pierRack,
      breaker: works(w).breaker,
      seams: works(w).seams,
      lit: works(w).lit,
    },
    lines: RAIL_LINES.map((_l, k) => line(w, k).req), // halts-view over, signals
    along: RAIL_TRAINS.map((t, k) => trainAlong(train(w, k), t.line, tick)), // train-view step, halts-view maps
    // train-view targets: trainRequestable over the open stops
    requestable: RAIL_TRAINS.map((t, k) => trainRequestable(train(w, k), t.line, trainStops(w, t.line), tick)),
    // train-view update: the lamps (stops shared for the frame, as the view does)
    asked: RAIL_TRAINS.map((_t, k) => railTrainAsked(w, k, tick, stops[RAIL_TRAINS[k]!.line])),
    askedAlone: RAIL_TRAINS.map((_t, k) => railTrainAsked(w, k, tick)),
    held: RAIL_TRAINS.map((_t, k) => railTrainHeld(w, k, tick)), // update and halts-view maps
    // halts-view over/signals/maps: some train of the line stands or runs so
    byLine: RAIL_LINES.map((_l, k) => railTrainsOf(w, k).map((r) => [r.phase, r.at, r.to, r.track, r.req])),
    serving: RAIL_LINES.map((_l, k) =>
      stops[k]!.flatMap((_x, stop) => DIRS.map((dir) => railServing(w, k, stop, dir, tick, stops[k]))),
    ),
    openEnd: RAIL_LINES.map((_l, k) => stops[k]!.map((_x, stop) => railOpenEnd(w, k, stop, stops[k]))),
    openEndAlone: RAIL_LINES.map((_l, k) => stops[k]!.map((_x, stop) => railOpenEnd(w, k, stop))),
  };
}
/** The same facts from the inspection and the adapter functions the two files read before the branch (main's code). */
function oldReads(s: RailwayInspection, tick: number) {
  const stops = RAIL_LINES.map((_l, k) => [...railStopsNow(s, k)]);
  return {
    pid: s.pid,
    ready: s.ready,
    on: s.line2.trains,
    trainsAt: s.line2.trainsAt,
    completed: s.line2.completed,
    glide: s.glide,
    stops,
    rows: s.trains.map((r) => ({ ...r })),
    wagon: s.trains.findIndex((r, k) => RAIL_TRAINS[k]!.line === 1 && r.wagon),
    works: {
      rack: s.works.rack,
      pierRack: s.works.pierRack,
      breaker: s.works.breaker,
      seams: s.works.seams,
      lit: s.works.kiln.lit,
    },
    lines: s.lines.map((r) => r.req),
    along: RAIL_TRAINS.map((t, k) => trainAlong(s.trains[k]!, t.line, tick)),
    requestable: RAIL_TRAINS.map((t, k) => trainRequestable(s.trains[k]!, t.line, stops[t.line]!, tick)),
    asked: RAIL_TRAINS.map((_t, k) => oldAsked(s, k, tick)),
    askedAlone: RAIL_TRAINS.map((_t, k) => oldAsked(s, k, tick)),
    held: RAIL_TRAINS.map((_t, k) => oldHeld(s, k, tick)),
    byLine: RAIL_LINES.map((_l, k) => oldTrainsOf(s, k).map(({ row: r }) => [r.phase, r.at, r.to, r.track, r.req])),
    serving: RAIL_LINES.map((_l, k) =>
      stops[k]!.flatMap((_x, stop) => DIRS.map((dir) => oldServing(s, k, stop, dir, tick))),
    ),
    openEnd: RAIL_LINES.map((_l, k) => stops[k]!.map((_x, stop) => oldOpenEnd(s, k, stop))),
    openEndAlone: RAIL_LINES.map((_l, k) => stops[k]!.map((_x, stop) => oldOpenEnd(s, k, stop))),
  };
}
const moved = new Set<string>();
const seen = new Map<string, string>();
function note(c: Client, reads: ReturnType<typeof newReads>) {
  const flat: Record<string, unknown> = {
    on: reads.on,
    completed: reads.completed,
    stops: reads.stops,
    wagon: reads.wagon,
    foot: reads.rows.map((r) => r.foot),
    phase: reads.rows.map((r) => r.phase),
    at: reads.rows.map((r) => r.at),
    asked: reads.asked,
    held: reads.held,
    lines: reads.lines,
    serving: reads.serving,
    rack: reads.works.rack,
    lit: reads.works.lit,
    requestable: reads.requestable.map((q) => !!q),
  };
  for (const [k, v] of Object.entries(flat)) {
    const key = `${c.cid}:${k}`,
      s = JSON.stringify(v);
    if (seen.has(key) && seen.get(key) !== s) moved.add(k);
    seen.set(key, s);
  }
}
let compared = 0;
/** The reads must not throw, and must equal what they replaced. */
function agree(c: Client, where: string) {
  const tick = c.adapter.tickNow(),
    s = c.adapter.inspect();
  let fresh: ReturnType<typeof newReads>;
  assert.doesNotThrow(() => (fresh = newReads(c.adapter, tick)), where);
  const old = oldReads(s, tick);
  assert.deepEqual(fresh!, old, where);
  compared++;
  note(c, fresh!);
}
const isClient = (c: Client) => {
  const w = c.adapter.read.world() as unknown as EWorld;
  assert.throws(() => railJobs(w)[0]!.run, /needs the tick/, 'a client world (the run getter throws without at)');
};

// ---------------------------------------------------------------- presses: abilities, loads and the lever asks
function press(c: Client, rand: () => number) {
  const s = c.adapter.inspect();
  const x = Math.floor(rand() * 14);
  switch (x) {
    case 0:
    case 1:
    case 2:
    case 3: {
      // A lever or bell-cord ask: any halt, either way, with or without naming the train.
      const id = Math.floor(rand() * LINE_HALTS.length);
      const dir = rand() < 0.5 ? -1 : 1;
      return c.adapter.callTrain(id, dir, rand() < 0.5 ? Math.floor(rand() * RAIL_TRAINS.length) : undefined);
    }
    case 4:
      return c.adapter.openPack();
    case 5:
      return c.adapter.pullSeaSwitch();
    case 6:
      return c.adapter.takeBoiler(s.line2.boiler.revision);
    case 7:
      return c.adapter.fitBoiler(s.line2.boiler.revision);
    case 8:
      return c.adapter.shoulderFooting(rand() < 0.5 ? 0 : 1);
    case 9:
      return c.adapter.wake();
    case 10:
      return c.adapter.chop(RAILWAY_SOURCES[Math.floor(rand() * RAILWAY_SOURCES.length)]![0], 0, false);
    case 11:
      return c.adapter.drop(T1.x + Math.floor(rand() * 600), 3000, T1.z + Math.floor(rand() * 600), 1);
    case 12:
      return c.adapter.rackTake(0);
    default:
      return c.adapter.mine(Math.floor(rand() * 3));
  }
}
const STAGES: readonly (SeedStage | 'fresh')[] = [
  'fresh',
  'awake',
  'q1-done',
  'q3-done',
  'q4-done',
  'q5-finishing',
  'glide-earned',
  'boiler',
  'trains-on',
  'q6-done',
  'works-open',
  'works-lit',
  'crossing-finishing',
  'crossing-done',
  'wagon-on',
  'deck-laid',
  'ring-joined',
];
const FRAMES = 320;
for (const stage of STAGES)
  test(
    `trains and halts reads at ${stage}: two players, ${FRAMES} frames, every press and every frame equal to inspect()`,
    { timeout: 280000 },
    () => {
      const r = room(stage === 'fresh' ? undefined : buildSeedWorld(stage));
      const a = r.join('a', 'a', 6);
      const b = r.join('b', 'b', 2);
      agree(a, `${stage}: before any state`);
      for (let k = 0; k < 60 && !a.adapter.inspect().ready; k++) r.run(1, (c) => agree(c, `${stage}: arriving`));
      r.ready();
      isClient(a);
      const rand = mulberry32(stage.length * 7919 + 41);
      let predicted = 0;
      const before = compared;
      for (let k = 0; k < FRAMES; k++) {
        for (const c of [a, b]) {
          if (press(c, rand)) predicted++;
          agree(c, `${stage}: step ${k} ${c.pid}, the press frame`);
        }
        r.run(1, (c) => agree(c, `${stage}: step ${k} ${c.pid}, frame`));
        // A restore halfway: a's connection drops and comes back (the frozen view, then the refill).
        if (k === 160) {
          a.disconnect();
          r.run(4, (c) => agree(c, `${stage}: disconnected`));
          a.reconnect();
          r.run(20, (c) => agree(c, `${stage}: refill`));
        }
      }
      assert.ok(compared - before >= FRAMES * 4, `${stage}: at least ${FRAMES} frames compared per player`);
      assert.ok(predicted > 0, `${stage}: some presses were taken`);
    },
  );

// ---------------------------------------------------------------- (2) the trains run: each leg, stand and ask is seen
test('trains-on: the trains run to and from their halts, and every read equals the inspection across those frames', () => {
  const r = room(buildSeedWorld('trains-on'));
  const a = r.join('a', 'a', 3);
  r.ready();
  let stands = 0,
    runs = 0;
  for (let k = 0; k < 900; k++) {
    if (k % 97 === 0) a.adapter.callTrain(1, 1);
    r.run(1, (c) => {
      agree(c, `trains-on frame ${k}`);
      for (const row of c.adapter.inspect().trains) {
        if (row.phase === 0) stands++;
        else runs++;
      }
    });
  }
  assert.ok(stands > 0 && runs > 0, 'trains both stood and ran');
});

// ---------------------------------------------------------------- (3) a late joiner and the second player's pid
test('a late joiner reads the trains and halts as the inspection does, every frame from its join', () => {
  const r = room(buildSeedWorld('trains-on'));
  r.join('a', 'a', 4);
  r.ready();
  r.run(10);
  const b = r.join('b', 'b', 6);
  for (let k = 0; k < 80; k++) r.run(1, (c) => agree(c, `late joiner ${c.pid} frame ${k}`));
  assert.equal(newReads(b.adapter, b.adapter.tickNow()).pid, 'b');
});

// ---------------------------------------------------------------- (4) the wagon carries footings
test('wagon-on: the footing wagon loads and unloads, and every read equals the inspection across those frames', () => {
  const r = room(buildSeedWorld('wagon-on'));
  const a = r.join('a', 'a', 3);
  r.ready();
  let loaded = 0;
  for (let k = 0; k < 1500; k++) {
    r.run(1, (c) => {
      agree(c, `wagon-on frame ${k}`);
      if (c.adapter.inspect().trains.some((row) => row.foot > 0)) loaded++;
    });
  }
  void a;
  assert.ok(loaded > 0, 'footings rode the wagon');
});

// ---------------------------------------------------------------- (5) the two views read nothing from inspect()
test("neither view calls the adapter's inspect() or its per-train functions", () => {
  for (const f of ['train-view', 'halts-view', 'halt-map', 'request-lever', 'up-platforms', 'stock-sign']) {
    const text = readFileSync(new URL(`../src/entities/railway/${f}.ts`, import.meta.url), 'utf8');
    assert.equal([...text.matchAll(/adapter\.inspect\(/g)].length, 0, `${f}.ts reads adapter.inspect()`);
    assert.equal(
      [...text.matchAll(/adapters\/railway\.ts'/g)].filter(
        (m) => !/import type/.test(text.slice(text.lastIndexOf('\n', m.index) + 1, m.index)),
      ).length,
      0,
      `${f}.ts imports a value from the adapter`,
    );
  }
});

test('coverage: the reads that moved over the scripted runs', () => {
  const expect = [
    'on',
    'completed',
    'stops',
    'foot',
    'phase',
    'at',
    'asked',
    'held',
    'lines',
    'serving',
    'requestable',
  ];
  const missing = expect.filter((k) => !moved.has(k));
  console.log(
    `moved: ${[...moved].sort().join(', ')}; never moved: ${missing.join(', ') || 'none'}; compared ${compared}`,
  );
  assert.deepEqual(missing, [], 'every read changed at least once in some run');
});
