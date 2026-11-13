// Independent review of M12 (docs/plans/ecs-migration-railway.md, M12 a and b): the mirror publishes a copy-on-write
// clone of its ingest world at the end of a packet that fully applied to a whole state, and the predictor and views
// read only published worlds. The M12 trace never produced a split send after the state was whole; these runs build
// one (a big one-step change on the server, chunked under MAX_PACKET_CHARS) and check the publish condition across it,
// a press pending across it, a refused chunk in the middle of it and the refill after, plus the standing invariants
// (each published world is never written again; at the end of every whole, last chunk the published world is the
// ingest world). Kept as regression proof whether they pass or fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailwayAdapter } from '../src/adapters/railway-session.ts';
import { railMovement } from '../src/adapters/railway-read.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRailRules } from './helpers/rail-rules.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { homeLand } from './helpers/land.ts';
import { buildSeedWorld, type SeedStage } from './helpers/rail.ts';
import { account, works } from '../src/sim/railway-rows.ts';
import { Pile } from '../src/sim/railway-components.ts';
import type { World } from '../src/ecs/index.ts';
import type { ServerPacket } from '../src/world/replicate.ts';

const MOVEMENT = railMovement({ get: (k) => specOf(k)!.def });
type Delivered = { p: ServerPacket; whole: boolean };

/** One server and one client whose packets this test hands over one at a time (`hold`), or at once. */
function room(stage: SeedStage) {
  const seed = buildSeedWorld(stage);
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const api = installRailway(sync, installRailRules(sync, homeLand(), replication), replication);
  while (sync.world.tick < seed.t) sync.stepWorld(100);
  api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  api.touchAll();
  const clock = { now: 1000 };
  const up: unknown[] = [];
  const down: unknown[] = [];
  const requests = createRailwayRequests({
    api,
    pidOf: () => 'a',
    send: (m) => down.push(m),
    replication,
    available: () => true,
    unavailable: () => 'starting',
    actor: () => ({ reach: () => true, height: () => true, cadence: () => true }),
  });
  const handlers = new Set<(m: unknown, from: string) => void>();
  const connection = new Set<(live: boolean) => void>();
  const rail = createRailwayMirror();
  const adapter = createRailwayAdapter({
    mirror: rail,
    movement: () => MOVEMENT,
    pid: 'a',
    pose: () => ({ x: T1.x / 100, y: 30, z: T1.z / 100 }),
    now: () => clock.now,
  });
  const corrections: unknown[] = [];
  adapter.onCorrected((c) => corrections.push(c));
  // The invariants, checked after every packet the client applies (registered after the mirror's and the adapter's).
  const published: { w: World; h: number }[] = [{ w: rail.confirmed(), h: rail.confirmed().hash() }];
  const broken: string[] = [];
  const delivered: Delivered[] = [];
  rail.mirror.onPacket((p) => {
    delivered.push({ p, whole: rail.mirror.whole() });
    const c = rail.confirmed();
    const fresh = published.at(-1)?.w !== c;
    if (fresh) published.push({ w: c, h: c.hash() });
    if (fresh && (p.m || !rail.mirror.whole()))
      broken.push(`tk ${p.tk}: published on a chunk that is not whole and last`);
    if (rail.mirror.whole() && !p.m && c.hash() !== rail.world().hash())
      broken.push(`tk ${p.tk}: the published world is not the ingest world after a whole, last chunk`);
  });
  let held: unknown[] = [];
  let hold = false;
  replication.addClient('a');
  const r: WorldRoom = {
    selfId: 'a',
    send: (m) => void up.push(m),
    onMessage: (h) => (handlers.add(h), () => handlers.delete(h)),
    onConnection: (h) => (connection.add(h), () => connection.delete(h)),
  };
  adapter.attach(r);
  const deliver = (m: unknown) => {
    for (const h of handlers) h(m, SERVER_ID);
  };
  function run(n = 1) {
    for (let k = 0; k < n; k++) {
      for (const m of up.splice(0)) requests.receive(m, 'a');
      sync.stepWorld(1000 / 60 + 1);
      clock.now += 17;
      replication.commit(sync.roomStep());
      replication.flush(sync.roomStep(), (_cid, _p, json) => down.push(JSON.parse(json)));
      down.push({ t: 'w:c', ht: sync.world.tick });
      const out = down.splice(0);
      if (hold) held.push(...out);
      else for (const m of out) deliver(m);
      adapter.update(clock.now);
    }
  }
  const ready = () => {
    for (let k = 0; k < 300 && !adapter.read.ready(); k++) run();
    assert.ok(adapter.read.ready(), 'the client is ready');
  };
  /** Spawn `n` piles on the server in one step: the next send is far over MAX_PACKET_CHARS. */
  function flood(n: number, kind = 0) {
    const w = api.world();
    for (let i = 0; i < n; i++)
      w.spawn([
        Pile,
        { x: T1.x + 2000 + (i % 40) * 37, y: 3000, z: T1.z + 2000 + Math.floor(i / 40) * 37, n: 1, kind },
      ]);
    api.touchAll();
  }
  return {
    api,
    rail,
    adapter,
    corrections,
    published,
    broken,
    run,
    ready,
    flood,
    deliver,
    replication,
    connection,
    up,
    holdOn: () => void (hold = true),
    takeHeld: () => {
      hold = false;
      const out = held;
      held = [];
      return out;
    },
  };
}
const isSplit = (m: unknown): m is ServerPacket => !!m && (m as ServerPacket).t === 's';

