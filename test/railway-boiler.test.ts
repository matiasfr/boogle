import test from 'node:test';
import assert from 'node:assert/strict';
import {
  account,
  act,
  advance,
  beam,
  boiler,
  chopTo,
  forge,
  invariant,
  layTicks,
  qjobs,
  rail,
  railBoilerPutDown,
  railBoilerStood,
  railResume,
  railSession,
  railSupplyPulse,
  railwayAtQ5,
  railwayAtTrains,
  restore,
  trains,
  TRAIN_STAGES,
  trees,
  type Seed,
} from './helpers/rail.ts';
import { line2Active, line2KitOwed, line2Rails, line2Trains } from '../src/sim/railway-queries-line2.ts';
import { Account, Boiler, Forge, Pile, QJob, Rail, createRailwayWorld } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { RAIL_POSITION_MAX } from '../src/sim/railway-route.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { LINE2_BOILER } from '../src/sim/railway-line2-layout.ts';
import { trainOwed, waitsForTrain } from '../src/entities/railway/forge-offer.ts';
import type { ReadWorld } from '../src/sim/railway-rows.ts';
import { TRAIN_HOME } from '../src/sim/railway-train.ts';

/** The boiler's position, read fresh: rows are replaced when a rule writes. */
const xyz = (w: Seed) => {
  const b = boiler(w.w);
  return [b.x, b.y, b.z];
};

