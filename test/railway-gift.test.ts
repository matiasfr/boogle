import test from 'node:test';
import assert from 'node:assert/strict';
import { act, advance, buildSeedWorld, chopTo, unaudited } from './helpers/rail.ts';
import { account, rail } from '../src/sim/railway-rows.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { giftAboard, giftQueued, giftRides, worksThanks } from '../src/sim/railway-queries-gift.ts';
import { laySection } from '../src/sim/railway-seed-legs.ts';
import { RAIL_LEGS } from '../src/sim/railway-route.ts';
import type { Seed } from '../src/sim/railway-seed-route.ts';

import { Leg, Rail, Route, Train } from '../src/sim/railway-components.ts';
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

function give(s: Seed) {
  chopTo(s, 'a', 8);
  const extra = account(s.w, 'a')!.carry - 8;
  if (extra) assert.equal(act(s, 'a', 'rail.drop', { kind: 0, n: extra, x: 100000, y: 2000, z: 3000 }), extra);
  assert.equal(act(s, 'a', 'rail.haltPut', { yard: 0, kind: 0 }), 8);
}
for (const [stage, name] of [
  ['ring-joined', 'stack'],
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
  assert.equal(legRow(s.w, 0).loadedLogs, loaded + 8);
  assert.equal(legRow(s.w, 0).rackLogs, 20);
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
  assert.deepEqual([rail(s.w).rack, giftAboard(s.w), rail(s.w).giftOut], [0, 0, 8]);
  assert.deepEqual([legRow(s.w, 0).logs, legRow(s.w, 0).rackLogs, legRow(s.w, 0).loadedLogs], [8, 20, loaded]);
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
