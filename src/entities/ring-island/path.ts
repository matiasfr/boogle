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

/** The formation's middle at `sCm` along the stack line (the same as ground.ts's STACK_CUT: 2 m west of the down
 * track), the unit normal toward the halt side, and the rail's height. */
function formation(sCm: number) {
  const p = rowPoint('ring', sCm + ROW_SHIFT.ring),
    q = rowPoint('ring', sCm + ROW_SHIFT.ring + 100),
    len = Math.hypot(q.x - p.x, q.z - p.z),
    nx = (q.z - p.z) / len,
    nz = -(q.x - p.x) / len;
  return { middle: { x: p.x / 100 + nx * 2, z: p.z / 100 + nz * 2 }, nx, nz, rail: p.y / 100 };
}

export function summitBridge(g: IslandGround) {
  const { middle, nx, nz, rail } = formation(SUMMIT_BRIDGE.sCm);
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
    rail,
  };
}

/** The marker rocks on the cutting's summit-side rim (the plan's design review, finding 3: from uphill the rim is a
 * convex edge that hides the drop): one every `step` cm of the line from `s0` to `s1`, the stretch where the path runs
 * within about 25 m of the rim, each at least `back` m behind the rim on uncut ground. None within `bridge` m of the
 * deck's axis along the line, or `path` m of the path's centreline. */
export const SUMMIT_RIM_ROCKS = { s0: 124150, s1: 131200, step: 350, back: 1.5, bridge: 4.5, path: 3 } as const;

/** A rim rock as drawn and as solid, both centred `lift` m over its ground point and sharing its yaw. `drawn` is the
 * scale of a dodecahedron of `radius`; `box` is the collider's full size, inscribed in the drawn stone: eight of a
 * dodecahedron's vertices are a cube's corners (radius / sqrt(3) from each axis), and the box is that cube a hair
 * smaller, scaled as the stone is. Nothing solid stands outside what is drawn; the stone's edges overhang the box. */
export function summitRimRockShape(r: { w: number; h: number }) {
  const radius = 0.62,
    drawn = { x: r.w, y: r.h, z: r.w * 0.8 },
    k = 2 * radius * 0.577;
  return { radius, lift: r.h * 0.3, drawn, box: { x: drawn.x * k, y: drawn.y * k, z: drawn.z * k } };
}

/** The rim rocks: centre on the ground (`y`), `w` across and `h` high, yawed. Uneven by a fixed sequence, not chance. */
export function summitRimRocks(g: IslandGround, centre: { x: number; z: number }) {
  const R = SUMMIT_RIM_ROCKS,
    { way, bridgeLeg } = summitPath(g, centre);
  const fromPath = (x: number, z: number) => {
    let best = Infinity;
    for (let i = 0; i < way.length - 1; i++) {
      if (i === bridgeLeg) continue;
      const [ax, az] = way[i]!,
        [bx, bz] = way[i + 1]!,
        dx = bx - ax,
        dz = bz - az,
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
    return best;
  };
  const cut = (x: number, z: number) => g.cone(x, z) - g.islandH(x, z);
  const out: { x: number; y: number; z: number; w: number; h: number; yaw: number }[] = [];
  for (let sCm = R.s0, k = 0; sCm <= R.s1; sCm += R.step, k++) {
    if (Math.abs(sCm - SUMMIT_BRIDGE.sCm) < R.bridge * 100) continue;
    const { middle, nx, nz } = formation(sCm),
      f = (k * 0.618034) % 1;
    // Out from the formation on the summit side until the ground is the uncut hill: that is the rim.
    let d = 5;
    while (d < 40 && cut(middle.x - nx * d, middle.z - nz * d) > 0.05) d += 0.25;
    d += R.back + f * 0.5;
    const x = middle.x - nx * d,
      z = middle.z - nz * d;
    if (fromPath(x, z) < R.path) continue;
    // At least 0.7 high: the inscribed box's top is 0.66 h over the ground, and under 0.45 m a saved pose could
    // return inside a rock (src/place/pose.ts's safe() sweeps down to 0.4 m).
    out.push({ x, y: g.islandH(x, z), z, w: 0.8 + 0.4 * f, h: 0.7 + 0.15 * ((f * 7) % 1), yaw: f * Math.PI });
  }
  return out;
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
