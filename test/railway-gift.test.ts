import test from 'node:test';
import assert from 'node:assert/strict';
import { act, advance, buildSeedWorld, chopTo, unaudited } from './helpers/rail.ts';
import { account, boiler, cart, qjob, rail, steel, works } from '../src/sim/railway-rows.ts';
import { CART_PHASE } from '../src/sim/railway-cart.ts';
import { workAboard, workNeed } from '../src/sim/railway-queries-gift.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { giftAboard, giftQueued, giftRides, worksThanks } from '../src/sim/railway-queries-gift.ts';
import { laySection } from '../src/sim/railway-seed-legs.ts';
import { RAIL_LEGS } from '../src/sim/railway-route.ts';
import type { Seed } from '../src/sim/railway-seed-route.ts';

import { Leg, LegYard, Rail, Route, Train } from '../src/sim/railway-components.ts';
import {
  legId,
  legKitCarriers,
  legKitDrop,
  legKitHalt,
  legKitNeed,
  legRow,
  routeId,
} from '../src/sim/railway-queries-route.ts';
import { legKitArrive, legKitLoad } from '../src/sim/railway-sys-route-kit.ts';
import { LINE2 } from '../src/sim/railway-lines.ts';
import { LINE_SLOTS } from '../src/sim/railway-trains.ts';
import { TRAIN_PHASE } from '../src/sim/railway-train.ts';
import { train } from '../src/sim/railway-rows.ts';

for (const [stage, k, expected] of [
  ['incline-open', 1, 8],
  ['incline-mid', 1, 8],
  ['causeway-open', 7, 6],
] as const) {
  const base = unaudited(buildSeedWorld(stage));
  test(stage + ' delivers a Home gift to the yard leg', () => {
    const s = unaudited(base);
    give(s);
    assert.deepEqual(worksThanks(s.w), ['a']);
    let yardMark = 0;
    for (let ticks = 0; legRow(s.w, k).logs < expected; ticks++) {
      assert.ok(ticks < 24000, 'gift reaches the frame');
      advance(s, 1);
      const yard = s.w.get(LegYard, s.w.lookup(LegYard, 0)!)!;
      if (stage === 'causeway-open' && !yardMark && yard.gift === expected) {
        const rejoined = unaudited(s);
        assert.equal(rejoined.w.hash(), s.w.hash());
        chopTo(rejoined, 'b', expected);
        const before = rail(rejoined.w).rack;
        assert.ok(act(rejoined, 'b', 'rail.legStock', { leg: k }) >= expected);
        assert.equal(legRow(rejoined.w, k).logs, expected);
        assert.equal(rail(rejoined.w).rack, before + expected);
        assert.equal(rail(rejoined.w).giftOut, 0);
        railwayCheck(rejoined.w);
      }
      yardMark = Math.max(yardMark, yard.gift);
      railwayCheck(s.w);
    }
    assert.equal(yardMark, stage === 'incline-open' ? 0 : expected);
    assert.equal(legRow(s.w, k).logs, expected);
    assert.equal(rail(s.w).giftOut, 0);
    assert.equal(rail(s.w).rack, 8 - expected);
  });
}

test('the first Q6 kit substitutes eight donated logs and survives a checkpoint before hand feeding', () => {
  const s = unaudited(buildSeedWorld('boiler'));
  chopTo(s, 'a', 8);
  for (let i = 0; cart(s.w).phase !== CART_PHASE.REST; i++) {
    assert.ok(i < 3000);
    advance(s, 1);
  }
  assert.equal(act(s, 'b', 'rail.boilerTake', { revision: boiler(s.w).revision }), 1);
  assert.equal(act(s, 'b', 'rail.boilerFit', { revision: boiler(s.w).revision }), 1);
  assert.equal(workNeed(s.w, 2), 32);
  give(s);
  assert.deepEqual(worksThanks(s.w, 2), ['a']);
  assert.deepEqual(worksThanks(s.w, 1), []);
  const before = rail(s.w).depotProduced;
  for (let i = 0; !workAboard(s.w, 2); i++) {
    assert.ok(i < 100);
    advance(s, 1);
    railwayCheck(s.w);
  }
  assert.equal(workAboard(s.w, 2), 8);
  assert.equal(rail(s.w).depotProduced - before, 24);
  const restored = unaudited(s);
  for (let i = 0; workAboard(s.w, 2); i++) {
    assert.ok(i < 4000);
    advance(s, 1);
    advance(restored, 1);
    railwayCheck(s.w);
  }
  assert.equal(restored.w.hash(), s.w.hash());
  assert.equal(rail(s.w).depotGiftDelivered, 8);
  assert.equal(rail(s.w).depot, 32);
  assert.equal(qjob(s.w, 5).stock, 0);
  assert.ok(act(s, 'b', 'rail.depotTake') >= 8);
  assert.equal(act(s, 'b', 'rail.deposit', { station: 'Q6', kind: 0, n: 8 }), 8);
  assert.equal(qjob(s.w, 5).stock, 8);
  assert.deepEqual(worksThanks(s.w, 2), ['a', 'b']);
});

