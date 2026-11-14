// The rack tag's second line (docs/plans/level-pacing-1114.md, step C1; owner, 14 November: "The cart only brings 16.
// So they're expecting I have to go back and get them, or not"). It read "More coming" and never a number. Now it is
// the shipment against what the bill still waits for: `logs 24 of 24  rails 24 of 24`, the first number what this trip
// carries (aboard, plus what it will still load at the camp and the forge), the second everything not yet at the rack,
// the shelf or the frame. Equal numbers mean nobody walks back. Pure reads of accepted rows. Draft UI copy.
import { CART, CART_PHASE } from '../../sim/railway-cart.ts';
import { DEPOT_OUT } from '../../sim/railway-components.ts';
import { LINE2_STATIONS } from '../../sim/railway-line2-layout.ts';
import { line2CartWants, line2Served } from '../../sim/railway-queries-line2.ts';
import { cart, qjob, rail, type ReadWorld } from '../../sim/railway-rows.ts';

export type CartLoad = { logs: [bring: number, owed: number]; rails: [bring: number, owed: number] };

/** What this trip brings and what is still owed to the served stretch, or null when the cart serves none. */
export function cartLoad(w: ReadWorld): CartLoad | null {
  const k = line2Served(w),
    spec = LINE2_STATIONS[k];
  if (k < 0 || !spec) return null;
  const c = cart(w),
    r = rail(w),
    j = qjob(w, k);
  // Still to be put on the cart: the system's own bounds (railway-queries.ts depotNeed), without a train's cargo.
  const logsLeft = Math.max(0, Math.min(spec.bill[0] - j.stock - r.depot - c.logs, spec.bill[0] - r[DEPOT_OUT[k]!]));
  const railsLeft = spec.shelf
    ? Math.max(0, Math.min(spec.bill[1] - j.railStock - r.depotRails - c.rails, spec.bill[1] - r.shelfOut))
    : 0;
  // Logs go aboard at the camp, rails at the forge stop; past each, what is left waits for the next trip.
  const atCamp = c.phase === CART_PHASE.REST || c.phase === CART_PHASE.LOAD;
  const homing = c.phase === CART_PHASE.BACK || c.phase === CART_PHASE.HOME;
  const beforeForge = atCamp || homing || c.phase === CART_PHASE.OUT || c.phase === CART_PHASE.FORGE;
  return {
    logs: [c.logs + (atCamp || homing ? Math.min(CART.load, logsLeft) : 0), c.logs + logsLeft],
    rails: [c.rails + (beforeForge ? line2CartWants(w, k) : 0), c.rails + railsLeft],
  };
}

/** The tag's small line; '' when nothing is aboard or owed. */
export function cartTagLine(w: ReadWorld) {
  const load = cartLoad(w);
  if (!load) return '';
  return (['logs', 'rails'] as const)
    .filter((g) => load[g][1] > 0)
    .map((g) => `${g} ${load[g][0]} of ${load[g][1]}`)
    .join('  ');
}
