// Ring Island's gap on the world (docs/plans/ring-island-build1.md, R3b, v27): the ops' gates (the jib before Q7, the
// brace and counterweight before the gap is footed, the rivet before the leaf is down), brace and weights in either
// order, repeats that move nothing, the trains' Railhead holding at the old head through a haul and moving at its
// settle with trains at and running to it (docs/plans/railhead-reroute.md), the island opening on
// the rivet with a train in each of endMoved's cases, Q7's kit at the Pier (call 62), the wagon's ring footings only
// after Q7 (call 65), footing conservation and an empty pier rack under random ops, a leaver, and the world check on each
// seed stage. Every `act` checks the whole world (railwayCheck) after its op.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import { railwayAtRing, RING_STAGES } from '../src/sim/railway-seed-ring.ts';
import { Aperture, Line, Train } from '../src/sim/railway-components.ts';
import { LINE2_STATIONS, Q7 } from '../src/sim/railway-line2-layout.ts';
import { RAIL_HALTS } from '../src/sim/railway-lines.ts';
import { RING_HEAD, RING_END } from '../src/sim/railway-ring-layout.ts';
import { HAUL, haulEnd, haulSettled, haulTarget, haulU } from '../src/sim/railway-ring-haul.ts';
import { TRAIN, TRAIN_PHASE, trainAlong, type RailTrain } from '../src/sim/railway-train.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { LINE_SLOTS } from '../src/sim/railway-trains.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import { footingTotal } from '../src/sim/railway-queries-works.ts';
import { roomWorks } from '../src/sim/railway-queries-room.ts';
import { standingAt } from './helpers/rail-rows.ts';
import { worldVerdict, stageWorld } from './helpers/railway-check.ts';
import {
  account,
  act,
  advanceWorks,
  aperture,
  invariant,
  railFootRelease,
  railwayAtWorks,
  rail,
  restore,
  ringHead,
  ringOpen,
  stopsOf,
  train,
  trains,
  works,
  type Seed,
} from './helpers/rail.ts';

const LINE2 = 1;
const [A, B, C] = LINE_SLOTS[LINE2] as [number, number, number];
const halt = (name: string) => RAIL_HALTS.findIndex((h) => h.name === name);
const PIER = halt('Pier'),
  RAILHEAD = halt('Railhead');
const seed = (s: Seed): Seed => ({ w: restore(s.w), t: s.t });
/** A footing from the railhead rack to the jib: 1 if both ops were accepted. */
const carry = (s: Seed, pid = 'a') =>
  act(s, pid, 'rail.footTake', { rack: 2 }) && act(s, pid, 'rail.footSet', { site: 3 });
/** Advance until `ok`, checking footings every tick. */
function until(s: Seed, ok: () => boolean, max = 6000) {
  for (let t = 0; !ok(); t++) {
    assert.ok(t < max, `in time (tick ${s.t})`);
    advanceWorks(s, 1);
  }
}
/** Lay the row's pose on slot `k` (a test's placement): its cargo (kit, wagon, footings) stays as it is. */
function put(s: Seed, k: number, row: Partial<RailTrain>) {
  const pose: Partial<RailTrain> = { ...row };
  for (const f of ['logs', 'rails', 'wagon', 'foot'] as const) delete pose[f];
  Object.assign(s.w.mut(Train, s.w.lookup(Train, k)!)!, pose);
}
const running = (from: number, to: number, dest: number, tick: number): Partial<RailTrain> => ({
  phase: TRAIN_PHASE.RUN,
  at: to - 1,
  to,
  track: 0,
  depart: tick,
  arrived: tick,
  req: 0,
  from,
  v0: 0,
  dest,
  turn: false,
  origin: 0,
});

