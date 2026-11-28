// Slice 5's town economy, the lockstep rules (docs/plans/slice5-town-economy.md; src/sim/railway-sys-trade.ts,
// railway-queries-trade.ts, railway-check-trade.ts). R1: the Camp's timber yard and the Quarry's stone yard make
// crates while the trains run, and the trains carry them home to the Village. Determinism, conservation, the caps, no
// freight stop before the pier's footings (a train loads where it already stands), the first timber home, the save
// round trip and the trade check's refusals; R2: the yards' away credit, once per marker, and the plots staked from
// deliveries; R2b: the Quarry's full-load stone stop after the footings, its exemptions and the wagon's drift; R3:
// riders and fares (once a rider a trip), the one strongbox's cap and lost, no replay, the moving far end, the
// tunables, determinism and the check's refusals.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import {
  Aperture,
  createRailwayWorld,
  RAIL_REPLICATED,
  Forge,
  ForgeClock,
  QJob,
  Plot,
  Till,
  Town,
  Train,
  Works,
  Yard,
  YardClock,
} from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { okTune, TUNABLES } from '../src/sim/tune.ts';
import { checkTrade } from '../src/sim/railway-check-trade.ts';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { railApply, railTick } from '../src/sim/railway-systems.ts';
import { account, plot, rail, town, townClock, train, trains, yard, yards } from '../src/sim/railway-rows.ts';
import {
  boxCap,
  sackCap,
  dearestOnOffer,
  plotPrice,
  plotBuilt,
  plotSlot,
  housesOf,
  fareOf,
  freightAboard,
  freightStop,
  plotsStaked,
  plotsStakedOf,
  routeFar,
  tillRate,
} from '../src/sim/railway-queries-trade.ts';
import { footingsOwed, kitOwed, wagonSlot, worksId } from '../src/sim/railway-queries.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import { LINE2_STATIONS, Q7 } from '../src/sim/railway-line2-layout.ts';
import { RAILWAY_MAX_INT } from '../src/sim/railway.ts';
import { railResume } from '../src/sim/railway-sys-away.ts';
import { RAIL_AWAY, railAwayCredit } from '../src/sim/railway-away.ts';
import { TOWN_PLOTS, townPlotBoard } from '../src/place/town-plan.ts';
import { TRADE, TRADE_PCT } from '../src/sim/railway-trade-layout.ts';
import { LINE2, RAIL_HALTS, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { TRAIN_PHASE, trainAlong } from '../src/sim/railway-train.ts';
import { cycleTicks } from '../src/sim/railway-trains.ts';
import { act, advance } from '../src/sim/railway-seed-route.ts';
import { stopsOf } from '../src/sim/railway-queries.ts';
import { worldVerdict } from './helpers/railway-check.ts';
import { serverWorld } from './helpers/server-world.ts';
import { HALL, TILL } from '../src/place/home-station.ts';
import { railValid, type Actor } from '../src/world/railway-server.ts';
import { intentOf, railwayActs } from '../src/adapters/railway-intents.ts';
import { tradeTick } from '../src/sim/railway-sys-trade.ts';

/** A plain (unaudited) copy of a world through JSON, as the server holds a save. */
const copy = (w: World) => {
  const out = createRailwayWorld();
  out.load(JSON.parse(JSON.stringify(w.snapshot())));
  return out;
};
// Built at module scope, outside the test timeout (as the golden shards do).
const ON = buildSeedWorld('trains-on');
const FREIGHT = buildSeedWorld('freight-running');
/** Woken, the trains still asleep. */
const ASLEEP = buildSeedWorld('awake');
/** The footing wagon running (a later stage for the per-tick world check). */
const WAGON = buildSeedWorld('wagon-on');
/** The pier's twelve footings set (R2b's stone stop is on). */
const CROSSED = buildSeedWorld('crossing-done');
/** Q7 laid, the ring's footings owed: the stone stop is off. */
const DECK = buildSeedWorld('deck-laid');
/** The ring's bents footed, then the leaf raised: footings (the counterweight's) still owed. */
const GAP = buildSeedWorld('gap-footed');
const LEAF = buildSeedWorld('leaf-raised');
const MIN20 = 20 * 600;
const [CAMP, QUARRY] = [0, 1];
const LINE1_SLOT = RAIL_TRAINS.findIndex((t) => t.line === 0);
const LINE2_SLOTS = RAIL_TRAINS.flatMap((t, k) => (t.line === LINE2 ? [k] : []));
/** Writes on a copy for the refusal tests (a hostile or corrupt save). */
const yardId = (w: World, slot: number) => w.lookup(Yard, slot)!;
const tillRow = (w: World) => w.get(Till, w.single(Till))!;

for (const [town, slot, first, beforeStage, stage] of [
  [2, 32, 8, 'ring-joined', 'gorge-reached'],
  [3, 48, 10, 'gorge-reached', 'canopy-reached'],
] as const)
  test('arrival stakes slot ' + slot + ' and each completed choice feeds only the far queue', () => {
    const early = buildSeedWorld(beforeStage);
    assert.deepEqual(plotsStaked(early.w, town), []);
    assert.equal(act(early, 'a', 'rail.buy', { id: slot, kind: first }), 0);
    for (const kind of [first, first + 1]) {
      const seed = buildSeedWorld(stage);
      const before = tillRow(seed.w).boogles;
      const actor: Actor = { reach: () => false, height: () => true, cadence: () => true };
      assert.equal(railValid(seed.w, { op: 'rail.buy', id: slot, kind, epoch: 1, request: 1 }, actor), false);
      assert.deepEqual(plotsStaked(seed.w, town), [0]);
      for (const invalid of Array.from({ length: 12 }, (_, k) => k).filter((k) => k !== first && k !== first + 1))
        assert.equal(act(seed, 'a', 'rail.buy', { id: slot, kind: invalid }), 0);
      assert.equal(act(seed, 'a', 'rail.buy', { id: slot, kind }), 1);
      assert.equal(act(seed, 'b', 'rail.buy', { id: slot, kind: 2 * first + 1 - kind }), 0);
      assert.equal(tillRow(seed.w).boogles, before - 150);
      assert.equal(copy(seed.w).get(Plot, seed.w.lookup(Plot, slot)!)!.kind, kind);
      const at = seed.t + TRADE.buildTicks;
      assert.equal(tillRate(seed.w, TRADE_PCT, at) - tillRate(seed.w, TRADE_PCT, at - 1), fareOf(seed.w, 0));
      const queues = seed.w.mut(Town, seed.w.lookup(Town, 0)!)!;
      queues.wait0 = queues.wait1 = 0;
      for (let i = 0; i < 600; i++) seed.w.run(tradeTick, { tick: at + i, headPct: 100, ...TRADE_PCT });
      assert.equal(queues.wait1 - queues.wait0, 1);
    }
  });

test('Ring joins before staking; a completed Ring plot sends its extra rider to the far queue only', () => {
  const before = { w: copy(LEAF.w), t: LEAF.t };
  assert.deepEqual(plotsStaked(before.w, 1), []);
  assert.equal(act(before, 'a', 'rail.buy', { id: 16, kind: 6 }), 0);
  const seed = buildSeedWorld('ring-joined');
  assert.deepEqual(plotsStaked(seed.w, 1), [0]);
  assert.equal(act(seed, 'a', 'rail.buy', { id: 16, kind: 6 }), 1);
  const at = seed.t + TRADE.buildTicks;
  assert.equal(tillRate(seed.w, TRADE_PCT, at) - tillRate(seed.w, TRADE_PCT, at - 1), fareOf(seed.w, 0));
  const queues = seed.w.mut(Town, seed.w.lookup(Town, 0)!)!;
  queues.wait0 = queues.wait1 = 0;
  for (let i = 0; i < 600; i++) seed.w.run(tradeTick, { tick: at + i, headPct: 100, ...TRADE_PCT });
  assert.deepEqual([queues.wait0, queues.wait1], [2, 3]);
  seed.w.mut(Plot, seed.w.lookup(Plot, 16)!)!.at = 0;
  assert.throws(() => checkTrade(seed.w, at), /plot before arrival/);
});

test('a fresh railway starts with both yards full, nothing aboard or delivered, an empty strongbox and nobody waiting', () => {
  const w = createRailwayWorld();
  assert.deepEqual(
    yards(w).map((y) => [y.stock, y.made]),
    TRADE.yards.map((y) => [y.cap, y.cap]),
  );
  assert.deepEqual(
    trains(w).map((r) => r.freight),
    RAIL_TRAINS.map(() => 0),
  );
  assert.deepEqual([town(w, 0).wood, town(w, 0).stone], [0, 0]);
  assert.deepEqual({ ...tillRow(w) }, { boogles: 0, landed: 0, lost: 0, spent: 0, sack: 0, poured: 0 });
  const t = town(w, 0);
  assert.deepEqual([townClock(w, 0).acc, t.wait0, t.wait1, t.boarded, t.alighted], [0, 0, 0, 0, 0]);
  assert.ok(trains(w).every((r) => r.riders === 0));
  assert.equal(worldVerdict(w), null);
});

test('nothing is made or moved while the trains sleep', () => {
  const w = copy(ASLEEP.w);
  assert.ok(rail(w).trains < 0);
  for (let t = 1; t <= 600; t++) railTick(w, 5000 + t);
  assert.deepEqual(
    yards(w).map((y) => [y.stock, y.made]),
    TRADE.yards.map((y) => [y.cap, y.cap]),
  );
});

test('two worlds driven alike stay equal row for row; the yard invariant holds every tick for 20 minutes', () => {
  const a = copy(ON.w),
    b = copy(ON.w);
  const made = yards(a).map((y) => y.made),
    lastAt = made.map(() => -1);
  for (let t = ON.t + 1; t <= ON.t + MIN20; t++) {
    railTick(a, t);
    railTick(b, t);
    if (t % 100 === 0) assert.equal(a.hash(), b.hash(), `tick ${t}`);
    checkTrade(a);
    yards(a).forEach((y, slot) => {
      assert.ok(y.stock <= TRADE.yards[slot]!.cap, `yard ${slot} past its cap at ${t}`);
      assert.equal(y.made, y.stock + freightAboard(a, slot) + town(a, 0)[TRADE.yards[slot]!.goods]);
      if (y.made === made[slot]) return;
      // One crate at a time, never sooner than its interval after the last.
      assert.equal(y.made, made[slot]! + 1, `yard ${slot} at ${t}`);
      if (lastAt[slot]! >= 0) assert.ok(t - lastAt[slot]! >= TRADE.yards[slot]!.everyTicks, `yard ${slot} at ${t}`);
      made[slot] = y.made;
      lastAt[slot] = t;
    });
    if (t % 600 === 0) railwayCheck(a);
  }
  assert.deepEqual(a.snapshot(), b.snapshot());
  // Camp timber keeps coming home. No train starts at the Quarry now, so its stone waits for an asked stop.
  assert.ok(yard(a, CAMP).made > TRADE.yards[CAMP]!.cap + 4, 'the Camp made');
  assert.ok(town(a, 0).wood > TRADE.freightCap);
  assert.equal(town(a, 0).stone, 0, 'the opening train starts at the Village, not the Quarry');
  assert.deepEqual([yard(a, QUARRY).stock, yard(a, QUARRY).made], [TRADE.yards[QUARRY]!.cap, TRADE.yards[QUARRY]!.cap]);
});

test('the first line 1 arrival home delivers a full load of 8', () => {
  const w = copy(ON.w);
  assert.equal(town(w, 0).wood, 0);
  assert.equal(train(w, LINE1_SLOT).freight, TRADE.freightCap, 'loaded at the Camp as it woke');
  for (let t = ON.t + 1; t <= ON.t + 3000; t++) {
    railTick(w, t);
    const r = train(w, LINE1_SLOT);
    if (r.phase === TRAIN_PHASE.STAND && r.at === 0) {
      assert.equal(town(w, 0).wood, 8);
      assert.equal(r.freight, 0);
      return;
    }
    assert.equal(town(w, 0).wood, 0, `timber delivered before the arrival, tick ${t}`);
  }
  assert.fail('line 1 never came home');
});

test("before the pier's footings freight adds no stop: with nothing asked, line 2 trains stand only at the ends for 20 minutes", () => {
  const w = copy(ON.w),
    n = stopsOf(w, LINE2).length;
  let arrivals = 0;
  for (let t = ON.t + 1; t <= ON.t + MIN20; t++) {
    const was = LINE2_SLOTS.map((k) => train(w, k).phase);
    railTick(w, t);
    LINE2_SLOTS.forEach((k, i) => {
      const r = train(w, k);
      if (was[i] !== TRAIN_PHASE.RUN || r.phase !== TRAIN_PHASE.STAND || r.at < 0) return;
      arrivals++;
      assert.ok(r.at === 0 || r.at === n - 1, `train ${k} stopped at halt ${r.at}, tick ${t}`);
    });
  }
  assert.ok(arrivals >= 6, `${arrivals} arrivals`);
  // The Quarry's yard fills to its cap and waits: no train calls for it.
  assert.equal(yard(w, QUARRY).stock, TRADE.yards[QUARRY]!.cap);
});

test('a train standing at the Quarry for another reason (a lever ask homeward) loads what it has room for', () => {
  const s = { w: copy(ON.w), t: ON.t },
    q = TRADE.yards[QUARRY]!;
  advance(s, q.cap * q.everyTicks);
  assert.equal(yard(s.w, QUARRY).stock, q.cap);
  const halt = RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === q.stop);
  assert.equal(act(s, 'a', 'rail.call', { id: halt, dir: -1 }), 1);
  for (let i = 0; i < 3000; i++) {
    const was = LINE2_SLOTS.map((k) => [train(s.w, k).phase, train(s.w, k).freight] as const);
    advance(s, 1);
    for (const [j, k] of LINE2_SLOTS.entries()) {
      const r = train(s.w, k);
      if (was[j]![0] !== TRAIN_PHASE.RUN || r.phase !== TRAIN_PHASE.STAND || r.at !== q.stop) continue;
      assert.equal(r.track, 1, 'homeward');
      assert.equal(r.freight, Math.min(TRADE.freightCap, was[j]![1] + q.cap));
      assert.equal(yard(s.w, QUARRY).stock, q.cap - (r.freight - was[j]![1]));
      checkTrade(s.w);
      return;
    }
  }
  assert.fail('no train stopped at the Quarry for the ask');
});

