// The greybox route's rules (docs/plans/greybox-route.md, step 3; src/sim/railway-sys-route.ts, railway-sys-route-kit.ts,
// railway-queries-route.ts, railway-check-route.ts): line 2 grown on to High Gorge, the closed rows, the fleet by stage,
// each op's refusals (rules and the server's validation), a section laying and the railhead moving, the Gorge opening on
// the fourth, `pick` refused before it and granted after, the kit running ahead one kit a train, conservation, the load
// check's refusals, what is replicated, and the trains fuzz on the grown line.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import {
  Account,
  Aperture,
  Leg,
  LegYard,
  Rail,
  Yard,
  RAIL_REPLICATED,
  Route,
  Train,
  createRailwayWorld,
} from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { LINE2, RAIL_HALTS, RAIL_LINES, RAIL_TRAINS, legBuilt } from '../src/sim/railway-lines.ts';
import {
  LEG_TUNE,
  RAIL_ARRIVAL,
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  ROW_LINE,
  legFrame,
  legS,
  ROW_SHIFT,
  rowPoint,
} from '../src/sim/railway-route.ts';
import { WORLD_LINES } from '../src/sim/railway-world-lines.ts';
import { RING_END, RING_S_HEAD, ringAt } from '../src/sim/railway-ring-layout.ts';
import { TRAIN, TRAIN_PHASE, fleetOf, trainDir, trainStopsOf } from '../src/sim/railway-train.ts';
import { LINE_SLOTS, servingSlots, trainSpacing } from '../src/sim/railway-trains.ts';
import { railTick } from '../src/sim/railway-systems.ts';
import { rail, train, trains } from '../src/sim/railway-rows.ts';
import { stopsOf } from '../src/sim/railway-queries.ts';
import { legKitNeed, legKitWaiting, legRow, legsLaid, routeRow } from '../src/sim/railway-queries-route.ts';
import { freightStop } from '../src/sim/railway-queries-trade.ts';
import { TRADE } from '../src/sim/railway-trade-layout.ts';
import { RAIL_PREDICTED, railPredict } from '../src/world/railway-predict.ts';
import { railCounts } from '../src/sim/railway-queries-line2.ts';
import { RAILWAY_SUPPLY } from '../src/sim/railway-layout.ts';
import { railValid, type Actor } from '../src/world/railway-server.ts';
import { act, advance, buildSeedWorld, chopTo, invariant, restore, unaudited, type Seed } from './helpers/rail.ts';
import { checkRoute } from '../src/sim/railway-check-route.ts';
import { fuzzTicks } from './helpers/fuzz.ts';

const STACK = 0;
const LEG = RAIL_LEGS[STACK]!;
const N = LEG.sections.length;
const halt = (name: string) => RAIL_LINES[LINE2]!.halts.findIndex((h) => h.name === name);
const RING = halt('Ring Island'),
  HEAD = halt('Stack railhead'),
  GORGE = halt('High Gorge');
const haltId = (line: number, stop: number) => RAIL_HALTS.findIndex((h) => h.line === line && h.stop === stop);
// Built at module scope, outside the test timeout (as the golden shards do).
const LEAF = buildSeedWorld('leaf-raised');
const JOINED = buildSeedWorld('ring-joined');
const copy = (s: Seed): Seed => ({ w: restore(s.w), t: s.t });
const plain = (w: World) => {
  const out = createRailwayWorld();
  out.load(JSON.parse(JSON.stringify(w.snapshot())));
  return out;
};
const actorAt = (p: { x: number; y: number; z: number }): Actor => ({
  reach: (x, z, r) => Math.hypot(x - p.x, z - p.z) <= r,
  height: (y, r) => Math.abs(y - p.y) <= r,
  cadence: () => true,
});
const nowhere: Actor = { reach: () => false, height: () => false, cadence: () => true };
const anywhere: Actor = { reach: () => true, height: () => true, cadence: () => true };
const op = (o: string, f: Record<string, unknown> = {}) => ({ op: o, epoch: 0, request: 0, ...f }) as never;

/** Players a and b take what the leg's rack holds and feed the frame, every tick, until the current section starts to
 * lay; then until it is laid. Returns the tick the frame was full. */
function feedSection(s: Seed, k = STACK) {
  const was = legRow(s.w, k).laid;
  for (let guard = 0; legRow(s.w, k).start < 0; guard++) {
    assert.ok(guard < 6000, `section ${was} never fed`);
    for (const pid of ['a', 'b']) {
      act(s, pid, 'rail.depotTake');
      act(s, pid, 'rail.depotRailTake');
      act(s, pid, 'rail.legStock', { leg: k });
    }
    if (legRow(s.w, k).start < 0) advance(s, 1);
  }
  const full = s.t;
  while (legRow(s.w, k).laid === was) advance(s, 1);
  return full;
}

