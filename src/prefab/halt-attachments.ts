// Static attachment poses resolve from authored row selectors, in the same world frame as the old views.
import { ISLAND_LEVER } from '../place/home-station.ts';
import { haltFrame } from './halt-deck.ts';
import type { JsonObject, Vec3 } from './types.ts';
export function haltAttachmentPose(p: JsonObject): { pos: Vec3; rot: Vec3 } {
  const { h, island, hw, half, low, mid, yaw, c } = haltFrame(p.row as number, p.up as boolean);
  const sign = Math.sign(h.lat),
    mast = sign * (hw - 0.3);
  let dl = mast,
    ds = half - 0.8,
    y = low;
  if (p.piece === 'signal') y += 4.2;
  else if (p.piece === 'road-plaque') y += 2.9;
  else if (p.up) {
    if (!('crossS' in h)) throw new Error('halt lever: missing crossing');
    dl = sign * (1.25 - 0.8);
    ds = Math.sign(h.crossS - mid) * (half - 1.4);
  } else {
    dl = island ? sign * (hw - ISLAND_LEVER.edge) : mast - sign * 0.5;
    ds = island ? half - ISLAND_LEVER.fromEnd : half - 0.8 - 0.6;
  }
  return {
    pos: [c.x + dl * Math.cos(yaw) + ds * Math.sin(yaw), y, c.z - dl * Math.sin(yaw) + ds * Math.cos(yaw)],
    rot: [yaw + (p.piece === 'signal' && sign <= 0 ? Math.PI : 0), 0, 0],
  };
}
