// The wine cellar's barrel racks (content/prefabs/pois.ts, `cave.rack-bay`): bays spread evenly along the cellar's
// long walls, so a bay's width comes from the cellar's length. Shared by the bay's builder, its collider recipe and
// the cave furnishing that places the bays (src/pois/caves/decor.ts).
import type { ColliderDef, JsonObject } from './types.ts';

export type CellarRackDims = { length: number; margin: number; pitch: number };

export function cellarRackDims(params: JsonObject): CellarRackDims {
  for (const key of ['length', 'margin', 'pitch'] as const) {
    const value = params[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
      throw new Error(`prefabs: invalid cellar rack ${key}`);
  }
  const d = params as unknown as CellarRackDims;
  if (d.length <= d.margin + d.pitch) throw new Error('prefabs: cellar rack has no room for two bays');
  return d;
}

/** How many bays fit along the wall, and the distance between their centres. */
export function cellarRack(d: CellarRackDims) {
  const count = Math.floor((d.length - d.margin) / d.pitch) + 1;
  return { count, step: (d.length - d.margin) / (count - 1) };
}

export const cellarRackCollider = (d: CellarRackDims): ColliderDef => ({
  shape: 'box',
  at: [0, 0.9, 0],
  half: [cellarRack(d).step / 2, 0.9, 0.5],
  group: 'cave',
});