test('review M12: a split send after the state is whole publishes nothing until its last chunk, then all of it', () => {
  const r = room('q3-stocked');
  r.ready();
  const before = r.adapter.read.world() as unknown as World;
  const hashBefore = before.hash();
  const pilesBefore = before.count(Pile);
  r.holdOn();
  r.flood(900);
  r.run(1);
  const held = r.takeHeld();
  const chunks = held.filter(isSplit);
  assert.ok(chunks.length > 2, `a split send (${chunks.length} chunks)`);
  assert.ok(chunks.slice(0, -1).every((p) => p.m === 1) && !chunks.at(-1)!.m, 'm on every chunk but the last');
  for (const [k, m] of held.entries()) {
    r.deliver(m);
    if (isSplit(m) && m.m) {
      const w = r.adapter.read.world() as unknown as World;
      assert.equal(w, before, `chunk ${k}: the views still read the world before the send`);
      assert.equal(w.hash(), hashBefore, `chunk ${k}: and it has not moved`);
      assert.equal(r.adapter.read.ready(), true, `chunk ${k}: presses are still offered`);
    }
  }
  const after = r.adapter.read.world() as unknown as World;
  assert.notEqual(after, before, 'published at the last chunk');
  assert.equal(after.count(Pile), pilesBefore + 900, 'every pile of the send at once');
  assert.equal(after.hash(), r.rail.world().hash(), 'the published world is the ingest world');
  assert.equal(before.hash(), hashBefore, 'the world read before the send never moved');
  assert.deepEqual(r.broken, []);
});

test('review M12: a chop pending across a split send whose last chunk acks it keeps showing and settles cleanly', () => {
  const r = room('q3-stocked');
  r.ready();
  const carry0 = account(r.adapter.read.world(), 'a')?.carry ?? 0;
  let pressed = false;
  for (const source of RAILWAY_SOURCES) if ((pressed = r.adapter.chop(source[0], 0, false))) break;
  assert.ok(pressed, 'a chop was taken');
  const shown = account(r.adapter.read.world(), 'a')!.carry;
  assert.ok(shown > carry0, 'the chop shows at once');
  // The server applies the chop and the flood in the same step: its ack rides on the split send's last chunk.
  r.holdOn();
  r.flood(900);
  r.run(1);
  const held = r.takeHeld();
  const chunks = held.filter(isSplit);
  assert.ok(chunks.length > 2, 'a split send');
  assert.ok(chunks.at(-1)!.ack, 'the ack is on the last chunk');
  assert.ok(
    chunks.slice(0, -1).every((p) => !p.ack && !p.ok && !p.rej && !p.ev),
    'nothing settles on the first chunks',
  );
  for (const m of held) {
    r.deliver(m);
    assert.equal(account(r.adapter.read.world(), 'a')!.carry, shown, 'the chop never blinks off');
  }
  assert.equal(r.adapter.read.pending(), 0, 'answered');
  assert.equal(account(r.adapter.read.world(), 'a')!.carry, shown, 'the confirmed world shows it');
  assert.deepEqual(r.corrections, [], 'no correction for an action the server took whole');
  assert.deepEqual(r.broken, []);
});

