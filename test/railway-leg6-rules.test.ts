import assert from 'node:assert/strict';
import test from 'node:test';
import { Route } from '../src/sim/railway-components.ts';
import { leg as legRow, shed, line, train } from '../src/sim/railway-rows.ts';
import { tableFree } from '../src/sim/railway-queries-works.ts';
import { legYard, routeRow, STOCKED_LEGS, tradeSwapRefusal } from '../src/sim/railway-queries-route.ts';
import { legStagesOn, laySection } from '../src/sim/railway-seed-legs.ts';
import { LINE_SLOTS } from '../src/sim/railway-trains.ts';
import { TRAIN_PHASE } from '../src/sim/railway-train.ts';
import { act, advance, buildSeedWorld, invariant, unaudited } from './helpers/rail.ts';
import { routeRulesShard } from './helpers/railway-route-rules.ts';

routeRulesShard(5);
test('a free re-pick before the ending survives a reload at every ending stage', () => {
  let s = legStagesOn(unaudited(buildSeedWorld('trade-fitted')), 'bay-mid', 'wall-deep');
  for (const [l, part] of [
    [3, 5],
    [2, 6],
  ] as const) {
    advance(s, Math.max(0, tableFree(s.w) - s.t));
    if (shed(s.w).tableLine !== l) {
      assert.equal(act(s, 'a', 'rail.bring', { line: l, revision: shed(s.w).bringRev }), 1);
      advance(s, tableFree(s.w) - s.t);
    }
    assert.equal(act(s, 'a', 'rail.install', { line: l, part, revision: 1 }), 1);
  }
  const stages = [
    'wall-deep',
    'wall-closed',
    'notch-open',
    'notch-reached',
    'causeway-open',
    'island-reached',
    'arrived',
  ] as const;
  for (let i = 1; i < stages.length; i++) {
    s = unaudited(legStagesOn(s, stages[i - 1]!, stages[i]!));
    assert.deepEqual([line(s.w, 2).rev, line(s.w, 3).rev], [2, 2]);
  }
});
test('the two ending kits ride to their racks and a first stop unlocks the meeting', () => {
  const s = legStagesOn(unaudited(buildSeedWorld('gorge-open')), 'gorge-open', 'wall-deep');
  const { w } = s;
  const wait = (done: () => boolean) => {
    for (let ticks = 0; !done(); ticks++) {
      assert.ok(ticks < 8000, 'train delivery or arrival');
      advance(s, 1);
    }
  };
  assert.equal(act(s, 'a', 'rail.gate', { id: 4 }), 0);
  assert.equal(tradeSwapRefusal(w, 3, 1), undefined);
  assert.equal(act(s, 'a', 'rail.gate', { id: 3 }), 1);
  laySection(s, 5);
  const missing = unaudited(s);
  missing.w.mut(Route, missing.w.single(Route))!.grants &= ~(1 << 2);
  assert.equal(act(missing, 'a', 'rail.gate', { id: 4 }), 0);
  assert.equal(tradeSwapRefusal(w, 3, 1), 'trade-building');
  assert.equal(tradeSwapRefusal(w, 2, 1), undefined);
  assert.equal(act(s, 'a', 'rail.grant', { id: 3 }), 0);
  assert.equal(act(s, 'a', 'rail.gate', { id: 5 }), 0);
  assert.ok(!STOCKED_LEGS.includes(6));
  const rack = (k = 6) => [legRow(w, k).rackLogs, legRow(w, k).rackRails];
  assert.deepEqual(rack(), [0, 0]);
  wait(() => LINE_SLOTS[3]!.some((slot) => train(w, slot).legKit && train(w, slot).logs === 6));
  wait(() => rack()[0] === 6 && rack()[1] === 6);
  wait(() => legYard(w, 7).logs === 6 && legYard(w, 7).rails === 6);
  assert.ok(LINE_SLOTS[2]!.every((slot) => !train(w, slot).legKit));
  assert.equal(invariant(w), null);
  assert.equal(act(s, 'a', 'rail.gate', { id: 4 }), 1);
  laySection(s, 6);
  assert.equal(tradeSwapRefusal(w, 3, 1), undefined);
  assert.equal(tradeSwapRefusal(w, 2, 1), 'trade-building');
  assert.deepEqual(rack(), [0, 0]);
  assert.equal(act(s, 'a', 'rail.gate', { id: 5 }), 0);
  assert.equal(act(s, 'a', 'rail.grant', { id: 3 }), 1);
  assert.equal(act(s, 'a', 'rail.gate', { id: 5 }), 1);
  wait(() => LINE_SLOTS[2]!.some((slot) => train(w, slot).legKit && train(w, slot).logs === 6));
  wait(() => rack(7)[0] === 6 && rack(7)[1] === 6);
  laySection(s, 7);
  assert.equal(act(s, 'a', 'rail.arrive'), 0);
  const islandStop = () =>
    LINE_SLOTS[2]!.some((slot) => train(w, slot).at === 3 && train(w, slot).phase === TRAIN_PHASE.STAND);
  wait(islandStop);
  const first = s.t;
  assert.equal(routeRow(w).reached, first);
  wait(() => !islandStop());
  assert.equal(act(s, 'a', 'rail.arrive'), 1);
  assert.equal(act(s, 'a', 'rail.arrive'), 0);
  wait(islandStop);
  assert.equal(routeRow(w).reached, first);
  assert.equal(invariant(w), null);
});