// ---------------------------------------------------------------- the catalog
test('line 2 grows on past Ring Island to the stack railhead and High Gorge; ns, bay and cave are lines 2 to 4, shut', () => {
  assert.deepEqual(
    RAIL_LINES.map((l) => l.id),
    ['line1', 'line2', 'ns', 'bay', 'cave'],
  );
  assert.equal(ROW_LINE.ring, LINE2);
  const line2 = RAIL_LINES[LINE2]!;
  assert.deepEqual(line2.halts.map((h) => h.name).slice(5), ['Ring Island', 'Stack railhead', 'High Gorge']);
  assert.equal(LEG.railheadHalt, HEAD);
  // The railhead's heads stand 10 m short of each laid end but the last; the Gorge at the leg's end; s in order.
  assert.deepEqual(
    line2.halts[HEAD]!.heads,
    LEG.sections.slice(0, -1).map((s) => legS(LEG, s.toCm) - 1000),
  );
  assert.equal(line2.halts[GORGE]!.s, legS(LEG, LEG.sections.at(-1)!.toCm));
  assert.equal(line2.halts[RING]!.s, legS(LEG, LEG.fromCm), 'the leg starts at Ring Island (row cm less 100)');
  for (let k = 1; k < line2.halts.length; k++) assert.ok(line2.halts[k]!.s > line2.halts[k - 1]!.s);
  assert.equal(line2.path.length / 2 - 1, Math.floor(legS(LEG, 325140) / 1000), 'the path runs past the buffers');
  for (const id of ['ns', 'bay', 'cave'] as const) {
    const l = RAIL_LINES[ROW_LINE[id]]!;
    assert.equal(l.id, id);
    assert.ok(l.halts.every((h) => h.shut) && l.trains === 0, `${id}: every halt shut, no train`);
    assert.deepEqual(trainStopsOf(ROW_LINE[id], 7, { head: 7, joined: true }, [N, 2, 2, 3, 3, 6, 1, 1]), []);
  }
  assert.deepEqual(
    RAIL_LEGS.map((_l, k) => legBuilt(k)),
    [true, false, false, false, false, false, false, false],
    'step 3 builds the stack leg only',
  );
});

test('the ring row counts 100 cm ahead of line 2: the shift is the catalog row against RING_S_HEAD, the same places', () => {
  const ring = WORLD_LINES.find((l) => l.id === 'ring')!;
  assert.equal(ROW_SHIFT.ring, ring.fromCm - RING_S_HEAD);
  assert.equal(
    ROW_SHIFT.ring,
    100,
    'regenerating the catalog changes this: check the stack line still stands where it is drawn',
  );
  assert.deepEqual([ROW_SHIFT.ns, ROW_SHIFT.bay, ROW_SHIFT.cave], [0, 0, 0]);
  // The Ring Island halt: the row's stop less the shift is line 2's, and both are the ring layout's u 448 m.
  assert.equal(legS(LEG, ring.stops[0]!), RING_END.s);
  const at = ringAt(RING_END.u),
    row = rowPoint('ring', ring.stops[0]!);
  assert.ok(Math.hypot(row.x - at.x, row.z - at.z) <= 100, 'the same place within 1 m');
  // Line 2's path past s 1220 m is the row read at s + shift (its first sample, and the Gorge's halt).
  const k = 122;
  const p0 = rowPoint('ring', 122000 + ROW_SHIFT.ring);
  assert.deepEqual([RAIL_LINES[LINE2]!.path[2 * k], RAIL_LINES[LINE2]!.path[2 * k + 1]], [p0.x, p0.z]);
});

test('the fleet: 3, then 5 from the first section laid (ruling A.4); the fourth and fifth rows start in the shed', () => {
  assert.deepEqual(
    Array.from({ length: N + 1 }, (_v, n) => fleetOf(LINE2, [n])),
    [3, 5, 5, 5, 5],
  );
  assert.deepEqual(
    RAIL_TRAINS.map((t) => [t.line, !!t.shed]),
    [
      [0, false],
      [1, false],
      [1, false],
      [1, false],
      [1, true],
      [1, true],
    ],
  );
  const w = createRailwayWorld();
  assert.deepEqual(
    trains(w).map((r) => r.phase),
    [0, 0, 0, 0, TRAIN_PHASE.SHED, TRAIN_PHASE.SHED],
  );
  // Spawned last, in catalog order, nothing laid.
  assert.equal(w.count(Leg), RAIL_LEGS.length);
  assert.equal(w.count(LegYard), 1);
  assert.deepEqual(w.get(Route, w.single(Route)), { grants: 0, gates: 0, arrived: -1 });
  assert.ok(w.ids(Leg).every((id) => w.ids(Train).every((t) => t < id)));
  railwayCheck(w);
});

test('the stops: the railhead opens with the first section and moves on; the Gorge opens on the fourth', () => {
  const joined = { head: 7, joined: true };
  const base = trainStopsOf(LINE2, 7, joined);
  assert.equal(base.length, RING + 1);
  const heads = RAIL_LINES[LINE2]!.halts[HEAD]!.heads!;
  assert.deepEqual(trainStopsOf(LINE2, 7, joined, [1]), [...base, heads[0]]);
  assert.deepEqual(trainStopsOf(LINE2, 7, joined, [2]), [...base, heads[1]]);
  assert.deepEqual(trainStopsOf(LINE2, 7, joined, [3]), [...base, heads[2]]);
  assert.deepEqual(trainStopsOf(LINE2, 7, joined, [4]), [...base, heads[2], RAIL_LINES[LINE2]!.halts[GORGE]!.s]);
  // Not before the rivet, whatever the row says (a leg halt opens only after every halt before it).
  assert.deepEqual(
    trainStopsOf(LINE2, 7, { head: 7, joined: false }, [4]),
    trainStopsOf(LINE2, 7, { head: 7, joined: false }),
  );
});

