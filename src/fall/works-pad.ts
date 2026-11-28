import { CAMP_PAD, HALL_PAD } from '../place/works-landing.ts';
import { job } from '../sim/railway-rows.ts';
import { railwayMirror } from '../world/game-world.ts';

export function worksLanding() {
  return railwayMirror?.synced() && job(railwayMirror.confirmed(), 2).completion !== 1 ? CAMP_PAD : HALL_PAD;
}