test('review M12: a refused chunk in the middle of a split send leaves the last whole state shown; the refill republishes', () => {
  const r = room('q3-stocked');
  r.ready();
  const before = r.adapter.read.world() as unknown as World;
  const hashBefore = before.hash();
  r.holdOn();
  r.flood(900);
  r.run(1);
  const chunks = r.takeHeld().filter(isSplit);
  assert.ok(chunks.length > 2);
  r.deliver(chunks[0]);
  // A malformed second chunk (a change to an unknown kind): refused whole, the mirror diverges and asks again.
  r.deliver({ ...chunks[1]!, c: [['nope', 1, {}]] });
  assert.equal(r.adapter.read.world(), before, 'the views keep the last published world');
  assert.equal(before.hash(), hashBefore, 'untouched by the half-applied first chunk');
  assert.ok(
    r.up.some((m) => (m as { t?: string }).t === 'r:resync'),
    'the client asked for the whole state',
  );
  r.run(30);
  const after = r.adapter.read.world() as unknown as World;
  assert.notEqual(after, before, 'the refill published a new world');
  assert.equal(after.hash(), r.rail.world().hash(), 'the ingest world, whole');
  assert.equal(after.count(Pile), r.api.world().count(Pile), 'every server pile, the flood included');
  assert.equal(r.adapter.read.ready(), true);
  assert.deepEqual(r.broken, []);
});

