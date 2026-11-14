import { registerBuilder } from '../builders.ts';
import type { JsonObject } from '../types.ts';
import type { Part } from '../../render/part-geometry.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'town.room-proxy': true;
  }
}
export function roomProxy(p: JsonObject): { parts: Part[] } {
  const w = p.w as number,
    d = p.d as number,
    high = p.high as number;
  const floor = 0.14,
    door = 2.6;
  const top = floor + (3 * (high - floor)) / Math.round((high - floor) / 0.82) - floor;
  const side = (w - door) / 2,
    hh = high - floor,
    t = 0.2;
  const b = (x: number, y: number, z: number, sx: number, sy: number, sz: number): Part => [
    'b',
    x,
    y,
    z,
    sx,
    sy,
    sz,
    '#000000',
  ];
  const parts = [
    b(0, hh + 0.2, 0, w + 1, 0.4, d + 1),
    b(0, hh / 2, -d / 2, w, hh, t),
    b(-w / 2, hh / 2, 0, t, hh, d),
    b(w / 2, hh / 2, 0, t, hh, d),
    b(-(door + side) / 2, hh / 2, d / 2, side, hh, t),
    b((door + side) / 2, hh / 2, d / 2, side, hh, t),
    b(0, (top + hh) / 2, d / 2, door, hh - top, t),
  ];
  if (typeof p.index !== 'number' || !Number.isInteger(p.index) || !parts[p.index])
    throw new Error('rooms: unknown shadow proxy part');
  return { parts: [parts[p.index]!] };
}
registerBuilder('town.room-proxy', roomProxy);
