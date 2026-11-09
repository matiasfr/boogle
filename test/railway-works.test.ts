// Split-rock Works and the smallest Roundhouse (docs/plans/split-rock-roundhouse.md, J3g): the rules on accepted
// fixtures, every transfer one apply, every footing in one home.
import test from 'node:test';
import assert from 'node:assert/strict';
import { railwayAtTrains, TRAIN_STAGES } from './helpers/railway-trains.ts';
import { act, advance } from './helpers/railway-q2.ts';
import { advanceWorks, railwayAtWorks, WORKS_STAGES } from './helpers/railway-works.ts';
import {
  restore,
  worldOf,
  edit,
  invariant,
  railFootRelease,
  railResume,
  railSupplyPulse,
  hash,
} from './railway-live.ts';
import { railAccount, railCounts } from '../src/sim/railway.ts';
import { line2Completed, line2Rails, line2Schedule } from '../src/sim/railway-line2.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';
import { LINE2_BOILER } from '../src/sim/railway-line2-layout.ts';
import { RAIL_ROCKS, RAIL_STONE, WORKS, WORKS_BREAKER, WORKS_ROCKS } from '../src/sim/railway-works-layout.ts';
import { footingTotal, pierNeed, worksStage } from '../src/sim/railway-works.ts';
import { Account, Train, Works, createRailwayWorld, railwayCheck } from '../src/sim/railway-world.ts';
import type { World as Fixture } from './helpers/railway-q2.ts';

const chop = (w: Fixture, pid: string, n: number) => {
  while (railAccount(w.s, pid)!.carry < n) {
    const k = w.s.sources.findIndex((left) => left > 0);
    assert.ok(k >= 0);
    act(w, pid, 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false });
  }
};
const mineAll = (w: Fixture, pid: string) => {
  for (const rock of WORKS_ROCKS) while (w.s.line!.rocks[rock.id]! > 0) act(w, pid, 'rail.mine', { id: rock.id });
};

