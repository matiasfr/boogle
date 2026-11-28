import { RAILWAY_T1 as T1 } from '../../sim/railway-layout.ts';
import { clamp } from '../../math-pure.ts';

type Point = { x: number; z: number };
const wake = { x: T1.wake.x / 100, z: T1.wake.z / 100 };
export const campHome = { x: wake.x - 3, z: wake.z + 4.2 };

export function stepCampOffer(camp: Point, player: Point, dt: number) {
  // Meet on the strip between the parked machine and the first frame. Both ends of
  // each step are inside it, even when the nearest visitor changes sides mid-walk.
  const dx = player.x - campHome.x,
    dz = player.z - campHome.z;
  const reach = Math.max(0, 1 - 1.8 / (Math.hypot(dx, dz) || 1));
  const x = clamp(campHome.x + dx * reach, campHome.x, wake.x + 1.5);
  const z = clamp(campHome.z + dz * reach, wake.z + 3, campHome.z);
  const distance = Math.hypot(x - camp.x, z - camp.z);
  if (distance < 0.001) return false;
  const fraction = Math.min(1, (dt * 2) / distance);
  camp.x += (x - camp.x) * fraction;
  camp.z += (z - camp.z) * fraction;
  return true;
}
