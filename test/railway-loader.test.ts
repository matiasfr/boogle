// L1: the loader's conserved transfers, cargo exclusivity and room/prediction continuity.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  account,
  act,
  advance,
  aperture,
  apply,
  buildSeedWorld,
  check,
  rail,
  restore,
  town,
  train,
  trains,
  works,
  type Seed,
} from './helpers/rail.ts';
import { Forge, Plot, Till, Train, Works } from '../src/sim/railway-components.ts';
import { TRADE } from '../src/sim/railway-trade-layout.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import { LINE2_STATIONS, Q7 } from '../src/sim/railway-line2-layout.ts';
import {
  loaderBuilt,
  loaderOn,
  plotPrice,
  townBuildings,
  footCarrier,
  deckHeld,
} from '../src/sim/railway-queries-trade.ts';
import { aboard, stopsOf } from '../src/sim/railway-queries.ts';
import { footingTotal } from '../src/sim/railway-queries-works.ts';
import { checkTrade } from '../src/sim/railway-check-trade.ts';
import { railPredict } from '../src/world/railway-predict.ts';
import { railRoom } from './helpers/rail-room.ts';
import { TRAIN_PHASE } from '../src/sim/railway-train.ts';
import { freightLoads } from '../src/sim/railway-sys-trade.ts';
import { steelLoads, steelArrives } from '../src/sim/railway-sys-steel.ts';
import { legKitLoad } from '../src/sim/railway-sys-route-kit.ts';
import { townHas, townRead } from '../src/sim/town-facts.ts';
import { railwayAtWorks } from '../src/sim/railway-seed-works.ts';
import { railwayAtRing } from '../src/sim/railway-seed-ring.ts';

// Keep accepted fixture construction outside the individual unit-test budget, as golden shards do. yard-wagon and
// yard-deck are built here as buildSeedWorld builds them (src/sim/railway-seeds.ts), on one yard-built world instead of
// two: the Works and ring builders restore their source and never write it.
const YARD_BUILT = buildSeedWorld('yard-built'),
  YARD = railwayAtWorks('wagon-on', YARD_BUILT),
  DECK = railwayAtRing('deck-laid', YARD_BUILT),
  WAGON = buildSeedWorld('wagon-on');
const KIT_BASES = {
  'ring-joined': buildSeedWorld('ring-joined'),
  'steel-lit': buildSeedWorld('steel-lit'),
};
const copy = (s: Seed): Seed => ({ w: restore(s.w), t: s.t });
function until(s: Seed, done: () => boolean, limit = 4000) {
  for (let n = 0; !done(); n++) {
    assert.ok(n < limit, 'bounded progress');
    advance(s, 1);
  }
}
function conserved(s: Seed) {
  assert.equal(footingTotal(s.w), works(s.w).poured);
  checkTrade(s.w, s.t);
}
function buyYard(s: Seed) {
  const cost = plotPrice(s.w, 0, 1, 50),
    b = s.w.mut(Till, s.w.single(Till))!;
  // Only funding is supplied; the bought row and construction clock come from the accepted op.
  b.boogles += cost;
  b.poured += cost;
  assert.equal(act(s, 'a', 'rail.buy', { id: 1 }), 1);
}

