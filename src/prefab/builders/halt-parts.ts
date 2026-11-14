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
  if (piece === 'crossing-visual')
    return {
      parts: (p.planks as number[][]).map(([x, y, z, w, h, d]): Part => [
        'b',
        x!,
        y! + h! / 2,
        z!,
        w!,
        h!,
        d!,
        '#a97a45',
      ]),
    };
  if (piece === 'stack-display')
    return {
      parts: [
        ...[-0.42, 0.42].map((x): Part => ['b', x, 0.475, 0, 0.07, 0.95, 0.07, '#6f7275']),
        ['b', 0, 1.35, 0, 1.08, 0.88, 0.08, '#23262d'],
        ['b', 0, 1.825, 0, 1.2, 0.07, 0.22, '#9c9ea1'],
      ],
    };
  if ((piece !== 'deck' && typeof sign !== 'number') || typeof hw !== 'number' || typeof half !== 'number')
    throw new Error('halt kit: missing frame dimensions');
  const parts: Part[] = [];
  const part = (x: number, y: number, z: number, w: number, h: number, d: number, colour: string) =>
    parts.push(['b', x, y + h / 2, z, w, h, d, colour]);
  const POST = '#7f5630',
    WOOD = '#a9794c',
    ROOF = '#c4453a';
  const dimensions = p.post as number[] | undefined;
  const post = dimensions?.[1] ?? 3.2,
    shelter = -4.8,
    CANOPY = dimensions?.[1] ?? 4.6;
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
    for (const ds of [-3, 3]) part(-sign * 0.95, 0, shelter + ds, dimensions![0]!, post, dimensions![2]!, POST);
    part(-sign * 0.4, post, shelter, 2.4, 0.16, 8, WOOD);
    part(-sign * 0.4, post + 0.16, shelter, 2.7, 0.14, 8.4, ROOF);
  } else if (piece === 'bench') {
    for (const ds of [-1.2, 1.2]) part(-sign * 0.75, 0, shelter + ds, 0.5, 0.42, 0.16, POST);
    part(-sign * 0.75, 0.42, shelter, 0.56, 0.1, 3, WOOD);
    part(-sign * 1.02, 0.5, shelter, 0.1, 0.5, 3, WOOD);
  } else if (piece === 'canopy') {
    for (const f of [-0.75, -0.25, 0.25, 0.75])
      part(0, 0, f * (half * 2 - 2), dimensions![0]!, CANOPY, dimensions![2]!, POST);
    part(0, CANOPY, 0, hw * 2 + 1, 0.16, half * 2, WOOD);
    part(0, CANOPY + 0.16, 0, hw * 2 + 1.3, 0.14, half * 2 + 0.3, ROOF);
  } else if (piece === 'display') {
    const island = p.island === true;
    const across = island ? 0 : -sign * 1.0,
      along = island ? 0 : shelter + 2.25;
    const sized = (wide: number, deep: number): [number, number] => (island ? [wide, deep] : [deep, wide]);
    const frame = (dy: number, dh: number, wide: number, deep: number, colour: string, dw = 0) => {
      const [w, d] = sized(wide, deep),
        [ow, od] = sized(dw, 0);
      part(across + ow, dy, along + od, w, dh, d, colour);
    };
    const bottom = 1.35 - 0.8 / 2;
    for (const side of [-1, 1]) {
      frame(0, bottom, 0.07, 0.07, POST, side * 0.42);
      frame(0, 0.04, 0.1, 0.32, POST, side * 0.42);
    }
    frame(bottom - 0.04, 0.8 + 0.08, 1.0 + 0.08, 0.08, '#23262d');
    frame(1.35 + 0.8 / 2 + 0.04, 0.07, 1.0 + 0.2, 0.22, ROOF);
  } else if (piece === 'mast')
    part(sign * (hw - 0.3), 0, half - 0.8, dimensions![0]!, dimensions![1]!, dimensions![2]!, '#3a3d44');
  else throw new Error(`halt kit: unknown piece ${piece}`);
  return { parts };
}
registerBuilder('railway.halt-parts', haltParts);
