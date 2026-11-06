// Local seam for the shared opening: a place supplies its landing before the director loads.
// Without a place's landing, the director keeps its original target and camera direction.
import { groundHeight } from '../island/heights.ts';

export const fallArrival = {
  active: false,
  target: null as { x: number; z: number } | null,
  yaw: null as number | null,
  ground: groundHeight,
};
