// Review of ring/r3b2-v27 (R3b-2, the v27 bump): the railhead moving out and the rivet with two and three trains near
// the end (a burst of bents, a waiter, a held train), the ring on the world under random asks, ops and restores from
// before Q7 to the rivet with the load check every tick, the server's reach at every head, the load check on broken
// v27 rows, Q7's kit, a v26-shaped save, and the balanced hold's cap (R3b-1 review P3-2). FUZZ_SEEDS replaces the
// fuzzes' seeds (./helpers/fuzz.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import { railwayAtRing } from '../src/sim/railway-seed-ring.ts';
import { Aperture, Line, Rail, Train, createRailwayWorld } from '../src/sim/railway-components.ts';
import { LINE2_STATIONS, Q6, Q7 } from '../src/sim/railway-line2-layout.ts';
import { LINE2, RAIL_HALTS, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { RING_HEAD } from '../src/sim/railway-ring-layout.ts';
import { TRAIN, TRAIN_PHASE, trainAlong, trainDir, type RailTrain } from '../src/sim/railway-train.ts';
import {
  LINE_SLOTS,
  balancedHold,
  endBlocks,
  endMoved,
  lineSpacing,
  stopMoved,
  trainSpacing,
  trainStepLine,
} from '../src/sim/railway-trains.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import { footingTotal } from '../src/sim/railway-queries-works.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { railValid, type Actor } from '../src/world/railway-server.ts';
import { FixtureLine, LINE2_ROWS as V, line2Stops, standingAt } from './helpers/rail-rows.ts';
import {
  account,
  act,
  aperture,
  check,
  invariant,
  kitJob,
  qActive,
  qjob,
  rail,
  railTick,
  railwayAtTrains,
  railwayAtWorks,
  restore,
  stopsOf,
  train,
  trains,
  works,
  type Seed,
} from './helpers/rail.ts';
import { fuzzSeeds } from './helpers/fuzz.ts';

const [A, B, C] = LINE_SLOTS[LINE2] as [number, number, number];
const PIER = 3,
  HEAD = 4,
  ISLAND = 5;
const seed = (s: Seed): Seed => ({ w: restore(s.w), t: s.t });
const rowsOf = (s: Seed) => (k: number) => train(s.w, k) as RailTrain;
/** One rule tick with the whole load check and the spacing, and no train jumping. */
function tick(s: Seed, what = '') {
  const before = trains(s.w).map((r) => trainAlong(r as RailTrain, RAIL_TRAINS[trains(s.w).indexOf(r)]!.line, s.t));
  railTick(s.w, ++s.t);
  const broken = check(s.w) ?? trainSpacing(rowsOf(s), (l) => stopsOf(s.w, l), s.t);
  if (broken) assert.fail(`${what} tick ${s.t}: ${broken}`);
  trains(s.w).forEach((r, k) => {
    const d = Math.abs(trainAlong(r as RailTrain, RAIL_TRAINS[k]!.line, s.t) - before[k]!);
    assert.ok(d <= TRAIN.speed + 1, `${what} train ${k} jumps ${d} cm at ${s.t}`);
  });
}
function put(s: Seed, k: number, row: Partial<RailTrain>) {
  const pose: Partial<RailTrain> = { ...row };
  for (const f of ['logs', 'rails', 'wagon', 'foot'] as const) delete pose[f];
  Object.assign(s.w.mut(Train, s.w.lookup(Train, k)!)!, pose);
}
const carry = (s: Seed, pid = 'a') =>
  act(s, pid, 'rail.footTake', { rack: 2 }) && act(s, pid, 'rail.footSet', { site: 3 });

/** Deck-laid with six footings on the railhead rack (three bents' worth), the wagon away from the railhead. */
function sixRacked(): Seed {
  const s = seed(railwayAtRing('deck-laid'));
  for (let g = 0; aperture(s.w).rack < WORKS.wagonCap; g++) {
    assert.ok(g < 8000, 'six on the rack');
    tick(s);
  }
  for (let g = 0; trains(s.w).some((r) => r.wagon && r.phase === TRAIN_PHASE.STAND && r.at === HEAD); g++) {
    assert.ok(g < 3000);
    tick(s);
  }
  return s;
}
/** Train A standing at the Railhead end (down track) from `depart`, B waiting at the railhead's signal on the up
 * track, C at the Village going up with its dwell for ever: the line's asks and departures cleared. */
function endWithWaiter(s: Seed, departA: number) {
  const stops = stopsOf(s.w, LINE2),
    sig = endBlocks(LINE2, stops)[1].signal;
  put(s, A, standingAt(stops, HEAD, 1, departA));
  put(s, B, { ...standingAt([sig], 0, 0, s.t), at: -1, to: -1 });
  put(s, C, standingAt(stops, 0, 0, s.t));
  for (const id of s.w.ids(Line)) Object.assign(s.w.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
  const placed = invariant(s.w);
  if (placed) assert.fail(`placement: ${placed}`);
}

test('three bents in one burst with a train at the railhead end and one at its signal: legal every tick, both go on', () => {
  const s = sixRacked();
  endWithWaiter(s, s.t);
  const along0 = trainAlong(train(s.w, A) as RailTrain, LINE2, s.t);
  // Six footings set on one tick: the railhead moves on three bents (60 m) under a standing train.
  for (let k = 0; k < 6; k++) assert.equal(carry(s, k % 2 ? 'b' : 'a'), 1, `footing ${k}`);
  assert.equal(aperture(s.w).set, 6);
  const stops = stopsOf(s.w, LINE2);
  assert.equal(stops[HEAD], RING_HEAD[3]!.s);
  const a = train(s.w, A);
  assert.deepEqual([a.at, a.to, a.from], [-1, -1, along0], 'A stands where it stood, at no halt');
  const [, block] = endBlocks(LINE2, stops);
  assert.ok(along0 + 620 <= block.from, `A (${along0}) is now outside the end block (${block.from}): not an end train`);
  // Both trains go on: A home, B up to the new railhead; nobody stands two minutes.
  let bAt = -1,
    aLeft = -1;
  for (let k = 0; k < 2400 && (bAt < 0 || aLeft < 0); k++) {
    tick(s, 'burst');
    if (aLeft < 0 && train(s.w, A).phase === TRAIN_PHASE.RUN) aLeft = s.t;
    const b = train(s.w, B);
    if (bAt < 0 && b.phase === TRAIN_PHASE.STAND && b.at === HEAD) bAt = s.t;
  }
  assert.ok(aLeft >= 0 && bAt >= 0, `A left at ${aLeft}, B reached the railhead at ${bAt}`);
});

test('the bents move on under a train held by the balanced hold: its hold still ends within the cap', () => {
  const s = sixRacked();
  // A at the railhead end, its dwell done; B and C bunched just ahead of it down the line, dwelling for ever, so the
  // gap ahead is the shorter and A is balanced-held.
  const stops = stopsOf(s.w, LINE2);
  put(s, A, standingAt(stops, HEAD, 1, s.t - TRAIN.dwellTicks - 1));
  put(s, B, standingAt(stops, 2, 1, 1e8)); // Far Head, going down: the gap ahead of A
  put(s, C, standingAt(stops, 0, 0, 1e8));
  for (const id of s.w.ids(Line)) Object.assign(s.w.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
  assert.equal(invariant(s.w), null);
  const from = s.t;
  tick(s);
  assert.equal(train(s.w, A).phase, TRAIN_PHASE.STAND, 'held');
  assert.equal(carry(s), 1);
  assert.equal(carry(s, 'b'), 1);
  assert.equal(train(s.w, A).at, -1, 'stands at no halt now');
  let left = -1;
  for (let k = 0; k < 2000 && left < 0; k++) {
    tick(s, 'held');
    if (train(s.w, A).phase === TRAIN_PHASE.RUN) left = s.t;
  }
  assert.ok(
    left > 0 && left - from <= TRAIN.dwellTicks + V.balance! + 2,
    `A left ${left - from} ticks after its dwell began`,
  );
});

test('the rivet with one train left at a moved-on railhead and one running up past the edge', () => {
  const s = seed(railwayAtRing('leaf-raised'));
  assert.equal(act(s, 'a', 'rail.brace', { revision: 1 }), 1);
  for (let k = 0; k < 3; k++) assert.equal(carry(s), 1);
  const stops = stopsOf(s.w, LINE2);
  // A stands 20 m short of the railhead on the down track, at no halt (as stopMoved leaves a train); B runs up to the
  // railhead from the Pier, its nose not yet at the stub's edge; C at the Village.
  put(s, A, { ...standingAt([stops[HEAD]! - 2000], 0, 1, s.t), at: -1, to: -1 });
  put(s, B, { ...standingAt([90000], 0, 0, s.t - 1), phase: TRAIN_PHASE.RUN, at: PIER, to: -1, dest: 92000 });
  put(s, C, standingAt(stops, 0, 0, s.t));
  for (const id of s.w.ids(Line)) Object.assign(s.w.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
  assert.equal(invariant(s.w), null);
  assert.equal(carry(s), 1, 'the fourth weight: the leaf down');
  assert.equal(act(s, 'a', 'rail.strike', { id: 2 }), 1);
  for (let k = 0; k < 3000; k++) tick(s, 'rivet');
  assert.ok(
    trains(s.w).some((r) => r.phase === TRAIN_PHASE.STAND && r.at === ISLAND) ||
      trains(s.w).some((r) => r.to === ISLAND),
    'a train serves the island',
  );
});

// ---------------------------------------------------------------- the staged fixture fuzz, with bursts
/** One fixture tick: the spacing, the load check and no jump. */
function stepF(f: FixtureLine, t: number) {
  const before = f.rows.map((r) => trainAlong(r, f.line, t - 1));
  trainStepLine(f.io(), f.line, t);
  f.rows.forEach((r, k) => assert.ok(Math.abs(trainAlong(r, f.line, t) - before[k]!) <= TRAIN.speed + 1));
  assert.equal(
    lineSpacing((k) => f.rows[k]!, f.line, f.stops, t),
    null,
    `spacing at ${t}`,
  );
  assert.equal(f.broken(), null, `rows at ${t}`);
}
for (const sd of fuzzSeeds([0xa11ce, 0x2b2b, 0xd00d, 0x5eed, 0xbee]))
  test(`fixture fuzz ${sd.toString(16)}: Q7, bents in bursts of up to three on one tick, the rivet at once after`, () => {
    const rand = mulberry32(sd);
    let f = new FixtureLine(line2Stops(6));
    let head = 0,
      stage = 0,
      next = 300 + Math.floor(rand() * 600);
    const longest = new Map<number, number>();
    for (let t = 1; t <= 12000; t++) {
      if (t === next) {
        if (stage === 0) {
          f.stops = line2Stops(7, 0);
          endMoved(f.io(), V, PIER, t);
          stage = 1;
        } else if (head < 7) {
          for (let b = 1 + Math.floor(rand() * 3); b > 0 && head < 7; b--) {
            head++;
            f.stops = line2Stops(7, head);
            stopMoved(f.io(), V, HEAD, t);
          }
        } else if (stage === 1) {
          f.stops = line2Stops(7, 7, true);
          endMoved(f.io(), V, HEAD, t);
          stage = 2;
        }
        assert.equal(f.broken(), null, `after the stage at ${t}`);
        next = t + 1 + Math.floor(rand() * (rand() < 0.3 ? 3 : 400));
      }
      if (t > TRAIN.wakeTicks && rand() < 0.05) f.call(Math.floor(rand() * f.stops.length), rand() < 0.5 ? -1 : 1, t);
      if (t > TRAIN.wakeTicks && rand() < 0.03 && f.stops.length > 2) {
        const slot = Math.floor(rand() * 3);
        f.call(1 + Math.floor(rand() * (f.stops.length - 2)), trainDir(f.rows[slot]!), t, slot);
      }
      stepF(f, t);
      f.rows.forEach((r, k) => {
        if (r.phase !== TRAIN_PHASE.STAND) return void longest.delete(k);
        if (!longest.has(k)) longest.set(k, t);
        assert.ok(t - longest.get(k)! < 1800, `train ${k} stood 3 minutes (to ${t})`);
      });
      if (rand() < 0.002) {
        const g = new FixtureLine(f.stops);
        g.rows = f.rows;
        g.lineRow = f.lineRow;
        g.restore();
        f = g;
      }
    }
    assert.equal(stage, 2, 'reached the rivet');
  });

// ---------------------------------------------------------------- the ring on the world, Q7 to the rivet
const HALT_OF = (line: number, stop: number) => RAIL_HALTS.findIndex((h) => h.line === line && h.stop === stop);
for (const sd of fuzzSeeds([0xa11ce, 0x2b2b, 0xd00d]))
  test(`world fuzz ${sd.toString(16)}: Q7's kit, the ring's footings, brace, weights and rivet under asks and restores`, (t) => {
    const rand = mulberry32(sd);
    let s = seed(railwayAtWorks('crossing-done'));
    const [logs7] = LINE2_STATIONS[Q7]!.bill;
    let restores = 0,
      joinedAt = -1,
      kitPassedFarHead = 0;
    for (let k = 0; k < 16000 && (joinedAt < 0 || s.t < joinedAt + 1500); k++) {
      // Q7's kit off the depot into its frame as it comes (any amount, either player).
      if (qActive(s.w) === Q7 && qjob(s.w, Q7).start < 0 && rand() < 0.2) {
        const pid = rand() < 0.5 ? 'a' : 'b';
        for (const kind of [0, 2]) {
          const n = act(s, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake');
          if (n) assert.equal(act(s, pid, 'rail.deposit', { station: 'Q7', kind, n }), n);
        }
      }
      // The ring: either player shoulders and sets whenever it can, sometimes in bursts.
      for (const pid of ['a', 'b'])
        for (let b = rand() < 0.1 ? 4 : 1; b > 0; b--)
          if (rand() < 0.3) {
            if (account(s.w, pid)!.foot) act(s, pid, 'rail.footSet', { site: Math.floor(rand() * 4) });
            else act(s, pid, 'rail.footTake', { rack: rand() < 0.95 ? 2 : 1 });
          }
      if (rand() < 0.01) act(s, 'a', 'rail.brace', { revision: 1 });
      if (rand() < 0.01 && act(s, 'b', 'rail.strike', { id: 2 }) && joinedAt < 0) joinedAt = s.t;
      if (rand() < 0.05) {
        const n = stopsOf(s.w, LINE2).length;
        act(s, 'a', 'rail.call', { id: HALT_OF(LINE2, Math.floor(rand() * n)), dir: rand() < 0.5 ? -1 : 1 });
      }
      if (rand() < 0.03) {
        const n = stopsOf(s.w, LINE2).length,
          slot = LINE_SLOTS[LINE2]![Math.floor(rand() * 3)]!;
        act(s, 'b', 'rail.call', {
          id: HALT_OF(LINE2, 1 + Math.floor(rand() * (n - 2))),
          dir: trainDir(train(s.w, slot) as RailTrain),
          train: slot,
        });
      }
      const depot = rail(s.w).depot,
        q7Kit = kitJob(s.w) === Q7;
      tick(s, `seed ${sd.toString(16)}`);
      // Calls 62, 63, 65 and 54: the depot fills only at the Pier while Q7's is the kit; the kit is its bill; no
      // footing on the pier rack; every footing in one home.
      if (q7Kit && rail(s.w).depot > depot)
        assert.ok(
          trains(s.w).some((r) => r.phase === TRAIN_PHASE.STAND && r.at === PIER && r.depart === s.t),
          `the depot filled at ${s.t} with no train arriving at the Pier`,
        );
      if (q7Kit && trains(s.w).some((r) => r.logs + r.rails > 0 && r.phase === TRAIN_PHASE.STAND && r.at === 2))
        kitPassedFarHead++;
      assert.ok(rail(s.w).out6 <= logs7, 'out6 within its bill');
      assert.equal(works(s.w).pierRack, 0, `pier rack at ${s.t}`);
      assert.equal(footingTotal(s.w), works(s.w).poured, `footings at ${s.t}`);
      if (rand() < 0.002) {
        s = seed(s);
        restores++;
      }
    }
    t.diagnostic(
      `joined at ${joinedAt}; set ${aperture(s.w).set} cw ${aperture(s.w).cw}; restores ${restores}; ` +
        `kit train stood at Far Head ${kitPassedFarHead} ticks (asks only)`,
    );
    assert.ok(joinedAt > 0, 'the rivet was struck');
    assert.equal(invariant(s.w), null);
  });

// ---------------------------------------------------------------- the server's reach at each head
const actorAt = (p: { x: number; y: number; z: number }): Actor => ({
  reach: (x, z, r) => Math.hypot(x - p.x, z - p.z) <= r,
  height: (y, r) => Math.abs(y - p.y) <= r,
  cadence: () => true,
});
test('the server judges rack 2, site 3 and the Railhead lever at RING_HEAD[floor(set / 2)], for every set 0 to 14', () => {
  const s = seed(railwayAtRing('deck-laid'));
  const railhead = HALT_OF(LINE2, HEAD);
  for (let set = 0; set <= WORKS.ring; set++) {
    s.w.mut(Aperture, s.w.single(Aperture))!.set = set;
    const head = Math.floor(set / 2);
    for (let k = 0; k < RING_HEAD.length; k++) {
      const h = RING_HEAD[k]!,
        ok = k === head;
      assert.equal(
        railValid(s.w, { op: 'rail.footTake', rack: 2, epoch: 0, request: 0 }, actorAt(h.rack)),
        ok,
        `rack, set ${set}, at ${k}`,
      );
      assert.equal(
        railValid(s.w, { op: 'rail.footSet', site: 3, epoch: 0, request: 0 }, actorAt(h.jib)),
        ok,
        `jib, set ${set}, at ${k}`,
      );
      assert.equal(
        railValid(s.w, { op: 'rail.call', id: railhead, dir: -1, epoch: 0, request: 0 }, actorAt(h.platform)),
        ok,
        `lever, set ${set}, at ${k}`,
      );
    }
  }
});

// ---------------------------------------------------------------- the load check on broken v27 rows
test('the load check refuses broken v27 rows', () => {
  const at = (stage: Parameters<typeof railwayAtRing>[0]) => seed(railwayAtRing(stage));
  const refuse = (s: Seed, what: string) => assert.notEqual(check(s.w), null, what);
  // A train standing at the Railhead past the head's stop, and before it.
  for (const d of [2000, -2000]) {
    const s = at('deck-laid'),
      stops = stopsOf(s.w, LINE2);
    put(s, A, { ...standingAt(stops, HEAD, 1, s.t), from: stops[HEAD]! + d, dest: stops[HEAD]! + d });
    refuse(s, `standing at the Railhead ${d} cm off its head`);
  }
  {
    const s = at('ring-joined');
    put(s, A, { ...standingAt([RING_HEAD[7]!.s + 100], 0, 0, s.t), phase: TRAIN_PHASE.RUN, at: HEAD, to: HEAD });
    refuse(s, 'a leg to the Railhead not ending at its stop');
  }
  for (const out6 of [LINE2_STATIONS[Q7]!.bill[0] + 1, -1]) {
    const s = at('deck-laid');
    s.w.mut(Rail, s.w.single(Rail))!.out6 = out6;
    refuse(s, `out6 ${out6}`);
  }
  const ap = (
    stage: Parameters<typeof railwayAtRing>[0],
    patch: Partial<Record<'set' | 'rack' | 'cw' | 'brace' | 'joined', number>>,
  ) => {
    const s = at(stage);
    Object.assign(s.w.mut(Aperture, s.w.single(Aperture))!, patch);
    refuse(s, `${stage} ${JSON.stringify(patch)}`);
  };
  ap('deck-laid', { set: 15 });
  ap('deck-laid', { rack: WORKS.wagonCap + 1 });
  ap('deck-laid', { cw: 1 });
  ap('deck-laid', { brace: 2 });
  ap('gap-footed', { brace: 0 });
  ap('gap-footed', { joined: 5 });
  ap('gap-footed', { cw: 5 });
  ap('gap-footed', { brace: 3 });
  ap('ring-joined', { brace: 1 });
  ap('ring-joined', { cw: 3 });
  // Before Q7: any ring footing at all.
  {
    const s = seed(railwayAtWorks('crossing-done'));
    s.w.mut(Aperture, s.w.single(Aperture))!.rack = 1;
    refuse(s, 'a railhead rack before Q7');
  }
});

// ---------------------------------------------------------------- Q7's kit
test('no kit for Q7 while Q6 is unfinished or before the crossing; a restore between load and unload conserves it', () => {
  const q6 = seed(railwayAtTrains('q6-stocked'));
  assert.equal(kitJob(q6.w), Q6, "Q6's kit, while Q6 is unfinished");
  const done = seed(railwayAtTrains('q6-done'));
  assert.equal(kitJob(done.w), -1, 'Q6 laid, the crossing not footed: no kit at all');
  let s = seed(railwayAtWorks('crossing-done'));
  assert.equal(kitJob(s.w), Q7);
  const aboard = () => trains(s.w).reduce((n, r) => n + r.logs, 0);
  for (let g = 0; aboard() === 0; g++) {
    assert.ok(g < 4000);
    tick(s);
  }
  // Restore while the kit rides, then on to the Pier.
  s = seed(s);
  const issued = rail(s.w).out6;
  assert.equal(aboard() + rail(s.w).depot, issued, 'aboard + depot = issued, after the restore');
  for (let g = 0; rail(s.w).depot < issued; g++) {
    assert.ok(g < 4000);
    tick(s);
    if (g % 97 === 0) s = seed(s);
    assert.equal(aboard() + rail(s.w).depot, rail(s.w).out6);
  }
  assert.equal(rail(s.w).out6, LINE2_STATIONS[Q7]!.bill[0]);
});

// ---------------------------------------------------------------- a v26-shaped save
test('a v26-shaped save (no Aperture row, six QJobs, no out6) is refused with a railway error, never a crash', () => {
  const s = seed(railwayAtRing('deck-laid'));
  const snap = JSON.parse(JSON.stringify(s.w.snapshot())) as { c: Record<string, unknown[][]> };
  const variants: [string, (c: Record<string, unknown[][]>) => void][] = [
    ['no aperture', (c) => delete c.aperture],
    ['six qjobs', (c) => c.qjob!.forEach((col) => col.pop())],
    ['no out6', (c) => c.rail!.splice(c.rail!.length - 4, 1)],
  ];
  for (const [name, cut] of variants) {
    const c = JSON.parse(JSON.stringify(snap)) as typeof snap;
    cut(c.c);
    assert.throws(
      () => createRailwayWorld().load(c, railwayCheck),
      (e: unknown) => e instanceof Error && !(e instanceof TypeError) && !(e instanceof RangeError),
      name,
    );
  }
});

// ---------------------------------------------------------------- the balanced hold's cap (R3b-1 review P3-2)
test('an ask on the last held tick is owed its dwell by the dwell check alone, not by the cap', () => {
  // Bunched (as the R3b-1 review's): the gap ahead of train 0 stays the shorter, so only the cap lets it go.
  const stops = line2Stops(7, 7, true);
  const run = (balance: number | undefined) => {
    const f = new FixtureLine(stops, 0, 75, { ...V, balance });
    f.rows = [standingAt(stops, 0, 0, 0), standingAt(stops, 2, 0, 1e6), standingAt(stops, ISLAND, 1, 1e6)];
    const ask = TRAIN.dwellTicks + V.balance! - 1;
    for (let t = 1; t < 5000; t++) {
      if (t === ask) assert.equal(f.call(0, 1, t), 1);
      trainStepLine(f.io(), f.line, t);
      if (f.rows[0]!.phase === TRAIN_PHASE.RUN) return { left: t, ask };
    }
    return { left: -1, ask };
  };
  const capped = run(V.balance);
  // The cap runs from the arrival (`arrived`): the ask restarts only the dwell, so the train leaves one dwell after it.
  assert.equal(capped.left, capped.ask + TRAIN.dwellTicks);
  // The hold ends at dwell + cap from the arrival, and the dwell check (tick < depart + dwell, before the hold is read)
  // still keeps the asked train a full dwell from the ask: the hold's answer is false after its cap, and the asker's
  // dwell alone holds it.
  const f = new FixtureLine(stops);
  f.rows = [standingAt(stops, 0, 0, 0), standingAt(stops, 2, 0, 1e6), standingAt(stops, ISLAND, 1, 1e6)];
  assert.equal(balancedHold(f.io(), V, stops, 0, 0, capped.ask + 1), false, 'from arrival: the cap has run out');
  f.rows[0] = { ...f.rows[0]!, depart: capped.ask };
  for (let t = capped.ask + 1; t < capped.ask + TRAIN.dwellTicks; t++) {
    trainStepLine({ ...f.io(), headExempt: () => true }, V, t);
    assert.equal(f.rows[0]!.phase, TRAIN_PHASE.STAND, `the asker's dwell holds it at ${t} with no hold at all`);
  }
});
