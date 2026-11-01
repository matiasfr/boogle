// Behaviour counters for prototypes (docs/research/finding-the-fun.md, rec 10: record what the owner does, not only
// what he says). A prototype calls `protoCount('rides')` when something worth counting happens; the count lands in
// this browser's protos store (protos/store.ts) under the card for the page's `?proto=`, shows on the in-game
// prototype bar and goes into the protos page's copied playtest entry ("3 rides, 2 variant switches, 6 min in
// prototype"). Name counters as plural nouns a person reads. Local only: never synced, never read by the sim.
import { cardFor, write } from '../../protos/store.ts';

const card = cardFor(location.search);
let pending: Record<string, number> = {};
let timer = 0;
const listeners = new Set<() => void>();

/** Writes the buffered counts now (the bar does on hide and before a reload). */
export function flushCounts() {
  clearTimeout(timer);
  timer = 0;
  if (!card || !Object.keys(pending).length) return;
  const add = pending;
  pending = {};
  write(card.id, {}, add);
  for (const fn of listeners) fn();
}

/** Adds `by` to the counter `name` of this page's prototype (no-op without a `?proto=` card). Cheap to call often:
 * writes are batched. */
export function protoCount(name: string, by = 1) {
  if (!card || !Number.isFinite(by)) return;
  pending[name] = (pending[name] ?? 0) + by;
  if (!timer) timer = window.setTimeout(flushCounts, 2000);
}

/** Called after counts are written (the bar redraws its line). */
export const onCounts = (fn: () => void) => listeners.add(fn);

addEventListener('pagehide', flushCounts);
document.addEventListener('visibilitychange', () => document.hidden && flushCounts());