for (const [stage, stop] of [
  ['crossing-done', 3],
  ['ring-joined', 5],
] as const) {
  test(stage + ' pins the Village load through a racing hand feed', () => {
    const s = unaudited(buildSeedWorld(stage));
    give(s);
    assert.deepEqual(worksThanks(s.w, stop), ['a']);
    const originalRack = rail(s.w).rack;
    for (let i = 0; workAboard(s.w, stop) !== 8; i++) {
      assert.ok(i < 4000);
      advance(s, 1);
      railwayCheck(s.w);
    }
    // A second service sees the first car's reservation even when the last load exhausted demand.
    assert.equal(workNeed(s.w, stop), 0);
    const delivered = unaudited(s);
    const qty = stop === 5 ? 8 : 20;
    for (let i = 0; workAboard(delivered.w, stop); i++) {
      assert.ok(i < 4000);
      advance(delivered, 1);
      railwayCheck(delivered.w);
    }
    if (stop === 5) {
      assert.equal(steel(delivered.w).giftDelivered, 8);
      assert.equal(steel(delivered.w).yardLogs, 8);
      assert.equal(steel(delivered.w).logs, 0);
    } else {
      assert.equal(rail(delivered.w).depotGiftDelivered, 8);
      assert.equal(rail(delivered.w).depot, 20);
      assert.equal(qjob(delivered.w, 6).stock, 0);
    }
    let fed = 0;
    while (fed < qty) {
      chopTo(s, 'b', Math.min(8, qty - fed));
      const moved =
        stop === 5 ? act(s, 'b', 'rail.steel') : act(s, 'b', 'rail.deposit', { station: 'Q7', kind: 0, n: qty - fed });
      assert.ok(moved > 0);
      fed += moved;
    }
    for (let i = 0; workAboard(s.w, stop); i++) {
      assert.ok(i < 6000);
      advance(s, 1);
      railwayCheck(s.w);
    }
    assert.equal(rail(s.w).rack, originalRack);
    if (stop === 5) {
      assert.equal(steel(s.w).logs, 8);
      assert.equal(steel(s.w).giftDelivered, 0);
    } else {
      assert.equal(qjob(s.w, 6).stock, 20);
      assert.equal(rail(s.w).depotGiftDelivered, 0);
    }
    assert.equal(works(s.w).lit >= 0, true);
  });
}

test('a stocked Q6 depot leaves a Village deposit available at Home', () => {
  const s = unaudited(buildSeedWorld('q6-stocked'));
  assert.equal(rail(s.w).depot, 32);
  assert.equal(giftRides(s.w), false);
  give(s);
  assert.equal(rail(s.w).rack, 8);
  assert.equal(workAboard(s.w, 2), 0);
  assert.deepEqual(worksThanks(s.w, 2), []);
  assert.equal(act(s, 'b', 'rail.rackTake', { kind: 0 }), 8);
  railwayCheck(s.w);
});