test('cast once when Q5 completes, at the apron', () => {
  const w = railwayAtQ5('q5-finishing');
  assert.equal(boiler(w.w).state, 'none');
  const ticks = layTicks(w.w, 4);
  railResume(w.w, ticks, 1, w.t);
  assert.equal(boiler(w.w).state, 'pedestal');
  assert.deepEqual(xyz(w), [LINE2_BOILER.x, LINE2_BOILER.y, LINE2_BOILER.z]);
  const revision = boiler(w.w).revision;
  advance(w, 20);
  assert.equal(boiler(w.w).revision, revision);
  assert.equal(boiler(restore(w.w)).state, 'pedestal');
});
test('one boiler for two takers', () => {
  const w = railwayAtTrains('boiler');
  const revision = boiler(w.w).revision;
  assert.equal(act(w, 'a', 'rail.boilerTake', { revision }), 1);
  assert.equal(act(w, 'b', 'rail.boilerTake', { revision }), 0);
  assert.equal(boiler(w.w).holder, 'a');
});
test('a held boiler blocks the back', () => {
  const w = railwayAtTrains('boiler');
  chopTo(w, 'a', 1);
  assert.equal(act(w, 'a', 'rail.boilerTake', { revision: boiler(w.w).revision }), 0);
  assert.equal(act(w, 'b', 'rail.boilerTake', { revision: boiler(w.w).revision }), 1);
  for (const op of ['rail.forgeTake', 'rail.depotTake', 'rail.depotRailTake', 'rail.rackTake', 'rail.beamTake'])
    assert.equal(act(w, 'b', op, { revision: beam(w.w).revision }), 0);
  // The five above give nothing here to an empty back either; a chop and a pile do, and the boiler refuses both.
  const tree = RAILWAY_SOURCES[trees(w.w).findIndex((t) => t.left > 0)]![0];
  let pileId = -1;
  w.w.each([Pile], (id, p) => {
    if (pileId < 0 && p.kind === 0 && p.n > 0) pileId = id;
  });
  assert.ok(pileId >= 0, "the apron keeps Q5's leftover log piles");
  assert.equal(act(w, 'b', 'rail.chop', { id: tree, yaw: 0, collapsed: false }), 0, 'no chop onto a boiler back');
  assert.equal(act(w, 'b', 'rail.take', { id: pileId, kind: 0 }), 0, 'no pile onto a boiler back');
  assert.ok(act(w, 'a', 'rail.chop', { id: tree, yaw: 0, collapsed: false }) > 0, 'a free back chops');
  assert.ok(act(w, 'a', 'rail.take', { id: pileId, kind: 0 }) > 0, 'a free back takes the pile');
});
test('dropped where released, on Home only', () => {
  const w = railwayAtTrains('boiler-camp');
  assert.equal(boiler(w.w).state, 'ground');
  assert.deepEqual(xyz(w), [100700, 3030, -14400]);
  act(w, 'a', 'rail.boilerTake', { revision: boiler(w.w).revision });
  act(w, 'a', 'rail.boilerDrop', { revision: boiler(w.w).revision, x: 120000, y: 0, z: -20000 });
  assert.equal(boiler(w.w).state, 'pedestal');
  assert.equal(boiler(w.w).x, LINE2_BOILER.x);
});
test('the hauled boiler follows its holder; a leaver past the grace puts it down where they stood', () => {
  // docs/plans/boiler-first-choice.md, Part 3: the beam's rule.
  for (const [where, at, ends] of [
    ['inside the haul area', [100700, 3030, -14400], 'ground'],
    ['outside it', [120000, 0, -20000], 'pedestal'],
  ] as const) {
    const w = railwayAtTrains('boiler'),
      e = w.w;
    act(w, 'a', 'rail.boilerTake', { revision: boiler(e).revision });
    const revision = boiler(e).revision;
    railSession(e, 'a', 2);
    assert.equal(railBoilerStood(e, 'b', at[0], at[1], at[2]), false, `${where}: not for a non-holder`);
    assert.equal(railBoilerPutDown(e, 'b'), 0, `${where}: not for a non-holder`);
    assert.deepEqual(xyz(w), [LINE2_BOILER.x, LINE2_BOILER.y, LINE2_BOILER.z]);
    assert.equal(railBoilerStood(e, 'a', at[0], at[1], at[2]), true);
    assert.equal(railBoilerStood(e, 'a', at[0], at[1], at[2]), false, 'unchanged');
    assert.equal(boiler(e).state, 'held');
    assert.deepEqual(xyz(w), at);
    assert.equal(boiler(e).revision, revision, 'standing moves no revision');
    assert.equal(invariant(e), null);
    assert.equal(railBoilerPutDown(e, 'a'), 1);
    assert.equal(boiler(e).state, ends, where);
    assert.equal(boiler(e).holder, '');
    assert.deepEqual(xyz(w), ends === 'ground' ? at : [LINE2_BOILER.x, LINE2_BOILER.y, LINE2_BOILER.z]);
    assert.equal(boiler(e).revision, revision + 1);
    assert.equal(invariant(e), null);
    assert.equal(railBoilerPutDown(e, 'a'), 0, 'once');
    assert.equal(railBoilerStood(e, 'a', 0, 0, 0), false, 'no longer held');
    assert.equal(invariant(e), null);
  }
  // Never stood since the take off the pedestal: back onto the pedestal, not lying at its foot.
  const w = railwayAtTrains('boiler');
  act(w, 'a', 'rail.boilerTake', { revision: boiler(w.w).revision });
  assert.equal(railBoilerPutDown(w.w, 'a'), 1);
  assert.equal(boiler(w.w).state, 'pedestal');
  assert.equal(invariant(w.w), null);
});
test("the hauler's stood point is checked: never -0, never out of range, and the room still saves", () => {
  const w = railwayAtTrains('boiler');
  act(w, 'a', 'rail.boilerTake', { revision: boiler(w.w).revision });
  assert.equal(railBoilerStood(w.w, 'a', 100700, 3030, -14400), true);
  for (const [x, y, z] of [
    [100700, 3030, -0],
    [-0, 3030, -14400],
    [100700, 1e300, -14400],
    [RAIL_POSITION_MAX + 1, 3030, -14400],
    [100700, 3030, 0.5],
    [NaN, 3030, -14400],
  ])
    assert.equal(railBoilerStood(w.w, 'a', x!, y!, z!), false, `${x}, ${y}, ${z}`);
  assert.deepEqual(xyz(w), [100700, 3030, -14400]);
  assert.doesNotThrow(() => w.w.snapshot(), 'held');
  assert.equal(railBoilerPutDown(w.w, 'a'), 1);
  assert.equal(boiler(w.w).state, 'ground');
  assert.doesNotThrow(() => w.w.snapshot(), 'put down');
  assert.equal(invariant(w.w), null);
});
test('a ground boiler recovers after its minutes', () => {
  const w = railwayAtTrains('boiler-camp');
  const revision = boiler(w.w).revision;
  railSupplyPulse(w.w, { marker: 100, grow: '', recover: [] });
  railSupplyPulse(w.w, { marker: 121, grow: '', recover: [] });
  assert.equal(boiler(w.w).age, 21);
  railSupplyPulse(w.w, { marker: 121, grow: '', recover: [], boiler: revision - 1 });
  assert.equal(boiler(w.w).state, 'ground');
  railSupplyPulse(w.w, { marker: 121, grow: '', recover: [], boiler: revision });
  assert.equal(boiler(w.w).state, 'pedestal');
  assert.equal(boiler(w.w).revision, revision + 1);
  assert.equal(invariant(w.w), null);
});
test('fit once, at the old train', () => {
  const w = railwayAtTrains('boiler');
  act(w, 'a', 'rail.boilerTake', { revision: boiler(w.w).revision });
  assert.equal(act(w, 'a', 'rail.boilerFit', { revision: boiler(w.w).revision }), 1);
  assert.equal(rail(w.w).trains, w.t);
  assert.equal(boiler(w.w).state, 'fitted');
  assert.deepEqual(
    trains(w.w).map((r) => r.at),
    [...TRAIN_HOME],
  );
  assert.equal(act(w, 'a', 'rail.boilerFit', { revision: boiler(w.w).revision }), 0);
});
test('malformed boiler documents fail atomically', () => {
  const w = railwayAtTrains('boiler');
  for (const state of ['fitted', 'held', 'pedestal']) {
    const bad = restore(w.w);
    bad.mut(Boiler, bad.single(Boiler))!.state = state;
    if (state === 'pedestal') bad.mut(Rail, bad.single(Rail))!.trains = 1;
    const target = createRailwayWorld(),
      hash = target.hash();
    assert.throws(() => target.load(JSON.parse(JSON.stringify(bad.snapshot())), railwayCheck), /boiler/);
    assert.equal(target.hash(), hash);
  }
  const early = createRailwayWorld();
  early.mut(Boiler, early.single(Boiler))!.state = 'pedestal';
  assert.throws(() => railwayCheck(early), /boiler/);
});

