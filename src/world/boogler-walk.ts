// The original frame-sized walk: speed uses the heading error before this frame's turn.
// A continuous integral or a different dt sequence does not reproduce this Euler step.
import { angleLerp, clamp } from '../math.ts';

export const SPEED = 1.5;
export const TURN = 3.2;
export const FLEE_SPEED = 3.4;
export const RIDDEN_SPEED = 2.3;

type WalkState = { x: number; z: number; yaw: number; tx: number; tz: number };
type Blocked = (x: number, z: number, pad: number, fromX: number, fromZ: number) => boolean;

export function turnBooglerToward(state: { yaw: number }, yaw: number, dt: number) {
  const d = angleLerp(state.yaw, yaw, 1) - state.yaw;
  state.yaw += clamp(d, -TURN * dt, TURN * dt);
  return Math.abs(d);
}

export function stepBooglerWalk(sim: WalkState, dt: number, speed: number, blocked: Blocked) {
  const dx = sim.tx - sim.x,
    dz = sim.tz - sim.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.3) return 'arrived';
  const off = turnBooglerToward(sim, Math.atan2(-dx, -dz), dt);
  const step = Math.min(dist, speed * dt * Math.max(0, Math.cos(off)));
  const nx = sim.x + (dx / dist) * step,
    nz = sim.z + (dz / dist) * step;
  if (blocked(nx, nz, 0, sim.x, sim.z)) return 'blocked';
  sim.x = nx;
  sim.z = nz;
  return 'walking';
}
