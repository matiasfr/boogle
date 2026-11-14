// Authored headings and collider operands stay in JSON; derived values exist only in the validated runtime record.
import type { Attach, JsonObject, PrefabDef } from './types.ts';
import { resolveHaltDeck } from './halt-deck.ts';
import { evaluate } from './resolve-layout.ts';
function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('prefabs: expected authored seat attachment object');
  return value as JsonObject;
}
export function resolvePrefab(record: PrefabDef): PrefabDef {
  if (record.layout === undefined) return record;
  const layout = object(record.layout);
  if (layout?.kind === 'room-hull') {
    if (record.colliders.length || record.attach !== undefined)
      throw new Error('prefabs: room hull must be recipe-only');
    const number = (key: string) => {
      const value = layout[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
        throw new Error('prefabs: invalid room hull operand');
      return value;
    };
    const w = number('w'),
      d = number('d'),
      high = number('high'),
      rise = number('rise');
    const index = layout.index,
      phase = layout.phase;
    if (
      typeof index !== 'number' ||
      !Number.isInteger(index) ||
      index < 0 ||
      (phase !== 'hulls' && phase !== 'poles') ||
      index >= (phase === 'hulls' ? 8 : 5)
    )
      throw new Error('prefabs: invalid room hull recipe');
    const floor = 0.14,
      door = 2.6,
      side = (w - door) / 2,
      t = 0.14;
    const rows = Math.round((high - floor) / 0.82);
    if (rows < 3 || side <= 0) throw new Error('prefabs: invalid room doorway');
    const top = floor + (3 * (high - floor)) / rows;
    const hulls = [
      [0, high / 2, -d / 2, w / 2 + t, high / 2, t],
      [-w / 2, high / 2, 0, t, high / 2, d / 2 + t],
      [w / 2, high / 2, 0, t, high / 2, d / 2 + t],
      [-(door + side) / 2, high / 2, d / 2, side / 2, high / 2, t],
      [(door + side) / 2, high / 2, d / 2, side / 2, high / 2, t],
      [0, (top + high) / 2, d / 2, door / 2, (high - top) / 2, t],
      [0, high + 0.2 + rise * 0.3, 0, w / 2 + 0.2, 0.2 + rise * 0.3, d / 2 + 0.2],
      [0, floor / 2, 0, w / 2 + 0.8, floor / 2, d / 2 + 0.8],
    ];
    const poleTop = high + rise + 0.8;
    const poles = [];
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        poles.push([(sx * (w + 1.4)) / 2, poleTop / 2, (sz * (d + 1.4)) / 2, 0.13, poleTop / 2, 0.13]);
    poles.push([0, 1.8 + 0.18, (d + 1.4) / 2, (w + 1.4) / 2, 0.06, 0.35]);
    const h = (phase === 'hulls' ? hulls : poles)[index]!;
    const resolved: PrefabDef = {
      ...record,
      colliders: [
        {
          shape: 'box',
          at: [h[0]!, h[1]!, h[2]!],
          half: [h[3]!, h[4]!, h[5]!],
          ...(phase === 'hulls' && index < 7 ? { group: 'room' as const } : {}),
        },
      ],
    };
    delete resolved.layout;
    return resolved;
  }

  if (layout.kind === 'halt-deck') return resolveHaltDeck(record);
  if (layout.kind === 'colliders') {
    if (!Array.isArray(record.colliders) || record.colliders.length || !Array.isArray(layout.colliders))
      throw new Error('prefabs: collider layout requires an empty collider list and authored recipes');
    const resolved = { ...record, colliders: evaluate(layout.colliders) as unknown as PrefabDef['colliders'] };
    delete resolved.layout;
    return resolved;
  }
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
