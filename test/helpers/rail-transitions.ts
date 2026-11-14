// Every production line-2 end extension, including each moving bent and stack section.
import { LINE2 } from '../../src/sim/railway-lines.ts';
import { RING_HEAD } from '../../src/sim/railway-ring-layout.ts';
import { RAIL_LEGS } from '../../src/sim/railway-route.ts';
import { trainStopsOf } from '../../src/sim/railway-train.ts';

const stages = [
  { name: 'Far Head', stops: trainStopsOf(LINE2, 5) },
  { name: 'Q6', stops: trainStopsOf(LINE2, 6) },
  ...RING_HEAD.map((_h, head) => ({
    name: head ? `bent ${head}` : 'Q7',
    stops: trainStopsOf(LINE2, 7, { head, joined: false }),
  })),
  { name: 'rivet', stops: trainStopsOf(LINE2, 7, { head: RING_HEAD.length - 1, joined: true }) },
];
const stack = RAIL_LEGS.findIndex((l) => l.row === 'ring');
for (let n = 1; n <= RAIL_LEGS[stack]!.sections.length; n++) {
  const legs = Array<number>(RAIL_LEGS.length).fill(0);
  legs[stack] = n;
  stages.push({
    name: n === 1 ? 'Ring Island / stack 1' : `stack ${n}`,
    stops: trainStopsOf(LINE2, 7, { head: RING_HEAD.length - 1, joined: true }, legs),
  });
}
export const endTransitions = stages
  .slice(1)
  .map((stage, i) => ({ name: stage.name, before: stages[i]!.stops, after: stage.stops }));
