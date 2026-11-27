import { crossoverPlan, seaCrossovers } from '../../place/junctions.ts';
import { RING_S } from '../railway/line2-path.ts';

const cross = seaCrossovers().find((c) => c.view === 'ring')!;
export const ringPoints = crossoverPlan(cross);
export const ringStation = (s: number) => s - RING_S;
