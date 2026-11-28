import { RAILWAY_T1 } from '../sim/railway-layout.ts';
import { SPAWN, toWorld } from './layout.ts';
import { HALL_BOARD } from './home-station.ts';

type Point = { x: number; z: number };

export function facing(x: number, z: number, focus: Point) {
  return { x, z, focus, yaw: Math.atan2(x - focus.x, z - focus.z) };
}

// The resident stands between the sleeping track layer and the first receiving frame.
export const CAMP_PAD = facing(toWorld(-13), -163, {
  x: (RAILWAY_T1.wake.x + RAILWAY_T1.x) / 200,
  z: (RAILWAY_T1.wake.z + RAILWAY_T1.z) / 200,
});
export const HALL_PAD = facing(toWorld(SPAWN.x), SPAWN.z, { x: toWorld(HALL_BOARD.x), z: HALL_BOARD.z });
