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
  const { piece, hw, half } = p;
  const sign = p.sign as number;
  if ((piece !== 'deck' && typeof sign !== 'number') || typeof hw !== 'number' || typeof half !== 'number')
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
  if (piece === 'deck') {
    const { ground, low, overWater } = p;
    if (typeof ground !== 'number' || typeof low !== 'number' || typeof overWater !== 'boolean')
      throw new Error('halt kit: missing resolved deck dimensions');
    const lengths = Math.ceil((half * 2) / 6);
    for (let k = 0; k < lengths; k++)
      part(0, -0.5, -half + ((k + 0.5) * half * 2) / lengths, hw * 2, 0.5, (half * 2) / lengths + 0.02, '#bdb8ac');
    for (const sl of [-1, 1]) part(sl * (hw - 0.15), -0.04, 0, 0.3, 0.05, half * 2, '#f2d36a');
    if (!overWater) part(0, ground - low, 0, hw * 2, low - 0.5 - ground, half * 2, '#9a9184');
    else
      for (let ds = -half + 1; ds <= half - 1 + 1e-6; ds += (half * 2 - 2) / 3)
        for (const dl of [-0.9, 0.9]) part(dl, ground - low, ds, 0.4, low - 0.5 - ground, 0.4, '#a2743f');
  } else if (piece === 'shelter') {
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