function give(s: Seed) {
  chopTo(s, 'a', 8);
  const extra = account(s.w, 'a')!.carry - 8;
  if (extra) assert.equal(act(s, 'a', 'rail.drop', { kind: 0, n: extra, x: 100000, y: 2000, z: 3000 }), extra);
  assert.equal(act(s, 'a', 'rail.haltPut', { yard: 0, kind: 0 }), 8);
}
for (const [stage, name] of [
  ['steel-kit', 'stack'],
  ['wall-mid', 'wall'],
] as const) {
  const base = unaudited(buildSeedWorld(stage));
  test(stage + ' replaces eight minted logs with eight from Home', () => {
    const s = unaudited(base);
    const control = unaudited(base);
    const k = RAIL_LEGS.findIndex((leg) => leg.id === name);
    give(s);
    assert.deepEqual(worksThanks(s.w), ['a']);
    assert.equal(giftQueued(s.w), 8);
    for (let ticks = 0; !giftAboard(s.w); ticks++) {
      assert.ok(ticks < 6000, 'a train loads the logs');
      advance(s, 1);
      advance(control, 1);
      railwayCheck(s.w);
    }
    assert.equal(giftAboard(s.w, RAIL_LEGS[k]!.line), 8);
    assert.equal(rail(s.w).rack, 0);
    assert.equal(rail(s.w).giftOut, 8);
    assert.equal(rail(control.w).depotProduced - rail(s.w).depotProduced, 8);
    if (name === 'stack') {
      chopTo(s, 'b', 1);
      assert.ok(act(s, 'b', 'rail.legStock', { leg: k }) > 0);
      assert.deepEqual(worksThanks(s.w), ['a', 'b']);
      for (let section = 0; section < RAIL_LEGS[k]!.sections.length; section++) {
        laySection(s, k, (seed, ticks) => {
          advance(seed, ticks);
          railwayCheck(seed.w);
        });
        assert.deepEqual(worksThanks(s.w), []);
      }
    }
  });
}
// At wall-mid the Stack is complete. Reconstruct a returning train carrying eight surplus gifts.
const returned = unaudited(buildSeedWorld('wall-mid'));
for (const gift of [0, 8])
  test('eight surplus logs return with ' + gift + ' gifts', () => {
    const s = unaudited(returned);
    const standing = () =>
      LINE_SLOTS[LINE2]!.find((slot) => {
        const t = train(s.w, slot);
        return t.phase === TRAIN_PHASE.STAND && t.at === legKitHalt(LINE2) && !t.logs && !t.rails;
      });
    for (let i = 0; standing() === undefined; i++) {
      assert.ok(i < 4000);
      advance(s, 1);
    }
    give(s);
    const slot = standing()!;
    const m = s.w.mut(Train, s.w.lookup(Train, slot)!)!;
    m.logs = 8;
    m.gift = gift;
    m.legKit = true;
    const home = s.w.mut(Rail, s.w.single(Rail))!;
    home.rack -= gift;
    home.giftOut += gift;
    home.depotProduced += 8 - gift;
    s.w.mut(Leg, legId(s.w, 0))!.loadedLogs += 8;
    railwayCheck(s.w);
    const minted = home.depotProduced;
    legKitArrive(s.w, slot, s.t);
    assert.deepEqual(
      [rail(s.w).rack, rail(s.w).giftOut, giftAboard(s.w), rail(s.w).depotProduced],
      [8, 0, 0, minted - (8 - gift)],
    );
    railwayCheck(s.w);
  });

const finalSection = unaudited(buildSeedWorld('gorge-mid'));
laySection(finalSection);
for (let ticks = 0; legRow(finalSection.w, 0).rackLogs !== 20; ticks++) {
  assert.ok(ticks < 6000, 'last Stack kit racked');
  advance(finalSection, 1);
}
test('a gift tops up a train when the Stack owes no more kit', () => {
  const s = unaudited(finalSection);
  assert.deepEqual(legKitNeed(s.w, 0), { logs: 0, rails: 0 });
  give(s);
  const loaded = legRow(s.w, 0).loadedLogs;
  for (let ticks = 0; !legRow(s.w, 0).logs; ticks++) {
    assert.ok(ticks < 6000);
    advance(s, 1);
    railwayCheck(s.w);
  }
  assert.equal(legRow(s.w, 0).logs, 8);
  assert.equal(legRow(s.w, 0).loadedLogs, loaded);
  assert.equal(legRow(s.w, 0).rackLogs, 20);
});
test('spent gifts are not refunded from the final minted rack', () => {
  const s = unaudited(finalSection);
  give(s);
  for (let i = 0; !legRow(s.w, 0).logs; i++) {
    assert.ok(i < 6000);
    advance(s, 1);
  }
  while (legRow(s.w, 0).logs < 20) {
    chopTo(s, 'b', 8);
    assert.ok(act(s, 'b', 'rail.legStock', { leg: 0 }) > 0);
  }
  for (let i = 0; legRow(s.w, 0).start < 0; i++) {
    assert.ok(i < 30);
    act(s, 'b', 'rail.depotRailTake', { leg: 0 });
    act(s, 'b', 'rail.legStock', { leg: 0 });
  }
  const laid = legRow(s.w, 0).laid;
  for (let i = 0; legRow(s.w, 0).laid === laid; i++) {
    assert.ok(i < 1000);
    advance(s, 1);
    railwayCheck(s.w);
  }
  assert.equal(rail(s.w).rack, 0);
});
test('mint loading respects the remaining single-log reservation', () => {
  const s = unaudited(buildSeedWorld('steel-kit'));
  const row = s.w.mut(Leg, legId(s.w, 0))!;
  const bill = RAIL_LEGS[0]!.sections[row.laid]!.logs;
  while (legRow(s.w, 0).logs < bill - 1) {
    chopTo(s, 'b', 1);
    const extra = account(s.w, 'b')!.carry - 1;
    if (extra)
      act(s, 'b', 'rail.drop', {
        kind: 0,
        n: extra,
        x: 100000,
        y: 2000,
        z: 3000,
      });
    assert.ok(act(s, 'b', 'rail.legStock', { leg: 0 }) > 0);
  }
  give(s);
  for (let i = 0; !giftAboard(s.w); i++) {
    assert.ok(i < 6000);
    advance(s, 1);
  }
  assert.equal(giftAboard(s.w), 1);
  assert.equal(rail(s.w).rack, 7);
  assert.equal(giftQueued(s.w), 0);
});