test('each ring op is refused before its gate and accepted after', () => {
  // The jib is refused before Q7 (a footing off the Works rack, offered at site 3).
  const before = seed(railwayAtWorks('crossing-done'));
  until(before, () => works(before.w).rack > 0);
  assert.equal(act(before, 'a', 'rail.footTake', { rack: 0 }), 1);
  assert.equal(act(before, 'a', 'rail.footSet', { site: 3 }), 0, 'site 3 before Q7');
  assert.equal(act(before, 'a', 'rail.footTake', { rack: 2 }), 0, 'an empty railhead rack');
  // At deck-laid (Q7 laid): the brace and the rivet are refused; the jib takes the first bent's footing.
  const deck = seed(railwayAtRing('deck-laid'));
  assert.equal(act(deck, 'a', 'rail.brace', { revision: 1 }), 0, 'the brace before set === 14');
  assert.equal(act(deck, 'a', 'rail.strike', { id: 2 }), 0, 'the rivet before the leaf is down');
  until(deck, () => aperture(deck.w).rack > 0);
  assert.equal(carry(deck), 1);
  assert.deepEqual([aperture(deck.w).set, aperture(deck.w).cw], [1, 0]);
  // At gap-footed: the counterweight hangs, the brace takes, the rivet waits for the leaf.
  const gap = seed(railwayAtRing('gap-footed'));
  assert.equal(act(gap, 'a', 'rail.strike', { id: 2 }), 0, 'the rivet with the leaf raised');
  assert.equal(act(gap, 'a', 'rail.brace', { revision: 2 }), 0, 'a brace naming another leaf');
  assert.equal(act(gap, 'a', 'rail.brace', { revision: 1 }), 1);
  assert.equal(aperture(gap.w).brace, 2, 'braced');
  assert.equal(act(gap, 'a', 'rail.strike', { id: 2 }), 0, 'the rivet with the leaf braced, not down');
});

test('room works follows the bents jib after a pair of footings moves the railhead', () => {
  const deck = railwayAtRing('deck-laid');
  until(deck, () => aperture(deck.w).rack >= 2);
  assert.equal(carry(deck), 1);
  assert.equal(carry(deck), 1);
  until(deck, () => haulSettled(aperture(deck.w), deck.t));
  assert.equal(ringHead(deck.w), 1);
  const result = roomWorks(deck.w);
  const { x, y, z } = RING_HEAD[1]!.jib;
  assert.equal(result.site, 'bents');
  assert.deepEqual(result.at, { x, y, z });
  assert.deepEqual(result.needs, [{ what: 'footings', have: 2, of: WORKS.ring }]);
});

test('brace then four weights, and four weights then brace: the leaf is down on the last accepted op', () => {
  const a = seed(railwayAtRing('leaf-raised'));
  assert.equal(act(a, 'a', 'rail.brace', { revision: 1 }), 1);
  for (let k = 0; k < WORKS.counterweight; k++) {
    assert.equal(aperture(a.w).brace, 2, `braced, ${k} hung`);
    assert.equal(carry(a), 1);
  }
  assert.equal(aperture(a.w).brace, 0, 'down on the fourth weight');
  const b = seed(railwayAtRing('leaf-raised'));
  for (let k = 0; k < WORKS.counterweight; k++) assert.equal(carry(b), 1);
  assert.deepEqual([aperture(b.w).cw, aperture(b.w).brace], [4, 1], 'four hung, still raised on its pawl');
  assert.equal(act(b, 'a', 'rail.brace', { revision: 1 }), 1);
  assert.equal(aperture(b.w).brace, 0, 'down on the brace');
  // A repeat brace or strike moves nothing (only the actor's request outcome is recorded).
  const was = { ...aperture(b.w) };
  assert.equal(act(b, 'a', 'rail.brace', { revision: 1 }), 0);
  assert.deepEqual({ ...aperture(b.w) }, was, 'a repeat brace');
  assert.equal(act(b, 'a', 'rail.strike', { id: 2 }), 1);
  const joined = { ...aperture(b.w) },
    rows = trains(b.w).map((r) => ({ ...r }));
  assert.equal(act(b, 'a', 'rail.strike', { id: 2 }), 0);
  assert.deepEqual({ ...aperture(b.w) }, joined, 'a repeat strike');
  assert.deepEqual(
    trains(b.w).map((r) => ({ ...r })),
    rows,
    'and no train replanned',
  );
});

