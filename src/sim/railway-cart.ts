// The depot cart's trip (docs/plans/line2-part2-greybox.md, B3), pure: its phases, its road and where it is on it.
// The cart runs on one road, measured in integer centimetres from its camp stop: down line one from the camp to the
// turntable beside the forge, then out along line two to the active stretch's rack. Each phase starts at `depart`,
// and a moving phase's place along the road is a pure function of (phase, depart, to, tick), so the server sends
// the cart only when its phase changes, and a client draws (and rides) it from its own estimate of the server's tick.
// No trig, wall clock or randomness: an eased trapezoid in + − × ÷ and Math.sqrt, rounded to whole centimetres.
//
//   CART                       speeds, dwells and what a load holds (Place's depot.ts CART)
//   CART_ROAD                  the pinned stops: the camp (0), the forge stop at the turntable, each stretch's rack
//   cartAlong(c, tick)         where the cart is, cm along the road (tick may be fractional in a view)
//   cartEnd(c)                 the tick its current timed phase ends (Infinity while it rests or waits)
//   cartCycleTicks(k)          one whole trip to stretch k's rack and home, for the away credit
import { LINE2_STATIONS } from './railway-line2-layout.ts';

/** Ticks are the rule clock's 100 ms. Speeds in cm per tick; Place's cart runs at 9 m/s and eases at 3 m/s². */
export const CART = {
  speed: 90,
  accel: 3,
  /** Logs minted onto it at the camp per trip (Place CART.load) and rails it holds from the forge rack: the cart holds
   * 24 rails, one full forge rack, so one shipment covers Q5 (docs/reviews/home-flow.md, finding 1). */
  load: 24,
  rails: 24,
  loadTicks: 30,
  /** At the forge stop: with rails aboard it leaves after `leaveTicks`. */
  leaveTicks: 30,
  dropTicks: 22,
} as const;
/** The phases, in trip order. REST and LOAD stand at the camp, FORGE at the turntable, DROP at the rack. */
export const CART_PHASE = { REST: 0, LOAD: 1, OUT: 2, FORGE: 3, RUN: 4, DROP: 5, BACK: 6, HOME: 7 } as const;
export const CART_PHASES = 8;
/** Pinned from Place: the camp stop is line one's s = STUB.camp + 5 (196 m), so the turntable is 196 m on; a rack
 * stop is 13 m short of its stretch's start along line two, behind the waiting machine (depot.ts stopFor). */
export const CART_ROAD = {
  forgeCm: 20632,
  behindCm: 1300,
  rackCm: (k: number) => CART_ROAD.forgeCm + (LINE2_STATIONS[k]?.fromCm ?? 0) - CART_ROAD.behindCm,
} as const;

export type RailCart = {
  phase: number;
  depart: number;
  /** A run's start and the rack stop it runs to (cm along the road): from the forge stop, or on from a stretch's stop
   * that funded while it was on the way to the next one's. */
  from: number;
  to: number;
  logs: number;
  rails: number;
};
export const CART_IDLE: RailCart = { phase: 0, depart: 0, from: 0, to: 0, logs: 0, rails: 0 };

/** The eased leg: accelerate at `accel` to `speed`, cruise, brake; a short leg peaks below cruise. */
function profile(dist: number) {
  const accelTicks = CART.speed / CART.accel;
  const accelCm = (CART.accel * accelTicks * accelTicks) / 2;
  if (dist >= 2 * accelCm) return { up: accelTicks, cruise: (dist - 2 * accelCm) / CART.speed };
  return { up: Math.sqrt(dist / CART.accel), cruise: 0 };
}
/** Whole ticks a leg of `dist` cm takes. */
export function legTicks(dist: number) {
  if (dist <= 0) return 0;
  const p = profile(dist);
  return Math.ceil(2 * p.up + p.cruise);
}
/** Centimetres covered `t` ticks into a leg of `dist`: 0 at t ≤ 0, `dist` from legTicks(dist) on. */
export function legAlong(dist: number, t: number) {
  if (dist <= 0 || !(t > 0)) return 0;
  const { up, cruise } = profile(dist);
  const total = 2 * up + cruise;
  if (t >= total) return dist;
  const a = CART.accel,
    peak = a * up;
  let s: number;
  if (t < up) s = (a * t * t) / 2;
  else if (t < up + cruise) s = (a * up * up) / 2 + peak * (t - up);
  else {
    const left = total - t;
    s = dist - (a * left * left) / 2;
  }
  return Math.max(0, Math.min(dist, Math.round(s)));
}
/** A moving phase's ends, cm along the road; null for a standing phase. */
export function cartLeg(c: Readonly<RailCart>): [from: number, to: number] | null {
  const F = CART_ROAD.forgeCm;
  switch (c.phase) {
    case CART_PHASE.OUT:
      return [0, F];
    case CART_PHASE.RUN:
      return [c.from, c.to];
    case CART_PHASE.BACK:
      return [c.to, F];
    case CART_PHASE.HOME:
      return [F, 0];
  }
  return null;
}
/** Where the cart is at `tick`, cm along the road. */
export function cartAlong(c: Readonly<RailCart>, tick: number) {
  const leg = cartLeg(c);
  if (leg) {
    const [from, to] = leg;
    const s = legAlong(Math.abs(to - from), tick - c.depart);
    return to >= from ? from + s : from - s;
  }
  if (c.phase === CART_PHASE.FORGE) return CART_ROAD.forgeCm;
  if (c.phase === CART_PHASE.DROP) return c.to;
  return 0;
}
/** The tick a timed phase ends; Infinity for REST and FORGE (they end on a condition, not a clock). */
export function cartEnd(c: Readonly<RailCart>) {
  const leg = cartLeg(c);
  if (leg) return c.depart + legTicks(Math.abs(leg[1] - leg[0]));
  if (c.phase === CART_PHASE.LOAD) return c.depart + CART.loadTicks;
  if (c.phase === CART_PHASE.DROP) return c.depart + CART.dropTicks;
  return Infinity;
}
/** One whole trip to stretch k's rack and home, with rails to load at the forge stop: the away credit's trip. */
export function cartCycleTicks(k: number) {
  const run = legTicks(CART_ROAD.rackCm(k) - CART_ROAD.forgeCm);
  return CART.loadTicks + 2 * legTicks(CART_ROAD.forgeCm) + CART.leaveTicks + 2 * run + CART.dropTicks;
}
