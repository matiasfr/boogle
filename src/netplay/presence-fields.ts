// Presence fields, kept pure (no three.js, no DOM) so the rules that stop stale values from lingering are unit-tested
// (test/presence-fields.test.mjs). net.js builds every presence packet with these; features use its hooks instead.
//
//   mergeFields(pr, fields)             fields: [[key, getter], ...]. Each getter's value joins pr unless pr already
//                                       has the key (core keys and earlier fields win). null, undefined and a getter
//                                       that throws all give `key: null`, which makes peer-room delete the key, so a
//                                       field that stops is not repeated forever. Returns pr.
//   hostField(getter, onValue, isHost)  -> { get, hear } for a Host field: get() publishes getter() only while
//                                       isHost(), else null; hear(value, time, peer) passes on real values only.
export type Presence = Record<string, unknown>;
export function mergeFields(pr: Presence, fields: [string, () => unknown][]) {
  for (const [key, get] of fields) {
    let v = null;
    try {
      v = get();
    } catch {
      // a broken feature must not break presence
    }
    if (!(key in pr)) pr[key] = v ?? null;
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
