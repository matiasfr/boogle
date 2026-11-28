import { RAILWAY_T1 } from '../sim/railway-layout.ts';
import { SPAWN, toWorld } from './layout.ts';
import { HALL_BOARD } from './home-station.ts';

const campX = toWorld(-13);
const campZ = -163;
export const CAMP_PAD = {
  x: campX,
  z: campZ,
  // Frame both ends of the first hand-off: the parked machine and its receiving frame.
  yaw: Math.atan2(campX - (RAILWAY_T1.wake.x + RAILWAY_T1.x) / 200, campZ - (RAILWAY_T1.wake.z + RAILWAY_T1.z) / 200),
};
export const HALL_PAD = {
  x: toWorld(SPAWN.x),
  z: SPAWN.z,
  yaw: Math.atan2(SPAWN.x - HALL_BOARD.x, SPAWN.z - HALL_BOARD.z),
};