test('L1: yard completion needs the wagon; yard first adds no neighbours, demand or fares', () => {
  const s = buildSeedWorld('fares-running');
  until(s, () => town(s.w, 0).wood >= 24);
  const before = plotPrice(s.w, 0, 0, 50);
  buyYard(s);
  const at = s.t;
  assert.equal(loaderBuilt(s.w, at + TRADE.buildTicks - 1), false);
  assert.equal(loaderBuilt(s.w, at + TRADE.buildTicks), true, 'paint changes before coupling');
  assert.equal(loaderOn(s.w, at + TRADE.buildTicks - 1), false);
  assert.equal(loaderOn(s.w, at + TRADE.buildTicks), false, 'not coupled');
  assert.equal(townBuildings(s.w, 0, at + TRADE.buildTicks), 2);
  assert.equal(townHas(townRead(s.w, at + TRADE.buildTicks), 'town'), false);
  const price = plotPrice(s.w, 0, 0, 50);
  assert.ok(price > before, 'the yard raises the next price');
  const b = s.w.mut(Till, s.w.single(Till))!;
  b.boogles += price;
  b.poured += price;
  assert.equal(act(s, 'a', 'rail.buy', { id: 0 }), 1);
  assert.equal(townHas(townRead(s.w, at + TRADE.buildTicks), 'town'), true);
  const coupled = copy(YARD),
    p = coupled.w.mut(Plot, coupled.w.lookup(Plot, 1)!)!;
  p.at = coupled.t;
  assert.equal(loaderOn(coupled.w, coupled.t + TRADE.buildTicks - 1), false);
  assert.equal(loaderOn(coupled.w, coupled.t + TRADE.buildTicks), true);
});

test('L1: pier twelve in 135 seconds, then stone for plot 3 and Q7 kit cannot starve', (t) => {
  const s = copy(YARD),
    start = s.t;
  let nonWagon = false;
  while (works(s.w).pierSet < WORKS.pier) {
    assert.ok(s.t - start <= 1350, 'pier delivery within 135 s');
    advance(s, 1);
    conserved(s);
    nonWagon ||= trains(s.w).some((r) => !r.wagon && r.foot > 0);
    assert.ok(works(s.w).pierRack + works(s.w).pierSet + aboard(s.w, 'foot') <= WORKS.pier, 'all carriers counted');
    while (works(s.w).pierRack) {
      assert.equal(act(s, 'a', 'rail.footTake', { rack: 1 }), 1);
      assert.equal(act(s, 'a', 'rail.footSet', { site: 2 }), 1);
    }
  }
  assert.ok(nonWagon);
  assert.equal(aboard(s.w, 'foot'), 0);
  t.diagnostic(`pier twelve set with instant carrying: ${(s.t - start) / 10} s`);
  const [logs, rails] = LINE2_STATIONS[Q7]!.bill;
  until(s, () => town(s.w, 0).stone >= 16 && rail(s.w).depot >= logs && rail(s.w).depotRails >= rails, 8000);
  assert.equal(aboard(s.w, 'foot'), 0, 'between pier and Q7 all decks free');
  assert.equal(check(s.w), null);
});

test('L1: ring eighteen in 200 seconds; conservation every tick and no surplus aboard', (t) => {
  const s = copy(DECK),
    start = s.t;
  while (aperture(s.w).set + aperture(s.w).cw < WORKS.ring + WORKS.counterweight) {
    assert.ok(s.t - start <= 2000, 'ring delivery within 200 s');
    advance(s, 1);
    conserved(s);
    if (aperture(s.w).rack) {
      if (aperture(s.w).brace === 0 && aperture(s.w).set === WORKS.ring) act(s, 'a', 'rail.brace');
      assert.equal(act(s, 'a', 'rail.footTake', { rack: 2 }), 1);
      const n = act(s, 'a', 'rail.footSet', { site: 3 });
      assert.equal(n, 1);
    }
  }
  assert.equal(aboard(s.w, 'foot'), 0);
  t.diagnostic(`ring eighteen set with instant carrying: ${(s.t - start) / 10} s`);
});

test('L1: existing owed/aboard footings stay put when the yard completes; deterministic mid-load reload', () => {
  const s = copy(WAGON);
  until(s, () => aboard(s.w, 'foot') > 0 && town(s.w, 0).wood >= 24);
  const old = trains(s.w).find((r) => r.wagon)!;
  buyYard(s);
  assert.equal(train(s.w, old.slot).foot, old.foot);
  const back = copy(s);
  for (let i = 0; i < 1800; i++) {
    advance(s, 1);
    advance(back, 1);
    conserved(s);
    assert.equal(s.w.hash(), back.w.hash());
  }
  assert.equal(works(s.w).pierRack, WORKS.pier);
  assert.equal(aboard(s.w, 'foot'), 0);
});