// ---------------------------------------------------------------- the rules' refusals
test('rail.legStock is refused before the rivet, for a malformed or unbuilt leg, an empty back and while laying', () => {
  const s = copy(LEAF);
  assert.equal(act(s, 'a', 'rail.legStock', { leg: STACK }), 0, 'before the rivet: the leg is not open');
  const j = copy(JOINED);
  for (const leg of [-1, RAIL_LEGS.length, 1.5, Number.NaN, -0, 2 ** 60, '0', null, undefined])
    assert.equal(act(j, 'a', 'rail.legStock', { leg } as never), 0, `leg ${String(leg)}`);
  for (let k = 1; k < RAIL_LEGS.length; k++)
    assert.equal(act(j, 'a', 'rail.legStock', { leg: k }), 0, `leg ${k}: not built`);
  assert.equal(act(j, 'a', 'rail.legStock', { leg: STACK }), 0, 'an empty back');
  // Fill the frame: the last unit starts it laying; a repeat is refused until it is laid.
  feedSectionStart(j);
  assert.ok(legRow(j.w, STACK).start >= 0);
  chopTo(j, 'a', 4);
  assert.ok(acc(j, 'a').carry > 0);
  assert.equal(act(j, 'a', 'rail.legStock', { leg: STACK }), 0, 'refused while laying');
  assert.ok(legRow(j.w, STACK).start >= 0, 'still laying');
});
const acc = (s: Seed, pid: string) => s.w.get(Account, s.w.lookup(Account, pid)!)!;
/** feedSection up to the frame full (not laid). */
function feedSectionStart(s: Seed) {
  for (let guard = 0; legRow(s.w, STACK).start < 0; guard++) {
    assert.ok(guard < 6000);
    for (const pid of ['a', 'b']) {
      act(s, pid, 'rail.depotTake');
      act(s, pid, 'rail.depotRailTake');
      act(s, pid, 'rail.legStock', { leg: STACK });
    }
    if (legRow(s.w, STACK).start < 0) advance(s, 1);
  }
}

test('a section lays LEG_TUNE.layTicks after its frame is full, and the railhead halt opens and moves on', () => {
  const s = copy(JOINED);
  assert.equal(stopsOf(s.w, LINE2).length, RING + 1);
  feedSectionStart(s);
  const start = legRow(s.w, STACK).start;
  assert.equal(start, s.t);
  while (s.t < start + LEG_TUNE.layTicks - 1) advance(s, 1);
  assert.equal(legRow(s.w, STACK).laid, 0, 'not one tick early');
  advance(s, 1);
  assert.deepEqual(
    { ...legRow(s.w, STACK) },
    { ...legRow(s.w, STACK), laid: 1, logs: 0, rails: 0, start: -1 },
    'laid, the frame emptied',
  );
  const heads = RAIL_LINES[LINE2]!.halts[HEAD]!.heads!;
  assert.equal(stopsOf(s.w, LINE2).at(-1), heads[0], 'the railhead is the end');
  feedSection(s);
  assert.equal(stopsOf(s.w, LINE2).at(-1), heads[1], 'it moved on');
  assert.equal(invariant(s.w), null);
});

test("High Gorge opens on the fourth; `pick` is refused before it and granted after, once; the incline's barrier waits for leg 2", () => {
  const s = copy(JOINED);
  const pick = RAIL_GRANTS.findIndex((g) => g.id === 'pick'),
    incline = RAIL_GATES.findIndex((g) => g.id === 'incline');
  for (let k = 0; k < N; k++) {
    assert.equal(act(s, 'a', 'rail.grant', { id: pick }), 0, `pick refused at ${k} laid`);
    assert.equal(stopsOf(s.w, LINE2).length, RING + 1 + Math.min(1, k));
    feedSection(s);
  }
  assert.equal(stopsOf(s.w, LINE2).length, GORGE + 1, 'the Gorge is open');
  assert.equal(stopsOf(s.w, LINE2).at(-1), RAIL_LINES[LINE2]!.halts[GORGE]!.s);
  assert.equal(act(s, 'a', 'rail.gate', { id: incline }), 0, 'the incline barrier needs pick');
  assert.equal(act(s, 'a', 'rail.grant', { id: pick }), 1);
  assert.equal(act(s, 'a', 'rail.grant', { id: pick }), 0, 'once');
  assert.equal(routeRow(s.w).grants, 1 << pick);
  for (const id of [1, 2, 3])
    assert.equal(act(s, 'a', 'rail.grant', { id }), 0, `${RAIL_GRANTS[id]!.id}: its leg is not laid`);
  assert.equal(act(s, 'a', 'rail.gate', { id: incline }), 0, "held, but leg 2's rules are not built");
  assert.equal(act(s, 'a', 'rail.legStock', { leg: STACK }), 0, 'the leg is complete');
  // Nothing more is owed: every kit unloaded (or rides on, surplus to no section).
  assert.deepEqual(legKitNeed(s.w, STACK), { logs: 0, rails: 0 });
  assert.equal(invariant(s.w), null);
});

