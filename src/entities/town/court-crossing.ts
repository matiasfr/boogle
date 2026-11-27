import { TOWN_COURT } from '../../place/town-plan.ts';

type Point = { x: number; y: number; z: number };

/** Both positions are in the goal's local frame. */
export function crossedGoal(previous: Point, current: Point, speed: number, dt: number) {
  const t = previous.z / (previous.z - current.z);
  const dx = current.x - previous.x,
    dy = current.y - previous.y,
    dz = current.z - previous.z;
  const x = previous.x + t * dx,
    y = previous.y + t * dy;
  // A return snapshot can slide the drawn ball across a mouth with no horizontal velocity.
  return (
    t > 0 &&
    t <= 1 &&
    speed > 0 &&
    dt > 0 &&
    Math.hypot(dx, dz) <= speed * Math.min(dt, 0.25) + 0.5 &&
    Math.abs(x) <= TOWN_COURT.width / 2 &&
    y >= 0 &&
    y <= TOWN_COURT.height
  );
}
