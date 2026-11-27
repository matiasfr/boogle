import test from 'node:test';
import assert from 'node:assert/strict';
import { act, advance, buildSeedWorld, chopTo, unaudited } from './helpers/rail.ts';
import { account, rail } from '../src/sim/railway-rows.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { giftAboard, giftQueued, giftRides, worksThanks } from '../src/sim/railway-queries-gift.ts';
import { laySection } from '../src/sim/railway-seed-legs.ts';
import { RAIL_LEGS } from '../src/sim/railway-route.ts';
import type { Seed } from '../src/sim/railway-seed-route.ts';

import { Leg, Rail, Train } from '../src/sim/railway-components.ts';
import { legId, legKitHalt } from '../src/sim/railway-queries-route.ts';
import { legKitArrive } from '../src/sim/railway-sys-route-kit.ts';
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
test('a gift-only surplus returns to Home with no change in minting', () => {
  const s = returned;
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
  m.logs = m.gift = 8;
  m.legKit = true;
  const home = s.w.mut(Rail, s.w.single(Rail))!;
  home.rack -= 8;
  home.giftOut += 8;
  s.w.mut(Leg, legId(s.w, 0))!.loadedLogs += 8;
  railwayCheck(s.w);
  const minted = home.depotProduced;
  legKitArrive(s.w, slot);
  assert.deepEqual([rail(s.w).rack, rail(s.w).giftOut, giftAboard(s.w), rail(s.w).depotProduced], [8, 0, 0, minted]);
  railwayCheck(s.w);
});

const closed = unaudited(buildSeedWorld('leaf-raised'));
test('Home keeps the logs before the first gift leg opens', () => {
  assert.equal(giftRides(closed.w), false);
  give(closed);
  assert.equal(rail(closed.w).rack, 8);
  assert.equal(giftQueued(closed.w), 0);
  assert.deepEqual(worksThanks(closed.w), []);
});