test('the breaker stands on the boiler pedestal', () => {
  assert.deepEqual(
    [WORKS_BREAKER.x, WORKS_BREAKER.y, WORKS_BREAKER.z],
    [LINE2_BOILER.x, LINE2_BOILER.y, LINE2_BOILER.z],
  );
});
test('breaker cast once when Q6 completes; one taker', () => {
  const w = railwayAtTrains('q6-finishing'),
    works = w.s.works!;
  assert.equal(works.breaker, 0);
  assert.equal(worksStage(w.s), 'dormant');
  while (line2Completed(w.s) < 6) {
    assert.equal(works.breaker, 0);
    advance(w, 1);
  }
  assert.equal(works.breaker, 1, 'cast the tick Q6 is laid');
  advance(w, 50);
  assert.equal(works.breaker, 1);
  assert.equal(act(w, 'a', 'rail.breaker'), 1);
  assert.equal(act(w, 'b', 'rail.breaker'), 0);
  assert.equal(works.breaker, 2);
  // An away credit that finishes Q6 casts it too.
  const away = railwayAtTrains('q6-finishing');
  railResume(away.s, line2Schedule(5, away.s.line2!.jobs[5]!).totalTicks, 1, away.t);
  assert.equal(line2Completed(away.s), 6);
  assert.equal(away.s.works!.breaker, 1);
  assert.equal(invariant(away.s), null);
});
test('a strike needs the breaker and is idempotent', () => {
  const w = railwayAtWorks('works-arrive'),
    works = w.s.works!;
  assert.equal(act(w, 'a', 'rail.strike', { id: 1 }), 0, 'the breaker is still on its pedestal');
  assert.equal(act(w, 'a', 'rail.breaker'), 1);
  assert.equal(act(w, 'a', 'rail.strike', { id: 2 }), 0);
  assert.equal(act(w, 'a', 'rail.strike', { id: 0 }), 1);
  assert.equal(act(w, 'b', 'rail.strike', { id: 0 }), 0, 'a repeat strike moves nothing');
  assert.equal(works.seams, 1);
  assert.equal(worksStage(w.s), 'breaker');
  assert.equal(act(w, 'b', 'rail.strike', { id: 1 }), 1);
  assert.equal(works.seams, 3);
  assert.equal(worksStage(w.s), 'open');
});
test('the kiln waits for the throat; lights once when both bills are full', () => {
  const w = railwayAtWorks('works-arrive'),
    works = w.s.works!;
  act(w, 'a', 'rail.breaker');
  act(w, 'a', 'rail.strike', { id: 0 });
  chop(w, 'a', WORKS.kilnLogs);
  assert.equal(act(w, 'a', 'rail.kiln'), 0, 'the throat is sealed');
  assert.equal(act(w, 'a', 'rail.strike', { id: 1 }), 1);
  const before = railCounts(w.s);
  assert.equal(act(w, 'a', 'rail.kiln'), WORKS.kilnLogs);
  assert.equal(railCounts(w.s).total, before.total, 'logs move, none are made or lost');
  assert.equal(works.lit, -1);
  mineAll(w, 'b');
  const stone = railCounts(w.s).stone!.total;
  assert.equal(act(w, 'b', 'rail.kiln'), WORKS.kilnStone);
  assert.equal(railCounts(w.s).stone!.total, stone);
  assert.equal(works.lit, w.t, 'lit by the op that filled the last bill');
  chop(w, 'a', 2);
  assert.equal(act(w, 'a', 'rail.kiln'), 0, 'a lit kiln takes nothing');
  assert.equal(worksStage(w.s), 'lit');
});
test('pours one footing every 80 ticks to a rack of 6, 16 in all', () => {
  const w = railwayAtWorks('works-lit'),
    works = w.s.works!;
  assert.deepEqual([works.rack, works.poured], [WORKS.rackCap, WORKS.rackCap]);
  advanceWorks(w, 300);
  assert.equal(works.poured, WORKS.rackCap, 'a full rack pours nothing');
  const pours: number[] = [],
    first = w.t;
  let at = 0;
  for (let guard = 0; works.poured < WORKS.total; guard++) {
    assert.ok(guard < 5000);
    if (works.rack > 0) {
      // Empty the rack onto the ground (a footing pile each), so the kiln keeps pouring.
      assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 1);
      assert.equal(act(w, 'a', 'rail.drop', { x: 108800 + 300 * (at++ % 8), y: 2400, z: 5000, n: 1, kind: 3 }), 1);
    }
    const poured = works.poured;
    advanceWorks(w, 1);
    if (works.poured > poured) pours.push(w.t);
  }
  assert.equal(pours.length, WORKS.total - WORKS.rackCap);
  assert.equal(pours[0], first + 1, 'the first comes as soon as the rack has room');
  for (let k = 1; k < pours.length; k++) assert.ok(pours[k]! - pours[k - 1]! >= WORKS.castTicks);
  advanceWorks(w, 400);
  assert.equal(works.poured, WORKS.total, 'sixteen in all');
  assert.equal(invariant(w.s), null);
});
test('a footing fills your back', () => {
  const w = railwayAtWorks('works-lit');
  assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 1);
  assert.equal(railAccount(w.s, 'a')!.foot, 1);
  assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 0, 'one at a time');
  const k = w.s.sources.findIndex((left) => left > 0);
  assert.equal(act(w, 'a', 'rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }), 0);
  assert.equal(act(w, 'a', 'rail.forgeTake'), 0);
  assert.equal(act(w, 'a', 'rail.rackTake'), 0);
  // A back with anything on it cannot shoulder one.
  chop(w, 'b', 1);
  assert.equal(act(w, 'b', 'rail.footTake', { rack: 0 }), 0);
  assert.equal(w.s.works!.rack, WORKS.rackCap - 1);
  assert.equal(footingTotal(w.s), w.s.works!.poured);
});
test('sites in order', () => {
  const w = railwayAtWorks('works-arrive'),
    shed = w.s.shed!;
  act(w, 'a', 'rail.breaker');
  act(w, 'a', 'rail.strike', { id: 1 });
  chop(w, 'a', WORKS.kilnLogs);
  act(w, 'a', 'rail.kiln');
  mineAll(w, 'b');
  act(w, 'b', 'rail.kiln');
  advanceWorks(w, WORKS.castTicks * 3);
  assert.equal(act(w, 'a', 'rail.footSet', { site: 0 }), 0, 'nothing on your back');
  assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 1);
  assert.equal(act(w, 'a', 'rail.footSet', { site: 0 }), 0, 'no stall before the slab');
  assert.equal(act(w, 'a', 'rail.footSet', { site: 1 }), 0, 'no cradle before the stall');
  assert.equal(act(w, 'a', 'rail.footSet', { site: 3 }), 0);
  assert.equal(act(w, 'a', 'rail.strike', { id: 0 }), 1);
  assert.equal(act(w, 'a', 'rail.footSet', { site: 0 }), 1);
  assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 1);
  assert.equal(act(w, 'a', 'rail.footSet', { site: 1 }), 0, 'the stall needs both');
  assert.equal(act(w, 'a', 'rail.footSet', { site: 0 }), 1);
  assert.equal(shed.stall, WORKS.stall);
  assert.equal(worksStage(w.s), 'stall');
  assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 1);
  assert.equal(act(w, 'a', 'rail.footSet', { site: 0 }), 0, 'the stall is full');
  assert.equal(act(w, 'a', 'rail.footSet', { site: 2 }), 1, 'Q6 is laid: the pier takes one');
  assert.equal(w.s.works!.pierSet, 1);
  assert.equal(pierNeed(w.s), WORKS.pier - 1);
  assert.equal(footingTotal(w.s), w.s.works!.poured);
});
test('fitted once; the table needs the stall; a stale revision is 0', () => {
  const lit = railwayAtWorks('works-lit');
  assert.equal(act(lit, 'a', 'rail.turn', { to: 1, revision: 0 }), 0, 'no table before the stall');
  assert.equal(act(lit, 'a', 'rail.cradle'), 0);
  const w = railwayAtWorks('stall-done'),
    shed = w.s.shed!;
  assert.equal(act(w, 'a', 'rail.turn', { to: 1, revision: 1 }), 0, 'stale');
  assert.equal(act(w, 'a', 'rail.turn', { to: 0, revision: 0 }), 0, 'already there');
  assert.equal(act(w, 'a', 'rail.turn', { to: 2, revision: 0 }), 0);
  assert.equal(act(w, 'a', 'rail.turn', { to: 1, revision: 0 }), 1);
  assert.equal(act(w, 'b', 'rail.turn', { to: 1, revision: 0 }), 0, 'a second turn on the same revision');
  assert.deepEqual([shed.table, shed.tableRev, shed.ready], [1, 1, -1], 'nothing to roll out yet');
  const fitted = railwayAtWorks('cradle-fitted');
  const at = fitted.s.shed!.fitted;
  assert.ok(at >= 0);
  assert.ok(act(fitted, 'b', 'rail.forgeTake') > 0);
  assert.equal(act(fitted, 'b', 'rail.cradle'), 0, 'a full cradle takes no more rails');
  assert.equal(fitted.s.shed!.fitted, at);
  assert.equal(line2Rails(fitted.s), fitted.s.line2!.forge.poured, 'rails on the cradle are counted');
});
test('ready only after fitted and turned; the table holds while the wagon rolls out and waits', () => {
  const w = railwayAtWorks('stall-done'),
    shed = w.s.shed!,
    train = w.s.line2!.train[1]!;
  assert.equal(act(w, 'a', 'rail.turn', { to: 1, revision: 0 }), 1);
  assert.equal(shed.ready, -1);
  // Fitting the cradle with the table already turned rolls the wagon out.
  for (let i = 0; i < WORKS.cradle; i++) {
    assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 1);
    assert.equal(act(w, 'a', 'rail.footSet', { site: 1 }), 1);
  }
  while (w.s.line2!.forge.rack < WORKS.cradleRails) advanceWorks(w, 1);
  act(w, 'b', 'rail.forgeTake');
  assert.equal(act(w, 'b', 'rail.cradle'), WORKS.cradleRails);
  assert.equal(shed.ready, w.t + WORKS.rollTicks);
  const due = shed.ready;
  assert.equal(act(w, 'b', 'rail.turn', { to: 0, revision: 1 }), 0, 'no turning back while it rolls out');
  assert.deepEqual([shed.table, shed.tableRev, shed.ready], [1, 1, due]);
  advanceWorks(w, WORKS.rollTicks + 1);
  if (!train.wagon) {
    assert.equal(act(w, 'b', 'rail.turn', { to: 0, revision: 1 }), 0, 'nor while it waits for its train');
    assert.equal(shed.ready, due);
  }
  for (let guard = 0; !train.wagon; guard++) {
    assert.ok(guard < 4000);
    advanceWorks(w, 1);
    assert.ok(train.wagon ? w.t >= shed.ready : true);
  }
  const ready = shed.ready;
  assert.equal(act(w, 'a', 'rail.turn', { to: 0, revision: 1 }), 1);
  assert.deepEqual([train.wagon, shed.ready], [true, ready], 'after coupling the table is a toy');
  assert.equal(act(w, 'a', 'rail.turn', { to: 1, revision: 2 }), 1);
  assert.deepEqual([train.wagon, shed.ready], [true, ready]);
  assert.equal(worksStage(w.s), 'wagon');
  assert.equal(invariant(w.s), null);
});
test('a dropped footing is a pile; it recovers to the Works rack', () => {
  const w = railwayAtWorks('works-lit'),
    works = w.s.works!;
  assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 1);
  const at = { x: 109000, y: 2400, z: 5200 };
  assert.equal(act(w, 'a', 'rail.drop', { ...at, n: 2, kind: 3 }), 0, 'one footing at a time');
  assert.equal(act(w, 'a', 'rail.drop', { ...at, n: 1, kind: 0 }), 0, 'a footing is not a log');
  assert.equal(act(w, 'a', 'rail.drop', { ...at, n: 1, kind: 3 }), 1);
  const pile = w.s.piles.find((p) => p.kind === 3)!;
  assert.equal(pile.n, 1);
  assert.equal(railAccount(w.s, 'a')!.foot, 0);
  // Taken back up like any pile, onto an empty back only.
  chop(w, 'b', 1);
  assert.equal(act(w, 'b', 'rail.take', { id: pile.id, kind: 3 }), 0);
  assert.equal(act(w, 'a', 'rail.take', { id: pile.id, kind: 0 }), 0);
  assert.equal(act(w, 'a', 'rail.take', { id: pile.id, kind: 3 }), 1);
  assert.equal(railAccount(w.s, 'a')!.foot, 1);
  assert.equal(act(w, 'a', 'rail.drop', { ...at, n: 1, kind: 3 }), 1);
  assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 1);
  assert.equal(act(w, 'a', 'rail.drop', { ...at, n: 1, kind: 3 }), 1, 'a second footing is a second pile');
  assert.equal(w.s.piles.filter((p) => p.kind === 3).length, 2);
  const id = w.s.piles.find((p) => p.kind === 3)!.id;
  const rack = works.rack;
  railSupplyPulse(w.s, { marker: 100, grow: '', recover: [] });
  railSupplyPulse(w.s, { marker: 121, grow: '', recover: [id] });
  assert.equal(works.rack, rack + 1);
  assert.equal(w.s.piles.filter((p) => p.kind === 3).length, 1);
  assert.equal(footingTotal(w.s), works.poured);
  assert.equal(invariant(w.s), null);
});
test("a leaver's footing goes back to the Works rack, so the crossing still finishes", () => {
  const w = railwayAtWorks('wagon-on'),
    works = () => w.s.works!;
  // B shoulders one footing and leaves; the kiln casts exactly the sixteen the sites need.
  assert.equal(act(w, 'b', 'rail.footTake', { rack: 0 }), 1);
  const epoch = railAccount(w.s, 'b')!.epoch;
  assert.equal(railFootRelease(w.s, 'b', epoch + 1), 0, 'only the session the host saw leave');
  assert.equal(railFootRelease(w.s, 'a', railAccount(w.s, 'a')!.epoch), 0, 'nothing on that back');
  const rack = works().rack;
  assert.equal(railFootRelease(w.s, 'b', epoch), 1);
  assert.equal(railAccount(w.s, 'b')!.foot, 0);
  assert.equal(works().rack, rack + 1);
  assert.equal(railFootRelease(w.s, 'b', epoch), 0, 'once');
  assert.equal(invariant(w.s), null);
  for (let t = 0; t < 60000 && works().pierSet < WORKS.pier; t++) {
    if (works().pierRack > 0) {
      assert.equal(act(w, 'a', 'rail.footTake', { rack: 1 }), 1);
      assert.equal(act(w, 'a', 'rail.footSet', { site: 2 }), 1);
    } else advanceWorks(w, 1);
  }
  assert.equal(works().poured, WORKS.total);
  assert.equal(works().pierSet, WORKS.pier);
  assert.ok(works().crossing >= 0);
});

