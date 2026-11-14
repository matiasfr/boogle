// Procedural furnishing parts. Authored dimensions stay in records; angles derive only at runtime.
import type { Part } from '../../render/part-geometry.ts';
import type { JsonObject } from '../types.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'town.shop-parts': true;
  }
}
const OAK = '#8a4a2c',
  CREAM = '#fff3d6';
export function shopParts(p: JsonObject): { parts: Part[] } {
  const parts: Part[] = [];
  switch (p.piece) {
    case 'floor':
      for (let k = 0; k < 8; k++)
        parts.push(['b', 0, 0.015, -4 + (k + 0.5), 9.7, 0.03, 0.97, k % 2 ? '#b0875a' : '#a57d51']);
      break;
    case 'counter':
      parts.push(
        ['b', -3.0, 0.52, -2.45, 3.6, 1.04, 1.0, OAK],
        ['b', -3.0, 1.06, -2.45, 3.8, 0.08, 1.15, '#c9a86a'],
        ['b', -3.9, 1.3, -2.45, 0.8, 0.42, 0.6, '#3f4145'],
        ['c', -3.9, 1.55, -2.3, 0.2, 0.08, 0.2, '#d8392b'],
      );
      break;
    case 'step':
      parts.push(['b', -3.0, 0.24, -3.3, 1.2, 0.48, 0.75, '#7f5630']);
      break;
    case 'rug':
      parts.push(['c', 0.5, 0.04, 0.5, 1.4, 0.03, 1.4, '#3f8ee0'], ['c', 0.5, 0.05, 0.5, 1.05, 0.03, 1.05, '#8fd0ff']);
      break;
    case 'rail':
      parts.push(
        ['b', 1.0, 1.7, -3.45, 3.4, 0.08, 0.08, '#3f4145'],
        ['b', -0.65, 0.85, -3.45, 0.08, 1.7, 0.08, '#3f4145'],
        ['b', 2.65, 0.85, -3.45, 0.08, 1.7, 0.08, '#3f4145'],
      );
      for (const x of [-0.2, 0.65, 1.5, 2.3]) parts.push(['b', x, 1.45, -3.45, 0.04, 0.5, 0.04, '#d9a23a']);
      break;
    case 'counter-detail':
      parts.push(
        ['b', -3, 0.52, -1.94, 3.3, 0.72, 0.03, '#b77a4c'],
        ['b', -3, 0.52, -1.91, 0.08, 0.78, 0.04, OAK],
        ['b', -2.05, 1.15, -2.55, 0.75, 0.12, 0.55, '#3f6fb0'],
        ['b', -2.02, 1.26, -2.55, 0.7, 0.1, 0.5, '#e4574a'],
        ['b', -2.02, 1.32, -2.55, 0.1, 0.025, 0.5, CREAM],
        ['c', -3.4, 1.28, -2.35, 0.1, 0.32, 0.1, CREAM, 0, Math.PI / 2],
      );
      break;
    case 'hangers':
      for (const x of [-0.2, 0.65, 1.5, 2.3])
        parts.push(
          ['b', x - 0.11, 1.29, -3.45, 0.3, 0.035, 0.05, '#d9a23a', 0, 0.5],
          ['b', x + 0.11, 1.29, -3.45, 0.3, 0.035, 0.05, '#d9a23a', 0, -0.5],
          ['b', x, 1.22, -3.45, 0.5, 0.035, 0.05, '#d9a23a'],
        );
      break;
    case 'stand': {
      const { x, z } = p;
      if (typeof x !== 'number' || typeof z !== 'number') throw new Error('shop stand: expected position');
      parts.push(
        ['b', x, 0.45, z, 0.8, 0.9, 0.8, '#c9a86a'],
        ['b', x, 0.92, z, 0.9, 0.05, 0.9, OAK],
        ['b', x + Math.sign(x) * 0.55, 1, z, 0.08, 2, 0.08, OAK],
      );
      break;
    }
    case 'highlight':
      parts.push(
        ['b', -0.11, 1.29, -3.4, 0.34, 0.07, 0.06, '#fff0a0', 0, 0.5],
        ['b', 0.11, 1.29, -3.4, 0.34, 0.07, 0.06, '#fff0a0', 0, -0.5],
        ['b', 0, 1.22, -3.4, 0.55, 0.07, 0.06, '#fff0a0'],
      );
      break;
    case 'awning': {
      const STRIPES = 8,
        AW = 2.6 + 3.2;
      for (let k = 0; k < STRIPES; k++)
        parts.push([
          'b',
          -AW / 2 + (k + 0.5) * (AW / STRIPES),
          2.72,
          4 + 0.85,
          AW / STRIPES,
          0.08,
          1.8,
          k % 2 ? '#fff3d6' : '#c4453a',
          0.36,
        ]);
      for (let k = 0; k < STRIPES; k++)
        parts.push([
          's',
          -AW / 2 + ((k + 0.5) * AW) / STRIPES,
          2.36,
          4 + 1.7,
          AW / STRIPES / 2,
          0.18,
          0.055,
          k % 2 ? CREAM : '#c4453a',
        ]);
      break;
    }
    case 'front-table':
      parts.push(
        ['b', -2.6 / 2 - 1.5, 0.45, 4 + 1.0, 1.7, 0.9, 0.9, OAK],
        ['s', -2.6 / 2 - 1.9, 1.02, 4 + 1.0, 0.2, 0.14, 0.2, '#f0c030'],
        ['s', -2.6 / 2 - 1.2, 1.02, 4 + 1.05, 0.2, 0.14, 0.2, '#3f8ee0'],
      );
      break;
    case 'front-box':
      parts.push(
        ['b', 2.6 / 2 + 1.4, 0.4, 4 + 1.0, 0.8, 0.8, 0.8, '#a9794c'],
        ['b', 2.6 / 2 + 1.4, 1.05, 4 + 1.0, 0.1, 0.5, 0.1, '#7f5630'],
        ['b', 2.6 / 2 + 1.4, 1.4, 4 + 1.05, 0.9, 0.5, 0.04, CREAM],
        ['b', 2.6 / 2 + 1.4, 1.4, 4 + 1.08, 0.7, 0.14, 0.02, '#c4453a'],
      );
      break;
    default:
      throw new Error('shop parts: unknown furnishing');
  }
  return { parts };
}
registerBuilder('town.shop-parts', shopParts);