test('rail.grant, rail.gate and rail.arrive refuse malformed ids and never throw; arrive waits for the causeway', () => {
  const s = copy(JOINED);
  for (const id of [-1, RAIL_GRANTS.length, 0.5, Number.NaN, '0', null, undefined, 2 ** 53])
    assert.equal(act(s, 'a', 'rail.grant', { id } as never), 0, `grant ${String(id)}`);
  for (const id of [-1, RAIL_GATES.length, 0.5, Number.NaN, '0', null, undefined])
    assert.equal(act(s, 'a', 'rail.gate', { id } as never), 0, `gate ${String(id)}`);
  for (let id = 0; id < RAIL_GATES.length; id++)
    assert.equal(act(s, 'a', 'rail.gate', { id }), 0, `gate ${id}: no grant`);
  assert.equal(act(s, 'a', 'rail.arrive'), 0, 'the causeway is not laid');
  assert.equal(act(s, 'a', 'rail.arrive', { id: 3, leg: 7 } as never), 0);
  assert.equal(routeRow(s.w).arrived, -1);
});

// ---------------------------------------------------------------- the server's validation
test("the server: each op's ids are catalog indexes, judged at the frame, post or marker; a malformed one is refused, never thrown", () => {
  const s = copy(JOINED);
  for (const leg of [-1, RAIL_LEGS.length, 1.5, Number.NaN, '0', null, undefined])
    assert.equal(railValid(s.w, op('rail.legStock', { leg }), anywhere), false, `legStock ${String(leg)}`);
  for (const id of [-1, RAIL_GRANTS.length, 1.5, '0', null])
    assert.equal(railValid(s.w, op('rail.grant', { id }), anywhere), false);
  for (const id of [-1, RAIL_GATES.length, 1.5, '0', null])
    assert.equal(railValid(s.w, op('rail.gate', { id }), anywhere), false);
  // The frame of the current section, and nowhere else.
  const frame = legFrame(LEG, 0);
  assert.equal(railValid(s.w, op('rail.legStock', { leg: STACK }), actorAt(frame)), true);
  assert.equal(railValid(s.w, op('rail.legStock', { leg: STACK }), actorAt(legFrame(LEG, 1))), false, 'the next frame');
  assert.equal(
    railValid(s.w, op('rail.legStock', { leg: STACK }), actorAt({ ...frame, y: frame.y + 1000 })),
    false,
    'below',
  );
  assert.equal(railValid(s.w, op('rail.legStock', { leg: STACK }), nowhere), false);
  // The leg's rack (Q6's and Q7's depot racks, once the Q jobs are done) at its frame; none before the rivet.
  assert.equal(railValid(s.w, op('rail.depotTake'), actorAt(frame)), true);
  assert.equal(railValid(s.w, op('rail.depotRailTake'), actorAt(frame)), true);
  assert.equal(railValid(s.w, op('rail.depotTake'), actorAt(legFrame(LEG, 2))), false);
  assert.equal(railValid(LEAF.w, op('rail.depotTake'), anywhere), false, 'no rack before the leg opens');
  RAIL_GRANTS.forEach((g, id) => {
    assert.equal(railValid(s.w, op('rail.grant', { id }), actorAt(g.at)), true, g.id);
    assert.equal(railValid(s.w, op('rail.grant', { id }), nowhere), false, g.id);
  });
  RAIL_GATES.forEach((g, id) => {
    assert.equal(railValid(s.w, op('rail.gate', { id }), actorAt(g.at)), true, g.id);
    assert.equal(railValid(s.w, op('rail.gate', { id }), nowhere), false, g.id);
  });
  assert.equal(railValid(s.w, op('rail.arrive'), actorAt(RAIL_ARRIVAL)), true);
  assert.equal(railValid(s.w, op('rail.arrive'), nowhere), false);
  // The stack railhead's lever is judged where its head stands now.
  const t = copy(JOINED);
  feedSection(t);
  feedSection(t);
  const id = haltId(LINE2, HEAD),
    plats = RAIL_LINES[LINE2]!.halts[HEAD]!.headPlatforms!;
  assert.equal(railValid(t.w, op('rail.call', { id, dir: -1 }), actorAt(plats[1]!)), true);
  assert.equal(railValid(t.w, op('rail.call', { id, dir: -1 }), actorAt(plats[0]!)), false);
});

// ---------------------------------------------------------------- the kit
/** Gate 16: kit units loaded equal units aboard, racked, fed, laid and on backs (the rack and backs hold none at the
 * rivet), logs and rails. */
