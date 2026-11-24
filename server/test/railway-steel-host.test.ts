// Ring Island's steel works and the install on the real host (docs/plans/ring-island-build2.md, R4, v31): the yard
// take judged at the yard, the feed at the works' doorway, the install at the Roundhouse table; malformed kinds, lines,
// parts and revisions refused without a throw, and a stale install a noop. The greybox route's leg 1 ops (v32) as real
// r:edit messages: the frame feed, the pickups and the barriers keep their `leg`/`id` through railwayRequestEdit;
// and a guard that every op's fields the rules read survive it. The fourth car (docs/plans/fourth-car.md, R3, v33):
// the install replicated to a fitted train and a joiner's snapshot, and a rider's ask from the steel car's deck.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { RING_STEEL_WORKS, RING_STEEL_YARD, STEEL } from '../../src/sim/railway-ring-layout.ts';
import { BRING_TICKS, SHED_TABLE, WORKS, INSTALL_STEEL, steelPool } from '../../src/sim/railway-works-layout.ts';
import { laySection, legStagesOn } from '../../src/sim/railway-seed-legs.ts';
import { railwayAtSteel, type SteelStage } from '../../src/sim/railway-seed-steel.ts';
import { buildSeedWorld, invariant, line, steel, unaudited, type Seed } from '../../test/helpers/rail.ts';
import { account, shed } from '../../src/sim/railway-rows.ts';
import { rail } from '../../src/sim/railway-rows.ts';
import {
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  RAIL_POSITION_MARGIN,
  RAIL_POSITION_MAX,
  RAIL_ROUTE_POINTS,
  ROW_LINE,
  legFrame,
  legRack,
} from '../../src/sim/railway-route.ts';
import { legKitNeed, legRow, routeRow } from '../../src/sim/railway-queries-route.ts';
import { act, apply, railTick, restore, trees } from '../../test/helpers/rail.ts';
import { RAILWAY_SOURCES } from '../../src/sim/railway-layout.ts';
import { railApply } from '../../src/sim/railway-systems.ts';
import { Account, Pile } from '../../src/sim/railway-components.ts';
import { RAILWAY_MAX_INT, type RailAction } from '../../src/sim/railway.ts';
import { RAIL_ACTIONS, RIDER_REACH, RIDER_SPAN, railValid, type Actor } from '../../src/world/railway-server.ts';
import { steelCarOffset } from '../../src/entities/railway/cars.ts';
import { isRailwayRoom } from '../../src/world/railway-namespace.ts';
import { currentRoomId, roomNamespaces } from '../src/room-ids.ts';
import { railwayRequestEdit } from '../src/host/railway-requests.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import { train } from '../../src/sim/railway-rows.ts';
import { LINE_SLOTS, balancedHold, trainGaps, trainSpacing } from '../../src/sim/railway-trains.ts';
import { TRAIN, TRAIN_PHASE, trainAlong } from '../../src/sim/railway-train.ts';
import { railLinePoint } from '../../src/sim/railway-line-path.ts';
import { LINE2, RAIL_HALTS, RAIL_LINES, trainPassesBy } from '../../src/sim/railway-lines.ts';
import { LOGS, roomOf, steelNeed, stopsOf } from '../../src/sim/railway-queries.ts';
import { RAILS } from '../../src/sim/railway-line2-layout.ts';
import { ringRivetSequence } from '../../test/helpers/railway-rivet-sequence.ts';
import { setTune } from '../../src/sim/tune.ts';

type Obj = Record<string, unknown>;
type At = [number, number, number];

