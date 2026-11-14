// Every place two tracks part, as the two centrelines a turnout is built from (./turnout.ts; the list and where each
// is: docs/plans/turnouts.md, "Every place two tracks meet"). One list, so no junction is hand placed. So far: J1, the
// engine spur off road 2. Local, no three.js.
import { SPUR, march, roadAt } from './home-station.ts';
import { LINES, railY, toWorld, type LineSpec } from './layout.ts';
import type { Centre } from './turnout.ts';

export type Junction = {
  id: string;
  /** Whose track it is on, and its toe by that line's `s`; `dir` is the way the through road runs from the toe. */
  line: LineSpec['id'];
  s: number;
  dir: 1 | -1;
  kind: 'stub' | 'crossover' | 'spur';
  /** The side its points lever stands on: +1 the through road's right, looking from the toe. */
  lever: 1 | -1;
  through: Centre;
  diverging: Centre;
};

export function junctions(): Junction[] {
  // J1: the spur leaves road 2 at s 5.5 to the right; both at road 2's rail height (the spur is level to the table).
  const deck = railY(LINES.east, 0),
    toe = roadAt(SPUR.road, SPUR.s);
  const j1: Junction = {
    id: 'J1',
    line: 'quarry',
    s: SPUR.s,
    dir: 1,
    kind: 'spur',
    lever: 1,
    through: (d) => {
      const p = roadAt(SPUR.road, SPUR.s + d);
      return { x: toWorld(p.x), z: p.z, y: railY(LINES.east, Math.max(0, SPUR.s + d)) };
    },
    diverging: (d) => {
      const p = march(toe, SPUR.segs, d);
      return { x: toWorld(p.x), z: p.z, y: deck };
    },
  };
  return [j1];
}