test('review M12: across a disconnect, a split whole send on reconnect and play after, the published world never lags', () => {
  const r = room('ring-joined');
  r.ready();
  const rand = (() => {
    let s = 7;
    return () => (s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32;
  })();
  for (let k = 0; k < 120; k++) {
    if (k % 3 === 0) r.adapter.chop(RAILWAY_SOURCES[Math.floor(rand() * RAILWAY_SOURCES.length)]![0], 0, false);
    if (k === 40) r.flood(600);
    if (k === 60) {
      for (const h of r.connection) h(false);
      r.replication.removeClient('a');
      r.flood(300, 1);
      r.run(3);
      r.replication.addClient('a');
      for (const h of r.connection) h(true);
    }
    r.run(1);
  }
  for (let k = 0; k < 30; k++) r.run(1);
  assert.equal(r.adapter.read.ready(), true);
  assert.equal(r.adapter.read.pending(), 0);
  assert.equal(r.rail.confirmed().hash(), r.rail.world().hash(), 'the last published world is current');
  assert.equal(r.rail.confirmed().count(Pile), r.api.world().count(Pile));
  for (const [k, { w, h }] of r.published.entries()) assert.equal(w.hash(), h, `published world ${k} was written`);
  assert.ok(r.published.length > 10, `${r.published.length} worlds published`);
  assert.deepEqual(r.broken, []);
});

// ---------------------------------------------------------------- views that held a world across a packet
// Two clients on one server, each with its own lag (M12's proof harness, cut down). `frame(c)` runs after each
// client's update, as a view's update does.
function room2(stage: SeedStage) {
  const seed = buildSeedWorld(stage);
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const api = installRailway(sync, installRailRules(sync, homeLand(), replication), replication);
  while (sync.world.tick < seed.t) sync.stepWorld(100);
  api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  api.touchAll();
  type C = { cid: string; adapter: ReturnType<typeof createRailwayAdapter>; delay: number };
  const clients = new Map<string, C>();
  const handlers = new Map<string, Set<(m: unknown, from: string) => void>>();
  let step = 0;
  const clock = { now: 1000 };
  const up: { at: number; cid: string; m: unknown }[] = [];
  const down: { at: number; cid: string; m: unknown }[] = [];
  const requests = createRailwayRequests({
    api,
    pidOf: (sid) => (clients.has(sid) ? sid : null),
    send: (m) => down.push({ at: step + (clients.get(m.to)?.delay ?? 0), cid: m.to, m }),
    replication,
    available: () => true,
    unavailable: () => 'starting',
    actor: () => ({ reach: () => true, height: () => true, cadence: () => true }),
  });
  function join(cid: string, delay: number) {
    const hs = new Set<(m: unknown, from: string) => void>();
    handlers.set(cid, hs);
    const adapter = createRailwayAdapter({
      mirror: createRailwayMirror(),
      movement: () => MOVEMENT,
      pid: cid,
      pose: () => ({ x: T1.x / 100, y: 30, z: T1.z / 100 }),
      now: () => clock.now,
    });
    const c: C = { cid, adapter, delay };
    clients.set(cid, c);
    replication.addClient(cid);
    adapter.attach({
      selfId: cid,
      send: (m) => void up.push({ at: step + delay, cid, m }),
      onMessage: (h) => (hs.add(h), () => hs.delete(h)),
      onConnection: () => () => {},
    });
    return c;
  }
  function run(n: number, frame: (c: C) => void = () => {}) {
    for (let k = 0; k < n; k++) {
      step++;
      for (const x of up.filter((x) => x.at <= step)) {
        up.splice(up.indexOf(x), 1);
        requests.receive(x.m, x.cid);
      }
      sync.stepWorld(1000 / 60 + 1);
      clock.now += 17;
      replication.commit(sync.roomStep());
      replication.flush(sync.roomStep(), (cid, _p, json) =>
        down.push({ at: step + (clients.get(cid)?.delay ?? 0), cid, m: JSON.parse(json) }),
      );
      for (const cid of clients.keys())
        down.push({ at: step + (clients.get(cid)?.delay ?? 0), cid, m: { t: 'w:c', ht: sync.world.tick } });
      for (const x of down.filter((x) => x.at <= step)) {
        down.splice(down.indexOf(x), 1);
        for (const h of handlers.get(x.cid)!) h(x.m, SERVER_ID);
      }
      for (const c of clients.values()) {
        c.adapter.update(clock.now);
        frame(c);
      }
    }
  }
  const ready = () => {
    for (let k = 0; k < 300 && ![...clients.values()].every((c) => c.adapter.read.ready()); k++) run(1);
  };
  return { join, run, ready, api };
}

// crossing-view.ts keeps `wd`, refreshed at the head of update, snap and targets, and its accepted() reads it without
// a refresh: the lowering's slot is `works(wd).pierSet - 1` (crossing-view.ts:601) and the rack slot of a footing
// taken from the pier rack is `works(wd).pierRack` (:605). Before M12, with nothing of a's pending, `wd` was the
// mirror's own world, written in place by the packet that carries b's event, so the slot was the footing just set.
// After M12 it is the world published before that packet, never written again: the slot is one behind.
for (const delay of [0, 3])
  test(`review M12: crossing-view's accepted() reads its held world for a friend's pier footing (a on lag ${delay})`, () => {
    const r = room2('crossing-finishing');
    const a = r.join('a', delay);
    const b = r.join('b', 1);
    r.ready();
    r.run(7);
    let wd: ReturnType<typeof a.adapter.read.world> = a.adapter.read.world();
    const seen: { held: number; now: number; rackHeld?: number; rackNow?: number }[] = [];
    a.adapter.onAccepted((e) => {
      if (e.pid !== 'b') return;
      const fresh = a.adapter.read.world();
      // This copies crossing-view's accepted(): since the review's fix it re-reads the world first, as the roundhouse,
      // works and footing views do. Without this line the copy shows the defect (slot 9, not 10), whatever the view does.
      wd = fresh;
      if (e.op === 'rail.footSet' && e.site === 2)
        seen.push({ held: works(wd).pierSet - 1, now: works(fresh).pierSet - 1 });
      if (e.op === 'rail.footTake' && e.rack === 1)
        seen.push({ held: -1, now: -1, rackHeld: works(wd).pierRack, rackNow: works(fresh).pierRack });
    });
    const frame = (c: { cid: string }) => {
      if (c.cid === 'a') wd = a.adapter.read.world(); // the view's refresh at the head of its update
    };
    for (let set = 0; set < 2; set++) {
      assert.ok(b.adapter.shoulderFooting(1), `b shoulders footing ${set + 1}`);
      r.run(4 + set, frame);
      assert.ok(b.adapter.setFooting(2), `b sets footing ${set + 1}`);
      r.run(9, frame);
    }
    r.run(20, frame);
    const sets = seen.filter((s) => s.rackHeld === undefined);
    const takes = seen.filter((s) => s.rackHeld !== undefined);
    assert.equal(sets.length, 2, "a heard both of b's footings set");
    assert.equal(takes.length, 2, "a heard both of b's rack takes");
    for (const [k, s] of sets.entries())
      assert.equal(s.held, s.now, `footing ${k + 1}: the lowering's slot from the held world is the one just set`);
    for (const [k, s] of takes.entries())
      assert.equal(s.rackHeld, s.rackNow, `take ${k + 1}: the rack slot from the held world is the one just emptied`);
  });
