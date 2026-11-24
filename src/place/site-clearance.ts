import { HEAD_OFFSET, PLAYER_R } from '../constants.ts';
import type { Hull } from './building-plans.ts';
import type { Foot, outOf as moveOutside } from './sites.ts';

/** m: a resting contact is not an overlap. */
export const CONTACT = 0.02;
/** One of Buddy's spheres, its centre at (x, y, z) in a box's own frame, overlaps the box (centre `at`, half sizes
 * `half`) by more than `tolerance`: the clearance every solid that switches on near a player shares. */
export function sphereInBox(
  x: number,
  y: number,
  z: number,
  at: readonly [number, number, number],
  half: readonly [number, number, number],
  tolerance = CONTACT,
) {
  const dx = Math.max(0, Math.abs(x - at[0]) - half[0]),
    dy = Math.max(0, Math.abs(y - at[1]) - half[1]),
    dz = Math.max(0, Math.abs(z - at[2]) - half[2]);
  return dx * dx + dy * dy + dz * dz < (PLAYER_R - tolerance) ** 2;
}

export function siteExit(
  position: { x: number; y: number; z: number },
  foot: Foot,
  y: number,
  solids: readonly Hull[],
  outOf: typeof moveOutside,
  keepOut?: Hull,
  contactTolerance = 0,
  distanceToSolid?: (point: typeof position) => number,
) {
  const { x, z, c: cos, s: sin } = foot;
  // Standing in the plot when the walls go up: you're moved to the nearest edge, clear of it. Only in it: next to it
  // (on a doorstep) is the solids' business below.
  const pos = { x: position.x, z: position.z };
  const kept = keepOut && { ...foot, hw: keepOut.hx, hd: keepOut.hz };
  let moved =
    !!kept && position.y < y + keepOut.hy * 2 && outOf(kept, { ...pos }, 0) && outOf(kept, pos, PLAYER_R + 0.2);
  if (!moved) {
    // A saved position can overlap a roof or the slab beyond keepOut. Check each of Buddy's spheres against the boxes,
    // including scaffold solids on a build, then clear the whole footprint before enabling any of them.
    const lx = (pos.x - x) * cos - (pos.z - z) * sin,
      lz = (pos.x - x) * sin + (pos.z - z) * cos;
    const radius = PLAYER_R - contactTolerance;
    const overlaps = distanceToSolid
      ? [0, HEAD_OFFSET].some((up) => distanceToSolid({ ...position, y: position.y + up }) < radius)
      : solids.some((h) =>
          [0, HEAD_OFFSET].some((up) =>
            sphereInBox(lx, position.y + up - y, lz, [h.dx, h.dy, h.dz], [h.hx, h.hy, h.hz], contactTolerance),
          ),
        );
    if (overlaps)
      moved = outOf(
        {
          ...foot,
          hw: Math.max(foot.hw, ...solids.map((h) => Math.abs(h.dx) + h.hx)),
          hd: Math.max(foot.hd, ...solids.map((h) => Math.abs(h.dz) + h.hz)),
        },
        pos,
        PLAYER_R + 0.2,
      );
  }
  return moved ? pos : null;
}
