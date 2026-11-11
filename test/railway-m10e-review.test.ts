// Review of M10 e (branch ecs/m10e-ability-views): the ability and arrival views read rows and queries through the read
// facade (`adapter.read.world()`, `read.tick()`, `read.pid`). These tests run the very reads the seven changed files
// make (ability-arrival.ts, tools.ts, glide.ts, hook-shot.ts, glide-device-view.ts, sea-gate-view.ts, back-down.ts;
// each expression below names its line) against a client's worlds, the mirror and the predicted clone, and compare
// them with the `inspect()` fields they replaced (main's code), frame by frame over scripted ability runs and a random
// action stream. The views need three.js and the DOM, so their reads are reproduced here as written; a change to a
// view's read is a change to its function below. Modelled on test/railway-m10b-review.test.ts (M10 b's review).
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
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import { buildSeedWorld, type Seed, type SeedStage } from './helpers/rail.ts';
import { account, beam, boiler, forge, piles, rail, type ReadWorld } from '../src/sim/railway-rows.ts';
import { boilerHeld, held, railJobs } from '../src/sim/railway-queries.ts';
import { railPanelCount, railPhase } from '../src/sim/railway-queries-line1.ts';
import { line2Completed, line2PackReady, line2Trains } from '../src/sim/railway-queries-line2.ts';
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

// ---------------------------------------------------------------- the seven files' reads, as written on the branch
/** Every read the branch's ability and arrival views make in a frame and in their handlers (`hand` is false: heldId()
 * is the DOM inventory and is the same call either side). `tick` is the tick ability-arrival's update takes; by
 * default read.tick() at the moment of the call, as the branch does. */
function newReads(adapter: Adapter, tick = adapter.read.tick()) {
  const w = adapter.read.world() as ReadWorld;
  const pid = adapter.read.pid;
  const ready = adapter.inspect().ready;
  const r = rail(w);
  // ability-arrival.ts:43-47 (AWAKE) and :58-64 (ABILITIES[].has)
  const phase = railPhase(w, tick, tick);
  const has = {
    jump: r.jump,
    hook: r.hook,
    glide: r.glide,
    'multi-axe': r.awake >= 0 && phase !== 'asleep' && phase !== 'waking',
    axe: r.axe,
    pack: r.pack,
    boiler: line2Trains(w),
  };
  // back-down.ts:28-49 (loadIn, total, onlyALoadIn) and :87 (plan's piles)
  const a = account(w, pid);
  const load = [a?.carry ?? 0, a?.stone ?? 0, a?.rails ?? 0];
  const done = line2Completed(w);
  return {
    pid, // ability-arrival.ts:243, glide-device-view.ts:156, tools.ts:175
    has,
    // tools.ts:205-212 (axeAvailable, packAvailable), :242 (jump device), :270 (its target), :286 (lip), :312-314
    axeAvailable: ready && !r.axe && forge(w).lit >= 0,
    packAvailable: ready && line2PackReady(w) && !r.pack,
    jumpDevice: ready && !r.jump,
    panelCount: railPanelCount(w, tick),
    // tools.ts:335 (airJump's footing), hook-shot.ts:71
    foot: !!a?.foot,
    // glide.ts:47-51 (shouldered), :132-135 (has)
    shouldered: held(w, pid) || boilerHeld(w, pid) || !!a?.foot,
    glideHas: ready && r.glide,
    // glide-device-view.ts:139, :213-221
    device: { available: done >= 5 && !r.glide, woken: done >= 5 && !r.glide, taken: r.glide },
    // sea-gate-view.ts:198
    pulled: r.sea,
    load,
    total: load.reduce((x, y) => x + y, 0),
    onlyALoad: load.reduce((x, y) => x + y, 0) > 0 && !a?.foot && beam(w).holder !== pid && boiler(w).holder !== pid,
    piles: piles(w).map((p) => [p.x, p.y, p.z, p.n, p.kind]),
  };
}
/** The same facts from the inspection the seven files read before the branch (main's code). */
function oldReads(s: RailwayInspection) {
  const load = [s.availableCarry, s.availableStone, s.availableRails];
  const l = s.line2;
  return {
    pid: s.pid,
    has: {
      jump: s.jump,
      hook: s.line2.hook,
      glide: s.glide,
      'multi-axe': s.awake >= 0 && s.phase !== 'asleep' && s.phase !== 'waking',
      axe: !!s.axe,
      pack: s.line2.pack,
      boiler: s.line2.trains,
    },
    axeAvailable: s.ready && !s.axe && (s.line2?.forge.lit ?? -1) >= 0,
    packAvailable: s.ready && s.line2.packReady && !s.line2.pack,
    jumpDevice: s.ready && !s.jump,
    panelCount: s.panelCount,
    foot: !!s.foot,
    shouldered:
      (s.beam?.state === 'held' && s.beam.holder === s.pid) ||
      (s.line2.boiler.state === 'held' && s.line2.boiler.holder === s.pid) ||
      !!s.foot,
    glideHas: s.ready && s.glide,
    device: {
      available: !!l && l.completed >= 5 && !s.glide,
      woken: !!l && l.completed >= 5 && !s.glide,
      taken: s.glide,
    },
    pulled: !!s.line2?.sea,
    load,
    total: load.reduce((x, y) => x + y, 0),
    onlyALoad:
      load.reduce((x, y) => x + y, 0) > 0 && !s.foot && s.beam?.holder !== s.pid && s.line2.boiler.holder !== s.pid,
    piles: s.piles.map((p) => [p.x, p.y, p.z, p.n, p.kind ?? 0]),
  };
}
/** What changed at least once over a run (coverage: an equal pair that never moved proves little). */
const moved = new Set<string>();
const last = new Map<string, string>();
function note(c: Client, reads: ReturnType<typeof newReads>) {
  const flat: Record<string, unknown> = {
    ...reads.has,
    axeAvailable: reads.axeAvailable,
    packAvailable: reads.packAvailable,
    jumpDevice: reads.jumpDevice,
    panelCount: reads.panelCount,
    foot: reads.foot,
    shouldered: reads.shouldered,
    glideHas: reads.glideHas,
    deviceAvailable: reads.device.available,
    pulled: reads.pulled,
    total: reads.total,
    onlyALoad: reads.onlyALoad,
    piles: reads.piles.length,
  };
  for (const [k, v] of Object.entries(flat)) {
    const key = `${c.cid}:${k}`,
      s = JSON.stringify(v);
    if (last.has(key) && last.get(key) !== s) moved.add(k);
    last.set(key, s);
  }
}
/** The reads must not throw, and must equal the inspection they replaced. */
function agree(c: Client, where: string) {
  let fresh: ReturnType<typeof newReads>;
  assert.doesNotThrow(() => (fresh = newReads(c.adapter)), where);
  assert.deepEqual(fresh!, oldReads(c.adapter.inspect()), where);
  note(c, fresh!);
}
const isClient = (c: Client) => {
  const w = c.adapter.read.world() as unknown as EWorld;
  assert.throws(() => railJobs(w)[0]!.run, /needs the tick/, 'a client world (the run getter throws without at)');
};

