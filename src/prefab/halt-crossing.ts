// Resolve crossing operands at load, preserving the old flangeways and slab endpoint order.
import {
  UP_HALTS,
  LINKS,
  ORIGIN,
  lineAt,
  railY,
  upLat,
  crossingPlanks,
  CROSSING_SPAN,
  CROSSING_WIDTH,
  FORMATION,
} from '../place/layout.ts';
import type { JsonObject, Placement } from './types.ts';
export function haltCrossing(id: string, params: JsonObject): Placement[] {
  const h = UP_HALTS[params.row as number];
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
  const edge = (d: number) => upLat(FORMATION.quarry, s + d) ?? 0;
  const top = railY(line, s) + 0.22,
    to = h.crossTo ?? CROSSING_SPAN[1];
  const planks = crossingPlanks(edge(-CROSSING_WIDTH / 2), edge(CROSSING_WIDTH / 2), to).map(([l0, l1]) => {
    const a = at(s, (l0 + l1) / 2);
    return [a.x, top - 0.12, a.z, l0 - l1, 0.12, CROSSING_WIDTH];
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