test('L1: non-wagon mid-load snapshot resumes without loss, duplication or deadlock', () => {
  const s = copy(YARD);
  until(s, () => trains(s.w).some((r) => !r.wagon && r.foot > 0));
  const back = copy(s);
  for (let n = 0; n < 1800; n++) {
    advance(s, 1);
    advance(back, 1);
    conserved(s);
    assert.equal(s.w.hash(), back.w.hash());
  }
  assert.equal(works(s.w).pierRack, WORKS.pier);
  assert.equal(aboard(s.w, 'foot'), 0);
});

test('L1: a late join and reconnect receive every carrier; rail.footSet clone matches server with non-wagon footings', () => {
  const s = copy(YARD);
  until(s, () => trains(s.w).some((r) => !r.wagon && r.foot > 0));
  const room = railRoom(s),
    resident = room.join('a', 'a');
  room.ready();
  const late = room.join('b', 'b');
  room.ready();
  for (const client of [resident, late]) {
    assert.deepEqual(trains(client.adapter.read.world()), trains(s.w));
    assert.ok(loaderOn(client.adapter.read.world(), client.adapter.read.tick()));
  }
  resident.disconnect();
  resident.reconnect();
  room.ready();
  assert.deepEqual(trains(resident.adapter.read.world()), trains(s.w));
  // Once the wagon has unloaded, the other carrier is still coming. Taking from the Pier
  // frees one owed place; taking an extra from Works must be refused (already fully allocated).
  until(s, () => works(s.w).pierRack > 0 && works(s.w).rack > 0);
  assert.ok(trains(s.w).some((r) => !r.wagon && r.foot > 0));
  for (const rack of [0, 1]) {
    const server = copy(s);
    assert.equal(act(server, 'a', 'rail.footTake', { rack }), 1);
    const a = account(server.w, 'a')!,
      e = { op: 'rail.footSet', epoch: a.epoch, request: a.request + 1, site: 2 };
    const predicted = restore(server.w),
      result = railPredict(predicted, 'a', e, server.t);
    assert.equal(result.n, rack, 'extra Works footing refuses; Pier footing accepts');
    assert.equal(result.n, apply(server.w, 'a', e, server.t).accepted);
    assert.equal(account(predicted, 'a')!.foot, account(server.w, 'a')!.foot);
    assert.equal(works(predicted).pierSet, works(server.w).pierSet);
    assert.equal(aboard(predicted, 'foot'), aboard(server.w, 'foot'));
    conserved(server);
  }
});

// Directed transfer fixtures isolate cargo guards; the natural-route cases above assert whole-world validity.
function arriving(s: Seed, slot: number, at: number, track: number) {
  const dest = stopsOf(s.w, 1)[at]!;
  Object.assign(s.w.mut(Train, s.w.lookup(Train, slot)!)!, {
    phase: TRAIN_PHASE.RUN,
    at: track ? at + 1 : at - 1,
    to: at,
    from: dest,
    dest,
    v0: 0,
    track,
    depart: s.t,
    arrived: s.t,
    turn: false,
    origin: 0,
    req: 0,
  });
}
test('L1: same-tick quarry arrivals load in slot order, cap total owed; homeward decks keep stone', () => {
  const s = copy(YARD),
    slots = [1, 2];
  for (const slot of slots) arriving(s, slot, 1, 0);
  advance(s, 1);
  assert.equal(train(s.w, 1).foot, 6);
  assert.equal(train(s.w, 2).foot, 0, 'lower slot emptied the rack first');
  s.w.mut(Works, s.w.single(Works))!.rack = 6;
  s.w.mut(Works, s.w.single(Works))!.pierRack = 4;
  arriving(s, 2, 1, 0);
  advance(s, 1);
  assert.equal(train(s.w, 2).foot, 2, 'two aboard counts leave only two owed');
  const home = copy(YARD),
    slot = trains(home.w).find((r) => r.slot > 0 && r.phase !== TRAIN_PHASE.SHED && !r.wagon)!.slot;
  home.w.mut(Train, home.w.lookup(Train, slot)!)!.freight = 4;
  arriving(home, slot, 1, 1);
  advance(home, 1);
  assert.equal(train(home.w, slot).foot, 0);
  assert.ok(train(home.w, slot).freight >= 4);
  assert.equal(footCarrier(home.w, train(home.w, slot), home.t), false);
});

