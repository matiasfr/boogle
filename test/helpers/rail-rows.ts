// Line 2's trains as plain rows over a pure TrainIO (docs/plans/ring-island-build1.md, R3a then R3b): the pure train
// code (src/sim/railway-trains.ts) run on line 2's catalog row with no world, so a test can stand trains where it
// likes and step them tick by tick. The row is the catalog's own (since v27 it holds RING_PATH, three trains, the
// homeward-only Pier, the Railhead and Ring Island); a copy of it, so its trains are slots 0 to 2 of the rows here
// (lineIndex: a copy is not the catalog object), the same rules on the same numbers.
//
//   LINE2_ROWS                       line 2's catalog row as a LineRef over plain rows
//   line2Stops(laid, head, joined)   its open stops at that stage (trainStopsOf with the ring)
//   standingAt(stops, k, track)      a standing, awake train row
//   FixtureLine                      rows, the line's row and a TrainIO over them; call() as rail.call refuses and asks
import { RAIL_LINES, LINE2, type RailLineDef } from '../../src/sim/railway-lines.ts';
import {
  TRAIN_PHASE,
  reqAdd,
  reqHas,
  trainDir,
  trainPassesBy,
  trainStopsOf,
  type RailTrain,
} from '../../src/sim/railway-train.ts';
import {
  atEnd,
  lineBlocksBroken,
  lineReqOk,
  trainRowBroken,
  type RailLineRow,
  type TrainIO,
} from '../../src/sim/railway-trains.ts';
import { trainPlaces } from '../../src/sim/railway-lines.ts';

/** Line 2's catalog row, copied: the pure train code runs it with slots 0 to `trains - 1`. */
export const LINE2_ROWS: RailLineDef = { ...RAIL_LINES[LINE2]!, id: 'line2-rows' };
/** Line 2's open stops: `laid` QJob slots complete (6: Q6, 7: Q7), the railhead at `head`, the rivet struck. */
export const line2Stops = (laid: number, head = 0, joined = false) => trainStopsOf(LINE2, laid, { head, joined });

/** A standing, awake train at stop `k` of `stops` on `track`. */
export function standingAt(stops: readonly number[], k: number, track: number, depart = 0): RailTrain {
  const s = stops[k]!;
  return {
    phase: TRAIN_PHASE.STAND,
    at: k,
    to: k,
    track,
    depart,
    req: 0,
    from: s,
    v0: 0,
    dest: s,
    turn: false,
    logs: 0,
    rails: 0,
    wagon: false,
    foot: 0,
  };
}
/** Line 2's trains as rows, standing where trainPlaces puts them over `stops`, awake from `awake`. */
export class FixtureLine {
  rows: RailTrain[];
  lineRow: RailLineRow = { req: 0, left0: -1, left1: -1 };
  stops: readonly number[];
  awake: number;
  headPct: number;
  /** The line it runs: LINE2_ROWS, or a variant of it (another train count). */
  line: RailLineDef;
  constructor(stops: readonly number[], awake = 0, headPct = 75, line: RailLineDef = LINE2_ROWS) {
    this.line = line;
    this.stops = stops;
    this.awake = awake;
    this.headPct = headPct;
    this.rows = trainPlaces(line, stops).map((p) => standingAt(stops, p.stop, p.track));
  }
  io(): TrainIO<RailLineDef> {
    return {
      row: (slot) => this.rows[slot]!,
      set: (slot, patch) => void (this.rows[slot] = { ...this.rows[slot]!, ...patch }),
      line: () => this.lineRow,
      setLine: (_l, patch) => void (this.lineRow = { ...this.lineRow, ...patch }),
      stops: () => this.stops,
      awake: this.awake,
      headPct: this.headPct,
      service: () => () => false,
      arrive: () => {},
      standing: () => 'on',
      headExempt: () => false,
    };
  }
  /** rail.call as the system refuses and records it: a lever ask (no `train`) or a rider's. 1 accepted. */
  call(stop: number, dir: number, tick: number, train?: number) {
    const n = this.stops.length;
    if (stop >= n || (stop === 0 && dir < 0) || (stop === n - 1 && dir > 0)) return 0;
    if (trainPassesBy(this.line, stop, dir, n)) return 0;
    const wait = (slot: number) => {
      const r = this.rows[slot]!;
      if (r.phase === TRAIN_PHASE.STAND && r.at === stop && trainDir(r) === dir && tick > r.depart)
        this.rows[slot] = { ...r, depart: tick };
    };
    if (train !== undefined) {
      const r = this.rows[train]!;
      if (atEnd(stop, this.stops) || trainDir(r) !== dir || reqHas(r.req, stop, dir, n)) return 0;
      this.rows[train] = { ...r, req: reqAdd(r.req, stop, dir, n) };
      wait(train);
      return 1;
    }
    if (reqHas(this.lineRow.req, stop, dir, n)) return 0;
    this.lineRow = { ...this.lineRow, req: reqAdd(this.lineRow.req, stop, dir, n) };
    this.rows.forEach((_r, slot) => wait(slot));
    return 1;
  }
  /** What the load check would refuse (rows and the line's row on these stops), or null. */
  broken(): string | null {
    if (!lineReqOk(this.lineRow.req, this.line, this.stops)) return 'railway: line';
    for (const r of this.rows) {
      const b = trainRowBroken(r, this.line, this.stops, 32);
      if (b) return b;
    }
    return lineBlocksBroken(this.rows, this.line, this.stops) ? 'railway: end block' : null;
  }
  /** A save and a restore: the rows through JSON. */
  restore() {
    this.rows = JSON.parse(JSON.stringify(this.rows)) as RailTrain[];
    this.lineRow = JSON.parse(JSON.stringify(this.lineRow)) as RailLineRow;
  }
}
