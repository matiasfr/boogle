// Slice 5's town economy, the lockstep rules (docs/plans/slice5-town-economy.md; src/sim/railway-sys-trade.ts,
// railway-queries-trade.ts, railway-check-trade.ts). R1: the Camp's timber yard and the Quarry's stone yard make
// crates while the trains run, and the trains carry them home to the Village. Determinism, conservation, the caps, no
// freight stop (a train loads only where it already stands), the first timber home, the save round trip and the trade
// check's refusals; R2: the yards' away credit, once per marker, and the plots staked from deliveries.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../src/ecs/index.ts';
import { createRailwayWorld, Town, Train, Yard, YardClock } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { checkTrade } from '../src/sim/railway-check-trade.ts';
import { buildSeedWorld, SEED_STAGES } from '../src/sim/railway-seeds.ts';
import { TRADE_STAGES } from '../src/sim/railway-seed-trade.ts';
import { railTick } from '../src/sim/railway-systems.ts';
import { rail, town, train, trains, yard, yards } from '../src/sim/railway-rows.ts';
import { freightAboard, plotsStaked, plotsStakedOf } from '../src/sim/railway-queries-trade.ts';
import { railResume } from '../src/sim/railway-sys-away.ts';
import { RAIL_AWAY, railAwayCredit } from '../src/sim/railway-away.ts';
import { TRADE } from '../src/sim/railway-trade-layout.ts';
import { LINE2, RAIL_HALTS, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { TRAIN_PHASE } from '../src/sim/railway-train.ts';
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

test('freight never adds a stop: with nothing asked, line 2 trains stand only at the ends for 20 minutes', () => {
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

test('10 minutes, 8 hours and 3 days away fill each yard by whole intervals of the credit, never past its cap', () => {
  for (const away of [10 * 600, 8 * 36000, 3 * 24 * 36000]) {
    // freight-running with both yards part-empty: the Camp at 0 (line 1 took it), the Quarry drained to 0 as well.
    const w = copy(FREIGHT.w),
      tick = FREIGHT.t + 1;
    const q = w.mut(Yard, yardId(w, QUARRY))!;
    q.made -= q.stock;
    q.stock = 0;
    const before = yards(w).map((y) => ({ ...y })),
      credit = railAwayCredit(away);
    resumeAway(w, away, 1_000_000, tick);
    railwayCheck(w);
    yards(w).forEach((y, slot) => {
      const c = TRADE.yards[slot]!,
        n = Math.min(c.cap - before[slot]!.stock, Math.floor(credit / c.everyTicks));
      assert.ok(y.stock <= c.cap, `${away}: yard ${slot} at or under its cap`);
      assert.equal(y.stock, before[slot]!.stock + n, `${away}: yard ${slot} credited ${n}`);
      assert.equal(y.made, before[slot]!.made + n, `${away}: made grows with it`);
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
  const w = copy(ASLEEP.w),
    before = JSON.stringify(yards(w).map((y) => [y.stock, y.made])),
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
});