test('a train standing at a yard heading home loads whatever it stopped for, up to its room', () => {
  // Line 1 starts at its yard, so loading while standing does not need a freight service stop.
  assert.equal(train(ON.w, LINE1_SLOT).freight, TRADE.freightCap);
  // A crate made while it stands is taken the tick it is made.
  const w = copy(ON.w),
    id = yardId(w, CAMP);
  w.mut(Train, w.lookup(Train, LINE1_SLOT)!)!.freight = 0;
  w.mut(Yard, id)!.stock = TRADE.yards[CAMP]!.cap;
  checkTrade(w);
  railTick(w, ON.t + 1);
  assert.equal(train(w, LINE1_SLOT).freight, TRADE.freightCap);
  assert.equal(yard(w, CAMP).stock, 0);
});

test('a crate yardTick makes while a train stands at the yard is loaded the same tick', () => {
  const w = copy(ON.w),
    id = yardId(w, CAMP),
    c = TRADE.yards[CAMP]!,
    t = ON.t + 1;
  assert.equal(train(w, LINE1_SLOT).phase, TRAIN_PHASE.STAND);
  // Room for one more and an empty yard whose next crate is due this tick (made lowered with the freight taken off).
  const r = w.mut(Train, w.lookup(Train, LINE1_SLOT)!)!;
  r.freight -= 1;
  w.mut(Yard, id)!.made -= 1;
  w.mut(YardClock, id)!.last = t - c.everyTicks;
  checkTrade(w);
  assert.equal(yard(w, CAMP).stock, 0);
  railTick(w, t);
  assert.equal(train(w, LINE1_SLOT).freight, TRADE.freightCap);
  assert.deepEqual([yard(w, CAMP).stock, yard(w, CAMP).made], [0, c.cap]);
  checkTrade(w);
});

test('an up train standing at the Quarry does not load', () => {
  const s = { w: copy(ON.w), t: ON.t },
    q = TRADE.yards[QUARRY]!;
  advance(s, q.cap * q.everyTicks);
  const halt = RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === q.stop);
  assert.equal(act(s, 'a', 'rail.call', { id: halt, dir: 1 }), 1);
  for (let i = 0; i < 3000; i++) {
    const was = LINE2_SLOTS.map((k) => train(s.w, k).phase);
    advance(s, 1);
    for (const [j, k] of LINE2_SLOTS.entries()) {
      const r = train(s.w, k);
      if (was[j] !== TRAIN_PHASE.RUN || r.phase !== TRAIN_PHASE.STAND || r.at !== q.stop) continue;
      assert.equal(r.track, 0, 'outward');
      const before = r.freight;
      assert.ok(before < TRADE.freightCap, 'it has room');
      advance(s, 1); // still standing: its dwell
      assert.equal(train(s.w, k).freight, before);
      assert.equal(yard(s.w, QUARRY).stock, q.cap);
      return;
    }
  }
  assert.fail('no train stopped at the Quarry for the ask');
});

test('a yard clock saved in the future restarts from now instead of freezing the yard', () => {
  const w = copy(ON.w),
    id = yardId(w, CAMP),
    c = TRADE.yards[CAMP]!;
  w.mut(YardClock, id)!.last = ON.t + 100000;
  const made = yard(w, CAMP).made;
  railTick(w, ON.t + 1);
  assert.equal(w.get(YardClock, id)!.last, ON.t + 1);
  for (let t = ON.t + 2; t <= ON.t + 1 + c.everyTicks; t++) railTick(w, t);
  assert.equal(yard(w, CAMP).made, made + 1, 'one crate, one interval later');
});

test('a snapshot save and load round-trips the yards, the towns and the freight', () => {
  const w = copy(FREIGHT.w);
  for (let t = FREIGHT.t + 1; t <= FREIGHT.t + 900; t++) railTick(w, t);
  const back = createRailwayWorld();
  back.load(JSON.parse(JSON.stringify(w.snapshot())), railwayCheck);
  assert.equal(back.hash(), w.hash());
  assert.deepEqual(yards(back), yards(w));
  assert.deepEqual(town(back, 0), town(w, 0));
  assert.deepEqual(
    trains(back).map((r) => r.freight),
    trains(w).map((r) => r.freight),
  );
  for (let t = FREIGHT.t + 901; t <= FREIGHT.t + 1500; t++) {
    railTick(w, t);
    railTick(back, t);
  }
  assert.equal(back.hash(), w.hash());
});

test('the trade check refuses a corrupt or hostile save, each with its message', () => {
  const verdict = (base: World, edit: (w: World) => void) => {
    const w = base.clone();
    edit(w);
    return worldVerdict(w);
  };
  const on = copy(ON.w);
  const yardRow = (w: World, slot: number) => w.mut(Yard, yardId(w, slot))!;
  assert.equal(
    verdict(on, (w) => {
      yardRow(w, CAMP).stock = TRADE.yards[CAMP]!.cap + 1;
      yardRow(w, CAMP).made += 1;
    }),
    'railway: trade bounds',
    'a yard past its cap',
  );
  assert.equal(
    verdict(on, (w) => (yardRow(w, CAMP).stock = -1)),
    'railway: trade bounds',
  );
  assert.equal(
    verdict(on, (w) => (w.mut(YardClock, yardId(w, QUARRY))!.last = -1)),
    'railway: trade bounds',
  );
  assert.equal(
    verdict(on, (w) => (w.mut(Train, w.lookup(Train, LINE1_SLOT)!)!.freight = TRADE.freightCap + 1)),
    'railway: trade bounds',
  );
  assert.equal(
    verdict(on, (w) => (w.mut(Town, w.lookup(Town, 0)!)!.wood = -1)),
    'railway: trade bounds',
  );
  assert.equal(
    verdict(on, (w) => (yardRow(w, QUARRY).made += 1)),
    'railway: freight conservation',
  );
  assert.equal(
    verdict(on, (w) => (w.mut(Town, w.lookup(Town, 0)!)!.stone += 1)),
    'railway: freight conservation',
  );
});

// ---------------------------------------------------------------- R2: the away credit and the staked plots
/** The host's one credit for `away` ticks (world-host.ts credit()): the job's ticks, the marker, the yards' ticks. */
const resumeAway = (w: World, away: number, marker: number, tick: number) =>
  railResume(w, away >= RAIL_AWAY.finishTicks ? Number.MAX_SAFE_INTEGER : away, marker, tick, railAwayCredit(away));

test('10 minutes, 8 hours and 3 days away each fill both yards to their cap, never past it', () => {
  for (const away of [10 * 600, 8 * 36000, 3 * 24 * 36000]) {
    // freight-running with both yards part-empty: the Camp at 0 (line 1 took it), the Quarry drained to 0 as well.
    const w = copy(FREIGHT.w),
      tick = FREIGHT.t + 1;
    const q = w.mut(Yard, yardId(w, QUARRY))!;
    q.made -= q.stock;
    q.stock = 0;
    const before = yards(w).map((y) => ({ ...y }));
    resumeAway(w, away, 1_000_000, tick);
    railwayCheck(w);
    yards(w).forEach((y, slot) => {
      const c = TRADE.yards[slot]!;
      assert.equal(y.stock, c.cap, `${away}: yard ${slot} full, at its cap`);
      assert.equal(y.made, before[slot]!.made + c.cap - before[slot]!.stock, `${away}: made grows with it`);
      assert.equal(w.get(YardClock, yardId(w, slot))!.last, tick, 'the clock moves to the join');
    });
    // Nothing runs while away: no train moved freight.
    assert.deepEqual(
      trains(w).map((r) => r.freight),
      trains(FREIGHT.w).map((r) => r.freight),
    );
    assert.deepEqual(town(w, 0), town(FREIGHT.w, 0));
  }
  // Ten minutes: the Camp makes 1 every 15 s, the Quarry 1 every 30 s; the credit (9.6 min) fills both.
  assert.ok(Math.floor(railAwayCredit(6000) / TRADE.yards[QUARRY]!.everyTicks) >= TRADE.yards[QUARRY]!.cap);
});

