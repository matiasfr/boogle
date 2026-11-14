// Authored seat headings stay in degrees in JSON; runtime attachments keep their existing radians contract.
import type { Attach, JsonObject, PrefabDef } from './types.ts';
function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('prefabs: expected authored seat attachment object');
  return value as JsonObject;
}
export function resolvePrefab(record: PrefabDef): PrefabDef {
  if (record.layout === undefined) return record;
  const layout = record.layout;
  if (
    !layout ||
    typeof layout !== 'object' ||
    Array.isArray(layout) ||
    layout.kind !== 'seat-attachments' ||
    record.attach !== undefined
  )
    throw new Error('prefabs: invalid seat attachment layout');
  const entries = layout.attach;
  if (!entries || typeof entries !== 'object' || Array.isArray(entries))
    throw new Error('prefabs: expected authored seat attachments');
  const attach = Object.fromEntries(
    Object.entries(entries).map(([name, value]) => {
      const attachment = object(value);
      if (attachment.kind !== 'seat' || 'yaw' in attachment)
        throw new Error('prefabs: expected seat with authored yawDegrees');
      const { yawDegrees, ...seat } = attachment;
      if (typeof yawDegrees !== 'number' || !Number.isFinite(yawDegrees))
        throw new Error('prefabs: yawDegrees must be finite');
      // Divide the authored angle first: cardinal headings retain main's exact PI and PI/2 values.
      return [name, { ...seat, yaw: (yawDegrees / 180) * Math.PI }];
    }),
  ) as unknown as Record<string, Attach>;
  const resolved = { ...record, attach };
  delete resolved.layout;
  return resolved;
}
