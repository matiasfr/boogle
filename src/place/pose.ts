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
  probe?: Pick<typeof import('../physics/engine.ts'), 'rayHit' | 'raycastClosest'>,
) {
  const blocked = (x: number, z: number) =>
    blockedFoot({ x, z, yaw: 0 }) ||
    Object.values(ROOM_PLOTS).some((room) => {
      const c = Math.cos(room.yaw),
        s = Math.sin(room.yaw),
        dx = x - toWorld(room.x),
        dz = z - room.z;
      return Math.abs(dx * c - dz * s) < room.w / 2 + PLAYER_R && Math.abs(dx * s + dz * c) < room.d / 2 + PLAYER_R;
    });
  const hit = probe?.rayHit();
  function surfaceY(x: number, y: number, z: number, head: number, drop = 1) {
    if (!probe || !hit) return null;
    const from = { x, y: y + head, z };
    const hits = (['skip', 'only'] as const)
      .map((thin) => sweepSphere(from, { x, y: y - drop, z }, PLAYER_R, { mask: GROUP.SCENERY, thin }))
      .filter((h) => h >= 0);
    if (!hits.length) return null;
    const surface = from.y - Math.min(...hits) - PLAYER_R;
    if (drop === 1 && Math.abs(surface - y) > 0.5) return null;
    if (
      !probe.raycastClosest(
        { x: x + 0.01, y: from.y, z: z + 0.01 },
        { x: x + 0.01, y: y - drop, z: z + 0.01 },
        { mask: GROUP.SCENERY },
        hit,
      ) ||
      hit.distance <= 0 ||
      Math.abs(hit.hitPointWorld.y - surface) > 0.5
    )
      return null;
    return hit.hitPointWorld.y;
  }
  function surfaceAt(x: number, y: number, z: number, head = 3) {
    const surface = surfaceY(x, y, z, head);
    return surface !== null && Math.abs(surface - y) <= 0.5;
  }
  function standableAt(x: number, y: number, z: number) {
    if (![x, y, z].every(finite) || blocked(x, z)) return false;
    const surface = surfaceY(x, y, z, 2 * PLAYER_R + 0.5);
    return (
      surface !== null && Math.abs(surface - y) <= 0.5 && (surface > 1.6 || Math.abs(surface - ground(x, z)) > 0.5)
    );
  }
  function standableNear(x: number, y: number, z: number, radii: readonly number[]) {
    for (const radius of radii) {
      let best: { x: number; y: number; z: number } | null = null;
      const count = Math.max(6, Math.ceil((2 * Math.PI * radius) / 1.4));
      for (let k = 0; k < count; k++) {
        const px = x + radius * Math.cos((k * 2 * Math.PI) / count),
          pz = z + radius * Math.sin((k * 2 * Math.PI) / count);
        const surface = surfaceY(px, y + 1.5, pz, 2 * PLAYER_R + 0.5, 2.1);
        if (
          surface !== null &&
          surface >= y - 0.5 &&
          surface <= y + 1.5 &&
          (!best || surface > best.y) &&
          standableAt(px, surface, pz)
        )
          best = { x: px, y: surface, z: pz };
      }
      if (best) return best;
    }
    return null;
  }
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
  return { safe, read, surfaceAt, standableAt, standableNear };
}
