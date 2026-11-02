// Behaviour counters for prototypes (docs/research/finding-the-fun.md, rec 10: record what the owner does, not only
// what he says). A prototype calls `protoCount('rides')` when something worth counting happens; the count lands in
// this browser's protos store (protos/store.ts) under the card being played (the page's `?proto=`, or the playlist's
// step on the `?play` island: the bar says which, `countFor`) and its variant, shows on the in-game prototype bar and
// goes into the copied playtest entry ("3 rides, 2 variant switches, 6 min in prototype"). Name counters as plural
// nouns a person reads. Local only: never synced, never read by the sim.
import { cardFor, vName, write } from '../../protos/store.ts';
import type { Proto } from '../../protos/protos.ts';
import { protoV } from './flags.ts';
import { protoMark } from './mark.ts';

let card: Proto | undefined = cardFor(location.search);
let v = card ? vName(card, protoV(card.id)) : '';
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
  write(card.id, {}, add, v);
  for (const fn of listeners) fn();
}

/** From now on counts go to `p` playing variant `variant` (a `vName`): the bar, at each step and variant switch. */
export function countFor(p: Proto, variant: string) {
  flushCounts();
  card = p;
  v = variant;
}

/** Adds `by` to the counter `name` of the prototype being played (no-op without one). `toy`, the calling prototype's
 * card id: on the island, where every toy runs at once, its counts land only while its card is the playlist's step.
 * Cheap to call often: writes are batched. */
export function protoCount(name: string, by = 1, toy?: string) {
  if (!card || !Number.isFinite(by) || (toy && toy !== card.id)) return;
  if (name === card.verb) protoMark('verb');
  pending[name] = (pending[name] ?? 0) + by;
  if (!timer) timer = window.setTimeout(flushCounts, 2000);
}

/** Called after counts are written or the readout changes (the bar redraws its lines). */
export const onCounts = (fn: () => void) => listeners.add(fn);

let line = '';
/** One live line a prototype shows on the bar under its counters (this visit's timings, say). Not saved. */
export function protoReadout(text: string) {
  line = text;
  for (const fn of listeners) fn();
}
export const readoutLine = () => line;

addEventListener('pagehide', flushCounts);
document.addEventListener('visibilitychange', () => document.hidden && flushCounts());