const saturated = unaudited(buildSeedWorld('gorge-open'));
advance(saturated, 2000);
test('a full Stack carrier exchanges eight minted logs and pours them at the frame', () => {
  const s = unaudited(saturated);
  give(s);
  const minted = rail(s.w).depotProduced,
    loaded = legRow(s.w, 0).loadedLogs;
  let exchanged = false;
  for (let ticks = 0; !legRow(s.w, 0).logs; ticks++) {
    assert.ok(ticks < 6000, 'gift reached the frame');
    advance(s, 1);
    assert.ok(legKitCarriers(s.w, LINE2) <= 2);
    for (const slot of LINE_SLOTS[LINE2]!) assert.ok(train(s.w, slot).logs <= 20);
    if (giftAboard(s.w, LINE2) === 8) exchanged = true;
    railwayCheck(s.w);
  }
  assert.ok(exchanged);
  assert.deepEqual([rail(s.w).rack, giftAboard(s.w), rail(s.w).giftOut], [0, 0, 0]);
  assert.deepEqual([legRow(s.w, 0).logs, legRow(s.w, 0).rackLogs, legRow(s.w, 0).loadedLogs], [8, 20, loaded - 8]);
  assert.equal(rail(s.w).depotProduced, minted - 8);
});
test('two carriers reserve one bill and respect a later hand-feed', () => {
  const s = unaudited(saturated);
  const carriers = LINE_SLOTS[LINE2]!.filter((slot) => train(s.w, slot).legKit);
  assert.equal(carriers.length, 2);
  // Exercise both visits on the same tick, preserving the timetable for the load check.
  function visit(slot: number, at: number, action: () => void) {
    const id = s.w.lookup(Train, slot)!,
      old = train(s.w, slot).at;
    s.w.mut(Train, id)!.at = at;
    action();
    s.w.mut(Train, id)!.at = old;
  }
  give(s);
  visit(carriers[0]!, legKitHalt(LINE2), () => legKitLoad(s.w, carriers[0]!, s.t));
  give(s);
  give(s);
  visit(carriers[1]!, legKitHalt(LINE2), () => legKitLoad(s.w, carriers[1]!, s.t));
  assert.deepEqual(
    carriers.map((slot) => train(s.w, slot).gift),
    [8, 12],
  );
  assert.equal(rail(s.w).rack, 4);
  chopTo(s, 'b', 1);
  const hand = act(s, 'b', 'rail.legStock', { leg: 0 });
  assert.ok(hand > 0 && hand <= 12);
  for (const slot of carriers) visit(slot, legKitDrop(s.w, LINE2, 0), () => legKitArrive(s.w, slot, s.t));
  assert.equal(legRow(s.w, 0).logs, 20);
  assert.equal(legRow(s.w, 0).rackLogs, 20);
  assert.equal(giftAboard(s.w, LINE2), hand);
  for (const slot of carriers) visit(slot, legKitHalt(LINE2), () => legKitArrive(s.w, slot, s.t));
  assert.equal(rail(s.w).rack, 4 + hand);
  assert.equal(giftAboard(s.w, LINE2), 0);
  railwayCheck(s.w);
});
const wall = unaudited(buildSeedWorld('wall-deep'));
test('a gift completing the Wall bill observes the barrier', () => {
  const k = RAIL_LEGS.findIndex((l) => l.id === 'wall');
  for (const open of [false, true]) {
    const s = unaudited(wall);
    const row = s.w.mut(Leg, legId(s.w, k))!,
      bill = RAIL_LEGS[k]!.sections[row.laid]!;
    row.logs = bill.logs - 1;
    row.rails = bill.rails;
    if (open) s.w.mut(Route, routeId(s.w))!.gates |= 1 << bill.gate!;
    const line = RAIL_LEGS[k]!.line,
      slot = LINE_SLOTS[line]![0]!;
    const car = s.w.mut(Train, s.w.lookup(Train, slot)!)!;
    car.logs = car.gift = 1;
    car.rails = 0;
    car.legKit = true;
    car.at = legKitDrop(s.w, line, k);
    legKitArrive(s.w, slot, s.t);
    assert.equal(legRow(s.w, k).logs, bill.logs);
    assert.equal(legRow(s.w, k).start, open ? s.t : -1);
  }
});
const closed = unaudited(buildSeedWorld('leaf-raised'));
test('Home keeps the logs before the first gift leg opens', () => {
  assert.equal(giftRides(closed.w), false);
  give(closed);
  assert.equal(rail(closed.w).rack, 8);
  assert.equal(giftQueued(closed.w), 0);
  assert.deepEqual(worksThanks(closed.w), []);
});
