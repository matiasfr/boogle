// The trains' and lines' part of the load check (docs/plans/ecs-migration-railway.md, M8b): validateRailTrains's
// conditions (./railway-trains.ts) restated on the rows and the world queries, in the same order and with the same
// messages. Run by railwayCheck (./railway-check.ts). The spacing needs a tick and is not part of it (trainSpacing).
//
//   checkTrains(w)   each line's asks and headway ticks; each train's shape and bounds by its line and open stops,
//                    its legs, its turn-back, its riders' asks and the asleep placement; at most one train in or bound
//                    for each end block (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { LINE2, RAIL_LINES, RAIL_TRAINS, TRAIN_EXTENT } from './railway-lines.ts';
import { TRAIN_PHASE, reqAt, reqHas, reqValid } from './railway-train.ts';
import { atEnd, endBlocks, type EndBlock } from './railway-trains.ts';
import { lines, rail, trains } from './railway-rows.ts';
import { stopsOf } from './railway-queries.ts';
import { railTrainsOf } from './railway-queries-trains.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** Whether a train with its along at `s` reaches into block `b` (railway-trains.ts's own `within`). */
const within = (b: EndBlock, s: number) => s - TRAIN_EXTENT.behindCm < b.to && s + TRAIN_EXTENT.aheadCm > b.from;
/** The trains' and lines' whole-world invariants; throws on the first broken one. */
export function checkTrains(w: World) {
  // validateRailTrains's 'railway: trains' (row counts) is railwayCheck's own count check here, which refuses first.
  const awake = rail(w).trains >= 0;
  const stops = (line: number) => stopsOf(w, line);
  lines(w).forEach((l, line) => {
    if (
      !reqValid(l.req, stops(line).length) ||
      !railInt(l.left0, RAILWAY_MAX_INT, -1) ||
      !railInt(l.left1, RAILWAY_MAX_INT, -1)
    )
      bad('line');
    if (!awake && (l.req || l.left0 >= 0 || l.left1 >= 0)) bad('line asleep');
  });
  trains(w).forEach((r, slot) => {
    const { line, home, track } = RAIL_TRAINS[slot]!,
      st = stops(line),
      last = st.length - 1,
      dir = r.track ? -1 : 1;
    const cargo = line === LINE2 ? 32 : 0;
    if (
      !railInt(r.phase, 1) ||
      !railInt(r.at, last, -1) ||
      !railInt(r.to, last, -1) ||
      !railInt(r.track, 1) ||
      !railInt(r.depart) ||
      !reqValid(r.req, st.length) ||
      !railInt(r.from, st[last]!, st[0]!) ||
      !railInt(r.dest, st[last]!, st[0]!) ||
      !railInt(r.v0, RAIL_LINES[line]!.speed) ||
      !railInt(r.logs, cargo) ||
      !railInt(r.rails, cargo) ||
      (r.phase === TRAIN_PHASE.STAND && (r.at !== r.to || r.from !== r.dest || r.v0 !== 0)) ||
      // A leg runs somewhere: a halt to another, or from a signal (-1) to a halt or to another signal. Its length is
      // always positive, its way the track's.
      (r.phase === TRAIN_PHASE.RUN &&
        ((r.at >= 0 && r.at === r.to) || r.from === r.dest || (r.dest - r.from) * dir < 0)) ||
      // Turning back at a halt that was an end: running up to it, a halt with an end that is no longer open.
      (r.turn &&
        (r.phase !== TRAIN_PHASE.RUN ||
          r.track !== 0 ||
          r.to < 0 ||
          atEnd(r.to, st) ||
          !RAIL_LINES[line]!.halts[r.to]!.end ||
          r.dest !== st[r.to])) ||
      (r.at >= 0 && r.phase === TRAIN_PHASE.STAND && r.from !== st[r.at]) ||
      (r.to >= 0 && r.dest !== st[r.to]) ||
      (!awake &&
        (r.phase || r.at !== home || r.to !== home || r.track !== track || r.depart || r.req || r.logs || r.rails))
    )
      bad('train');
    // A rider's ask is for a middle halt its own way (an end it stops at anyway; the other way it can't serve).
    for (let k = 0; k <= last; k++)
      if (atEnd(k, st) ? reqAt(r.req, k) : reqHas(r.req, k, -dir, st.length)) bad('rider ask');
  });
  for (let line = 0; line < RAIL_LINES.length; line++) {
    const st = stops(line);
    // Without a tick: standing in a block, or a leg ending in one.
    for (const b of endBlocks(line, st))
      if (
        railTrainsOf(w, line).filter(
          (r) =>
            (r.phase === TRAIN_PHASE.STAND && within(b, r.from)) || (r.phase === TRAIN_PHASE.RUN && within(b, r.dest)),
        ).length > 1
      )
        bad('end block');
  }
}