test('L1: non-wagon footings refuse stone, Q kit, steel and leg kit; wagon keeps kit capacity', () => {
  const s = copy(YARD),
    slot = trains(s.w).find((r) => r.slot > 0 && r.phase !== TRAIN_PHASE.SHED && !r.wagon)!.slot;
  const r = s.w.mut(Train, s.w.lookup(Train, slot)!)!;
  Object.assign(r, { foot: 6, logs: 0, rails: 0, steel: 0, freight: 0, at: 1, track: 1, phase: TRAIN_PHASE.STAND });
  assert.ok(deckHeld(r));
  freightLoads(s.w, slot);
  assert.equal(train(s.w, slot).freight, 0);
  // Q6 still wants a kit in this directed pre-Q6 world; the wagon owns a separate load deck.
  const q = buildSeedWorld('trains-on');
  for (const k of [1, 2]) {
    Object.assign(q.w.mut(Train, q.w.lookup(Train, k)!)!, {
      at: 0,
      to: 0,
      from: stopsOf(q.w, 1)[0],
      dest: stopsOf(q.w, 1)[0],
      track: 0,
      phase: TRAIN_PHASE.STAND,
      depart: q.t,
      foot: 6,
      wagon: k === 2,
      logs: 0,
      rails: 0,
    });
  }
  q.w.mut(Forge, q.w.single(Forge))!.rack = 32;
  advance(q, 1);
  assert.equal(train(q.w, 1).logs + train(q.w, 1).rails, 0);
  assert.ok(train(q.w, 2).logs + train(q.w, 2).rails > 0);
  for (const stage of ['ring-joined', 'steel-lit'] as const) {
    const k = copy(KIT_BASES[stage]),
      id = k.w.lookup(Train, 1)!;
    Object.assign(k.w.mut(Train, id)!, { foot: 6, wagon: false, logs: 0, rails: 0, steel: 0, legKit: false, at: 0 });
    steelLoads(k.w, id);
    legKitLoad(k.w, 1, k.t);
    assert.equal(train(k.w, 1).logs + train(k.w, 1).rails, 0);
    k.w.mut(Train, id)!.at = 5;
    steelArrives(k.w, k.w.mut(Train, id)!);
    assert.equal(train(k.w, 1).steel, 0);
    Object.assign(k.w.mut(Train, id)!, { wagon: true, at: 0 });
    steelLoads(k.w, id);
    legKitLoad(k.w, 1, k.t);
    assert.ok(train(k.w, 1).logs + train(k.w, 1).rails > 0, `${stage}: wagon can take kit`);
  }
});

test('L1: loader save invariants reject early, overloaded, mixed and wrong-line cargo', () => {
  for (const change of [
    (s: Seed) => {
      s.w.mut(Plot, s.w.lookup(Plot, 1)!)!.at = s.t;
    },
    (s: Seed) => {
      s.w.mut(Train, s.w.lookup(Train, 2)!)!.foot = 7;
    },
    (s: Seed) => {
      s.w.mut(Train, s.w.lookup(Train, 2)!)!.logs = 1;
    },
    (s: Seed) => {
      s.w.mut(Train, s.w.lookup(Train, 0)!)!.foot = 1;
    },
  ]) {
    const s = copy(YARD);
    Object.assign(s.w.mut(Train, s.w.lookup(Train, 2)!)!, { foot: 6, wagon: false });
    change(s);
    assert.throws(() => checkTrade(s.w, s.t), /loader cargo/);
  }
});
