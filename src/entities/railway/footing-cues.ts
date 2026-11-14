// Where footings go and how many are owed, said where a footing is picked up and where it is set
// (docs/plans/footings-signalling.md, A3 and A4). Owner, 14 November: "Do I have to bring all the footings to the pier
// by hand?"; at the pier, "the supports are there, but I don't know what to do next". A board at the Works rack, a
// bill at the pier's jib and one gold mark on the halts' maps, all read from accepted rows. This file is the pure part
// (state, words, the mark's place); works-view.ts, crossing-view.ts and halts-view.ts draw it. All strings are draft
// UI copy.
import { PIER_FRAME, SHED_STALL, WORKS } from '../../sim/railway-works-layout.ts';
import { q7Laid } from '../../sim/railway-queries.ts';
import { aperture, shed, works, type ReadWorld } from '../../sim/railway-rows.ts';

export const FOOTING_COPY = {
  board: 'Footings',
  pier: 'Pier',
  byHand: 'by hand',
  byWagon: 'by wagon',
} as const;

const count = (n: number, of: number) => `${Math.max(0, Math.min(n, of))}/${of}`;

/** The Works rack board's small line: where the next footings go, how many are in and how they travel. Null before
 * the kiln lights (there are no footings yet) and once every footing is placed (the board comes down). */
export function footingBoardLine(w: ReadWorld): string | null {
  const k = works(w);
  if (k.lit < 0) return null;
  const stall = shed(w).stall;
  if (stall < WORKS.stall) return `stall ${count(stall, WORKS.stall)} ${FOOTING_COPY.byHand}`;
  // The pier's twelve stay on the board, full, until Q7 opens the railhead: nothing else is owed in between.
  if (k.pierSet < WORKS.pier || !q7Laid(w)) return `pier ${count(k.pierSet, WORKS.pier)} ${FOOTING_COPY.byWagon}`;
  const a = aperture(w);
  if (a.set < WORKS.ring) return `railhead ${count(a.set, WORKS.ring)} ${FOOTING_COPY.byWagon}`;
  if (a.cw < WORKS.counterweight) return `weights ${count(a.cw, WORKS.counterweight)}`;
  return null;
}

/** The pier bill's small line, from the kiln's lighting to the twelfth footing; null outside it. The view shows it
 * only once the pier stands (Q6 laid). */
export function pierBillLine(w: ReadWorld): string | null {
  const k = works(w);
  if (k.lit < 0 || k.pierSet >= WORKS.pier) return null;
  return `footings ${count(k.pierSet, WORKS.pier)} ${FOOTING_COPY.byWagon}`;
}

/** Where the next footing is wanted, for the halts' maps (world metres): the stall until the wagon has rolled out of
 * it, then the pier's jib until the crossing is footed. Null before the kiln lights and after the twelfth. */
export function footingMark(w: ReadWorld): { x: number; z: number } | null {
  const k = works(w);
  if (k.lit < 0 || k.pierSet >= WORKS.pier) return null;
  const at = shed(w).ready < 0 ? SHED_STALL : PIER_FRAME;
  return { x: at.x / 100, z: at.z / 100 };
}
