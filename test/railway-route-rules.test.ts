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
  Town,
  Yard,
  RAIL_REPLICATED,
  Route,
  Shed,
  Steel,
  Train,
  createRailwayWorld,
} from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { LINE2, RAIL_HALTS, RAIL_LINES, RAIL_TRAINS, TRAIN_EXTENT, legBuilt } from '../src/sim/railway-lines.ts';
import {
  LEG_TUNE,
  RAIL_ARRIVAL,
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  ROW_LINE,
  legFrame,
  legRack,
  LEG_SITE_REACH,
  legS,
  ROW_SHIFT,
  rowPoint,
} from '../src/sim/railway-route.ts';
import { WORLD_LINES } from '../src/sim/railway-world-lines.ts';
import { RING_END, RING_S_HEAD, STEEL, ringAt } from '../src/sim/railway-ring-layout.ts';
import {
  TRAIN,
  TRAIN_PHASE,
  fleetOf,
  trainAlong,
  trainDir,
  trainPassesBy,
  trainStopsOf,
  reqHas,
  reqIndex,
} from '../src/sim/railway-train.ts';
import { LINE_SLOTS, cycleTicks, servingSlots, trainServes, trainSpacing } from '../src/sim/railway-trains.ts';
import { railTick } from '../src/sim/railway-systems.ts';
import { line, rail, train, trains } from '../src/sim/railway-rows.ts';
import { stopsOf } from '../src/sim/railway-queries.ts';
import { legKitNeed, legKitWaiting, legRow, legsLaid, routeRow } from '../src/sim/railway-queries-route.ts';
import { freightStop } from '../src/sim/railway-queries-trade.ts';
import { footingsOwed, kitOwed, steelNeed } from '../src/sim/railway-queries.ts';
import { TRADE } from '../src/sim/railway-trade-layout.ts';
import { RAIL_PREDICTED, railPredict } from '../src/world/railway-predict.ts';
import { railCounts } from '../src/sim/railway-queries-line2.ts';
import { RAILWAY_SUPPLY } from '../src/sim/railway-layout.ts';
import { railValid, type Actor } from '../src/world/railway-server.ts';
import {
  act,
  advance,
  apply,
  buildSeedWorld,
  chopTo,
  invariant,
  restore,
  unaudited,
  type Seed,
} from './helpers/rail.ts';
import { checkRoute } from '../src/sim/railway-check-route.ts';
import { railLegKitHolders, railLegKitRelease } from '../src/sim/railway-sys-route-kit.ts';
import { ROUTE_GATES, fuzzTicks, routeTicks } from './helpers/fuzz.ts';

const STACK = 0;
const LEG = RAIL_LEGS[STACK]!;
const N = LEG.sections.length;
const halt = (name: string) => RAIL_LINES[LINE2]!.halts.findIndex((h) => h.name === name);
const RING = halt('Ring Island'),
  HEAD = halt('Stack head 1'),
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

/** Players a and b take what the rack holds and stock the frame, by apply alone: act (src/sim/railway-seed-route.ts) checks
 * the whole invariant after every op, some forty times a fed tick's cost, so the feeding loops check it at each lay. */
function stock(s: Seed, k = STACK) {
  let stocked = 0;
  for (const pid of ['a', 'b'])
    for (const [o, f] of [
      ['rail.depotTake', {}],
      ['rail.depotRailTake', {}],
      ['rail.legStock', { leg: k }],
    ] as const) {
      const a = s.w.get(Account, s.w.lookup(Account, pid)!)!;
      const r = apply(s.w, pid, { op: o, epoch: a.epoch, request: a.request + 1, ...f } as never, s.t);
      if (o === 'rail.legStock' && r.accepted) stocked++;
    }
  return stocked; // the players whose press stocked the frame
}
/** Player a's rail.call, by apply alone (as stock): the fuzzes check the invariant every 250 ticks. */
function ask(s: Seed, f: Record<string, unknown>) {
  const a = s.w.get(Account, s.w.lookup(Account, 'a')!)!;
  return apply(s.w, 'a', { op: 'rail.call', epoch: a.epoch, request: a.request + 1, ...f } as never, s.t).accepted;
}
/** Players a and b take what the leg's rack holds and feed the frame, every tick, until the current section starts to
 * lay; then until it is laid. Returns the tick the frame was full. */
function feedSection(s: Seed, k = STACK) {
  const was = legRow(s.w, k).laid;
  for (let guard = 0; legRow(s.w, k).start < 0; guard++) {
    assert.ok(guard < 6000, `section ${was} never fed`);
    stock(s, k);
    if (legRow(s.w, k).start < 0) advance(s, 1);
  }
  const full = s.t;
  assert.equal(invariant(s.w), null, `section ${was} fed`);
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
  assert.deepEqual(line2.halts.map((h) => h.name).slice(5), [
    'Ring Island',
    'Stack head 1',
    'Stack head 2',
    'Stack head 3',
    'High Gorge',
  ]);
  assert.equal(LEG.railheadHalt, HEAD);
  // One halt a head (call 88), 10 m short of each laid end but the last, each a stub end; the Gorge at the leg's end.
  assert.deepEqual(
    line2.halts.slice(HEAD, HEAD + N - 1).map((h) => [h.s, h.end?.kind, h.leg?.section]),
    LEG.sections.slice(0, -1).map((sec, k) => [legS(LEG, sec.toCm) - 1000, 'stub', k]),
  );
  assert.equal(line2.halts[GORGE]!.s, legS(LEG, LEG.sections.at(-1)!.toCm));
  // Fourth car, design review finding 5 (call 25): a train standing at the Gorge has its tail (the steel car's, on the
  // wagon's train, TRAIN_EXTENT.behindCm) 0.3 m clear of the crossover before the platforms, which is as long as the
  // island's (22 m). The tightest figure of v33: a later stop or extent change re-measures it here.
  const gorge = line2.halts[GORGE]!,
    crossEnd = gorge.end!.mergeCm + (RING_END.cross.u1 - RING_END.cross.u0);
  assert.equal(gorge.end!.kind, 'crossover');
  assert.equal(gorge.s - TRAIN_EXTENT.behindCm - crossEnd, 30, 'the tail 0.3 m clear of the crossover');
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

test('the fleet: 3, then 6 from the first section laid (ruling A.4; six from short-turn call 5); the fourth to sixth rows start in the shed', () => {
  assert.deepEqual(
    Array.from({ length: N + 1 }, (_v, n) => fleetOf(LINE2, [n])),
    [3, 6, 6, 6, 6],
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
      [1, true],
    ],
  );
  const w = createRailwayWorld();
  assert.deepEqual(
    trains(w).map((r) => r.phase),
    [0, 0, 0, 0, TRAIN_PHASE.SHED, TRAIN_PHASE.SHED, TRAIN_PHASE.SHED],
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
  const heads = RAIL_LINES[LINE2]!.halts.slice(HEAD, HEAD + N - 1).map((h) => h.s);
  // Each lay opens the next head; the old ones stay stops (call 88).
  assert.deepEqual(trainStopsOf(LINE2, 7, joined, [1]), [...base, heads[0]]);
  assert.deepEqual(trainStopsOf(LINE2, 7, joined, [2]), [...base, heads[0], heads[1]]);
  assert.deepEqual(trainStopsOf(LINE2, 7, joined, [3]), [...base, ...heads]);
  assert.deepEqual(trainStopsOf(LINE2, 7, joined, [4]), [...base, ...heads, RAIL_LINES[LINE2]!.halts[GORGE]!.s]);
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
    stock(s);
    if (legRow(s.w, STACK).start < 0) advance(s, 1);
  }
  assert.equal(invariant(s.w), null, 'the frame fed');
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
  const heads = RAIL_LINES[LINE2]!.halts.slice(HEAD, HEAD + N - 1).map((h) => h.s);
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
    assert.equal(stopsOf(s.w, LINE2).length, RING + 1 + k, 'each lay opens a head; the old ones stay');
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
  // All leg cargo is zero once the leg is complete: what rode on goes home at the Village (legKitHome), so no train
  // keeps the mark that bars the works' kit from it.
  for (let k = 0; trains(s.w).some((r) => r.legKit); k++) {
    assert.ok(k < 4000, 'the leg kit aboard goes home');
    advance(s, 1);
  }
  assert.deepEqual(
    trains(s.w).filter((r, slot) => RAIL_TRAINS[slot]!.line === LINE2 && r.legKit),
    [],
    'no leg kit aboard',
  );
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
  // The leg's rack (Q6's and Q7's depot racks, once the Q jobs are done) at its own spot, 7 m from the frame (step 4's
  // review, b: reach 4 m); none before the rivet.
  const rack = legRack(LEG, 0);
  assert.equal(railValid(s.w, op('rail.depotTake'), actorAt(rack)), true);
  assert.equal(railValid(s.w, op('rail.depotRailTake'), actorAt(rack)), true);
  assert.equal(railValid(s.w, op('rail.depotTake'), actorAt(frame)), false, 'the frame is out of the rack reach');
  assert.equal(railValid(s.w, op('rail.depotTake'), actorAt(legRack(LEG, 2))), false);
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
  // Each head's lever is judged at its own platform.
  const t = copy(JOINED);
  feedSection(t);
  feedSection(t);
  const second = RAIL_LINES[LINE2]!.halts[HEAD + 1]!.platforms[1],
    first = RAIL_LINES[LINE2]!.halts[HEAD]!.platforms[1];
  assert.equal(railValid(t.w, op('rail.call', { id: haltId(LINE2, HEAD + 1), dir: -1 }), actorAt(second)), true);
  assert.equal(railValid(t.w, op('rail.call', { id: haltId(LINE2, HEAD + 1), dir: -1 }), actorAt(first)), false);
});

