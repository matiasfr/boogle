// Local: whether line 2's forge rack offers "Take rails". It mirrors `rail.forgeTake` (src/sim/railway-systems.ts):
// while a Q station takes rails any back with room may take some, except a train-fed station before trains run (its
// kit comes by train, from this rack); once none does, only while the cradle still needs rails that nobody's back
// already holds for it (your own count), so never after the fit (a fitted cradle has all eight). A full back is the
// view's own "Your back is full". Pure, so test/railway-works.test.ts holds it to the rule.
import { LINE2_STATIONS } from '../../sim/railway-line2-layout.ts';
import { WORKS } from '../../sim/railway-works-layout.ts';

/** The active Q station is fed by train and trains don't run yet: its kit is the train's job, not a back's. */
export const trainOwed = (active: number, trains: boolean): boolean =>
  active >= 0 && LINE2_STATIONS[active]!.feed === 'train' && !trains;

/** `active`: line 2's Q station taking materials (-1 for none); `railsCarry`: the rails on your own back. */
export const forgeRailsOffered = (active: number, trains: boolean, cradleRails: number, railsCarry: number): boolean =>
  !trainOwed(active, trains) && (active >= 0 || cradleRails + railsCarry < WORKS.cradleRails);
