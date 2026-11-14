// Expand authored halt placements into shared visual specifications and unit-box collider placements.
import type { Json, JsonObject, LevelDef, Placement, Vec3 } from './types.ts';
import { haltDeck } from './halt-deck.ts';
import { haltAttachmentPose } from './halt-attachments.ts';
import { haltCrossing } from './halt-crossing.ts';
import { haltRamps } from './halt-ramps.ts';
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
    if (params.piece === 'crossing') {
      placements.push(...haltCrossing(entry.id, params));
      continue;
    }
    if (params.piece === 'ramps') {
      placements.push(...haltRamps(entry.id, params));
      continue;
    }
    const deck = params.piece === 'deck' ? haltDeck(params.row, params.up) : null;
    const colliders = deck?.colliders ?? entry.colliders;
    if (!Array.isArray(colliders)) throw new Error('prefabs: invalid halt colliders');
    const pose =
      !params.ring && ['lever', 'signal', 'road-plaque'].includes(params.piece as string)
        ? haltAttachmentPose(params)
        : null;
    placements.push({
      id: entry.id,
      prefab: entry.prefab as Placement['prefab'],
      pos: pose?.pos ?? [0, 0, 0],
      ...(pose ? { rot: pose.rot } : {}),
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