// ---------------------------------------------------------------- the kit
/** Gate 16: kit units loaded equal units aboard, racked, fed, laid and on backs (the rack and backs hold none at the
 * rivet), logs and rails. */
const legCarrier = (w: World, k: number) => train(w, k).legKit && train(w, k).logs + train(w, k).rails > 0;
function kitEquality(w: World) {
  const g = legRow(w, STACK);
  let logs = g.logs,
    rails = g.rails;
  for (const sec of LEG.sections.slice(0, g.laid)) [logs, rails] = [logs + sec.logs, rails + sec.rails];
  // A leg's kit aboard is the marked cargo (Train.legKit): the steel works' kit rides the same cars (steel first).
  for (const r of trains(w)) if (r.legKit) [logs, rails] = [logs + r.logs, rails + r.rails];
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
  const carriers = LINE_SLOTS[LINE2]!.filter((k) => legCarrier(s.w, k));
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
/** The leg fed every tick from the rivet (the rack into the frame whenever it can lay), played once and shared by the
 * whole-leg tests that feed it so (kitTrains, gate 14 and call 88's fed proof): what each asserts, recorded as it ran. */
let FED:
  | {
      kitBreaks: string[];
      need: { logs: number; rails: number };
      broken: string | null;
      toGorge: number;
      idle: number[];
      rides: number[];
    }
  | undefined;
function fedLeg() {
  if (FED) return FED;
  const s = unaudited(copy(JOINED)),
    t0 = s.t,
    w = rideOnWatch(),
    kitBreaks: string[] = [],
    idle: number[] = [];
  let ready = s.t,
    complete = -1,
    need = { logs: -1, rails: -1 },
    broken: string | null = 'never laid',
    toGorge = -1;
  for (let guard = 0; legRow(s.w, STACK).laid < N || w.done().length < N; guard++) {
    assert.ok(guard < 12000, 'the fed leg: laid, and every lay ridden on');
    const g = legRow(s.w, STACK),
      laid = g.laid;
    if (laid < N) {
      if (complete < 0 && g.logs + rail(s.w).depot >= 20 && g.rails + rail(s.w).depotRails >= 20) complete = s.t;
      if (g.start < 0) stock(s);
    }
    const before = trains(s.w).map((r) => ({ ...r }));
    advance(s, 1);
    w.step(s.w, s.t, before);
    if (laid === N) continue;
    const running = servingSlots((j) => train(s.w, j), LINE2).length,
      carrying = LINE_SLOTS[LINE2]!.filter((j) => legCarrier(s.w, j)).length;
    if (carrying > running - 1) kitBreaks.push(`${carrying} kit trains of ${running} at ${s.t}`);
    const eq = kitEquality(s.w);
    if (eq[0] || eq[1]) kitBreaks.push(`kit units ${eq.join('/')} at ${s.t}`);
    if (legRow(s.w, STACK).laid > laid) {
      idle.push(complete - ready);
      [ready, complete] = [s.t, -1];
      if (laid + 1 === N) [toGorge, need, broken] = [s.t - t0, legKitNeed(s.w, STACK), invariant(s.w)];
    }
  }
  return (FED = { kitBreaks, need, broken, toGorge, idle, rides: w.done() });
}
test('kitTrains: at most the running trains less one carry kit, whatever is owed; a fed leg still lays through', () => {
  const f = fedLeg();
  assert.deepEqual(f.kitBreaks.slice(0, 5), []);
  assert.deepEqual(f.need, { logs: 0, rails: 0 });
  assert.equal(f.broken, null);
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
  // Steel first: the mark that keeps a leg's kit and the works' apart stands only with cargo aboard, on a line with a
  // leg reached.
  const mark = (w: World, slot: number, patch: Record<string, number | boolean>) =>
    Object.assign(w.mut(Train, w.lookup(Train, slot)!)!, patch);
  refuse(
    'a leg kit mark with nothing aboard',
    (w) => mark(w, LINE_SLOTS[LINE2]![0]!, { legKit: true, logs: 0, rails: 0 }),
    /leg kit mark/,
  );
  refuse(
    'a leg kit mark on a line with no leg',
    (w) => mark(w, LINE_SLOTS[0]![0]!, { legKit: true, logs: 1 }),
    /leg kit mark/,
  );
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
    if (k % 3 === 0) events += stock(s);
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
/** The halts a lever ask may name now: open on their line and not closed behind (the orchestrator's ruling on call 88:
 * a passed head takes no ask), by RAIL_HALTS id. Every fuzz here asks at 5% of ticks, one of these picked uniformly:
 * main's total rate (test/railway-trains.test.ts, the WAIT_BOUND method), the gates' method as ruled. Picking from the
 * whole grown catalog instead wastes about two picks in three on halts no one can ask at (under-asked). */
function askPool(w: World) {
  return RAIL_HALTS.flatMap((h, id) => {
    const n = stopsOf(w, h.line).length;
    return h.stop < n && !(trainPassesBy(h.line, h.stop, 1, n) && trainPassesBy(h.line, h.stop, -1, n)) ? [id] : [];
  });
}
/** Gate 11 as restated (greybox-route.md, rulings on the re-measure, 5): the worst line 2 wait is at most 1,600, and
 * from each section laying a train stands at the new railhead (or the Gorge) within 1,158 ticks. A wait over 1,158
 * asked later than 3,000 ticks after the Gorge opens is reported under gate 9 (a diagnostic), not gated twice. */
const GROWTH_CAP = 1600,
  SETTLED_CAP = 1158;
/** Until train spacing lands (greybox-route.md, the fourth sheet, calls 105 and the owner's 12 November answer): the
 * settled line's worst wait (gate 9) and a fixed stage's (gate 8); a settled wait over PRINT_OVER is printed. */
const GATE9_CAP = 1400,
  GATE8_CAP = 1350,
  PRINT_OVER = 1350;
/** The gate fuzzes' length: 20,000 in the long run (ROUTE_GATES=1), 3,000 otherwise (test/helpers/fuzz.ts). */
const FUZZ = routeTicks();
// Round 3, ruling 1: the waits are owed at the shipped hold (75%) on four seeds; at 0% two seeds run for the structural
// checks only (spacing, end blocks, block signals, the load check, the leg completing) and their waits are printed.
for (const [seed, headPct] of [
  [0xc0ffee, 75],
  [0x777, 75],
  [0x5eed, 75],
  [0xbadd, 75],
  [0x5eed, 0],
  [0xbadd, 0],
] as const)
  test(`fuzz ${seed.toString(16)} at ${headPct}%: the leg played while lever and rider asks run, restores; spacing, end blocks, the worst wait`, (t) => {
    let s = unaudited(copy(JOINED));
    const rand = mulberry32(seed);
    const asked = new Map<string, number>(),
      worst = new Map<string, number>(),
      over: string[] = [],
      settledOver: string[] = [],
      toRailhead: number[] = [];
    let laidNow = legRow(s.w, STACK).laid,
      laidAt = -1;
    const joins: number[] = [];
    let restores = 0,
      longest = 0,
      gorgeAt = -1;
    const standSince = new Map<number, number>();
    for (let k = 0; k < FUZZ; k++) {
      // The room plays the leg: what the rack holds goes into the frame (a carry every few seconds).
      if (k % 30 === 0) stock(s);
      const n2 = stopsOf(s.w, LINE2).length;
      if (rand() < 0.05) {
        const id = askPool(s.w)[Math.floor(rand() * askPool(s.w).length)]!,
          dir = rand() < 0.5 ? -1 : 1;
        const h = RAIL_HALTS[id]!;
        if (h.stop < stopsOf(s.w, h.line).length && ask(s, { id, dir }) && !asked.has(`${id}/${dir}`))
          asked.set(`${id}/${dir}`, s.t);
      }
      if (rand() < 0.03 && n2 > 2) {
        const serving = servingSlots((j) => train(s.w, j), LINE2);
        const slot = serving[Math.floor(rand() * serving.length)]!,
          stop = 1 + Math.floor(rand() * (n2 - 2));
        ask(s, { id: haltId(LINE2, stop), dir: trainDir(train(s.w, slot)), train: slot });
      }
      if (rand() < 0.01) {
        const tr = [-1, 5, 99, 1.5, -0, Number.NaN, 2 ** 60, '1', null][Math.floor(rand() * 9)];
        ask(s, { id: Math.floor(rand() * 12) - 1, dir: rand() < 0.5 ? -1 : 2, train: tr } as never);
      }
      const before = servingSlots((j) => train(s.w, j), LINE2).length;
      railTick(s.w, ++s.t, headPct);
      if (servingSlots((j) => train(s.w, j), LINE2).length > before) joins.push(s.t);
      if (gorgeAt < 0 && legRow(s.w, STACK).laid === N) gorgeAt = s.t;
      if (legRow(s.w, STACK).laid > laidNow) [laidNow, laidAt] = [legRow(s.w, STACK).laid, s.t];
      if (laidAt >= 0) {
        const last = stopsOf(s.w, LINE2).length - 1;
        const there = servingSlots((j) => train(s.w, j), LINE2).some(
          (j) => train(s.w, j).phase === TRAIN_PHASE.STAND && train(s.w, j).at === last,
        );
        if (there) {
          toRailhead.push(s.t - laidAt);
          laidAt = -1;
        } else if (headPct === 75)
          assert.ok(s.t - laidAt <= SETTLED_CAP, 'a train at the new railhead within 1,158 ticks of the lay');
      }
      assert.deepEqual(kitEquality(s.w), [0, 0], `kit units at ${s.t}`);
      trains(s.w).forEach((r, slot) => {
        if (r.phase !== TRAIN_PHASE.STAND || RAIL_TRAINS[slot]!.line !== LINE2) return void standSince.delete(slot);
        if (!standSince.has(slot)) standSince.set(slot, s.t);
        longest = Math.max(longest, s.t - standSince.get(slot)!);
      });
      for (const [key, since] of asked) {
        const [id, dir] = key.split('/').map(Number) as [number, number];
        const h = RAIL_HALTS[id]!;
        // An ask at a head that has since closed behind is withdrawn with it (the lay drops it): no wait to time.
        if (askPool(s.w).indexOf(id) < 0) {
          asked.delete(key);
          continue;
        }
        const there = LINE_SLOTS[h.line]!.some((j) => {
          const r = train(s.w, j);
          return r.phase === TRAIN_PHASE.STAND && r.at === h.stop && trainDir(r) === dir;
        });
        if (there) {
          worst.set(key, Math.max(worst.get(key) ?? 0, s.t - since));
          if (h.line === LINE2 && s.t - since > SETTLED_CAP) {
            over.push(`${h.name} ${dir > 0 ? 'up' : 'down'} asked ${since} served ${s.t}`);
            if (gorgeAt >= 0 && since > gorgeAt + 3000) settledOver.push(`${h.name} ${s.t - since}`);
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
      `a train at the new railhead after each lay: ${toRailhead.join(', ')} ticks; settled over ${SETTLED_CAP} (gate 9's): ${settledOver.join('; ') || 'none'}`,
    );
    t.diagnostic(
      `waits: ${line2.map(([key, v]) => `${RAIL_HALTS[Number(key.split('/')[0])]!.name} ${key.endsWith('/-1') ? 'down' : 'up'} ${v / 10} s`).join('; ')}`,
    );
    if (ROUTE_GATES) {
      assert.equal(legRow(s.w, STACK).laid, N, 'the leg was laid in the run');
      assert.equal(joins.length, 3, 'the fourth to sixth trains joined');
      if (headPct === 75) assert.equal(toRailhead.length, N, 'a train reached the new railhead after every lay');
    }
    if (headPct === 75)
      for (const [key, v] of line2)
        assert.ok(v <= GROWTH_CAP, `line 2 ${key}: waited ${v} ticks (growth cap ${GROWTH_CAP})`);
    assert.ok(longest < 1200, 'no line-2 train stands two minutes');
    assert.equal(invariant(s.w), null);
  });

// The wake leaves the fleet rows in the shed (rail.boilerFit places the first stage's trains only), and the tick the
// fourth train joins it stands at the Village on the up track with a fresh dwell. Gate 12: every extra train runs within
// 1,050 ticks of the first section laying, and no running train is held for a join (the join writes no other row). Six
// trains from short-turn's ruling (call 5): the sixth joins as the fourth and fifth do, within the same 1,050.
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
test('gate 12: the three extra trains join within 1,050 ticks of the first section laying, each into a gap', () => {
  // fleetJoin writes only the joiner's row (./railway-trains.ts) and only when every running train is a block's gap from
  // the Village and none is in or bound for its end block: no running train is held for a join.
  const s = unaudited(copy(JOINED));
  feedSectionStart(s);
  while (legRow(s.w, STACK).laid === 0) advance(s, 1);
  const laidAt = s.t;
  const extra = LINE_SLOTS[LINE2]!.slice(3);
  assert.equal(extra.length, 3, 'three rows wait in the shed');
  while (extra.some((k) => train(s.w, k).phase === TRAIN_PHASE.SHED)) {
    assert.ok(s.t - laidAt <= 1050, 'all joined within 1,050 ticks of the first section laying');
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

// ---------------------------------------------------------------- re-measure rulings 1 and 2: the ride, every stage
test("block signals: line 2 holds at the stack line's section ends, between its halts, never at one", () => {
  const l = RAIL_LINES[LINE2]!;
  assert.deepEqual(
    l.signals,
    LEG.sections.slice(0, -1).map((sec) => legS(LEG, sec.toCm)),
  );
  for (const sig of l.signals!) assert.ok(!l.halts.some((h) => h.s === sig || h.heads?.includes(sig)), 'at no halt');
  assert.ok(
    l.signals!.every((x) => x > RAIL_LINES[LINE2]!.halts[RING]!.s),
    'none before Ring Island',
  );
  assert.equal(RAIL_LINES[0]!.signals, undefined);
});
test('gate 10: at every stage of the leg the quiet round trip is at most 1.2 times non-stop', () => {
  stageWorlds().forEach((base, laid) => {
    const u = unaudited({ w: restore(base.w), t: base.t });
    if (laid === 0) advance(u, 3000); // the stage worlds' rivet is the seed itself; the others are settled 3,000
    const slot = LINE_SLOTS[LINE2]![0]!,
      left: number[] = [];
    let prev = { ...train(u.w, slot) };
    for (let k = 0; k < 12000; k++) {
      advance(u, 1);
      const r = train(u.w, slot);
      if (prev.phase === TRAIN_PHASE.STAND && prev.at === 0 && r.phase === TRAIN_PHASE.RUN) left.push(u.t);
      prev = { ...r };
    }
    assert.ok(left.length >= 3, 'laps at ' + laid + ' laid');
    const lap = (left.at(-1)! - left[0]!) / (left.length - 1),
      nonstop = cycleTicks(LINE2, stopsOf(u.w, LINE2));
    assert.ok(lap <= 1.2 * nonstop, laid + ' laid: a lap of ' + lap + ' against ' + nonstop + ' non-stop');
  });
});

// ---------------------------------------------------------------- round 3's gates 5, 8, 9 and 14 (greybox-route.md)
/** Feeds the leg from the rack every tick until `laid` sections are laid. */
function playTo(s: Seed, laid: number) {
  for (let guard = 0; legRow(s.w, STACK).laid < laid; guard++) {
    assert.ok(guard < 9000, `the leg reaches ${laid} laid`);
    if (legRow(s.w, STACK).start < 0) stock(s);
    advance(s, 1);
  }
  assert.equal(invariant(s.w), null, `${laid} laid`);
}
/** The stage worlds of round 3's sheet: 0 is the rivet; 1 to 4 played from it and settled 3,000 ticks. */
let STAGES: Seed[] | undefined;
function stageWorlds(): Seed[] {
  if (STAGES) return STAGES;
  const s = unaudited(copy(JOINED));
  const out = [unaudited(copy(JOINED))];
  for (let laid = 1; laid <= N; laid++) {
    playTo(s, laid);
    const u = unaudited({ w: restore(s.w), t: s.t });
    advance(u, 3000);
    out.push(u);
  }
  return (STAGES = out);
}
/** One train's quiet lap (Village departure to Village departure), from a world, nothing asked. */
function quietLap(base: Seed) {
  const u = unaudited({ w: restore(base.w), t: base.t }),
    slot = LINE_SLOTS[LINE2]![0]!,
    left: number[] = [];
  let prev = { ...train(u.w, slot) };
  for (let k = 0; k < 12000 && left.length < 4; k++) {
    advance(u, 1);
    const r = train(u.w, slot);
    if (prev.phase === TRAIN_PHASE.STAND && prev.at === 0 && r.phase === TRAIN_PHASE.RUN) left.push(u.t);
    prev = { ...r };
  }
  return (left.at(-1)! - left[0]!) / (left.length - 1);
}
/** The lever waits the WAIT_BOUND way (test/railway-trains.test.ts): asks at 5% a tick from askPool, riders' asks, junk calls and
 * restores, nothing fed; line 2's served waits, the worst and the mean. Spacing checked as it runs. */
function leverWaits(base: Seed, seed: number, headPct: number, ticks: number) {
  let s = unaudited({ w: restore(base.w), t: base.t });
  const rand = mulberry32(seed),
    asked = new Map<string, number>(),
    waits: number[] = [],
    long: string[] = [];
  const note = (id: number, dir: number, since: number, served: number | null) => {
    const v = (served ?? s.t) - since;
    if (v > PRINT_OVER)
      long.push(
        `${RAIL_HALTS[id]!.name} ${dir > 0 ? 'up' : 'down'} asked ${since - base.t} ${served === null ? 'unserved at the end' : `served ${served - base.t}`} (${v})`,
      );
    waits.push(v);
  };
  for (let k = 0; k < ticks; k++) {
    const n2 = stopsOf(s.w, LINE2).length;
    if (rand() < 0.05) {
      const id = askPool(s.w)[Math.floor(rand() * askPool(s.w).length)]!,
        dir = rand() < 0.5 ? -1 : 1;
      const h = RAIL_HALTS[id]!;
      if (h.stop < stopsOf(s.w, h.line).length && ask(s, { id, dir }) && !asked.has(`${id}/${dir}`))
        asked.set(`${id}/${dir}`, s.t);
    }
    if (rand() < 0.03 && n2 > 2) {
      const serving = servingSlots((j) => train(s.w, j), LINE2);
      const slot = serving[Math.floor(rand() * serving.length)]!,
        stop = 1 + Math.floor(rand() * (n2 - 2));
      ask(s, { id: haltId(LINE2, stop), dir: trainDir(train(s.w, slot)), train: slot });
    }
    if (rand() < 0.01) {
      const tr = [-1, 5, 99, 1.5, -0, Number.NaN, 2 ** 60, '1', null][Math.floor(rand() * 9)];
      ask(s, { id: Math.floor(rand() * 12) - 1, dir: rand() < 0.5 ? -1 : 2, train: tr } as never);
    }
    railTick(s.w, ++s.t, headPct);
    for (const [key, since] of asked) {
      const [id, dir] = key.split('/').map(Number) as [number, number];
      const h = RAIL_HALTS[id]!;
      if (askPool(s.w).indexOf(id) < 0) {
        asked.delete(key); // withdrawn: its head closed behind
        continue;
      }
      const there = LINE_SLOTS[h.line]!.some((j) => {
        const r = train(s.w, j);
        return r.phase === TRAIN_PHASE.STAND && r.at === h.stop && trainDir(r) === dir;
      });
      if (there) {
        if (h.line === LINE2) note(id, dir, since, s.t);
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
    if (rand() < 0.002) s = unaudited({ w: restore(s.w), t: s.t });
  }
  for (const [key, since] of asked) {
    const [id, dir] = key.split('/').map(Number) as [number, number];
    if (RAIL_HALTS[id]!.line === LINE2) note(id, dir, since, null);
  }
  assert.equal(invariant(s.w), null);
  return {
    long,
    over1050: waits.filter((v) => v > 1050).length,
    worst: Math.max(0, ...waits),
    mean: Math.round(waits.reduce((a, b) => a + b, 0) / Math.max(1, waits.length)),
    over: waits.filter((v) => v > SETTLED_CAP).length,
    n: waits.length,
  };
}
const SEEDS = [0xc0ffee, 0x777, 0x5eed, 0xbadd] as const;
const SETTLED_FUZZ = routeTicks();

test('gate 9, stage 0: the leg open and nobody feeding, four seeds at 75%: worst at most 1,400; the mean and the share over 1,050 printed', (t) => {
  for (const seed of SEEDS) {
    const f = leverWaits(stageWorlds()[0]!, seed, 75, SETTLED_FUZZ);
    t.diagnostic(
      `${seed.toString(16)}: worst ${f.worst}, mean ${f.mean}, ${f.over1050} of ${f.n} over 1,050; over ${PRINT_OVER}: ${f.long.join('; ') || 'none'}`,
    );
    assert.ok(f.worst <= GATE9_CAP, `${seed.toString(16)}: worst ${f.worst}`);
  }
});

// Gates 8 and 9 as the owner answered and the designer read him (greybox-route.md, "Rulings on the rebased sheet", the
// fourth sheet; calls 105 to 107), until train spacing lands: a fixed stage's worst wait at most 1,350 (gate 8), the
// settled line's at most 1,400 (gate 9); the mean and the share over 1,050 are printed, not gated, and every settled
// wait over 1,350 is printed with its tick (from the run's start), halt and side. Holds of 0, 25 and 50% were measured
// under-asked on the earlier sheets and are not re-run.
test('gates 8 and 9: fixed stages 0 to 4 worst at most 1,350; the settled line worst at most 1,400; four seeds at 75% in the long run', (t) => {
  const stages = stageWorlds();
  const settled = unaudited({ w: restore(stages[N]!.w), t: stages[N]!.t });
  advance(settled, 1000); // 4,000 ticks after the Gorge opened
  t.diagnostic('seed | 0 laid | 1 | 2 | 3 | 4 | settled: worst (mean), and waits over 1,050 of all');
  // The four seeds in the long run (ROUTE_GATES=1), the first alone in the short one; asserted in both.
  for (const seed of ROUTE_GATES ? SEEDS : SEEDS.slice(0, 1)) {
    const row = stages.map((st) => leverWaits(st, seed, 75, fuzzTicks(3000)));
    const set = leverWaits(settled, seed, 75, SETTLED_FUZZ);
    t.diagnostic(
      `${seed.toString(16)} | ${row.map((f) => `${f.worst} (${f.mean})`).join(' | ')} | ${set.worst} (${set.mean}), ${set.over1050} of ${set.n}`,
    );
    t.diagnostic(`${seed.toString(16)} settled waits over ${PRINT_OVER}: ${set.long.join('; ') || 'none'}`);
    row.forEach((f, laid) =>
      assert.ok(f.worst <= GATE8_CAP, `gate 8, ${seed.toString(16)}, ${laid} laid: worst ${f.worst}`),
    );
    assert.ok(set.worst <= GATE9_CAP, `gate 9, ${seed.toString(16)}: settled worst ${set.worst}`);
  }
});

// Gate 5(a) as restated on the fourth sheet (call 106, amending call 79): once a leg, at its opening, a full load may
// wait until the last kit owed at that opening has loaded and one quiet round trip of that stage after it (at the
// rivet 2,805 ticks: 1,345 plus 1,460); in that time no train passes a full load unless it is owed a kit, carries
// one it can unload now, or is the footing wagon's train (slice 5 call 4; the orchestrator's call 108), and each train
// that passes is printed with its errand or "wagon". A train owed a kit still makes no stone stop (call 107).
const OPENING_CAP = 2805;
test('gate 5: a full load never waits in the Quarry yard over 1,158 (once, at the leg opening, until the last opening kit has loaded and a quiet lap more, 2,805 from the rivet; no train but the footing wagon train passes it without a kit errand); landed follows the loads; no stone stop on a kit errand', (t) => {
  const quarry = TRADE.yards.findIndex((y) => y.line === LINE2);
  const quarryS = RAIL_LINES[LINE2]!.halts[TRADE.yards[quarry]!.stop]!.s;
  const stone = (w: World) => w.get(Town, w.lookup(Town, 0)!)!.stone;
  const loaded = (w: World) => legRow(w, STACK).loadedLogs + legRow(w, STACK).loadedRails;
  stageWorlds().forEach((base, laid) => {
    const lap = quietLap(base);
    const s = unaudited({ w: restore(base.w), t: base.t }),
      stone0 = stone(s.w),
      loads: number[] = [],
      passes: string[] = [],
      bare: string[] = [];
    let fullSince = -1,
      opening = laid === 0, // until the opening's first full load is taken
      lastKit = 0,
      kits = loaded(s.w),
      prev = trains(s.w).map((r) => ({ ...r }));
    for (let k = 1; k <= 12000; k++) {
      const wasFull = s.w.get(Yard, s.w.lookup(Yard, quarry)!)!.stock >= TRADE.loadStop;
      advance(s, 1);
      if (opening && loaded(s.w) > kits) [kits, lastKit] = [loaded(s.w), k];
      const y = s.w.get(Yard, s.w.lookup(Yard, quarry)!)!.stock;
      if (fullSince >= 0 && y < TRADE.loadStop) {
        const wait = k - fullSince;
        if (opening) {
          // The opening transient: the last opening kit's load and one quiet lap, and never past the ruled figure.
          assert.ok(k <= lastKit + lap, `0 laid: the opening load taken at +${k} (last kit +${lastKit}, lap ${lap})`);
          assert.ok(k <= OPENING_CAP, `0 laid: the opening load taken at +${k} (ruled ${OPENING_CAP})`);
          opening = false;
        } else assert.ok(wait <= SETTLED_CAP, `${laid} laid: a full load waited ${wait} (allowed ${SETTLED_CAP})`);
        loads.push(k);
        fullSince = -1;
      }
      if (fullSince < 0 && y >= TRADE.loadStop) fullSince = k === 1 ? 0 : k;
      trains(s.w).forEach((r, slot) => {
        const p = prev[slot]!;
        if (RAIL_TRAINS[slot]!.line !== LINE2) return;
        // At the opening: a homeward train that runs past the Quarry's stop while a full load waits has a kit errand.
        if (opening && wasFull && p.phase !== TRAIN_PHASE.SHED && trainDir(p) < 0) {
          const was = trainAlong(p, LINE2, s.t - 1),
            now = trainAlong(r, LINE2, s.t);
          if (
            was >= quarryS &&
            now < quarryS &&
            !(r.phase === TRAIN_PHASE.STAND && r.at === TRADE.yards[quarry]!.stop)
          ) {
            const errand =
              p.logs + p.rails === 0
                ? kitOwed(s.w, p, LINE2)
                  ? 'owed a kit'
                  : ''
                : !legKitWaiting(s.w, LINE2, p)
                  ? p.legKit
                    ? "carries a leg's kit it can unload now"
                    : "carries the works' kit"
                  : '';
            passes.push(`train ${slot} at +${k}: ${errand || (p.wagon ? 'wagon' : 'no errand')}`);
            // The footing wagon's train makes no freight stop (slice 5 call 4): exempt by name (call 108).
            if (!errand && !p.wagon) bare.push(`train ${slot} at +${k}`);
          }
        }
        // (d) No stone stop by a train owed a kit, or carrying one it can unload now.
        if (r.freight <= p.freight || r.at <= 0) return;
        if (r.at === stopsOf(s.w, LINE2).length - 1) return;
        const errand =
          (p.logs + p.rails === 0 && kitOwed(s.w, p, LINE2)) || (p.logs + p.rails > 0 && !legKitWaiting(s.w, LINE2, p));
        assert.ok(!errand, `${laid} laid: a stone stop on a kit errand at ${s.t}`);
      });
      prev = trains(s.w).map((r) => ({ ...r }));
    }
    const landed = stone(s.w) - stone0,
      before = loads.filter((k) => k <= 12000 - lap).length;
    t.diagnostic(`${laid} laid: lap ${lap}; loads at ${loads.join(', ')}; landed ${landed}, at least ${8 * before}`);
    if (laid === 0)
      t.diagnostic(
        `0 laid: last opening kit loaded +${lastKit}; trains past a full load: ${passes.join('; ') || 'none'}`,
      );
    assert.deepEqual(
      bare,
      [],
      `${laid} laid: trains past a full load at the opening with no kit errand (the wagon's aside)`,
    );
    assert.ok(landed >= 8 * before, `${laid} laid: landed ${landed}`);
    if (laid === 0) assert.ok(landed >= 32, 'gate 5(c): 32 from the idle rivet');
  });
});

test('gate 14: fed every tick from the rivet, the Gorge within 3,700 ticks; the first frame idle at most 1,200, the others 600', (t) => {
  const f = fedLeg();
  t.diagnostic(`rivet to Gorge ${f.toGorge}; idle per frame ${f.idle.join(', ')}`);
  assert.ok(f.toGorge >= 0 && f.toGorge <= 3700, 'the Gorge within 3,700 ticks');
  assert.ok(f.idle[0]! <= 1200, 'the first frame');
  for (const v of f.idle.slice(1)) assert.ok(v <= 600, `a later frame idle ${v}`);
});

// ---------------------------------------------------------------- step 4's review: the catalog positions (b, k)
test("step 4's review: the frames, racks, pick and the incline's barrier stand where the designer placed them", () => {
  const near = (p: { x: number; z: number; y: number }, x: number, z: number, y: number) =>
    Math.abs(p.x - x) <= 3 && Math.abs(p.z - z) <= 3 && Math.abs(p.y - y) <= 1;
  assert.ok(near(legFrame(LEG, 0), 140602, -82506, 890), 'frame 0, u 453 on the west platform');
  assert.ok(near(legRack(LEG, 0), 140573, -81806, 890), 'rack 0, u 446');
  // The designer's metres, to 3 cm (his script rounds to the centimetre in metres).
  const frames = [
      [98075, -92138],
      [56692, -119448],
      [22663, -156630],
    ],
    racks = [
      [99056, -91995],
      [57442, -118787],
      [23207, -155792],
    ];
  for (let k = 1; k <= 3; k++) {
    assert.ok(near(legFrame(LEG, k), frames[k - 1]![0]!, frames[k - 1]![1]!, 490), `frame ${k}`);
    assert.ok(near(legRack(LEG, k), racks[k - 1]![0]!, racks[k - 1]![1]!, 490), `rack ${k}`);
  }
  for (let k = 0; k <= 3; k++) assert.equal(legFrame(LEG, k).reach, LEG_SITE_REACH);
  assert.equal(LEG_SITE_REACH, 400);
  assert.deepEqual(RAIL_GRANTS.find((g) => g.id === 'pick')!.at, { x: -7435, z: -203262, y: 8500, reach: 400 });
  const inc = RAIL_GATES.find((g) => g.id === 'incline')!.at;
  assert.deepEqual([inc.x, inc.z, inc.y], [-9726, -196884, 390]);
});

// ---------------------------------------------------------------- call 88: riding on from an old head
/** From each lay, the ticks until someone standing at the old head (who asks nothing: the lay leaves an up-way ask
 * there) is at the new head: aboard a train standing there at the lay (it runs on), or the first to stand there going
 * up after it; then that train stands at the new end. `step` takes the rows as they stood before the tick. */
function rideOnWatch() {
  let pending: { at: number; from: number; to: number; slots: Set<number> } | undefined;
  let laid = -1;
  const out: number[] = [];
  return {
    step(w: World, tick: number, before: readonly Readonly<{ phase: number; at: number }>[]) {
      const n = legRow(w, STACK).laid;
      if (laid < 0) laid = n;
      if (n > laid) {
        const from = n === 1 ? RING : HEAD + n - 2;
        pending = { at: tick, from, to: stopsOf(w, LINE2).length - 1, slots: new Set() };
        // Standing there as the section lays: whoever waits at the old head is aboard (call 88: that train runs on).
        for (const k of LINE_SLOTS[LINE2]!)
          if (before[k]!.phase === TRAIN_PHASE.STAND && before[k]!.at === from && n > 1) pending.slots.add(k);
        laid = n;
      }
      if (!pending) return;
      for (const k of servingSlots((j) => train(w, j), LINE2)) {
        const r = train(w, k);
        if (r.phase === TRAIN_PHASE.STAND && r.at === pending.from && r.track === 0) pending.slots.add(k);
        if (pending.slots.has(k) && r.phase === TRAIN_PHASE.STAND && r.at === pending.to) {
          out.push(tick - pending.at);
          pending = undefined;
          return;
        }
      }
    },
    done: () => out,
  };
}
test('call 88: fed every tick, someone at each old head is at the new head within 1,158 ticks of the lay', (t) => {
  const f = fedLeg();
  t.diagnostic(`old head to the new head after each lay: ${f.rides.join(', ')} ticks`);
  assert.equal(f.rides.length, N, 'every lay ridden on');
  for (const v of f.rides) assert.ok(v <= SETTLED_CAP, `a ride on took ${v}`);
});
for (const seed of [0xc0ffee, 0x777, 0x5eed, 0xbadd])
  test(`call 88, fuzz ${seed.toString(16)} at 75%: someone at each old head is at the new head within 1,158 ticks`, (t) => {
    let s = unaudited(copy(JOINED));
    const rand = mulberry32(seed),
      w = rideOnWatch();
    for (let k = 0; k < FUZZ && (legRow(s.w, STACK).laid < N || w.done().length < N); k++) {
      if (k % 30 === 0) stock(s);
      if (rand() < 0.05) {
        const id = askPool(s.w)[Math.floor(rand() * askPool(s.w).length)]!,
          dir = rand() < 0.5 ? -1 : 1;
        if (RAIL_HALTS[id]!.stop < stopsOf(s.w, RAIL_HALTS[id]!.line).length) ask(s, { id, dir });
      }
      const before = trains(s.w).map((r) => ({ ...r }));
      railTick(s.w, ++s.t, 75);
      w.step(s.w, s.t, before);
      if (k % 250 === 0) assert.equal(invariant(s.w), null, `invariant at ${s.t}`);
      if (rand() < 0.002) s = unaudited({ w: restore(s.w), t: s.t });
    }
    t.diagnostic(`old head to the new head after each lay: ${w.done().join(', ')} ticks`);
    if (ROUTE_GATES) assert.equal(w.done().length, N, 'every lay ridden on');
    for (const v of w.done()) assert.ok(v <= SETTLED_CAP, `a ride on took ${v}`);
  });

// ---------------------------------------------------------------- delayed arrival after a lay (docs/research/leg1-lost-ask.md)
const ASK_WAIT = 3600;
/** One second of continuous stand on the outward track is a sim boarding opportunity, not a physics boarding proof.
 * No next section is fed during this observation: closure two lays later cannot explain a missing train. */
function headWait(base: Seed, delays: readonly number[], renew = false, limit = ASK_WAIT) {
  const s = unaudited(copy(base)),
    laid = legRow(s.w, STACK).laid,
    from = laid === 1 ? RING : HEAD + laid - 2,
    stops = stopsOf(s.w, LINE2),
    trace: unknown[] = [],
    waits: (number | null)[] = delays.map(() => null),
    last = Math.max(...delays) + limit;
  let window = -1,
    slot = -1,
    previous = '';
  const sample = (dt: number) => {
    const req = line(s.w, LINE2).req,
      active = reqHas(req, from, 1, stops.length),
      assigned = active ? trainServes((k) => train(s.w, k), LINE2, stops, from, 1, s.t) : -1;
    const fleet = LINE_SLOTS[LINE2]!.map((k) => {
      const r = train(s.w, k);
      return {
        slot: k,
        phase: r.phase,
        at: r.at,
        to: r.to,
        track: r.track,
        cm: Math.round(trainAlong(r, LINE2, s.t)),
        req: r.req,
        depart: r.depart,
        turn: r.turn,
        kit: r.legKit,
        cargo: r.logs + r.rails,
        owed: kitOwed(s.w, r, LINE2),
        controlOff:
          footingsOwed(s.w, LINE2) || (r.logs + r.rails > 0 && !legKitWaiting(s.w, LINE2, r)) || kitOwed(s.w, r, LINE2),
      };
    });
    const key = JSON.stringify([active, assigned, fleet.map((r) => [r.phase, r.at, r.to, r.track, r.req])]);
    if (key !== previous || delays.includes(dt) || dt === last) {
      trace.push({ dt, active, assigned, fleet });
      previous = key;
    }
  };
  for (let dt = 0; dt <= last; dt++) {
    if (renew && dt === delays[0])
      assert.ok(
        ask(s, { id: haltId(LINE2, from), dir: 1 }) || reqHas(line(s.w, LINE2).req, from, 1, stops.length),
        'arrival ask accepted or already pending',
      );
    sample(dt);
    const standing = LINE_SLOTS[LINE2]!.find((k) => {
      const r = train(s.w, k);
      return r.phase === TRAIN_PHASE.STAND && r.at === from && r.track === 0;
    });
    if (standing !== undefined) {
      if (slot !== standing) {
        slot = standing;
        window = dt;
      }
      for (let j = 0; j < delays.length; j++) {
        const start = Math.max(window, delays[j]!);
        if (waits[j] === null && dt - start >= 9 && start - delays[j]! <= limit) waits[j] = start - delays[j]!;
      }
      if (waits.every((v) => v !== null)) break;
    } else {
      slot = -1;
      window = -1;
    }
    if (dt < last) railTick(s.w, ++s.t, 75);
  }
  assert.equal(invariant(s.w), null);
  return { waits, trace };
}

// Explicit opt-in: 16 random schedules, two real seeds, each remaining lay, five arrival delays, with/without a
// fresh outward ask. Quiet/light background asks vary the approach to the lay; none rescue the waiting rider.
if (process.env.LEG_ASK_FUZZ === '1') {
  const totals: { stage: string; section: number; seed: number; delay: number; renew: boolean; wait: number | null }[] =
    [];
  for (const stage of ['gorge-open', 'gorge-mid'] as const)
    for (let seed = 0; seed < 16; seed++)
      test(`lost ask fuzz ${stage} seed ${seed}`, { timeout: 60000 }, (t) => {
        const s = unaudited(buildSeedWorld(stage)),
          rand = mulberry32(seed);
        const step = () => {
          if (seed % 2 && rand() < 0.05) {
            const pool = askPool(s.w);
            ask(s, { id: pool[Math.floor(rand() * pool.length)]!, dir: rand() < 0.5 ? -1 : 1 });
          }
          railTick(s.w, ++s.t, 75);
        };
        while (legRow(s.w, STACK).laid < N) {
          const before = legRow(s.w, STACK).laid;
          for (let k = Math.floor(rand() * 1200); k > 0; k--) step();
          // Accepted rack take/feed ops, with a random 1..30 tick gap between carries; no direct state patch.
          for (let guard = 0; legRow(s.w, STACK).laid === before; guard++) {
            assert.ok(guard < 8000, 'section lays within the bounded feed loop');
            if (guard % 30 === 0 || rand() < 0.1) stock(s);
            step();
          }
          assert.equal(invariant(s.w), null);
          const delays = [0, 10, 50, 150, 600],
            automatic = headWait(s, delays);
          for (const [j, delay] of delays.entries())
            for (const renew of [false, true]) {
              const result = renew ? headWait(s, [delay], true) : automatic,
                wait = result.waits[renew ? 0 : j]!,
                row = { stage, section: before + 1, seed, delay, renew, wait };
              totals.push(row);
              t.diagnostic(`CASE ${JSON.stringify(row)}`);
              if (wait === null || wait > 1200)
                t.diagnostic(`TRACE ${JSON.stringify({ ...row, layTick: s.t, trace: result.trace })}`);
            }
        }
      });
  test('lost ask fuzz distribution', () => {
    for (const renew of [false, true])
      for (let section = 1; section <= N; section++) {
        const rows = totals.filter((r) => r.renew === renew && r.section === section),
          served = rows.flatMap((r) => (r.wait === null ? [] : [r.wait])).sort((a, b) => a - b);
        console.log(
          'DISTRIBUTION',
          JSON.stringify({
            renew,
            section,
            n: rows.length,
            censored: rows.length - served.length,
            over1200: rows.filter((r) => r.wait === null || r.wait > 1200).length,
            min: served[0],
            median: served[Math.floor(served.length / 2)],
            p95: served[Math.floor(served.length * 0.95)],
            max: served.at(-1),
          }),
        );
      }
  });
}

// Shared replay fixture, outside the timeout as LEAF/JOINED above. Keep the desired-behaviour assertion visibly
// failing as TODO until the separately reviewed rule fix; LEG_ASK_RED=1 makes this an ordinary red test.
const HEAD2_LAY = unaudited(buildSeedWorld('gorge-mid'));
feedSection(HEAD2_LAY);
test(
  'lost ask: a rider arriving one second after section 3 lays gets an outward train within 1,200 ticks',
  { todo: process.env.LEG_ASK_RED !== '1' && 'Known defect; src/sim fix intentionally outside this diagnosis' },
  (t) => {
    const result = headWait(HEAD2_LAY, [10], false, 1201);
    t.diagnostic(`lay=${HEAD2_LAY.t}; arrival=+10; waits=${JSON.stringify(result.waits)}`);
    if (process.env.LEG_ASK_RED === '1') t.diagnostic(`TRACE ${JSON.stringify(result.trace)}`);
    assert.ok(result.waits[0] !== null && result.waits[0]! <= 1200, 'no outward boarding window within 1,200 ticks');
  },
);

test('lost ask mechanism: the redirected train consumes it after seven ticks; a fresh ask restores service', () => {
  const s = unaudited(copy(HEAD2_LAY)),
    from = HEAD + 1,
    n = stopsOf(s.w, LINE2).length;
  assert.equal(s.t, 13748);
  assert.equal(
    trainServes((k) => train(s.w, k), LINE2, stopsOf(s.w, LINE2), from, 1, s.t),
    4,
  );
  assert.equal(train(s.w, 4).at, from);
  assert.equal(train(s.w, 4).track, 0);
  assert.equal(train(s.w, 4).depart + TRAIN.dwellTicks - s.t, 7, 'the lay did not restart its dwell');
  assert.ok(reqHas(line(s.w, LINE2).req, from, 1, n));
  for (let k = 0; k < 7; k++) railTick(s.w, ++s.t, 75);
  assert.equal(train(s.w, 4).phase, TRAIN_PHASE.RUN);
  assert.ok(!reqHas(line(s.w, LINE2).req, from, 1, n), 'leaving clears the lay ask');
  const recovered = headWait(HEAD2_LAY, [10], true, 1200).waits[0];
  assert.ok(recovered !== null && recovered! <= 1200, 'the same fleet serves a fresh ask');
});

test('an open end shares one request digit, but the old head has distinct ways after growth', () => {
  assert.equal(reqIndex(HEAD + 1, 1, HEAD + 2), reqIndex(HEAD + 1, -1, HEAD + 2));
  assert.notEqual(reqIndex(HEAD + 1, 1, HEAD + 3), reqIndex(HEAD + 1, -1, HEAD + 3));
});

// ---------------------------------------------------------------- the step 4 review's finding 2: a unit lost
test('a unit lifted off the leg rack and lost is owed again; one carried to the frame is not loaded twice', () => {
  const s = copy(JOINED);
  while (rail(s.w).depotRails < 20) advance(s, 1);
  const need0 = legKitNeed(s.w, STACK).rails;
  act(s, 'a', 'rail.depotRailTake');
  const carried = acc(s, 'a').rails;
  assert.ok(carried > 0);
  assert.equal(legKitNeed(s.w, STACK).rails, need0, 'on a back it still counts');
  // A pile takes as many as its cap (the rest stays on the back, still counted).
  const dropped = act(s, 'a', 'rail.drop', { x: 140573, y: 890, z: -81806, n: carried, kind: 2 });
  assert.ok(dropped > 0);
  assert.equal(legKitNeed(s.w, STACK).rails, need0 + dropped, 'dropped, it is owed again');
  feedSection(s);
  assert.equal(legRow(s.w, STACK).laid, 1, 'the section still lays');
  assert.equal(invariant(s.w), null);
});

// The step 3 review's P2-2: the leg counts the units lifted off its rack (Leg.heldLogs, Leg.heldRails), not every back's.
test("rack units held count; fed to the steel works or a leaver's released they are owed again, never under 0", () => {
  const s = copy(JOINED);
  while (rail(s.w).depotRails < 20) advance(s, 1);
  // Units on a back that never came off the rack make no holder: chopped logs count for nothing here.
  chopTo(s, 'b', 4);
  assert.ok(acc(s, 'b').carry > 0);
  assert.deepEqual(railLegKitHolders(s.w), [], 'nobody has lifted off the rack');
  const need0 = legKitNeed(s.w, STACK).rails;
  const lifted = act(s, 'a', 'rail.depotRailTake');
  assert.ok(lifted > 0);
  assert.equal(legRow(s.w, STACK).heldRails, lifted, 'held');
  assert.equal(legKitNeed(s.w, STACK).rails, need0, 'held, it still counts');
  // Fed to the steel works instead: owed again.
  const fed = act(s, 'a', 'rail.steel');
  assert.ok(fed > 0, 'the works takes them');
  assert.equal(legRow(s.w, STACK).heldRails, lifted - fed);
  assert.equal(legKitNeed(s.w, STACK).rails, need0 + fed, 'fed to the works, owed again');
  // b lifts the rest and leaves: past the grace the host releases b's own lifted units, once; a's stay counted.
  const more = act(s, 'b', 'rail.depotRailTake');
  assert.ok(more > 0);
  const held = legRow(s.w, STACK).heldRails,
    need1 = legKitNeed(s.w, STACK).rails,
    ofA = acc(s, 'a').legRails;
  const b = { ...acc(s, 'b') };
  assert.equal(b.legRails + ofA, held, "the leg's held count is the accounts' lifted counts");
  assert.ok(b.legRails > 0);
  assert.ok(
    railLegKitHolders(s.w).some((h) => h.pid === 'b' && h.epoch === b.epoch),
    "the host's leaver check sees b",
  );
  assert.equal(railLegKitRelease(s.w, 'b', b.epoch + 1), 0, 'a session that has since changed keeps them');
  const released = railLegKitRelease(s.w, 'b', b.epoch);
  assert.equal(released, b.legRails, "b's own units only");
  assert.equal(railLegKitRelease(s.w, 'b', b.epoch), 0, 'a second release finds none');
  assert.equal(legRow(s.w, STACK).heldRails, ofA, "a's stay counted");
  assert.ok(!railLegKitHolders(s.w).some((h) => h.pid === 'b'), 'released, b is no holder');
  assert.equal(legKitNeed(s.w, STACK).rails, need1 + released, "a leaver's are owed again");
  assert.equal(invariant(s.w), null);
  // The leg completes with b's rails never coming back.
  for (let k = legRow(s.w, STACK).laid; k < N; k++) feedSection(s);
  assert.equal(legRow(s.w, STACK).laid, N);
  assert.deepEqual([legRow(s.w, STACK).heldLogs, legRow(s.w, STACK).heldRails], [0, 0], 'none held once complete');
  assert.equal(invariant(s.w), null);
});

// ---------------------------------------------------------------- steel first (call 64; owner, 12 November)
const steelRow = (w: World) => w.get(Steel, w.single(Steel))!;
const bay = (w: World) => w.get(Shed, w.single(Shed))!.steel;
/** Take what the steel yard holds and feed the works, as build 2's own test does (test/railway-steel.test.ts). */
function feedSteel(s: Seed, pid = 'a') {
  for (const kind of [0, 1])
    for (let k = 0; k < 8; k++) {
      act(s, pid, 'rail.steelTake', { kind });
      if (!act(s, pid, 'rail.steel')) break;
    }
}
/** One tick, with the kit car's ledger checked: what the trains took aboard is what the leg and the works gave, each onto
 * its own trains (a leg's onto a marked train, the works' onto an unmarked one), a train's cargo never changes owner
 * while it has any, and no leg kit loads on a tick that ends with the works still wanting kit brought. */
function steelFirstTick(s: Seed, what: string) {
  const before = trains(s.w).map((r) => ({ ...r })),
    leg0 = legRow(s.w, STACK).loadedLogs + legRow(s.w, STACK).loadedRails,
    out0 = steelRow(s.w).outLogs + steelRow(s.w).outRails;
  advance(s, 1);
  const dLeg = legRow(s.w, STACK).loadedLogs + legRow(s.w, STACK).loadedRails - leg0,
    dSteel = steelRow(s.w).outLogs + steelRow(s.w).outRails - out0;
  let onLeg = 0,
    onSteel = 0;
  trains(s.w).forEach((r, slot) => {
    const p = before[slot]!,
      had = p.logs + p.rails,
      has = r.logs + r.rails;
    assert.equal(!!r.legKit && has === 0, false, `${what}: train ${slot} marked with nothing aboard at ${s.t}`);
    if (had > 0 && has > 0)
      assert.equal(!!r.legKit, !!p.legKit, `${what}: train ${slot}'s kit changed owner at ${s.t}`);
    // Loads happen only standing at the Village; an unload and a load never share a tick there.
    const up = Math.max(0, r.logs - p.logs) + Math.max(0, r.rails - p.rails);
    if (r.legKit) onLeg += up;
    else onSteel += up;
  });
  assert.deepEqual([onLeg, onSteel], [dLeg, dSteel], `${what}: each kit onto its own trains at ${s.t}`);
  const need = steelNeed(s.w);
  if (need.logs + need.rails > 0)
    assert.equal(dLeg, 0, `${what}: a leg kit loaded while the works wants kit at ${s.t}`);
}
test('steel first: a train never carries both kits; no leg kit loads while the works wants one; a lost steel load comes again while the leg is fed', (t) => {
  const s = unaudited(copy(JOINED)),
    t0 = s.t;
  // At the rivet the works' kit is aboard and none of the leg's is loaded.
  assert.deepEqual([steelRow(s.w).outLogs, steelRow(s.w).outRails], [STEEL.logs, STEEL.rails]);
  assert.deepEqual([legRow(s.w, STACK).loadedLogs, legRow(s.w, STACK).loadedRails], [0, 0]);
  const feedLeg = () => legRow(s.w, STACK).laid < N && legRow(s.w, STACK).start < 0 && stock(s);
  const run = (ok: () => boolean, max: number, what: string) => {
    for (let k = 0; !ok(); k++) {
      assert.ok(k < max, `${what} in time (tick ${s.t})`);
      feedLeg();
      steelFirstTick(s, what);
      if (k % 250 === 0) assert.equal(invariant(s.w), null, `${what} at ${s.t}`);
    }
  };
  let firstLeg = -1;
  run(
    () => {
      if (firstLeg < 0 && legRow(s.w, STACK).loadedLogs > 0) firstLeg = s.t - t0;
      return steelRow(s.w).yardLogs + steelRow(s.w).yardRails === STEEL.logs + STEEL.rails;
    },
    4000,
    'the steel kit in the yard',
  );
  const yardAt = s.t - t0;
  // The yard's logs carried off and dropped are ordinary cargo: the works wants them again (build 2's finding 2), and
  // from here no leg kit loads until a train has them aboard.
  assert.equal(act(s, 'a', 'rail.steelTake', { kind: 0 }), STEEL.logs);
  assert.equal(act(s, 'a', 'rail.drop', { kind: 0, n: STEEL.logs, x: 141000, y: 890, z: -81500 }), STEEL.logs);
  assert.deepEqual(steelNeed(s.w), { logs: STEEL.logs, rails: 0 });
  const lostAt = s.t,
    legAtLoss = legRow(s.w, STACK).loadedLogs;
  run(() => steelNeed(s.w).logs === 0, 6000, 'the lost logs aboard again');
  assert.equal(legRow(s.w, STACK).loadedLogs, legAtLoss, 'no leg kit loaded while the works wanted its logs');
  const aboardIn = s.t - lostAt;
  // Build 2's own bound for a lost load (test/railway-steel.test.ts: 6,000 ticks), with the leg fed throughout.
  run(() => steelRow(s.w).yardLogs === STEEL.logs, 6000, 'the lost logs in the yard again');
  const againIn = s.t - lostAt;
  feedSteel(s);
  assert.ok(steelRow(s.w).lit >= 0, 'lit');
  run(() => legRow(s.w, STACK).laid === N && bay(s.w) === STEEL.total, 40000, 'the Gorge open and all twelve home');
  assert.equal(invariant(s.w), null);
  t.diagnostic(
    `steel kit in the yard +${yardAt}; first leg kit loaded +${firstLeg}; a lost steel load aboard again in ${aboardIn}, in the yard in ${againIn}`,
  );
});

// Build 2 alone (origin/main 4e769acd, v31), the same script from `ring-joined`: the kit in the yard, the works fed
// the tick it lands, the install pressed the tick the first steel is home. Measured with the leg's rules absent.
const BUILD2 = { yard: 651, home: 1824 } as const;
function gate15(fed: boolean) {
  const s = unaudited(copy(JOINED)),
    t0 = s.t;
  let yard = -1,
    home = -1,
    installed = -1;
  for (let k = 0; installed < 0; k++) {
    assert.ok(k < 12000, `gate 15 (${fed ? 'fed' : 'idle'}): the install in time`);
    if (fed && legRow(s.w, STACK).laid < N && legRow(s.w, STACK).start < 0) stock(s);
    steelFirstTick(s, `gate 15 ${fed ? 'fed' : 'idle'}`);
    const st = steelRow(s.w);
    if (yard < 0 && st.yardLogs + st.yardRails === STEEL.logs + STEEL.rails) yard = s.t - t0;
    if (yard >= 0 && st.lit < 0) feedSteel(s);
    if (home < 0 && bay(s.w) >= 1) home = s.t - t0;
    if (home >= 0 && act(s, 'a', 'rail.install', { line: LINE2, part: 1, revision: 0 })) installed = s.t - t0;
  }
  assert.equal(invariant(s.w), null);
  return { yard, home, installed };
}
test("gate 15: with the leg open the steel kit reaches the yard on build 2's own tick; first steel home and the install at most 1,050 ticks later", (t) => {
  for (const fed of [false, true]) {
    const g = gate15(fed);
    t.diagnostic(
      `leg ${fed ? 'fed every tick' : 'idle'}: kit in the yard +${g.yard} (build 2 alone +${BUILD2.yard}); first steel home +${g.home} and the install +${g.installed} (build 2 alone +${BUILD2.home})`,
    );
    assert.equal(g.yard, BUILD2.yard, "the steel kit on build 2's own tick");
    assert.ok(g.home <= BUILD2.home + 1050, `first steel home +${g.home}`);
    assert.ok(g.installed <= BUILD2.home + 1050, `the install +${g.installed}`);
  }
});