test('a short absence credits only its whole intervals, and a second resume at the same marker adds nothing', () => {
  const w = copy(FREIGHT.w),
    tick = FREIGHT.t + 1,
    camp = TRADE.yards[CAMP]!;
  const stock = yard(w, CAMP).stock;
  assert.ok(stock + 2 < camp.cap);
  // 2.5 intervals away: two crates (the credit of so short an absence is nearly the whole absence).
  const away = Math.floor(camp.everyTicks * 2.5);
  assert.equal(Math.floor(railAwayCredit(away) / camp.everyTicks), 2);
  resumeAway(w, away, 777, tick);
  assert.equal(yard(w, CAMP).stock, stock + 2);
  const after = JSON.stringify(w.snapshot());
  resumeAway(w, away, 777, tick + 5);
  resumeAway(w, 8 * 36000, 776, tick + 5); // an older marker
  assert.equal(JSON.stringify(w.snapshot()), after, 'the same or an older marker changes nothing');
  // A save and a load (or a late joiner's whole state) carries the marker: the credit is never applied again.
  const back = createRailwayWorld();
  back.load(JSON.parse(after), railwayCheck);
  resumeAway(back, away, 777, tick + 5);
  assert.equal(JSON.stringify(back.snapshot()), after);
});

test('no yard credit while the trains sleep', () => {
  const w = copy(ASLEEP.w);
  // A yard with room (made lowered with it), so only the trains' guard keeps the credit out.
  const y = w.mut(Yard, yardId(w, CAMP))!;
  y.made -= y.stock;
  y.stock = 0;
  const before = JSON.stringify(yards(w).map((y) => [y.stock, y.made])),
    clocks = yards(w).map((_y, slot) => w.get(YardClock, yardId(w, slot))!.last);
  resumeAway(w, 8 * 36000, 1, ASLEEP.t + 1);
  assert.equal(JSON.stringify(yards(w).map((y) => [y.stock, y.made])), before);
  assert.deepEqual(
    yards(w).map((_y, slot) => w.get(YardClock, yardId(w, slot))!.last),
    clocks,
  );
});

test('after the credit, the next crate comes one whole interval after the join', () => {
  const w = copy(FREIGHT.w),
    tick = FREIGHT.t + 1,
    camp = TRADE.yards[CAMP]!;
  resumeAway(w, Math.floor(camp.everyTicks * 1.5), 9, tick);
  const made = yard(w, CAMP).made;
  for (let t = tick + 1; t < tick + camp.everyTicks; t++) railTick(w, t);
  assert.equal(yard(w, CAMP).made, made, 'none sooner');
  railTick(w, tick + camp.everyTicks);
  assert.equal(yard(w, CAMP).made, made + 1);
});

test('plotsStaked: the lowest unbought plots whose timber and stone are in, two at most', () => {
  const cases: [number, number, number[]][] = [
    [0, 0, []],
    [7, 0, []],
    [8, 0, [0]],
    [23, 16, [0]],
    [24, 0, [0, 1]],
    [40, 0, [0, 1]],
    [40, 16, [0, 1]],
  ];
  for (const [wood, stone, want] of cases) assert.deepEqual(plotsStakedOf(0, wood, stone), want, `${wood}/${stone}`);
  // With plot 1 bought (R4) the third is staked once its stone is in, and not before.
  const bought = (k: number) => k === 0;
  assert.deepEqual(plotsStakedOf(0, 40, 15, bought), [1]);
  assert.deepEqual(plotsStakedOf(0, 40, 16, bought), [1, 2]);
  assert.deepEqual(
    plotsStakedOf(0, 40, 16, (k) => k < 2),
    [2],
  );
  assert.deepEqual(
    plotsStakedOf(0, 40, 16, (k) => k === 1),
    [0],
    'yard first waits for the first hangout pick',
  );
  assert.deepEqual(plotsStakedOf(1, 99, 99), [], 'no other town has priced plots');
  const yardFirst = (k: number) => k === 1;
  assert.deepEqual(plotsStakedOf(0, 55, 24, yardFirst), [0]);
  assert.deepEqual(plotsStakedOf(0, 56, 23, yardFirst), [0]);
  assert.deepEqual(plotsStakedOf(0, 56, 24, yardFirst), [0, 3]);
  assert.deepEqual(
    plotsStakedOf(0, 56, 24, (k) => k < 2),
    [2, 3],
  );
  // On the world: freight-running has the first timber home, so plot 1 is staked.
  assert.deepEqual(plotsStaked(FREIGHT.w, 0), [0]);
  assert.deepEqual(plotsStaked(ON.w, 0), []);
  assert.deepEqual(plotsStaked(ON.w, 1), [], 'a town with no row has nothing staked');
});

test("the plots' thresholds never fall, so the lowest met unbought plots are the first ones in order", () => {
  for (const plots of TRADE.plots)
    for (let k = 1; k < plots.length; k++) {
      assert.ok(plots[k]!.wood >= plots[k - 1]!.wood, `plot ${k} timber`);
      assert.ok(plots[k]!.stone >= plots[k - 1]!.stone, `plot ${k} stone`);
    }
});

test('stakedAtOnce has one value: the trade table and the town plan agree', () => {
  assert.equal(TRADE.stakedAtOnce, TOWN_PLOTS.stakedAtOnce);
});

// ---------------------------------------------------------------- R2b: the Quarry's full-load stone stop
test("R2b's stop: only heading home at the Quarry, after the pier's footings, with 8 crates there and an empty train", () => {
  const w = copy(CROSSED.w),
    q = TRADE.yards[QUARRY]!,
    slot = LINE2_SLOTS.find((k) => !train(w, k).wagon && train(w, k).phase !== TRAIN_PHASE.SHED)!;
  assert.equal(w.get(Works, worksId(w))!.pierSet, WORKS.pier);
  // Q7's kit is owed at crossing-done (no train stops for stone then); on until it is aboard and no longer owed.
  for (let t = CROSSED.t + 1; kitOwed(w, { ...train(w, slot), logs: 0, rails: 0 }); t++) {
    assert.ok(t < CROSSED.t + 6000, "Q7's kit is taken");
    railTick(w, t);
  }
  const set = (stock: number, freight: number, pierSet: number = WORKS.pier) => {
    const y = w.mut(Yard, yardId(w, QUARRY))!;
    y.stock = stock;
    Object.assign(w.mut(Train, w.lookup(Train, slot)!)!, { freight, logs: 0, rails: 0 });
    w.mut(Works, worksId(w))!.pierSet = pierSet;
  };
  const stop = (k: number = q.stop, dir = -1, r = train(w, slot)) => freightStop(w, slot, r, k, dir);
  set(TRADE.loadStop, 0);
  assert.equal(TRADE.loadStop, TRADE.freightCap, 'a whole trainload');
  assert.equal(stop(), true);
  assert.equal(stop(q.stop, 1), false, 'going out');
  assert.equal(stop(q.stop + 1), false, 'another halt');
  set(TRADE.loadStop, 0, WORKS.pier - 1);
  assert.equal(stop(), false, 'before the twelfth footing');
  set(TRADE.loadStop - 1, 0);
  assert.equal(stop(), false, 'under a trainload in the yard');
  set(TRADE.loadStop, 1);
  assert.equal(stop(), false, 'a train with freight aboard');
  set(TRADE.loadStop, 0);
  // The build errands (call 4): the wagon's train, a kit aboard.
  assert.equal(stop(q.stop, -1, { ...train(w, slot), wagon: true }), false, "the footing wagon's train");
  assert.equal(stop(q.stop, -1, { ...train(w, slot), logs: 1 }), false, 'a kit aboard');
  assert.equal(stop(q.stop, -1, { ...train(w, slot), rails: 1 }), false, 'a kit aboard');
  // Line 1's yard is at its end: no service stop, every train stands there (a full yard and an empty train, so only
  // the end-halt guard refuses it).
  w.mut(Yard, yardId(w, CAMP))!.stock = TRADE.loadStop;
  w.mut(Train, w.lookup(Train, LINE1_SLOT)!)!.freight = 0;
  assert.equal(freightStop(w, LINE1_SLOT, train(w, LINE1_SLOT), TRADE.yards[CAMP]!.stop, -1), false);
});

test('R2b: after the footings, with nothing asked, each stone stop loads exactly 8 and no build-errand train makes one', () => {
  const w = copy(CROSSED.w),
    q = TRADE.yards[QUARRY]!,
    n = stopsOf(w, LINE2).length;
  const stone0 = town(w, 0).stone;
  let stops = 0;
  for (let t = CROSSED.t + 1; t <= CROSSED.t + MIN20; t++) {
    const was = LINE2_SLOTS.map((k) => ({ ...train(w, k) }));
    railTick(w, t);
    LINE2_SLOTS.forEach((k, i) => {
      const r = train(w, k),
        p = was[i]!;
      if (p.phase !== TRAIN_PHASE.RUN || r.phase !== TRAIN_PHASE.STAND || r.at <= 0 || r.at >= n - 1) return;
      // Nothing is asked, so a middle-halt stand is a service stop: the wagon's own, or the stone stop.
      if (r.wagon) return;
      assert.equal(r.at, q.stop, `train ${k} stood at halt ${r.at} at ${t}`);
      assert.equal(r.track, 1, 'heading home');
      assert.ok(!p.logs && !p.rails && p.freight === 0, 'an empty train on no errand');
      assert.equal(r.freight, TRADE.loadStop, 'exactly a trainload');
      stops++;
    });
    if (t % 600 === 0) checkTrade(w);
  }
  railwayCheck(w);
  assert.ok(stops >= 4, `${stops} stone stops`);
  assert.ok(town(w, 0).stone - stone0 >= 32, `stone delivered ${town(w, 0).stone - stone0}`);
});

test("R2b: a rider's ask homeward at the Quarry still loads stone before the footings", () => {
  const s = { w: copy(ON.w), t: ON.t },
    q = TRADE.yards[QUARRY]!;
  advance(s, q.cap * q.everyTicks);
  const halt = RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === q.stop);
  for (let i = 0; i < 4000; i++) {
    const k = LINE2_SLOTS.find((j) => train(s.w, j).phase === TRAIN_PHASE.RUN && train(s.w, j).track === 1);
    if (k !== undefined && act(s, 'a', 'rail.call', { id: halt, dir: -1, train: k }) === 1) {
      for (let j = 0; j < 3000; j++) {
        advance(s, 1);
        const r = train(s.w, k);
        if (r.phase === TRAIN_PHASE.STAND && r.at === q.stop) {
          assert.equal(r.track, 1);
          assert.equal(r.freight, TRADE.freightCap);
          return;
        }
        if (r.phase === TRAIN_PHASE.STAND && r.at === 0) break; // it could not brake for the ask: ask again
      }
    }
    advance(s, 1);
  }
  assert.fail('no rider ask was served at the Quarry');
});

