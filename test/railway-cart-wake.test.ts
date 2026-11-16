import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedWorld, act, advance } from '../src/sim/railway-seeds.ts';
import { restore } from '../src/sim/railway-drive.ts';
import { boiler, cart, rail, works, trains } from '../src/sim/railway-rows.ts';
import { CART_PHASE, cartAlong } from '../src/sim/railway-cart.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';

// The old rule wakes a Village train while the returning cart still occupies its stub.
const base = buildSeedWorld('boiler');
function fitted() {
  const s = { w: restore(base.w), t: base.t };
  assert.equal(act(s, 'a', 'rail.boilerTake', { revision: boiler(s.w).revision }), 1);
  assert.equal(act(s, 'a', 'rail.boilerFit', { revision: boiler(s.w).revision }), 1);
  return s;
}
test('the fitted train and breaker wait through the cart stub, including a saved waiting world', () => {
  const s = fitted();
  assert.notEqual(cart(s.w).phase, CART_PHASE.REST);
  assert.equal(rail(s.w).trains, -1);
  assert.equal(works(s.w).breaker, 0);
  const loaded = { w: restore(s.w), t: s.t };
  let stub = false;
  while (cart(s.w).phase !== CART_PHASE.REST) {
    assert.equal(rail(s.w).trains, -1);
    assert.equal(works(s.w).breaker, 0);
    assert.equal(boiler(s.w).state, 'fitted');
    stub ||= cartAlong(cart(s.w), s.t) > 0;
    railwayCheck(s.w);
    advance(s, 1);
    advance(loaded, 1);
    assert.equal(s.w.hash(), loaded.w.hash());
  }
  assert.ok(stub);
  assert.equal(rail(s.w).trains, s.t);
  assert.equal(works(s.w).breaker, 1);
  assert.ok(trains(s.w).some((t) => t.phase === 0));
  railwayCheck(s.w);
});
test('a fit after the cart rests wakes immediately', () => {
  const s = { w: restore(base.w), t: base.t };
  while (cart(s.w).phase !== CART_PHASE.REST) advance(s, 1);
  act(s, 'a', 'rail.boilerTake', { revision: boiler(s.w).revision });
  act(s, 'a', 'rail.boilerFit', { revision: boiler(s.w).revision });
  assert.equal(rail(s.w).trains, s.t);
  assert.equal(works(s.w).breaker, 1);
  railwayCheck(s.w);
});
