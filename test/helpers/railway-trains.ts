// The train seeds as the unconverted tests know them: a fixture over the world seed (./railway-q2.ts). M12b deletes it.
import { railwayAtTrains as seed } from '../../src/sim/railway-seed-route.ts';
import type { TrainStage } from '../../src/sim/railway-seed-route.ts';
import { fixture } from './railway-q2.ts';

export { TRAIN_STAGES } from '../../src/sim/railway-seed-route.ts';
export type { TrainStage } from '../../src/sim/railway-seed-route.ts';
export const railwayAtTrains = (stage: TrainStage) => fixture(seed(stage));
