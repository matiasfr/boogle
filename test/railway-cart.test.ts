// The depot cart's real trip (docs/plans/line2-part2-greybox.md, B3): its pose is a pure function of its phase and
// the tick, each transfer is one atomic step that conserves logs and rails, an empty forge keeps it waiting, a call
// stands once, and the away credit counts its loads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailwayWorld } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { railwayRoomId } from '../src/world/railway-namespace.ts';
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
import { LINE2_FORGE, LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
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
  railwayAtQ2,
  railwayAtQ4,
  restore,
  type Seed,
} from './helpers/rail.ts';
import { line2CartStatus, line2Served, railCounts } from '../src/sim/railway-queries-line2.ts';

// The played-through worlds are slow to build: build each once, and start every test from a restored copy.
let q2: Seed | null = null,
  q4: Seed | null = null;
/** Q4's rail bill: what one Q4 trip brings, now that a cart holds more (24, for Q5). */
const Q4_RAILS = LINE2_STATIONS[3]!.bill[1];
const atQ2 = (): Seed => {
  q2 ??= railwayAtQ2();
  return { w: restore(q2.w), t: q2.t };
};
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
  assert.equal(c.total, 3910 + c.produced, 'logs conserved');
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
  assert.equal(CART_ROAD.forgeCm, 20632, "Home's forge stop on the station road");
  assert.equal(R, 37132, "Q4's rack stop: 371.32 m from the camp, behind the waiting machine");
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
        if (n) assert.equal(act(w, pid, 'rail.drop', { x: 91450, y: 2000, z: 900, n, kind: 2 }), n);
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

test('"Call cart to forge" is gone (v25): its op moves nothing, and a resting cart rests until a stretch needs it', () => {
  const w = atQ2();
  assert.equal(line2Served(w.w), 1);
  until(w, () => cart(w).phase === CART_PHASE.HOME || cart(w).phase === CART_PHASE.REST, 2 * cartCycleTicks(1), 'home');
  until(w, () => cart(w).phase === CART_PHASE.REST, cartCycleTicks(1), 'resting');
  // Q2's logs are all on the rack: the cart rests, and the cut op does not send it.
  assert.equal(act(w, 'a', 'rail.cartCall'), 0);
  assert.equal('recall' in cart(w), false, 'no recall field');
  tick(w, 50);
  assert.equal(cart(w).phase, CART_PHASE.REST);
  conserved(w);
});

test('a save still carrying the cart recall column is refused whole, and older saves sit under their own namespace', () => {
  // Saves are columnar and never migrated (server/AGENTS.md): v24 rooms are rail-v24-*, which a v25 server never
  // opens; a v24-shaped cart row in a v25 save would be refused, never half-loaded with the field dropped.
  const snap = JSON.parse(JSON.stringify(atQ2().w.snapshot()));
  snap.c.cart.push(snap.c.cart[0].map(() => 0));
  assert.throws(() => createRailwayWorld().load(snap, railwayCheck), /load: cart columns/);
  assert.match(railwayRoomId('boogle'), /^rail-v37-/);
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

test("one cart load of rails fills from one full forge rack and covers Q5's rail bill", () => {
  assert.ok(CART.rails <= LINE2_FORGE.rackMax, 'a full rack fills a cart');
  assert.ok(CART.rails >= LINE2_STATIONS[4]!.bill[1], "one shipment brings Q5's whole rail bill");
  // A Q4 cart still takes only what Q4 is owed.
  const w = atQ4();
  until(w, () => cart(w).phase === CART_PHASE.RUN && cart(w).rails > 0, 2 * cartCycleTicks(3), 'rails aboard');
  assert.equal(cart(w).rails, Q4_RAILS);
  conserved(w);
});
