// Preserve the existing mesh, shared material and shadow flags exactly.
import { seatMesh } from '../../entities/railway/seat.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'seat.chair': true;
  }
}
export const seatChair = registerBuilder('seat.chair', () => seatMesh());