test('R2b: while a kit is owed, no train makes the stone stop (integrated)', () => {
  // trains-on, with the pier's footings set by hand, the Quarry's yard full (made raised with it) and the forge's next
  // pour held back: Q6's kit is 5 rails short, so it stays owed while empty down trains pass the full yard. (A live
  // room's Q7 kit waits the same way on its rails.)
  const w = copy(ON.w),
    q = TRADE.yards[QUARRY]!;
  w.mut(Works, worksId(w))!.pierSet = WORKS.pier;
  w.mut(ForgeClock, w.single(Forge))!.lastPour = RAILWAY_MAX_INT;
  const y = w.mut(Yard, yardId(w, QUARRY))!;
  y.made += q.cap - y.stock;
  y.stock = q.cap;
  const owed = () => LINE2_SLOTS.some((k) => kitOwed(w, { ...train(w, k), logs: 0, rails: 0 }));
  let ticks = 0,
    passed = 0;
  for (let t = ON.t + 1; ticks < 3000; t++) {
    assert.ok(owed(), `the kit is owed at ${t}`);
    const was = LINE2_SLOTS.map((k) => ({ ...train(w, k) }));
    railTick(w, t);
    ticks++;
    LINE2_SLOTS.forEach((k, i) => {
      const r = train(w, k),
        p = was[i]!;
      if (p.phase === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND && r.at === q.stop && r.track === 1)
        assert.fail(`train ${k} stood at the Quarry homeward at ${t} while a kit was owed`);
      if (
        r.track === 1 &&
        trainAlong(p, LINE2, t - 1) > stopsOf(w, LINE2)[q.stop]! &&
        trainAlong(r, LINE2, t) <= stopsOf(w, LINE2)[q.stop]!
      )
        passed++;
    });
  }
  assert.ok(passed > 0, `an empty down train ran past the full yard (${ticks} ticks owed)`);
});

test("R2b: a lever ask homeward at the Quarry still loads after the footings, whatever the stop's conditions", () => {
  // crossing-done, while Q7's kit is owed (the stone stop is off): the ask stands a train there and it loads.
  const s = { w: copy(CROSSED.w), t: CROSSED.t },
    q = TRADE.yards[QUARRY]!;
  const halt = RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === q.stop);
  assert.equal(act(s, 'a', 'rail.call', { id: halt, dir: -1 }), 1);
  for (let i = 0; i < 3000; i++) {
    const was = LINE2_SLOTS.map((k) => [train(s.w, k).phase, train(s.w, k).freight] as const);
    advance(s, 1);
    for (const [j, k] of LINE2_SLOTS.entries()) {
      const r = train(s.w, k);
      if (was[j]![0] !== TRAIN_PHASE.RUN || r.phase !== TRAIN_PHASE.STAND || r.at !== q.stop || r.track !== 1) continue;
      assert.ok(r.freight > was[j]![1], `train ${k} loaded at the ask`);
      checkTrade(s.w);
      return;
    }
  }
  assert.fail('no train stopped at the Quarry for the ask');
});

/** The footing wagon's train's arrivals at its line's far end and at the Village over `ticks` from a world, nothing
 * asked (the ruling's gate 2), each as `halt@tick`. */
function wagonArrivals(w: World, t0: number, ticks: number) {
  const out: string[] = [];
  let prev = trains(w).map((r) => r.phase);
  for (let t = t0 + 1; t <= t0 + ticks; t++) {
    railTick(w, t);
    // Nothing asked: these states differ from every played run's, so they are checked here (each tick, then sampled).
    if (t - t0 <= 1200 || t % 600 === 0) railwayCheck(w);
    const n = stopsOf(w, LINE2).length;
    trains(w).forEach((r, k) => {
      if (r.wagon && prev[k] === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND && (r.at === n - 1 || r.at === 0))
        out.push(`${r.at}@${t - t0}`);
    });
    prev = trains(w).map((r) => r.phase);
  }
  return out;
}
/** A copy of `w` with its Quarry yard emptied (made lowered with it) and its clock stopped: no stone stop is made. */
function noStone(w: World) {
  const out = copy(w);
  const y = out.mut(Yard, yardId(out, QUARRY))!;
  y.made -= y.stock;
  y.stock = 0;
  out.mut(YardClock, yardId(out, QUARRY))!.last = RAILWAY_MAX_INT;
  return out;
}
// The ruling of 12 November (the proof gate's 2): while line 2's wagon is owed footings the economy adds no stop on
// that line, so the wagon's train arrives on the tick it would with no stone stop at all, every trip.
test("R2b: while footings are owed the wagon's train arrives on the no-stone-stop tick every trip, and no stone moves", () => {
  // Every footings-owed stage: the pier's (wagon-on), the ring's (deck-laid, gap-footed, leaf-raised).
  for (const [name, seed] of [
    ['wagon-on', WAGON],
    ['deck-laid', DECK],
    ['gap-footed', GAP],
    ['leaf-raised', LEAF],
  ] as const) {
    const w = copy(seed.w);
    assert.ok(footingsOwed(w, LINE2) && wagonSlot(w) >= 0, `${name}: footings are owed`);
    const stone0 = town(w, 0).stone;
    const a = wagonArrivals(w, seed.t, MIN20),
      b = wagonArrivals(noStone(seed.w), seed.t, MIN20);
    assert.ok(a.length >= 14, `${name}: ${a.length} arrivals, far end and Village`);
    assert.deepEqual(a, b, name);
    assert.equal(town(w, 0).stone, stone0, `${name}: no stone while footings are owed`);
  }
});

// A golden compares one world with a recording; only two worlds ticked in one process see state kept outside the world.
test('R2b: two worlds driven alike after the footings stay equal row for row', () => {
  const a = copy(CROSSED.w),
    b = copy(CROSSED.w);
  for (let t = CROSSED.t + 1; t <= CROSSED.t + 6000; t++) {
    railTick(a, t);
    railTick(b, t);
    if (t % 100 === 0) assert.equal(a.hash(), b.hash(), `tick ${t}`);
  }
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.ok(town(a, 0).stone > town(CROSSED.w, 0).stone, 'a stone stop was made');
});

test('R2b: footings owed with no wagon coupled (a hand-made state): still no stone stop', () => {
  // The ruling's condition is the line's footings, not the wagon: uncouple it by hand at deck-laid.
  const w = copy(DECK.w);
  for (const k of LINE2_SLOTS) w.mut(Train, w.lookup(Train, k)!)!.wagon = false;
  assert.ok(footingsOwed(w, LINE2) && wagonSlot(w) < 0);
  const y = w.mut(Yard, yardId(w, QUARRY))!;
  y.stock = TRADE.loadStop;
  const slot = LINE2_SLOTS.find((k) => !train(w, k).logs && !train(w, k).rails)!;
  w.mut(Train, w.lookup(Train, slot)!)!.freight = 0;
  assert.equal(kitOwed(w, train(w, slot)), false);
  assert.equal(freightStop(w, slot, train(w, slot), TRADE.yards[QUARRY]!.stop, -1), false);
  // With the ring footed by hand too, the same train would stop: only the footings refused it.
  Object.assign(w.mut(Aperture, w.single(Aperture))!, { set: WORKS.ring, cw: WORKS.counterweight });
  assert.equal(freightStop(w, slot, train(w, slot), TRADE.yards[QUARRY]!.stop, -1), true);
});

// ---------------------------------------------------------------- R3's played route
/** From a world at `wagon-on`, play every footing as it arrives, as a room would: the pier's off its rack into the
 * pier, Q7's kit off the Pier into its frame, the ring's off the railhead rack onto the jib, the brace once the gap is
 * footed and the counterweight hung; the kiln keeps the Works rack supplied. Once the counterweight is hung, strike the
 * rivet and play `join` ticks more, calling `onTick` after each tick. Returns the tick the rivet was struck. */
