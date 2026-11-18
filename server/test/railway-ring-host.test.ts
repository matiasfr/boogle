// Ring Island's gap on the real host (docs/plans/ring-island-build1.md, R3b, v27): each ring op judged where its actor
// stands against where the railhead stands now (its rack, its jib and its lever's platform move out bent by bent), the
// brace at the gold strut, the rivet over the joint; malformed fields and a stale brace refused without a throw. The
// railhead re-route (docs/plans/railhead-reroute.md, step 2): the trains' Railhead (`Aperture.stop`) holds at the old
// head through a haul and moves, with its re-routed trains, at the settle, through a reload and to a late joiner.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { RAIL_HALTS } from '../../src/sim/railway-lines.ts';
import { RING_BRACE, RING_HEAD, RING_RIVET } from '../../src/sim/railway-ring-layout.ts';
import { railwayAtRing, type RingStage } from '../../src/sim/railway-seed-ring.ts';
import {
  aperture,
  buildSeedWorld,
  chopTo,
  invariant,
  ringOpen,
  stopsOf,
  trains,
  type Seed,
} from '../../test/helpers/rail.ts';
import { LINE2 } from '../../src/sim/railway-lines.ts';
import { TRAIN_PHASE, trainAlong } from '../../src/sim/railway-train.ts';
import { legOpen } from '../../src/sim/railway-queries-route.ts';
import { RAIL_LEGS, legFrame } from '../../src/sim/railway-route.ts';
import { HAUL, haulEnd, haulSettled, haulTarget, haulU } from '../../src/sim/railway-ring-haul.ts';
import { act } from '../../src/sim/railway-seed-route.ts';
import { advanceWorks } from '../../src/sim/railway-seed-works.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import { createPredictor } from '../../src/world/replicate-client.ts';
import { railPredict } from '../../src/world/railway-predict.ts';
import { cloneWorld } from '../../src/sim/railway-queries.ts';
import type { RailAction } from '../../src/sim/railway.ts';
import type { World } from '../../src/ecs/index.ts';

type Obj = Record<string, unknown>;
type At = [number, number, number];

