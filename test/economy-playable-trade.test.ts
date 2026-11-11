// Owner-requested (11 November): the playable economy prototype's passenger trade (riders, the shared strongbox, the
// first house, seats) held to the trade model's own rules. Offline design arithmetic, not game code. The prototype
// (dev/economy/play-trade.ts, play-sim.ts) calls trade-model.ts's exported rules; these tests replay the model's rooms
// through it and assert the rider income is the same to the last Boogle, so the page and the model cannot drift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playMap } from '../dev/economy/play-map.ts';
import { runWhole, stepDone, createWorld, tick, buyItem, leave, type World } from '../dev/economy/play-sim.ts';
import {
  awayBoogles,
  boxCap,
  buy,
  buyError,
  createTrade,
  policyFor,
  tradeStep,
  type SeatMode,
  type Trade,
} from '../dev/economy/play-trade.ts';
import { POLICIES, catalog, defaultTunables, installSeat, run, type RoomRun } from '../dev/economy/trade-model.ts';
import { routeSpine } from '../dev/economy/trade-route.ts';
import { TOWNS } from '../dev/economy/trade-data.ts';

const spine = routeSpine();
const T = defaultTunables();
const map = playMap();

/** Plays a model room's script through the playable's trade: its steps done, its buys made, its hauled seats installed. */
function replay(r: RoomRun, seats: SeatMode): Trade {
  const tr = createTrade(seats, { seed: r.seed });
  const s = r.script;
  const n = r.series.income.length;
  for (let k = 0; k < n; k++) {
    const finished = s.startSteps + s.completedAt.filter((c) => c < k).length;
    const done = (key: string) => (key === 'end' ? finished >= s.stepKeys.length : s.stepKeys.indexOf(key) < finished);
    tradeStep(tr, done);
    for (const b of r.buys.filter((x) => x.tick === k)) assert.equal(buy(tr, done, b.id), null, `${b.id} at ${k}`);
    for (const h of s.hauled.filter((x) => x.tick === k)) installSeat(tr.rt[h.town], h.step);
  }
  return tr;
}

for (const [id, seats] of [
  ['never', 'haul'],
  ['houses', 'haul'],
  ['sources', 'haul'],
  ['boogleSeats', 'boogles'],
] as const)
  for (const players of [1, 3])
    test(`playable trade: a fixed script's rider income equals the model's (${id}, ${players}p)`, () => {
      const model = run(
        spine,
        T,
        POLICIES.find((p) => p.id === id)!,
        { players },
      );
      const play = replay(model, seats);
      const n = model.series.income.length;
      assert.ok(n > 250, `${n} minutes`);
      assert.equal(play.income.length, n);
      // Exactly the same arithmetic on the same numbers: the same Boogles each minute, not close.
      assert.deepEqual(play.income, model.series.income);
      let total = 0;
      for (const x of play.income) total += x;
      assert.equal(
        total,
        model.series.income.reduce((a, b) => a + b, 0),
      );
      if (id !== 'never') assert.ok(total > 10_000, `${total}`);
    });

test('playable trade: the first house is the Village third cottage plot, at the model price with the house order', () => {
  const haul = catalog(T, policyFor('haul')).find((i) => i.id === 'house.village.1')!;
  const boogles = catalog(T, policyFor('boogles')).find((i) => i.id === 'house.village.1')!;
  assert.equal(haul.price, 300 * T['house.mult.materialSeats']! * T['house.order']! ** 0);
  assert.equal(boogles.price, 300 * T['house.mult.boogleSeats']!);
  const tr = createTrade('haul');
  assert.equal(T['riders.startBuildings'], 2, 'two cottages stand on arrival; the first bought house is the third');
  const opened = (key: string) => key === 'home.line2';
  assert.match(buyError(tr, opened, 'house.village.1') ?? '', /more Boogles/);
  tr.wallet = haul.price;
  assert.equal(buy(tr, opened, 'house.village.1'), null);
  assert.equal(tr.wallet, 0);
  assert.match(buyError(tr, opened, 'house.village.2') ?? '', /Not on offer|more Boogles/);
  // A house brings riders a minute after the buy: the Village goes from 4 riders a minute each way to 6.
  tradeStep(tr, opened);
  const before = tr.last!.towns.village!;
  assert.ok(before);
  tradeStep(tr, opened);
  assert.equal(tr.rt.village.houses, 1);
});

test('playable trade: four or more waiting riders stop a train, three do not', () => {
  const t = { ...T, 'riders.perBuilding': 0.5, 'riders.jitter': 0 }; // one rider a minute
  const tr = createTrade('haul', { tunables: t });
  const opened = (key: string) => key === 'home.line2';
  const carried: number[] = [];
  for (let k = 0; k < 6; k++) {
    tradeStep(tr, opened);
    carried.push(tr.last!.towns.village!.served);
    if (k < 3) assert.equal(tr.rt.village.waiting, k + 1, 'riders wait while fewer than four');
  }
  assert.deepEqual(carried.slice(0, 3), [0, 0, 0]);
  assert.ok(carried[3]! > 0, 'the fourth waiting rider stops the train');
});

