// The depot cart's real trip (docs/plans/line2-part2-greybox.md, B3): its pose is a pure function of its phase and
// the tick, each transfer is one atomic step that conserves logs and rails, an empty forge keeps it waiting, and the
// away credit counts its loads.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CART,
  CART_PHASE,
  CART_ROAD,
  cartAlong,
  cartCycleTicks,
  cartEnd,
  legAlong,
  legTicks,
  type RailCart,
} from '../src/sim/railway-cart.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { RAILWAY_SUPPLY } from '../src/sim/railway-layout.ts';
import {
  account,
  apply,
  cart as cartRow,
  forge as forgeRow,
  hash,
  invariant,
  rail as railRow,
  railResume,
  railTick,
  railwayAtQ4,
  restore,
  type Seed,
} from './helpers/rail.ts';
import { line2CartStatus, railCounts } from '../src/sim/railway-queries-line2.ts';

// The played-through worlds are slow to build: build each once, and start every test from a restored copy.
let q4: Seed | null = null;
/** Q4's rail bill: what one Q4 trip brings, now that a cart holds more (24, for Q5). */
const Q4_RAILS = LINE2_STATIONS[3]!.bill[1];
const atQ4 = (): Seed => {
  q4 ??= railwayAtQ4();
  return { w: restore(q4.w), t: q4.t };
};
// Rows are replaced when a rule writes: each read is fresh.
const cart = (w: Seed) => cartRow(w.w) as Readonly<RailCart>;
const rail = (w: Seed) => railRow(w.w);
const forgeRack = (w: Seed) => forgeRow(w.w).rack;
/** Totals conserved: every log one the world began with or produced, every rail one the forge poured. */
function conserved(w: Seed) {
  assert.equal(invariant(w.w), null);
  const c = railCounts(w.w);
  assert.equal(c.total, RAILWAY_SUPPLY + 30 + c.produced, 'logs conserved');
  assert.equal(c.rails.total, c.rails.poured, 'rails conserved');
}
const tick = (w: Seed, n = 1) => {
  for (let i = 0; i < n; i++) railTick(w.w, ++w.t);
};
/** Tick until pred holds, at most `max` ticks; returns the ticks taken. */
function until(w: Seed, pred: () => boolean, max: number, what: string) {
  for (let t = 0; t <= max; t++) {
    if (pred()) return t;
    tick(w);
  }
  assert.fail(what);
}
function act(w: Seed, pid: string, op: string, fields: object = {}) {
  const a = account(w.w, pid)!;
  return apply(w.w, pid, { op, epoch: a.epoch, request: a.request + 1, ...fields }, w.t).accepted;
}

test('the pose: whole centimetres along the road, eased, continuous across every phase change', () => {
  for (const dist of [1, 400, 2700, 2900, CART_ROAD.forgeCm, CART_ROAD.rackCm(3) - CART_ROAD.forgeCm]) {
    const T = legTicks(dist);
    let last = 0;
    for (let t = 0; t <= T + 2; t += 0.25) {
      const s = legAlong(dist, t);
      assert.ok(Number.isInteger(s) && s >= last && s <= dist, `${dist} at ${t}`);
      // Never faster than cruise (a quarter tick, plus rounding).
      assert.ok(s - last <= CART.speed / 4 + 1, `${dist} speed at ${t}`);
      last = s;
    }
    assert.equal(legAlong(dist, T), dist, 'arrives on its last tick');
  }
  // A whole trip, phase by phase: where one phase ends is where the next starts.
  const F = CART_ROAD.forgeCm,
    R = CART_ROAD.rackCm(3);
  const trip: RailCart[] = [];
  let depart = 100;
  for (const phase of [CART_PHASE.LOAD, CART_PHASE.OUT, CART_PHASE.FORGE, CART_PHASE.RUN, CART_PHASE.DROP]) {
    const c = { phase, depart, from: F, to: R, logs: 0, rails: 0 };
    trip.push(c);
    depart = phase === CART_PHASE.FORGE ? depart + CART.leaveTicks : cartEnd(c);
  }
  trip.push({ phase: CART_PHASE.BACK, depart, from: F, to: R, logs: 0, rails: 0 });
  depart = cartEnd(trip.at(-1)!);
  trip.push({ phase: CART_PHASE.HOME, depart, from: F, to: R, logs: 0, rails: 0 });
  for (let i = 1; i < trip.length; i++) {
    const a = trip[i - 1]!,
      b = trip[i]!;
    assert.equal(cartAlong(a, b.depart), cartAlong(b, b.depart), `phase ${a.phase} -> ${b.phase}`);
  }
  assert.equal(cartAlong(trip.at(-1)!, cartEnd(trip.at(-1)!)), 0, 'home at the camp');
});

