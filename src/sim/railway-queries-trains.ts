// The trains' derived facts on the world (docs/plans/ecs-migration-railway.md, M8): the world twins of the read
// model's railTrainsOf (./railway-trains.ts) and trainStops (./railway-line2.ts). Pure reads.
//
//   railTrainsOf(w, line)     a line's train rows, in slot order
//   trainStops(w, k)          the stops line k serves now (line 2's pier once Q6 is laid; stopsOf)
import type { World } from '../ecs/index.ts';
import { Train } from './railway-components.ts';
import { LINE_SLOTS } from './railway-trains.ts';
import { stopsOf, trainId } from './railway-queries.ts';

export const railTrainsOf = (w: World, line: number) => LINE_SLOTS[line]!.map((k) => w.get(Train, trainId(w, k))!);
export const trainStops = stopsOf;