function kitEquality(w: World) {
  const g = legRow(w, STACK);
  let logs = g.logs,
    rails = g.rails;
  for (const sec of LEG.sections.slice(0, g.laid)) [logs, rails] = [logs + sec.logs, rails + sec.rails];
  for (const r of trains(w)) [logs, rails] = [logs + r.logs, rails + r.rails];
  w.each([Account], (_id, a) => ((logs += a.carry), (rails += a.rails)));
  return [g.loadedLogs - logs - rail(w).depot, g.loadedRails - rails - rail(w).depotRails];
}
test('the idle room (ruling B, gate 13): at rest by +1,500, kit 1 racked, two kit trains, one kit car empty, 60 and 60 loaded; then nothing moves', () => {
  const s = unaudited(copy(JOINED));
  assert.deepEqual([rail(s.w).depot, rail(s.w).depotRails], [0, 0]);
  const backs = trains(s.w).length && kitEquality(s.w);
  for (let k = 0; k < 1500; k++) {
    advance(s, 1);
    assert.deepEqual(kitEquality(s.w), backs, `kit units at +${k + 1}`);
  }
  const carriers = LINE_SLOTS[LINE2]!.filter((k) => train(s.w, k).logs + train(s.w, k).rails > 0);
  const empty = servingSlots((j) => train(s.w, j), LINE2).filter((k) => !carriers.includes(k));
  assert.deepEqual([rail(s.w).depot, rail(s.w).depotRails], [20, 20], 'kit 1 racked');
  assert.equal(carriers.length, 2, 'two kit trains (the running three less one)');
  assert.ok(empty.length >= 1, 'a kit car empty');
  assert.ok(
    carriers.every((k) => train(s.w, k).logs === 20 && train(s.w, k).rails === 20),
    'one kit a train',
  );
  assert.deepEqual(
    [legRow(s.w, STACK).loadedLogs, legRow(s.w, STACK).loadedRails],
    [60, 60],
    'the fourth kit not loaded',
  );
  const rest = JSON.stringify([
    legRow(s.w, STACK),
    rail(s.w).depot,
    rail(s.w).depotRails,
    trains(s.w).map((r) => [r.logs, r.rails]),
  ]);
  for (let k = 0; k < 3000; k++) {
    advance(s, 1);
    if (k % 100 === 0)
      assert.equal(
        JSON.stringify([
          legRow(s.w, STACK),
          rail(s.w).depot,
          rail(s.w).depotRails,
          trains(s.w).map((r) => [r.logs, r.rails]),
        ]),
        rest,
        `no change at rest, +${1501 + k}`,
      );
  }
  assert.ok(legKitNeed(s.w, STACK).logs > 0, 'the fourth kit is still owed: only the cap holds it');
  assert.equal(invariant(s.w), null);
});
test('kitTrains: at most the running trains less one carry kit, whatever is owed; a fed leg still lays through', () => {
  const s = unaudited(copy(JOINED));
  for (let k = 0; k < N; k++) {
    for (let guard = 0; legRow(s.w, STACK).laid === k; guard++) {
      assert.ok(guard < 6000);
      if (legRow(s.w, STACK).start < 0)
        for (const pid of ['a', 'b']) {
          act(s, pid, 'rail.depotTake');
          act(s, pid, 'rail.depotRailTake');
          act(s, pid, 'rail.legStock', { leg: STACK });
        }
      advance(s, 1);
      const running = servingSlots((j) => train(s.w, j), LINE2).length,
        carrying = LINE_SLOTS[LINE2]!.filter((j) => train(s.w, j).logs + train(s.w, j).rails > 0).length;
      assert.ok(carrying <= running - 1, `${carrying} kit trains of ${running} at ${s.t}`);
      assert.deepEqual(kitEquality(s.w), [0, 0], `kit units at ${s.t}`);
    }
  }
  assert.deepEqual(legKitNeed(s.w, STACK), { logs: 0, rails: 0 });
  assert.equal(invariant(s.w), null);
});

test('conservation and the load check hold through the whole leg, the world round-tripping through a save', () => {
  const s = copy(JOINED);
  for (let k = 0; k < N; k++) {
    feedSection(s);
    railwayCheck(plain(s.w));
    const c = railCounts(s.w);
    assert.equal(c.total, RAILWAY_SUPPLY + 30 + c.produced);
  }
  advance(s, 1200);
  assert.equal(invariant(s.w), null);
  assert.deepEqual(legsLaid(s.w).slice(0, 2), [N, 0]);
});

// ---------------------------------------------------------------- the load check's refusals
test('the load check refuses a broken leg, yard, route or fleet', () => {
  const base = (() => {
    const s = copy(JOINED);
    feedSection(s);
    return s.w;
  })();
  // The route's sites through its own check (railwayCheck runs it after the conserved counts, which a changed `laid`
  // or fed count breaks first); the fleet's through the whole load check.
  const refuse = (what: string, edit: (w: World) => void, msg: RegExp, whole = false) => {
    const w = plain(base);
    edit(w);
    assert.throws(() => (whole ? railwayCheck(w) : checkRoute(w)), msg, what);
  };
  const leg = (w: World, patch: Record<string, number>) => Object.assign(w.mut(Leg, w.lookup(Leg, STACK)!)!, patch);
  refuse('laid past its sections', (w) => leg(w, { laid: N + 1 }), /leg bounds/);
  refuse('fed over the bill', (w) => leg(w, { logs: 21 }), /leg bounds/);
  refuse('laying with the bill short', (w) => leg(w, { start: 5 }), /leg laying/);
  refuse('a full bill not laying', (w) => leg(w, { logs: 20, rails: 20 }), /leg laying/);
  refuse('loaded over the leg', (w) => leg(w, { loadedLogs: 81 }), /leg bounds/);
  refuse(
    'an unbuilt leg laid',
    (w) => Object.assign(w.mut(Leg, w.lookup(Leg, 1)!)!, { laid: 1 }),
    /leg before it opens/,
  );
  refuse(
    'a leg before the rivet',
    (w) => Object.assign(w.mut(Aperture, w.single(Aperture))!, { joined: -1 }),
    /leg before it opens/,
  );
  refuse(
    'a yard fed',
    (w) => Object.assign(w.mut(LegYard, w.lookup(LegYard, 0)!)!, { logs: 1 }),
    /yard before its leg/,
  );
  refuse('a grant before its leg', (w) => Object.assign(w.mut(Route, w.single(Route))!, { grants: 1 }), /grant before/);
  refuse('a gate before its grant', (w) => Object.assign(w.mut(Route, w.single(Route))!, { gates: 1 }), /gate before/);
  refuse('arrived', (w) => Object.assign(w.mut(Route, w.single(Route))!, { arrived: 1 }), /arrived before/);
  refuse(
    'route bits out of range',
    (w) => Object.assign(w.mut(Route, w.single(Route))!, { gates: 64 }),
    /route bounds/,
  );
  const shed = LINE_SLOTS[LINE2]!.at(-1)!;
  const train0 = LINE_SLOTS[LINE2]![0]!;
  refuse(
    'a shed train moved',
    (w) => Object.assign(w.mut(Train, w.lookup(Train, shed)!)!, { from: 5000 }),
    /shed train/,
    true,
  );
  refuse(
    'a shed train riding',
    (w) => Object.assign(w.mut(Train, w.lookup(Train, shed)!)!, { riders: 1 }),
    /shed train/,
    true,
  );
  refuse(
    'a first-stage train in the shed',
    (w) => Object.assign(w.mut(Train, w.lookup(Train, train0)!)!, { phase: TRAIN_PHASE.SHED }),
    /shed train/,
    true,
  );
  refuse(
    'more trains than the stage runs',
    (w) => Object.assign(w.mut(Train, w.lookup(Train, LINE_SLOTS[LINE2]!.at(-1)!)!)!, { phase: TRAIN_PHASE.STAND }),
    /railway: fleet/,
    true,
  );
});

