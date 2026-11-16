// Independent review of B1 (docs/plans/town-economy-visible.md): money conservation across every priced plot, and
// what the town view's reader (src/entities/town/town-read.ts) shows after a buy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailwayWorld, Till, Town, Yard } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { railApply, railTick } from '../src/sim/railway-systems.ts';
import { account, plot, till, town, type ReadWorld } from '../src/sim/railway-rows.ts';
import { plotPrice, plotsStaked } from '../src/sim/railway-queries-trade.ts';
import { TRADE } from '../src/sim/railway-trade-layout.ts';
import { townHas } from '../src/sim/town-facts.ts';
import { townLookOf } from '../src/entities/town/town-read.ts';
import type { World } from '../src/ecs/index.ts';

const copy = (w: World) => {
  const out = createRailwayWorld();
  out.load(JSON.parse(JSON.stringify(w.snapshot())), railwayCheck);
  return out;
};
const READY = buildSeedWorld('house-ready');
const BUILT = buildSeedWorld('house-built');
const buy = (w: World, tick: number, id: number, pid = 'a', pct = 50) => {
  const a = account(w, pid)!;
  return railApply(w, pid, { op: 'rail.buy', id, epoch: a.epoch, request: a.request + 1 }, tick, undefined, pct).status;
};
/** Conserved supply: freight counted as made at its yard and delivered to the town; money as landed fares. */
function supply(w: World, wood: number, stone: number, boogles: number) {
  const t = w.mut(Town, w.lookup(Town, 0)!)!;
  t.wood += wood;
  t.stone += stone;
  w.mut(Yard, w.lookup(Yard, 0)!)!.made += wood;
  w.mut(Yard, w.lookup(Yard, 1)!)!.made += stone;
  const b = w.mut(Till, w.single(Till))!;
  b.boogles += boogles;
  b.landed += boogles;
}

test('review: all three plots, bought one by one, cost 150, 800 and 6,000; spent is their sum through a reload', () => {
  const w = copy(READY.w);
  supply(w, Math.max(0, 40 - town(w, 0).wood), Math.max(0, 16 - town(w, 0).stone), 10000);
  const start = till(w).boogles;
  const paid: number[] = [];
  for (const k of [0, 1, 2]) {
    assert.ok(plotsStaked(w, 0).includes(k), `plot ${k} staked once the one before it is bought`);
    const price = plotPrice(w, 0, k, 50);
    assert.equal(buy(w, READY.t, k), 'accepted', `plot ${k}`);
    paid.push(plot(w, k).paid);
    assert.equal(plot(w, k).paid, price);
  }
  assert.deepEqual(paid, [150, 800, 6000]);
  assert.deepEqual(plotsStaked(w, 0), [], 'nothing left on offer');
  assert.equal(till(w).spent, 6950);
  assert.equal(till(w).boogles, start - 6950);
  for (const p of paid) assert.ok(Number.isInteger(p));
  const back = createRailwayWorld();
  back.load(JSON.parse(JSON.stringify(w.snapshot())), (x) => railwayCheck(x, READY.t));
  for (let t = READY.t + 1; t <= READY.t + TRADE.buildTicks + 600; t++) railTick(back, t);
  railwayCheck(back, READY.t + TRADE.buildTicks + 600);
  assert.equal(till(back).spent, 6950);
});

test('review: two players buying different plots in one tick with money for one spend once', () => {
  const w = copy(READY.w);
  assert.deepEqual(plotsStaked(w, 0), [0, 1]);
  // 450 holds plot 2 (400) or plot 1 (150), and after either the other doubles past what is left.
  const b = w.mut(Till, w.single(Till))!;
  const extra = 450 - b.boogles;
  b.boogles += extra;
  b.landed += extra;
  assert.equal(buy(w, READY.t, 1, 'a'), 'accepted');
  assert.equal(buy(w, READY.t, 0, 'b'), 'rejected', 'plot 1 now costs 300 and the box holds 50');
  assert.deepEqual([till(w).boogles, till(w).spent], [50, 400]);
  railwayCheck(w, READY.t);
});

// The town view's reader on the shared railway after a buy. On main (and on this branch: the plan's B1 bullet asked
// town-read.ts to pass the tick, the author left it to B2) the reader caches staking by deliveries only and reads the
// facts with no tick. These fail until B2 fixes them; they say exactly what the view gets wrong.
test('review: after a buy the town look stops showing the bought plot as staked (cache keyed on wood and stone)', () => {
  const w = copy(READY.w);
  const before = townLookOf(w as unknown as ReadWorld, READY.t);
  assert.deepEqual(before.plots.staked, [0, 1]);
  assert.equal(buy(w, READY.t, 0), 'accepted');
  const after = townLookOf(w as unknown as ReadWorld, READY.t, undefined, before.plots);
  assert.deepEqual(after.plots.staked, plotsStaked(w, 0), 'the look agrees with the rule after a buy');
});

test('review: at house-built the town look reports the town fact (facts read with the mirror tick)', () => {
  const look = townLookOf(BUILT.w as unknown as ReadWorld, BUILT.t);
  assert.equal(townHas(look.facts, 'town'), true, 'the first house is built at this seed');
});
