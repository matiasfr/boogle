// The paused world (docs/decisions.md, "2026-11-06, economy principles amended"): an empty railway room stops
// simulating after a short grace, and the next join applies one away credit (src/sim/railway-away.ts) to the forge
// rack and the depot cart, finishes the funded job, and catches up regrowth and drop recovery.
import test, { type TestContext } from 'node:test';
import { WebSocket } from './helpers/accounts.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createService, loadConfig } from './helpers/accounts.ts';
import type { World } from '../../src/ecs/index.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { line2Active, railCounts } from '../../src/sim/railway-queries-line2.ts';
import { LINE2_FORGE, LINE2_STATIONS } from '../../src/sim/railway-line2-layout.ts';
import { RAIL_AWAY } from '../../src/sim/railway-away.ts';
import { till, yards as yardRows } from '../../src/sim/railway-rows.ts';
import { plotBuilt, sackCap } from '../../src/sim/railway-queries-trade.ts';
import { TRADE, TRADE_PCT } from '../../src/sim/railway-trade-layout.ts';
import { HALL, TILL } from '../../src/place/home-station.ts';
import { STEEL } from '../../src/sim/railway-ring-layout.ts';
import {
  account,
  act,
  advance,
  apply,
  buildSeedWorld,
  cart,
  createRailway,
  forge,
  invariant,
  job,
  jobRun,
  logs,
  piles,
  rail,
  railClock,
  steel,
  railSession,
  railwayAtQ2,
  railwayAtQ4,
  trees,
  type Seed,
} from '../../test/helpers/rail.ts';

const START = 1800000000000;
const HOUR = 3600000;