test('a load is conserved across a mid-trip snapshot and load, and the restored cart runs on identically', () => {
  const w = atQ4();
  // Q2's first load is still on its way (Q2 and Q3 were filled by hand); the next trip brings Q4's rails.
  until(w, () => cart(w).phase === CART_PHASE.RUN && cart(w).rails > 0, 2 * cartCycleTicks(3), 'rails aboard');
  tick(w, 20); // mid-run
  assert.equal(cart(w).phase, CART_PHASE.RUN);
  assert.equal(cart(w).rails, Q4_RAILS);
  assert.equal(rail(w).depotRails, 0, 'the shelf changes only at the unload');
  conserved(w);
  const back = { w: restore(w.w), t: w.t };
  conserved(back);
  until(w, () => cart(w).phase === CART_PHASE.DROP, cartCycleTicks(3), 'unloaded');
  tick(back, w.t - back.t);
  assert.equal(hash(back.w), hash(w.w), 'the restored world reached the same unload');
  assert.equal(rail(w).depotRails, Q4_RAILS);
  conserved(w);
});

test('an empty forge keeps the cart waiting: it leaves only with the rails the shelf is owed', () => {
  const w = atQ4();
  until(w, () => cart(w).phase === CART_PHASE.DROP, 2 * cartCycleTicks(3), 'the load under way lands');
  // Empty the forge rack into piles as it pours, until the cart stands at the forge.
  const drain = () => {
    while (forgeRack(w) > 0) {
      for (const pid of ['a', 'b']) {
        const n = act(w, pid, 'rail.forgeTake');
        // A pile holds 8 and a back with the yoke 16: the take goes down in piles until the back is empty.
        for (let left = n; left > 0;) {
          const down = act(w, pid, 'rail.drop', { x: 91450, y: 2000, z: 900, n: left, kind: 2 });
          assert.ok(down > 0, 'the rails go down');
          left -= down;
        }
      }
    }
  };
  for (let t = 0; cart(w).phase !== CART_PHASE.FORGE; t++) {
    assert.ok(t < cartCycleTicks(3), 'the cart came to the forge');
    drain();
    tick(w);
  }
  drain();
  tick(w);
  assert.equal(line2CartStatus(w.w), 'waiting', 'the tag reads Waiting for forge');
  const waited = until(w, () => cart(w).phase !== CART_PHASE.FORGE, 400, 'the cart left the forge');
  // The forge pours one rail every five ticks; the cart takes each as it lands and waits for the whole bill.
  assert.ok(waited >= (Q4_RAILS - 1) * 5, `waited ${waited} ticks`);
  assert.equal(cart(w).rails, Q4_RAILS);
  assert.equal(cart(w).phase, CART_PHASE.RUN);
  conserved(w);
});

test('the away credit counts the cart: the load under way lands, whole trips bring the rest, the cart is home', () => {
  const w = atQ4();
  const produced = railCounts(w.w).produced;
  const aboard = cart(w).logs;
  // Shorter than one trip: the cart's own clock carries it, nothing is credited for it.
  const h = hash(w.w);
  railResume(w.w, 0, 50, w.t, cartCycleTicks(3) - 1);
  assert.notEqual(hash(w.w), h, 'the forge rack credit still applies');
  assert.equal(cart(w).logs, aboard, 'no trip completed: the load stays aboard');
  railResume(w.w, 0, 51, w.t, 10 * cartCycleTicks(3));
  assert.equal(cart(w).phase, CART_PHASE.REST);
  assert.equal(cart(w).logs + cart(w).rails, 0);
  assert.equal(rail(w).depot, aboard + Math.max(0, LINE2_STATIONS[3]!.bill[0] - aboard));
  assert.equal(rail(w).depotRails, Q4_RAILS, "the shelf has Q4's rails, moved off the forge rack");
  assert.equal(railCounts(w.w).produced, produced + Math.max(0, 16 - aboard));
  conserved(w);
  const again = hash(w.w);
  railResume(w.w, 0, 51, w.t, 10 * cartCycleTicks(3));
  assert.equal(hash(w.w), again, 'once per marker');
});
