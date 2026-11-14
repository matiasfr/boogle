// Construction parts retain the shared plan's matrices, palettes, tapered gables and submission order.
import { registerBuilder, type ConstructionBuild } from '../builders.ts';
import type { JsonObject } from '../types.ts';
import { housePlan, type HouseSpec, type Plan } from '../../place/building-plans.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'town.room-shell': true;
  }
}
let previous = '',
  cached: Plan | undefined;
export function roomShell(p: JsonObject): ConstructionBuild {
  const spec = p.spec as JsonObject;
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new Error('rooms: missing shell operands');
  for (const key of ['w', 'd', 'high', 'rise'] as const)
    if (typeof spec[key] !== 'number' || !Number.isFinite(spec[key]))
      throw new Error('rooms: invalid shell dimensions');
  for (const key of ['x', 'y', 'z', 'yaw'] as const)
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key])) throw new Error('rooms: missing runtime room frame');
  const signature = JSON.stringify([spec, p.x, p.y, p.z, p.yaw]);
  if (!cached || signature !== previous) {
    const w = spec.w as number,
      d = spec.d as number;
    const s = {
      ...spec,
      x: p.x,
      z: p.z,
      yaw: p.yaw,
      door: { w: 2.6, rows: 3 },
      closed: false,
      windows: '#3f4a57',
      floor: 0.14,
      ...(spec.smoke ? { chimney: { dx: w * 0.38, dz: d * 0.2, n: 5, a: '#9a4a3a', b: '#8a4032' } } : {}),
    };
    cached = housePlan(s as unknown as HouseSpec, p.y as number);
    cached.keepOut = {
      dx: 0,
      dy: (spec.high as number) / 2,
      dz: 0,
      hx: w / 2 + 0.1,
      hy: (spec.high as number) / 2,
      hz: d / 2 + 0.1,
    };
    previous = signature;
  }
  if (p.phase !== 'scaffold' && p.phase !== 'pieces') throw new Error('rooms: unknown construction phase');
  const index = p.index;
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || !cached[p.phase][index])
    throw new Error('rooms: unknown shell part');
  return { construction: { plan: cached, phase: p.phase, parts: [cached[p.phase][index]!] } };
}
registerBuilder('town.room-shell', roomShell);