async function fixture(name: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-railway-away-'));
  const store = createStore({ dataDir: dir, maxRooms: 10 });
  await store.init();
  const clock = { now: START };
  const roomId = railwayRoomId(name);
  const create = () =>
    createRailwayWorldHost({
      roomId,
      store,
      tick: false,
      saveMs: 1000000000,
      now: () => clock.now,
      pidOf: (sid) => sid,
      awake: false, // as a hosted room: the first join wakes it
    });
  let host = create();
  await host.whenReady();
  return {
    clock,
    get host() {
      return host;
    },
    /** The room's world, read again at every use: a restart replaces it. */
    get w() {
      return host.rules.railway.world();
    },
    /** Rule ticks on the host's clock, 100 ms of wall time each. */
    async ticks(n: number) {
      for (let k = 0; k < n; k++) {
        clock.now += 100;
        host.step(0.1);
      }
      await host.sync.whenDurable();
    },
    /** A played railway (built with sim ops) becomes the room's state, at the room's own tick. */
    async adopt(w: Seed) {
      while (host.sync.world.tick < w.t) {
        clock.now += 100;
        host.step(0.1);
      }
      host.rules.railway.world().load(JSON.parse(JSON.stringify(w.w.snapshot())), railwayCheck);
      host.rules.railway.touchAll();
      host.sync.saveNow(true);
      await host.sync.whenDurable();
    },
    /** A crash or deploy: the room loads its save after downMs. */
    async restart(downMs: number) {
      await host.close({ save: true });
      clock.now += downMs;
      host = create();
      await host.whenReady();
    },
    async close() {
      try {
        await host.close({ save: false });
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    },
  };
}
/** The crate yards' rows (slice 5). */
const cratesOf = (w: World) => yardRows(w).map((y) => ({ stock: y.stock, made: y.made }));
// The production counters and the credit's marker: what an away credit changes.
const yards = (w: World) => ({
  rack: forge(w).rack,
  poured: forge(w).poured,
  depot: rail(w).depot,
  marker: railClock(w).resumeMarker,
});

test('a paused room stands still, and the next join applies one capped credit to the forge and depot', async () => {
  const f = await fixture('away-yards');
  try {
    f.host.wake();
    const w = railwayAtQ2();
    // Room in the yards: both players drop what they carry and take rails from the forge's rack.
    for (const pid of ['a', 'b']) {
      const a = account(w.w, pid)!;
      for (const kind of [0, 1, 2] as const) {
        const n = [a.carry, a.stone, a.rails][kind]!;
        if (n) act(w, pid, 'rail.drop', { x: 95000 + kind * 100, y: 2000, z: 3000, n, kind });
      }
      act(w, pid, 'rail.forgeTake');
    }
    await f.adopt(w);
    assert.equal(line2Active(f.w), 1, 'Q2 takes materials: the depot cart runs');
    await f.ticks(1); // the supply pulse stamps its minute
    const total = railCounts(f.w).total - railCounts(f.w).produced;
    const depleted = trees(f.w).flatMap((t, k) => (t.left === 0 && t.age < 31 ? [k] : []));
    assert.ok(depleted.length > 0, 'chopped trees are waiting to regrow');
    f.host.pause();
    assert.equal(f.host.paused(), true);
    const tick = f.host.sync.world.tick;
    const paused = yards(f.w);
    assert.ok(paused.rack < LINE2_FORGE.rackMax && paused.depot < LINE2_STATIONS[1]!.bill[0], 'the yards have room');
    await f.ticks(600); // a minute of wall time with nobody here: nothing moves
    assert.equal(f.host.sync.world.tick, tick, 'an empty room does not tick');
    assert.deepEqual(yards(f.w), paused, 'nor produce');

    // Eight hours away: one credit of ~1 h 58 min, capped by the rack (24) and Q2's need (its bill).
    f.clock.now += 8 * HOUR;
    f.host.wake();
    assert.equal(f.host.paused(), false);
    assert.equal(forge(f.w).rack, LINE2_FORGE.rackMax, 'the forge rack is full, never past it');
    assert.equal(forge(f.w).poured, paused.poured + LINE2_FORGE.rackMax - paused.rack, 'credited rails are counted');
    assert.equal(rail(f.w).depot, LINE2_STATIONS[1]!.bill[0], 'the cart brings what Q2 needs, no more');
    assert.equal(railCounts(f.w).total - railCounts(f.w).produced, total, 'every log stays counted');
    assert.ok(railClock(f.w).resumeMarker > paused.marker, 'one credit consumed');
    // The supply pulse caught up on the join: eight hours of regrowth waits, and every drop aged to recovery.
    assert.equal(railClock(f.w).supplyMarker, Math.floor(f.clock.now / 60000));
    for (const k of depleted) assert.ok(trees(f.w)[k]!.age >= 31, `tree ${k} waited out its regrowth`);
    assert.ok(piles(f.w).length > 0 && piles(f.w).every((p) => p.age === 21), 'drops are due for recovery');
    assert.equal(invariant(f.w), null);
    const once = yards(f.w);
    f.host.wake(); // already awake: no second credit
    assert.deepEqual(yards(f.w), once);
  } finally {
    await f.close();
  }
});

test("the away credit runs Q4's cart: its shelf rails come off the forge rack, never minted", async () => {
  const f = await fixture('away-shelf');
  try {
    f.host.wake();
    await f.adopt(railwayAtQ4());
    assert.equal(line2Active(f.w), 3, 'Q4 is next, behind the gate');
    f.host.pause();
    // Q2's first load is still on its way (the helper fills Q2 and Q3 by hand faster than a trip): it lands too.
    const aboard = cart(f.w).logs;
    const before = { ...railCounts(f.w).rails!, depot: rail(f.w).depot, shelf: rail(f.w).depotRails };
    f.clock.now += 8 * HOUR;
    f.host.wake();
    const q4 = LINE2_STATIONS[3]!;
    assert.equal(rail(f.w).depot, Math.max(q4.bill[0], before.depot + aboard), "the cart brought Q4's logs");
    assert.equal(cart(f.w).logs + cart(f.w).rails, 0, 'and is home, empty');
    assert.equal(rail(f.w).depotRails, q4.bill[1], 'and its rails, to the shelf');
    const after = railCounts(f.w).rails!;
    assert.equal(after.total, after.poured, 'every rail on the shelf was poured by the forge');
    assert.equal(after.shelf, before.shelf + q4.bill[1]);
    assert.equal(after.forge, before.forge + (after.poured - before.poured) - q4.bill[1], 'moved off the forge rack');
    assert.equal(invariant(f.w), null);
  } finally {
    await f.close();
  }
});

test('a join after N hours finishes the funded job once; a rejoin before the room paused credits nothing', async () => {
  const f = await fixture('away-job');
  try {
    f.host.wake();
    const w: Seed = { w: createRailway(), t: 40 };
    for (const pid of ['a', 'b']) railSession(w.w, pid, 1);
    apply(w.w, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
    logs(w, 'a', 'T1', 24);
    advance(w, 30);
    await f.adopt(w);
    const t1 = () => ({ ...job(f.w, 0), elapsed: jobRun(f.w, 0).elapsed }); // T1's job is slot 0, read again each time
    assert.ok(t1().start >= 0 && !t1().completion, 'T1 is funded and laying');
    const total = railCounts(f.w).total;

    // Nobody paused it (a rejoin within the grace): time passes only as ticks, and no credit is taken.
    const marker = railClock(f.w).resumeMarker;
    f.host.wake();
    assert.equal(railClock(f.w).resumeMarker, marker, 'no credit while the room never paused');

    // A short pause (a rejoin a few seconds after the grace ended) only advances the job by the time away.
    f.host.pause();
    const elapsed = t1().elapsed;
    f.clock.now += 5000;
    f.host.wake();
    assert.equal(t1().elapsed, elapsed + 50, 'five seconds away, fifty ticks');
    assert.equal(t1().completion, 0);

    assert.equal(RAIL_AWAY.finishTicks * 100, RAIL_AWAY.pauseMs, 'one pause grace away finishes the funded job');
    // Three hours away: the funded job finishes, once; nothing new is funded.
    f.host.pause();
    f.clock.now += 3 * HOUR;
    f.host.wake();
    assert.equal(t1().completion, 1, 'the funded job finished');
    assert.equal(job(f.w, 1).start, -1, 'the next stretch is not funded');
    assert.equal(railCounts(f.w).total, total, 'every log stays counted');
    assert.equal(invariant(f.w), null);
  } finally {
    await f.close();
  }
});

test('a restart after hours away credits once on the join that wakes it, and a second restart credits nothing more', async () => {
  const f = await fixture('away-restart');
  try {
    f.host.wake();
    await f.adopt(railwayAtQ2());
    await f.ticks(LINE2_FORGE.pourTicks * 30);
    // Leave, pause, crash-free close; the server is down 1 h, then the room loads with nobody in it.
    f.host.pause();
    const marker = railClock(f.w).resumeMarker;
    await f.restart(HOUR);
    assert.equal(f.host.paused(), true, 'loaded but paused until someone joins');
    assert.equal(railClock(f.w).resumeMarker, marker, 'the load alone takes no credit');
    f.clock.now += HOUR;
    f.host.wake();
    assert.ok(railClock(f.w).resumeMarker > marker, 'the join takes it');
    const after = railClock(f.w).resumeMarker;
    // A deploy straight after: the credited time is not credited again.
    await f.restart(0);
    f.host.wake();
    assert.equal(railClock(f.w).resumeMarker, after);
    assert.equal(invariant(f.w), null);
  } finally {
    await f.close();
  }
});

// Slice 5 R2 (docs/plans/slice5-town-economy.md): the Camp's and the Quarry's crate yards (the Yard rows) join the
// same credit, through the real host.
test('slice 5: 8 hours away fills both crate yards to their cap once; a restart and a join add nothing', async () => {
  const f = await fixture('away-crates');
  try {
    f.host.wake();
    await f.adopt(buildSeedWorld('freight-running'));
    f.host.pause();
    const before = cratesOf(f.w);
    assert.ok(
      before.some((y, slot) => y.stock < TRADE.yards[slot]!.cap),
      'a yard has room (line 1 took the Camp)',
    );
    f.clock.now += 8 * HOUR;
    f.host.wake();
    const after = cratesOf(f.w);
    after.forEach((y, slot) => {
      const cap = TRADE.yards[slot]!.cap;
      assert.equal(y.stock, cap, `yard ${slot} at its cap`);
      assert.equal(y.made, before[slot]!.made + cap - before[slot]!.stock, `yard ${slot} made up by the same`);
    });
    assert.equal(invariant(f.w), null);
    await f.restart(0);
    f.host.wake();
    assert.deepEqual(cratesOf(f.w), after, 'the credited time is not credited again');
  } finally {
    await f.close();
  }
});

test("ring-island-build2: 8 hours away fills the lit steel works' rack to its cap once; a restart adds nothing", async () => {
  const f = await fixture('away-steel');
  try {
    f.host.wake();
    await f.adopt(buildSeedWorld('steel-lit'));
    f.host.pause();
    const before = { ...steel(f.w) };
    assert.ok(before.lit >= 0 && before.rack < STEEL.rackCap, 'lit, with room on the rack');
    f.clock.now += 8 * HOUR;
    f.host.wake();
    const after = { ...steel(f.w) };
    assert.equal(after.rack, STEEL.rackCap, 'the rack at its cap');
    assert.equal(after.poured, before.poured + STEEL.rackCap - before.rack, 'poured by the same, within the total');
    assert.ok(after.poured <= STEEL.total);
    assert.equal(invariant(f.w), null);
    await f.restart(0);
    f.host.wake();
    assert.deepEqual({ ...steel(f.w) }, after, 'the credited time is not credited again');
  } finally {
    await f.close();
  }
});

function packet(ws: WebSocket, matches: (packet: Record<string, any>) => boolean) {
  return new Promise<Record<string, any>>((resolve) => {
    const receive = (event: MessageEvent) => {
      const value = JSON.parse(String(event.data));
      if (!matches(value)) return;
      ws.removeEventListener('message', receive);
      resolve(value);
    };
    ws.addEventListener('message', receive);
  });
}

function nextPause(t: TestContext, world: ReturnType<typeof createRailwayWorldHost>) {
  let notifyPaused!: () => void;
  const paused = new Promise<void>((resolve) => {
    notifyPaused = resolve;
  });
  const original = world.pause;
  t.mock.method(
    world,
    'pause',
    () => {
      original();
      notifyPaused();
    },
    { times: 1 },
  );
  return paused;
}

test('a hosted room keeps simulating through the reload grace, then pauses until the next join', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-railway-pause-'));
  const svc = createService(
    loadConfig(
      { DATA_DIR: dataDir, SERVER_ROOMS: '*', ROOM_PAUSE_MS: '400' },
      { reconnectGraceMs: 100, housekeepMs: 50, log: () => {} },
    ),
  );
  const port = await svc.listen(0);
  const room = railwayRoomId('pause');
  let elapsed = 0;
  t.mock.method(performance, 'now', () => elapsed);
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout', 'Date'], now: START });
  const advanceClock = (ms: number) => {
    elapsed += ms;
    t.mock.timers.tick(ms);
  };
  const connect = async () => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}/room/${room}?self=alice&pid=alicepid&key=alicepidkey0000000000&b=test`,
      ['boogle.1'],
    );
    await packet(ws, (m) => m.t === 'welcome');
    return ws;
  };
  try {
    let ws = await connect();
    const world = svc.roomHost()!.room(room)!.world as ReturnType<typeof createRailwayWorldHost>;
    await world.whenReady();
    const leave = async () => {
      let notifyRemoved!: () => void;
      const removed = new Promise<void>((resolve) => {
        notifyRemoved = resolve;
      });
      const original = world.replication.removeClient.bind(world.replication);
      t.mock.method(
        world.replication,
        'removeClient',
        (sid: string) => {
          original(sid);
          notifyRemoved();
        },
        { times: 1 },
      );
      ws.close();
      await removed;
    };
    assert.equal(world.paused(), false);
    const marker = railClock(world.rules.railway.world()).resumeMarker;
    // A reload: gone and back inside the grace. The room never paused, so no credit.
    await leave();
    advanceClock(100);
    advanceClock(150);
    ws = await connect();
    advanceClock(600);
    assert.equal(world.paused(), false, 'a reload inside the grace keeps it running');
    assert.equal(railClock(world.rules.railway.world()).resumeMarker, marker, 'and credits nothing');
    // Everyone gone past the grace: it stops ticking.
    await leave();
    advanceClock(100);
    advanceClock(401);
    assert.equal(world.paused(), true, 'an empty room pauses after the grace');
    const tick = world.sync.world.tick;
    advanceClock(300);
    assert.equal(world.sync.world.tick, tick, 'and stands still');
    ws = await connect();
    await world.sync.whenDurable();
    assert.equal(world.paused(), false, 'the next join wakes it');
    assert.ok(railClock(world.rules.railway.world()).resumeMarker > marker, 'with one credit');
    advanceClock(200);
    assert.ok(world.sync.world.tick > tick, 'and it ticks again');
    ws.close();
  } finally {
    t.mock.timers.reset();
    await svc.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('K3: a hosted room away for 8 hours fills the till sack once; collection, rejoin and restart add nothing', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-railway-sack-'));
  const clock = { now: START };
  // The same clock as fixture(): the service uses Date.now rather than exposing the host's `now` option.
  // Reconnect/pause grace and socket delivery still run on real timers and performance.now.
  t.mock.method(Date, 'now', () => clock.now);
  const cfg = loadConfig(
    { DATA_DIR: dataDir, SERVER_ROOMS: '*', ROOM_PAUSE_MS: '300' },
    { reconnectGraceMs: 100, housekeepMs: 50, log: () => {} },
  );
  let svc = createService(cfg);
  let port = await svc.listen(0);
  const room = railwayRoomId('away-sack');
  const connect = async () => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}/room/${room}?self=alice&pid=alicepid&key=alicepidkey0000000000&b=test`,
      ['boogle.1'],
    );
    await packet(ws, (m) => m.t === 'welcome');
    await host().whenReady();
    const opened = packet(ws, (m) => m.d?.t === 'r:session');
    ws.send(JSON.stringify({ t: 'm', d: { t: 'r:open' } }));
    return { ws, session: (await opened).d as { epoch: number; next: number } };
  };
  const host = () => svc.roomHost()!.room(room)!.world as ReturnType<typeof createRailwayWorldHost>;
  try {
    let client = await connect();
    let world = host();
    await world.whenReady();
    const seed = buildSeedWorld('house-built');
    // Adopt the played seed at its own rule tick, just as fixture.adopt does above.
    while (world.sync.world.tick < seed.t) {
      clock.now += 100;
      world.step(0.1);
    }
    world.rules.railway.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())), railwayCheck);
    world.rules.railway.touchAll();
    world.sync.saveNow(true);
    await world.sync.whenDurable();
    const w = () => world.rules.railway.world();
    assert.ok(plotBuilt(w(), 0, world.sync.world.tick), 'the first house is built');
    const cap = sackCap(w(), TRADE_PCT, world.sync.world.tick);
    assert.ok(cap > 0, 'the till earns');
    assert.equal(till(w()).sack, 0, 'no sack before leaving');
    assert.equal(world.paused(), false);

    const paused = nextPause(t, world);
    client.ws.close();
    await paused;
    assert.ok(world.paused());
    assert.equal(svc.roomHost()!.room(room)!.status().players, 0);
    const before = { ...till(w()) };
    const tick = world.sync.world.tick;
    const marker = railClock(w()).resumeMarker;
    clock.now += 8 * HOUR;
    world.step(0.1);
    assert.equal(world.sync.world.tick, tick, 'eight fake hours do not tick the paused host');
    assert.deepEqual({ ...till(w()) }, before, 'the paused till stays still until the join');
    client = await connect();
    assert.equal(world.paused(), false, 'the real rejoin wakes the room');
    assert.equal(till(w()).sack, cap, 'eight hours fill exactly sackCap');
    assert.equal(till(w()).boogles, before.boogles, 'away time earns nothing in the box');
    assert.equal(till(w()).landed, before.landed, 'away time lands no passenger fares');
    assert.equal(till(w()).poured, before.poured, 'the sack has not been collected');
    const credited = railClock(w()).resumeMarker;
    assert.ok(credited > marker, 'the join consumed one away credit');
    assert.equal(credited, Math.floor(clock.now / 100), 'the credit reaches the fake eight-hour marker');
    assert.equal(invariant(w()), null);

    const { epoch, next: request } = client.session;
    const settled = packet(client.ws, (m) => m.d?.ack?.[0] === epoch && m.d.ack[1] === request);
    client.ws.send(
      JSON.stringify({
        t: 'm',
        d: {
          t: 'r:edit',
          e: {
            op: 'rail.sack',
            epoch,
            request,
            ms: 100,
            at: [Math.round((TILL.x + 1000) * 100), Math.round(HALL.floor * 100), Math.round(TILL.z * 100)],
          },
        },
      }),
    );
    await settled;
    assert.equal(world.rules.railway.outcome('alicepid', epoch, request)?.status, 'accepted', 'real r:edit accepted');
    assert.equal(till(w()).boogles, before.boogles + cap, 'the box receives exactly the sack');
    assert.equal(till(w()).poured, before.poured + cap, 'the pour ledger counts it once');
    assert.equal(till(w()).sack, 0, 'collection empties the sack');
    const collected = { ...till(w()) };

    // Empty the sack before rejoining: a duplicate credit can no longer hide behind its cap.
    const pausedAgain = nextPause(t, world);
    client.ws.close();
    await pausedAgain;
    assert.ok(world.paused());
    client = await connect();
    assert.equal(world.paused(), false);
    assert.equal(railClock(w()).resumeMarker, credited, 'no additional away time is consumed');
    assert.deepEqual({ ...till(w()) }, collected, 'a second leave/rejoin neither refills nor pays again');
    await svc.close();
    svc = createService(cfg);
    port = await svc.listen(0);
    client = await connect();
    world = host();
    await world.whenReady();
    assert.equal(world.status().ready, true, 'the saved host reloads successfully');
    assert.equal(railClock(w()).resumeMarker, credited, 'restart preserves the consumed marker');
    assert.deepEqual({ ...till(w()) }, collected, 'restart and join preserve the pour without another credit');
    assert.equal(invariant(w()), null);
    client.ws.close();
  } finally {
    await svc.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
