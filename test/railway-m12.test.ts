// Proof of M12 (docs/plans/ecs-migration-railway.md, M12): the client's read chain moved off the `Railway` read model
// (the predictor and the mirror on worlds, the adapter's own reads on rows) and nothing a view, a press or an effect
// sees changed. The oracle is a trace recorded on main before the change (test/fixtures/railway-m12-trace.json, made
// with M12_RECORD=1 on the commit that adds this file, and never re-recorded after it): for every client, every frame,
// what the read facade gives (the world's hash and next id, the tick, the live tick, ready, pending, stalled, status),
// the whole `inspect()` (bar its read-path counters), and every accepted, corrected, remap and reset event the
// adapter plays. Scripted runs at every seed the M10 groups used, with two lagged players pressing every op the
// adapter sends, a disconnect and refill, and a late joiner; a predicted press read before the server answers.
// The value is the trace's FNV hash per client, with a checkpoint every 25 frames so a difference can be found.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRailwayAdapter, railMovement } from '../src/adapters/railway.ts';
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
import { LINE_HALTS } from '../src/sim/railway-train.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import { buildSeedWorld, type Seed, type SeedStage } from './helpers/rail.ts';
import { beam, boiler, shed, type ReadWorld } from '../src/sim/railway-rows.ts';
import { Pile } from '../src/sim/railway-components.ts';
import type { World } from '../src/ecs/index.ts';

type Adapter = ReturnType<typeof createRailwayAdapter>;
const MOVEMENT = railMovement({ get: (k) => specOf(k)!.def });
const FIXTURE = new URL('./fixtures/railway-m12-trace.json', import.meta.url);
const RECORD = process.env.M12_RECORD === '1';

