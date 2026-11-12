// The server trains: legs, poses and stop on request (docs/plans/works-late-game.md, step 1), on double track with
// several trains a line since v26 (docs/plans/generic-lines.md, step 4a; spacing and service: railway-trains.test.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAIN,
  TRAIN_PHASE,
  TRAIN_STOPS,
  LINE_HALTS,
  REQ_MAX_STOPS,
  reqAdd,
  reqHas,
  reqValid,
  trainLegTicks,
  trainLegAlong,
  trainLegSpeed,
  trainAlong,
  trainArrives,
  trainDir,
  trainIdle,
  trainRequestable,
  trainSpeed,
  stopKin,
  trainPassesBy,
} from '../src/sim/railway-train.ts';
import { LINE2_ON, RAIL_LINES, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { RING_END, RING_END_BRAKE_CMS2, RING_HEAD, RING_PATH } from '../src/sim/railway-ring-layout.ts';
import { LINE2_ROWS, line2Stops } from './helpers/rail-rows.ts';
import { LINE_SLOTS } from '../src/sim/railway-trains.ts';
import { railLinePoint } from '../src/sim/railway-line-path.ts';
import {
  TRAIN_STAGES,
  WORKS_STAGES,
  act,
  advance,
  advanceWorks,
  forge,
  invariant,
  line as lineRow,
  rail,
  railResume,
  railwayAtTrains,
  railwayAtWorks,
  restore,
  shed as shedRow,
  train,
  trains,
  works as worksRow,
  type Seed,
} from './helpers/rail.ts';
import { line2Active, line2Completed, line2Rails, railCounts } from '../src/sim/railway-queries-line2.ts';
import { trainStops } from '../src/sim/railway-queries-trains.ts';
import { Cart, DEPOT_OUT, Line, Train, createRailwayWorld } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { CART_PHASE } from '../src/sim/railway-cart.ts';
import { HALTS, LINKS, ORIGIN, lineAt, railY } from '../src/place/layout.ts';
import { PIER_STOP_CM, WORKS } from '../src/sim/railway-works-layout.ts';
import { footingTotal, pierNeed } from '../src/sim/railway-queries-works.ts';

/** Halt ids (LINE_HALTS) on line 2. */
const H = { village: 2, quarry: 3, farHead: 4, pier: 5 } as const;
const STOPS = TRAIN_STOPS[1]!;
const BRAKE = (TRAIN.speed * TRAIN.speed) / (2 * TRAIN.accel);
/** Line 2's trains (L2, three since v27): A starts at the village (up), B at Far Head (down), the third at Quarry. */
const L2 = LINE_SLOTS[1]!;
const [A, B] = L2 as [number, number];
const line2 = (w: Seed) => train(w.w, A);
const lineOf = (k: number) => RAIL_TRAINS[k]!.line;
const ask = (w: Seed, id: number, dir: -1 | 1) => act(w, 'a', 'rail.call', { id, dir });
const ride = (w: Seed, k: number, id: number, dir: -1 | 1) => act(w, 'a', 'rail.call', { id, dir, train: k });
/** Advance until `ok`, at most `max` ticks, checking train A's pose never jumps. */
function until(w: Seed, ok: () => boolean, max = 6000, works = false) {
  let prev = trainAlong(line2(w), 1, w.t);
  for (let t = 0; !ok(); t++) {
    assert.ok(t < max, 'in time');
    if (works) advanceWorks(w, 1);
    else advance(w, 1);
    const at = trainAlong(line2(w), 1, w.t);
    assert.ok(Math.abs(at - prev) <= TRAIN.speed + 1, `continuous at tick ${w.t}`);
    prev = at;
  }
}
const standing =
  (w: Seed, stop: number, k = A) =>
  () =>
    train(w.w, k).phase === TRAIN_PHASE.STAND && train(w.w, k).at === stop;
/** Train k's arrivals over `ticks`: [stop, the way it came] each. */
/** The halts train `k` comes to a stand at over `ticks`, with the way it came. */
function arrivals(w: Seed, ticks: number, works = false, k = A) {
  const out: [number, number][] = [];
  for (let t = 0; t < ticks; t++) {
    const was = train(w.w, k).phase,
      came = trainDir(train(w.w, k));
    if (works) advanceWorks(w, 1);
    else advance(w, 1);
    const r = train(w.w, k);
    // Halts only: a hold at an end block's signal (at -1) is spacing, not a stop.
    if (was === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND && r.at >= 0) out.push([r.at, came]);
  }
  return out;
}

// ---------------------------------------------------------------- legs and poses
test('train legs: eased, whole cm, from a standstill or under way', () => {
  assert.equal(trainLegTicks(15700), 136, "a standstill's leg is the old one exactly");
  for (const v0 of [0, 60, 199, 200])
    for (const dist of [0, 20, 15700, 19300, 35000, 60000]) {
      if (v0 && dist * 2 * TRAIN.accel < v0 * v0) continue; // no request asks for a leg it can't brake for
      let prev = 0;
      assert.equal(trainLegAlong(dist, -10, v0), 0);
      if (dist) assert.equal(trainLegSpeed(dist, 0, v0), v0);
      for (let t = 0; t <= trainLegTicks(dist, v0); t++) {
        const s = trainLegAlong(dist, t, v0);
        assert.ok(Number.isInteger(s) && s >= prev && s <= dist, `${v0} ${dist} ${t}`);
        assert.ok(s - prev <= TRAIN.speed + 1);
        assert.ok(trainLegSpeed(dist, t, v0) <= TRAIN.speed + 1e-9);
        prev = s;
      }
      assert.equal(prev, dist);
      assert.equal(trainLegSpeed(dist, trainLegTicks(dist, v0), v0), 0);
    }
});
test('a leg keeps its destination in cm when a stop moves (Ring Island moves the railhead in v27)', () => {
  const row = {
    ...trainIdle(A),
    phase: TRAIN_PHASE.RUN,
    at: 1,
    to: 2,
    track: 0,
    depart: 100,
    from: 30000,
    v0: 150,
    dest: STOPS[2]!,
  };
  const poses = () => [0, 40, 90, 160].map((t) => trainAlong(row, 1, 100 + t));
  const before = { poses: poses(), arrives: trainArrives(row), speed: trainSpeed(row, 1, 140) };
  const stops = TRAIN_STOPS[1] as number[];
  const was = stops[2]!;
  try {
    stops[2] = was + 5000; // the table changes under a running leg
    assert.deepEqual(poses(), before.poses, 'the pose reads the row, not the table');
    assert.equal(trainArrives(row), before.arrives);
    assert.equal(trainSpeed(row, 1, 140), before.speed);
  } finally {
    stops[2] = was;
  }
  assert.equal(trainAlong({ ...row, to: 3 }, 1, 190), trainAlong(row, 1, 190));
  assert.equal(trainAlong(row, 1, trainArrives(row)), row.dest);
});
test('request sets: two digits a stop, safe integers with room for 26 stops', () => {
  assert.ok(REQ_MAX_STOPS >= 16);
  let req = 0;
  const n = 20;
  for (let k = 1; k < n - 1; k++) req = reqAdd(reqAdd(req, k, -1, n), k, 1, n);
  req = reqAdd(reqAdd(req, 0, -1, n), n - 1, 1, n); // an end's one digit is its way out, whichever way is sent
  assert.ok(reqValid(req, n), 'valid');
  assert.ok(Number.isSafeInteger(req) && req > 2 ** 32, 'past 32-bit operators');
  for (let k = 1; k < n - 1; k++) assert.ok(reqHas(req, k, -1, n) && reqHas(req, k, 1, n));
  assert.ok(reqHas(req, 0, 1, n) && reqHas(req, n - 1, -1, n));
  assert.equal(reqAdd(req, 5, 1, n), req, 'a repeat changes nothing');
  assert.equal(reqValid(1, n), false, "stop 0's way in");
  assert.equal(reqValid(-1, n) || reqValid(0.5, n) || reqValid(2 ** 40, 4), false);
});
test('halts and stops match the pinned Place layout', () => {
  // Place's stops, plus line 2's pier stop (the Works catalog) and v27's Railhead and Ring Island (the ring layout,
  // checked in test/railway-ring-layout.test.ts), which Place does not have.
  // The greybox route's halts (line 2's past Ring Island, and its own rows) are the route catalog's.
  TRAIN_STOPS.slice(0, 2).forEach((s, k) =>
    assert.deepEqual(s.slice(0, k ? 6 : undefined), [
      ...LINKS[k]!.stops.map((v) => v * 100),
      ...(k ? [PIER_STOP_CM, RING_HEAD[0]!.s, RING_END.s] : []),
    ]),
  );
  // LINE_HALTS keeps v25's one platform a halt: today's, the down track's; the Pier's east of it since v27 (call 53).
  const pier = { name: 'Pier', line: 1 as const, s0: 719, s1: 741, lat: 2.9, stop: 3 };
  LINE_HALTS.slice(0, 6).forEach((h, k) => {
    const spec = k < HALTS.length ? HALTS[k]! : pier,
      line = LINKS[spec.line]!.line,
      s = (spec.s0 + spec.s1) / 2;
    const q = { x: 0, z: 0, ux: 0, uz: 0 };
    lineAt(line, s, q);
    const x = (ORIGIN.x + q.x - q.uz * spec.lat) * 100;
    const z = (ORIGIN.z + q.z + q.ux * spec.lat) * 100;
    assert.ok(Math.abs(h.x - x) <= 5 && Math.abs(h.z - z) <= 5, h.name);
    assert.ok(Math.abs(h.y - (Math.min(railY(line, spec.s0), railY(line, spec.s1)) + 0.72) * 100) <= 5, h.name);
  });
});
test("the server's coarse line path follows Place's rails within a metre", () => {
  const q = { x: 0, z: 0, ux: 0, uz: 0 };
  // Line 2 as far as Place lays it: RING_PATH (v27) runs on past it, the ring layout's (test/railway-ring-layout.test.ts).
  const placeEnd = [
    TRAIN_STOPS[0]!.at(-1)!,
    ((RAIL_LINES[1]!.path.length - RING_PATH.length - LINE2_ON.length) / 2 - 1) * 1000,
  ];
  for (const k of [0, 1])
    for (let cm = 0; cm <= placeEnd[k]!; cm += 50) {
      lineAt(LINKS[k]!.line, cm / 100, q);
      const p = railLinePoint(k, cm);
      const off = Math.hypot(p.x - (q.x + ORIGIN.x) * 100, p.z - (q.z + ORIGIN.z) * 100);
      assert.ok(off < 100, `line ${k + 1} at ${cm} cm: ${off.toFixed(0)} cm off`);
    }
});
test('pose is continuous across arrivals, departures, requests and replans', () => {
  const w = railwayAtTrains('trains-on');
  const raw = w.w;
  const rows = () => raw.ids(Train).map((id) => raw.get(Train, id)!);
  const prev = rows().map((r) => trainAlong(r, lineOf(r.slot), w.t));
  const arrived = rows().map(() => 0);
  for (let t = 0; t < 2600; t++) {
    if (t === 160) ask(w, H.quarry, 1);
    if (t === 500) ask(w, H.quarry, -1);
    if (t === 900) ask(w, 1, -1);
    if (t % 97 === 0) ask(w, H.village, 1);
    const phases = rows().map((r) => r.phase);
    advance(w, 1);
    rows().forEach((r, k) => {
      const at = trainAlong(r, lineOf(r.slot), w.t);
      assert.ok(Math.abs(at - prev[k]!) <= TRAIN.speed + 1, `train ${r.slot} tick ${w.t}`);
      if (phases[k] === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND) arrived[k]!++;
      prev[k] = at;
    });
  }
  // A fleet row in the shed (the greybox route) never runs before its stage.
  assert.ok(
    arrived.every((n, k) => n >= 4 || RAIL_TRAINS[k]!.shed),
    JSON.stringify(arrived),
  );
  assert.equal(invariant(w.w), null);
});

// ---------------------------------------------------------------- requests
test('a lever ask is one digit per halt per way on its line: repeats move nothing; an end only its way out', () => {
  const w = railwayAtTrains('q6-stocked');
  assert.equal(trainStops(w.w, 1).length, 3, 'Far Head is the end until Q6');
  assert.equal(ask(w, H.quarry, -1), 1);
  assert.equal(ask(w, H.quarry, -1), 0, 'the same ask again');
  assert.equal(ask(w, H.quarry, 1), 1, 'the other way is its own');
  assert.equal(ask(w, H.farHead, 1), 0, "an end's way in: no train stands at that platform");
  assert.equal(ask(w, H.farHead, -1), 1, 'its way out');
  const l = lineRow(w.w, 1);
  assert.ok(reqHas(l.req, 1, -1, 3) && reqHas(l.req, 1, 1, 3) && reqHas(l.req, 2, -1, 3), 'all three stand');
  assert.ok(
    trains(w.w).every((r) => r.req === 0),
    "a lever's ask is the line's, no train's",
  );
  assert.equal(ask(w, H.pier, -1), 0, 'no pier halt before Q6');
  assert.equal(act(w, 'a', 'rail.call', { id: H.quarry }), 0, 'a way is needed');
  assert.equal(act(w, 'a', 'rail.call', { id: H.quarry, dir: 0 }), 0);
  assert.equal(act(w, 'a', 'rail.call', { id: 9, dir: 1 }), 0);
  assert.equal(invariant(w.w), null);
});
test('with nothing asked, trains run end to end, straight through the middle halts', () => {
  for (const stage of ['q6-stocked', 'q6-done'] as const) {
    const w = railwayAtTrains(stage),
      n = trainStops(w.w, 1).length;
    for (const k of L2.filter((j) => !RAIL_TRAINS[j]!.shed)) {
      const made = arrivals(w, 2000, false, k);
      assert.ok(made.length >= 2, stage);
      for (const [at] of made) assert.ok(at === 0 || at === n - 1, `${stage}: stopped at ${at}`);
    }
    for (let t = 0; t < 3000; t++) {
      advance(w, 1);
      const l1 = train(w.w, 0);
      assert.ok(l1.at === 0 || l1.at === 1);
    }
  }
});
test('the next train heading the asked way stops; one heading the other way runs through, and never turns for it', () => {
  // Asked toward Far Head at the quarry: the train out from the village stops there, then goes on out.
  const w = railwayAtTrains('q6-stocked');
  until(w, standing(w, 0));
  assert.equal(ask(w, H.quarry, 1), 1);
  until(w, () => line2(w).phase === TRAIN_PHASE.RUN);
  assert.equal(line2(w).to, 1, 'its leg ends at the quarry');
  assert.equal(reqHas(lineRow(w.w, 1).req, 1, 1, 3), true, 'the ask stands until the train leaves with it');
  until(w, standing(w, 1));
  until(w, () => line2(w).phase === TRAIN_PHASE.RUN);
  assert.deepEqual([line2(w).track, line2(w).to, reqHas(lineRow(w.w, 1).req, 1, 1, 3)], [0, 2, false], 'on out');
  // Asked toward the village at the quarry: the up train runs through to Far Head; a down train stops for it.
  const v = railwayAtTrains('q6-stocked');
  until(v, standing(v, 0));
  until(v, () => line2(v).phase === TRAIN_PHASE.RUN);
  assert.equal(ask(v, H.quarry, -1), 1);
  let served = -1;
  const made = arrivals(v, 600);
  assert.deepEqual(made[0], [2, 1], 'A runs through to the end');
  until(v, () => {
    if (served < 0) served = L2.find((k) => standing(v, 1, k)() && trainDir(train(v.w, k)) < 0) ?? -1;
    return !reqHas(lineRow(v.w, 1).req, 1, -1, 3);
  });
  assert.ok(made.every(([at]) => at !== 1) && served !== A, 'the down train B took it, not A');
  assert.equal(invariant(v.w), null);
});
test('a request made mid-run shortens the trip if the train can still brake; inside braking reach it runs through', () => {
  // In reach: cruising out from the village, more than its braking distance short of the quarry.
  const w = railwayAtTrains('q6-stocked');
  until(w, standing(w, 0));
  until(w, () => line2(w).phase === TRAIN_PHASE.RUN && trainSpeed(line2(w), 1, w.t) === TRAIN.speed);
  // A leg to the end, or (v27's third train) to the end block's signal while a train stands at Far Head.
  assert.ok([2, -1].includes(line2(w).to), 'nothing asked: a leg to the end or its signal');
  assert.ok(STOPS[1]! - trainAlong(line2(w), 1, w.t) > BRAKE + 400);
  assert.equal(ask(w, H.quarry, 1), 1);
  advance(w, 1);
  const r = line2(w);
  assert.deepEqual([r.to, r.dest, r.depart], [1, STOPS[1], w.t], 'replanned from where it is, to the quarry');
  assert.ok(r.v0 > 0 && r.from > STOPS[0]!);
  until(w, standing(w, 1));
  // Out of reach: the same ask inside the braking distance; it runs through to Far Head and turns back only there.
  const late = railwayAtTrains('q6-stocked');
  until(late, standing(late, 0));
  until(
    late,
    () => line2(late).phase === TRAIN_PHASE.RUN && STOPS[1]! - trainAlong(line2(late), 1, late.t) < BRAKE - 600,
  );
  assert.equal(ask(late, H.quarry, 1), 1);
  assert.deepEqual(arrivals(late, 300)[0], [2, 1], 'through the quarry to Far Head');
  assert.equal(line2(late).track, 1, 'turned back at the end, onto the down track');
  assert.equal(invariant(late.w), null);
});
test('asks only behind it never turn a train back early: it runs to its end', () => {
  const w = railwayAtTrains('q6-done');
  assert.equal(trainStops(w.w, 1).length, 4);
  until(w, standing(w, 0));
  until(w, () => line2(w).phase === TRAIN_PHASE.RUN && trainAlong(line2(w), 1, w.t) > STOPS[1]! + 2000);
  assert.equal(ask(w, H.village, 1), 1);
  assert.equal(ask(w, H.quarry, -1), 1);
  const made = arrivals(w, 900);
  assert.deepEqual(made[0], [3, 1], 'on to the pier');
  assert.equal(invariant(w.w), null);
});
test('a train standing at the halt, leaving the asked way, waits a full dwell from the ask', () => {
  const w = railwayAtTrains('q6-stocked');
  until(w, standing(w, 0));
  advance(w, 10);
  assert.equal(ask(w, H.village, 1), 1);
  assert.equal(line2(w).depart, w.t);
  advance(w, TRAIN.dwellTicks - 1);
  assert.equal(line2(w).phase, TRAIN_PHASE.STAND);
  advance(w, 1);
  assert.equal(line2(w).phase, TRAIN_PHASE.RUN);
  assert.equal(reqHas(lineRow(w.w, 1).req, 0, 1, 3), false, 'served as it left');
});
test("a passenger's ask names the next halt the train can still stop at; not the end; greyed once it stops there", () => {
  const w = railwayAtTrains('q6-done');
  until(w, standing(w, 0));
  assert.deepEqual(trainRequestable(line2(w), 1, 4, w.t), { stop: 1, dir: 1, requested: false });
  assert.equal(ride(w, A, H.quarry, 1), 1, "a rider's ask, on its own train");
  assert.deepEqual(trainRequestable(line2(w), 1, 4, w.t), { stop: 1, dir: 1, requested: true });
  assert.ok(reqHas(line2(w).req, 1, 1, 4) && lineRow(w.w, 1).req === 0);
  assert.equal(ride(w, A, H.quarry, -1), 0, 'not the way it is going');
  assert.equal(ride(w, A, H.pier, -1), 0, 'not an end: it stops there anyway');
  assert.equal(ride(w, 0, H.quarry, 1), 0, "not from line 1's train");
  const v = railwayAtTrains('q6-done');
  until(v, standing(v, 0));
  until(v, () => line2(v).phase === TRAIN_PHASE.RUN && STOPS[1]! - trainAlong(line2(v), 1, v.t) < BRAKE - 600);
  assert.equal(trainRequestable(line2(v), 1, 4, v.t)?.stop, 2, 'too late for the quarry: Far Head is named');
  until(v, () => line2(v).phase === TRAIN_PHASE.RUN && STOPS[2]! - trainAlong(line2(v), 1, v.t) < BRAKE - 600);
  assert.equal(trainRequestable(line2(v), 1, 4, v.t), null, 'next is the pier, the end: not offered');
});

// ---------------------------------------------------------------- holds, cargo and the snapshot
test('line 1 waits for the cart to rest', () => {
  const w = railwayAtTrains('trains-on');
  Object.assign(w.w.mut(Cart, w.w.single(Cart))!, { phase: CART_PHASE.LOAD, depart: w.t + 500 });
  advance(w, 200);
  assert.equal(train(w.w, 0).phase, 0);
  Object.assign(w.w.mut(Cart, w.w.single(Cart))!, { phase: CART_PHASE.REST });
  advance(w, 1);
  assert.equal(train(w.w, 0).phase, 1);
});
test('the kit needs no request: it loads on the line 2 train at the village; every unit has one home', () => {
  const w = railwayAtTrains('trains-on');
  const kit = () => L2.find((k) => train(w.w, k).logs + train(w.w, k).rails > 0);
  let snapshot = false;
  for (let t = 0; rail(w.w).depot !== 32 || rail(w.w).depotRails !== 32; t++) {
    assert.ok(t < 3000);
    const before = railCounts(w.w);
    advance(w, 1);
    assert.equal(line2Rails(w.w), forge(w.w).poured);
    const counts = railCounts(w.w);
    assert.equal(counts.total - before.total, counts.produced - before.produced);
    assert.ok(rail(w.w)[DEPOT_OUT[5]!] <= 32);
    assert.equal(invariant(w.w), null);
    const k = kit();
    if (!snapshot && k !== undefined && train(w.w, k).phase === 1) {
      assert.equal(k, A, 'the train that stood at the village first');
      const copy = restore(w.w);
      assert.deepEqual(trains(copy), trains(w.w));
      assert.equal(trainAlong(train(copy, k), 1, w.t), trainAlong(train(w.w, k), 1, w.t));
      snapshot = true;
    }
  }
  assert.ok(snapshot);
  assert.ok(trains(w.w).every((r) => r.logs + r.rails === 0 && r.req === 0));
  assert.equal(lineRow(w.w, 1).req, 0, 'nobody asked');
  const rows = JSON.stringify(trains(w.w));
  railResume(w.w, 0, w.t + 1, w.t, 50000);
  assert.equal(JSON.stringify(trains(w.w)), rows, 'away credit never advances trains');
});
test('Q6 funds from the rack and lays to the pier; every new seed loads', () => {
  for (const stage of TRAIN_STAGES) {
    const w = railwayAtTrains(stage);
    assert.equal(invariant(w.w), null, stage);
    if (stage === 'q6-done') {
      assert.equal(line2Completed(w.w), 6);
      assert.equal(line2Active(w.w), -1);
    }
  }
});
test('malformed train and line rows fail atomically', () => {
  const w = railwayAtTrains('trains-on');
  for (const [c, slot, patch] of [
    [Train, A, { at: 9 }],
    [Train, A, { at: -2 }],
    [Train, A, { track: 2 }],
    [Train, A, { logs: 33 }],
    [Train, 0, { logs: 1 }],
    [Train, A, { req: -2 }],
    [Train, A, { req: 1 }], // stop 0's way in
    [Train, A, { req: 2 }], // a rider's ask at an end
    [Train, A, { req: 4 }], // a rider's ask the other way (A is up)
    [Train, A, { req: 0.5 }],
    [Train, A, { v0: TRAIN.speed + 1 }],
    [Train, A, { dest: -10 }],
    [Train, A, { phase: 2 }],
    [Train, B, { wagon: true }],
    [Line, 1, { req: -2 }],
    [Line, 1, { req: 1 }],
    [Line, 1, { left0: -2 }],
  ] as const) {
    const copy = restore(w.w);
    Object.assign(copy.mut(c, copy.lookup(c, slot)!)!, patch);
    const target = createRailwayWorld(),
      hash = target.hash();
    assert.throws(
      () => target.load(JSON.parse(JSON.stringify(copy.snapshot())), railwayCheck),
      /railway:|off schema/,
      JSON.stringify(patch),
    );
    assert.equal(target.hash(), hash);
  }
});

// ---------------------------------------------------------------- the pier stop and the footing wagon (J3)
test('the pier stop opens with Q6', () => {
  const w = railwayAtTrains('q6-finishing');
  assert.equal(trainStops(w.w, 1).length, 3);
  assert.equal(ask(w, H.pier, -1), 0, 'no pier halt before Q6');
  // Until the tick Q6 completes, no train plans past Far Head (from that tick one bound for Far Head may go on).
  while (line2Completed(w.w) < 6) {
    for (const k of L2) assert.ok(train(w.w, k).at <= 2 && train(w.w, k).to <= 2);
    advance(w, 1);
  }
  assert.equal(trainStops(w.w, 1).length, 4);
  assert.equal(trainStops(w.w, 0).length, 2);
  assert.equal(ask(w, H.pier, -1), 1);
  let reached = false;
  for (let t = 0; t < 3000 && !reached; t++) {
    advance(w, 1);
    reached = L2.some((k) => standing(w, 3, k)());
  }
  assert.ok(reached, 'line 2 runs to the pier');
  assert.equal(invariant(w.w), null);
});
test('the wagon couples at the village, only when ready', () => {
  const w = railwayAtWorks('cradle-fitted'),
    r = () => train(w.w, A);
  // Through a village stop without a turned table: no wagon.
  let visits = 0;
  for (let t = 0; t < 4000 && visits < 2; t++) {
    const was = r().phase;
    advanceWorks(w, 1);
    if (was === TRAIN_PHASE.RUN && r().phase === TRAIN_PHASE.STAND && r().at === 0) visits++;
    assert.ok(trains(w.w).every((x) => !x.wagon));
  }
  assert.equal(visits, 2);
  // Turn the table the moment the train stands at the village: it holds its departure for the wagon.
  while (!(r().phase === TRAIN_PHASE.STAND && r().at === 0)) advanceWorks(w, 1);
  const arrived = r().depart;
  assert.equal(act(w, 'a', 'rail.turn', { to: 1, revision: shedRow(w.w).tableRev }), 1);
  const due = shedRow(w.w).ready;
  assert.equal(due, w.t + WORKS.rollTicks);
  while (r().phase === TRAIN_PHASE.STAND) {
    advanceWorks(w, 1);
    if (w.t < due) assert.equal(r().wagon, false);
  }
  assert.equal(r().wagon, true);
  assert.equal(train(w.w, B).wagon, false, 'one wagon');
  assert.ok(r().depart >= due, 'it left only once coupled');
  assert.ok(r().depart - arrived <= TRAIN.dwellTicks + WORKS.rollTicks, 'held at most the roll');
  assert.equal(invariant(w.w), null);
});
test('coupling needs no request: the first line 2 train at the village after the roll-out takes the wagon', () => {
  const w = railwayAtWorks('cradle-fitted'),
    r = () => line2(w);
  const along = () => trainAlong(r(), 1, w.t);
  const out = () => r().phase === TRAIN_PHASE.RUN && r().track === 0;
  until(w, () => out() && along() > STOPS[1]! + 2000 && along() < STOPS[2]! - BRAKE - 1000, 6000, true);
  assert.equal(act(w, 'a', 'rail.turn', { to: 1, revision: shedRow(w.w).tableRev }), 1);
  let first = -1;
  for (let t = 0; t < 3000 && !trains(w.w).some((x) => x.wagon); t++) {
    advanceWorks(w, 1);
    if (first < 0) for (const k of L2) if (standing(w, 0, k)() && w.t >= shedRow(w.w).ready) first = k;
  }
  const coupled = L2.filter((k) => train(w.w, k).wagon);
  assert.deepEqual(coupled, [first], 'coupled to the first train standing at the village once it was due');
  assert.ok(trains(w.w).every((x) => x.req === 0) && lineRow(w.w, 1).req === 0, 'nothing asked');
  assert.equal(invariant(w.w), null);
});
test('the wagon needs no request: loads at the quarry going out, unloads at the pier', () => {
  const w = railwayAtWorks('wagon-on'),
    k = L2.find((s) => train(w.w, s).wagon)!,
    r = () => train(w.w, k),
    works = () => worksRow(w.w);
  let loaded = 0,
    unloaded = 0,
    farHead = 0;
  for (let t = 0; t < 6000 && unloaded < 2; t++) {
    const [phase, foot, pierRack] = [r().phase, r().foot, works().pierRack];
    const need = pierNeed(w.w),
      rack = works().rack,
      out = r().track === 0;
    advanceWorks(w, 1);
    assert.ok(r().req === 0 && lineRow(w.w, 1).req === 0, 'nobody asks');
    if (phase !== TRAIN_PHASE.RUN || r().phase !== TRAIN_PHASE.STAND) {
      assert.equal(r().foot, foot, 'the wagon only changes on arrival');
      continue;
    }
    if (r().at === 2) farHead++;
    if (r().at === 1) {
      assert.ok(out, 'the quarry going out only');
      const n = Math.min(WORKS.wagonCap - foot, rack, need);
      assert.equal(r().foot, foot + n);
      if (n) loaded++;
    }
    if (r().at === 3 && foot) {
      assert.equal(r().foot, 0);
      assert.equal(works().pierRack, pierRack + foot);
      unloaded++;
    }
  }
  assert.ok(loaded >= 2 && unloaded >= 2);
  assert.equal(farHead, 0, 'Far Head is a request stop: nobody asked');
  assert.ok(works().pierRack + works().pierSet <= WORKS.pier);
  assert.equal(invariant(w.w), null);
});
test('asks never starve the footing wagon: a friend at Far Head asking for the pier each time it heads home empty', () => {
  const w = railwayAtWorks('wagon-on'),
    slot = L2.find((s) => train(w.w, s).wagon)!,
    r = () => train(w.w, slot);
  let unloaded = 0,
    pressed = 0;
  for (let t = 0; unloaded < 2; t++) {
    assert.ok(t < 12000, `the pier gets footings (Far Head pressed ${pressed} times, ${unloaded} unloads)`);
    const foot = r().foot;
    if (
      r().phase === TRAIN_PHASE.RUN &&
      trainDir(r()) < 0 &&
      r().wagon &&
      r().foot === 0 &&
      trainAlong(r(), 1, w.t) - STOPS[2]! > BRAKE + 400 &&
      !reqHas(lineRow(w.w, 1).req, 2, 1, STOPS.length)
    ) {
      ask(w, H.farHead, 1);
      pressed++;
    }
    advanceWorks(w, 1);
    if (r().phase === TRAIN_PHASE.STAND && r().at === 3 && foot > 0 && r().foot === 0) unloaded++;
  }
  assert.ok(pressed > 0, 'the friend asked');
  assert.equal(invariant(w.w), null);
});
test('every footing has one home every tick; thirty-two in all (v27)', () => {
  // The fixtures check footingTotal === poured after every rule tick (advanceWorks); here every stage and a long run.
  for (const stage of WORKS_STAGES.slice(WORKS_STAGES.indexOf('works-lit'))) {
    const s = railwayAtWorks(stage).w;
    assert.equal(footingTotal(s), worksRow(s).poured, stage);
    assert.ok(worksRow(s).poured <= WORKS.total);
  }
  const done = railwayAtWorks('crossing-done').w;
  // The stall two and the pier twelve set; since v27 the kiln pours on towards the ring's eighteen.
  assert.equal(worksRow(done).pierSet, 12, 'the pier twelve');
  assert.ok(worksRow(done).poured >= 14, 'the stall two and the pier twelve');
  const w = railwayAtWorks('wagon-on');
  for (let t = 0; t < 3000; t++) {
    const before = railCounts(w.w);
    advanceWorks(w, 1);
    const counts = railCounts(w.w);
    assert.equal(counts.total - before.total, counts.produced - before.produced);
    assert.equal(line2Rails(w.w), forge(w.w).poured);
    if (t % 500 === 0) assert.equal(invariant(w.w), null);
  }
});
test('pose is continuous with four stops', () => {
  const w = railwayAtWorks('wagon-on');
  const raw = w.w;
  const rows = () => raw.ids(Train).map((id) => raw.get(Train, id)!);
  const prev = rows().map((r) => trainAlong(r, lineOf(r.slot), w.t));
  const made = [0, 0, 0, 0];
  for (let t = 0; t < 2400; t++) {
    if (t === 100) ask(w, H.pier, -1);
    if (t === 900) ask(w, H.farHead, -1);
    if (t === 1300) ask(w, H.quarry, 1);
    const before = rows().map((r) => r.phase);
    advance(w, 1);
    rows().forEach((r, k) => {
      const at = trainAlong(r, lineOf(r.slot), w.t);
      assert.ok(Math.abs(at - prev[k]!) <= TRAIN.speed + 1, `train ${r.slot} tick ${w.t}`);
      if (lineOf(r.slot) === 1 && before[k] === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND && r.at >= 0)
        made[r.at]!++;
      prev[k] = at;
    });
  }
  assert.ok(made[3]! >= 1, 'the pier was reached');
  assert.equal(invariant(w.w), null);
});

// ---------------------------------------------------------------- v27's eased end stop and homeward-only halt (R3a)
/** v26's leg profile, copied before R3a: legs with no `brake` must stay bit for bit. */
function v26Profile(dist: number, v0: number, a: number, top: number) {
  if (v0 > 0 && dist * 2 * a < v0 * v0) {
    const dec = (v0 * v0) / (2 * dist);
    return { up: 0, cruise: 0, peak: v0, dec, total: v0 / dec, upCm: 0 };
  }
  const upTicks = (top - v0) / a,
    upCm = v0 * upTicks + (a * upTicks * upTicks) / 2,
    downCm = (top * top) / (2 * a);
  if (dist >= upCm + downCm) {
    const cruise = (dist - upCm - downCm) / top;
    return { up: upTicks, cruise, peak: top, dec: a, total: upTicks + cruise + top / a, upCm };
  }
  const up = v0 ? (Math.sqrt(a * dist + (v0 * v0) / 2) - v0) / a : Math.sqrt(dist / a);
  const peak = v0 + a * up;
  return { up, cruise: 0, peak, dec: a, total: up + peak / a, upCm: v0 * up + (a * up * up) / 2 };
}
function v26Along(dist: number, t: number, v0: number) {
  if (dist <= 0 || !(t > 0)) return 0;
  const p = v26Profile(dist, v0, TRAIN.accel, TRAIN.speed);
  if (t >= p.total) return dist;
  let s: number;
  if (t < p.up) s = v0 * t + (TRAIN.accel * t * t) / 2;
  else if (t < p.up + p.cruise) s = p.upCm + p.peak * (t - p.up);
  else s = dist - (p.dec * (p.total - t) * (p.total - t)) / 2;
  return Math.max(0, Math.min(dist, Math.round(s)));
}
function v26Speed(dist: number, t: number, v0: number) {
  if (dist <= 0) return 0;
  if (!(t > 0)) return v0;
  const p = v26Profile(dist, v0, TRAIN.accel, TRAIN.speed);
  if (t >= p.total) return 0;
  if (t < p.up) return v0 + TRAIN.accel * t;
  if (t < p.up + p.cruise) return p.peak;
  return p.dec * (p.total - t);
}
const DISTS = [1, 7, 150, 999, 2740, 5714, 10000, 15600, 34999, 52400, 70950, 117300];
const V0S = [0, 1, 3.5, 37, 120, 199, 200];
test("with no brake every leg is v26's, bit for bit (and a brake equal to accel takes the same branches)", () => {
  const same = { speed: TRAIN.speed, accel: TRAIN.accel, brake: TRAIN.accel };
  for (const dist of DISTS)
    for (const v0 of V0S) {
      const ticks = Math.ceil(v26Profile(dist, v0, TRAIN.accel, TRAIN.speed).total);
      assert.equal(trainLegTicks(dist, v0), ticks, `${dist}/${v0} ticks`);
      assert.equal(trainLegTicks(dist, v0, same), ticks);
      for (let t = -1; t <= ticks + 1; t += t < 40 || t > ticks - 40 ? 1 : 7) {
        assert.equal(trainLegAlong(dist, t, v0), v26Along(dist, t, v0), `${dist}/${v0} along at ${t}`);
        assert.equal(trainLegSpeed(dist, t, v0), v26Speed(dist, t, v0), `${dist}/${v0} speed at ${t}`);
        assert.equal(trainLegAlong(dist, t, v0, same), v26Along(dist, t, v0));
        assert.equal(trainLegSpeed(dist, t, v0, same), v26Speed(dist, t, v0));
      }
    }
});
test('with brake 2 a leg never brakes harder than 2 cm a tick², never passes its stop, and is continuous', () => {
  const kin = { speed: TRAIN.speed, accel: TRAIN.accel, brake: RING_END_BRAKE_CMS2 / 100 };
  assert.equal(kin.brake, 2);
  let legs = 0;
  for (const dist of DISTS)
    for (const v0 of V0S) {
      if (dist * 2 * kin.brake < v0 * v0) continue; // the planner never commits to a stop it can't brake for
      legs++;
      const ticks = trainLegTicks(dist, v0, kin);
      assert.ok(ticks >= trainLegTicks(dist, v0), 'an eased stop is never sooner');
      let s = 0,
        v = v0;
      for (let t = 1; t <= ticks + 2; t++) {
        const s1 = trainLegAlong(dist, t, v0, kin),
          v1 = trainLegSpeed(dist, t, v0, kin);
        assert.ok(s1 >= s && s1 <= dist, `${dist}/${v0}: on and never past at ${t}`);
        assert.ok(s1 - s <= kin.speed + 1, `${dist}/${v0}: no jump at ${t}`);
        assert.ok(v - v1 <= kin.brake + 1e-9, `${dist}/${v0}: braked ${v - v1} at ${t}`);
        assert.ok(v1 - v <= kin.accel + 1e-9, `${dist}/${v0}: sped up ${v1 - v} at ${t}`);
        s = s1;
        v = v1;
      }
      assert.equal(trainLegAlong(dist, ticks, v0, kin), dist, 'stands at the stop');
      assert.equal(trainLegSpeed(dist, ticks, v0, kin), 0);
    }
  assert.ok(legs > 60);
});
test("the eased rate is the Railhead's up arrival only: stopKin by halt and track, and the pose reads the row", () => {
  const stops = line2Stops(7, 0);
  assert.equal(stopKin(LINE2_ROWS, 4, 0).brake, 2, 'up into the railhead');
  assert.equal(stopKin(LINE2_ROWS, 4, 1).brake, undefined, 'down trains brake at 3.5');
  for (const k of [0, 1, 2, 3, 5]) assert.equal(stopKin(LINE2_ROWS, k, 0).brake, undefined, `halt ${k}`);
  assert.equal(stopKin(LINE2_ROWS, -1, 0).brake, undefined, 'a signal');
  assert.equal(stopKin(1, 3, 0), RAIL_LINES[1], "the catalog's lines: the line's own kin");
  const leg = { ...trainIdle(A), phase: TRAIN_PHASE.RUN, at: 3, to: 4, track: 0, depart: 0, from: 72650, v0: 0 };
  const into = { ...leg, dest: stops[4]! };
  const eased = trainArrives(into, LINE2_ROWS),
    plain = trainArrives(into, {
      ...LINE2_ROWS,
      id: 'no-brake',
      halts: LINE2_ROWS.halts.map((h) => ({ ...h, brake: undefined })),
    });
  assert.ok(eased > plain, `${eased} ticks eased against ${plain}`);
  assert.equal(trainAlong(into, LINE2_ROWS, eased), stops[4]);
  assert.ok(trainSpeed(into, LINE2_ROWS, eased - 1) <= 2 + 1e-9);
});
test("an up train's riders are offered the Railhead, not the homeward-only Pier; a down train's the Pier", () => {
  const stops = line2Stops(7, 7, true); // after the Meet: the Railhead is a middle halt
  const up = { ...trainIdle(A), phase: TRAIN_PHASE.RUN, at: 2, to: 4, track: 0, depart: 0, from: 60000, v0: 200 };
  const upRow = { ...up, dest: stops[4]! };
  assert.deepEqual(trainRequestable(upRow, LINE2_ROWS, stops, 0), { stop: 4, dir: 1, requested: true });
  assert.equal(trainRequestable({ ...upRow, to: -1, dest: 80000 }, LINE2_ROWS, stops, 0)?.stop, 4);
  const down = { ...upRow, at: 4, to: 0, track: 1, from: 80000, dest: stops[0]! };
  assert.deepEqual(trainRequestable(down, LINE2_ROWS, stops, 0), { stop: 3, dir: -1, requested: false });
  // While the Pier is the end it is the end: not offered (the train stops there anyway).
  const q6 = line2Stops(6);
  assert.equal(trainRequestable({ ...upRow, to: 3, dest: q6[3]! }, LINE2_ROWS, q6, 0), null);
  // v26's count still reads the first `n` halts' stops (train-view.ts until R4a).
  assert.deepEqual(trainRequestable(upRow, 1, TRAIN_STOPS[1]!.slice(0, 4), 0), trainRequestable(upRow, 1, 4, 0));
  assert.equal(trainPassesBy(LINE2_ROWS, 3, 1, stops.length), true);
  assert.equal(trainPassesBy(LINE2_ROWS, 3, -1, stops.length), false);
  assert.equal(trainPassesBy(LINE2_ROWS, 3, 1, q6.length), false, 'the open end serves both ways in');
});
