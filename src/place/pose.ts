// Place's personal return-ground policy. No material state, rendering, registration or persistence owner.
import { PLAYER_R } from '../constants.ts';
import { sweepSphere } from '../physics/engine.ts';
import { GROUP } from '../physics/physics.ts';
import { ROOM_PLOTS, toWorld } from './layout.ts';

export type Pose = { x: number; z: number; yaw: number };
export type SavedPose = Pose & { ground: number };
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function createPosePolicy(
  ground: (x: number, z: number) => number,
  inside: (x: number, z: number) => boolean,
  blockedFoot: (pose: Pose) => boolean,
) {
  function safe(p: Pose) {
    if (![p.x, p.z, p.yaw].every(finite) || !inside(p.x, p.z) || ground(p.x, p.z) <= 1.6) return false;
    if (blockedFoot(p)) return false;
    if (
      Object.values(ROOM_PLOTS).some((room) => {
        const c = Math.cos(room.yaw),
          s = Math.sin(room.yaw),
          x = p.x - toWorld(room.x),
          z = p.z - room.z;
        return Math.abs(x * c - z * s) < room.w / 2 + PLAYER_R && Math.abs(x * s + z * c) < room.d / 2 + PLAYER_R;
      })
    )
      return false;
    const h = ground(p.x, p.z);
    const from = { x: p.x, y: h + 128, z: p.z };
    const to = { x: p.x, y: h + PLAYER_R + 0.4, z: p.z };
    return !(['skip', 'only'] as const).some(
      (thin) => sweepSphere(from, to, PLAYER_R, { mask: GROUP.SCENERY, thin }) >= 0,
    );
  }
  function read(value: unknown): Pose | null {
    if (!value || typeof value !== 'object') return null;
    const p = value as SavedPose;
    // Old saves without a ground sample cannot prove the ground has stayed put: use SPAWN.
    return finite(p.ground) && Math.abs(ground(p.x, p.z) - p.ground) < 0.2 && safe(p)
      ? { x: p.x, z: p.z, yaw: p.yaw }
      : null;
  }
  return { safe, read };
}
