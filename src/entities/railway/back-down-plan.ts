// Where a set-down puts each piece (back-down.ts), pure so a test can pin it.

/** A pile holds this many (src/sim/railway-systems.ts pileCap). */
export const PILE = 8;

export type Pile = { x: number; y: number; z: number; n: number };
/** Pure: where each piece of a load goes. Piles of one kind fill to 8 before the next opens; a kind that already has a
 * part-full pile within reach tops it up first. `spots` are the candidate places, nearest first. */
export function plan(
  load: readonly number[],
  piles: readonly (Pile & { kind?: number })[],
  spots: readonly { x: number; y: number; z: number }[],
): { x: number; y: number; z: number; n: number; kind: number }[] {
  const out: { x: number; y: number; z: number; n: number; kind: number }[] = [];
  let next = 0;
  load.forEach((count, kind) => {
    let left = count;
    const first = spots[0]!;
    for (const pile of piles) {
      if (left <= 0) break;
      if ((pile.kind ?? 0) !== kind || pile.n >= PILE) continue;
      if (Math.hypot(pile.x / 100 - first.x, pile.z / 100 - first.z) > 2.2 || Math.abs(pile.y / 100 - first.y) > 1)
        continue;
      const n = Math.min(left, PILE - pile.n);
      out.push({ x: pile.x / 100, y: pile.y / 100, z: pile.z / 100, n, kind });
      left -= n;
    }
    while (left > 0) {
      const at = spots[Math.min(next++, spots.length - 1)]!;
      const n = Math.min(left, PILE);
      out.push({ ...at, n, kind });
      left -= n;
    }
  });
  return out;
}