test('snapshot mid-cast keeps rack and poured', () => {
  const w = railwayAtWorks('works-lit');
  advanceWorks(w, WORKS.castTicks);
  assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 1);
  advanceWorks(w, 1);
  assert.equal(w.s.works!.rack, WORKS.rackCap, 'room again: the next one came at once');
  assert.equal(act(w, 'a', 'rail.footSet', { site: 2 }), 1);
  assert.equal(act(w, 'a', 'rail.footTake', { rack: 0 }), 1);
  advanceWorks(w, 40);
  const copy = { s: restore(w.s), t: w.t };
  assert.deepEqual(copy.s.works, w.s.works);
  for (const x of [w, copy]) advance(x, 60);
  assert.equal(copy.s.works!.poured, w.s.works!.poured);
  assert.equal(hash(copy.s), hash(w.s));
});
test('malformed documents fail atomically', () => {
  const cases: [
    string,
    Parameters<typeof railwayAtWorks>[0] | 'q6-finishing',
    (e: ReturnType<typeof worldOf>) => void,
  ][] = [
    ['lit with logs 15', 'works-lit', (e) => void (e.mut(Works, e.single(Works))!.logs = 15)],
    ['a wagon without a fitted cradle', 'works-lit', (e) => void (e.mut(Train, e.lookup(Train, 1)!)!.wagon = true)],
    ['two footings on a back', 'works-lit', (e) => void (e.mut(Account, e.lookup(Account, 'a')!)!.foot = 2)],
    ['a footing on a full back', 'works-lit', (e) => void (e.mut(Account, e.lookup(Account, 'b')!)!.foot = 1)],
    ['the pier before Q6', 'q6-finishing', (e) => void (e.mut(Works, e.single(Works))!.pierSet = 1)],
    ['a seam without the breaker', 'works-arrive', (e) => void (e.mut(Works, e.single(Works))!.seams = 2)],
  ];
  for (const [name, stage, patch] of cases) {
    const w = stage === 'q6-finishing' ? railwayAtTrains(stage) : railwayAtWorks(stage);
    if (name === 'a footing on a full back') chop(w, 'b', 1);
    const copy = restore(w.s);
    edit(copy, patch);
    const target = createRailwayWorld(),
      before = target.hash();
    assert.throws(
      () => target.load(JSON.parse(JSON.stringify(worldOf(copy).snapshot())), railwayCheck),
      /railway:/,
      name,
    );
    assert.equal(target.hash(), before, name);
  }
});
test('every seeded stage loads', () => {
  for (const stage of WORKS_STAGES) {
    const w = railwayAtWorks(stage);
    assert.equal(invariant(w.s), null, stage);
    assert.equal(footingTotal(w.s), w.s.works!.poured, stage);
  }
});

test("the counted stone total is every rock slot's start plus renewal, as the bot checks it", () => {
  // The production playthrough checks `counts.stone.total === RAIL_STONE + produced` (dev/look/bots/railway.ts); it
  // once used line one's 24 and failed at T3 once the Works rocks counted. Hold the counts to the validator's sum.
  assert.equal(RAIL_STONE, 8 * RAIL_ROCKS.length);
  const fixtures = [
    ...TRAIN_STAGES.map((k) => [k, railwayAtTrains(k)] as const),
    ...WORKS_STAGES.map((k) => [k, railwayAtWorks(k)] as const),
  ];
  for (const [stage, w] of fixtures) {
    const stone = railCounts(w.s).stone!;
    assert.equal(stone.total, RAIL_STONE + stone.produced, stage);
    assert.equal(invariant(w.s), null, stage);
  }
});
