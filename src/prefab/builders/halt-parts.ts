// Original drop-set parts, returned in reveal order. No mesh or collider allocation here.
import type { JsonObject } from '../types.ts';
import type { Part } from '../../render/part-geometry.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'railway.halt-parts': true;
  }
}
export function haltParts(p: JsonObject): { parts: Part[] } {
  const { piece, sign, hw, half } = p;
  if (typeof sign !== 'number' || typeof hw !== 'number' || typeof half !== 'number')
    throw new Error('halt kit: missing frame dimensions');
  const parts: Part[] = [];
  const part = (x: number, y: number, z: number, w: number, h: number, d: number, colour: string) =>
    parts.push(['b', x, y + h / 2, z, w, h, d, colour]);
  const POST = '#7f5630',
    WOOD = '#a9794c',
    ROOF = '#c4453a';
  const post = 3.2,
    shelter = -4.8,
    CANOPY = 4.6;
  if (piece === 'shelter') {
    for (const ds of [-3, 3]) part(-sign * 0.95, 0, shelter + ds, 0.22, post, 0.22, POST);
    part(-sign * 0.4, post, shelter, 2.4, 0.16, 8, WOOD);
    part(-sign * 0.4, post + 0.16, shelter, 2.7, 0.14, 8.4, ROOF);
  } else if (piece === 'bench') {
    for (const ds of [-1.2, 1.2]) part(-sign * 0.75, 0, shelter + ds, 0.5, 0.42, 0.16, POST);
    part(-sign * 0.75, 0.42, shelter, 0.56, 0.1, 3, WOOD);
    part(-sign * 1.02, 0.5, shelter, 0.1, 0.5, 3, WOOD);
  } else if (piece === 'canopy') {
    for (const f of [-0.75, -0.25, 0.25, 0.75]) part(0, 0, f * (half * 2 - 2), 0.24, CANOPY, 0.24, POST);
    part(0, CANOPY, 0, hw * 2 + 1, 0.16, half * 2, WOOD);
    part(0, CANOPY + 0.16, 0, hw * 2 + 1.3, 0.14, half * 2 + 0.3, ROOF);
  } else if (piece === 'mast') part(sign * (hw - 0.3), 0, half - 0.8, 0.14, 4.4, 0.14, '#3a3d44');
  else throw new Error(`halt kit: unknown piece ${piece}`);
  return { parts };
}
registerBuilder('railway.halt-parts', haltParts);