/** A real host on a temp store, loaded with an accepted fixture; actions go through r:edit with their actor's spot. */
async function host(
  name: string,
  fixture: Seed,
  players: Record<string, string> = { s: 'a' },
  roomName = `ring-${name}`,
  reload = false,
) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `boogle-ring-${name}-`));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  const create = () =>
    createRailwayWorldHost({
      roomId: railwayRoomId(roomName),
      store,
      tick: false,
      now: () => now,
      pidOf: (sid) => players[sid] ?? null,
      positions: () => [],
    });
  let h = create();
  const mirrors = new Map<string, ReturnType<typeof createRailwayMirror>>();
  const delays = new Map<string, number>();
  const pending: { cid: string; due: number; json: string }[] = [];
  const flush = () => {
    h.replication.commit(h.sync.roomStep());
    h.replication.flush(h.sync.roomStep(), (cid, _p, json) => {
      pending.push({ cid, due: h.sync.world.tick + (delays.get(cid) ?? 0), json });
    });
    for (let i = 0; i < pending.length;) {
      const p = pending[i]!;
      if (p.due > h.sync.world.tick) {
        i++;
        continue;
      }
      assert.ok(mirrors.get(p.cid)!.mirror.apply(JSON.parse(p.json), now), 'a well-formed host packet');
      pending.splice(i, 1);
    }
  };
  const ticks = async (n: number, publish = true) => {
    for (let i = 0; i < n; i++) {
      now += 100;
      h.step(0.1);
      if (publish && mirrors.size) flush();
    }
    await h.sync.whenDurable();
  };
  await h.whenReady();
  while (h.sync.world.tick <= fixture.t) await ticks(1);
  h.rules.railway.world().load(JSON.parse(JSON.stringify(fixture.w.snapshot())), railwayCheck);
  h.rules.railway.touchAll();
  if (reload) {
    await h.close({ save: true });
    assert.ok(await store.read(railwayRoomId(roomName)), 'the seed saved through the real host');
    h = create();
    await h.whenReady();
  }
  h.onSend((m) => sent.push(m));
  const sessions: Record<string, { epoch: number; request: number }> = {};
  for (const sid of Object.keys(players)) {
    h.deliver({ t: 'r:open' }, sid);
    await ticks(3);
    const session = sent.findLast((m) => m.t === 'r:session' && m.to === sid)!;
    sessions[sid] = { epoch: Number(session.epoch), request: Number(session.next) - 1 };
  }
  return {
    get w() {
      return h.rules.railway.world();
    },
    get tick() {
      return h.sync.world.tick;
    },
    ticks,
    flush,
    delay(cid: string, ticks: number) {
      delays.set(cid, ticks);
    },
    connect(cid: string) {
      const m = createRailwayMirror();
      mirrors.set(cid, m);
      h.replication.addClient(cid);
      const predictor = createPredictor<World, { intent: Pick<RailAction, 'op' | 'site'>; tick: number }>({
        confirmed: m.confirmed,
        clone: cloneWorld,
        apply: (w, a, [epoch, request]) => {
          railPredict(w, players[cid]!, { ...a.intent, epoch, request }, a.tick);
        },
      });
      const session = sessions[cid];
      if (session) predictor.session(session.epoch, session.request + 1);
      m.mirror.onPacket((p) => {
        if (p.ack) predictor.confirm(p.ack);
        predictor.invalidate();
      });
      return { ...m, predictor };
    },
    async restart() {
      await h.close({ save: true });
      assert.ok(await store.read(railwayRoomId(roomName)), 'checkpoint written');
      mirrors.clear();
      pending.length = 0;
      h = create();
      await h.whenReady();
      assert.equal(h.status().ready, true, 'verified checkpoint loaded');
    },
    async action(e: Obj, at: At, sid = 's') {
      const x = sessions[sid]!;
      now += 1000;
      h.deliver({ t: 'r:edit', e: { ...e, epoch: x.epoch, request: ++x.request, at, ms: now - 1800000000000 } }, sid);
      await h.sync.whenDurable();
      assert.equal(invariant(h.rules.railway.world()), null);
      return h.rules.railway.outcome(players[sid]!, x.epoch, x.request)?.status;
    },
    async done() {
      await h.close({ save: false }).catch(() => {});
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}
const spot = (p: { x: number; y: number; z: number }): At => [p.x, p.y, p.z];
const fixture = (stage: RingStage) => railwayAtRing(stage);
const RAILHEAD = RAIL_HALTS.findIndex((h) => h.name === 'Railhead');

/** Accepted fixture: two setters hold a footing each, and the next pair's supply is on the rack. */
function pairFixture() {
  const s = fixture('deck-laid');
  for (let guard = 0; aperture(s.w).rack < 4; guard++) {
    assert.ok(guard < 6000, 'wagon supplies the pair');
    advanceWorks(s, 1);
  }
  assert.equal(act(s, 'a', 'rail.footTake', { rack: 2 }), 1);
  assert.equal(act(s, 'b', 'rail.footTake', { rack: 2 }), 1);
  return s;
}
const setters = { s: 'a', t: 'b' };
type RingHost = Awaited<ReturnType<typeof host>>;
async function setPair(r: RingHost) {
  for (const sid of ['s', 't']) {
    const head = RING_HEAD[Math.floor(aperture(r.w).set / 2)]!;
    assert.equal(await r.action({ op: 'rail.footSet', site: 3 }, spot(head.jib), sid), 'accepted');
  }
}

test('concurrent: two sessions set a pair in one tick; both mirrors hold the server stamp', async () => {
  const r = await host('concurrent-haul', pairFixture(), setters);
  try {
    const a = r.connect('s'),
      b = r.connect('t');
    r.flush();
    const tick = r.tick;
    await setPair(r);
    assert.equal(r.tick, tick, 'both accepted in one rule tick');
    assert.deepEqual([aperture(r.w).set, aperture(r.w).moved, aperture(r.w).from], [2, tick, RING_HEAD[0]!.u]);
    await r.ticks(1);
    for (const m of [a, b]) assert.deepEqual(aperture(m.confirmed()), aperture(r.w));
  } finally {
    await r.done();
  }
});

test('predicted: the server packet replaces moved, and both mirrors agree at every later haul tick', async () => {
  const s = pairFixture();
  assert.equal(act(s, 'a', 'rail.footSet', { site: 3 }), 1);
  const r = await host('predicted-haul', s, setters);
  try {
    const a = r.connect('s'),
      b = r.connect('t');
    r.flush();
    const predictedTick = r.tick - 2;
    assert.ok(b.predictor.act({ intent: { op: 'rail.footSet', site: 3 }, tick: predictedTick }));
    assert.equal(aperture(b.predictor.state()).moved, predictedTick);
    assert.equal(aperture(b.confirmed()).moved, -1, 'prediction leaves the confirmed row alone');
    assert.equal(await r.action({ op: 'rail.footSet', site: 3 }, spot(RING_HEAD[0]!.jib), 't'), 'accepted');
    const acceptedTick = r.tick;
    assert.notEqual(acceptedTick, predictedTick);
    await r.ticks(1);
    assert.equal(b.predictor.pending().length, 0, 'the host packet acknowledged the predicted request');
    assert.equal(aperture(b.predictor.state()).moved, acceptedTick);
    const end = haulEnd(aperture(r.w)) + 2;
    for (; r.tick <= end; await r.ticks(1)) {
      const expected = haulU(aperture(r.w), r.tick);
      assert.equal(haulU(aperture(a.confirmed()), r.tick), expected);
      assert.equal(haulU(aperture(b.predictor.state()), r.tick), expected);
    }
  } finally {
    await r.done();
  }
});

for (const delay of [15, 150])
  test(`${delay === 15 ? 'backed up' : 'late'}: a mirror hears ${delay / 10} s late and keeps the accepted moved`, async () => {
    const r = await host(`delayed-haul-${delay}`, pairFixture(), setters);
    try {
      const a = r.connect('s'),
        b = r.connect('t');
      r.flush();
      r.delay('t', delay);
      await setPair(r);
      const stamp = { ...aperture(r.w) };
      await r.ticks(delay);
      assert.equal(aperture(b.confirmed()).moved, -1, 'the stamp packet is still in transit');
      await r.ticks(1);
      for (const m of [a, b]) {
        const seen = aperture(m.confirmed());
        assert.deepEqual([seen.set, seen.moved, seen.from], [stamp.set, stamp.moved, stamp.from]);
        assert.equal(haulU(seen, r.tick), haulU(stamp, r.tick));
        if (delay === 150) {
          assert.ok(haulSettled(seen, r.tick), 'hearing late starts nothing');
          assert.equal(haulU(seen, r.tick), haulTarget(seen), 'already at the new head');
        }
      }
    } finally {
      await r.done();
    }
  });

test('batched: both footings in one packet give the same row as two packets', async () => {
  const rows = [];
  for (const batched of [false, true]) {
    const r = await host(`batched-haul-${batched}`, pairFixture(), setters);
    try {
      const a = r.connect('s'),
        b = r.connect('t');
      r.flush();
      assert.equal(await r.action({ op: 'rail.footSet', site: 3 }, spot(RING_HEAD[0]!.jib)), 'accepted');
      // Identical accepted ticks in both runs; only the packet flush between the footings differs.
      await r.ticks(1, !batched);
      if (!batched) {
        for (const m of [a, b]) assert.equal(aperture(m.confirmed()).set, 1, 'first footing has its own packet');
      } else for (const m of [a, b]) assert.equal(aperture(m.confirmed()).set, 0, 'both footings await one flush');
      assert.equal(await r.action({ op: 'rail.footSet', site: 3 }, spot(RING_HEAD[0]!.jib), 't'), 'accepted');
      await r.ticks(1);
      for (const m of [a, b]) assert.deepEqual(aperture(m.confirmed()), aperture(r.w));
      rows.push({ ...aperture(a.confirmed()) });
    } finally {
      await r.done();
    }
  }
  assert.deepEqual(rows[0], rows[1]);
});

test('reload and late join mid-haul: the checkpoint round-trips moved and from', async () => {
  const r = await host('reload-haul', pairFixture(), setters);
  try {
    await setPair(r);
    await r.ticks(HAUL.after + HAUL.ready + 3);
    const before = { ...aperture(r.w) };
    for (const sid of ['s', 't'])
      assert.equal(await r.action({ op: 'rail.footTake', rack: 2 }, spot(RING_HEAD[1]!.rack), sid), 'accepted');
    await setPair(r);
    const stamp = { ...aperture(r.w) };
    assert.equal(stamp.from, haulU(before, r.tick), 'checkpoint includes a replanned, noninitial origin');
    assert.ok(stamp.from > RING_HEAD[0]!.u);
    await r.ticks(HAUL.after + HAUL.ready + 5);
    assert.equal(haulSettled(stamp, r.tick), false);
    const tick = r.tick,
      u = haulU(stamp, tick);
    const late = r.connect('late');
    r.flush();
    assert.deepEqual(aperture(late.confirmed()), stamp, 'late join gets the live haul');
    assert.equal(haulU(aperture(late.confirmed()), tick), u);
    await r.restart();
    assert.deepEqual(aperture(r.w), stamp, 'verified checkpoint preserves both stamp fields');
    assert.equal(r.tick, tick);
    const a = r.connect('s'),
      b = r.connect('t');
    r.flush();
    for (const m of [a, b]) {
      assert.deepEqual(aperture(m.confirmed()), stamp);
      assert.equal(haulU(aperture(m.confirmed()), tick), u, 'resume does not restart the haul');
    }
  } finally {
    await r.done();
  }
});

// ---------------------------------------------------------------- the railhead re-route (railhead-reroute, step 2)
/** pairFixture run on by accepted ticks only until a line 2 train is running up to the Railhead 400 m or more short of
 * it, so it is still on its way when the haul settles (20 m/s, the haul about 12.7 s) and the settle replans it. A
 * train standing at the Railhead through a whole haul is not a state ordinary ops reach: the pair comes no earlier than
 * the wagon's arrival (its footings), and its 50-tick dwell, even restarted once by a lever ask, ends before the haul's
 * at least 127; only the balanced hold keeps one there, by the fleet's phase. So the standing re-route stays the rule
 * tests' (test/railway-ring.test.ts, by placement), and these drive a running one. Its slot. */
function runningFixture(): { s: Seed; slot: number } {
  const s = pairFixture();
  const far = () =>
    trains(s.w).findIndex(
      (r) =>
        r.phase === TRAIN_PHASE.RUN &&
        r.to === 4 &&
        r.track === 0 &&
        stopsOf(s.w, LINE2)[4]! - trainAlong(r, LINE2, s.t) >= 40000,
    );
  for (let guard = 0; far() < 0; guard++) {
    assert.ok(guard < 6000, 'a train on its way up to the Railhead');
    advanceWorks(s, 1);
  }
  return { s, slot: far() };
}
const ringStop = (w: World) => ({
  stop: aperture(w).stop,
  head: ringOpen(w).head,
  railhead: stopsOf(w, LINE2)[4],
});

test('re-route: mirrors hold the old stop through the haul, then the new stop and re-routed trains in one packet set', async () => {
  const { s, slot } = runningFixture();
  const r = await host('reroute-mirrors', s, setters);
  try {
    const a = r.connect('s'),
      b = r.connect('t');
    r.flush();
    await setPair(r);
    const end = haulEnd(aperture(r.w)),
      old = { stop: 0, head: 0, railhead: RING_HEAD[0]!.s };
    assert.ok(end - r.tick > 100, 'a whole haul to watch');
    while (r.tick < end - 1) {
      await r.ticks(1);
      assert.deepEqual(ringStop(r.w), old, `the server holds the old stop (tick ${r.tick})`);
      for (const m of [a, b]) {
        assert.deepEqual(ringStop(m.confirmed()), old, `a mirror holds the old stop (tick ${r.tick})`);
        const t = trains(m.confirmed())[slot]!;
        assert.deepEqual([t.phase, t.to, t.dest], [TRAIN_PHASE.RUN, 4, RING_HEAD[0]!.s], 'bound for the old head');
      }
    }
    // One step: the settle's tick and its flush.
    await r.ticks(1);
    assert.equal(r.tick, end);
    const now = { stop: 1, head: 1, railhead: RING_HEAD[1]!.s };
    assert.deepEqual(ringStop(r.w), now, 'the server moved the stop at haulEnd');
    const t = trains(r.w)[slot]!;
    assert.deepEqual([t.phase, t.to, t.dest], [TRAIN_PHASE.RUN, 4, RING_HEAD[1]!.s], 'and replanned the train to it');
    for (const m of [a, b]) {
      assert.deepEqual(ringStop(m.confirmed()), now, 'the mirror has the new stop');
      assert.deepEqual(trains(m.confirmed()), trains(r.w), 'and the re-routed trains, in the same packet set');
    }
  } finally {
    await r.done();
  }
});

test('re-route: a checkpoint mid-haul round-trips stop and re-routes once after reload', async () => {
  const { s, slot } = runningFixture();
  const r = await host('reroute-reload', s, setters);
  try {
    await setPair(r);
    const end = haulEnd(aperture(r.w));
    await r.ticks(60);
    const stamp = { ...aperture(r.w) },
      rows = trains(r.w).map((t) => ({ ...t }));
    assert.equal(stamp.stop, 0, 'mid-haul, the old stop');
    await r.restart();
    assert.deepEqual(aperture(r.w), stamp, 'the verified checkpoint keeps stop with the haul');
    assert.deepEqual(trains(r.w), rows, 'and the train still bound for the old head');
    const a = r.connect('s');
    r.flush();
    assert.equal(aperture(a.confirmed()).stop, 0);
    const moves: number[] = [],
      reroutes: number[] = [];
    let was = aperture(r.w).stop,
      dest = trains(r.w)[slot]!.dest;
    while (r.tick < end + 50) {
      await r.ticks(1);
      if (aperture(r.w).stop !== was) moves.push(r.tick);
      if (trains(r.w)[slot]!.dest !== dest) reroutes.push(r.tick);
      was = aperture(r.w).stop;
      dest = trains(r.w)[slot]!.dest;
    }
    assert.deepEqual(moves, [end], 'the stop moves once, at the settle, after the reload');
    assert.deepEqual(reroutes, [end], 'the train is replanned once, then');
    assert.equal(dest, RING_HEAD[1]!.s, 'to the new head');
    assert.deepEqual(ringStop(a.confirmed()), ringStop(r.w));
  } finally {
    await r.done();
  }
});

test('re-route: a mirror joining mid-haul sees the old head, then the new one at the settle', async () => {
  const r = await host('reroute-late', pairFixture(), setters);
  try {
    await setPair(r);
    const end = haulEnd(aperture(r.w));
    await r.ticks(HAUL.after + HAUL.ready + 10);
    assert.ok(r.tick < end && !haulSettled(aperture(r.w), r.tick), 'mid-haul');
    const late = r.connect('late');
    r.flush();
    assert.deepEqual(ringStop(late.confirmed()), { stop: 0, head: 0, railhead: RING_HEAD[0]!.s }, 'the old head');
    assert.deepEqual(aperture(late.confirmed()), aperture(r.w));
    assert.ok(haulU(aperture(late.confirmed()), r.tick) > RING_HEAD[0]!.u, 'with the deck already under way');
    await r.ticks(end - r.tick);
    assert.deepEqual(ringStop(late.confirmed()), { stop: 1, head: 1, railhead: RING_HEAD[1]!.s }, 'the new head');
    assert.deepEqual(trains(late.confirmed()), trains(r.w));
  } finally {
    await r.done();
  }
});

test('shared boogle host loaded from a ring-joined save accepts rail.legStock', async () => {
  const seed = buildSeedWorld('ring-joined');
  chopTo(seed, 'a', 1);
  const r = await host('shared', seed, { s: 'a' }, 'boogle', true);
  try {
    assert.ok(legOpen(r.w, 0));
    assert.equal(await r.action({ op: 'rail.legStock', leg: 0 }, spot(legFrame(RAIL_LEGS[0]!, 0))), 'accepted');
  } finally {
    await r.done();
  }
});

test('ring host: the rack, the jib and the lever judged where the railhead stands now', async () => {
  const r = await host('reach', fixture('gap-footed'));
  try {
    const first = RING_HEAD[0]!,
      now = RING_HEAD[RING_HEAD.length - 1]!; // set 14: the railhead at bent 13
    assert.equal(await r.action({ op: 'rail.footTake', rack: 2 }, spot(first.rack)), 'rejected', "bent 6's old rack");
    assert.equal(await r.action({ op: 'rail.footTake', rack: 2 }, spot(now.rack)), 'accepted');
    assert.equal(await r.action({ op: 'rail.footSet', site: 3 }, spot(first.jib)), 'rejected', "bent 6's old jib");
    assert.equal(await r.action({ op: 'rail.footSet', site: 3 }, spot(now.jib)), 'accepted');
    assert.equal(aperture(r.w).cw, 1, 'the first counterweight hung');
    // The lever home on the Railhead's down platform: where the head is now, not bent 6.
    const call = { op: 'rail.call', id: RAILHEAD, dir: -1 };
    assert.equal(await r.action(call, spot(first.platform)), 'rejected', "bent 6's old platform");
    assert.equal(await r.action(call, spot(now.platform)), 'accepted');
    // The brace at the gold strut; the rivet over the joint, refused by the rule until the leaf is down.
    const far: At = [RING_BRACE.x + 2000, RING_BRACE.y, RING_BRACE.z];
    assert.equal(await r.action({ op: 'rail.brace', revision: 1 }, far), 'rejected');
    assert.equal(await r.action({ op: 'rail.brace', revision: 1 }, spot(RING_BRACE)), 'accepted');
    assert.equal(await r.action({ op: 'rail.brace', revision: 1 }, spot(RING_BRACE)), 'noop', 'braced already');
    assert.equal(await r.action({ op: 'rail.strike', id: 2 }, spot(RING_RIVET)), 'noop', 'the leaf still up');
    assert.equal(
      await r.action({ op: 'rail.strike', id: 2 }, [RING_RIVET.x + 2000, RING_RIVET.y, RING_RIVET.z]),
      'rejected',
    );
  } finally {
    await r.done();
  }
});

test('ring host: malformed rack, site, id and revision, and a stale brace, refused without a throw', async () => {
  const r = await host('malformed', fixture('leaf-raised'));
  try {
    const head = RING_HEAD[RING_HEAD.length - 1]!;
    for (const rack of [3, -1, 1.5, '2', null])
      assert.equal(await r.action({ op: 'rail.footTake', rack }, spot(head.rack)), 'rejected', `rack ${rack}`);
    for (const site of [4, -1, 2.5, '3', null])
      assert.equal(await r.action({ op: 'rail.footSet', site }, spot(head.jib)), 'rejected', `site ${site}`);
    for (const id of [3, -1, 1.5, '2', null])
      assert.equal(await r.action({ op: 'rail.strike', id }, spot(RING_RIVET)), 'rejected', `id ${id}`);
    for (const revision of [0, 2, -1, '1', null, undefined])
      assert.equal(
        await r.action({ op: 'rail.brace', revision }, spot(RING_BRACE)),
        'rejected',
        `a stale or malformed brace (${revision})`,
      );
    assert.equal(aperture(r.w).brace, 1, 'the leaf still raised');
    // The room still answers.
    assert.equal(await r.action({ op: 'rail.footTake', rack: 2 }, spot(head.rack)), 'accepted');
  } finally {
    await r.done();
  }
});

// R4c with two players (the P1 of 11 November): the brace from one player at the gold strut and the counterweight from
// another at the jib, each judged where its own actor stands; in either order the leaf is down on the last of them.
for (const braceFirst of [true, false])
  test(`ring host: one player braces, another hangs the counterweight, ${braceFirst ? 'brace' : 'weights'} first`, async () => {
    const r = await host(`two-${braceFirst}`, fixture('leaf-raised'), { s: 'alice', t: 'bob' });
    try {
      const head = RING_HEAD[RING_HEAD.length - 1]!;
      const brace = () => r.action({ op: 'rail.brace', revision: 1 }, spot(RING_BRACE), 's');
      const hang = async (k: number) => {
        assert.equal(await r.action({ op: 'rail.footTake', rack: 2 }, spot(head.rack), 't'), 'accepted', `take ${k}`);
        assert.equal(await r.action({ op: 'rail.footSet', site: 3 }, spot(head.jib), 't'), 'accepted', `hang ${k}`);
      };
      // Each judged at its own actor's spot: bob's press at the strut from the jib is out of reach.
      assert.equal(
        await r.action({ op: 'rail.brace', revision: 1 }, spot(head.jib), 't'),
        'rejected',
        'not at the strut',
      );
      if (braceFirst) assert.equal(await brace(), 'accepted');
      for (let k = 1; k <= 4; k++) await hang(k);
      if (!braceFirst) {
        assert.deepEqual([aperture(r.w).cw, aperture(r.w).brace], [4, 1], 'four hung on the pawl');
        assert.equal(await brace(), 'accepted');
      }
      const a = aperture(r.w);
      assert.deepEqual([a.cw, a.brace, a.rack, a.joined], [4, 0, 0, -1], 'down, the rivet not struck');
      assert.equal(await brace(), 'noop', 'a second pull moves nothing');
    } finally {
      await r.done();
    }
  });
