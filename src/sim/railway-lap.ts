import { LAP_S0, LINE2, RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { ROW_LINE } from './railway-route.ts';
import { reqAdd, reqHas, TRAIN_PHASE, type RailTrain } from './railway-train.ts';

const cave = RAIL_LINES[ROW_LINE.cave]!;
const halts = RAIL_LINES[LINE2]!.halts;
const mapped = cave.halts.map((h) => halts.findIndex((other) => other.s === LAP_S0 - h.s));
export const gorgeStop = halts.findIndex((h) => h.name === 'High Gorge');
/** A departure may still occupy an old cave turnout even when its halt has closed behind. */
export const oldCaveEnd = (s: number) => cave.halts.find((h, k) => k > 0 && h.s === LAP_S0 - s)?.end;
export const lapStop = (s: number) => halts.findIndex((h) => h.s === s);
export function runLine(slot: number, joined: boolean) {
  const origin = RAIL_TRAINS[slot]!.line;
  return joined ? (RAIL_LINES[origin]!.joins?.line ?? origin) : origin;
}
const joinedSlots = RAIL_LINES.map((_, line) => RAIL_TRAINS.flatMap((_, k) => (runLine(k, true) === line ? [k] : [])));
export const originSlots = RAIL_LINES.map((_, line) => RAIL_TRAINS.flatMap((r, k) => (r.line === line ? [k] : [])));
export const lapSlots = (line: number, joined: boolean): readonly number[] =>
  (joined ? joinedSlots : originSlots)[line]!;

/** The last lay has already extended the old end before requests move. */
export function lapRequests(req: number, base = 0) {
  for (const [k, stop] of mapped.entries()) {
    if (stop < 0) continue;
    for (const dir of [-1, 1]) {
      if (k === 0 && dir < 0) continue;
      if (reqHas(req, k, dir, cave.halts.length)) base = reqAdd(base, stop, -dir, halts.length);
    }
  }
  return base;
}

/** Reflect a live cave leg about the joint without restarting its clock or changing its braking profile. */
export function lapRow(r: Readonly<RailTrain>): Partial<RailTrain> {
  if (r.phase === TRAIN_PHASE.SHED) return {};
  return {
    from: LAP_S0 - r.from,
    dest: LAP_S0 - r.dest,
    origin: r.origin ? LAP_S0 - r.origin : 0,
    track: 1 - r.track,
    at: mapped[r.at] ?? -1,
    to: mapped[r.to] ?? -1,
    req: lapRequests(r.req),
    boiler: r.boiler || 1,
  };
}
