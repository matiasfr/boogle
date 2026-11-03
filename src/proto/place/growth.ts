// What anyone can see has happened to the town, read from what's already shared (./job.ts's slices), so two players agree and
// a newcomer starts from what's there now. Residents notice these; the house, shop and museum change with them. Local reads of
// shared state: nothing here is kept.
import { forge } from './forge.ts';
import { job } from './job.ts';
import { L1, L2, stepsOf } from './lines.ts';
import type { Fact } from './town-lines.ts';

const CHECK: [Fact, () => boolean][] = [
  ['path', () => L1.open],
  ['forge', () => forge.lit],
  ['depot', () => job.rung.depot],
  ['head', () => L2.open],
  ['trains', () => job.rung.trains],
  ['town', () => stepsOf(job.wood) >= 1],
  ['stone', () => stepsOf(job.stone) >= 1],
  ['pier', () => job.ended],
];
export const hasFact = (f: Fact) => !!CHECK.find((c) => c[0] === f)?.[1]();
/** The newest thing that's true, or null. */
export function newestFact(): Fact | null {
  for (let k = CHECK.length - 1; k >= 0; k--) if (CHECK[k]![1]()) return CHECK[k]![0];
  return null;
}
/** A number that goes up as the town does: what a room rebuilds its props from. */
export function stageOf(list: Fact[]) {
  let n = 0;
  for (const f of list) if (hasFact(f)) n++;
  return n;
}
