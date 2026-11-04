// Behaviour counters for prototypes (docs/research/finding-the-fun.md, rec 10: record what the owner does, not only
// what he says). A prototype calls `protoCount('rides')` when something worth counting happens; the count lands in
// this browser's protos store (protos/store.ts) under the page's card and variant,
// and shows on the protos page ("3 rides, 6 min in prototype"). Name counters as plural
// nouns a person reads. Local only: never synced, never read by the sim.
import { vName, write } from '../../protos/store.ts';
import { protoV } from './flags.ts';
import { currentCard as card } from './card.ts';
import { playMark, protoMark } from './mark.ts';

const v = card ? vName(card, protoV(card.id)) : '';
let pending: Record<string, number> = {};
let timer = 0;

/** Writes the buffered counts now, including when the page hides or leaves. */
function flushCounts() {
  clearTimeout(timer);
  timer = 0;
  if (!card || !Object.keys(pending).length) return;
  const add = pending;
  pending = {};
  write(card.id, add, v);
}

/** Adds `by` to the counter `name` of the prototype being played (no-op without one).
 * Cheap to call often: writes are batched. */
export function protoCount(name: string, by = 1) {
  if (!card || !Number.isFinite(by)) return;
  if (name === card.verb) protoMark('verb');
  if (name !== 'seconds') playMark(name, by === 1 ? undefined : { by });
  pending[name] = (pending[name] ?? 0) + by;
  if (!timer) timer = window.setTimeout(flushCounts, 2000);
}

addEventListener('pagehide', flushCounts);
document.addEventListener('visibilitychange', () => document.hidden && flushCounts());
