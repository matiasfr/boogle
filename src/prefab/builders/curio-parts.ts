// Curio recipes return parts; item names and descriptions remain in cosmetic-parts.ts.
import type { JsonObject } from '../types.ts';
import type { Part } from '../../render/part-geometry.ts';
import { GIFTS } from '../../render/cosmetic-parts.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'town.curio-parts': true;
  }
}
export function curioParts(p: JsonObject): { parts: Part[] } {
  const TOP_BOARD = 2.36 - 0.06;
  if (p.piece === 'gift') {
    const gift = GIFTS.find((g) => g.id === p.gift);
    if (!gift) throw new Error('curio parts: unknown gift');
    return { parts: gift.parts.map((part) => [...part]) };
  }
  if (p.piece === 'dust-skirt') return { parts: [['k', 0, 0.2, 0, 0.36, 0.4, 0.36, '#fff']] };
  const WIDE = p.wide;
  if (typeof WIDE !== 'number') throw new Error('curio parts: expected width');
  const o = '#7f5630',
    b = '#a9794c',
    back = '#5c4530';
  const parts: Part[] = [
    ['b', 0, 1.65, -0.3, WIDE, 3.1, 0.1, back],
    ['b', -WIDE / 2, 1.65, 0, 0.18, 3.3, 0.7, o],
    ['b', WIDE / 2, 1.65, 0, 0.18, 3.3, 0.7, o],
    ['b', 0, 0.42, 0.04, WIDE, 0.1, 0.68, b],
    ['b', 0, 1.26, 0.04, WIDE, 0.1, 0.68, b],
    ['b', 0, TOP_BOARD, 0.04, WIDE, 0.1, 0.68, b],
    ['b', 0, 3.1, 0.04, WIDE + 0.5, 0.14, 1.1, o],
    ['b', 0, 3.3, 0, WIDE + 0.1, 0.34, 0.5, '#c4453a'],
    ['b', 0, 0.12, 0.04, WIDE, 0.22, 0.68, o],
  ];
  // The finders' bay's frame (Place's), in bay space, with its teal band.
  const bo = '#6a5a48',
    bb = '#8f7a60';
  const bay: Part[] = [
    ['b', 0, 1.3, -0.3, WIDE, 2.4, 0.1, '#4c4238'],
    ['b', -WIDE / 2, 1.3, 0, 0.18, 2.6, 0.7, bo],
    ['b', WIDE / 2, 1.3, 0, 0.18, 2.6, 0.7, bo],
    ['b', 0, 1.26, 0.04, WIDE, 0.1, 0.68, bb],
    ['b', 0, 2.14, 0.04, WIDE, 0.1, 0.68, bb],
    ['b', 0, 2.62, 0.04, WIDE + 0.5, 0.14, 1.1, bo],
    ['b', 0, 2.76, 0, WIDE + 0.1, 0.16, 0.5, '#2fb7a0'],
  ];

  if (p.piece === 'shelf') return { parts };
  if (p.piece === 'bay') return { parts: bay };
  throw new Error('curio parts: unknown furnishing');
}
registerBuilder('town.curio-parts', curioParts);