/** Line 2's trains placed for one case at the Railhead: `k` as given, the other two standing at the Village going up
 * and the Quarry going down, their dwell just begun. */
function placeAt(s: Seed, k: number, row: Partial<RailTrain>) {
  const stops = stopsOf(s.w, LINE2);
  const [p, q] = [A, B, C].filter((x) => x !== k);
  put(s, p!, standingAt(stops, 0, 0, s.t));
  put(s, q!, standingAt(stops, 1, 1, s.t));
  put(s, k, row);
  for (const id of s.w.ids(Line)) Object.assign(s.w.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
  const placed = invariant(s.w);
  if (placed !== null) assert.fail(`the placement (tick ${s.t}): ${placed}`);
}

/** The world check at the rule tick the world stands at (the haul's invariants need it). */
const checkAt = (s: Seed, what: string) => assert.doesNotThrow(() => railwayCheck(s.w, s.t), `${what} (tick ${s.t})`);
/** Carry the next pair (two footings) once the rack holds them: the tick of the second, the haul's end. */
function pair(s: Seed) {
  until(s, () => aperture(s.w).rack >= 2 - (aperture(s.w).set % 2));
  if (aperture(s.w).set % 2 === 0) assert.equal(carry(s), 1);
  assert.equal(carry(s, 'b'), 1);
  assert.equal(aperture(s.w).set % 2, 0, 'a pair');
  return { at: s.t, end: haulEnd(aperture(s.w)) };
}

test("a pair leaves the trains' Railhead at the old head until the haul settles", () => {
  const s = seed(railwayAtRing('deck-laid'));
  assert.equal(aperture(s.w).stop, 0);
  const { at, end } = pair(s);
  assert.equal(end - at, HAUL.after + HAUL.ready + 48 + HAUL.settle, 'a 20 m haul settles 12.7 s after the pair');
  assert.equal(ringHead(s.w), 1, 'the rack and the jib are a bent on from the pair');
  for (; s.t < end; advanceWorks(s, 1)) {
    assert.equal(aperture(s.w).stop, 0, `the stop holds through the haul (tick ${s.t})`);
    assert.equal(ringOpen(s.w).head, 0);
    assert.equal(stopsOf(s.w, LINE2)[4], RING_HEAD[0]!.s, 'the Railhead stop at the old head');
    checkAt(s, 'mid-haul');
  }
  assert.equal(s.t, end);
  assert.equal(aperture(s.w).stop, 1, 'at haulEnd the stop follows the deck');
  assert.equal(stopsOf(s.w, LINE2)[4], RING_HEAD[1]!.s);
  checkAt(s, 'settled');
});

test('at haulEnd a train standing at the old head leaves homeward; one running replans with no jump', () => {
  // The end block holds one train, so the two cases take turns, bent by bent. Each train is placed on the tick before
  // the haul settles: the re-route is the settle's, not the pair's.
  const s = seed(railwayAtRing('deck-laid'));
  const cases: [number, number] = [0, 0];
  while (aperture(s.w).set < WORKS.ring) {
    const { end } = pair(s);
    const old = aperture(s.w).stop,
      head = ringHead(s.w),
      standingCase = head % 2 === 1;
    advanceWorks(s, end - 1 - s.t);
    assert.equal(aperture(s.w).stop, old, 'still the old head the tick before');
    const stops = stopsOf(s.w, LINE2);
    assert.equal(stops[4], RING_HEAD[old]!.s);
    placeAt(s, A, standingCase ? standingAt(stops, 4, 1, s.t) : running(stops[3]!, 4, stops[4]!, s.t - 20));
    const along = trainAlong(train(s.w, A), LINE2, end);
    advanceWorks(s, 1);
    assert.equal(s.t, end);
    assert.equal(aperture(s.w).stop, head, 'the stop moved at haulEnd');
    assert.equal(stopsOf(s.w, LINE2)[4], RING_HEAD[head]!.s, 'the Railhead stop a bent on');
    const a = train(s.w, A);
    assert.equal(trainAlong(a, LINE2, s.t), along, 'from where it was, no jump');
    if (standingCase) {
      assert.notEqual(a.at, 4, 'no longer standing at the Railhead');
      assert.ok(a.phase === TRAIN_PHASE.RUN ? a.track === 1 : a.at === -1 && a.to === -1, 'a signal stand');
      until(s, () => train(s.w, A).phase === TRAIN_PHASE.RUN, 600);
      assert.equal(train(s.w, A).track, 1, 'it leaves homeward');
    } else {
      assert.equal(a.dest, RING_HEAD[head]!.s, 'the one running to it is replanned to the new stop');
      assert.equal(a.to, 4);
    }
    cases[standingCase ? 0 : 1]++;
    checkAt(s, 'settled');
  }
  assert.deepEqual(cases, [4, 3], 'seven moves: four with a train standing, three with one running');
  assert.equal(stopsOf(s.w, LINE2).length, 5, 'the island still shut');
});

test('a train arriving mid-haul stands its dwell at the old head', () => {
  const s = seed(railwayAtRing('deck-laid'));
  const { end } = pair(s);
  const stops = stopsOf(s.w, LINE2);
  placeAt(s, A, running(stops[4]! - 3000, 4, stops[4]!, s.t));
  until(s, () => train(s.w, A).phase === TRAIN_PHASE.STAND, 200);
  const arrived = s.t;
  assert.ok(arrived + TRAIN.dwellTicks < end, `it arrives (tick ${arrived}) with its dwell inside the haul (${end})`);
  assert.deepEqual([train(s.w, A).at, train(s.w, A).from], [4, RING_HEAD[0]!.s], 'standing at the old head');
  for (; s.t < arrived + TRAIN.dwellTicks; advanceWorks(s, 1)) {
    assert.deepEqual([train(s.w, A).phase, train(s.w, A).at], [TRAIN_PHASE.STAND, 4], `its dwell (tick ${s.t})`);
    checkAt(s, 'mid-haul');
  }
  assert.equal(aperture(s.w).stop, 0, 'the haul still running');
});

test("a pair inside the last haul's chock moves the stop once, at its own settle", () => {
  const s = seed(railwayAtRing('deck-laid'));
  until(s, () => aperture(s.w).rack >= 4);
  const first = pair(s);
  // Into the chock: travel done, not yet settled.
  advanceWorks(s, first.end - 4 - s.t);
  assert.equal(haulU(aperture(s.w), s.t), RING_HEAD[1]!.u, 'the deck at the new head, chocking');
  assert.ok(!haulSettled(aperture(s.w), s.t));
  const second = pair(s);
  assert.equal(second.at, first.end - 4, 'the second pair inside the chock');
  const moves: number[] = [];
  let was = aperture(s.w).stop;
  while (s.t < second.end + 20) {
    advanceWorks(s, 1);
    checkAt(s, 'two hauls');
    if (aperture(s.w).stop !== was) moves.push(s.t);
    was = aperture(s.w).stop;
  }
  assert.deepEqual(moves, [second.end], "once, at the second haul's settle, never at the first's");
  assert.equal(aperture(s.w).stop, 2);
});

test('a rivet struck before the last haul settles: the island opens at once, the Railhead follows at the settle', () => {
  const s = seed(railwayAtRing('deck-laid'));
  while (aperture(s.w).set < WORKS.ring - 1) {
    until(s, () => aperture(s.w).rack > 0, 12000);
    assert.equal(carry(s), 1);
  }
  // The fourteenth, the brace, the four weights and the rivet, all on one tick.
  until(s, () => aperture(s.w).rack >= 1 + WORKS.counterweight, 12000);
  until(s, () => haulSettled(aperture(s.w), s.t));
  assert.equal(carry(s), 1);
  const end = haulEnd(aperture(s.w));
  assert.equal(act(s, 'a', 'rail.brace', { revision: 1 }), 1);
  for (let k = 0; k < WORKS.counterweight; k++) assert.equal(carry(s), 1);
  assert.equal(act(s, 'a', 'rail.strike', { id: 2 }), 1, 'the rivet, mid-haul');
  assert.ok(s.t < end);
  assert.deepEqual(stopsOf(s.w, LINE2).slice(4), [RING_HEAD[6]!.s, RING_END.s], 'the island open, the stop at 6');
  for (; s.t < end; advanceWorks(s, 1)) assert.equal(aperture(s.w).stop, 6, `the stop holds (tick ${s.t})`);
  assert.equal(aperture(s.w).stop, 7);
  assert.deepEqual(stopsOf(s.w, LINE2).slice(4), [RING_HEAD[7]!.s, RING_END.s], 'the Railhead a middle halt at 7');
  checkAt(s, 'settled');
  advanceWorks(s, 1500);
});

test("Ring Island opens on the rivet and only then, with a train in each of endMoved's cases", () => {
  const down = seed(railwayAtRing('leaf-raised'));
  assert.equal(act(down, 'a', 'rail.brace', { revision: 1 }), 1);
  for (let k = 0; k < WORKS.counterweight; k++) assert.equal(carry(down), 1);
  assert.equal(stopsOf(down.w, LINE2).length, 5, 'the leaf down: the island still shut');
  const stops = stopsOf(down.w, LINE2),
    edge = RAIL_HALTS[RAILHEAD]!.end!.edgeCm + stops[4]! - RAIL_HALTS[RAILHEAD]!.s;
  // One world per case (the end block holds one train): standing at the Railhead, the end; running up to it short of
  // its stub's edge; and running past the edge, onto the stub.
  const cases: [string, Partial<RailTrain>, (r: RailTrain) => void][] = [
    [
      'standing',
      standingAt(stops, 4, 1, down.t),
      (r) => assert.deepEqual([r.phase, r.at], [TRAIN_PHASE.STAND, 4], 'stays: the Railhead is a middle halt now'),
    ],
    [
      'short of the edge',
      running(edge - 6000, 4, stops[4]!, down.t - 1),
      (r) => assert.ok(r.req !== 0 && !r.turn, 'asked to stop at the Railhead, as v26 at Far Head'),
    ],
    [
      'past the edge',
      running(edge + 200 - 620, 4, stops[4]!, down.t - 1),
      (r) => assert.equal(r.turn, true, 'turns back there'),
    ],
  ];
  for (const [name, row, expect] of cases) {
    const s = seed(down);
    placeAt(s, A, row);
    assert.equal(stopsOf(s.w, LINE2).length, 5, `${name}: shut before the rivet`);
    assert.equal(act(s, 'a', 'rail.strike', { id: 2 }), 1, name);
    assert.equal(aperture(s.w).joined, s.t);
    assert.deepEqual(stopsOf(s.w, LINE2).slice(4), [stops[4], RING_END.s], `${name}: the island halt is open`);
    expect(train(s.w, A) as RailTrain);
    advanceWorks(s, 1500);
  }
});

test("the Pier's up lever: accepted while it is the end, refused once Q7 is laid", () => {
  const end = seed(railwayAtWorks('crossing-done'));
  until(end, () => trains(end.w).some((r) => r.phase === TRAIN_PHASE.STAND && r.at === 3));
  assert.equal(act(end, 'a', 'rail.call', { id: PIER, dir: 1 }), 0, "the end's way in is refused, as every end's");
  assert.equal(act(end, 'a', 'rail.call', { id: PIER, dir: -1 }), 1, 'its way out, home');
  const laid = seed(railwayAtRing('deck-laid'));
  assert.equal(act(laid, 'a', 'rail.call', { id: PIER, dir: 1 }), 0, 'homeward-only once a middle halt');
  assert.equal(act(laid, 'a', 'rail.call', { id: PIER, dir: -1 }), 1);
  assert.equal(act(laid, 'a', 'rail.call', { id: RAILHEAD, dir: -1 }), 1, "the Railhead's way out");
});

test("Q7's kit passes Far Head and comes off at the Pier (call 62); its bill is the kit (call 63)", () => {
  const s = seed(railwayAtWorks('crossing-done'));
  const [logs, rails] = LINE2_STATIONS[Q7]!.bill;
  const kit = () => trains(s.w).find((r) => r.logs + r.rails > 0);
  let passedFarHead = false;
  for (let t = 0; t < 6000 && rail(s.w).depot === 0; t++) {
    const was = kit();
    advanceWorks(s, 1);
    const k = kit();
    // The kit train goes up by Far Head with the kit still aboard, and the depot stays empty there.
    if (k && trainAlong(k, LINE2, s.t) > RAIL_HALTS[halt('Far Head')]!.s + 1000) passedFarHead = true;
    if (rail(s.w).depot > 0) {
      assert.ok(was && !k, 'the depot fills the tick the kit comes off');
      assert.equal(train(s.w, was.slot).at, 3, 'at the Pier');
    }
  }
  assert.ok(passedFarHead, 'the kit passed Far Head');
  assert.deepEqual([rail(s.w).depot, rail(s.w).depotRails], [logs, rails], 'one trip, the bill');
  assert.equal(rail(s.w).out6, logs, "Q7's logs issued, a counter like out5 (call 64)");
});

test('the wagon carries no ring footing before Q7 (call 65); after, the first reaches the railhead rack', (t) => {
  const s = seed(railwayAtWorks('crossing-done'));
  for (let k = 0; k < 3000; k++) {
    advanceWorks(s, 1);
    assert.equal(aperture(s.w).rack, 0);
    for (const r of trains(s.w)) assert.equal(r.foot, 0, `no footing aboard before Q7 (tick ${s.t})`);
  }
  const deck = seed(railwayAtRing('deck-laid'));
  const from = deck.t;
  until(deck, () => aperture(deck.w).rack > 0, 4000);
  t.diagnostic(`first ring footings on the railhead rack ${((deck.t - from) / 10).toFixed(1)} s after deck-laid`);
});

test('5,000 random ring ops keep the haul invariants, conserve footings and leave the pier rack empty', () => {
  const rand = mulberry32(0x5eed);
  let s = seed(railwayAtRing('deck-laid'));
  const pids = ['a', 'b'];
  const ops = [
    () => ({ op: 'rail.footTake', f: { rack: Math.floor(rand() * 3) } }),
    () => ({ op: 'rail.footSet', f: { site: Math.floor(rand() * 4) } }),
    () => ({ op: 'rail.brace', f: { revision: rand() < 0.8 ? 1 : 2 } }),
    () => ({ op: 'rail.strike', f: { id: Math.floor(rand() * 3) } }),
  ];
  let accepted = 0;
  for (let k = 0; k < 5000; k++) {
    const pid = pids[Math.floor(rand() * pids.length)]!;
    const { op, f } = ops[Math.floor(rand() * ops.length)]!();
    accepted += act(s, pid, op, f);
    advanceWorks(s, Math.floor(rand() * 5));
    assert.equal(footingTotal(s.w), works(s.w).poured, `footings at op ${k}`);
    assert.equal(works(s.w).pierRack, 0, `the pier rack at op ${k}`);
    const a = aperture(s.w);
    assert.equal(a.moved >= 0, a.set >= 2, `haul stamp at op ${k}`);
    assert.ok(Number.isInteger(a.moved) && Number.isInteger(a.from));
    if (a.moved < 0) assert.equal(a.from, 0);
    else assert.ok(a.from >= RING_HEAD[0]!.u && a.from <= haulTarget(a));
    // The trains' stop: at most the build head, never ahead of the deck, at the head once settled (railwayCheck).
    checkAt(s, `the stop at op ${k}`);
    if (haulSettled(a, s.t)) assert.equal(a.stop, ringHead(s.w), `settled at op ${k}`);
    if (rand() < 0.002) s = seed(s);
  }
  assert.ok(accepted > 20, `${accepted} accepted`);
});

test('a leaver keeps the gap as it stands: their footing goes back to the Works rack', () => {
  const s = seed(railwayAtRing('gap-footed'));
  assert.equal(act(s, 'b', 'rail.footTake', { rack: 2 }), 1);
  const ring = { ...aperture(s.w) },
    rack = works(s.w).rack;
  assert.equal(railFootRelease(s.w, 'b', account(s.w, 'b')!.epoch), 1);
  assert.deepEqual({ ...aperture(s.w) }, ring, 'Aperture is unchanged');
  assert.equal(works(s.w).rack, rack + 1);
  assert.equal(footingTotal(s.w), works(s.w).poured);
  assert.equal(invariant(s.w), null);
});

test('each ring seed stage is settled and passes the world check', () => {
  for (const stage of RING_STAGES) {
    const s = railwayAtRing(stage);
    assert.ok(haulSettled(aperture(s.w), s.t), `${stage}: settled`);
    assert.equal(haulU(aperture(s.w), s.t), haulTarget(aperture(s.w)), `${stage}: at target`);
    assert.equal(aperture(s.w).stop, ringHead(s.w), `${stage}: the trains' Railhead at the head`);
    assert.doesNotThrow(() => railwayCheck(s.w, s.t), `${stage}: the check at its tick`);
    const w = stageWorld(stage);
    assert.ok(w.single(Aperture) >= 0, stage);
    assert.equal(worldVerdict(w), null, `${stage}: the world check`);
  }
});

test("a bent's second footing stamps moved and from; its first does not", () => {
  const s = railwayAtRing('deck-laid');
  until(s, () => aperture(s.w).rack >= 4);
  assert.deepEqual([aperture(s.w).moved, aperture(s.w).from], [-1, 0]);
  assert.equal(carry(s), 1);
  assert.deepEqual([aperture(s.w).moved, aperture(s.w).from], [-1, 0]);
  assert.equal(carry(s, 'b'), 1);
  assert.deepEqual([aperture(s.w).moved, aperture(s.w).from], [s.t, RING_HEAD[0]!.u]);
  const stamp = { ...aperture(s.w) };
  advanceWorks(s, 1);
  assert.equal(carry(s), 1);
  assert.deepEqual([aperture(s.w).moved, aperture(s.w).from], [stamp.moved, stamp.from]);
});

test('a pair completed mid-haul replans from where the traveller is', () => {
  const s = railwayAtRing('deck-laid');
  until(s, () => aperture(s.w).rack >= 4);
  assert.equal(carry(s), 1);
  assert.equal(carry(s, 'b'), 1);
  // Three travel ticks give a fractional curve value: the stamp must use the canonical integer pose.
  advanceWorks(s, HAUL.after + HAUL.ready + 3);
  assert.equal(carry(s), 1);
  const before = { ...aperture(s.w) };
  const u = haulU(before, s.t);
  assert.ok(u > RING_HEAD[0]!.u && u < haulTarget(before));
  assert.equal(Number.isInteger(u), true);
  assert.equal(carry(s, 'b'), 1, 'no new refusal while hauling');
  const after = aperture(s.w);
  assert.equal(after.moved, s.t);
  assert.equal(after.from, u);
  assert.equal(haulU(after, s.t), haulU(before, s.t), 'no jump at the accepted rule tick');
});
