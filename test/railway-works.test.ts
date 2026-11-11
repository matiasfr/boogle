// Split-rock Works and the smallest Roundhouse (docs/plans/split-rock-roundhouse.md, J3g): the rules on accepted
// fixtures, every transfer one apply, every footing in one home.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  account,
  act,
  advance,
  advanceWorks,
  boiler,
  boilerHeld,
  cart,
  forge,
  hash,
  held,
  invariant,
  qjob,
  rail,
  railCarryMax,
  railFootRelease,
  railResume,
  railSupplyPulse,
  railwayAtTrains,
  railwayAtWorks,
  restore,
  rock,
  scheduleOf,
  shed,
  train,
  trains,
  trees,
  works,
  worksClock,
  TRAIN_STAGES,
  WORKS_STAGES,
  type Seed,
} from './helpers/rail.ts';
import {
  line2Active,
  line2CartStatus,
  line2Completed,
  line2Rails,
  line2Trains,
  railCounts,
} from '../src/sim/railway-queries-line2.ts';
import { footingTotal, pierNeed, worksStage } from '../src/sim/railway-queries-works.ts';
import { forgeRailsOffered, trainOwed } from '../src/entities/railway/forge-offer.ts';
import { CART_PHASE, cartAlong } from '../src/sim/railway-cart.ts';
import { TRAIN_STOPS } from '../src/sim/railway-train.ts';
import { RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { LINE2_BOILER, LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { RAIL_ROCKS, RAIL_STONE, WORKS, WORKS_BREAKER, WORKS_ROCKS } from '../src/sim/railway-works-layout.ts';
import { Account, Boiler, Line, Pile, Rail, Train, Works, createRailwayWorld } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import type { World } from '../src/ecs/index.ts';

const chop = (s: Seed, pid: string, n: number) => {
  while (account(s.w, pid)!.carry < n) {
    const k = trees(s.w).findIndex((t) => t.left > 0);
    assert.ok(k >= 0);
    act(s, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
  }
};
const mineAll = (s: Seed, pid: string) => {
  for (const spot of WORKS_ROCKS) while (rock(s.w, spot.id).left > 0) act(s, pid, 'rail.mine', { id: spot.id });
};
/** The ground piles of one kind with their ids (a pile's id is its entity id), in ascending id order. */
const pilesOf = (w: World, kind: number) => {
  const out: { id: number; n: number }[] = [];
  w.each([Pile], (id, p) => {
    if (p.kind === kind) out.push({ id, n: p.n });
  });
  return out;
};

test('the breaker stands on the boiler pedestal', () => {
  assert.deepEqual(
    [WORKS_BREAKER.x, WORKS_BREAKER.y, WORKS_BREAKER.z],
    [LINE2_BOILER.x, LINE2_BOILER.y, LINE2_BOILER.z],
  );
});
test('a cast breaker means trains run: station 6 cannot be laid by hand before the fit', () => {
  // Through ops from the boiler on its pedestal (docs/plans/boiler-first-choice.md, Part 2 and step 3).
  const s = railwayAtTrains('boiler'),
    w = s.w;
  const castOnlyWithTrains = (beat: string) =>
    assert.ok(
      works(w).breaker === 0 || rail(w).trains >= 0,
      `${beat}: breaker ${works(w).breaker}, trains ${rail(w).trains}`,
    );
  // Hand delivery first, as the owner tried on 9 November: nothing reaches the frame, so Q6 never funds.
  for (const pid of ['a', 'b']) {
    while (account(w, pid)!.carry < 8) {
      const k = trees(w).findIndex((t) => t.left > 0);
      act(s, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
    }
    assert.equal(act(s, pid, 'rail.deposit', { station: 'Q6', kind: 0, n: 8 }), 0);
    assert.equal(act(s, pid, 'rail.forgeTake'), 0);
  }
  advance(s, 600);
  assert.equal(qjob(w, 5).start, -1);
  castOnlyWithTrains('before the fit');
  for (const pid of ['a', 'b']) assert.equal(act(s, pid, 'rail.drop', { x: 91900, y: 1815, z: 560, n: 8, kind: 0 }), 8);
  assert.equal(act(s, 'a', 'rail.boilerTake', { revision: boiler(w).revision }), 1);
  assert.equal(act(s, 'a', 'rail.boilerFit', { revision: boiler(w).revision }), 1);
  // The train brings the kit; two backs carry it rack to frame; the machine lays Q6 and the breaker is cast.
  for (let ticks = 0; rail(w).depot !== 32 || rail(w).depotRails !== 32; ticks++) {
    assert.ok(ticks < 4000, 'the kit unloads at Far Head');
    advance(s, 1);
  }
  assert.equal(act(s, 'a', 'rail.pack'), 1);
  for (const kind of [0, 2])
    for (const pid of ['a', 'b']) {
      assert.equal(act(s, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake'), 16);
      assert.equal(act(s, pid, 'rail.deposit', { station: 'Q6', kind, n: 16 }), 16);
    }
  for (let ticks = 0; line2Completed(w) < 6; ticks++) {
    assert.ok(ticks < 20000, 'Q6 is laid');
    advance(s, 1);
    castOnlyWithTrains(`tick ${s.t}`);
  }
  assert.equal(works(w).breaker, 1);
  assert.ok(rail(w).trains >= 0);
});
test('breaker cast once when Q6 completes; one taker', () => {
  const s = railwayAtTrains('q6-finishing'),
    w = s.w;
  assert.equal(works(w).breaker, 0);
  assert.equal(worksStage(w), 'dormant');
  while (line2Completed(w) < 6) {
    assert.equal(works(w).breaker, 0);
    advance(s, 1);
  }
  assert.equal(works(w).breaker, 1, 'cast the tick Q6 is laid');
  advance(s, 50);
  assert.equal(works(w).breaker, 1);
  assert.equal(act(s, 'a', 'rail.breaker'), 1);
  assert.equal(act(s, 'b', 'rail.breaker'), 0);
  assert.equal(works(w).breaker, 2);
  // An away credit that finishes Q6 casts it too.
  const away = railwayAtTrains('q6-finishing');
  railResume(away.w, scheduleOf(LINE2_STATIONS[5]!, qjob(away.w, 5)).totalTicks, 1, away.t);
  assert.equal(line2Completed(away.w), 6);
  assert.equal(works(away.w).breaker, 1);
  assert.equal(invariant(away.w), null);
});
test('a strike needs the breaker and is idempotent', () => {
  const s = railwayAtWorks('works-arrive'),
    w = s.w;
  assert.equal(act(s, 'a', 'rail.strike', { id: 1 }), 0, 'the breaker is still on its pedestal');
  assert.equal(act(s, 'a', 'rail.breaker'), 1);
  assert.equal(act(s, 'a', 'rail.strike', { id: 2 }), 0);
  assert.equal(act(s, 'a', 'rail.strike', { id: 0 }), 1);
  assert.equal(act(s, 'b', 'rail.strike', { id: 0 }), 0, 'a repeat strike moves nothing');
  assert.equal(works(w).seams, 1);
  assert.equal(worksStage(w), 'breaker');
  assert.equal(act(s, 'b', 'rail.strike', { id: 1 }), 1);
  assert.equal(works(w).seams, 3);
  assert.equal(worksStage(w), 'open');
});
test('no breaker and no strike while hauling the boiler', () => {
  // A world from before step 3 (docs/plans/boiler-first-choice.md, Part 2): Q6 laid by hand, the breaker cast on the
  // pedestal, and the boiler still waiting there, now on a's rope.
  const s = railwayAtTrains('q6-done'),
    w = s.w;
  for (const pid of ['a', 'b']) {
    const back = account(w, pid)!;
    for (const kind of [0, 2] as const) {
      const n = kind ? back.rails : back.carry;
      if (n) assert.equal(act(s, pid, 'rail.drop', { x: 91900, y: 1815, z: 560, n, kind }), n);
    }
  }
  const epoch = account(w, 'a')!.epoch;
  w.mut(Rail, w.single(Rail))!.trains = -1;
  Object.assign(w.mut(Boiler, w.single(Boiler))!, { state: 'held', holder: 'a', epoch, age: 0 });
  // Cold trains stand at home, empty (the kit was hand-carried in that world).
  RAIL_TRAINS.forEach(({ line, home: at, track }, slot) => {
    const here = TRAIN_STOPS[line]![at]!;
    Object.assign(w.mut(Train, w.lookup(Train, slot)!)!, {
      ...{ phase: 0, at, to: at, track, depart: 0, arrived: 0, req: 0, from: here, v0: 0, dest: here },
    });
  });
  for (const id of w.ids(Line)) Object.assign(w.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
  assert.equal(boiler(w).state, 'held');
  assert.equal(invariant(w), null);
  assert.equal(works(w).breaker, 1);
  assert.equal(act(s, 'a', 'rail.breaker'), 0, 'not for the hauler');
  assert.equal(act(s, 'b', 'rail.breaker'), 1, 'another player takes it');
  assert.equal(act(s, 'a', 'rail.strike', { id: 0 }), 0, 'the hauler strikes nothing');
  assert.equal(works(w).seams, 0);
  assert.equal(act(s, 'b', 'rail.strike', { id: 0 }), 1);
  assert.equal(invariant(w), null);
});
test('the kiln waits for the throat; lights once when both bills are full', () => {
  const s = railwayAtWorks('works-arrive'),
    w = s.w;
  act(s, 'a', 'rail.breaker');
  act(s, 'a', 'rail.strike', { id: 0 });
  chop(s, 'a', WORKS.kilnLogs);
  assert.equal(act(s, 'a', 'rail.kiln'), 0, 'the throat is sealed');
  assert.equal(act(s, 'a', 'rail.strike', { id: 1 }), 1);
  const before = railCounts(w);
  assert.equal(act(s, 'a', 'rail.kiln'), WORKS.kilnLogs);
  assert.equal(railCounts(w).total, before.total, 'logs move, none are made or lost');
  assert.equal(works(w).lit, -1);
  mineAll(s, 'b');
  const stone = railCounts(w).stone!.total;
  assert.equal(act(s, 'b', 'rail.kiln'), WORKS.kilnStone);
  assert.equal(railCounts(w).stone!.total, stone);
  assert.equal(works(w).lit, s.t, 'lit by the op that filled the last bill');
  chop(s, 'a', 2);
  assert.equal(act(s, 'a', 'rail.kiln'), 0, 'a lit kiln takes nothing');
  assert.equal(worksStage(w), 'lit');
});
test('pours one footing every 80 ticks to a rack of 6, 32 in all: the stall two, the pier twelve and the ring eighteen (v27)', () => {
  assert.equal(WORKS.total, WORKS.stall + WORKS.cradle + WORKS.pier + WORKS.ring + WORKS.counterweight);
  assert.deepEqual([WORKS.cradle, WORKS.total], [0, 32], 'the cradle takes rails only (works-late-game step 2a)');
  const s = railwayAtWorks('works-lit'),
    w = s.w;
  assert.deepEqual([works(w).rack, works(w).poured], [WORKS.rackCap, WORKS.rackCap]);
  advanceWorks(s, 300);
  assert.equal(works(w).poured, WORKS.rackCap, 'a full rack pours nothing');
  const pours: number[] = [],
    first = s.t;
  let at = 0;
  for (let guard = 0; works(w).poured < WORKS.total; guard++) {
    assert.ok(guard < 5000);
    if (works(w).rack > 0) {
      // Empty the rack onto the ground (a footing pile each), so the kiln keeps pouring.
      assert.equal(act(s, 'a', 'rail.footTake', { rack: 0 }), 1);
      assert.equal(act(s, 'a', 'rail.drop', { x: 108800 + 300 * (at++ % 8), y: 2400, z: 5000, n: 1, kind: 3 }), 1);
    }
    const poured = works(w).poured;
    advanceWorks(s, 1);
    if (works(w).poured > poured) pours.push(s.t);
  }
  assert.equal(pours.length, WORKS.total - WORKS.rackCap);
  assert.equal(pours[0], first + 1, 'the first comes as soon as the rack has room');
  for (let k = 1; k < pours.length; k++) assert.ok(pours[k]! - pours[k - 1]! >= WORKS.castTicks);
  advanceWorks(s, 400);
  assert.equal(works(w).poured, WORKS.total, 'thirty-two in all');
  assert.equal(invariant(w), null);
});
test('a footing fills your back', () => {
  const s = railwayAtWorks('works-lit'),
    w = s.w;
  assert.equal(act(s, 'a', 'rail.footTake', { rack: 0 }), 1);
  assert.equal(account(w, 'a')!.foot, 1);
  assert.equal(act(s, 'a', 'rail.footTake', { rack: 0 }), 0, 'one at a time');
  const k = trees(w).findIndex((t) => t.left > 0);
  assert.equal(act(s, 'a', 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }), 0);
  assert.equal(act(s, 'a', 'rail.forgeTake'), 0);
  assert.equal(act(s, 'a', 'rail.rackTake'), 0);
  // A back with anything on it cannot shoulder one.
  chop(s, 'b', 1);
  assert.equal(act(s, 'b', 'rail.footTake', { rack: 0 }), 0);
  assert.equal(works(w).rack, WORKS.rackCap - 1);
  assert.equal(footingTotal(w), works(w).poured);
});
test('sites in order', () => {
  const s = railwayAtWorks('works-arrive'),
    w = s.w;
  act(s, 'a', 'rail.breaker');
  act(s, 'a', 'rail.strike', { id: 1 });
  chop(s, 'a', WORKS.kilnLogs);
  act(s, 'a', 'rail.kiln');
  mineAll(s, 'b');
  act(s, 'b', 'rail.kiln');
  advanceWorks(s, WORKS.castTicks * 3);
  assert.equal(act(s, 'a', 'rail.footSet', { site: 0 }), 0, 'nothing on your back');
  assert.equal(act(s, 'a', 'rail.footTake', { rack: 0 }), 1);
  assert.equal(act(s, 'a', 'rail.footSet', { site: 0 }), 0, 'no stall before the slab');
  assert.equal(act(s, 'a', 'rail.footSet', { site: 1 }), 0, 'no cradle before the stall');
  assert.equal(act(s, 'a', 'rail.footSet', { site: 3 }), 0);
  assert.equal(act(s, 'a', 'rail.strike', { id: 0 }), 1);
  assert.equal(act(s, 'a', 'rail.footSet', { site: 0 }), 1);
  assert.equal(act(s, 'a', 'rail.footTake', { rack: 0 }), 1);
  assert.equal(act(s, 'a', 'rail.footSet', { site: 1 }), 0, 'the stall needs both');
  assert.equal(act(s, 'a', 'rail.footSet', { site: 0 }), 1);
  assert.equal(shed(w).stall, WORKS.stall);
  assert.equal(worksStage(w), 'stall');
  assert.equal(act(s, 'a', 'rail.footTake', { rack: 0 }), 1);
  assert.equal(act(s, 'a', 'rail.footSet', { site: 0 }), 0, 'the stall is full');
  assert.equal(act(s, 'a', 'rail.footSet', { site: 2 }), 1, 'Q6 is laid: the pier takes one');
  assert.equal(works(w).pierSet, 1);
  assert.equal(pierNeed(w), WORKS.pier - 1);
  assert.equal(footingTotal(w), works(w).poured);
});
test('fitted once; the table turns only when ready; a stale revision is 0', () => {
  const lit = railwayAtWorks('works-lit');
  assert.equal(act(lit, 'a', 'rail.turn', { to: 1, revision: 0 }), 0, 'no table before the stall');
  assert.equal(act(lit, 'a', 'rail.cradle'), 0);
  // The stall stands but the cradle is not fitted: refused, not accepted and silent (owner, 10 November).
  const early = railwayAtWorks('stall-done');
  assert.equal(act(early, 'a', 'rail.turn', { to: 1, revision: 0 }), 0, 'no turn before the fit');
  assert.deepEqual([shed(early.w).table, shed(early.w).tableRev], [0, 0]);
  const s = railwayAtWorks('cradle-fitted'),
    w = s.w;
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: 1 }), 0, 'stale');
  assert.equal(act(s, 'a', 'rail.turn', { to: 0, revision: 0 }), 0, 'already there');
  assert.equal(act(s, 'a', 'rail.turn', { to: 2, revision: 0 }), 0);
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: 0 }), 1);
  assert.equal(act(s, 'b', 'rail.turn', { to: 1, revision: 0 }), 0, 'a second turn on the same revision');
  assert.deepEqual(
    [shed(w).table, shed(w).tableRev, shed(w).ready],
    [1, 1, s.t + WORKS.rollTicks],
    'the one turn rolls it out',
  );
  assert.equal(invariant(w), null);
  const fitted = railwayAtWorks('cradle-fitted');
  const at = shed(fitted.w).fitted;
  assert.ok(at >= 0);
  assert.equal(act(fitted, 'b', 'rail.forgeTake'), 0, 'after the fit the forge rack gives nothing');
  assert.equal(act(fitted, 'b', 'rail.cradle'), 0, 'a full cradle takes no more rails');
  assert.equal(shed(fitted.w).fitted, at);
  assert.equal(line2Rails(fitted.w), forge(fitted.w).poured, 'rails on the cradle are counted');
});
test('after Q6 the forge rack gives only what the cradle still needs, so the back is empty for the footings', () => {
  const s = railwayAtWorks('stall-done'),
    w = s.w;
  for (let guard = 0; forge(w).rack < WORKS.cradleRails * 2; guard++) {
    assert.ok(guard < 4000, 'the forge pours rails');
    advanceWorks(s, 1);
  }
  assert.equal(act(s, 'b', 'rail.forgeTake'), WORKS.cradleRails, 'not a full back');
  assert.equal(act(s, 'b', 'rail.forgeTake'), 0, 'the cradle is covered by what you carry');
  assert.equal(act(s, 'b', 'rail.cradle'), WORKS.cradleRails);
  assert.equal(account(w, 'b')!.rails, 0, 'nothing left over');
  assert.equal(line2Rails(w), forge(w).poured, 'rails still conserved');
});
test('after the cradle is fitted the forge rack gives nothing', () => {
  const s = railwayAtWorks('stall-done'),
    w = s.w;
  for (let i = 0; i < WORKS.cradle; i++) {
    assert.equal(act(s, 'a', 'rail.footTake', { rack: 0 }), 1);
    assert.equal(act(s, 'a', 'rail.footSet', { site: 1 }), 1);
  }
  for (let guard = 0; forge(w).rack < WORKS.cradleRails * 2; guard++) {
    assert.ok(guard < 4000, 'the forge pours rails');
    advanceWorks(s, 1);
  }
  assert.equal(act(s, 'a', 'rail.forgeTake'), WORKS.cradleRails);
  assert.equal(act(s, 'b', 'rail.forgeTake'), WORKS.cradleRails, 'each back is capped on its own');
  assert.equal(act(s, 'a', 'rail.cradle'), WORKS.cradleRails);
  assert.ok(shed(w).fitted >= 0);
  assert.equal(account(w, 'b')!.rails, WORKS.cradleRails);
  assert.equal(act(s, 'b', 'rail.cradle'), 0, 'a full cradle takes no more rails');
  const rack = forge(w).rack;
  assert.ok(rack > 0);
  assert.equal(act(s, 'a', 'rail.forgeTake'), 0, 'nothing for an empty back');
  assert.equal(act(s, 'b', 'rail.forgeTake'), 0, 'nor for one already carrying rails');
  assert.equal(forge(w).rack, rack);
  assert.equal(line2Rails(w), forge(w).poured, 'rails still conserved');
});
test('"Take rails" is offered exactly where the forge rack gives some, from Q5 to the crossing', () => {
  // The view's offer (forge-offer.ts) against rail.forgeTake, for a back with room and no beam, boiler or footing
  // (those it does not judge: a full back is "Your back is full").
  const seen = { offered: 0, hidden: 0, owed: 0 };
  const check = (name: string, s: Seed) => {
    const w = s.w;
    for (const pid of ['a', 'b']) {
      const a = account(w, pid)!;
      const holding = held(w, pid) || boilerHeld(w, pid);
      const room = railCarryMax(w) - a.carry - a.stone - a.rails;
      if (holding || a.foot > 0 || room <= 0 || !forge(w).rack) continue;
      const offered = forgeRailsOffered(line2Active(w), line2Trains(w), shed(w).cradleRails, a.rails);
      seen[offered ? 'offered' : 'hidden']++;
      // Station 6 before trains: neither offers any (its kit comes by train, from this rack).
      if (trainOwed(line2Active(w), line2Trains(w))) seen.owed++;
      assert.equal(offered, act(s, pid, 'rail.forgeTake') > 0, `${name} ${pid}`);
    }
  };
  // The train stages cover a Q station still taking rails (Q5, Q6); the Works stages the time after Q6.
  const stages: [string, () => Seed][] = [
    ...TRAIN_STAGES.map((k): [string, () => Seed] => [k, () => railwayAtTrains(k)]),
    ...WORKS_STAGES.map((k): [string, () => Seed] => [k, () => railwayAtWorks(k)]),
  ];
  for (const [name, make] of stages) {
    const s = make();
    for (let guard = 0; forge(s.w).rack < 4 && forge(s.w).lit >= 0 && guard < 400; guard++) advance(s, 1);
    check(name, s);
  }
  // After Q6: the eight the cradle needs on your back, then on the cradle with its footings still to set.
  const s = railwayAtWorks('stall-done');
  while (forge(s.w).rack < WORKS.cradleRails * 2) advanceWorks(s, 1);
  assert.equal(act(s, 'b', 'rail.forgeTake'), WORKS.cradleRails);
  check('b carries the eight', s);
  assert.equal(act(s, 'b', 'rail.cradle'), WORKS.cradleRails);
  assert.ok(shed(s.w).fitted >= 0, 'eight rails fit it: it takes no footings');
  check('cradle fitted', s);
  assert.ok(seen.offered > 0 && seen.hidden > 0 && seen.owed > 0, JSON.stringify(seen));
});
test('ready only after fitted and turned; the table holds while the wagon rolls out and waits', () => {
  const s = railwayAtWorks('stall-done'),
    w = s.w;
  const coupled = () => trains(w).some((r) => r.wagon);
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: 0 }), 0, 'not before the fit');
  assert.equal(act(s, 'a', 'rail.footSet', { site: 1 }), 0, 'the cradle takes no footings');
  while (forge(w).rack < WORKS.cradleRails) advanceWorks(s, 1);
  act(s, 'b', 'rail.forgeTake');
  assert.equal(act(s, 'b', 'rail.cradle'), WORKS.cradleRails);
  assert.deepEqual([shed(w).fitted, shed(w).ready], [s.t, -1], 'fitted; the table still faces the stall');
  // The one turn rolls the wagon out; every line 2 train comes back to its village end anyway (v26: end to end).
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: 0 }), 1);
  assert.equal(shed(w).ready, s.t + WORKS.rollTicks);
  const due = shed(w).ready;
  assert.equal(act(s, 'b', 'rail.turn', { to: 0, revision: 1 }), 0, 'no turning back while it rolls out');
  assert.deepEqual([shed(w).table, shed(w).tableRev, shed(w).ready], [1, 1, due]);
  advanceWorks(s, WORKS.rollTicks + 1);
  if (!coupled()) {
    assert.equal(act(s, 'b', 'rail.turn', { to: 0, revision: 1 }), 0, 'nor while it waits for its train');
    assert.equal(shed(w).ready, due);
  }
  for (let guard = 0; !coupled(); guard++) {
    assert.ok(guard < 4000);
    advanceWorks(s, 1);
    assert.ok(coupled() ? s.t >= shed(w).ready : true);
  }
  const ready = shed(w).ready;
  assert.equal(act(s, 'a', 'rail.turn', { to: 0, revision: 1 }), 0, 'after coupling the table is never turned again');
  assert.deepEqual([coupled(), shed(w).ready, shed(w).table, shed(w).tableRev], [true, ready, 1, 1]);
  assert.equal(worksStage(w), 'wagon');
  assert.equal(invariant(w), null);
});
// Home's layout B (docs/plans/home-station.md, design review finding 8): the shunt reverses on road 2's buffer stub,
// over the cart's forge stop. That is safe only while the cart rests at the camp through the whole roll-out.
test('the cart rests at the camp, serving nothing, from the cradle fitted until the wagon has coupled and settled', () => {
  const s = railwayAtWorks('cradle-fitted'),
    w = s.w;
  const atCamp = () => {
    const c = cart(w);
    assert.equal(line2CartStatus(w), 'off');
    assert.ok(c.phase === CART_PHASE.REST || c.phase === CART_PHASE.LOAD, `cart phase ${c.phase}`);
    assert.equal(cartAlong(c, s.t), 0);
  };
  atCamp();
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: shed(w).tableRev }), 1);
  for (let guard = 0; !trains(w).some((r) => r.wagon); guard++) {
    assert.ok(guard < 4000, 'the wagon couples');
    atCamp();
    advanceWorks(s, 1);
  }
  for (let t = 0; t < WORKS.rollTicks; t++, advanceWorks(s, 1)) atCamp();
});
test('a dropped footing is a pile; it recovers to the Works rack', () => {
  const s = railwayAtWorks('works-lit'),
    w = s.w;
  assert.equal(act(s, 'a', 'rail.footTake', { rack: 0 }), 1);
  const at = { x: 109000, y: 2400, z: 5200 };
  assert.equal(act(s, 'a', 'rail.drop', { ...at, n: 2, kind: 3 }), 0, 'one footing at a time');
  assert.equal(act(s, 'a', 'rail.drop', { ...at, n: 1, kind: 0 }), 0, 'a footing is not a log');
  assert.equal(act(s, 'a', 'rail.drop', { ...at, n: 1, kind: 3 }), 1);
  const pile = pilesOf(w, 3)[0]!;
  assert.equal(pile.n, 1);
  assert.equal(account(w, 'a')!.foot, 0);
  // Taken back up like any pile, onto an empty back only.
  chop(s, 'b', 1);
  assert.equal(act(s, 'b', 'rail.take', { id: pile.id, kind: 3 }), 0);
  assert.equal(act(s, 'a', 'rail.take', { id: pile.id, kind: 0 }), 0);
  assert.equal(act(s, 'a', 'rail.take', { id: pile.id, kind: 3 }), 1);
  assert.equal(account(w, 'a')!.foot, 1);
  assert.equal(act(s, 'a', 'rail.drop', { ...at, n: 1, kind: 3 }), 1);
  assert.equal(act(s, 'a', 'rail.footTake', { rack: 0 }), 1);
  assert.equal(act(s, 'a', 'rail.drop', { ...at, n: 1, kind: 3 }), 1, 'a second footing is a second pile');
  assert.equal(pilesOf(w, 3).length, 2);
  const id = pilesOf(w, 3)[0]!.id;
  const rack = works(w).rack;
  railSupplyPulse(w, { marker: 100, grow: '', recover: [] });
  railSupplyPulse(w, { marker: 121, grow: '', recover: [id] });
  assert.equal(works(w).rack, rack + 1);
  assert.equal(pilesOf(w, 3).length, 1);
  assert.equal(footingTotal(w), works(w).poured);
  assert.equal(invariant(w), null);
});
test("a leaver's footing goes back to the Works rack, so the crossing still finishes", () => {
  const s = railwayAtWorks('wagon-on'),
    w = s.w;
  // B shoulders one footing and leaves; the kiln casts exactly what the sites need.
  assert.equal(act(s, 'b', 'rail.footTake', { rack: 0 }), 1);
  const epoch = account(w, 'b')!.epoch;
  assert.equal(railFootRelease(w, 'b', epoch + 1), 0, 'only the session the host saw leave');
  assert.equal(railFootRelease(w, 'a', account(w, 'a')!.epoch), 0, 'nothing on that back');
  const rack = works(w).rack;
  assert.equal(railFootRelease(w, 'b', epoch), 1);
  assert.equal(account(w, 'b')!.foot, 0);
  assert.equal(works(w).rack, rack + 1);
  assert.equal(railFootRelease(w, 'b', epoch), 0, 'once');
  assert.equal(invariant(w), null);
  for (let t = 0; t < 60000 && works(w).pierSet < WORKS.pier; t++) {
    if (works(w).pierRack > 0) {
      assert.equal(act(s, 'a', 'rail.footTake', { rack: 1 }), 1);
      assert.equal(act(s, 'a', 'rail.footSet', { site: 2 }), 1);
    } else advanceWorks(s, 1);
  }
  // Since v27 the kiln pours on past the pier's twelve, for the ring's eighteen.
  assert.equal(footingTotal(w), works(w).poured);
  assert.equal(works(w).pierSet, WORKS.pier);
  assert.ok(works(w).crossing >= 0);
});

