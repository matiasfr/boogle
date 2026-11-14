// Ring Island's summit walk and its footbridge over the stack line's cutting (docs/plans/ring-summit-path.md).
// Local place data only: world metres, no renderer, physics, shared state or saves.
import { RING_HALT, ringAt } from '../../sim/railway-ring-layout.ts';
import { ROW_SHIFT, rowPoint } from '../../sim/railway-route.ts';
import type { IslandGround } from './ground.ts';

export const SUMMIT_BRIDGE = {
  sCm: 126000,
  off: 14,
  approach: 8,
  width: 3,
  thick: 0.3,
  parapet: 1.05,
  bents: [7.1, 20.9],
} as const;

export function summitPathFoot() {
  const p = ringAt(RING_HALT.u1 - 400, RING_HALT.upLat[0] - 950);
  return { x: p.x / 100, z: p.z / 100 };
}

export function summitBridge(g: IslandGround) {
  // The same formation middle as ground.ts's STACK_CUT: 2 m west of the down track.
  const p = rowPoint('ring', SUMMIT_BRIDGE.sCm + ROW_SHIFT.ring),
    q = rowPoint('ring', SUMMIT_BRIDGE.sCm + ROW_SHIFT.ring + 100),
    len = Math.hypot(q.x - p.x, q.z - p.z),
    nx = (q.z - p.z) / len,
    nz = -(q.x - p.x) / len;
  const middle = { x: p.x / 100 + nx * 2, z: p.z / 100 + nz * 2 };
  const at = (off: number) => {
    const x = middle.x + nx * off,
      z = middle.z + nz * off;
    return { x, y: g.islandH(x, z) + 0.12, z };
  };
  return {
    a: at(SUMMIT_BRIDGE.off),
    b: at(-SUMMIT_BRIDGE.off),
    approach: at(SUMMIT_BRIDGE.off + SUMMIT_BRIDGE.approach),
    middle,
    rail: p.y / 100,
  };
}

export function summitPath(g: IslandGround, centre: { x: number; z: number }) {
  const foot = summitPathFoot(),
    { approach, a, b } = summitBridge(g);
  // The approach stands 8 m behind a on the deck's own axis, so the last metres point down the deck and not at the
  // rim (the plan's design review, finding 1). Leg `bridgeLeg` (a to b) is the deck: the view lays no ground path
  // there and the facts skip it.
  const way: [number, number][] = [
    [foot.x, foot.z],
    [foot.x - 18, foot.z - 8],
    [approach.x, approach.z],
    [a.x, a.z],
    [b.x, b.z],
    [1395, -930],
    [1360, -975],
    [1372, -1035],
    [1345, -1075],
    [centre.x + 4, centre.z + 6],
  ];
  return { way, bridgeLeg: 3 };
}

/** Half-metre centreline samples (including leg ends); cut depth across the full 2.6 m path width.
 * `at` is horizontal metres from the foot. Bridge grade is separate from the off-deck ground grade. */
export function summitPathFacts(g: IslandGround, centre: { x: number; z: number }) {
  const { way, bridgeLeg } = summitPath(g, centre),
    bridge = summitBridge(g);
  let length = 0,
    steepest = { grade: 0, at: 0 },
    cut = { depth: 0, at: 0 };
  for (let i = 0; i < way.length - 1; i++) {
    const [ax, az] = way[i]!,
      [bx, bz] = way[i + 1]!,
      dx = bx - ax,
      dz = bz - az,
      span = Math.hypot(dx, dz);
    if (i !== bridgeLeg && span > 0) {
      let previous = g.islandH(ax, az),
        previousD = 0;
      for (let k = 0; k <= Math.ceil(span / 0.5); k++) {
        const d = Math.min(k * 0.5, span),
          x = ax + (dx * d) / span,
          z = az + (dz * d) / span,
          h = g.islandH(x, z);
        if (d > previousD) {
          const grade = Math.abs(h - previous) / (d - previousD);
          if (grade > steepest.grade) steepest = { grade, at: length + d };
        }
        for (const off of [-1.3, -1, -0.5, 0, 0.5, 1, 1.3]) {
          const xx = x + (dz * off) / span,
            zz = z - (dx * off) / span,
            depth = g.cone(xx, zz) - g.islandH(xx, zz);
          if (depth > cut.depth) cut = { depth, at: length + d };
        }
        previous = h;
        previousD = d;
      }
    }
    length += span;
  }
  // Concentric half-metre rings include the full 2 m abutment margin, including its boundary.
  let abutmentCut = 0;
  for (const p of [bridge.a, bridge.b])
    for (let r = 0; r <= 2; r += 0.5)
      for (let k = 0; k < 32; k++) {
        const x = p.x + r * Math.cos((k * Math.PI) / 16),
          z = p.z + r * Math.sin((k * Math.PI) / 16);
        abutmentCut = Math.max(abutmentCut, g.cone(x, z) - g.islandH(x, z));
      }
  const span = Math.hypot(bridge.b.x - bridge.a.x, bridge.b.z - bridge.a.z);
  return {
    length,
    steepest,
    cut,
    bridge: {
      span,
      grade: Math.abs(bridge.b.y - bridge.a.y) / span,
      clearance: (bridge.a.y + bridge.b.y) / 2 - SUMMIT_BRIDGE.thick - bridge.rail,
      abutmentCut,
    },
  };
}
