// Small events for the playtest trace (src/proto/trace/record.ts; docs/research/playtest-telemetry.md, recs 3-5): a
// failure or the verb happened (`protoMark('crash')`), and what you are doing right now (`protoActivity(() => ...)`).
// And for the playtest data that reaches us (src/proto/playdata/record.ts, `npm run playtest`): `playMark` for anything
// worth knowing happened, `playObjective` when the objective line changes, `playWhere` for what place you're in.
// Import-free and cheap on every page, so the hooks stay one line each in the places where these things already happen;
// without a `?proto=` page nothing listens and they do nothing. Never read by the sim.

/** What a prototype says you are doing, beyond what the recorder sees on its own (decks, swimming, standing still). */
export type HookActivity = 'driving' | 'carrying';

const markFns = new Set<(kind: string) => void>();
const activityFns: (() => HookActivity | null)[] = [];

/** Something worth a dot on the protos page's map happened at your position: a failure (`'crash'`, `'tumble'`,
 * `'spill'`, ...) or `'verb'`, the prototype's verb, the first time. Name it as a singular noun. */
export function protoMark(kind: string) {
  for (const fn of markFns) fn(kind);
  playMark(kind);
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

// ---------------------------------------------------------------- playtest data (src/proto/playdata/record.ts)
/** What a mark may carry: a few flat numbers, words and yes-or-nos. Never text a player typed. */
export type PlayData = Record<string, string | number | boolean | null | undefined>;
type PlayFn = (name: string, data: PlayData | undefined, ms: number) => void;
let playFn: PlayFn | null = null;
const early: [string, PlayData | undefined, number][] = []; // before the recorder's chunk arrives
const EARLY = 100;
const watchers: PlayFn[] = [];
let whereFn: (() => string | null) | null = null;

/** One beat of a playtest happened, at your position: `playMark('crate opened', { kind: 'hat' })`. Name it as a person
 * would read it in the session's summary. Safe to call anywhere, any time, on any page. */
export function playMark(name: string, data?: PlayData) {
  if (playFn) playFn(name, data, performance.now());
  else if (early.length < EARLY) early.push([name, data, performance.now()]);
  for (const fn of watchers) fn(name, data, performance.now());
}
/** The objective line now says `text`: the summary times each one. Repeats of the same text are ignored. */
export const playObjective = (text: string) => playMark('objective', { text });
/** Names the place you're in now ('village', 'the mine'; null: nowhere in particular), asked once a second. */
export const playWhere = (fn: () => string | null) => void (whereFn = fn);
export const playWhereNow = () => whereFn?.() ?? null;
/** Tools see the marks too, as they come: `npm run playthrough` (dev/look/observe.ts). */
export const watchPlayMarks = (fn: PlayFn) => void watchers.push(fn);
/** The recorder takes the marks, those made so far first. */
export function onPlayMark(fn: PlayFn) {
  playFn = fn;
  for (const [name, data, ms] of early.splice(0)) fn(name, data, ms);
}

/** Latest replicated roster. Names are the consented exception. Sync kind: Local diagnostics only. */
export type RosterSnapshot = { rows: readonly (readonly [string, string, number])[]; tick: number };
export const ROSTER_SNAPSHOT_MS = 30_000;
export const { record: recordRosterSnapshot, subscribe: onRosterSnapshot } =
  snapshotChannel<RosterSnapshot>(ROSTER_SNAPSHOT_MS);

/** Authoritative occupancy only; predicted sits are separate local marks. Sync kind: Local diagnostics. */
export type SeatSnapshot = { rows: readonly { readonly id: string; readonly pid: string }[]; tick: number };
export const SEAT_SNAPSHOT_MS = 30_000;
export const { record: recordSeatSnapshot, subscribe: onSeatSnapshot } =
  snapshotChannel<SeatSnapshot>(SEAT_SNAPSHOT_MS);

/** Each recorder starts complete, even when loaded late. Subsequent dirty/refill snapshots have a fixed trailing
 * window: more updates replace the pending state without postponing the flush. No idle timer or unbounded queue. */
function snapshotChannel<T>(windowMs: number) {
  let latest: T | undefined;
  const listeners = new Set<() => void>();
  return {
    record(snapshot: T) {
      latest = snapshot;
      for (const listener of listeners) listener();
    },
    subscribe(listener: (snapshot: T) => void) {
      let started = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const receive = () => {
        if (!started) {
          started = true;
          listener(latest!);
        } else if (timer === undefined) {
          timer = setTimeout(() => {
            timer = undefined;
            listener(latest!);
          }, windowMs);
        }
      };
      listeners.add(receive);
      if (latest) receive();
      return () => {
        listeners.delete(receive);
        if (timer !== undefined) clearTimeout(timer);
      };
    },
  };
}
