// Review of M10 f (branch ecs/m10f-outside-readers): the readers outside the railway folder read rows and queries
// through the read facade. The only files that read the adapter's inspection were src/entities/town/view.ts (through
// town/index.ts) and src/entities/finds/secrets-view.ts; wardrobe, ring-island, water-render, frozen-sky and
// debug/dev/inspect.ts never read it (their `inspect()` is their own). These tests run the very reads those files make
// (src/entities/town/town-read.ts's reader, and secrets-view's `glider` and `passed`, reproduced here as written) against
// a client's worlds and compare them with the `inspect()` fields they replaced (main's code), frame by frame, with two
// players on different lags, predicted presses, a disconnect and refill and a late joiner. Modelled on
// test/railway-m10e-review.test.ts.
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
import { pierLaid } from '../src/sim/railway-line2-layout.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { townReadOf } from '../src/sim/town-facts.ts';
import { homeLand } from './helpers/land.ts';
import { buildSeedWorld, type SeedStage } from './helpers/rail.ts';
import type { Seed } from './helpers/rail.ts';
import { rail, type ReadWorld } from '../src/sim/railway-rows.ts';
import { line2Completed, line2Trains } from '../src/sim/railway-queries-line2.ts';
import { createTownReader, type TownLook } from '../src/entities/town/town-read.ts';

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

// ---------------------------------------------------------------- the files' reads, as written on the branch
/** secrets-view.ts `glider` and `passed`, for each kind of secret it tells apart. */
function secretsNew(adapter: Adapter) {
  const f = adapter.read;
  const glider = !!f && rail(f.world()).glide;
  const passed = (how: 'glide' | 'jump' | null, after: 'hook' | 'glide' | 'trains') => {
    if (!f.ready()) return false;
    const w = f.world(),
      row = rail(w);
    const ended = pierLaid(line2Completed(w));
    if (how === 'glide') return ended;
    if (how === 'jump') return row.jump && ended;
    if (after === 'hook') return row.hook;
    if (after === 'glide') return row.glide;
    return line2Trains(w);
  };
  return {
    glider,
    glide: passed('glide', 'trains'),
    jump: passed('jump', 'trains'),
    hook: passed(null, 'hook'),
    afterGlide: passed(null, 'glide'),
    trains: passed(null, 'trains'),
  };
}
/** The same from the inspection main's secrets-view read (`railwayRead()`). */
function secretsOld(r: RailwayInspection) {
  const passed = (how: 'glide' | 'jump' | null, after: 'hook' | 'glide' | 'trains') => {
    if (!r.ready) return false;
    const ended = pierLaid(r.line2.completed);
    if (how === 'glide') return ended;
    if (how === 'jump') return r.jump && ended;
    if (after === 'hook') return r.line2.hook;
    if (after === 'glide') return r.glide;
    return r.line2.trains;
  };
  return {
    glider: !!r.glide,
    glide: passed('glide', 'trains'),
    jump: passed('jump', 'trains'),
    hook: passed(null, 'hook'),
    afterGlide: passed(null, 'glide'),
    trains: passed(null, 'trains'),
  };
}
/** town/view.ts's reads of the inspection (main's code): the facts, the score, the breaker, the phase, the stretches. */
function townOld(r: RailwayInspection): TownLook {
  return {
    facts: townReadOf(r),
    score: r.counts.score,
    breaker: r.works.breaker,
    phase: r.phase,
    line1: r.stations.map((s) => s.completion),
    line2: r.line2.stations.map((s) => s.completion),
  };
}
/** One reader per client, as the town view holds one. */
const byAdapter = new WeakMap<Adapter, ReturnType<typeof createTownReader>>();
const townReader = (c: Client) => {
  let t = byAdapter.get(c.adapter);
  if (!t) byAdapter.set(c.adapter, (t = createTownReader(() => c.adapter.read)));
  return t;
};

const moved = new Set<string>();
const last = new Map<string, string>();
function note(c: Client, look: TownLook, sec: ReturnType<typeof secretsNew>) {
  const flat: Record<string, unknown> = {
    ...look.facts,
    score: look.score,
    breaker: look.breaker,
    phase: look.phase,
    line1: look.line1,
    line2: look.line2,
    ...sec,
  };
  for (const [k, v] of Object.entries(flat)) {
    const key = `${c.cid}:${k}`,
      s = JSON.stringify(v);
    if (last.has(key) && last.get(key) !== s) moved.add(k);
    last.set(key, s);
  }
}
/** The reads must not throw, and must equal the inspection they replaced; three asks in a frame build once. */
function agree(c: Client, where: string) {
  const reader = townReader(c);
  const before = reader.stats.builds;
  const insp = c.adapter.inspect();
  let look: TownLook | null = null;
  assert.doesNotThrow(() => (look = reader.look()), where);
  assert.deepEqual(look, townOld(insp), `${where}: the town's look`);
  const sec = secretsNew(c.adapter);
  assert.deepEqual(sec, secretsOld(insp), `${where}: the finds' reads`);
  // The tick is held for the frame: asking again changes nothing and builds nothing.
  assert.deepEqual(reader.look(), reader.look(), where);
  assert.ok(reader.stats.builds - before <= 1, `${where}: at most one build for the frame's asks`);
  assert.equal(c.adapter.read.pid, insp.pid, `${where}: pid`);
  note(c, look!, sec);
}
const isClient = (c: Client) => {
  const w = c.adapter.read.world() as unknown as { each: unknown };
  assert.ok(w, 'a client world');
};

