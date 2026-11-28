import { RAILWAY_T1 } from '../sim/railway-layout.ts';
import { SPAWN, toWorld } from './layout.ts';
import { HALL_BOARD } from './home-station.ts';

const campX = toWorld(-20);
const campZ = -150;
export const CAMP_PAD = {
  x: campX,
  z: campZ,
  yaw: Math.atan2(campX - RAILWAY_T1.wake.x / 100, campZ - RAILWAY_T1.wake.z / 100),
};
export const HALL_PAD = {
  x: toWorld(SPAWN.x),
  z: SPAWN.z,
  yaw: Math.atan2(SPAWN.x - HALL_BOARD.x, SPAWN.z - HALL_BOARD.z),
};