// ---------------------------------------------------------------- the trace
const fnv = (h: number, text: string) => {
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
// The read-path counters count cache hits and rebuilds: how the adapter reads, not what it shows.
const skip = (k: string, v: unknown) => (k === 'reads' ? undefined : v);
type Trace = { h: number; frames: number; marks: number[] };
const traces = new Map<string, Trace>();
/** What the runs exercised (the coverage test). */
const seen = new Set<string>();
function traceOf(name: string) {
  let t = traces.get(name);
  if (!t) traces.set(name, (t = { h: 2166136261, frames: 0, marks: [] }));
  return t;
}
function add(name: string, text: string) {
  const t = traceOf(name);
  t.h = fnv(t.h, text);
}
/** One frame of what a client's views can see. */
function frame(name: string, adapter: Adapter) {
  const rd = adapter.read;
  const w = rd.world() as unknown as World;
  add(
    name,
    JSON.stringify([
      w.hash(),
      w.nextId(),
      rd.tick(),
      rd.tickNow(),
      rd.ready(),
      rd.pending(),
      rd.stalled(),
      rd.status(),
    ]),
  );
  add(name, JSON.stringify(adapter.inspect(), skip));
  const t = traceOf(name);
  if (++t.frames % 25 === 0) t.marks.push(t.h);
}

// ---------------------------------------------------------------- a room and its clients (as M10 c's proof)
type Client = { cid: string; pid: string; adapter: Adapter; name: string } & {
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
  function join(cid: string, pid: string, delay: number, name: string) {
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
    adapter.onAccepted(
      (e) => (seen.add(`accepted ${e.predicted ? 'predicted' : 'confirmed'}`), add(name, `A${JSON.stringify(e)}`)),
    );
    adapter.onCorrected((c) => (seen.add(`corrected ${c.reason}`), add(name, `C${JSON.stringify(c)}`)));
    adapter.onRemap((r, id) => (seen.add('remap'), add(name, `M${r}:${id}`)));
    adapter.onReset((soft) => (seen.add(`reset ${soft ? 'soft' : 'hard'}`), add(name, `R${soft}`)));
    const c: Client = {
      cid,
      pid,
      adapter,
      name,
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
  /** One server step, then each client's frame: its update and a trace of what it shows. */
  function run(n = 1) {
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
        frame(c.name, c.adapter);
      }
    }
  }
  const ready = () => {
    for (let k = 0; k < 300 && ![...clients.values()].every((c) => c.adapter.read.ready()); k++) run();
  };
  return { join, run, ready };
}

// ---------------------------------------------------------------- every op the adapter sends
function press(c: Client, rand: () => number): boolean {
  const w = c.adapter.read.world() as ReadWorld;
  const a = c.adapter;
  const x = Math.floor(rand() * 36);
  // Drops land on a small grid, so piles merge and two players contest the same pile.
  const spec = LINE2_STATIONS[Math.floor(rand() * LINE2_STATIONS.length)]!;
  const r3 = Math.floor(rand() * 3) as 0 | 1 | 2;
  switch (x) {
    case 0:
      return a.forgeTake();
    case 1:
      return a.depotTake();
    case 2:
      return a.depotRailTake();
    case 3:
      return a.depositLine2('F', 1, 0);
    case 4:
      return a.depositLine2(spec.id, 1 + r3, 0);
    case 5:
      return a.depositLine2(spec.id, 1, 2);
    case 6:
      return a.pullLever();
    case 7:
      return a.pullSeaSwitch();
    case 8:
      return a.claimHook();
    case 9:
      return a.claimGlide();
    case 10:
      return a.takeBoiler(boiler(w).revision);
    case 11:
      return a.fitBoiler(boiler(w).revision);
    case 12:
      return a.dropBoiler(T1.x + 100, 3000, T1.z + 100, boiler(w).revision);
    case 13:
    case 14:
    case 15:
      return a.chop(RAILWAY_SOURCES[Math.floor(rand() * RAILWAY_SOURCES.length)]![0], 0, false);
    case 16:
      return a.mine(Math.floor(rand() * 5));
    case 17:
      return a.drop(T1.x + 100 * Math.floor(rand() * 3), 3000, T1.z + 100 * Math.floor(rand() * 3), 1 + r3, r3);
    case 18:
    case 19: {
      const ids: number[] = [];
      w.each([Pile], (id) => void ids.push(id));
      const id = ids[Math.floor(rand() * Math.max(1, ids.length))];
      return id !== undefined ? a.take(id) : false;
    }
    case 20:
      return a.beamTake(beam(w).revision);
    case 21:
      return a.beamDrop(T1.x + 200, 3000, T1.z + 200, beam(w).revision);
    case 22:
      return a.beamDeposit(beam(w).revision);
    case 23:
      return a.rackTake((r3 & 1) as 0 | 1);
    case 24:
    case 25:
      return a.deposit(1 + r3, (r3 & 1) as 0 | 1);
    case 26:
      return a.wake();
    case 27:
      return a.beamChop();
    case 28:
      return a.fillKiln();
    case 29:
      return a.shoulderFooting(r3);
    case 30:
      return a.setFooting(Math.floor(rand() * 4) as 0 | 1 | 2 | 3);
    case 31:
      return a.fitCradle();
    case 32:
      return a.strike(r3);
    case 33: {
      const h = Math.floor(rand() * LINE_HALTS.length);
      return a.callTrain(h, rand() < 0.5 ? -1 : 1, rand() < 0.3 ? Math.floor(rand() * 4) : undefined);
    }
    case 34:
      return rand() < 0.5 ? a.takeBreaker() : a.openPack();
    default:
      return rand() < 0.5 ? a.turnTable((r3 & 1) as 0 | 1, shed(w).tableRev) : a.braceLeaf();
  }
}

const STAGES: readonly (SeedStage | 'fresh')[] = [
  'fresh',
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
const FRAMES = 240;
const recorded: Record<string, Trace> = RECORD ? {} : JSON.parse(readFileSync(FIXTURE, 'utf8'));
function settle(name: string) {
  const t = traceOf(name);
  if (RECORD) recorded[name] = t;
  else {
    const want = recorded[name];
    assert.ok(want, `${name}: recorded on main`);
    const at = want.marks.findIndex((m, k) => t.marks[k] !== m);
    assert.equal(at, -1, `${name}: the trace first differs before frame ${(at + 1) * 25}`);
    assert.equal(t.frames, want.frames, `${name}: frames`);
    assert.equal(t.h, want.h, `${name}: the whole trace`);
  }
}

for (const stage of STAGES)
  test(`M12 at ${stage}: two players, a disconnect and refill and a late joiner see what main showed`, () => {
    const r = room(stage === 'fresh' ? undefined : buildSeedWorld(stage));
    const a = r.join('a', 'a', 6, `${stage}/a`);
    const b = r.join('b', 'b', 2, `${stage}/b`);
    frame(a.name, a.adapter);
    r.ready();
    const rand = mulberry32(stage.length * 7919 + 17);
    let late: Client | null = null;
    for (let k = 0; k < FRAMES; k++) {
      for (const c of late ? [a, b, late] : [a, b]) {
        add(c.name, `P${press(c, rand)}`);
        frame(c.name, c.adapter);
      }
      r.run(1);
      if (k === 100) {
        a.disconnect();
        r.run(4);
        a.reconnect();
        r.run(20);
      }
      if (k === 160) late = r.join('c', 'c', 4, `${stage}/c`);
    }
    for (const c of [a, b, late!]) settle(c.name);
  });

test('M12: a predicted press shows in the reads before the server answers', () => {
  const r = room(buildSeedWorld('q3-stocked'));
  const a = r.join('a', 'a', 12, 'press/a');
  r.ready();
  const before = a.adapter.read.world();
  let pressed = false;
  for (const source of RAILWAY_SOURCES) if ((pressed = a.adapter.chop(source[0], 0, false))) break;
  assert.ok(pressed, 'a chop was taken');
  assert.equal(a.adapter.read.pending(), 1, 'the server has not answered');
  assert.notEqual(a.adapter.read.world(), before, 'the views read the predicted world');
  frame(a.name, a.adapter);
  r.run(30);
  assert.equal(a.adapter.read.pending(), 0, 'answered');
  settle(a.name);
});

test('M12 coverage: the runs predicted, confirmed, corrected, remapped and reset', () => {
  console.log(`seen: ${[...seen].sort().join(', ')}`);
  for (const k of [
    'accepted predicted',
    'accepted confirmed',
    'corrected contested',
    'corrected refused',
    'remap',
    'reset hard',
    'reset soft',
  ])
    assert.ok(seen.has(k), k);
});

test('M12: the trace file', () => {
  if (RECORD) writeFileSync(FIXTURE, `${JSON.stringify(recorded, null, 0)}\n`);
  assert.ok(Object.keys(recorded).length >= STAGES.length * 3 + 1);
});