// ---------------------------------------------------------------- what is replicated
test('replicated rows change only at a kit load, a feed or a lay: never every tick (the lay clock reads start)', () => {
  const s = unaudited(copy(JOINED));
  const kinds = new Set(['leg', 'legYard', 'route']);
  const route = RAIL_REPLICATED.filter((c) => kinds.has(c.kind));
  assert.equal(route.length, 3, 'all three replicate: none is written every tick');
  const snap = () => JSON.stringify(route.map((c) => s.w.ids(c).map((id) => s.w.get(c, id))));
  let prev = snap(),
    changed = 0,
    events = 0,
    loads = legRow(s.w, STACK).loadedLogs + legRow(s.w, STACK).loadedRails;
  for (let k = 0; k < 6000; k++) {
    const laid = legRow(s.w, STACK).laid,
      start = legRow(s.w, STACK).start;
    if (k % 3 === 0)
      for (const pid of ['a', 'b']) {
        act(s, pid, 'rail.depotTake');
        act(s, pid, 'rail.depotRailTake');
        if (act(s, pid, 'rail.legStock', { leg: STACK })) events++;
      }
    advance(s, 1);
    const r = legRow(s.w, STACK),
      l = r.loadedLogs + r.loadedRails;
    if (l !== loads || r.laid !== laid || (r.start !== start && r.start < 0)) events++;
    loads = l;
    const now = snap();
    if (now !== prev) changed++;
    prev = now;
  }
  assert.ok(legRow(s.w, STACK).laid >= 2, 'sections laid in the run');
  assert.ok(changed <= events, `${changed} changed ticks against ${events} events`);
  assert.ok(changed < 6000 / 20, `${changed} of 6000 ticks`);
});

// ---------------------------------------------------------------- the trains on the grown line
/** Ruling A (greybox-route.md, leg 1 step 3): while the line grows (from the leg opening until 3,000 ticks after its far
 * end last moves) the worst line 2 wait is at most 1,600 and an ask up the line at the current railhead at most 1,158;
 * no wait over 1,158 is asked later than 3,000 ticks after the Gorge opens (gate 11). */
const GROWTH_CAP = 1600,
  SETTLED_CAP = 1158;