test('playable trade: fares past a full strongbox do not land, and the box is never over its size', () => {
  const tr = createTrade('haul');
  const opened = (key: string) => key === 'home.line2';
  for (let k = 0; k < 400; k++) {
    tradeStep(tr, opened);
    assert.ok(tr.wallet <= boxCap(tr, opened) + 1e-6);
  }
  assert.ok(tr.capped > 0, 'with nothing bought, the box fills and fares stop landing');
  assert.ok(Math.abs(tr.earned - tr.wallet - tr.spent) < 1e-6, 'every Boogle earned is held or spent');
});

test('playable trade: nothing earns while the room is empty; a night away credits one capped sack', () => {
  const tr = createTrade('haul');
  const opened = (key: string) => key === 'home.line2';
  assert.equal(awayBoogles(tr, opened, 22), 0, 'before the trade opens, a night credits nothing');
  tr.started = true;
  for (let k = 0; k < 10; k++) tradeStep(tr, opened);
  const wallet = tr.wallet;
  const credit = awayBoogles(tr, opened, 22);
  assert.ok(credit > 0 && credit <= T['sack.min']! * 4 * 7 * 2 + 1e-6, `${credit}`);
  assert.equal(tr.wallet, wallet + credit);
  assert.ok(tr.wallet <= boxCap(tr, opened) + 1e-6);
  assert.equal(tr.minute, 10, 'the night is not minutes of riding');
});

const trade = (seats: SeatMode, autoBuy = true) => ({
  players: 1,
  branchFirst: 'gorge' as const,
  trade: { seats, autoBuy },
});

test('playable trade: in a whole run Boogles come from fares and never convert to or from materials', () => {
  for (const seats of ['haul', 'boogles'] as const) {
    const { world: w } = runWhole(map, { ...trade(seats), limitH: 30 });
    const tr = w.trade!;
    assert.ok(tr.started && tr.minute > 200, `${seats}: ${tr.minute} minutes`);
    assert.ok(Math.abs(tr.earned - (tr.wallet + tr.spent)) < 1e-6, `${seats}: fares are all the Boogles there are`);
    assert.equal(
      tr.spent,
      tr.buys.reduce((s, b) => s + b.price, 0),
    );
    assert.ok(
      tr.buys.some((b) => b.id === 'house.village.1'),
      `${seats}: the first house is bought`,
    );
    // The ring model's old Bucks (surplus sold at the town) are a separate account that no fare ever lands in.
    assert.ok(w.wallet <= w.sold + 1e-6, `${seats}: Bucks only come from surplus sold`);
    if (seats === 'haul') {
      assert.ok(tr.installs.length > 0, 'a crowd is answered by hauling a seat');
      assert.ok(!tr.buys.some((b) => b.id.startsWith('seat.')), 'a seat on materials is not bought with Boogles');
    } else {
      assert.ok(
        tr.buys.some((b) => b.id.startsWith('seat.')),
        'in the variant a seat is bought with Boogles',
      );
      assert.equal(tr.installs.length, tr.buys.filter((b) => b.id.startsWith('seat.')).length);
    }
  }
});

test('playable trade: a world without the trade is the ring model alone, and the trade only adds the hauling for seats', () => {
  const off = runWhole(map, { players: 1, branchFirst: 'gorge' }).summary.mainH;
  const on = runWhole(map, { ...trade('haul'), limitH: 30 }).summary.mainH;
  const boogles = runWhole(map, { ...trade('boogles'), limitH: 30 }).summary.mainH;
  assert.ok(on >= off - 1e-6, `${on} against ${off}`);
  assert.ok(
    Math.abs(boogles - off) < 0.2,
    `seats in Boogles move the route by hauling nothing: ${boogles} against ${off}`,
  );
});

test('playable trade: the Village opens with its line, a house is bought by hand and a crowd asks for seats', () => {
  const w: World = createWorld(map, { players: 1, branchFirst: 'gorge', trade: { seats: 'haul' }, auto: [true] });
  assert.equal(w.tradeAutoBuy, false, 'the page leaves the buying to the player');
  assert.equal(buyItem(w, 'house.village.1'), 'Not on offer yet');
  for (let guard = 0; guard < 400_000 && !stepDone(w)('home.line2'); guard++) tick(w, 1);
  assert.ok(stepDone(w)('home.line2'));
  for (let s = 0; s < 8 * 60 * 60 && w.trade!.wallet < 450; s++) tick(w, 1);
  assert.ok(w.trade!.wallet >= 450, 'fares fill the box to the first house within hours');
  assert.equal(buyItem(w, 'house.village.1'), null);
  assert.equal(w.trade!.spent, 450);
  assert.equal(buyItem(w, 'house.village.1'), 'Not on offer yet', 'a house is bought once');
  assert.ok(w.events.some((e) => e.kind === 'trade' && /Bought House 1/.test(e.text)));
  leave(w, 22);
  assert.ok(w.trade!.wallet <= boxCap(w.trade!, stepDone(w)) + 1e-6);
  assert.ok(TOWNS.length === 5);
});