test('snapshot mid-cast keeps rack and poured', () => {
  const s = railwayAtWorks('works-lit');
  advanceWorks(s, WORKS.castTicks);
  assert.equal(act(s, 'a', 'rail.footTake', { rack: 0 }), 1);
  advanceWorks(s, 1);
  assert.equal(works(s.w).rack, WORKS.rackCap, 'room again: the next one came at once');
  assert.equal(act(s, 'a', 'rail.footSet', { site: 2 }), 1);
  assert.equal(act(s, 'a', 'rail.footTake', { rack: 0 }), 1);
  advanceWorks(s, 40);
  const copy: Seed = { w: restore(s.w), t: s.t };
  // The model's works held the Works row and its cast clock.
  const model = (w: World) => ({ ...works(w), lastCast: worksClock(w).lastCast });
  assert.deepEqual(model(copy.w), model(s.w));
  for (const x of [s, copy]) advance(x, 60);
  assert.equal(works(copy.w).poured, works(s.w).poured);
  assert.equal(hash(copy.w), hash(s.w));
});
test('malformed documents fail atomically', () => {
  const cases: [string, Parameters<typeof railwayAtWorks>[0] | 'q6-finishing', (e: World) => void][] = [
    ['lit with logs 15', 'works-lit', (e) => void (e.mut(Works, e.single(Works))!.logs = 15)],
    ['a wagon without a fitted cradle', 'works-lit', (e) => void (e.mut(Train, e.lookup(Train, 1)!)!.wagon = true)],
    ['two footings on a back', 'works-lit', (e) => void (e.mut(Account, e.lookup(Account, 'a')!)!.foot = 2)],
    ['a footing on a full back', 'works-lit', (e) => void (e.mut(Account, e.lookup(Account, 'b')!)!.foot = 1)],
    ['the pier before Q6', 'q6-finishing', (e) => void (e.mut(Works, e.single(Works))!.pierSet = 1)],
    ['a seam without the breaker', 'works-arrive', (e) => void (e.mut(Works, e.single(Works))!.seams = 2)],
  ];
  for (const [name, stage, patch] of cases) {
    const s = stage === 'q6-finishing' ? railwayAtTrains(stage) : railwayAtWorks(stage);
    if (name === 'a footing on a full back') chop(s, 'b', 1);
    const copy = restore(s.w);
    patch(copy);
    const target = createRailwayWorld(),
      before = target.hash();
    assert.throws(() => target.load(JSON.parse(JSON.stringify(copy.snapshot())), railwayCheck), /railway:/, name);
    assert.equal(target.hash(), before, name);
  }
});
test('every seeded stage loads', () => {
  for (const stage of WORKS_STAGES) {
    const s = railwayAtWorks(stage);
    assert.equal(invariant(s.w), null, stage);
    assert.equal(footingTotal(s.w), works(s.w).poured, stage);
  }
});

