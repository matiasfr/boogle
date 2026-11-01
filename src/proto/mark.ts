// Small events for the playtest trace (src/proto/trace/record.ts; docs/research/playtest-telemetry.md, recs 3-5): a
// failure or the verb happened (`protoMark('crash')`), and what you are doing right now (`protoActivity(() => ...)`).
// Import-free and cheap on every page, so the hooks stay one line each in the places where wipeouts and tumbles
// already happen; without a `?proto=` page nothing listens and they do nothing. Local only, never read by the sim.

/** What a prototype says you are doing, beyond what the recorder sees on its own (decks, swimming, standing still). */
export type HookActivity = 'driving' | 'carrying';

const markFns = new Set<(kind: string) => void>();
const activityFns: (() => HookActivity | null)[] = [];

/** Something worth a dot on the protos page's map happened at your position: a failure (`'crash'`, `'tumble'`,
 * `'spill'`, ...) or `'verb'`, the prototype's verb, the first time. Name it as a singular noun. */
export function protoMark(kind: string) {
  for (const fn of markFns) fn(kind);
}
export const onProtoMark = (fn: (kind: string) => void) => void markFns.add(fn);

/** Adds a getter that names what you are doing now (null: not this). The first non-null wins. */
export const protoActivity = (fn: () => HookActivity | null) => void activityFns.push(fn);
export function hookActivity(): HookActivity | null {
  for (const fn of activityFns) {
    const a = fn();
    if (a) return a;
  }
  return null;
}