const FUZZ = fuzzTicks(20000);
for (const [seed, headPct] of [
  [0x5eed, 75],
  [0xbadd, 0],
] as const)
  test(`fuzz ${seed.toString(16)} at ${headPct}%: the leg played while lever and rider asks run, restores; spacing, end blocks, the worst wait`, (t) => {
    let s = unaudited(copy(JOINED));
    const rand = mulberry32(seed);
    const asked = new Map<string, number>(),
      worst = new Map<string, number>(),
      over: string[] = [];
    const joins: number[] = [];
    let restores = 0,
      longest = 0,
      gorgeAt = -1;
    const standSince = new Map<number, number>();
    for (let k = 0; k < FUZZ; k++) {
      // The room plays the leg: what the rack holds goes into the frame (a carry every few seconds).
      if (k % 30 === 0)
        for (const pid of ['a', 'b']) {
          act(s, pid, 'rail.depotTake');
          act(s, pid, 'rail.depotRailTake');
          act(s, pid, 'rail.legStock', { leg: STACK });
        }
      const n2 = stopsOf(s.w, LINE2).length;
      if (rand() < 0.05) {
        const id = Math.floor(rand() * RAIL_HALTS.length),
          dir = rand() < 0.5 ? -1 : 1;
        const h = RAIL_HALTS[id]!;
        if (h.stop < stopsOf(s.w, h.line).length && act(s, 'a', 'rail.call', { id, dir }) && !asked.has(`${id}/${dir}`))
          asked.set(`${id}/${dir}`, s.t);
      }
      if (rand() < 0.03 && n2 > 2) {
        const serving = servingSlots((j) => train(s.w, j), LINE2);
        const slot = serving[Math.floor(rand() * serving.length)]!,
          stop = 1 + Math.floor(rand() * (n2 - 2));
        act(s, 'a', 'rail.call', { id: haltId(LINE2, stop), dir: trainDir(train(s.w, slot)), train: slot });
      }
      if (rand() < 0.01) {
        const tr = [-1, 5, 99, 1.5, -0, Number.NaN, 2 ** 60, '1', null][Math.floor(rand() * 9)];
        act(s, 'a', 'rail.call', { id: Math.floor(rand() * 12) - 1, dir: rand() < 0.5 ? -1 : 2, train: tr } as never);
      }
      const before = servingSlots((j) => train(s.w, j), LINE2).length;
      railTick(s.w, ++s.t, headPct);
      if (servingSlots((j) => train(s.w, j), LINE2).length > before) joins.push(s.t);
      if (gorgeAt < 0 && legRow(s.w, STACK).laid === N) gorgeAt = s.t;
      assert.deepEqual(kitEquality(s.w), [0, 0], `kit units at ${s.t}`);
      trains(s.w).forEach((r, slot) => {
        if (r.phase !== TRAIN_PHASE.STAND || RAIL_TRAINS[slot]!.line !== LINE2) return void standSince.delete(slot);
        if (!standSince.has(slot)) standSince.set(slot, s.t);
        longest = Math.max(longest, s.t - standSince.get(slot)!);
      });
      for (const [key, since] of asked) {
        const [id, dir] = key.split('/').map(Number) as [number, number];
        const h = RAIL_HALTS[id]!;
        const there = LINE_SLOTS[h.line]!.some((j) => {
          const r = train(s.w, j);
          return r.phase === TRAIN_PHASE.STAND && r.at === h.stop && trainDir(r) === dir;
        });
        if (there) {
          worst.set(key, Math.max(worst.get(key) ?? 0, s.t - since));
          if (h.line === LINE2 && s.t - since > SETTLED_CAP) {
            over.push(`${h.name} ${dir > 0 ? 'up' : 'down'} asked ${since} served ${s.t}`);
            const railhead = h.stop === stopsOf(s.w, LINE2).length - 1 || !!h.leg;
            assert.ok(!(railhead && dir > 0), `an ask up the line at the railhead waited ${s.t - since}`);
            assert.ok(
              gorgeAt < 0 || since <= gorgeAt + 3000,
              `${h.name}: waited ${s.t - since}, asked on the settled line`,
            );
          }
          asked.delete(key);
        }
      }
      if (k % 10 === 0) {
        const broken = trainSpacing(
          (j) => train(s.w, j),
          (l) => stopsOf(s.w, l),
          s.t,
        );
        assert.equal(broken, null, `spacing at ${s.t}`);
      }
      if (k % 250 === 0) assert.equal(invariant(s.w), null, `invariant at ${s.t}`);
      if (rand() < 0.002) {
        s = unaudited({ w: restore(s.w), t: s.t });
        restores++;
      }
    }
    for (const [key, since] of asked) worst.set(key, Math.max(worst.get(key) ?? 0, s.t - since));
    const line2 = [...worst].filter(([key]) => RAIL_HALTS[Number(key.split('/')[0])]!.line === LINE2);
    const top = Math.max(0, ...line2.map(([, v]) => v));
    t.diagnostic(
      `${FUZZ} ticks; laid ${legRow(s.w, STACK).laid}; joins at ${joins.join(', ')}; restores ${restores}; ` +
        `worst line 2 lever wait ${top / 10} s; longest stand ${longest / 10} s`,
    );
    t.diagnostic(`over ${SETTLED_CAP}: ${over.join('; ') || 'none'}; the Gorge opened at ${gorgeAt}`);
    t.diagnostic(
      `waits: ${line2.map(([key, v]) => `${RAIL_HALTS[Number(key.split('/')[0])]!.name} ${key.endsWith('/-1') ? 'down' : 'up'} ${v / 10} s`).join('; ')}`,
    );
    if (FUZZ >= 20000) {
      assert.equal(legRow(s.w, STACK).laid, N, 'the leg was laid in the run');
      assert.equal(joins.length, 2, 'the fourth and fifth trains joined');
    }
    for (const [key, v] of line2)
      assert.ok(v <= GROWTH_CAP, `line 2 ${key}: waited ${v} ticks (growth cap ${GROWTH_CAP})`);
    assert.ok(longest < 1200, 'no line-2 train stands two minutes');
    assert.equal(invariant(s.w), null);
  });

