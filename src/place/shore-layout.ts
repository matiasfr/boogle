// Round 4's shore arrival. Local presentation and static Owner collision; Node tools use the same default grid.
// SPAWN remains the village fallback. Always on: Place's isolated v=village comparison, which kept the previous coast
// in its own room, went with Place (ecs-m12-m13 M13e); a v=village address must not change the land of a shared room.
import type { Pt } from './layout.ts';

export const SHORE_COAST = true;
export const SHORE_LANDING = { x: -199, z: 10, yaw: -Math.PI / 2 - 0.2 };
// Broad climb, then a bend between the cottages before the existing northbound walk.
export const SHORE_PATH: Pt[] = [
  [-199, 10, 3],
  [-187, 10, 3],
  [-177, 28, 9],
  [-165, 32, 14],
  [-150, 32, 18],
  [-143, 20, 18],
  [-137, 13, 18],
  [-121, 3, 18],
  [-105, 3, 18],
  [-98, 9, 18],
];
const town = SHORE_PATH[SHORE_PATH.length - 1]!;
export const SHORE_TOWN = { x: town[0], z: town[1] };
export const SHORE_WORKER = { x: -95, z: 12 };
export const SHORE_WORKER_LOOK = { x: -104, z: -4 };
export const SHORE_HOP = { x: -165, z: 32, y: 14, height: 0.75, top: 1.2, bottom: 1.6 };
