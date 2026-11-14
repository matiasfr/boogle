// Resolve the old platform ramp endpoints at load time; no native geometry enters the artifact.
import { ORIGIN, lineAt, railY } from '../place/layout.ts';
import { ISLAND } from '../place/home-station.ts';
import { H } from '../place/terrain.ts';
import { SEA } from '../constants.ts';
import { haltFrame } from './halt-deck.ts';
import type { JsonObject, Placement } from './types.ts';

export function haltRamps(id: string, params: JsonObject): Placement[] {
  const { h, island, line, mid, low, c } = haltFrame(params.row as number, params.up as boolean);
  const up = params.up === true,
    width = island ? ISLAND.width : 2.5;
  const p = { x: 0, z: 0, ux: 0, uz: 1 };
  const at = (s: number, lat: number) => {
    lineAt(line, s, p);
    return { x: p.x - p.uz * lat + ORIGIN.x, z: p.z + p.ux * lat + ORIGIN.z };
  };
  const water = !up && H(c.x, c.z) < SEA;
  const placements: Placement[] = [];
  let index = 0;
  const ramp = (top: { x: number; z: number }, foot: { x: number; z: number }, footY = H(foot.x, foot.z) + 0.05) => {
    const dx = top.x - foot.x,
      dz = top.z - foot.z,
      len = Math.hypot(dx, dz),
      dy = low - footY,
      full = Math.hypot(len, dy),
      yaw = Math.atan2(dx, dz),
      pitch = -Math.atan2(dy, len),
      x = (foot.x + top.x) / 2,
      y = (footY + low) / 2 - 0.2,
      z = (foot.z + top.z) / 2;
    const common = { ...params, world: true };
    placements.push(
      {
        id: `${id}-${index}-visual`,
        prefab: 'railway.halt-ramp',
        pos: [0, 0, 0],
        params: { ...common, piece: 'ramp-visual', x, y, z, width, full, yaw, pitch },
      },
      {
        id: `${id}-${index}-solid`,
        prefab: 'railway.halt-solid',
        pos: [x, y, z],
        rot: [yaw, pitch, 0],
        scale: [width, 0.4, full + 0.1],
        params: { ...common, piece: 'ramp', support: [foot.x, foot.z, top.x, top.z, footY, low, width] },
      },
    );
    index++;
  };
  const head = island ? ISLAND.headRamp : 6,
    end = island ? ISLAND.endRamp : 6;
  ramp(at(h.s0, h.lat), at(h.s0 - head, h.lat), water ? railY(line, h.s0 - head) + 0.05 : undefined);
  if (!water && (!up || ('endRamp' in h && h.endRamp))) ramp(at(h.s1, h.lat), at(h.s1 + end, h.lat));
  if (!water && !island) ramp(at(mid, h.lat + Math.sign(h.lat) * 1.25), at(mid, h.lat + Math.sign(h.lat) * 7));
  return placements;
}