/** A real host on a temp store, loaded with an accepted fixture; actions go through r:edit with their actor's spot. */
async function host(name: string, fixture: Seed, players: Record<string, string> = { s: 'a' }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `boogle-steel-${name}-`));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  const make = () => {
    const made = createRailwayWorldHost({
      roomId: railwayRoomId(`steel-${name}`),
      store,
      tick: false,
      now: () => now,
      pidOf: (sid) => players[sid] ?? null,
      positions: () => [],
    });
    made.onSend((m) => sent.push(m));
    return made;
  };
  let h = make();
  // Clients that read the replication (`connect`): each a mirror filled from the packets the host sends it.
  const mirrors = new Map<string, ReturnType<typeof createRailwayMirror>>();
  const ticks = async (n: number) => {
    for (let i = 0; i < n; i++) {
      now += 100;
      h.step(0.1);
      if (!mirrors.size) continue;
      h.replication.commit(h.sync.roomStep());
      h.replication.flush(h.sync.roomStep(), (cid, _p, json) => {
        assert.ok(mirrors.get(cid)?.mirror.apply(JSON.parse(json), 0), 'a well-formed packet');
      });
    }
    await h.sync.whenDurable();
  };
  await h.whenReady();
  while (h.sync.world.tick <= fixture.t) await ticks(1);
  h.rules.railway.world().load(JSON.parse(JSON.stringify(fixture.w.snapshot())), railwayCheck);
  h.rules.railway.touchAll();
  const sessions: Record<string, { epoch: number; request: number }> = {};
  for (const sid of Object.keys(players)) {
    if (sid.startsWith('unopened')) continue;
    h.deliver({ t: 'r:open' }, sid);
    await ticks(3);
    const session = sent.findLast((m) => m.t === 'r:session' && m.to === sid)!;
    sessions[sid] = { epoch: Number(session.epoch), request: Number(session.next) - 1 };
  }
  return {
    get w() {
      return h.rules.railway.world();
    },
    ticks,
    /** The room's rule tick now. */
    get tick() {
      return h.sync.world.tick;
    },
    /** A client joins the replication now; its mirror's world once the whole state has reached it. */
    connect(cid: string) {
      const m = createRailwayMirror();
      mirrors.set(cid, m);
      h.replication.addClient(cid);
      return () => (m.synced() ? m.world() : undefined);
    },
    later(ms: number) {
      now += ms;
    },
    get tune() { return h.rules.railTune.tune; },
    /** An orderly restart (a deploy): the room saves on close and comes back from its save. */
    async restart() {
      await h.close({ save: true });
      mirrors.clear();
      h = make();
      await h.whenReady();
    },
    depart: (sid: string) => h.depart(sid),
    grace: () => h.rules.railTune.get('railBeamGraceS') * 1000,
    /** Several r:edits delivered back to back on one rule tick (no step between), each with its own session. */
    async race(edits: [Obj, At, string][]) {
      now += 1000;
      const keys = edits.map(([e, at, sid]) => {
        const x = sessions[sid]!;
        h.deliver({ t: 'r:edit', e: { ...e, epoch: x.epoch, request: ++x.request, at, ms: now - 1800000000000 } }, sid);
        return [sid, x.epoch, x.request] as const;
      });
      await h.sync.whenDurable();
      assert.equal(invariant(h.rules.railway.world()), null);
      return keys.map(([sid, epoch, request]) => h.rules.railway.outcome(players[sid]!, epoch, request)?.status);
    },
    /** An r:edit from a socket whose player never opened a railway session (r:open). */
    async stranger(e: Obj, at: At, sid: string) {
      now += 1000;
      h.deliver({ t: 'r:edit', e: { ...e, epoch: 1, request: 1, at, ms: now - 1800000000000 } }, sid);
      await h.sync.whenDurable();
      return h.rules.railway.outcome(players[sid] ?? sid, 1, 1)?.status;
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
const away = (p: { x: number; y: number; z: number }): At => [p.x + 2000, p.y, p.z];
const fixture = (stage: SteelStage) => railwayAtSteel(stage);
const install = (revision: unknown = 1, line = 1, part = 2) => ({ op: 'rail.install', line, part, revision });

// Accepted route only: stock arrives on trains and the existing four sections open High Gorge.
const PAID = fixture('boiler-long');
for (let t = 0; shed(PAID.w).steel < STEEL.total; t++) {
  assert.ok(t < 12000);
  railTick(PAID.w, ++PAID.t);
}
const PAID_GORGE = { w: restore(PAID.w), t: PAID.t };
while (legRow(PAID_GORGE.w, 0).laid < RAIL_LEGS[0]!.sections.length) laySection(PAID_GORGE);

test('paid host: cradle and big boiler cross r:edit, share the pool, replicate and survive restart', async () => {
  const r = await host('paid', PAID_GORGE, { s: 'a', peer: 'b' });
  try {
    const mirror = r.connect('viewer');
    const rev = line(r.w, LINE2).rev;
    for (const part of [3, 4]) assert.equal(await r.action(install(rev, LINE2, part), away(SHED_TABLE)), 'rejected');
    assert.deepEqual(
      await r.race([
        [install(rev, LINE2, 4), spot(SHED_TABLE), 's'],
        [install(rev, LINE2, 3), spot(SHED_TABLE), 'peer'],
      ]),
      ['accepted', 'noop'],
      'the cradle wins the cross-part race',
    );
    assert.equal(shed(r.w).spent, INSTALL_STEEL[4]);
    assert.equal(await r.action(install(rev + 1, LINE2, 4), spot(SHED_TABLE)), 'noop');
    assert.equal(await r.action(install(rev + 1, LINE2, 3), spot(SHED_TABLE)), 'noop', "the cradle's table hold");
    await r.ticks(WORKS.upgradeTicks);
    assert.equal(await r.action(install(rev + 1, LINE2, 3), spot(SHED_TABLE)), 'accepted');
    assert.equal(await r.action(install(rev + 2, LINE2, 3), spot(SHED_TABLE)), 'noop');
    await r.ticks(3);
    for (const w of [r.w, mirror()!]) {
      assert.equal(line(w, LINE2).boiler, 3);
      assert.equal(line(w, LINE2).cradle, 1);
      assert.equal(shed(w).spent, INSTALL_STEEL[3] + INSTALL_STEEL[4]);
      assert.equal(steelPool(shed(w)), STEEL.total - INSTALL_STEEL[3] - INSTALL_STEEL[4]);
    }
    await r.restart();
    assert.equal(line(r.w, LINE2).cradle, 1);
    assert.equal(line(r.w, LINE2).boiler, 3);
    assert.equal(shed(r.w).spent, INSTALL_STEEL[3] + INSTALL_STEEL[4]);
    const late = r.connect('late');
    await r.ticks(3);
    assert.equal(shed(late()!).spent, shed(r.w).spent);
  } finally {
    await r.done();
  }
});

test('paid host: short pool and early big boiler refuse through r:edit without spending', async () => {
  const r = await host('paid-short', fixture('steel-home'));
  try {
    assert.equal(await r.action(install(1, LINE2, 2), spot(SHED_TABLE)), 'accepted');
    // The garage table's hold (garage step 4) after the longer boiler's install.
    await r.ticks(WORKS.upgradeTicks);
    assert.equal(await r.action(install(2, LINE2, 3), spot(SHED_TABLE)), 'noop');
    assert.equal(await r.action(install(2, LINE2, 4), spot(SHED_TABLE)), 'accepted');
    assert.ok(steelPool(shed(r.w)) < INSTALL_STEEL[3]);
    assert.equal(await r.action(install(3, LINE2, 3), spot(SHED_TABLE)), 'noop');
    assert.equal(shed(r.w).spent, INSTALL_STEEL[4]);
  } finally {
    await r.done();
  }
});

test('upgrade host: part 1 crosses r:edit, checks reach, replicates both lines and saves the gate', async () => {
  const r = await host('upgrade', buildSeedWorld('cradle-fitted'), { s: 'a', peer: 'b' });
  try {
    const mirror = r.connect('viewer');
    assert.equal(await r.action(install(0, 1, 1), spot(SHED_TABLE)), 'noop', 'turn first');
    assert.equal(await r.action({ op: 'rail.turn', to: 1, revision: 0 }, spot(SHED_TABLE)), 'accepted');
    assert.equal(shed(r.w).ready, -1);
    assert.equal(await r.action(install(0, 1, 1), away(SHED_TABLE)), 'rejected');
    for (const e of [install(0, 0, 1), install(0, 1, 5), install('0', 1, 1), { ...install(0, 1, 1), part: '1' }])
      assert.equal(await r.action(e, spot(SHED_TABLE)), 'rejected');
    assert.equal(await r.action(install(1, 1, 1), spot(SHED_TABLE)), 'noop', 'stale revision');
    assert.equal(await r.action(install(0, 1, 1), spot(SHED_TABLE)), 'accepted');
    const ready = shed(r.w).ready;
    assert.ok(ready > r.tick);
    assert.equal(await r.action(install(0, 1, 1), spot(SHED_TABLE), 'peer'), 'noop', 'second hold loses');
    await r.ticks(3);
    for (const w of [r.w, mirror()!]) {
      assert.equal(line(w, 0).boiler, 1);
      assert.equal(line(w, 1).boiler, 1);
      assert.equal(shed(w).steel, 0);
      assert.equal(shed(w).ready, ready);
    }
    await r.restart();
    assert.equal(line(r.w, 0).boiler, 1);
    assert.equal(line(r.w, 1).boiler, 1);
    assert.equal(shed(r.w).ready, ready);
  } finally {
    await r.done();
  }
});

test('review: upgrade host races on one tick, a stranger, the hold refusing, and a restart mid-hold that still couples', async () => {
  const r = await host('upgrade-review', buildSeedWorld('cradle-fitted'), { s: 'a', peer: 'b', unopened: 'c' });
  try {
    assert.equal(await r.action({ op: 'rail.turn', to: 1, revision: 0 }, spot(SHED_TABLE)), 'accepted');
    // A player in the room who never opened a railway session cannot install.
    assert.notEqual(await r.stranger(install(0, 1, 1), spot(SHED_TABLE), 'unopened'), 'accepted');
    assert.equal(line(r.w, 1).boiler, 0);
    assert.equal(shed(r.w).ready, -1);
    // Two players' holds land on one rule tick: exactly one installs.
    const tick = r.tick;
    const got = await r.race([
      [install(0, 1, 1), spot(SHED_TABLE), 's'],
      [install(0, 1, 1), spot(SHED_TABLE), 'peer'],
    ]);
    assert.equal(r.tick, tick, 'both on one tick');
    assert.deepEqual([...got].sort(), ['accepted', 'noop']);
    const ready = shed(r.w).ready;
    assert.equal(ready, tick + WORKS.upgradeTicks + WORKS.rollTicks);
    // During the moment: the table cannot turn back, a part 2 install is refused, a repeat cannot move the roll-out.
    await r.ticks(10);
    assert.equal(await r.action({ op: 'rail.turn', to: 0, revision: shed(r.w).tableRev }, spot(SHED_TABLE)), 'noop');
    assert.equal(await r.action(install(1, 1, 2), spot(SHED_TABLE), 'peer'), 'noop');
    assert.equal(await r.action(install(0, 1, 1), spot(SHED_TABLE)), 'noop');
    assert.equal(shed(r.w).ready, ready);
    // The player who started it leaves; the server restarts inside the 50-tick hold.
    r.depart('s');
    await r.ticks(10);
    await r.restart();
    assert.equal(shed(r.w).ready, ready);
    for (const l of [0, 1]) assert.equal(line(r.w, l).boiler, 1);
    for (let t = 0; !LINE_SLOTS[LINE2]!.some((k) => train(r.w, k).wagon); t++) {
      assert.ok(t < 6000, 'the wagon couples after the restart');
      await r.ticks(1);
    }
    assert.ok(r.tick >= ready);
    assert.equal(invariant(r.w), null);
  } finally {
    await r.done();
  }
});

test('steel host: the yard take at the yard, the feed at the works, each refused from elsewhere', async () => {
  const r = await host('reach', fixture('steel-kit'));
  try {
    assert.equal(
      await r.action({ op: 'rail.steelTake', kind: 1 }, spot(RING_STEEL_WORKS)),
      'rejected',
      'not at the yard',
    );
    assert.equal(await r.action({ op: 'rail.steelTake', kind: 1 }, away(RING_STEEL_YARD)), 'rejected');
    assert.equal(await r.action({ op: 'rail.steelTake', kind: 1 }, spot(RING_STEEL_YARD)), 'accepted');
    assert.ok(steel(r.w).yardRails < STEEL.rails, 'rails off the yard');
    // Separate capacities: with the yoke (the seeds take it at Q1) the rails row holds 16, so the kit's 12 rails come
    // off in one take, and the logs still fit beside them.
    assert.equal(steel(r.w).yardRails, 0, 'all 12 rails in one row of 16');
    assert.equal(account(r.w, 'a')!.rails, STEEL.rails);
    assert.equal(await r.action({ op: 'rail.steelTake', kind: 1 }, spot(RING_STEEL_YARD)), 'noop', 'no rails left');
    assert.equal(await r.action({ op: 'rail.steelTake', kind: 0 }, spot(RING_STEEL_YARD)), 'accepted');
    assert.equal(steel(r.w).yardLogs, 0, 'all eight logs beside the rails');
    assert.equal(await r.action({ op: 'rail.steel' }, spot(RING_STEEL_YARD)), 'rejected', 'not at the works');
    assert.equal(await r.action({ op: 'rail.steel' }, away(RING_STEEL_WORKS)), 'rejected');
    assert.equal(await r.action({ op: 'rail.steel' }, spot(RING_STEEL_WORKS)), 'accepted');
    assert.ok(steel(r.w).rails > 0, 'fed into the bill');
    assert.equal(await r.action({ op: 'rail.steel' }, spot(RING_STEEL_WORKS)), 'noop', 'an empty back');
    // No steel in the bay yet: the install is the rule's noop at the table.
    assert.equal(await r.action(install(), spot(SHED_TABLE)), 'noop');
  } finally {
    await r.done();
  }
});

// The greybox route (the step 3 review's P2-2): a leg counts the units lifted off its rack as held for its frame. A
// leaver holding them keeps them counted through the grace, then the host's leaver check releases them, so the leg
// loads them again and is never stalled by someone who is gone.
test("route host: a leaver's leg rack rails stay counted through the grace, then are owed again", async () => {
  const r = await host('leg-leaver', buildSeedWorld('ring-joined'), { s: 'a', t: 'b' });
  try {
    for (let k = 0; rail(r.w).depotRails === 0; k++) {
      assert.ok(k < 4000, 'the first kit racked');
      await r.ticks(1);
    }
    const rack = legRack(RAIL_LEGS[0]!, legRow(r.w, 0).laid);
    assert.equal(await r.action({ op: 'rail.depotRailTake' }, spot(rack), 't'), 'accepted');
    const held = legRow(r.w, 0).heldRails;
    assert.ok(held > 0, 'held on b');
    r.depart('t');
    await r.ticks(5);
    assert.equal(legRow(r.w, 0).heldRails, held, 'an absent carrier keeps them counted through the grace');
    r.later(r.grace());
    await r.ticks(3);
    assert.equal(legRow(r.w, 0).heldRails, 0, 'past the grace: owed again');
    assert.ok(legKitNeed(r.w, 0).rails >= held, 'the leg loads them again');
  } finally {
    await r.done();
  }
});

// Review of the step 3 fixes (P2-2's host release): the release is "once per session epoch", but `legReleased` is
// forgotten whenever no leg holds a unit (legKitHolders is empty then), and the leaver still carries what they left
// with. So the next player who lifts off the rack has their units counted off a grace later, for an account that has
// been gone all along and was already released: the held count P2-2 added stops counting, and a train loads a second
// kit for units a present player is carrying to the frame.
test("route host (review): a leaver already released is not released again off a present carrier's units", async () => {
  const r = await host('leg-leaver-twice', buildSeedWorld('ring-joined'), { s: 'a', t: 'b' });
  try {
    const racked = async () => {
      for (let k = 0; rail(r.w).depotRails === 0; k++) {
        assert.ok(k < 6000, 'kit racked');
        await r.ticks(1);
      }
      return spot(legRack(RAIL_LEGS[0]!, legRow(r.w, 0).laid));
    };
    assert.equal(await r.action({ op: 'rail.depotRailTake' }, await racked(), 't'), 'accepted');
    assert.ok(legRow(r.w, 0).heldRails > 0, 'held on b');
    r.depart('t');
    await r.ticks(2);
    r.later(r.grace());
    await r.ticks(3);
    assert.equal(legRow(r.w, 0).heldRails, 0, 'b released past the grace (the fix, as built)');
    // a, here all along, lifts the next rails off the rack and walks them to the frame.
    assert.equal(await r.action({ op: 'rail.depotRailTake' }, await racked(), 's'), 'accepted');
    const held = legRow(r.w, 0).heldRails;
    assert.ok(held > 0, 'held on a');
    await r.ticks(2);
    r.later(r.grace());
    await r.ticks(3);
    assert.equal(legRow(r.w, 0).heldRails, held, "a's units stay counted: b's session was released once already");
  } finally {
    await r.done();
  }
});

test('steel host: malformed kinds, lines, parts and revisions refused without a throw', async () => {
  const r = await host('malformed', fixture('steel-home'));
  try {
    for (const kind of [2, -1, 0.5, '1', null, undefined])
      assert.equal(await r.action({ op: 'rail.steelTake', kind }, spot(RING_STEEL_YARD)), 'rejected', `kind ${kind}`);
    for (const l of [0, 2, -1, '1', null])
      assert.equal(await r.action(install(0, l as number), spot(SHED_TABLE)), 'rejected', `line ${l}`);
    for (const part of [0, 5, '1', null])
      assert.equal(await r.action(install(0, 1, part as number), spot(SHED_TABLE)), 'rejected', `part ${part}`);
    // Since v67 an install's revision is the line's `Line.rev`, bounded by RAILWAY_MAX_INT (a stale one is a noop).
    for (const revision of [RAILWAY_MAX_INT + 1, -1, 0.5, '0', null, undefined])
      assert.equal(
        await r.action({ op: 'rail.install', line: 1, part: 2, revision }, spot(SHED_TABLE)),
        'rejected',
        `revision ${revision}`,
      );
    assert.equal(line(r.w, 1).boiler, 1, 'only the table fit');
    // The room still answers.
    assert.equal(await r.action({ op: 'rail.steelTake', kind: 0 }, spot(RING_STEEL_YARD)), 'noop', 'the yard empty');
  } finally {
    await r.done();
  }
});

test('steel host: the install at the table, once, two players pressing on the same revision', async () => {
  const r = await host('install', fixture('steel-home'), { s: 'alice', t: 'bob' });
  try {
    assert.equal(await r.action(install(), away(SHED_TABLE)), 'rejected', 'not at the table');
    assert.equal(await r.action(install(), spot(SHED_TABLE), 's'), 'accepted');
    assert.deepEqual([line(r.w, 1).boiler, line(r.w, 1).fitted >= 0], [2, true], 'line 2 fitted');
    assert.equal(await r.action(install(), spot(SHED_TABLE), 't'), 'noop', 'the second press saw a stale fit');
    assert.equal(await r.action(install(2), spot(SHED_TABLE), 't'), 'noop', 'already the longer boiler');
    // The fourth car (R3a): the car is drawn from the replicated row's `boiler`, so the one fact to prove is that a
    // line 2 train takes the fit standing at the Village and that row reaches a client and a late joiner.
    const seen = r.connect('c');
    const village = (w: typeof r.w, k: number) =>
      train(w, k).phase === TRAIN_PHASE.STAND && train(w, k).at === 0 && train(w, k).boiler === 2;
    let fitted = -1;
    for (let t = 0; fitted < 0; t++) {
      assert.ok(t < 3000, 'a line 2 train stands fitted at the Village');
      await r.ticks(1);
      fitted = LINE_SLOTS[1]!.find((k) => village(r.w, k)) ?? -1;
    }
    await r.ticks(2);
    assert.equal(train(seen()!, fitted).boiler, 2, 'the replicated row wears the longer boiler');
    const joiner = r.connect('late');
    await r.ticks(3);
    assert.ok(joiner(), "the joiner's snapshot is whole");
    assert.equal(train(joiner()!, fitted).boiler, 2, "and its row wears it: the joiner's train has the steel car");
    for (const k of LINE_SLOTS[1]!)
      assert.equal(train(joiner()!, k).boiler, train(r.w, k).boiler, `train ${k}: the joiner's row is the host's`);
  } finally {
    await r.done();
  }
});

// The fourth car (R3b): a rider on the steel car of the wagon's train (14.5 m behind the pose, RIDER_SPAN) asks for
// the quarry as a real r:edit, standing at the Village: accepted. From 25 m behind (past the rider's 10 m of reach
// and the train's 14.5 m): refused. No new op; this is the reach the steel car's deck leans on.
test('steel host: a rider asks from the steel car of the wagon train, 14.5 m behind its pose; 25 m is out of reach', async () => {
  const r = await host('steel-car-call', fixture('steel-home'));
  try {
    assert.equal(await r.action(install(), spot(SHED_TABLE)), 'accepted');
    const k = LINE_SLOTS[1]!.find((s) => train(r.w, s).wagon);
    assert.ok(k !== undefined, 'the wagon is on a line 2 train');
    // It takes the fit at its next Village stand: fitted, it has the steel car.
    const fitted = () =>
      train(r.w, k).phase === TRAIN_PHASE.STAND && train(r.w, k).at === 0 && train(r.w, k).boiler === 2;
    for (let t = 0; !fitted(); t++) {
      assert.ok(t < 3000, 'the wagon train stands fitted at the Village');
      await r.ticks(1);
    }
    const along = trainAlong(train(r.w, k), 1, r.tick),
      y = RAIL_HALTS[2]!.platforms[0].y;
    // Straight back from the pose along the steel car's line (line 2 itself ends 21.65 m behind, at the table), in
    // whole centimetres as a client sends its position.
    const pose = railLinePoint(1, along),
      deck = railLinePoint(1, along - 1450);
    const behind = (cm: number): At => [
      Math.round(pose.x + ((deck.x - pose.x) * cm) / 1450),
      y,
      Math.round(pose.z + ((deck.z - pose.z) * cm) / 1450),
    ];
    // A halt up the line this train stops at on request (not an end, not one it passes by now the Pier is open).
    const stops = stopsOf(r.w, 1),
      id = RAIL_HALTS.findIndex(
        (h) => h.line === 1 && h.stop > 0 && h.stop < stops.length - 1 && !trainPassesBy(1, h.stop, 1, stops.length),
      );
    assert.ok(id >= 0, 'a request halt up line 2');
    const ask = { op: 'rail.call', id, dir: 1, train: k };
    assert.equal(await r.action(ask, behind(2500)), 'rejected', '25 m behind the pose: beside no car');
    assert.equal(await r.action(ask, behind(1450)), 'accepted', "on the steel car's deck");
  } finally {
    await r.done();
  }
});

// R2b updates the car4 reach proof for the coach train (v57): 14.5 m and 25 m read the same on v32's span (17.4 m of reach), so the case above
// passes with RIDER_SPAN left at 740. This one pins v33's own edge on a standing train, as real r:edit: 24.4 m behind
// the pose is in reach (refused on v32), 24.65 m is not, and the span is the steel car's place on the wagon's train.
// It also shows what the reach is not: 24.4 m straight back is 8.3 m past the train's tail (16.1 m), on no car.
test('review (car4): the reach edge of a standing fitted train is 24.5 m, the steel car plus the rider 10 m', async () => {
  assert.equal(RIDER_SPAN, Math.round(-steelCarOffset(true) * 100), "the span is the steel car's centre");
  assert.equal(RIDER_REACH + RIDER_SPAN, 2450);
  // A v32 room id is not this server's railway: no host is made for it (the deploy gap).
  assert.equal(isRailwayRoom('rail-v32-somewhere'), false);
  assert.equal(currentRoomId('rail-v32-somewhere', roomNamespaces(['*'])), false);
  const r = await host('steel-car-edge', fixture('steel-home'));
  try {
    assert.equal(await r.action(install(), spot(SHED_TABLE)), 'accepted');
    const k = LINE_SLOTS[1]!.find((s) => train(r.w, s).wagon)!;
    const fitted = () =>
      train(r.w, k).phase === TRAIN_PHASE.STAND && train(r.w, k).at === 0 && train(r.w, k).boiler === 2;
    for (let t = 0; !fitted(); t++) {
      assert.ok(t < 3000, 'the wagon train stands fitted at the Village');
      await r.ticks(1);
    }
    const along = trainAlong(train(r.w, k), 1, r.tick),
      y = RAIL_HALTS[2]!.platforms[0].y;
    const pose = railLinePoint(1, along),
      deck = railLinePoint(1, along - 1450);
    const behind = (cm: number): At => [
      Math.round(pose.x + ((deck.x - pose.x) * cm) / 1450),
      y,
      Math.round(pose.z + ((deck.z - pose.z) * cm) / 1450),
    ];
    const stops = stopsOf(r.w, 1),
      id = RAIL_HALTS.findIndex(
        (h) => h.line === 1 && h.stop > 0 && h.stop < stops.length - 1 && !trainPassesBy(1, h.stop, 1, stops.length),
      );
    const ask = { op: 'rail.call', id, dir: 1, train: k };
    assert.equal(train(r.w, k).phase, TRAIN_PHASE.STAND, 'still standing: no travel in the lag window');
    assert.equal(await r.action(ask, behind(2465)), 'rejected', '24.65 m: past the reach');
    assert.equal(await r.action(ask, behind(2440)), 'accepted', '24.4 m: inside it (17.4 m on v32)');
  } finally {
    await r.done();
  }
});

// ---------------------------------------------------------------- the greybox route's leg 1 ops (v32)
const STACK = 0;
const incline = RAIL_GATES.findIndex((g) => g.id === 'incline');
/** Ring Island joined, its first kit racked: the leg's rack and frame are live. */
async function racked(r: Awaited<ReturnType<typeof host>>) {
  for (let k = 0; rail(r.w).depotRails === 0; k++) {
    assert.ok(k < 4000, 'the first kit racked');
    await r.ticks(1);
  }
}

test('route host: the frame feed keeps its leg; fed at the frame, refused away and for a malformed leg', async () => {
  const r = await host('leg-stock', buildSeedWorld('ring-joined'));
  try {
    await racked(r);
    const laid = legRow(r.w, STACK).laid;
    const p = legFrame(RAIL_LEGS[STACK]!, laid),
      frame = spot(p);
    assert.equal(await r.action({ op: 'rail.depotRailTake' }, spot(legRack(RAIL_LEGS[STACK]!, laid))), 'accepted');
    const before = legRow(r.w, STACK).rails;
    for (const leg of ['0', 0.5, -1, RAIL_LEGS.length, null, undefined])
      assert.equal(await r.action({ op: 'rail.legStock', leg }, frame), 'rejected', `leg ${String(leg)}`);
    assert.equal(await r.action({ op: 'rail.legStock', leg: STACK }, away(p)), 'rejected', 'not at the frame');
    assert.equal(legRow(r.w, STACK).rails, before, 'nothing fed yet');
    // Fields the op does not take are dropped, not judged: the feed goes in as `{ leg }` alone.
    assert.equal(await r.action({ op: 'rail.legStock', leg: STACK, id: 3, kind: 2, junk: 'x' }, frame), 'accepted');
    assert.ok(legRow(r.w, STACK).rails > before, 'fed into the frame');
  } finally {
    await r.done();
  }
});

// A grant and a gate the rules cannot give yet (seeds' leg is not laid, the incline wants the pick): at their spot each
// reaches the rule, a noop; refused away and malformed. Before the request kept `id`, every one was refused.
test('route host: a grant and a gate keep their id; judged at their spot, refused away and for a malformed id', async () => {
  const r = await host('leg-grant', buildSeedWorld('ring-joined'));
  try {
    const seeds = RAIL_GRANTS.findIndex((g) => g.id === 'seeds');
    const g = RAIL_GRANTS[seeds]!.at,
      b = RAIL_GATES[incline]!.at,
      field = spot(g),
      pad = spot(b);
    for (const id of ['0', 0.5, -1, RAIL_GRANTS.length, null, undefined])
      assert.equal(await r.action({ op: 'rail.grant', id }, field), 'rejected', `grant ${String(id)}`);
    assert.equal(await r.action({ op: 'rail.grant', id: seeds }, away(g)), 'rejected', 'not at its spot');
    assert.equal(await r.action({ op: 'rail.grant', id: seeds, leg: 3, junk: 'x' }, field), 'noop', 'leg 2 not laid');
    for (const id of ['0', 0.5, -1, RAIL_GATES.length, null, undefined])
      assert.equal(await r.action({ op: 'rail.gate', id }, pad), 'rejected', `gate ${String(id)}`);
    assert.equal(await r.action({ op: 'rail.gate', id: incline }, away(b)), 'rejected', 'not at the pad');
    assert.equal(await r.action({ op: 'rail.gate', id: incline, leg: 1 }, pad), 'noop', 'the pick not held');
    assert.deepEqual([routeRow(r.w).grants, routeRow(r.w).gates], [0, 0]);
  } finally {
    await r.done();
  }
});

/** Leg 1 laid to its end by apply alone (players a and b feed every tick), so its pickup can be taken; built once and
 * shared (`legLaid`: each host loads a copy of it) by the pick's test and the Ring Island hold's. */
let laid: Seed | undefined;
const legLaid = () => (laid ??= legDone());
function legDone(): Seed {
  // Preserve the hold-cap workload's comfortable feeding policy, independent of the settled v46 jump-in.
  const j = ringRivetSequence();
  const s = { w: restore(j.w), t: j.t };
  const n = RAIL_LEGS[STACK]!.sections.length;
  for (let guard = 0; legRow(s.w, STACK).laid < n; guard++) {
    assert.ok(guard < 40000, 'leg 1 laid');
    for (const pid of ['a', 'b'])
      for (const [op, f] of [
        ['rail.depotTake', {}],
        ['rail.depotRailTake', {}],
        ['rail.legStock', { leg: STACK }],
      ] as const) {
        const a = s.w.get(Account, s.w.lookup(Account, pid)!)!;
        if (op !== 'rail.legStock' && roomOf(s.w, a, op === 'rail.depotTake' ? LOGS : RAILS) <= 0) continue;
        apply(s.w, pid, { op, epoch: a.epoch, request: a.request + 1, ...f }, s.t);
      }
    railTick(s.w, ++s.t);
  }
  // A log on a's back to put down at the rim: chopped by the rule alone (the host judges reach; the fixture does not).
  for (let k = 0; s.w.get(Account, s.w.lookup(Account, 'a')!)!.carry === 0; k++) {
    const tree = trees(s.w).findIndex((t) => t.left > 0);
    assert.ok(k < 40 && tree >= 0, 'a standing source');
    act(s, 'a', 'rail.chop', { id: RAILWAY_SOURCES[tree]![0], yaw: 0, collapsed: false });
  }
  assert.equal(invariant(s.w), null);
  return s;
}

// The pick's rim stands 2032 m out (step 4's review, k), past the old 2000 m bound on an actor's `at`: the bound now
// follows the catalog (RAIL_POSITION_MAX), so the pick is taken there, and a pile can lie there too.
test('route host: the pick taken at its rim through r:edit, a pile dropped there; past the bound still refused', async () => {
  const r = await host('pick', legLaid());
  try {
    const pick = RAIL_GRANTS.findIndex((g) => g.id === 'pick');
    const g = RAIL_GRANTS[pick]!.at,
      rim = spot(g),
      far: At = [RAIL_POSITION_MAX + 1, g.y, g.z];
    assert.ok(Math.abs(g.z) > 200000, 'the rim is past the old bound');
    assert.equal(await r.action({ op: 'rail.grant', id: pick }, [g.x, g.y, -RAIL_POSITION_MAX - 1]), 'rejected');
    assert.equal(await r.action({ op: 'rail.grant', id: pick }, rim), 'accepted');
    assert.equal(routeRow(r.w).grants & (1 << pick), 1 << pick, 'the room holds the pick');
    // The fixture's log on a's back, put down at the rim.
    const drop = (x: number, at: At) => r.action({ op: 'rail.drop', x, y: g.y, z: g.z, n: 1, kind: 0 }, at);
    assert.equal(await drop(RAIL_POSITION_MAX + 1, rim), 'rejected', 'a drop past the bound');
    assert.equal(await drop(g.x, far), 'rejected', 'an actor past the bound');
    assert.equal(await drop(g.x, rim), 'accepted', 'a pile at the rim');
    assert.ok(
      r.w.ids(Pile).some((id) => r.w.get(Pile, id)!.z === g.z),
      'the pile lies at the rim',
    );
  } finally {
    await r.done();
  }
});

test('the position bound holds every route point with its margin', () => {
  assert.equal(RAIL_ROUTE_POINTS.length, 55, 'grants, gates, the arrival, each leg section frame and rack');
  for (const p of RAIL_ROUTE_POINTS)
    for (const v of [p.x, p.y, p.z])
      assert.ok(Math.abs(v) + RAIL_POSITION_MARGIN <= RAIL_POSITION_MAX, `${p.x},${p.y},${p.z}`);
  assert.ok(RAIL_POSITION_MAX + RAIL_POSITION_MAX <= Number.MAX_SAFE_INTEGER);
});

test('railwayRequestEdit: the route ops come out in their exact wire shape', () => {
  const extra = { epoch: 9, request: 9, at: [0, 0, 0], ms: 1, junk: 'x', kind: 2, revision: 0 };
  assert.deepEqual(railwayRequestEdit({ op: 'rail.legStock', leg: 0, id: 1, ...extra }, 1, 2), {
    op: 'rail.legStock',
    epoch: 1,
    request: 2,
    leg: 0,
  });
  for (const op of ['rail.grant', 'rail.gate'])
    assert.deepEqual(railwayRequestEdit({ op, id: 0, leg: 1, ...extra }, 1, 2), { op, epoch: 1, request: 2, id: 0 });
});

// The guard: every field of RailAction (the type check below fails when one is added and not listed here) is sent on
// every client op; whatever the op's validation (railValid) or its rule (railApply) then reads that
// railwayRequestEdit dropped is a field the live server would lose. Reads made for every op (railValid's `kind`) are
// subtracted by an unknown op's baseline. Two passes (0 and 1 in each number) reach reads behind a first check.
const FIELDS = [
  'id',
  'n',
  'x',
  'z',
  'y',
  'yaw',
  'collapsed',
  'kind',
  'station',
  'revision',
  'rack',
  'site',
  'to',
  'dir',
  'train',
  'line',
  'part',
  'tk',
  'leg',
  'yard',
] as const satisfies readonly (keyof RailAction)[];
type Unlisted = Exclude<keyof RailAction, (typeof FIELDS)[number] | 'op' | 'epoch' | 'request'>;
const everyField: [Unlisted] extends [never] ? true : Unlisted = true;
const anywhere: Actor = { reach: () => true, height: () => true, cadence: () => true };

test('railwayRequestEdit: every field an op validates or applies survives the request', () => {
  assert.ok(everyField);
  const joined = buildSeedWorld('ring-joined');
  const lost = (op: string, v: number) => {
    const w = restore(joined.w);
    const a = w.get(Account, w.lookup(Account, 'a')!)!;
    const all: Obj = { op, station: 'T3', collapsed: false };
    for (const k of FIELDS) all[k] ??= v;
    const clean = railwayRequestEdit(all, a.epoch, a.request + 1);
    const read = new Set<string>();
    const watched = new Proxy(clean, {
      get(t, k, recv) {
        if (typeof k === 'string' && !Object.hasOwn(t, k)) read.add(k);
        return Reflect.get(t, k, recv) as unknown;
      },
    });
    railValid(w, watched, anywhere, joined.t);
    railApply(w, 'a', watched, joined.t);
    return read;
  };
  const missing: string[] = [];
  for (const v of [0, 1]) {
    const baseline = lost('rail.none', v);
    for (const op of RAIL_ACTIONS) for (const k of lost(op, v)) if (!baseline.has(k)) missing.push(`${op} reads ${k}`);
  }
  assert.deepEqual([...new Set(missing)], [], 'fields the request drops');
});

test('spacing host: Ring Island holds while the gap ahead is short, then dispatches', async () => {
  const r = await host('ring-spacing', fixture('steel-home'));
  try {
    // Isolate general spacing from the minimum departure interval. The retained room setting survives a checkpoint.
    setTune(r.tune, 'railTrainHeadPct', 0);
    await r.restart();
    assert.equal(r.tune.v.railTrainHeadPct, 0);
    const stops = stopsOf(r.w, LINE2);
    const ring = stops.length - 1;
    assert.equal(RAIL_LINES[LINE2]!.halts[ring]!.name, 'Ring Island');
    let held = -1;
    for (let t = 0; t < 4000; t++) {
      const rows = (slot: number) => train(r.w, slot);
      const slot = LINE_SLOTS[LINE2]!.find(j => {
        const x = rows(j);
        return x.phase === TRAIN_PHASE.STAND && x.at === ring &&
          r.tick + 1 >= x.depart + TRAIN.dwellTicks &&
          balancedHold({ row: rows, line: l => line(r.w, l), headExempt: () => false }, LINE2, stops, j, ring, r.tick + 1);
      });
      await r.ticks(1);
      assert.equal(trainSpacing(rows, l => stopsOf(r.w, l), r.tick), null);
      if (held >= 0 && rows(held).phase === TRAIN_PHASE.RUN) return;
      if (slot !== undefined && rows(slot).phase === TRAIN_PHASE.STAND) {
        const gaps = trainGaps(rows, LINE2, stops, slot, r.tick)!;
        assert.ok(gaps.ahead < gaps.behind);
        held = slot;
      }
    }
    assert.fail('Ring Island must hold for spacing and release within the run');
  } finally {
    await r.done();
  }
});

// Review of the carrier-leaves net case (Checkpoint A): a leaver who never comes back holds the yard's kit for good (no
// carry grace covers it). The island must not stall: the bill's need counts no back, so line 2 brings the kit again and
// a present player lights the works with the leaver still gone.
test("steel host (review): a leaver holding the kit's 8 logs and 12 rails forever does not stall the works", async () => {
  const r = await host('kit-leaver', fixture('steel-kit'), { s: 'a', t: 'b' });
  try {
    assert.equal(await r.action({ op: 'rail.steelTake', kind: 1 }, spot(RING_STEEL_YARD), 't'), 'accepted');
    assert.equal(await r.action({ op: 'rail.steelTake', kind: 0 }, spot(RING_STEEL_YARD), 't'), 'accepted');
    const held = account(r.w, 'b')!;
    // With the yoke (16 rails a back) one take lifts the kit's 12 rails: the leaver holds the whole kit.
    const kit = { logs: STEEL.logs, rails: STEEL.rails };
    assert.deepEqual({ logs: held.carry, rails: held.rails }, kit, 'all logs, all rails');
    r.depart('t');
    r.later(r.grace());
    await r.ticks(3);
    assert.deepEqual({ logs: account(r.w, 'b')!.carry, rails: account(r.w, 'b')!.rails }, kit);
    assert.deepEqual(steelNeed(r.w), kit, 'owed again with the leaver gone');
    for (let k = 0; steel(r.w).lit < 0; k++) {
      assert.ok(
        k < 200,
        `lit in time (yard ${steel(r.w).yardLogs}/${steel(r.w).yardRails}, bill ${steel(r.w).logs}/${steel(r.w).rails})`,
      );
      if (steel(r.w).yardLogs + steel(r.w).yardRails > 0) {
        for (const kind of [0, 1]) await r.action({ op: 'rail.steelTake', kind }, spot(RING_STEEL_YARD));
        await r.action({ op: 'rail.steel' }, spot(RING_STEEL_WORKS));
      }
      await r.ticks(50);
    }
    assert.deepEqual({ logs: account(r.w, 'b')!.carry, rails: account(r.w, 'b')!.rails }, kit, 'still on the leaver');
    assert.equal(invariant(r.w), null);
  } finally {
    await r.done();
  }
});

// ---------------------------------------------------------------- garage step 4 (v67)
// The trade on the real host: rail.bring and a trade line's rail.install through r:edit, judged at the table's reach,
// malformed ones refused without a throw, a same-tick race won once, replicated, and the state back after a restart
// with nothing applied twice (the revision and the spend as they were).
const BAYL = ROW_LINE.bay,
  NSL = ROW_LINE.ns;
const bring = (line: unknown, revision: unknown) => ({ op: 'rail.bring', line, revision });
/** Both trades open: the file's PAID_GORGE (High Gorge reached by accepted ops, all twelve steel home) played on
 * through the leg seed's own steps to bay-mid, on an unaudited copy. Built lazily, inside the test that uses it. */
let tradeSeed: Seed | undefined;
const tradeFixture = () => (tradeSeed ??= legStagesOn(unaudited(PAID_GORGE), 'gorge-reached', 'bay-mid'));

test('trade host: a bring and Strong cross r:edit, race once, replicate and survive a restart unrepeated', async () => {
  const r = await host('trade', tradeFixture(), { s: 'a', peer: 'b' });
  try {
    const mirror = r.connect('viewer');
    assert.equal(await r.action(bring(BAYL, 0), away(SHED_TABLE)), 'rejected', 'out of reach');
    for (const e of [bring(-1, 0), bring(RAIL_LINES.length, 0), bring('3', 0), bring(BAYL, -1), bring(BAYL, 1.5)])
      assert.equal(await r.action(e, spot(SHED_TABLE)), 'rejected');
    for (const e of [install(0, LINE2, 5), install(0, BAYL, 2), install(0, BAYL, 7), install(-1, BAYL, 6), install('0', BAYL, 6)])
      assert.equal(await r.action(e, spot(SHED_TABLE)), 'rejected');
    assert.equal(await r.action(install(0, BAYL, 6), spot(SHED_TABLE)), 'noop', "line 2's copy is on the table");
    assert.deepEqual(
      await r.race([
        [bring(BAYL, 0), spot(SHED_TABLE), 's'],
        [bring(NSL, 0), spot(SHED_TABLE), 'peer'],
      ]),
      ['accepted', 'noop'],
      'one bring a revision',
    );
    assert.equal(await r.action(install(0, BAYL, 6), spot(SHED_TABLE)), 'noop', "the copies' swap holds the table");
    await r.ticks(BRING_TICKS);
    assert.deepEqual(
      await r.race([
        [install(0, BAYL, 6), spot(SHED_TABLE), 's'],
        [install(0, BAYL, 5), spot(SHED_TABLE), 'peer'],
      ]),
      ['accepted', 'noop'],
      'the first fit wins the race',
    );
    const spent = shed(r.w).spent;
    await r.ticks(3);
    for (const w of [r.w, mirror()!]) {
      assert.deepEqual([line(w, BAYL).boiler, line(w, BAYL).rev], [5, 1]);
      assert.deepEqual([shed(w).tableLine, shed(w).bringRev], [BAYL, 1]);
      assert.equal(shed(w).spent, spent);
    }
    const fitted = line(r.w, BAYL).fitted,
      brought = shed(r.w).brought;
    await r.restart();
    await r.ticks(3);
    assert.deepEqual(
      [line(r.w, BAYL).boiler, line(r.w, BAYL).rev, line(r.w, BAYL).fitted],
      [5, 1, fitted],
      'the fit comes back, applied once',
    );
    assert.deepEqual([shed(r.w).tableLine, shed(r.w).bringRev, shed(r.w).brought, shed(r.w).spent], [BAYL, 1, brought, spent]);
    const late = r.connect('late');
    await r.ticks(3);
    assert.deepEqual([line(late()!, BAYL).boiler, shed(late()!).tableLine], [5, BAYL]);
    assert.equal(shed(late()!).spent, spent);
  } finally {
    await r.done();
  }
});
