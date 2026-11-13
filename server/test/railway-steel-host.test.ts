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
import { SHED_TABLE } from '../../src/sim/railway-works-layout.ts';
import { railwayAtSteel, type SteelStage } from '../../src/sim/railway-seed-steel.ts';
import { buildSeedWorld, invariant, line, steel, type Seed } from '../../test/helpers/rail.ts';
import { rail } from '../../src/sim/railway-rows.ts';
import {
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  RAIL_POSITION_MARGIN,
  RAIL_POSITION_MAX,
  RAIL_ROUTE_POINTS,
  legFrame,
  legRack,
} from '../../src/sim/railway-route.ts';
import { legKitNeed, legRow, routeRow } from '../../src/sim/railway-queries-route.ts';
import { act, apply, railTick, restore, trees } from '../../test/helpers/rail.ts';
import { RAILWAY_SOURCES } from '../../src/sim/railway-layout.ts';
import { railApply } from '../../src/sim/railway-systems.ts';
import { Account, Pile } from '../../src/sim/railway-components.ts';
import type { RailAction } from '../../src/sim/railway.ts';
import { RAIL_ACTIONS, railValid, type Actor } from '../../src/world/railway-server.ts';
import { railwayRequestEdit } from '../src/host/railway-requests.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import { train } from '../../src/sim/railway-rows.ts';
import { LINE_SLOTS } from '../../src/sim/railway-trains.ts';
import { TRAIN_PHASE, trainAlong } from '../../src/sim/railway-train.ts';
import { railLinePoint } from '../../src/sim/railway-line-path.ts';
import { RAIL_HALTS, trainPassesBy } from '../../src/sim/railway-lines.ts';
import { stopsOf } from '../../src/sim/railway-queries.ts';

type Obj = Record<string, unknown>;
type At = [number, number, number];

/** A real host on a temp store, loaded with an accepted fixture; actions go through r:edit with their actor's spot. */
async function host(name: string, fixture: Seed, players: Record<string, string> = { s: 'a' }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `boogle-steel-${name}-`));
  const store = createStore({ dataDir: dir, maxRooms: 2 });
  await store.init();
  let now = 1800000000000;
  const sent: Obj[] = [];
  const h = createRailwayWorldHost({
    roomId: railwayRoomId(`steel-${name}`),
    store,
    tick: false,
    now: () => now,
    pidOf: (sid) => players[sid] ?? null,
    positions: () => [],
  });
  h.onSend((m) => sent.push(m));
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
    depart: (sid: string) => h.depart(sid),
    grace: () => h.rules.tune.get('railBeamGraceS') * 1000,
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
const install = (revision: unknown = 0, line = 1, part = 1) => ({ op: 'rail.install', line, part, revision });

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
    for (const part of [0, 2, '1', null])
      assert.equal(await r.action(install(0, 1, part as number), spot(SHED_TABLE)), 'rejected', `part ${part}`);
    for (const revision of [2, -1, 0.5, '0', null, undefined])
      assert.equal(
        await r.action({ op: 'rail.install', line: 1, part: 1, revision }, spot(SHED_TABLE)),
        'rejected',
        `revision ${revision}`,
      );
    assert.equal(line(r.w, 1).boiler, 0, 'nothing installed');
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
    assert.deepEqual([line(r.w, 1).boiler, line(r.w, 1).fitted >= 0], [1, true], 'line 2 fitted');
    assert.equal(await r.action(install(), spot(SHED_TABLE), 't'), 'noop', 'the second press saw a stale fit');
    assert.equal(await r.action(install(1), spot(SHED_TABLE), 't'), 'noop', 'already the longer boiler');
    // The fourth car (R3a): the car is drawn from the replicated row's `boiler`, so the one fact to prove is that a
    // line 2 train takes the fit standing at the Village and that row reaches a client and a late joiner.
    const seen = r.connect('c');
    const village = (w: typeof r.w, k: number) =>
      train(w, k).phase === TRAIN_PHASE.STAND && train(w, k).at === 0 && train(w, k).boiler === 1;
    let fitted = -1;
    for (let t = 0; fitted < 0; t++) {
      assert.ok(t < 3000, 'a line 2 train stands fitted at the Village');
      await r.ticks(1);
      fitted = LINE_SLOTS[1]!.find((k) => village(r.w, k)) ?? -1;
    }
    await r.ticks(2);
    assert.equal(train(seen()!, fitted).boiler, 1, 'the replicated row wears the longer boiler');
    const joiner = r.connect('late');
    await r.ticks(3);
    assert.ok(joiner(), "the joiner's snapshot is whole");
    assert.equal(train(joiner()!, fitted).boiler, 1, "and its row wears it: the joiner's train has the steel car");
    for (const k of LINE_SLOTS[1]!)
      assert.equal(train(joiner()!, k).boiler, train(r.w, k).boiler, `train ${k}: the joiner's row is the host's`);
  } finally {
    await r.done();
  }
});

// The fourth car (R3b): a rider on the steel car of the wagon's train (11.1 m behind the pose, RIDER_SPAN) asks for
// the quarry as a real r:edit, standing at the Village: accepted. From 22 m behind (past the rider's 10 m of reach
// and the train's 11.1 m): refused. No new op; this is the reach the steel car's deck leans on.
test('steel host: a rider asks from the steel car of the wagon train, 11.1 m behind its pose; 22 m is out of reach', async () => {
  const r = await host('steel-car-call', fixture('steel-home'));
  try {
    assert.equal(await r.action(install(), spot(SHED_TABLE)), 'accepted');
    const k = LINE_SLOTS[1]!.find((s) => train(r.w, s).wagon);
    assert.ok(k !== undefined, 'the wagon is on a line 2 train');
    // It takes the fit at its next Village stand: fitted, it has the steel car.
    const fitted = () => train(r.w, k).phase === TRAIN_PHASE.STAND && train(r.w, k).at === 0 && train(r.w, k).boiler;
    for (let t = 0; !fitted(); t++) {
      assert.ok(t < 3000, 'the wagon train stands fitted at the Village');
      await r.ticks(1);
    }
    const along = trainAlong(train(r.w, k), 1, r.tick),
      y = RAIL_HALTS[2]!.platforms[0].y;
    // Straight back from the pose along the steel car's line (line 2 itself ends 18.25 m behind, at the table), in
    // whole centimetres as a client sends its position.
    const pose = railLinePoint(1, along),
      deck = railLinePoint(1, along - 1110);
    const behind = (cm: number): At => [
      Math.round(pose.x + ((deck.x - pose.x) * cm) / 1110),
      y,
      Math.round(pose.z + ((deck.z - pose.z) * cm) / 1110),
    ];
    // A halt up the line this train stops at on request (not an end, not one it passes by now the Pier is open).
    const stops = stopsOf(r.w, 1),
      id = RAIL_HALTS.findIndex(
        (h) => h.line === 1 && h.stop > 0 && h.stop < stops.length - 1 && !trainPassesBy(1, h.stop, 1, stops.length),
      );
    assert.ok(id >= 0, 'a request halt up line 2');
    const ask = { op: 'rail.call', id, dir: 1, train: k };
    assert.equal(await r.action(ask, behind(2200)), 'rejected', '22 m behind the pose: beside no car');
    assert.equal(await r.action(ask, behind(1110)), 'accepted', "on the steel car's deck");
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

/** Leg 1 laid to its end by apply alone (players a and b feed every tick), so its pickup can be taken. */
function legDone(): Seed {
  const j = buildSeedWorld('ring-joined');
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
  const r = await host('pick', legDone());
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
