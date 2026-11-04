// Behaviour counters for prototypes (docs/research/finding-the-fun.md, rec 10: record what the owner does, not only
// what he says). A prototype calls `protoCount('rides')` when something worth counting happens; the count lands in
// this browser's protos store (protos/store.ts) under the page's card and variant, selected by session.ts's countFor,
// and shows on the protos page ("3 rides, 6 min in prototype"). Name counters as plural
// nouns a person reads. Local only: never synced, never read by the sim.
import { vName, write } from '../../protos/store.ts';
import type { Proto } from '../../protos/protos.ts';
import { protoV } from './flags.ts';
import { currentCard } from './card.ts';
import { playMark, protoMark } from './mark.ts';

let card: Proto | undefined = currentCard;
let v = card ? vName(card, protoV(card.id)) : '';
let pending: Record<string, number> = {};
let timer = 0;

/** Writes the buffered counts now, including when the page hides or leaves. */
export function flushCounts() {
  clearTimeout(timer);
  timer = 0;
  if (!card || !Object.keys(pending).length) return;
  const add = pending;
  pending = {};
  write(card.id, add, v);
}

/** Counts go to the session's card `p` playing variant `variant` (a `vName`). */
export function countFor(p: Proto, variant: string) {
  flushCounts();
  card = p;
  v = variant;
}

/** Adds `by` to the counter `name` of the prototype being played (no-op without one). `toy`, the calling prototype's
 * card id: its counts land only when its card is the page's prototype.
 * Cheap to call often: writes are batched. */
export function protoCount(name: string, by = 1, toy?: string) {
  if (!card || !Number.isFinite(by) || (toy && toy !== card.id)) return;
  if (name === card.verb) protoMark('verb');
  if (name !== 'seconds') playMark(name, by === 1 ? undefined : { by });
  pending[name] = (pending[name] ?? 0) + by;
  if (!timer) timer = window.setTimeout(flushCounts, 2000);
}

addEventListener('pagehide', flushCounts);
document.addEventListener('visibilitychange', () => document.hidden && flushCounts());