// Station 6 waits for the train (docs/plans/boiler-first-choice.md, step 3; owner, 9 November).
/** A doctored, conserved world: `logs` from the apron's leftover pile and `rails` off the forge rack moved onto station
 * 6's frame (a world hand-fed before the rule shipped), and `carried` rails off the rack onto a's back. */
function doctored(w: Seed, logs: number, rails: number, carried = 0): Seed {
  const s = restore(w.w);
  let left = logs,
    a = -1;
  const emptied: number[] = [];
  s.each([Pile], (id, p) => {
    const n = p.kind === 0 ? Math.min(left, p.n) : 0;
    if (n === p.n) emptied.push(id);
    else if (n) s.mut(Pile, id)!.n -= n;
    left -= n;
  });
  for (const id of emptied) s.despawn(id);
  s.each([Account], (id, row) => {
    if (row.pid === 'a') a = id;
  });
  assert.ok(left === 0 && a >= 0, "the apron keeps Q5's leftover logs");
  s.mut(Forge, s.single(Forge))!.rack -= rails + carried;
  s.mut(Account, a)!.rails += carried;
  const j = s.mut(QJob, s.lookup(QJob, 5)!)!;
  j.stock += logs;
  j.delivered += logs;
  j.railStock += rails;
  j.railDelivered += rails;
  const out = { w: restore(s), t: w.t };
  assert.equal(invariant(out.w), null);
  assert.equal(line2Rails(out.w), forge(out.w).poured);
  return out;
}
const fit = (w: Seed) => {
  assert.equal(act(w, 'b', 'rail.boilerTake', { revision: boiler(w.w).revision }), 1);
  assert.equal(act(w, 'b', 'rail.boilerFit', { revision: boiler(w.w).revision }), 1);
};
test('station 6 takes nothing by hand and the forge gives no rails until trains run', () => {
  const w = doctored(railwayAtTrains('boiler'), 0, 0, 4);
  chopTo(w, 'a', 4); // a back holds 8: 4 logs beside the 4 rails
  const rack = forge(w.w).rack;
  assert.ok(rack > 0, 'the rack has rails');
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 0, n: 4 }), 0, 'no logs by hand');
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 2, n: 4 }), 0, 'no rails by hand');
  assert.equal(act(w, 'b', 'rail.forgeTake'), 0, 'the rack keeps its rails for the kit');
  assert.equal(forge(w.w).rack, rack);
  assert.deepEqual([qjobs(w.w)[5]!.stock, qjobs(w.w)[5]!.railStock], [0, 0]);
  assert.deepEqual([account(w.w, 'a')!.carry, account(w.w, 'a')!.rails], [4, 4], 'the back keeps its load');
  // The fit opens both: the frame takes a back's load and the rack gives rails again.
  fit(w);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 0, n: 4 }), 4);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 2, n: 4 }), 4);
  assert.ok(act(w, 'a', 'rail.forgeTake') > 0, 'the rack gives rails after the fit');
  assert.equal(line2Rails(w.w), forge(w.w).poured);
});
test('a station 6 part-filled by hand keeps its stock; the first train brings only the rest', () => {
  const w = doctored(railwayAtTrains('boiler'), 10, 6);
  assert.deepEqual(line2KitOwed(w.w), { logs: 22, rails: 26 });
  chopTo(w, 'a', 4);
  assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 0, n: 4 }), 0, 'the frame takes nothing more');
  const q6 = () => qjobs(w.w)[5]!;
  assert.deepEqual([q6().stock, q6().railStock, q6().start], [10, 6, -1]);
  fit(w);
  for (let ticks = 0; rail(w.w).depot !== 22 || rail(w.w).depotRails !== 26; ticks++) {
    assert.ok(ticks < 4000, 'the kit unloads at Far Head');
    advance(w, 1);
    assert.equal(line2Rails(w.w), forge(w.w).poured);
  }
  advance(w, 40);
  assert.deepEqual([rail(w.w).depot, rail(w.w).depotRails], [22, 26], 'only the rest came');
  assert.deepEqual([q6().stock, q6().railStock], [10, 6], 'what was in the frame stays there');
  assert.equal(invariant(w.w), null);
});
test('the rule never fires before station 6 or once trains run; every stage conserves', () => {
  const stages: [string, () => Seed][] = [
    // Q5 still taking materials, then station 6 from the boiler to laid; the Works stages (after Q6) are in
    // railway-works.test.ts's forge offer test.
    ['q5-finishing', () => railwayAtQ5('q5-finishing')],
    ...TRAIN_STAGES.map((k): [string, () => Seed] => [k, () => railwayAtTrains(k)]),
  ];
  const seen = { owed: 0, free: 0 };
  for (const [name, make] of stages) {
    const w = make(),
      s = w.w;
    const k = line2Active(s),
      owed = trainOwed(k, line2Trains(s));
    seen[owed ? 'owed' : 'free']++;
    assert.equal(owed, k === 5 && rail(s).trains < 0, name);
    if (owed) {
      chopTo(w, 'a', 1);
      assert.equal(act(w, 'a', 'rail.deposit', { station: 'Q6', kind: 0, n: 1 }), 0, name);
      assert.equal(act(w, 'b', 'rail.forgeTake'), 0, name);
    }
    assert.equal(invariant(s), null, name);
    assert.equal(line2Rails(s), forge(s).poured, name);
  }
  assert.ok(seen.owed > 0 && seen.free > 0, JSON.stringify(seen));
});
// The single cases (hand-fed, funded, trains running) are test/railway-m10c-review.test.ts's, on worlds.
test('one reading of "station 6 waits for the train" for the frame, the rack and the shelf', () => {
  let waited = 0;
  for (const k of TRAIN_STAGES) {
    const s = railwayAtTrains(k).w,
      active = line2Active(s);
    const waits = waitsForTrain(s as unknown as ReadWorld);
    // Exactly when the rule refuses hands (trainOwed in src/sim) and the stretch isn't funded yet.
    assert.equal(waits, trainOwed(active, line2Trains(s)) && qjobs(s)[active]!.start < 0, k);
    waited += Number(waits);
  }
  assert.ok(waited > 0, 'some train stage waits');
});
