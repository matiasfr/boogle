// Round 4's shore arrival. Local presentation and static Owner collision; Node tools use the same default grid.
// SPAWN remains the village fallback. Always on: Place's isolated v=village comparison, which kept the previous coast
// in its own room, went with Place (ecs-m12-m13 M13e); a v=village address must not change the land of a shared room.
import type { Pt } from './layout.ts';
import { TOWN_STREETS } from './town-plan.ts';

export const SHORE_COAST = true;
export const SHORE_LANDING = { x: -199, z: 10, yaw: -Math.PI / 2 - 0.2 };
// Broad climb to the dock street, ending at the ring road.
export const SHORE_PATH: Pt[] = [
  [-199, 10, 3],
  [-187, 10, 3],
  [-177, 28, 9],
  [-165, 32, 14],
  ...TOWN_STREETS.dock.line.map((p): Pt => [p.x, p.z, 18]),
];
export const SHORE_WORKER = { x: -95, z: 12 };
export const SHORE_HOP = { x: -165, z: 32, y: 14, height: 0.75, top: 1.2, bottom: 1.6 };