// The wake leaves the fleet rows in the shed (rail.boilerFit places the first stage's trains only), and the tick the
// fourth train joins it stands at the Village on the up track with a fresh dwell. Gate 12: both extra trains run within
// 1,050 ticks of the first section laying, and no running train is held for a join (the join writes no other row).
test('a joining train stands at the Village going up, its dwell from the join, clear of the end block', () => {
  const s = copy(JOINED);
  feedSectionStart(s);
  const slot = LINE_SLOTS[LINE2]![3]!;
  for (let guard = 0; train(s.w, slot).phase === TRAIN_PHASE.SHED; guard++) {
    assert.ok(guard < 3000, 'the fourth train joins');
    if (legRow(s.w, STACK).laid === 0) assert.equal(train(s.w, slot).phase, TRAIN_PHASE.SHED, 'not before section 1');
    advance(s, 1);
  }
  assert.equal(legRow(s.w, STACK).laid, 1);
  const r = train(s.w, slot);
  assert.deepEqual([r.phase, r.at, r.track, r.depart, r.arrived], [TRAIN_PHASE.STAND, 0, 0, s.t, s.t]);
  assert.equal(invariant(s.w), null);
  advance(s, TRAIN.dwellTicks + 2000);
  assert.equal(invariant(s.w), null);
});
test('gate 12: both extra trains join within 1,050 ticks of the first section laying, each into a gap', () => {
  // fleetJoin writes only the joiner's row (./railway-trains.ts) and only when every running train is a block's gap from
  // the Village and none is in or bound for its end block: no running train is held for a join.
  const s = unaudited(copy(JOINED));
  feedSectionStart(s);
  while (legRow(s.w, STACK).laid === 0) advance(s, 1);
  const laidAt = s.t;
  const [fourth, fifth] = [LINE_SLOTS[LINE2]![3]!, LINE_SLOTS[LINE2]![4]!];
  while (train(s.w, fourth).phase === TRAIN_PHASE.SHED || train(s.w, fifth).phase === TRAIN_PHASE.SHED) {
    assert.ok(s.t - laidAt <= 1050, 'both joined within 1,050 ticks of the first section laying');
    advance(s, 1);
    assert.equal(
      trainSpacing(
        (j) => train(s.w, j),
        (l) => stopsOf(s.w, l),
        s.t,
      ),
      null,
      'spacing',
    );
  }
  assert.equal(invariant(s.w), null);
});

test('replay: the same ops from the same seed give the same hash, through a save', () => {
  const run = () => {
    const s = copy(JOINED);
    feedSection(s);
    feedSection(s);
    advance(s, 500);
    return s.w.hash();
  };
  assert.equal(run(), run());
});

// ---------------------------------------------------------------- ruling D: the stone stop with a kit aboard
test('ruling D: a train whose kit cannot unload yet makes the stone stop; owed a kit, or able to unload, it does not', () => {
  const s = unaudited(copy(JOINED));
  advance(s, 1500); // the idle room's rest: kit 1 racked, two trains each with a kit waiting for a railhead
  const quarry = TRADE.yards.findIndex((y) => y.line === LINE2),
    stop = TRADE.yards[quarry]!.stop;
  s.w.mut(Yard, s.w.lookup(Yard, quarry)!)!.stock = TRADE.loadStop;
  const carrier = LINE_SLOTS[LINE2]!.find((k) => train(s.w, k).logs > 0)!;
  assert.ok(carrier !== undefined);
  const r = { ...train(s.w, carrier), freight: 0 };
  assert.equal(legKitWaiting(s.w, LINE2, r), true);
  assert.equal(freightStop(s.w, carrier, r, stop, -1), true, 'a waiting kit is no errand');
  // Empty the rack: the same kit can unload now, so it is an errand again.
  Object.assign(s.w.mut(Rail, s.w.single(Rail))!, { depot: 0, depotRails: 0 });
  assert.equal(legKitWaiting(s.w, LINE2, r), false);
  assert.equal(freightStop(s.w, carrier, r, stop, -1), false, 'a kit that can unload');
  // An empty train owed a kit (below kitTrains) is on an errand too.
  const empty = { ...r, logs: 0, rails: 0 };
  for (const k of LINE_SLOTS[LINE2]!)
    if (k !== carrier) Object.assign(s.w.mut(Train, s.w.lookup(Train, k)!)!, { logs: 0, rails: 0 });
  assert.equal(freightStop(s.w, carrier, empty, stop, -1), false, 'owed a kit');
});

// ---------------------------------------------------------------- ruling F: rail.legStock predicted
test('ruling F: rail.legStock is predicted; the press that fills the frame shows full and leaves the lay to the server', () => {
  assert.ok(RAIL_PREDICTED.has('rail.legStock'));
  for (const op of ['rail.grant', 'rail.gate', 'rail.arrive']) assert.ok(!RAIL_PREDICTED.has(op), `${op} waits`);
  const s = copy(JOINED);
  while (rail(s.w).depot < 20 || rail(s.w).depotRails < 20) advance(s, 1);
  // Player a carries and feeds until what is on a's back fills the frame; that last press is predicted.
  for (let guard = 0; ; guard++) {
    assert.ok(guard < 20);
    act(s, 'a', 'rail.depotTake');
    act(s, 'a', 'rail.depotRailTake');
    const g = legRow(s.w, STACK),
      a = s.w.get(Account, s.w.lookup(Account, 'a')!)!;
    if (a.carry >= 20 - g.logs && a.rails >= 20 - g.rails) break;
    act(s, 'a', 'rail.legStock', { leg: STACK });
  }
  const shown = s.w.clone();
  const a = shown.get(Account, shown.lookup(Account, 'a')!)!;
  const p = railPredict(shown, 'a', { op: 'rail.legStock', leg: STACK, epoch: a.epoch, request: a.request + 1 }, s.t);
  assert.ok(p.n > 0, 'predicted');
  const g = legRow(shown, STACK);
  assert.deepEqual([g.logs, g.rails, g.start], [20, 20, -1], 'full, not laying until the server says so');
  assert.equal(act(s, 'a', 'rail.legStock', { leg: STACK }), p.n, 'the server takes the same');
  assert.equal(legRow(s.w, STACK).start, s.t);
});
