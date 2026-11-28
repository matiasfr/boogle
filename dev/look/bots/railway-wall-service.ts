import { LINE2, RAIL_HALTS } from '../../../src/sim/railway-lines.ts';
import { gorgeStop } from '../../../src/sim/railway-lap.ts';

/** The ending bot transfers to the bay line at Canopy after the sixth Wall lay. */
export const wallService = {
  from: gorgeStop,
  to: RAIL_HALTS.find((halt) => halt.line === LINE2 && halt.name === 'Canopy Town')!,
};
