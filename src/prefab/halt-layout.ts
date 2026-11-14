// Expand authored halt placements into shared visual specifications and unit-box collider placements.
import type { Json, JsonObject, LevelDef, Placement, Vec3 } from './types.ts';
import { haltDeck } from './halt-deck.ts';
function object(v: unknown): JsonObject {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('prefabs: invalid halt placement');
  return v as JsonObject;
}
export function expandHaltKit(level: LevelDef, entries: Json, fingerprint: Json | undefined): LevelDef {
  if (!Array.isArray(entries) || typeof fingerprint !== 'string') throw new Error('prefabs: invalid halt layout');
  const placements: Placement[] = [];
  for (const raw of entries) {
    const entry = object(raw),
      params = object(entry.params);
    if (
      typeof entry.id !== 'string' ||
      typeof entry.prefab !== 'string' ||
      typeof params.row !== 'number' ||
      typeof params.up !== 'boolean'
    )
      throw new Error('prefabs: invalid halt placement selector');
    const deck = params.piece === 'deck' ? haltDeck(params.row, params.up) : null;
    const colliders = deck?.colliders ?? entry.colliders;
    if (!Array.isArray(colliders)) throw new Error('prefabs: invalid halt colliders');
    placements.push({
      id: entry.id,
      prefab: entry.prefab as Placement['prefab'],
      pos: [0, 0, 0],
      params: { ...params, ...deck?.params },
    });
    for (const [i, raw] of colliders.entries()) {
      const c = object(raw);
      if (
        !Array.isArray(c.half) ||
        c.half.length !== 3 ||
        c.half.some((n) => typeof n !== 'number' || !Number.isFinite(n) || n <= 0)
      )
        throw new Error('prefabs: invalid halt collider dimensions');
      placements.push({
        id: `${entry.id}-solid-${i}`,
        prefab: 'railway.halt-solid',
        pos: c.at as Vec3,
        scale: c.half.map((n) => (n as number) * 2) as unknown as Vec3,
        params,
      });
    }
  }
  const resolved = { ...level, placements, analysis: { sourceFingerprint: fingerprint } };
  delete resolved.layout;
  return resolved;
}
