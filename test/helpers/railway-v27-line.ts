// v27's line 2 as a fixture line (docs/plans/ring-island-build1.md, R3a's split, orchestrator call 10 November 2026):
// the catalog row R3b writes into src/sim/railway-lines.ts with the WORLD_NS bump (RING_PATH, three trains, the Pier
// east of the down track and homeward-only, the Railhead and Ring Island), held here so R3a's rules run on it with
// no catalog row using them. Pure rows and a pure TrainIO over them: no world, no read model.
//
//   V27_LINE2                        the fixture line (a LineRef)
//   PIER_EAST                        the Pier's one platform from Q6 on (call 53)
//   v27Stops(laid, head, joined)     its open stops at that stage (trainStopsOf with the ring)
//   FixtureLine                      rows, the line's row and a TrainIO over them; call() as rail.call refuses and asks
import {
  RAIL_LINES,
  LINE2,
  railEnd,
  trainPlaces,
  type RailLineDef,
  type RailPlatform,
} from '../../src/sim/railway-lines.ts';
import {
  RING_END,
  RING_END_BRAKE_CMS2,
  RING_HALT,
  RING_HEAD,
  RING_JOINT_UP,
  RING_PATH,
} from '../../src/sim/railway-ring-layout.ts';
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

/** The Pier's platform from Q6 on: today's mirrored across the track at s 730, 2.9 m east of the path point
 * (140259, -35846) (call 53). */
export const PIER_EAST: RailPlatform = { x: 140549, z: -35859, y: 2502, reach: 1260 };
const v26 = RAIL_LINES[LINE2]!;
const [village, quarry, farHead, pier] = v26.halts as readonly [
  RailLineDef['halts'][number],
  RailLineDef['halts'][number],
  RailLineDef['halts'][number],
  RailLineDef['halts'][number],
];
export const V27_LINE2: RailLineDef = {
  ...v26,
  id: 'line2-v27-fixture',
  path: [...v26.path, ...RING_PATH],
  trains: 3,
  halts: [
    village,
    quarry,
    farHead,
    { ...pier, platforms: [PIER_EAST, PIER_EAST], only: -1 },
    {
      name: 'Railhead',
      s: RING_HEAD[0]!.s,
      opens: 6,
      platforms: [RING_JOINT_UP, RING_HEAD[0]!.platform],
      end: railEnd('stub', RING_HEAD[0]!.mergeCm, 1),
      heads: RING_HEAD.map((h) => h.s),
      brake: RING_END_BRAKE_CMS2 / 100,
    },
    {
      name: 'Ring Island',
      s: RING_END.s,
      opens: 6,
      platforms: [RING_HALT.up, RING_HALT.down],
      end: railEnd('crossover', RING_END.mergeCm, 1),
      ring: true,
    },
  ],
};
/** The fixture's open stops: `laid` QJob slots complete (6: Q6, 7: Q7), the railhead at `head`, the rivet struck. */
export const v27Stops = (laid: number, head = 0, joined = false) => trainStopsOf(V27_LINE2, laid, { head, joined });

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
/** The fixture line's trains, standing where trainPlaces puts them over `stops`, awake from `awake`. */
export class FixtureLine {
  rows: RailTrain[];
  lineRow: RailLineRow = { req: 0, left0: -1, left1: -1 };
  stops: readonly number[];
  awake: number;
  headPct: number;
  /** The line it runs: V27_LINE2, or a variant of it (another train count). */
  line: RailLineDef;
  constructor(stops: readonly number[], awake = 0, headPct = 75, line: RailLineDef = V27_LINE2) {
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
  /** rail.call as the system and R3b's hunk refuse and record it: a lever ask (no `train`) or a rider's. 1 accepted. */
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
  /** What the load check would refuse (rows and the line's row on the fixture's stops), or null. */
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
