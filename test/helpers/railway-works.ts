// The Works seeds as the unconverted tests know them: fixtures and steps over the world seeds (./railway-q2.ts). M12b
// deletes it.
import * as works from '../../src/sim/railway-seed-works.ts';
import type { WorksStage } from '../../src/sim/railway-seed-works.ts';
import { fixture, step } from './railway-q2.ts';

export { WORKS_STAGES } from '../../src/sim/railway-seed-works.ts';
export type { WorksStage } from '../../src/sim/railway-seed-works.ts';
export const chopTo = step(works.chopTo);
export const advanceWorks = step(works.advanceWorks);
export const railwayAtWorks = (stage: WorksStage) => fixture(works.railwayAtWorks(stage));