// ---------------------------------------------------------------- (1) runs at the seeds
function press(c: Client, rand: () => number) {
  const s = c.adapter.inspect();
  const x = Math.floor(rand() * 16);
  switch (x) {
    case 0:
      return c.adapter.claimJump();
    case 1:
      return c.adapter.openAxe();
    case 2:
      return c.adapter.openPack();
    case 3:
      return c.adapter.claimHook();
    case 4:
      return c.adapter.claimGlide();
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
    case 12: {
      const p = s.piles[0];
      return p ? c.adapter.take(p.id) : false;
    }
    case 13:
      return c.adapter.rackTake(0);
    case 14:
      return c.adapter.beamTake(s.beam.revision);
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
];
for (const stage of STAGES)
  test(
    `outside reads at ${stage}: two players, every press and every frame equal to inspect()`,
    { timeout: 240000 },
    () => {
      const r = room(stage === 'fresh' ? undefined : buildSeedWorld(stage));
      const a = r.join('a', 'a', 6);
      const b = r.join('b', 'b', 2);
      // Before ready: the fresh world, then arriving (the account missing for a while).
      agree(a, `${stage}: before any state`);
      for (let k = 0; k < 60 && !a.adapter.inspect().ready; k++) r.run(1, (c) => agree(c, `${stage}: arriving`));
      r.ready();
      isClient(a);
      const rand = mulberry32(stage.length * 7919 + 29);
      let predicted = 0;
      for (let k = 0; k < 240; k++) {
        for (const c of [a, b]) {
          if (press(c, rand)) predicted++;
          agree(c, `${stage}: step ${k} ${c.pid}, the press frame`);
        }
        r.run(1, (c) => agree(c, `${stage}: step ${k} ${c.pid}, frame`));
        // A restore halfway: a's connection drops and comes back (the frozen view, then the refill).
        if (k === 120) {
          a.disconnect();
          r.run(4, (c) => agree(c, `${stage}: disconnected`));
          a.reconnect();
          r.run(20, (c) => agree(c, `${stage}: refill`));
        }
      }
      assert.ok(predicted > 0, `${stage}: some presses were taken`);
    },
  );

test('coverage: the fields that moved over the scripted runs', () => {
  const expect = [
    'path',
    'forge',
    'completed',
    'trains',
    'score',
    'breaker',
    'phase',
    'line1',
    'line2',
    'glider',
    'hook',
    'jump',
  ];
  const missing = expect.filter((k) => !moved.has(k));
  console.log(`moved: ${[...moved].sort().join(', ')}; never moved: ${missing.join(', ') || 'none'}`);
  assert.deepEqual(missing, [], 'every read changed at least once in some run');
});

// ---------------------------------------------------------------- (2) a late joiner and the second player
test('a late joiner reads the room-wide facts, every frame from its join', () => {
  const r = room(buildSeedWorld('trains-on'));
  r.join('a', 'a', 4);
  r.ready();
  r.run(10);
  const b = r.join('b', 'b', 6);
  for (let k = 0; k < 80; k++) r.run(1, (c) => agree(c, `late joiner ${c.pid} frame ${k}`));
  assert.equal(townReader(b).look()!.facts.trains, true, 'the late joiner sees the trains');
});

// ---------------------------------------------------------------- (3) one tick per frame, one build per frame
test('the look is built once for a frame however often it is asked, and again for the next tick or a press', () => {
  const r = room(buildSeedWorld('q5-finishing'));
  const a = r.join('a', 'a', 0);
  r.ready();
  r.run(5);
  const t = townReader(a);
  const n0 = t.stats.builds;
  const first = t.look();
  for (let i = 0; i < 20; i++) assert.deepEqual(t.look(), first);
  assert.equal(t.stats.builds - n0, 1, 'twenty asks in a frame: one build');
  // A predicted press makes a new world: the look follows it at once.
  const before = t.look()!;
  let took = false;
  for (let k = 0; k < 40 && !took; k++)
    took = a.adapter.chop(RAILWAY_SOURCES[k % RAILWAY_SOURCES.length]![0], 0, false);
  assert.deepEqual(t.look(), townOld(a.adapter.inspect()));
  void before;
});

// ---------------------------------------------------------------- (4) cost (a guide, not a gate)
test('cost of the town look per frame against inspect() (a guide)', () => {
  const r = room(buildSeedWorld('q5-finishing'));
  const a = r.join('a', 'a', 0);
  r.ready();
  r.run(10);
  const N = 2000;
  const t = townReader(a);
  let t0 = performance.now();
  for (let i = 0; i < N; i++) t.look();
  const held = ((performance.now() - t0) / N) * 1000;
  const w = a.adapter.read.world() as ReadWorld,
    tick = a.adapter.read.tick();
  t0 = performance.now();
  for (let i = 0; i < N; i++) createTownReader(() => ({ ...a.adapter.read, world: () => w, tick: () => tick })).look();
  const cold = ((performance.now() - t0) / N) * 1000;
  t0 = performance.now();
  for (let i = 0; i < N; i++) townOld(a.adapter.inspect());
  const main = ((performance.now() - t0) / N) * 1000;
  console.log(
    `per ask: held ${held.toFixed(2)} us, a fresh build ${cold.toFixed(1)} us, main's inspect reads ${main.toFixed(2)} us`,
  );
});
