import { HEAD_OFFSET, PLAYER_R } from '../constants.ts';
import type { Hull } from './building-plans.ts';
import type { Foot, outOf as moveOutside } from './sites.ts';

export function siteExit(
  position: { x: number; y: number; z: number },
  foot: Foot,
  y: number,
  solids: readonly Hull[],
  outOf: typeof moveOutside,
  keepOut?: Hull,
) {
  const { x, z, c: cos, s: sin } = foot;
  // Standing in the plot when the walls go up: you're moved to the nearest edge.
  const pos = { x: position.x, z: position.z };
  let moved =
    !!keepOut &&
    position.y < y + keepOut.hy * 2 &&
    outOf({ ...foot, hw: keepOut.hx, hd: keepOut.hz }, pos, PLAYER_R + 0.2);
  if (!moved) {
    // A saved position can overlap a roof or the slab beyond keepOut. Check each of Buddy's spheres against the boxes,
    // including scaffold solids on a build, then clear the whole footprint before enabling any of them.
    const lx = (pos.x - x) * cos - (pos.z - z) * sin,
      lz = (pos.x - x) * sin + (pos.z - z) * cos;
    const overlaps = solids.some((h) => {
      const dx = Math.max(0, Math.abs(lx - h.dx) - h.hx),
        dz = Math.max(0, Math.abs(lz - h.dz) - h.hz);
      return [0, HEAD_OFFSET].some((up) => {
        const dy = Math.max(0, Math.abs(position.y + up - y - h.dy) - h.hy);
        return dx * dx + dy * dy + dz * dz < PLAYER_R * PLAYER_R;
      });
    });
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