test("the counted stone total is every rock slot's start plus renewal, as the bot checks it", () => {
  // The production playthrough checks `counts.stone.total === RAIL_STONE + produced` (dev/look/bots/railway.ts); it
  // once used line one's 24 and failed at T3 once the Works rocks counted. Hold the counts to the validator's sum.
  assert.equal(RAIL_STONE, 8 * RAIL_ROCKS.length);
  const seeds = [
    ...TRAIN_STAGES.map((k) => [k, railwayAtTrains(k)] as const),
    ...WORKS_STAGES.map((k) => [k, railwayAtWorks(k)] as const),
  ];
  for (const [stage, s] of seeds) {
    const stone = railCounts(s.w).stone!;
    assert.equal(stone.total, RAIL_STONE + stone.produced, stage);
    assert.equal(invariant(s.w), null, stage);
  }
});

test('someone waiting on the Pier halt never starves the wagon of the quarry stop', () => {
  const s = railwayAtWorks('wagon-on'),
    w = s.w;
  // They call from the Pier halt (halt 5) after every set and while they wait, as stepping onto its deck does.
  let ticks = 0;
  for (; ticks < 60000 && works(w).pierSet < WORKS.pier; ticks++) {
    if (works(w).pierRack > 0) {
      assert.equal(act(s, 'a', 'rail.footTake', { rack: 1 }), 1);
      assert.equal(act(s, 'a', 'rail.footSet', { site: 2 }), 1);
    } else advanceWorks(s, 1);
    if (ticks % 40 === 0 && !(train(w, 1).phase === 0 && train(w, 1).at === 3)) act(s, 'a', 'rail.call', { id: 5 });
  }
  assert.equal(
    works(w).pierSet,
    WORKS.pier,
    `twelve set (stopped after ${ticks} ticks: ${JSON.stringify({ works: works(w), train: train(w, 1) })})`,
  );
  assert.ok(works(w).crossing >= 0);
});
