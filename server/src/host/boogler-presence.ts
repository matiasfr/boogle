// Only the two continuous brain inputs are consumed. Events and the lead's g never enter the brain.
import { HALF } from '../../../src/world/grid.ts';
import type { BooglerVisitor } from '../../../src/world/boogler-brain.ts';
import type { RailwayPosition } from './railway-supply.ts';

export function booglerActivity(bg: unknown) {
  if (!Array.isArray(bg)) return { act: 0, wary: 0 };
  return {
    act: Number.isInteger(bg[0]) && bg[0] >= 0 && bg[0] <= 2 ? (bg[0] as number) : 0,
    wary: bg[1] === 1 ? 1 : 0,
  };
}

export function booglerVisitors(positions: readonly (RailwayPosition | null)[], now: number): BooglerVisitor[] {
  return positions.flatMap((p) => {
    if (
      !p ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.z) ||
      !Number.isFinite(p.at) ||
      p.at > now ||
      now - p.at >= 2000
    )
      return [];
    // Finite extreme coordinates remain far away; clamping bounds all distance arithmetic and loop work.
    return [
      {
        pid: p.pid,
        x: Math.max(-HALF, Math.min(HALF, p.x)),
        z: Math.max(-HALF, Math.min(HALF, p.z)),
        ...booglerActivity([p.act, p.wary]),
        wary: p.wary === 1,
      },
    ];
  });
}
