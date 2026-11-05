// Local, bounded playtest records. No frame work and no game-state authority.
export type TuneFields = Record<string, string | number | boolean | null>;
export type TuneRecordKind = 'tune.begin' | 'tune.value' | 'tune.end' | 'tune.change' | 'tune.setup' | 'tune.active';
type Listener = (kind: TuneRecordKind, fields: TuneFields) => void;
const listeners = new Set<Listener>();

/** Diagnostic checksum over canonical resolved values, independent of record ordering. */
export function tuneDigest(rows: readonly { id: string; value: number }[]) {
  const canonical = JSON.stringify(
    [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map(({ id, value }) => [id, value]),
  );
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i++) hash = Math.imul(hash ^ canonical.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function onTuneRecord(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitTuneRecord(kind: TuneRecordKind, fields: TuneFields) {
  for (const listener of listeners) listener(kind, fields);
}
