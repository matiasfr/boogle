// Runtime-only platform dimensions. The compiler keeps the row selector and authored-source fingerprint.
import { HALTS, UP_HALTS, LINKS, ORIGIN, lineAt, railY } from '../place/layout.ts';
import { ISLAND } from '../place/home-station.ts';
import { H } from '../place/terrain.ts';
import { SEA } from '../constants.ts';
import type { PrefabDef } from './types.ts';

export function haltDeck(row: number, up: boolean) {
  if (!Number.isInteger(row) || row < 0 || typeof up !== 'boolean')
    throw new Error('prefabs: invalid halt deck selector');
  const sources = up ? UP_HALTS : [...HALTS, { line: 1 as const, s0: 719, s1: 741, lat: 2.9, island: false }];
  const h = sources[row];
  if (!h) throw new Error('prefabs: invalid halt deck recipe');
  const island = 'island' in h && h.island;
  if (island && h.line !== 0) throw new Error('prefabs: only the first Home edge owns its deck');
  const line = LINKS[h.line]!.line;
  const hw = island ? ISLAND.width / 2 : 1.25,
    half = (h.s1 - h.s0) / 2;
  const low = Math.min(railY(line, h.s0), railY(line, h.s1)) + 0.72;
  const p = { x: 0, z: 0, ux: 0, uz: 1 };
  lineAt(line, (h.s0 + h.s1) / 2, p);
  const ground = H(p.x - p.uz * h.lat + ORIGIN.x, p.z + p.ux * h.lat + ORIGIN.z);
  const overWater = !up && ground < SEA;
  const colliders: PrefabDef['colliders'][number][] = [{ shape: 'box', at: [0, -0.25, 0], half: [hw, 0.25, half] }];
  if (!overWater)
    colliders.push({
      shape: 'box',
      at: [0, (ground - low - 0.5) / 2, 0],
      half: [hw, (low - 0.5 - ground) / 2 + 0.2, half],
    });
  return { colliders, params: { hw, half, low, ground, overWater } };
}
