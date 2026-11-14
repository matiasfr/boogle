// Each furnishing recipe returns its original parts; solids and label references live with its record.
import { registerBuilder } from '../builders.ts';
import type { JsonObject } from '../types.ts';
import type { Part } from '../../render/part-geometry.ts';
import { SPIRE } from '../../place/layout.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'town.museum-parts': true;
  }
}
const STONE = '#c8c3b4',
  STONE2 = '#b2ad9f';
const TABLE = { x: 0, z: 1.05, w: 6.0, d: 4.0, top: 1.0 };
const SPEC = { x: 0, z: -3.75 };
const SCALE = 1 / 120;
const SPAN = { x0: -220, x1: 480, z0: -238, z1: 222 };
const toTableX = (x: number) => (x - (SPAN.x0 + SPAN.x1) / 2) * SCALE + TABLE.x;
const toTableZ = (z: number) => (z - (SPAN.z0 + SPAN.z1) / 2) * SCALE + TABLE.z;
export function museumParts(p: JsonObject): { parts: Part[] } {
  const w = 13,
    d = 12,
    high = 5;
  if (['column', 'drawer', 'reflector', 'cushion'].includes(p.piece as string) && typeof p.x !== 'number')
    throw new Error('museum: expected furnishing position');
  switch (p.piece) {
    case 'floor': {
      const parts: Part[] = [];
      for (let i = 0; i < 7; i++)
        for (let j = 0; j < 6; j++)
          parts.push([
            'b',
            -w / 2 + (i + 0.5) * (w / 7),
            0.015,
            -d / 2 + (j + 0.5) * (d / 6),
            w / 7 - 0.03,
            0.03,
            d / 6 - 0.03,
            (i + j) % 2 ? '#a9a497' : '#979286',
          ]);
      return { parts };
    }
    case 'alcove-back':
      return { parts: [['b', SPEC.x, 2.1, -5.65, 8.6, 4.2, 0.14, '#1d2340']] };
    case 'alcove-left':
      return { parts: [['b', SPEC.x - 4.3, 2.1, -5.2, 0.14, 4.2, 1.0, '#1d2340']] };
    case 'alcove-right':
      return { parts: [['b', SPEC.x + 4.3, 2.1, -5.2, 0.14, 4.2, 1.0, '#1d2340']] };
    case 'plinth':
      return {
        parts: [
          // The stone's plinth, low and wide.
          ['b', SPEC.x, 0.18, SPEC.z, 6.6, 0.36, 2.9, '#6f6b63'],
          ['b', SPEC.x, 0.42, SPEC.z, 6.2, 0.12, 2.5, '#4f4c47'],
        ],
      };
    case 'table':
      return {
        parts: [
          // The table: a wide, plain thing, with a rim to hold the sea in.
          ['b', TABLE.x, 0.46, TABLE.z, TABLE.w + 0.1, 0.92, TABLE.d + 0.1, '#5c4530'],
          ['b', TABLE.x, TABLE.top - 0.03, TABLE.z - TABLE.d / 2 - 0.05, TABLE.w + 0.3, 0.1, 0.1, '#7f5630'],
          ['b', TABLE.x, TABLE.top - 0.03, TABLE.z + TABLE.d / 2 + 0.05, TABLE.w + 0.3, 0.1, 0.1, '#7f5630'],
          ['b', TABLE.x - TABLE.w / 2 - 0.05, TABLE.top - 0.03, TABLE.z, 0.1, 0.1, TABLE.d + 0.3, '#7f5630'],
          ['b', TABLE.x + TABLE.w / 2 + 0.05, TABLE.top - 0.03, TABLE.z, 0.1, 0.1, TABLE.d + 0.3, '#7f5630'],
        ],
      };
    case 'bench':
      return {
        parts: [
          // A bench for two, facing the stone.
          ['b', -3.9, 0.42, -1.3, 2.4, 0.12, 0.7, '#7f5630'],
          ['b', -4.9, 0.2, -1.3, 0.14, 0.4, 0.6, '#5c4530'],
          ['b', -2.9, 0.2, -1.3, 0.14, 0.4, 0.6, '#5c4530'],
        ],
      };
    case 'label-specimen':
      return { parts: [['b', -2.8, 0.55, -2.5, 0.08, 1.1, 0.08, '#3f4145']] };
    case 'label-table':
      return { parts: [['b', TABLE.x, 0.55, TABLE.z + TABLE.d / 2 + 0.55, 0.08, 1.1, 0.08, '#3f4145']] };
    case 'cabinet-trim':
      return {
        parts: [
          // Brass-lined display cabinetry: the island is an exhibit, not a crate.
          ['b', 0, 0.17, TABLE.z + TABLE.d / 2 + 0.06, 5.8, 0.04, 0.025, '#d9a23a'],
          ['b', 0, 0.79, TABLE.z + TABLE.d / 2 + 0.06, 5.8, 0.04, 0.025, '#d9a23a'],
        ],
      };
    case 'cushion':
      return { parts: [['b', p.x as number, 0.52, -1.3, 1.05, 0.08, 0.58, '#356b74']] };
    case 'drawer': {
      const x = p.x as number;
      return {
        parts: [
          ['b', x, 0.48, TABLE.z + TABLE.d / 2 + 0.06, 1.75, 0.48, 0.025, '#7f6244'],
          ['b', x, 0.52, TABLE.z + TABLE.d / 2 + 0.09, 0.22, 0.04, 0.04, '#d9a23a'],
        ],
      };
    }
    case 'reflector': {
      const x = p.x as number;
      return {
        parts: [
          ['c', x, 0.51, SPEC.z + 0.85, 0.16, 0.08, 0.16, '#3f4145'],
          ['k', x, 0.65, SPEC.z + 0.85, 0.2, 0.22, 0.2, '#d9a23a', Math.PI],
          ['c', x, 0.77, SPEC.z + 0.85, 0.14, 0.015, 0.14, '#fff0c9'],
        ],
      };
    }
    case 'column': {
      const x = p.x as number;
      return {
        parts: [
          ['c', x, high / 2, d / 2 + 1.5, 0.34, high, 0.34, STONE],
          ['b', x, 0.1, d / 2 + 1.5, 0.95, 0.2, 0.95, STONE2],
          ['b', x, high - 0.1, d / 2 + 1.5, 0.95, 0.22, 0.95, STONE2],
        ],
      };
    }
    case 'apron':
      return { parts: [['b', 0, 0.05, d / 2 + 1.6, w + 1, 0.1, 3.2, '#b2ad9f']] };
    case 'cornice':
      return {
        parts: [
          ['b', 0, high + 0.25, d / 2 + 1.5, w + 0.6, 0.5, 1.6, STONE],
          ['b', 0, high + 0.7, d / 2 + 1.5, w + 0.2, 0.42, 1.3, STONE2],
          ['b', 0, high + 1.08, d / 2 + 1.5, w * 0.62, 0.36, 1.1, STONE],
        ],
      };
    case 'spire':
      return {
        parts: [
          ['k', toTableX(SPIRE.x), TABLE.top + 0.42, toTableZ(SPIRE.z), 0.09, 0.84, 0.09, '#8d8a80', 0.08],
          ['s', toTableX(SPIRE.x), TABLE.top + 0.06, toTableZ(SPIRE.z), 0.11, 0.08, 0.11, '#6d6f78'],
        ],
      };
    default:
      throw new Error('museum: unknown furnishing');
  }
}
registerBuilder('town.museum-parts', museumParts);
