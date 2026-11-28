import { LINE2, RAIL_LINES, WALL_LEG } from '../../../src/sim/railway-lines.ts';
import { joinedCaveStop } from '../../../src/sim/railway-lap.ts';
import { RAIL_LEGS } from '../../../src/sim/railway-route.ts';

const wall = RAIL_LEGS[WALL_LEG]!;
/** The first ride after the sixth lay stays on one train through High Gorge. */
export const wallService = {
  from: joinedCaveStop(wall.line, wall.railheadHalt + wall.sections.length - 2),
  to: 0,
  line: RAIL_LINES[LINE2]!,
};
