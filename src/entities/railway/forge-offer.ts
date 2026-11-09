// Local: whether line 2's forge rack offers "Take rails". It mirrors `rail.forgeTake` (src/sim/railway-systems.ts):
// while a Q station takes rails any back with room may take some; once none does, only while the cradle still needs
// rails that nobody's back already holds for it (your own count), so never after the fit (a fitted cradle has all
// eight). A full back is the view's own "Your back is full". Pure, so test/railway-works.test.ts holds it to the rule.
import { WORKS } from '../../sim/railway-works-layout.ts';

/** `active`: line 2's Q station taking materials (-1 for none); `railsCarry`: the rails on your own back. */
export const forgeRailsOffered = (active: number, cradleRails: number, railsCarry: number): boolean =>
  active >= 0 || cradleRails + railsCarry < WORKS.cradleRails;
