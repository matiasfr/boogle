// Resolve crossing operands at load, preserving the old flangeways and slab endpoint order.
import {
  OFFSET_HALTS,
  LINKS,
  ORIGIN,
  lineAt,
  railY,
  offsetLat,
  crossingPlanks,
  CROSSING_SPAN,
  CROSSING_WIDTH,
  FORMATION,
  OFFSET_LAT,
} from '../place/layout.ts';
import type { JsonObject, Placement } from './types.ts';
type Line = (typeof LINKS)[number]['line'];
/** The planks' walking top, flush with the rail tops. A start ramp whose foot the planks meet starts at it (halt-ramps.ts). */
export const crossingTop = (line: Line, s: number) => railY(line, s) + 0.22;
/** An up halt's plank top where its crossing ends at its start ramp's foot (`crossS + CROSSING_WIDTH / 2 === s0 - head`),
 * else null: that ramp then starts level with the planks instead of a step below them. */
export function crossingFootY(row: number, head: number): number | null {
  const h = OFFSET_HALTS[row];
  if (!h || Math.abs(h.crossS + CROSSING_WIDTH / 2 - (h.s0 - head)) > 1e-6) return null;
  return crossingTop(LINKS[h.line]!.line, h.crossS);
}
export function haltCrossing(id: string, params: JsonObject): Placement[] {
  const h = OFFSET_HALTS[params.row as number];
  if (!h || params.up !== true) throw new Error('halt crossing: invalid row');
  const line = LINKS[h.line]!.line;
  const p = { x: 0, z: 0, ux: 0, uz: 1 };
  const at = (s: number, l: number) => {
    lineAt(line, s, p);
    return { x: p.x - p.uz * l + ORIGIN.x, z: p.z + p.ux * l + ORIGIN.z };
  };
  lineAt(line, (h.s0 + h.s1) / 2, p);
  const yaw = Math.atan2(p.ux, p.uz),
    s = h.crossS;
  // The Pier's platform opens with Q7, when the offset track continues past the old s 556 stub.
  const edge = (d: number) => (h.piles ? OFFSET_LAT : (offsetLat(FORMATION.quarry, s + d) ?? 0));
  const top = crossingTop(line, s),
    to = h.crossTo ?? CROSSING_SPAN[1];
  const planks = crossingPlanks(edge(-CROSSING_WIDTH / 2), edge(CROSSING_WIDTH / 2), to).map(([l0, l1]) => {
    const a = at(s, (l0 + l1) / 2);
    // Keep the walking top fixed; inset only the underside 1 cm from the rail foot plane.
    return [a.x, top - 0.11, a.z, l0 - l1, 0.11, CROSSING_WIDTH];
  });
  const a0 = at(s, CROSSING_SPAN[0]),
    a1 = at(s, to);
  const dx = a1.x - a0.x,
    dz = a1.z - a0.z,
    len = Math.hypot(dx, dz);
  const common = { ...params, world: true };
  return [
    {
      id: `${id}-visual`,
      prefab: 'railway.halt-parts',
      pos: [0, 0, 0],
      params: { ...common, piece: 'crossing-visual', yaw, planks },
    },
    {
      id: `${id}-solid`,
      prefab: 'railway.halt-solid',
      pos: [(a0.x + a1.x) / 2, top - 0.2, (a0.z + a1.z) / 2],
      rot: [Math.atan2(dx, dz), 0, 0],
      scale: [CROSSING_WIDTH, 0.4, len],
      params: { ...common, piece: 'crossing', support: [a0.x, a0.z, a1.x, a1.z, top, top, CROSSING_WIDTH] },
    },
  ];
}