// ---------------------------------------------------------------- (1) scripted ability runs at the seeds that hold them
/** Each press the seven files (and their neighbours) can send, so every ability is taken and every load moves. */
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
  'works-open',
  'works-lit',
  'crossing-finishing',
  'crossing-done',
];
for (const stage of STAGES)
  test(
    `ability and arrival reads at ${stage}: two players, every press and every frame equal to inspect()`,
    {
      timeout: 240000,
    },
    () => {
      const r = room(stage === 'fresh' ? undefined : buildSeedWorld(stage));
      const a = r.join('a', 'a', 6);
      const b = r.join('b', 'b', 2);
      // Before ready: the fresh world, then arriving (the account missing for a while).
      agree(a, `${stage}: before any state`);
      for (let k = 0; k < 60 && !a.adapter.inspect().ready; k++) r.run(1, (c) => agree(c, `${stage}: arriving`));
      r.ready();
      isClient(a);
      const rand = mulberry32(stage.length * 7919 + 17);
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
  // Not a gate on its own: reports which reads were exercised through a change, not only held equal.
  const expect = [
    'jump',
    'axe',
    'hook',
    'glide',
    'pack',
    'boiler',
    'multi-axe',
    'pulled',
    'panelCount',
    'deviceAvailable',
    'foot',
    'shouldered',
    'total',
    'onlyALoad',
    'piles',
  ];
  const missing = expect.filter((k) => !moved.has(k));
  console.log(`moved: ${[...moved].sort().join(', ')}; never moved: ${missing.join(', ') || 'none'}`);
  assert.deepEqual(missing, [], 'every ability and the back load changed at least once in some run');
});

// ---------------------------------------------------------------- (2) a late joiner and the second player's pid
test('a late joiner reads its own account and the room-wide abilities, every frame from its join', () => {
  const r = room(buildSeedWorld('glide-earned'));
  const a = r.join('a', 'a', 4);
  r.ready();
  r.run(10);
  const b = r.join('b', 'b', 6);
  for (let k = 0; k < 80; k++) r.run(1, (c) => agree(c, `late joiner ${c.pid} frame ${k}`));
  assert.equal(newReads(b.adapter).has.glide, true, 'the room-wide glider reaches the late joiner');
  assert.equal(newReads(b.adapter).pid, 'b');
  void a;
});

