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
  Till,
  Town,
  Train,
  Works,
  Yard,
  YardClock,
} from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { checkTrade } from '../src/sim/railway-check-trade.ts';
import { buildSeedWorld, SEED_STAGES } from '../src/sim/railway-seeds.ts';
import { TRADE_STAGES } from '../src/sim/railway-seed-trade.ts';
import { railTick } from '../src/sim/railway-systems.ts';
import { rail, town, townClock, train, trains, yard, yards } from '../src/sim/railway-rows.ts';
import {
  boxCap,
  fareOf,
  freightAboard,
  freightStop,
  plotsStaked,
  plotsStakedOf,
  routeFar,
  tillRate,
} from '../src/sim/railway-queries-trade.ts';
import { okTune, TUNABLES } from '../src/sim/tune.ts';
import { footingsOwed, kitOwed, wagonSlot, worksId } from '../src/sim/railway-queries.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import { LINE2_STATIONS, Q7 } from '../src/sim/railway-line2-layout.ts';
import { RAILWAY_MAX_INT } from '../src/sim/railway.ts';
import { railResume } from '../src/sim/railway-sys-away.ts';
import { RAIL_AWAY, railAwayCredit } from '../src/sim/railway-away.ts';
import { TOWN_PLOTS } from '../src/place/town-plan.ts';
import { TRADE, TRADE_PCT } from '../src/sim/railway-trade-layout.ts';
import { LINE2, RAIL_HALTS, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { TRAIN_PHASE, trainAlong } from '../src/sim/railway-train.ts';
import { act, advance } from '../src/sim/railway-seed-route.ts';
import { stopsOf } from '../src/sim/railway-queries.ts';
import { worldVerdict } from './helpers/railway-check.ts';

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

test('a fresh railway starts with both yards full, nothing aboard and nothing delivered', () => {
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
  // The Camp kept making crates and its timber kept coming home (line 1 stands at the Camp every trip). Stone comes
  // only with a train that stands at the Quarry homeward for another reason; with nothing asked, only the one parked
  // there as the trains woke: 8 once, and the refilled yard then waits full.
  assert.ok(yard(a, CAMP).made > TRADE.yards[CAMP]!.cap + 4, 'the Camp made');
  assert.ok(town(a, 0).wood > TRADE.freightCap);
  assert.equal(town(a, 0).stone, TRADE.freightCap);
  assert.deepEqual(
    [yard(a, QUARRY).stock, yard(a, QUARRY).made],
    [TRADE.yards[QUARRY]!.cap, 2 * TRADE.yards[QUARRY]!.cap],
  );
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
  // The line 2 train that stands at the Quarry as the trains wake loaded there with no freight stop.
  const at = LINE2_SLOTS.find((k) => RAIL_TRAINS[k]!.home === TRADE.yards[QUARRY]!.stop);
  assert.ok(at !== undefined, 'a line 2 train is parked at the Quarry');
  assert.equal(train(ON.w, at).freight, TRADE.freightCap);
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

test('the world check holds every tick for 1,200 ticks from wagon-on', () => {
  const w = copy(WAGON.w);
  for (let t = WAGON.t + 1; t <= WAGON.t + 1200; t++) {
    railTick(w, t);
    railwayCheck(w);
  }
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

test('freight-running: a seed stage, the first timber home, the world check accepts it', () => {
  for (const s of TRADE_STAGES) assert.ok((SEED_STAGES as readonly string[]).includes(s), s);
  assert.ok(town(FREIGHT.w, 0).wood >= 8);
  assert.equal(worldVerdict(FREIGHT.w), null);
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
  assert.deepEqual(plotsStakedOf(1, 99, 99), [], 'no other town has priced plots');
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
    slot = LINE2_SLOTS.find((k) => !train(w, k).wagon)!;
  assert.equal(w.get(Works, worksId(w))!.pierSet, WORKS.pier);
  // Q7's kit is owed at crossing-done (no train stops for stone then); on until it is aboard and no longer owed.
  for (let t = CROSSED.t + 1; kitOwed(w, { ...train(w, slot), logs: 0, rails: 0 }); t++) {
    assert.ok(t < CROSSED.t + 6000, "Q7's kit is taken");
    railTick(w, t);
  }
  const set = (stock: number, freight: number, pierSet: number = WORKS.pier) => {
    const y = w.mut(Yard, yardId(w, QUARRY))!;
    y.stock = stock;
    w.mut(Train, w.lookup(Train, slot)!)!.freight = freight;
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

test('R2b: no stone stop for any train while a kit is owed', () => {
  // trains-on: Q6's kit is owed at the Village; the pier's footings set by hand here, only for the query.
  const w = copy(ON.w),
    slot = LINE2_SLOTS.find((k) => !train(w, k).wagon && !train(w, k).logs && !train(w, k).rails)!;
  w.mut(Works, worksId(w))!.pierSet = WORKS.pier;
  const y = w.mut(Yard, yardId(w, QUARRY))!;
  y.stock = TRADE.loadStop;
  const r = { ...train(w, slot), freight: 0 };
  w.mut(Train, w.lookup(Train, slot)!)!.freight = 0;
  assert.equal(kitOwed(w, r), true);
  assert.equal(freightStop(w, slot, r, TRADE.yards[QUARRY]!.stop, -1), false);
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

/** The footing wagon's train's arrivals at its line's far end and at the Village over `ticks` from a world, nothing
 * asked (the ruling's gate 2), each as `halt@tick`. */
function wagonArrivals(w: World, t0: number, ticks: number) {
  const out: string[] = [];
  let prev = trains(w).map((r) => r.phase);
  for (let t = t0 + 1; t <= t0 + ticks; t++) {
    railTick(w, t);
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

test('R2b: once no footings are owed, stone flows (the ring finished by hand)', () => {
  const w = copy(DECK.w),
    stone0 = town(w, 0).stone;
  Object.assign(w.mut(Aperture, w.single(Aperture))!, { set: WORKS.ring, cw: WORKS.counterweight });
  assert.equal(footingsOwed(w, LINE2), false);
  for (let t = DECK.t + 1; t <= DECK.t + MIN20; t++) railTick(w, t);
  assert.ok(town(w, 0).stone - stone0 >= 32, `stone ${town(w, 0).stone - stone0}`);
});

// Outside that window the wagon's train is an ordinary train and may run late: reported, not asserted (the ruling's
// accepted cost).
test("R2b: the wagon's arrivals with no footings owed, against no stone stop (reported)", (t) => {
  const a = wagonArrivals(copy(CROSSED.w), CROSSED.t, MIN20),
    b = wagonArrivals(noStone(CROSSED.w), CROSSED.t, MIN20);
  const at = (x: string) => Number(x.split('@')[1]);
  t.diagnostic(`crossing-done, wagon drift per arrival: ${a.map((v, i) => at(v) - at(b[i] ?? '0@0')).join(', ')}`);
  assert.ok(a.length > 0);
});

// ---------------------------------------------------------------- R2b gate 3: the whole footing sequence, played
/** From a world at `wagon-on`, play every footing as it arrives, as a room would: the pier's off its rack into the
 * pier, Q7's kit off the Pier into its frame, the ring's off the railhead rack onto the jib, the brace once the gap is
 * footed and the counterweight hung; the kiln keeps the Works rack supplied. Returns each footing delivery (a rack
 * gaining) and each wagon arrival at either end, as `what@tick`, until the counterweight is hung. Options: `every`,
 * a slower player who sets one footing at most every so many ticks; `onTick`, called after each tick; `join`, once the
 * counterweight is hung strike the rivet and play that many ticks more. */
type Play = { every?: number; onTick?: (w: World, t: number) => void; join?: number };
function playFootings(start: World, t0: number, max: number, opts: Play = {}) {
  const s = { w: copy(start), t: t0 },
    w = s.w,
    out: string[] = [];
  const [q7Logs, q7Rails] = LINE2_STATIONS[Q7]!.bill;
  let prev = trains(w).map((r) => r.phase),
    pierRack = w.get(Works, worksId(w))!.pierRack,
    headRack = w.get(Aperture, w.single(Aperture))!.rack,
    last = -Infinity,
    joinAt = -1;
  for (let i = 0; i < max; i++) {
    const wk = w.get(Works, worksId(w))!,
      ap = w.get(Aperture, w.single(Aperture))!;
    if (ap.cw === WORKS.counterweight && opts.join === undefined) return out;
    if (ap.cw === WORKS.counterweight && joinAt < 0) {
      assert.equal(ap.brace, 0, 'the leaf is down');
      assert.equal(act(s, 'a', 'rail.strike', { id: 2 }), 1, 'the rivet struck');
      out.push(`rivet@${s.t - t0}`);
      joinAt = s.t;
    }
    if (joinAt >= 0 && s.t - joinAt >= opts.join!) return out;
    const every = opts.every ?? 0;
    if (s.t - last < every) {
      // A slower player: nothing set this tick.
    } else if (wk.pierRack > 0) {
      assert.equal(act(s, 'a', 'rail.footTake', { rack: 1 }), 1);
      assert.equal(act(s, 'a', 'rail.footSet', { site: 2 }), 1);
      last = s.t;
    } else if (ap.rack > 0 && w.get(QJob, w.lookup(QJob, Q7)!)!.completion) {
      assert.equal(act(s, 'a', 'rail.footTake', { rack: 2 }), 1);
      assert.equal(act(s, 'a', 'rail.footSet', { site: 3 }), 1);
      last = s.t;
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
    opts.onTick?.(w, s.t);
    const n = stopsOf(w, LINE2).length;
    trains(w).forEach((r, k) => {
      if (r.wagon && prev[k] === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND && (r.at === n - 1 || r.at === 0))
        out.push(`wagon ${r.at}@${s.t - t0}`);
    });
    prev = trains(w).map((r) => r.phase);
    const pr = w.get(Works, worksId(w))!.pierRack,
      hr = w.get(Aperture, w.single(Aperture))!.rack;
    if (pr > pierRack) out.push(`pier +${pr - pierRack}@${s.t - t0}`);
    if (hr > headRack) out.push(`railhead +${hr - headRack}@${s.t - t0}`);
    pierRack = pr;
    headRack = hr;
  }
  assert.fail('the counterweight is hung within the run');
}
// Gate 3 (the ruling of 12 November): with every footing played as it arrives, each footing delivery and each of the
// wagon's arrivals land on the tick they would with no stone stop at all, through the pier, the ring and the
// counterweight.
test('R2b gate 3: the whole footing sequence, played, lands every delivery and wagon arrival on the no-stone-stop tick', (t) => {
  const a = playFootings(WAGON.w, WAGON.t, 30000),
    b = playFootings(noStone(WAGON.w), WAGON.t, 30000);
  assert.ok(a.filter((x) => x.startsWith('pier')).length >= 2 && a.some((x) => x.startsWith('railhead')));
  t.diagnostic(`${a.length} events: ${a.join(' ')}`);
  assert.deepEqual(a, b);
});
// The run above is one played sequence, and in it a stone stop happens not to delay anything: removing the
// footings-owed condition from freightStop leaves it passing (gate 2's test is the guard for that condition). A slower
// player, setting one footing every 900 ticks from deck-laid through the ring and the counterweight, keeps the trains
// running while footings are owed long enough that a stone stop on the line moves the wagon's arrival by a tick: with
// the condition removed this one fails (the wagon at the Railhead on 9,022 against 9,023 with no stone stop), with it
// the two runs are equal.
test('R2b gate 3, a slower player: one footing every 900 ticks from deck-laid lands every event on the no-stone-stop tick', (t) => {
  const a = playFootings(DECK.w, DECK.t, 40000, { every: 900 }),
    b = playFootings(noStone(DECK.w), DECK.t, 40000, { every: 900 });
  assert.ok(
    a.filter((x) => x.startsWith('railhead')).length >= 2 && a.filter((x) => x.startsWith('wagon')).length >= 20,
  );
  t.diagnostic(`${a.length} events, the last ${a[a.length - 1]}`);
  assert.deepEqual(a, b);
});
// ---------------------------------------------------------------- R3: riders, fares and the one strongbox
const FARES = buildSeedWorld('fares-running');
/** Q6's kit in its frame, the last 450 ticks of its laying to go: the far end moves to the Pier soon after. */
const Q6_FINISHING = buildSeedWorld('q6-finishing');
const tillRow = (w: World) => w.get(Till, w.single(Till))!;
const earned = (w: World) => tillRow(w).landed + tillRow(w).lost;

test('R3: a fresh railway has an empty strongbox and nobody waiting or aboard', () => {
  const w = createRailwayWorld();
  assert.deepEqual({ ...tillRow(w) }, { boogles: 0, landed: 0, lost: 0, spent: 0, sack: 0, poured: 0 });
  const t = town(w, 0);
  assert.deepEqual([townClock(w, 0).acc, t.wait0, t.wait1, t.boarded, t.alighted], [0, 0, 0, 0, 0]);
  assert.ok(trains(w).every((r) => r.riders === 0));
});

test('R3: riders conserve and every fare is charged once a rider a trip, for 30 minutes from freight-running', () => {
  const w = copy(FREIGHT.w),
    fare = fareOf(w, 0);
  assert.equal(fare, 7, 'the Village to Far Head: 2 + floor(507 m / 100 m)');
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
  assert.ok(town(w, 0).alighted - town(FREIGHT.w, 0).alighted > 200, 'riders rode');
  assert.ok(town(w, 0).wait0 < TRADE.crowdCap && town(w, 0).wait1 < TRADE.crowdCap, 'nobody strands');
});

test("R3: the box's cap (20 minutes of the demand rate) lands no fare past it and counts the rest in lost", () => {
  const w = copy(FREIGHT.w);
  assert.equal(tillRate(w, TRADE_PCT), 56, '2 buildings × 2 riders × 2 ways × 7');
  assert.equal(boxCap(w, TRADE_PCT), 1120);
  for (let t = FREIGHT.t + 1; t <= FREIGHT.t + 30 * 600; t++) railTick(w, t);
  const b = tillRow(w);
  assert.equal(b.boogles, 1120, 'full');
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

test('R3: the three trade tunables, appended, default 100, inside their bounds', () => {
  for (const [key, min, max] of [
    ['railFarePct', 0, 1000],
    ['railRiderPct', 0, 1000],
    ['railPricePct', 1, 1000],
  ] as const) {
    const t = TUNABLES.find((s) => s.key === key)!;
    assert.deepEqual([t.def, t.min, t.max], [100, min, max], key);
    assert.ok(okTune(key, min) && okTune(key, max) && okTune(key, 100));
    assert.ok(!okTune(key, min - 1) && !okTune(key, max + 1) && !okTune(key, 50.5), key);
  }
});

test('R3: no replay: a save and load, a resume and a second resume change no rider or Boogle', () => {
  const w = copy(FARES.w);
  const before = JSON.stringify([tillRow(w), town(w, 0), trains(w).map((r) => r.riders)]);
  const back = createRailwayWorld();
  back.load(JSON.parse(JSON.stringify(w.snapshot())), railwayCheck);
  assert.equal(back.hash(), w.hash(), 'a load (a restart or a late joiner) is the same world');
  railResume(back, 8 * 36000, 5, FARES.t + 1, railAwayCredit(8 * 36000));
  railResume(back, 8 * 36000, 5, FARES.t + 1, railAwayCredit(8 * 36000));
  const after = JSON.stringify([tillRow(back), town(back, 0), trains(back).map((r) => r.riders)]);
  // The yards' credit moves crates (Town.wood and stone are untouched by it); nothing about riders or Boogles moves.
  const strip = (j: string) => JSON.parse(j).map((x: unknown) => x);
  assert.deepEqual(strip(after)[0], strip(before)[0], 'the strongbox');
  const tw = (j: string) => {
    const t = strip(j)[1];
    return [t.wait0, t.wait1, t.boarded, t.alighted];
  };
  assert.deepEqual(tw(after), tw(before), 'the riders');
  assert.deepEqual(strip(after)[2], strip(before)[2], 'riders aboard');
});

test('R3: two worlds driven alike stay equal row for row', () => {
  const a = copy(FARES.w),
    b = copy(FARES.w);
  for (let t = FARES.t + 1; t <= FARES.t + 6000; t++) {
    railTick(a, t);
    railTick(b, t);
    if (t % 100 === 0) assert.equal(a.hash(), b.hash(), `tick ${t}`);
  }
  assert.deepEqual(a.snapshot(), b.snapshot());
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
  assert.equal(fareOf(w, 0), 9, 'the Village to the Pier: 2 + floor(709 m / 100 m)');
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
        assert.equal(earned(w) - paid, p.riders * 9);
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
    verdict((w) => (w.mut(Train, w.lookup(Train, line2)!)!.riders = TRADE.seats + 1)),
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

test('R3: a full train boards nobody; at railRiderPct 1000 the crowds stay at their cap and no train holds more than its seats', () => {
  // A line 2 train standing at the Village to leave up: fill its seats by hand (boarded raised with it) and crowd the
  // platform; on the next tick nobody boards it.
  const s = { w: copy(FARES.w), t: FARES.t };
  let slot = -1;
  for (let i = 0; i < 3000 && slot < 0; i++) {
    advance(s, 1);
    slot =
      LINE2_SLOTS.find((k) => {
        const r = train(s.w, k);
        return r.phase === TRAIN_PHASE.STAND && r.at === 0 && r.track === 0;
      }) ?? -1;
  }
  assert.ok(slot >= 0, 'a train stands at the Village');
  const r = s.w.mut(Train, s.w.lookup(Train, slot)!)!,
    tw = s.w.mut(Town, s.w.lookup(Town, 0)!)!;
  tw.boarded += TRADE.seats - r.riders;
  r.riders = TRADE.seats;
  tw.wait0 = 5;
  checkTrade(s.w);
  advance(s, 1);
  assert.equal(train(s.w, slot).riders, TRADE.seats, 'still full');
  assert.ok(town(s.w, 0).wait0 >= 5, 'nobody boarded it');
  // A flood of riders: the crowds stop at their cap and the seats hold.
  const w = copy(FARES.w);
  for (let t = FARES.t + 1; t <= FARES.t + 3000; t++) {
    railTick(w, t, undefined, { farePct: 100, riderPct: 1000 });
    assert.ok(
      town(w, 0).wait0 <= TRADE.crowdCap && town(w, 0).wait1 <= TRADE.crowdCap,
      `tick ${t}: a crowd past its cap`,
    );
    assert.ok(
      trains(w).every((x) => x.riders <= TRADE.seats),
      `tick ${t}: a train past its seats`,
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

test('R3: Q7 laid and the rivet move the far end on (hand-set rows): the Railhead at 10, Ring Island at 13', () => {
  // Hand-set on crossing-done: the queries alone (the end, the fare, the cap). The ticked moves are the gate 3
  // harness's test below.
  const w = copy(CROSSED.w);
  const before = JSON.stringify([town(w, 0), tillRow(w), trains(w).map((r) => r.riders)]);
  assert.deepEqual([routeFar(w, 0), fareOf(w, 0)], [3, 9], 'the Pier');
  w.mut(QJob, w.lookup(QJob, Q7)!)!.completion = 1;
  assert.deepEqual([routeFar(w, 0), fareOf(w, 0), boxCap(w, TRADE_PCT)], [4, 10, 1600], 'the Railhead');
  w.mut(Aperture, w.single(Aperture))!.joined = 0;
  assert.deepEqual([routeFar(w, 0), fareOf(w, 0), boxCap(w, TRADE_PCT)], [5, 13, 2080], 'Ring Island');
  assert.equal(JSON.stringify([town(w, 0), tillRow(w), trains(w).map((r) => r.riders)]), before);
  checkTrade(w);
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
  const offAt = [0, 0, 0, 0, 0, 0]; // riders stepped off, by line 2 stop
  const line2 = (w: World) => LINE2_SLOTS.reduce((n, k) => n + train(w, k).riders, 0);
  aboard = line2(w0);
  assert.equal(t0.boarded - t0.alighted, aboard, 'riders aboard at the start');
  const events = playFootings(w0, WAGON.t, 40000, {
    join: 3000,
    onTick: (w, tk) => {
      railwayCheck(w);
      const tw = town(w, 0),
        now = line2(w),
        stepped = tw.alighted - t0.alighted,
        fare = fareOf(w, 0);
      // Every rider is aboard, waiting or stepped off: boarded less stepped off is aboard, every tick.
      assert.equal(tw.boarded - tw.alighted, now, `tick ${tk}: riders aboard`);
      // Each rider stepping off pays one fare (the route's fare that tick), no more and no less.
      assert.equal(earned(w) - paid, stepped * fare, `tick ${tk}: ${stepped} stepped off at ${fare}`);
      // Who stepped off where: the riders stepping off this tick left the line 2 train that arrived this tick.
      const came = LINE2_SLOTS.filter(
        (k, i) => phase[i] === TRAIN_PHASE.RUN && train(w, k).phase === TRAIN_PHASE.STAND,
      );
      if (stepped) {
        assert.equal(came.length, 1, `tick ${tk}: one train arrived as riders stepped off`);
        const at = train(w, came[0]!).at;
        offAt[at] = offAt[at]! + stepped;
      }
      LINE2_SLOTS.forEach((k, i) => (phase[i] = train(w, k).phase));
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
    },
  });
  t.diagnostic(`far end moves: ${moves.join(', ')}; ${events.length} events, the last ${events[events.length - 1]}`);
  assert.deepEqual(
    moves.map((m) => m.split('@')[0]),
    ['3->4', '4->5'],
    'the Pier to the Railhead (Q7 laid), the Railhead to Ring Island (the rivet)',
  );
  assert.ok(
    events.some((x) => x.startsWith('rivet')),
    'the rivet struck',
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

test('R3: income at the first route settles within one fare a minute of min(56, the seat-capped rate)', () => {
  const w = copy(FREIGHT.w),
    e0 = earned(w);
  for (let t = FREIGHT.t + 1; t <= FREIGHT.t + 6000; t++) railTick(w, t);
  const perMin = (earned(w) - e0) / 10;
  assert.ok(Math.abs(perMin - 56) <= fareOf(w, 0), `${perMin} a minute`);
});