function playFootings(start: World, t0: number, max: number, join: number, onTick: (w: World, t: number) => void) {
  const s = { w: copy(start), t: t0 },
    w = s.w;
  const [q7Logs, q7Rails] = LINE2_STATIONS[Q7]!.bill;
  let joinAt = -1;
  for (let i = 0; i < max; i++) {
    const wk = w.get(Works, worksId(w))!,
      ap = w.get(Aperture, w.single(Aperture))!;
    if (ap.cw === WORKS.counterweight && joinAt < 0) {
      assert.equal(ap.brace, 0, 'the leaf is down');
      assert.equal(act(s, 'a', 'rail.strike', { id: 2 }), 1, 'the rivet struck');
      joinAt = s.t;
    }
    if (joinAt >= 0 && s.t - joinAt >= join) return joinAt - t0;
    if (wk.pierRack > 0) {
      assert.equal(act(s, 'a', 'rail.footTake', { rack: 1 }), 1);
      assert.equal(act(s, 'a', 'rail.footSet', { site: 2 }), 1);
    } else if (ap.rack > 0 && w.get(QJob, w.lookup(QJob, Q7)!)!.completion) {
      assert.equal(act(s, 'a', 'rail.footTake', { rack: 2 }), 1);
      assert.equal(act(s, 'a', 'rail.footSet', { site: 3 }), 1);
    }
    if (ap.set === WORKS.ring && ap.brace === 1) assert.equal(act(s, 'a', 'rail.brace', { revision: 1 }), 1);
    const r0 = rail(w);
    if (w.get(QJob, w.lookup(QJob, Q7)!)!.start < 0 && r0.depot === q7Logs && r0.depotRails === q7Rails)
      for (const kind of [0, 2])
        for (let guard = 0; kind ? rail(w).depotRails : rail(w).depot; guard++) {
          assert.ok(guard < 8);
          const pid = guard % 2 ? 'b' : 'a';
          const n = act(s, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake');
          assert.ok(n > 0);
          assert.equal(act(s, pid, 'rail.deposit', { station: 'Q7', kind, n }), n);
        }
    advance(s, 1);
    onTick(w, s.t);
  }
  assert.fail('the counterweight is hung within the run');
}
// ---------------------------------------------------------------- R3: riders, fares and the one strongbox
const FARES = buildSeedWorld('fares-running');
/** Q6's kit in its frame, the last 450 ticks of its laying to go: the far end moves to the Pier soon after. */
const Q6_FINISHING = buildSeedWorld('q6-finishing');
const earned = (w: World) => tillRow(w).landed + tillRow(w).lost;

test('R3: riders conserve and every fare is charged once a rider a trip, for 30 minutes from freight-running', () => {
  const w = copy(FREIGHT.w),
    fare = fareOf(w, 0);
  let alighted = town(w, 0).alighted,
    paid = earned(w);
  for (let t = FREIGHT.t + 1; t <= FREIGHT.t + 30 * 600; t++) {
    railTick(w, t);
    checkTrade(w);
    const a = town(w, 0).alighted;
    // Every rider who stepped off this tick paid one fare, no more, whatever the box took.
    assert.equal(earned(w) - paid, (a - alighted) * fare, `tick ${t}`);
    assert.ok(tillRow(w).boogles <= boxCap(w, TRADE_PCT), 'never past the cap');
    alighted = a;
    paid = earned(w);
    if (t % 1800 === 0) railwayCheck(w);
  }
  assert.ok(town(w, 0).alighted - town(FREIGHT.w, 0).alighted > 100, 'the one-train opening route carries riders');
  assert.ok(town(w, 0).wait0 <= TRADE.crowdCap && town(w, 0).wait1 <= TRADE.crowdCap, 'queues remain bounded');
});

test("R3: the box's cap (20 minutes of the demand rate) lands no fare past it and counts the rest in lost", () => {
  const w = copy(FREIGHT.w);
  // Worked out here, not with boxCap: twenty minutes of the demand rate, or 1.5 times the dearest plot on offer.
  const floor = (x: World) => TRADE.box.incomeMin * tillRate(x, TRADE_PCT);
  const offer = (x: World) =>
    Math.floor((dearestOnOffer(x, TRADE_PCT.pricePct) * TRADE.box.dearestNum) / TRADE.box.dearestDen);
  assert.ok(floor(w) > offer(w), 'at freight-running the demand floor is the larger term');
  assert.equal(boxCap(w, TRADE_PCT), floor(w), 'so the cap is twenty minutes of demand');
  for (let t = FREIGHT.t + 1; t <= FREIGHT.t + 40 * 600; t++) railTick(w, t);
  const b = tillRow(w);
  assert.equal(b.boogles, Math.max(floor(w), offer(w)), 'full to the cap (raised by the second staked plot)');
  assert.ok(b.lost > 0, 'fares past the cap are lost');
  assert.equal(b.boogles, b.landed + b.poured - b.spent);
});

test('R3: railFarePct 200 doubles the fare and so what lands; railRiderPct 0 sends no rider', () => {
  const run = (pct: { farePct: number; riderPct: number }) => {
    const w = copy(FREIGHT.w);
    for (let t = FREIGHT.t + 1; t <= FREIGHT.t + 3000; t++) railTick(w, t, undefined, pct);
    return w;
  };
  const one = run(TRADE_PCT),
    two = run({ farePct: 200, riderPct: 100 });
  assert.equal(fareOf(two, 0, 200), 14);
  const base = tillRow(FREIGHT.w).landed;
  assert.equal(tillRow(two).landed - base, 2 * (tillRow(one).landed - base));
  const none = run({ farePct: 100, riderPct: 0 });
  assert.equal(townClock(none, 0).acc, townClock(FREIGHT.w, 0).acc, 'no rider accrues');
  // Only the riders already waiting can board: none more arrive.
  const was = town(FREIGHT.w, 0);
  assert.ok(town(none, 0).boarded <= was.boarded + was.wait0 + was.wait1);
});

test('R3: trade tunables keep their bounds: fares and riders from 0, prices never below 1', () => {
  for (const [key, min, max] of [
    ['railFarePct', 0, 1000],
    ['railRiderPct', 0, 1000],
    ['railPricePct', 1, 1000],
  ] as const) {
    const t = TUNABLES.find((s) => s.key === key)!;
    assert.deepEqual([t.min, t.max], [min, max], key);
    assert.ok(okTune(key, min) && okTune(key, max) && okTune(key, t.def), key);
    assert.ok(!okTune(key, min - 1) && !okTune(key, max + 1) && !okTune(key, 50.5), key);
  }
});

test('R3: no replay: a save and load, a resume and a second resume change no rider or strongbox balance', () => {
  const w = copy(FARES.w);
  const before = JSON.stringify([tillRow(w), town(w, 0), trains(w).map((r) => r.riders)]);
  const back = createRailwayWorld();
  back.load(JSON.parse(JSON.stringify(w.snapshot())), railwayCheck);
  assert.equal(back.hash(), w.hash(), 'a load (a restart or a late joiner) is the same world');
  railResume(back, 8 * 36000, 5, FARES.t + 1, railAwayCredit(8 * 36000));
  railResume(back, 8 * 36000, 5, FARES.t + 1, railAwayCredit(8 * 36000));
  const after = JSON.stringify([tillRow(back), town(back, 0), trains(back).map((r) => r.riders)]);
  // Away fares fill only the sack; riders and the strongbox stay unchanged.
  const strip = (j: string) => JSON.parse(j).map((x: unknown) => x);
  assert.deepEqual(
    strip(after)[0],
    { ...strip(before)[0], sack: sackCap(back, TRADE_PCT, FARES.t + 1) },
    'only the sack fills',
  );
  const tw = (j: string) => {
    const t = strip(j)[1];
    return [t.wait0, t.wait1, t.boarded, t.alighted];
  };
  assert.deepEqual(tw(after), tw(before), 'the riders');
  assert.deepEqual(strip(after)[2], strip(before)[2], 'riders aboard');
});

test("R3: when line 2's end moves on, the far end's crowd waits at the new end and riders aboard ride on to it", () => {
  const w = copy(Q6_FINISHING.w);
  assert.equal(routeFar(w, 0), 2, 'Far Head while Q6 lays');
  let t = Q6_FINISHING.t;
  for (;;) {
    const was = { ...town(w, 0) },
      aboard = trains(w).reduce((n, r) => n + r.riders, 0),
      paid = earned(w);
    railTick(w, ++t);
    assert.ok(t < Q6_FINISHING.t + 3000, 'Q6 completes');
    if (routeFar(w, 0) === 2) continue;
    // The tick it moves: the far end's crowd is the new end's, riders aboard stay aboard, nobody pays for the move.
    assert.equal(routeFar(w, 0), 3, 'the Pier');
    const now = town(w, 0);
    assert.ok(now.wait1 >= Math.min(was.wait1, TRADE.crowdCap) - (now.boarded - was.boarded), 'the crowd is not lost');
    assert.equal(
      trains(w).reduce((n, r) => n + r.riders, 0),
      aboard + (now.boarded - was.boarded) - (now.alighted - was.alighted),
      'riders aboard stay aboard',
    );
    checkTrade(w);
    assert.equal(earned(w) - paid, (now.alighted - was.alighted) * fareOf(w, 0));
    break;
  }
  const pierFare = fareOf(w, 0);
  // Riders aboard an up train now step off at the Pier and pay the Pier's fare.
  let atPier = 0;
  for (let k = 0; k < 6000 && !atPier; k++) {
    const was = trains(w).map((r) => ({ ...r })),
      alighted = town(w, 0).alighted,
      paid = earned(w);
    railTick(w, ++t);
    trains(w).forEach((r, slot) => {
      const p = was[slot]!;
      if (RAIL_TRAINS[slot]!.line !== LINE2 || p.phase !== TRAIN_PHASE.RUN || r.phase !== TRAIN_PHASE.STAND) return;
      if (r.at === 3 && p.riders > 0) {
        assert.equal(town(w, 0).alighted - alighted, p.riders);
        assert.equal(earned(w) - paid, p.riders * pierFare);
        atPier++;
      }
    });
  }
  assert.ok(atPier > 0, 'riders stepped off at the Pier');
  checkTrade(w);
});

test('R3: the check refuses bad riders and a bad strongbox, each with its message', () => {
  const on = copy(FARES.w);
  const verdict = (edit: (w: World) => void) => {
    const w = on.clone();
    edit(w);
    return worldVerdict(w);
  };
  const line2 = RAIL_TRAINS.findIndex((t) => t.line === LINE2),
    line1 = RAIL_TRAINS.findIndex((t) => t.line === 0);
  assert.equal(
    verdict((w) => (w.mut(Train, w.lookup(Train, line2)!)!.riders = TRADE.riderPlaces + 1)),
    'railway: riders bounds',
  );
  assert.equal(
    verdict((w) => (w.mut(Train, w.lookup(Train, line1)!)!.riders = 1)),
    'railway: riders bounds',
    'a line with no route carries nobody',
  );
  assert.equal(
    verdict((w) => (w.mut(Town, w.lookup(Town, 0)!)!.wait0 = TRADE.crowdCap + 1)),
    'railway: riders bounds',
  );
  assert.equal(
    verdict((w) => (w.mut(Town, w.lookup(Town, 0)!)!.boarded += 1)),
    'railway: riders conservation',
  );
  assert.equal(
    verdict((w) => (w.mut(Till, w.single(Till))!.lost = -1)),
    'railway: till bounds',
  );
  assert.equal(
    verdict((w) => (w.mut(Till, w.single(Till))!.boogles += 1)),
    'railway: till conservation',
  );
});

test('R3: no tick at which a train stops for riders: trains run as with no rider at all', () => {
  // crossing-done, Far Head a middle halt: the same world with no rider accruing and nobody waiting.
  const w = copy(CROSSED.w),
    none = copy(CROSSED.w);
  const t0 = none.mut(Town, none.lookup(Town, 0)!)!;
  t0.wait0 = t0.wait1 = 0;
  const pace = (x: World) =>
    JSON.stringify(trains(x).map((r) => [r.phase, r.at, r.to, r.track, r.depart, r.from, r.dest, r.req]));
  for (let t = CROSSED.t + 1; t <= CROSSED.t + 6000; t++) {
    railTick(w, t);
    railTick(none, t, undefined, { farePct: 100, riderPct: 0 });
    assert.equal(pace(w), pace(none), `tick ${t}`);
  }
  assert.ok(town(w, 0).alighted > town(CROSSED.w, 0).alighted, 'riders rode');
});

test('R3: at every stage both crowds board in every 1,200 ticks and neither sits at its cap for 1,200 ticks running', () => {
  for (const [name, seed] of [
    ['trains-on', ON],
    ['freight-running', FREIGHT],
    ['fares-running', FARES],
    ['q6-finishing', Q6_FINISHING],
    ['wagon-on', WAGON],
    ['crossing-done', CROSSED],
    ['deck-laid', DECK],
    ['gap-footed', GAP],
    ['leaf-raised', LEAF],
  ] as const) {
    const w = copy(seed.w);
    let last = { ...town(w, 0) },
      acc = townClock(w, 0).acc,
      board0 = seed.t,
      board1 = seed.t,
      cap0 = -1,
      cap1 = -1;
    for (let t = seed.t + 1; t <= seed.t + 6000; t++) {
      railTick(w, t);
      const now = town(w, 0),
        arrived = townClock(w, 0).acc < acc ? 1 : 0;
      if (now.boarded > last.boarded) {
        if (now.wait0 < last.wait0 + arrived) board0 = t;
        if (now.wait1 < last.wait1 + arrived) board1 = t;
      }
      acc = townClock(w, 0).acc;
      cap0 = now.wait0 >= TRADE.crowdCap ? (cap0 < 0 ? t : cap0) : -1;
      cap1 = now.wait1 >= TRADE.crowdCap ? (cap1 < 0 ? t : cap1) : -1;
      assert.ok(t - board0 <= 1200 && t - board1 <= 1200, `${name}: a crowd waited 1,200 ticks unboarded at ${t}`);
      assert.ok((cap0 < 0 || t - cap0 < 1200) && (cap1 < 0 || t - cap1 < 1200), `${name}: a crowd at its cap at ${t}`);
      last = { ...now };
    }
  }
});

test('R3: every replicated component changes only where it does with riders off, or on a tick with a rider event', (t) => {
  // The same 3,000 ticks twice from fares-running, riders on and riders off (railRiderPct 0; trains run the same, as
  // riders add no stop). Per replicated component, the ticks it changed with riders on but not off must each carry a
  // rider event (a rider arriving, boarding or stepping off); the clock is not replicated, so its every-tick write is
  // not among them.
  const kinds = RAIL_REPLICATED.map((c) => c.kind);
  const run = (riderPct: number) => {
    const w = copy(FARES.w),
      changed = new Map<string, Set<number>>(kinds.map((k) => [k, new Set()])),
      events = new Set<number>();
    const rows = () => w.snapshot().c as Record<string, unknown>;
    const before = Object.fromEntries(kinds.map((k) => [k, JSON.stringify(rows()[k])]));
    let acc = townClock(w, 0).acc;
    for (let tk = FARES.t + 1; tk <= FARES.t + 3000; tk++) {
      const was = { ...town(w, 0) };
      railTick(w, tk, undefined, { farePct: 100, riderPct });
      const now = town(w, 0),
        all = rows();
      if (townClock(w, 0).acc < acc || now.boarded !== was.boarded || now.alighted !== was.alighted) events.add(tk);
      acc = townClock(w, 0).acc;
      for (const k of kinds) {
        const after = JSON.stringify(all[k]);
        if (after !== before[k]) changed.get(k)!.add(tk);
        before[k] = after;
      }
    }
    return { changed, events };
  };
  const on = run(100),
    off = run(0);
  assert.ok(on.events.size > 0 && on.events.size < 300, `${on.events.size} rider events`);
  let extra = 0;
  for (const k of kinds)
    for (const tk of on.changed.get(k)!)
      if (!off.changed.get(k)!.has(tk)) {
        extra++;
        assert.ok(on.events.has(tk), `tick ${tk}: ${k} changed with riders on, with no rider event`);
      }
  const ticks = (r: typeof on) => new Set([...r.changed.values()].flatMap((x) => [...x])).size;
  t.diagnostic(
    `ticks with a replicated change: ${ticks(on)} riders on, ${ticks(off)} off; ${extra} extra (component, tick) changes, ${on.events.size} rider events`,
  );
  assert.ok(ticks(on) <= ticks(off) + on.events.size);
});

test('S1: even flooded crowds stop at their cap and never exceed the rider places', () => {
  // (Exactly the free places boarding, one rider left waiting, is the crowded coach test below.)
  const w = copy(FARES.w);
  for (let t = FARES.t + 1; t <= FARES.t + 3000; t++) {
    railTick(w, t, undefined, { farePct: 100, riderPct: 1000 });
    assert.ok(
      town(w, 0).wait0 <= TRADE.crowdCap && town(w, 0).wait1 <= TRADE.crowdCap,
      `tick ${t}: a crowd past its cap`,
    );
    assert.ok(
      trains(w).every((x) => x.riders <= TRADE.riderPlaces),
      `tick ${t}: a train past its rider places`,
    );
  }
  assert.equal(Math.max(town(w, 0).wait0, town(w, 0).wait1), TRADE.crowdCap, 'the flood reached the cap');
});

test('R3: riders step off and pay only at the route halt ahead: a homeward lever stop at the Quarry lets nobody off', () => {
  const s = { w: copy(FARES.w), t: FARES.t };
  const halt = RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === 1);
  assert.equal(act(s, 'a', 'rail.call', { id: halt, dir: -1 }), 1);
  for (let i = 0; i < 4000; i++) {
    const was = trains(s.w).map((r) => ({ ...r })),
      alighted = town(s.w, 0).alighted,
      paid = earned(s.w);
    advance(s, 1);
    for (const k of LINE2_SLOTS) {
      const r = train(s.w, k),
        p = was[k]!;
      if (p.phase !== TRAIN_PHASE.RUN || r.phase !== TRAIN_PHASE.STAND || r.at !== 1 || r.track !== 1) continue;
      assert.equal(r.riders, p.riders, 'its riders stay aboard');
      assert.equal(town(s.w, 0).alighted, alighted, 'nobody steps off');
      assert.equal(earned(s.w), paid, 'nobody pays');
      if (p.riders > 0) return;
      assert.equal(act(s, 'a', 'rail.call', { id: halt, dir: -1 }), 1, 'ask again for a train with riders');
    }
  }
  assert.fail('no train with riders stood at the Quarry homeward');
});