// ---------------------------------------------------------------- (3) the tick inside one frame
// ability-arrival.ts:279 takes `adapter.read.tick()`; on this branch the facade's tick is live, while every other view
// (main's view.ts, the machine and its wake) reads inspect(), whose frame memo holds the frame's head tick. A frame
// that straddles the tick that ends the wake judges the multi-axe's AWAKE one tick ahead of the inspection: the
// late-arrival flourish and `watched` can turn a frame before the machine's own wake edge. (main's #1546 makes
// read.tick the frame's tick; rebased, this test passes.)
function wokenRoom() {
  const r = room();
  const a = r.join('a', 'a', 0);
  r.ready();
  assert.equal(a.adapter.wake(), true);
  r.run(3);
  return { r, a };
}
function edgeOf(twin: { r: ReturnType<typeof room>; a: Client }, tick: number) {
  const from = twin.r.clock.now;
  for (let ms = 0; ms < 400; ms += 0.25) {
    twin.r.clock.now = from + ms;
    if (Math.floor(twin.a.mirror.mirror.step(from + ms) / 6) > tick) return from + ms;
  }
  throw new Error('no tick boundary within 400 ms');
}
test("ability-arrival's AWAKE agrees with the inspection's phase in a frame that straddles the wake's end", () => {
  const { r, a } = wokenRoom();
  const twin = wokenRoom();
  const awake = rail(a.adapter.read.world()).awake;
  for (let f = 0; f < 400 && a.adapter.read.tick() + 1 < awake + T1.wakeTicks; f++) {
    r.run(1);
    twin.r.run(1);
  }
  assert.equal(a.adapter.read.tick() + 1, awake + T1.wakeTicks);
  r.clock.now = edgeOf(twin, a.adapter.read.tick()) - 1;
  a.adapter.update(r.clock.now);
  // The frame's head: the machine view and the others read inspect() here.
  const head = oldReads(a.adapter.inspect()).has['multi-axe'];
  assert.equal(head, false, 'still waking at the head of the frame');
  // 2 ms later in the same frame, ability-arrival's update runs.
  r.clock.now += 2;
  assert.equal(newReads(a.adapter).has['multi-axe'], head, 'one phase per frame, as the inspection');
});

// ---------------------------------------------------------------- (4) cost: the branch's per-frame reads vs inspect()
test('cost of the ability and arrival reads per frame (a guide, not a gate)', () => {
  const r = room(buildSeedWorld('q5-finishing'));
  const a = r.join('a', 'a', 0);
  r.ready();
  r.run(10);
  const N = 2000;
  let t0 = performance.now();
  for (let i = 0; i < N; i++) newReads(a.adapter);
  const branch = ((performance.now() - t0) / N) * 1000;
  t0 = performance.now();
  for (let i = 0; i < N; i++) oldReads(a.adapter.inspect());
  const main = ((performance.now() - t0) / N) * 1000;
  // ability-arrival alone: two `has` passes a frame (the missing loop and the late find), railPhase in each.
  const w = a.adapter.read.world(),
    tick = a.adapter.read.tick();
  t0 = performance.now();
  for (let i = 0; i < N; i++) railPhase(w, tick, tick);
  const phase = ((performance.now() - t0) / N) * 1000;
  console.log(
    `per frame: branch reads ${branch.toFixed(1)} us, main's inspect reads ${main.toFixed(1)} us; railPhase ${phase.toFixed(2)} us`,
  );
});

test('cost breakdown of the facade reads (a guide)', () => {
  const r = room(buildSeedWorld('q5-finishing'));
  const a = r.join('a', 'a', 0);
  r.ready();
  r.run(10);
  const N = 5000;
  const time = (name: string, fn: () => unknown) => {
    const t0 = performance.now();
    for (let i = 0; i < N; i++) fn();
    return `${name} ${(((performance.now() - t0) / N) * 1000).toFixed(2)} us`;
  };
  const w = a.adapter.read.world(),
    tick = a.adapter.read.tick();
  console.log(
    [
      time('read.world()', () => a.adapter.read.world()),
      time('read.tick()', () => a.adapter.read.tick()),
      time('inspect()', () => a.adapter.inspect()),
      time('rail(w)', () => rail(w)),
      time('account(w,pid)', () => account(w, 'a')),
      time('railPhase', () => railPhase(w, tick, tick)),
      time('railPanelCount', () => railPanelCount(w, tick)),
      time('line2Completed', () => line2Completed(w)),
      time('line2Trains', () => line2Trains(w)),
      time('piles(w)', () => piles(w)),
      // ability-arrival's update as written: one look, the has loop, the late find, row.jump/glide
      time('ability-arrival update reads', () => {
        const look = { w: a.adapter.read.world(), tick: a.adapter.read.tick() };
        const r0 = rail(look.w);
        for (let k = 0; k < 2; k++) {
          const ph = railPhase(look.w, look.tick, look.tick);
          void [
            rail(look.w).jump,
            rail(look.w).hook,
            rail(look.w).glide,
            rail(look.w).awake >= 0 && ph,
            rail(look.w).axe,
            rail(look.w).pack,
            line2Trains(look.w),
          ];
        }
        return r0.jump && r0.glide;
      }),
    ].join('; '),
  );
});
