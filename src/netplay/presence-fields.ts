// Presence fields, kept pure (no three.js, no DOM) so the rules that stop stale values from lingering are unit-tested
// (test/presence-fields.test.mjs). net.ts builds every presence packet with these; features use its hooks instead.
//
//   addField(fields, key, get, core)    appends [key, get] to fields unless `core` (the caller's own keys) or an earlier
//                                       field has the key: core keys and earlier fields win. False when it was refused.
//   mergeFields(pr, fields)             fields: [[key, getter], ...], keys distinct (addField). Writes each getter's
//                                       value into pr. null, undefined and a getter that throws all give `key: null`,
//                                       which makes the room delete the key, so a field that stops is not repeated
//                                       forever. pr can be reused send after send: its keys stay, in the same order, so
//                                       it doesn't grow or reallocate per send. Returns pr.
//   hostField(getter, onValue, isHost)  -> { get, hear } for a Host field: get() publishes getter() only while
//                                       isHost(), else null; hear(value, time, peer) passes on real values only.
export type Presence = Record<string, unknown>;
export type Field = [string, () => unknown];
export function addField(fields: Field[], key: string, get: () => unknown, core: readonly string[]) {
  if (core.includes(key) || fields.some((f) => f[0] === key)) return false;
  fields.push([key, get]);
  return true;
}
export function mergeFields(pr: Presence, fields: readonly Field[]) {
  for (let i = 0; i < fields.length; i++) {
    let v = null;
    try {
      v = fields[i][1]();
    } catch {
      // a broken feature must not break presence
    }
    pr[fields[i][0]] = v ?? null;
  }
  return pr;
}

export function hostField(
  getter: () => unknown,
  onValue: (v: unknown, time: number, peer: string) => void,
  isHost: () => boolean,
) {
  return {
    get: () => (isHost() ? getter() : null),
    hear: (v: unknown, time: number, peer: string) => {
      if (v !== null && v !== undefined) onValue(v, time, peer);
    },
  };
}