// Gate 3's harness with riders on, ticked from wagon-on through the pier, Q7, the ring, the counterweight and the rivet,
// then 3,000 ticks on to Ring Island: the far end moves three times (Far Head to the Pier, the Railhead, Ring Island)
// with trains running and riders aboard.
test('R3: played through pier, ring, counterweight and rivet, riders aboard when the far end moves are conserved and each is charged once', (t) => {
  const w0 = WAGON.w,
    moves: string[] = [];
  let far = routeFar(w0, 0),
    aboard = 0,
    t0 = town(w0, 0),
    paid = earned(w0);
  const phase = LINE2_SLOTS.map((k) => train(w0, k).phase);
  const riders = LINE2_SLOTS.map((k) => train(w0, k).riders);
  const offAt = [0, 0, 0, 0, 0, 0]; // riders stepped off, by line 2 stop
  const line2 = (w: World) => LINE2_SLOTS.reduce((n, k) => n + train(w, k).riders, 0);
  aboard = line2(w0);
  assert.equal(t0.boarded - t0.alighted, aboard, 'riders aboard at the start');
  const rivet = playFootings(w0, WAGON.t, 40000, 3000, (w, tk) => {
    railwayCheck(w);
    const tw = town(w, 0),
      now = line2(w),
      stepped = tw.alighted - t0.alighted,
      fare = fareOf(w, 0);
    // Every rider is aboard, waiting or stepped off: boarded less stepped off is aboard, every tick.
    assert.equal(tw.boarded - tw.alighted, now, `tick ${tk}: riders aboard`);
    // Each rider stepping off pays one fare (the route's fare that tick), no more and no less.
    assert.equal(earned(w) - paid, stepped * fare, `tick ${tk}: ${stepped} stepped off at ${fare}`);
    // Who stepped off where: the riders stepping off this tick left the line 2 train that arrived at a halt this
    // tick. A train held at a signal (`at` -1) has arrived nowhere: from v33 one is held at the far end's signal (s
    // 527.8 m, on the up track) at tick 6512 as another reaches the Village (fourth-car R2).
    const came = LINE2_SLOTS.filter(
      (k, i) => phase[i] === TRAIN_PHASE.RUN && train(w, k).phase === TRAIN_PHASE.STAND && train(w, k).at >= 0,
    );
    if (stepped) {
      // A train's riders step off all at once, so they came from the arriving trains whose riders a tick ago sum to
      // them, and only one such set may: two trains can come to a stand on the same tick (from v63 one reaches the Pier
      // as another stands at the Quarry, tick 6244).
      const before = (k: number) => riders[LINE2_SLOTS.indexOf(k)]!;
      const sets = came
        .reduce<number[][]>((all, k) => [...all, ...all.map((set) => [...set, k])], [[]])
        .filter((set) => set.length && set.reduce((n, k) => n + before(k), 0) === stepped);
      assert.equal(sets.length, 1, `tick ${tk}: ${stepped} stepped off one set of the trains that arrived`);
      for (const k of sets[0]!) offAt[train(w, k).at] = offAt[train(w, k).at]! + before(k);
    }
    LINE2_SLOTS.forEach((k, i) => {
      phase[i] = train(w, k).phase;
      riders[i] = train(w, k).riders;
    });
    const f = routeFar(w, 0);
    if (f !== far) {
      // The end moved this tick: the riders aboard before it are still aboard (or stepped off and paid, above).
      assert.equal(now, aboard - stepped + (tw.boarded - t0.boarded), `tick ${tk}: aboard across the move`);
      moves.push(`${far}->${f}@${tk - WAGON.t} with ${aboard} aboard`);
      far = f;
    }
    aboard = now;
    t0 = { ...tw };
    paid = earned(w);
  });
  t.diagnostic(`far end moves: ${moves.join(', ')}; the rivet struck at ${rivet}`);
  assert.deepEqual(
    moves.map((m) => m.split('@')[0]),
    ['3->4', '4->5'],
    'the Pier to the Railhead (Q7 laid), the Railhead to Ring Island (the rivet)',
  );
  assert.ok(
    moves.some((m) => !m.endsWith(' 0 aboard')),
    'riders were aboard at a move',
  );
  t.diagnostic(`stepped off by stop (Village, Quarry, Far Head, Pier, Railhead, Ring Island): ${offAt.join(', ')}`);
  assert.deepEqual(
    [offAt[1], offAt[2]],
    [0, 0],
    'nobody steps off at the Quarry or Far Head (no longer an end once the Pier opens)',
  );
  assert.ok(offAt[3]! > 0 && offAt[4]! > 0 && offAt[5]! > 0, 'riders rode to the Pier, the Railhead and Ring Island');
});

test('R3: income at the first route settles within one fare a minute of min(the till rate, the rider-place-capped rate)', () => {
  const w = copy(FREIGHT.w),
    e0 = earned(w);
  for (let t = FREIGHT.t + 1; t <= FREIGHT.t + 6000; t++) railTick(w, t);
  const perMin = (earned(w) - e0) / 10;
  const ridersPerMinute = (2 * TRADE.riderPlaces * 600) / cycleTicks(LINE2, stopsOf(w, LINE2));
  const expected = Math.min(tillRate(w, TRADE_PCT), ridersPerMinute * fareOf(w, 0));
  assert.ok(Math.abs(perMin - expected) <= fareOf(w, 0), `${perMin} a minute, expected ${expected}`);
});

// B1: spending and building use the same authoritative rules as the host.
const READY = buildSeedWorld('house-ready');
const PIER = buildSeedWorld('q6-done');
const sendBuy = (
  w: World,
  tick: number,
  id: number,
  pid = 'a',
  pct = 50,
  kind: number | undefined = id === 0 ? 1 : undefined,
) => {
  const a = account(w, pid)!;
  return railApply(w, pid, { op: 'rail.buy', id, kind, epoch: a.epoch, request: a.request + 1 }, tick, undefined, pct);
};
/** Controlled money for rule isolation, with its conservation ledger intact. Seeds never do this. */
function credit(w: World, n: number) {
  const b = w.mut(Till, w.single(Till))!;
  b.boogles += n;
  b.landed += n;
}

