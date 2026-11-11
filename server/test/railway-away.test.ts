// The paused world (docs/decisions.md, "2026-11-06, economy principles amended"): an empty railway room stops
// simulating after a short grace, and the next join applies one away credit (src/sim/railway-away.ts) to the forge
// rack and the depot cart, finishes the funded job, and catches up regrowth and drop recovery.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createService, loadConfig } from '../src/server.ts';
import type { World } from '../../src/ecs/index.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { line2Active, railCounts } from '../../src/sim/railway-queries-line2.ts';
import { LINE2_FORGE, LINE2_STATIONS } from '../../src/sim/railway-line2-layout.ts';
import { railAwayCredit, RAIL_AWAY } from '../../src/sim/railway-away.ts';
import {
  account,
  act,
  advance,
  apply,
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
    assert.equal(
      forge(f.w).poured,
      paused.poured + LINE2_FORGE.rackMax - paused.rack,
      'credited rails are counted',
    );
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

test('the credit after 10 min, 1 h, 8 h and 3 days (minutes of production)', () => {
  const minutes = (ms: number) => Math.round(railAwayCredit(ms / 100) / 60) / 10;
  assert.deepEqual(
    [10 * 60000, HOUR, 8 * HOUR, 72 * HOUR].map(minutes),
    [9.6, 47.2, 117.8, 120],
    'H = 2 h: a quarter of an hour barely differs, a weekend is the two-hour cap',
  );
  assert.equal(RAIL_AWAY.finishTicks * 100, RAIL_AWAY.pauseMs, 'one pause grace away finishes the funded job');
});

test('a hosted room keeps simulating through the reload grace, then pauses until the next join', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-railway-pause-'));
  const svc = createService(
    loadConfig(
      { DATA_DIR: dataDir, SERVER_ROOMS: '*', ROOM_PAUSE_MS: '400' },
      { reconnectGraceMs: 100, leadHiddenMs: 300, housekeepMs: 50, log: () => {} },
    ),
  );
  const port = await svc.listen(0);
  const room = railwayRoomId('pause');
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const connect = () => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}/room/${room}?self=alice&pid=alicepid&key=alicepidkey0000000000&b=test`,
      ['boogle.1'],
    );
    return new Promise<WebSocket>((resolve) => (ws.onopen = () => resolve(ws)));
  };
  try {
    let ws = await connect();
    await sleep(300);
    const hosted = svc.roomHost()!.room(room)!;
    const world = hosted.world as ReturnType<typeof createRailwayWorldHost>;
    await world.whenReady();
    assert.equal(world.paused(), false);
    const marker = railClock(world.rules.railway.world()).resumeMarker;
    // A reload: gone and back inside the grace. The room never paused, so no credit.
    ws.close();
    await sleep(150);
    ws = await connect();
    await sleep(600);
    assert.equal(world.paused(), false, 'a reload inside the grace keeps it running');
    assert.equal(railClock(world.rules.railway.world()).resumeMarker, marker, 'and credits nothing');
    // Everyone gone past the grace: it stops ticking.
    ws.close();
    await sleep(900);
    assert.equal(world.paused(), true, 'an empty room pauses after the grace');
    const tick = world.sync.world.tick;
    await sleep(300);
    assert.equal(world.sync.world.tick, tick, 'and stands still');
    ws = await connect();
    await sleep(100);
    assert.equal(world.paused(), false, 'the next join wakes it');
    assert.ok(railClock(world.rules.railway.world()).resumeMarker > marker, 'with one credit');
    await sleep(200);
    assert.ok(world.sync.world.tick > tick, 'and it ticks again');
    ws.close();
  } finally {
    await svc.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