test('B1: unstaked, short and bought plots reject; duplicates and two players in one tick spend once', () => {
  assert.equal(sendBuy(copy(ASLEEP.w), ASLEEP.t, 0).status, 'rejected');
  assert.equal(sendBuy(copy(FREIGHT.w), FREIGHT.t, 0).status, 'rejected');
  const funded = copy(READY.w);
  credit(funded, plotPrice(funded, 0, 2, 50));
  assert.equal(sendBuy(funded, READY.t, 2).status, 'rejected', 'funded, but the third plot is not staked');
  const w = copy(READY.w),
    before = { ...tillRow(w) },
    price = plotPrice(w, 0, 0, 50);
  const a = account(w, 'a')!;
  const request = { op: 'rail.buy', id: 0, kind: 1, epoch: a.epoch, request: a.request + 1 };
  const first = railApply(w, 'a', request, READY.t);
  assert.equal(first.status, 'accepted');
  assert.deepEqual(railApply(w, 'a', request, READY.t), first, 'replayed request');
  assert.equal(sendBuy(w, READY.t, 0, 'b').status, 'rejected', 'same tick, other player');
  assert.equal(sendBuy(w, READY.t + 1, 0).status, 'rejected', 'already bought');
  assert.deepEqual(plot(w, 0), { slot: 0, at: READY.t, paid: price, kind: 1 });
  assert.equal(tillRow(w).boogles, before.boogles - price);
  assert.equal(tillRow(w).spent, price);
  checkTrade(w, READY.t);
  assert.equal(plotSlot(3, 2), 50, 'keys are per town');
});

test('only valid choices spend the first house price', () => {
  for (const kind of [undefined, 3, 1, 2]) {
    const w = copy(READY.w);
    const a = account(w, 'a')!;
    const result = railApply(w, 'a', { op: 'rail.buy', id: 0, kind, epoch: a.epoch, request: a.request + 1 }, READY.t);
    const accepted = kind === 1 || kind === 2;
    assert.equal(result.status, accepted ? 'accepted' : 'rejected');
    assert.equal(plot(w, 0).kind, accepted ? kind : 0);
    if (accepted) assert.equal(sendBuy(w, READY.t, 0, 'b', 50, 3 - kind).status, 'rejected');
    assert.equal(tillRow(w).spent, accepted ? 150 : 0);
  }
  const w = copy(READY.w);
  credit(w, 400);
  assert.equal(sendBuy(w, READY.t, 1, 'a', 50, 1).status, 'rejected');
  assert.equal(sendBuy(w, READY.t, 1).status, 'accepted');
});

test('Offer 4 after a yard-first buy spends once and restores either activity', () => {
  for (const kind of [4, 5]) {
    const w = copy(PIER.w);
    for (const [goods, slot, goal] of [
      ['wood', 0, 56],
      ['stone', 1, 24],
    ] as const) {
      const delivered = Math.max(0, goal - town(w, 0)[goods]);
      w.mut(Town, w.lookup(Town, 0)!)![goods] += delivered;
      w.mut(Yard, yardId(w, slot))!.made += delivered;
    }
    credit(w, 2000);
    assert.equal(sendBuy(w, PIER.t, 1).status, 'accepted');
    const board = townPlotBoard(3);
    const buyer = account(w, 'a')!;
    const request = { op: 'rail.buy', id: 3, kind, epoch: buyer.epoch, request: buyer.request + 1 };
    const actor: Actor = {
      reach: (x, z, r) => x === Math.round((1000 + board.x) * 100) && z === Math.round(board.z * 100) && r === 320,
      height: () => true,
      cadence: () => true,
    };
    assert.equal(railValid(w, request, actor), true);
    assert.equal(railValid(w, request, { ...actor, reach: () => false }), false);
    assert.equal(boxCap(w, TRADE_PCT, PIER.t), Math.max(20 * tillRate(w, TRADE_PCT, PIER.t), 1200));
    const before = tillRow(w).boogles;
    for (const invalid of [undefined, 0, 1, 2, 3, 6])
      assert.equal(sendBuy(w, PIER.t, 3, 'a', 50, invalid).status, 'rejected');
    assert.equal(sendBuy(w, PIER.t, 3, 'a', 50, kind).status, 'accepted');
    assert.equal(sendBuy(w, PIER.t, 3, 'b', 50, 9 - kind).status, 'rejected');
    assert.deepEqual(plot(w, 3), { slot: 3, at: PIER.t, paid: 800, kind });
    assert.equal(tillRow(w).boogles, before - 800);
    const restored = createRailwayWorld();
    restored.load(JSON.parse(JSON.stringify(w.snapshot())), (v) => railwayCheck(v, PIER.t));
    assert.deepEqual(plot(restored, 3), plot(w, 3));
    assert.equal(housesOf(restored, 0, PIER.t + TRADE.buildTicks), 1);
    restored.mut(Plot, restored.lookup(Plot, 3)!)!.kind = 3;
    assert.throws(() => railwayCheck(restored, PIER.t), /plot kind/);
  }
});

test('B1: buying the second plot first doubles the first immediately; only staked unbought offers set the cap', () => {
  const w = copy(READY.w);
  assert.deepEqual(plotsStaked(w, 0), [0, 1]);
  const [first, second] = [0, 1].map((k) => plotPrice(w, 0, k, 100));
  assert.equal(dearestOnOffer(w, 100), Math.max(first!, second!), 'third is not staked');
  credit(w, second!);
  assert.equal(sendBuy(w, READY.t, 1, 'a', 100).status, 'accepted');
  assert.equal(plotPrice(w, 0, 0, 100), 2 * first!);
  assert.equal(2 * plotPrice(w, 0, 0, 50), plotPrice(w, 0, 0, 100), 'half at 50%');
  assert.equal(housesOf(w, 0, READY.t), 0, 'price doubles before completion');
  assert.deepEqual(plotsStaked(w, 0), [0]);
  assert.equal(dearestOnOffer(w, 100), 2 * first!);
  const box = TRADE.box;
  assert.equal(
    boxCap(w, { ...TRADE_PCT, pricePct: 100 }, READY.t),
    Math.floor((2 * first! * box.dearestNum) / box.dearestDen),
  );
});

test('B1: a house raises demand at exactly at + buildTicks; replay and a mid-build save stay deterministic', () => {
  const a = copy(READY.w),
    b = copy(READY.w);
  for (const w of [a, b]) assert.equal(sendBuy(w, READY.t, 0).status, 'accepted');
  const back = createRailwayWorld();
  back.load(JSON.parse(JSON.stringify(b.snapshot())), (w) => railwayCheck(w, READY.t));
  assert.equal(back.hash(), b.hash());
  const done = READY.t + TRADE.buildTicks;
  assert.equal(tillRate(a, TRADE_PCT, done - 1), tillRate(READY.w, TRADE_PCT, READY.t));
  assert.ok(tillRate(a, TRADE_PCT, done) > tillRate(a, TRADE_PCT, done - 1));
  assert.equal(plotBuilt(a, 0, done - 1), false);
  for (let tick = READY.t + 1; tick <= READY.t + 600; tick++) {
    railTick(a, tick);
    railTick(back, tick);
    assert.equal(a.hash(), back.hash());
    checkTrade(a, tick);
  }
});

test('B1: plot load checks reject future buys, missing thresholds, unbought payments and a wrong spent sum', () => {
  const bought = copy(READY.w);
  sendBuy(bought, READY.t, 0);
  assert.throws(() => checkTrade(bought, READY.t - 1), /plot bounds/);
  const unbought = copy(READY.w);
  unbought.mut(Plot, unbought.lookup(Plot, 0)!)!.paid = 1;
  assert.throws(() => checkTrade(unbought, READY.t), /plot bounds/);
  const wrong = copy(bought);
  wrong.mut(Plot, wrong.lookup(Plot, 0)!)!.paid++;
  assert.throws(() => checkTrade(wrong, READY.t), /plot spending/);
  const early = copy(ASLEEP.w);
  Object.assign(early.mut(Plot, early.lookup(Plot, 0)!)!, { at: ASLEEP.t, paid: 150, kind: 1 });
  assert.throws(() => checkTrade(early, ASLEEP.t), /plot thresholds/);
});

test('R2b: a crowded coach lands a full fare load, conserved through save and reload', () => {
  const s = { w: copy(PIER.w), t: PIER.t };
  let slot = -1;
  for (let n = 0; n < 3000 && slot < 0; n++) {
    advance(s, 1);
    slot =
      LINE2_SLOTS.find((k) => {
        const r = train(s.w, k);
        return r.phase === TRAIN_PHASE.STAND && r.at === 0 && r.track === 0;
      }) ?? -1;
  }
  assert.ok(slot >= 0);
  const r = s.w.mut(Train, s.w.lookup(Train, slot)!)!,
    tw = s.w.mut(Town, s.w.lookup(Town, 0)!)!;
  tw.alighted += r.riders;
  r.riders = 0;
  tw.wait0 = TRADE.riderPlaces + 1;
  advance(s, 1);
  assert.equal(train(s.w, slot).riders, TRADE.riderPlaces);
  assert.equal(town(s.w, 0).wait0, 1);
  advance(s, 1);
  assert.equal(train(s.w, slot).riders, TRADE.riderPlaces, 'a full train boards nobody');
  assert.equal(town(s.w, 0).wait0, 1, 'the waiting rider remains');
  const loaded = createRailwayWorld();
  loaded.load(JSON.parse(JSON.stringify(s.w.snapshot())), (w) => railwayCheck(w, s.t));
  for (let n = 0; n < 3000; n++) {
    const before = train(s.w, slot).at,
      money = tillRow(s.w).landed,
      alighted = town(s.w, 0).alighted;
    advance(s, 1);
    railTick(loaded, s.t);
    assert.equal(loaded.hash(), s.w.hash(), 'loaded riders and fares stay identical each tick');
    if (before !== routeFar(s.w, 0) && train(s.w, slot).at === routeFar(s.w, 0)) {
      assert.equal(town(s.w, 0).alighted - alighted, TRADE.riderPlaces);
      assert.equal(tillRow(s.w).landed - money, TRADE.riderPlaces * fareOf(s.w, 0), 'a full load of fares');
      checkTrade(s.w, s.t);
      return;
    }
  }
  assert.fail('Crowded coach did not complete its first trip');
});

test('S1: an above-cap saved box and a plot bought at its old price keep their balances', () => {
  const w = copy(PIER.w);
  // A progressed save from before the price cut: three bought plots, the last paid at 6000.
  for (const [k, paid] of [150, 800, 6000].entries()) {
    const threshold = TRADE.plots[0][k]!;
    for (const [goods, slot] of [
      ['wood', 0],
      ['stone', 1],
    ] as const) {
      const n = Math.max(0, threshold[goods] - town(w, 0)[goods]);
      w.mut(Town, w.lookup(Town, 0)!)![goods] += n;
      w.mut(Yard, w.lookup(Yard, slot)!)!.made += n;
    }
    Object.assign(w.mut(Plot, w.lookup(Plot, k)!)!, { at: PIER.t - TRADE.buildTicks, kind: [1, 0, 3][k], paid });
    const b = w.mut(Till, w.single(Till))!;
    b.spent += paid;
    b.landed += paid;
  }
  credit(w, 10000);
  const before = { ...tillRow(w) };
  assert.ok(before.boogles > boxCap(w, TRADE_PCT, PIER.t));
  const back = createRailwayWorld();
  back.load(JSON.parse(JSON.stringify(w.snapshot())), (v) => railwayCheck(v, PIER.t));
  const alighted = town(back, 0).alighted;
  for (let tick = PIER.t + 1; tick <= PIER.t + 1200; tick++) railTick(back, tick);
  checkTrade(back, PIER.t + 1200);
  assert.ok(town(back, 0).alighted > alighted, 'fares arrived while above cap');
  assert.equal(tillRow(back).boogles, before.boogles, 'no clamp');
  assert.equal(tillRow(back).landed, before.landed, 'no new fares land');
  assert.ok(tillRow(back).lost > before.lost);
  assert.equal(plot(back, 2).paid, 6000, 'historical payment unchanged');
});

test('B1: audited buy and completed-house ticks declare every accessed component', () => {
  const w = createRailwayWorld({ audit: true });
  w.load(JSON.parse(JSON.stringify(READY.w.snapshot())), railwayCheck);
  assert.equal(sendBuy(w, READY.t, 0).status, 'accepted');
  railTick(w, READY.t + TRADE.buildTicks);
  checkTrade(w, READY.t + TRADE.buildTicks);
});

// C1: resume reuses deterministic production ticks; a pour transfers the entire earned sack once.
const HOUSE = buildSeedWorld('house-built');
const NIGHT = 8 * 36000;
const sendSack = (w: World, tick: number, pid = 'a') => {
  const a = account(w, pid)!;
  return railApply(w, pid, { op: 'rail.sack', epoch: a.epoch, request: a.request + 1 }, tick);
};

test('C1: eight hours fills one capped sack, leaves the box untouched, and resumes never duplicate it', () => {
  const w = createRailwayWorld({ audit: true });
  w.load(HOUSE.w.snapshot(), (v) => railwayCheck(v, HOUSE.t));
  const before = { ...tillRow(w) };
  resumeAway(w, NIGHT, NIGHT, HOUSE.t);
  const cap = sackCap(w, TRADE_PCT, HOUSE.t);
  assert.equal(cap, 15 * tillRate(w, TRADE_PCT, HOUSE.t));
  assert.deepEqual({ ...tillRow(w) }, { ...before, sack: cap });
  const after = w.snapshot();
  resumeAway(w, NIGHT, NIGHT, HOUSE.t);
  resumeAway(w, NIGHT, NIGHT - 1, HOUSE.t);
  assert.deepEqual(w.snapshot(), after, 'same and older markers do nothing');
  const back = createRailwayWorld();
  back.load(JSON.parse(JSON.stringify(after)), (v) => railwayCheck(v, HOUSE.t));
  for (const v of [w, back]) resumeAway(v, NIGHT, NIGHT + 1, HOUSE.t);
  assert.deepEqual({ ...tillRow(w) }, { ...before, sack: cap }, 'another absence cannot add past the cap');
  assert.equal(w.hash(), back.hash(), 'loaded and audited worlds replay identically');
  const seed = buildSeedWorld('sack-waiting');
  assert.deepEqual({ ...tillRow(seed.w) }, { ...before, sack: cap });
  assert.equal(plotBuilt(seed.w, 0, seed.t), true);
});

test('C1: a short absence floors the credited fares; asleep trains and zero ticks earn nothing', () => {
  const w = copy(HOUSE.w),
    ticks = railAwayCredit(13);
  resumeAway(w, 13, 1, HOUSE.t);
  assert.equal(tillRow(w).sack, Math.floor((tillRate(w, TRADE_PCT, HOUSE.t) * ticks) / 600));
  assert.ok(tillRow(w).sack < sackCap(w, TRADE_PCT, HOUSE.t));
  const before = { ...tillRow(w) };
  railResume(w, 0, 2, HOUSE.t);
  assert.deepEqual({ ...tillRow(w) }, before);
  const asleep = copy(ASLEEP.w);
  resumeAway(asleep, NIGHT, 1, ASLEEP.t);
  assert.equal(tillRow(asleep).sack, 0);
});

test('C1: an empty sack is rejected, including after another player pours it', () => {
  const w = copy(HOUSE.w),
    before = { ...tillRow(w) };
  assert.equal(sendSack(w, HOUSE.t).status, 'rejected');
  assert.deepEqual({ ...tillRow(w) }, before);
  resumeAway(w, NIGHT, 1, HOUSE.t);
  assert.equal(sendSack(w, HOUSE.t).status, 'accepted');
  assert.equal(sendSack(w, HOUSE.t, 'b').status, 'rejected');
  checkTrade(w, HOUSE.t);
});

test('C1: pouring past the box mark conserves every coin and replay cannot pour twice', () => {
  const w = createRailwayWorld({ audit: true });
  w.load(HOUSE.w.snapshot(), (v) => railwayCheck(v, HOUSE.t));
  credit(w, boxCap(w, TRADE_PCT, HOUSE.t) - tillRow(w).boogles);
  resumeAway(w, NIGHT, 1, HOUSE.t);
  const before = { ...tillRow(w) },
    a = account(w, 'a')!,
    request = { op: 'rail.sack', epoch: a.epoch, request: a.request + 1 };
  const result = railApply(w, 'a', request, HOUSE.t);
  assert.equal(result.status, 'accepted');
  assert.equal(result.accepted, 1, 'one pour, as for one buy; receipts do not carry coin counts');
  assert.deepEqual(railApply(w, 'a', request, HOUSE.t), result);
  assert.deepEqual(
    { ...tillRow(w) },
    {
      ...before,
      boogles: before.boogles + before.sack,
      poured: before.poured + before.sack,
      sack: 0,
    },
  );
  assert.ok(tillRow(w).boogles > boxCap(w, TRADE_PCT, HOUSE.t));
  checkTrade(w, HOUSE.t);
  const back = createRailwayWorld();
  back.load(JSON.parse(JSON.stringify(w.snapshot())), (v) => railwayCheck(v, HOUSE.t));
  assert.equal(back.hash(), w.hash());
  assert.equal(sendSack(back, HOUSE.t).status, 'rejected');
  for (const key of ['boogles', 'poured'] as const) {
    const corrupt = copy(w);
    corrupt.mut(Till, corrupt.single(Till))![key]++;
    assert.throws(() => checkTrade(corrupt, HOUSE.t), /till conservation/);
  }
});

test('C1: lowering either live rate preserves a full sack; later resumes add nothing at the lower cap', () => {
  for (const key of ['railFarePct', 'railRiderPct'] as const) {
    const host = serverWorld(),
      saved = host.sync.snapshot();
    assert.ok(
      host.sync.loadSnapshot({ ...saved, tick: HOUSE.t, data: { ...saved.data, railway: HOUSE.w.snapshot() } }),
    );
    host.railway.resume(NIGHT, 1, railAwayCredit(NIGHT));
    const before = { ...tillRow(host.railway.world()) };
    assert.equal(before.sack, sackCap(host.railway.world(), TRADE_PCT, HOUSE.t));
    for (const v of [50, 0]) {
      assert.equal(host.run('a', { op: 'tune.set', key, v }).status, 'accepted');
      const pct = { farePct: host.railTune.get('railFarePct'), riderPct: host.railTune.get('railRiderPct') };
      assert.ok(sackCap(host.railway.world(), pct, HOUSE.t) < before.sack);
      assert.deepEqual({ ...tillRow(host.railway.world()) }, before, 'tuning does not clamp money');
      host.railway.resume(NIGHT, v === 50 ? 2 : 3, railAwayCredit(NIGHT));
      assert.deepEqual({ ...tillRow(host.railway.world()) }, before, 'lower-cap resume neither adds nor removes');
      assert.ok(
        host.sync.loadSnapshot(JSON.parse(JSON.stringify(host.sync.snapshot()))),
        'save validates without a cap',
      );
    }
  }
});

test('C1: the server fills at live rates and accepts the adapter pour only at the till', () => {
  const host = serverWorld(),
    saved = host.sync.snapshot();
  assert.ok(host.sync.loadSnapshot({ ...saved, tick: HOUSE.t, data: { ...saved.data, railway: HOUSE.w.snapshot() } }));
  assert.equal(host.run('a', { op: 'tune.set', key: 'railFarePct', v: 200 }).status, 'accepted');
  assert.equal(host.run('a', { op: 'tune.set', key: 'railRiderPct', v: 25 }).status, 'accepted');
  const ticks = railAwayCredit(100);
  host.railway.resume(100, 1, ticks);
  const w = host.railway.world(),
    n = Math.floor((tillRate(w, { farePct: 200, riderPct: 25 }, HOUSE.t) * ticks) / 600);
  assert.equal(tillRow(w).sack, n);
  const actor: Actor = {
    reach: (x, z, radius) =>
      Math.abs(x - (1000 + TILL.x) * 100) < 1 && Math.abs(z - TILL.z * 100) < 1 && radius === 320,
    height: (y) => Math.abs(y - (HALL.floor * 100 + 40)) < 1,
    cadence: () => true,
  };
  const a = account(w, 'a')!,
    request = { op: 'rail.sack', epoch: a.epoch, request: a.request + 1 };
  assert.equal(railValid(w, request, { ...actor, height: () => false }), false);
  assert.equal(railValid(w, request, { ...actor, cadence: () => false }), false);
  assert.equal(host.railway.act('a', request, { ...actor, reach: () => false }).status, 'rejected');
  assert.equal(tillRow(w).sack, n);
  const intents = railwayActs(
    (intent) => {
      assert.deepEqual(intentOf(intent), { op: 'rail.sack' });
      const next = account(w, 'a')!;
      return (
        host.railway.act('a', { ...intent, epoch: next.epoch, request: next.request + 1 }, actor).status === 'accepted'
      );
    },
    () => w,
  );
  const before = { ...tillRow(w) };
  assert.equal(intents.sack(), true);
  assert.equal(tillRow(w).boogles, before.boogles + n);
  assert.equal(tillRow(w).poured, before.poured + n);
  assert.equal(tillRow(w).sack, 0);
  checkTrade(w, HOUSE.t);
});

test('C1: save checks reject negative and fractional sacks, without consulting a live cap', () => {
  for (const sack of [-1, 0.5, NaN, Infinity]) {
    const w = copy(HOUSE.w);
    w.mut(Till, w.single(Till))!.sack = sack;
    assert.throws(() => checkTrade(w, HOUSE.t), /till bounds/);
  }
});
