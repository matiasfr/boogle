// Run with node --import ./test/helpers/rail-no-audit.ts dev/sim/leg3-trade.ts.
// Fit at the named stage. Count from opening the Canopy gate through the third lay.
// Every fit is made by accepted rail.bring and rail.install (garage step 4's Checkpoint): a Line written by hand breaks
// the trade's invariants (Line.rev, the steel spent) since world v67. `bay-mid` cannot pay a fit (its works are
// unlit), so it and `bay-reached` run Standard only, Checkpoint G's baseline; the `ops` rows fit on `trade-ready`
// (bay-mid with the works' 12 steel home) and on it run on to `bay-reached`.
import { apply, invariant, need } from '../../src/sim/railway-drive.ts';
import { LOGS, roomOf } from '../../src/sim/railway-queries.ts';
import { RAILS } from '../../src/sim/railway-line2-layout.ts';
import { legRow } from '../../src/sim/railway-queries-route.ts';
import { RAIL_GATES, RAIL_LEGS, ROW_LINE } from '../../src/sim/railway-route.ts';
import { account, rail, train } from '../../src/sim/railway-rows.ts';
import { legRailheadHold } from '../../src/sim/railway-sys-route-kit.ts';
import { LINE_SLOTS } from '../../src/sim/railway-trains.ts';
import { TRAIN_PHASE } from '../../src/sim/railway-train.ts';
import { legStagesOn, railwayAtLegs } from '../../src/sim/railway-seed-legs.ts';
import { railwayAtGarage } from '../../src/sim/railway-seed-garage.ts';
import { line, shed } from '../../src/sim/railway-rows.ts';
import { tableFree } from '../../src/sim/railway-queries-works.ts';
import { act, advance, type Seed } from '../../src/sim/railway-seed-route.ts';

const canopy = RAIL_LEGS.findIndex((l) => l.id === 'bell-canopy');
const bay = RAIL_LEGS.findIndex((l) => l.id === 'bay-cut');
const gate = RAIL_GATES.findIndex((g) => g.id === 'canopy');
const offsets = [0, 75, 150, 225, 300, 375, 450, 525];
function section(s: Seed, k: number, players: readonly string[], releases: number[]) {
  const start = s.t,
    before = legRow(s.w, k).laid,
    bill = RAIL_LEGS[k]!.sections[before]!;
  let rackTicks = -1;
  while (legRow(s.w, k).laid === before) {
    need(s.t - start < 12000, `section stalled at ${k}/${before}`);
    const rack = rail(s.w);
    if (rackTicks < 0 && rack.depot >= bill.logs && rack.depotRails >= bill.rails) rackTicks = s.t - start;
    if (rackTicks >= 0 && legRow(s.w, k).start < 0) {
      for (const pid of players) {
        const a = account(s.w, pid)!;
        for (const [op, kind] of [
          ['rail.depotTake', LOGS],
          ['rail.depotRailTake', RAILS],
        ] as const)
          if (roomOf(s.w, a, kind) > 0) apply(s.w, pid, { op, epoch: a.epoch, request: a.request + 1 }, s.t);
        apply(s.w, pid, { op: 'rail.legStock', leg: k, epoch: a.epoch, request: a.request + 1 }, s.t);
      }
    }
    const yielding = LINE_SLOTS[ROW_LINE.bay]!.filter((slot) => legRailheadHold(s.w, slot, s.t + 1) === 'yield');
    advance(s, 1);
    for (const slot of yielding) {
      const r = train(s.w, slot);
      if (legRow(s.w, k).laid === before && r.phase === TRAIN_PHASE.RUN && r.legKit && r.track === 1)
        releases.push(before + 1);
    }
  }
  need(invariant(s.w) === null, 'lay and restore');
  return rackTicks;
}

/** The bay line fitted with row `boiler` (4 Quick, part 5; 5 Strong, part 6) by accepted ops, each after the table's hold. */
function fitByOps(s: Seed, boiler: number) {
  const free = () => {
    while (s.t < tableFree(s.w)) advance(s, 1);
  };
  free();
  need(act(s, 'a', 'rail.bring', { line: ROW_LINE.bay, revision: shed(s.w).bringRev }), 'bay brought');
  free();
  const part = boiler === 4 ? 5 : 6;
  need(
    act(s, 'a', 'rail.install', { line: ROW_LINE.bay, part, revision: line(s.w, ROW_LINE.bay).rev }),
    `part ${part}`,
  );
  need(line(s.w, ROW_LINE.bay).boiler === boiler, `bay line on row ${boiler}`);
}
const STAGES = {
  'bay-mid': () => railwayAtLegs('bay-mid'),
  'bay-reached': () => railwayAtLegs('bay-reached'),
  'trade-ready ops': () => railwayAtGarage('trade-ready'),
  'trade-ready to bay-reached ops': () => legStagesOn(railwayAtGarage('trade-ready'), 'bay-mid', 'bay-reached'),
} as const;
const only = process.argv[2];
console.log(
  'fit stage, boiler, players, offset, rack 1, rack 2, rack 3, total leg ticks, early departures after section',
);
for (const stage of Object.keys(STAGES) as (keyof typeof STAGES)[])
  for (const boiler of [0, 4, 5])
    for (const players of [['a'], ['a', 'b']])
      for (const offset of offsets) {
        if ((only && !stage.includes(only)) || (boiler && !stage.endsWith('ops'))) continue;
        const s = STAGES[stage]();
        advance(s, offset);
        if (boiler) fitByOps(s, boiler);
        if (legRow(s.w, bay).laid < RAIL_LEGS[bay]!.sections.length) section(s, bay, players, []);
        need(act(s, 'a', 'rail.gate', { id: gate }), 'open Canopy');
        const start = s.t;
        const releases: number[] = [];
        const racks = RAIL_LEGS[canopy]!.sections.map(() => section(s, canopy, players, releases));
        console.log(
          [stage, boiler, players.length, offset, ...racks, s.t - start, releases.join('/') || 'none'].join(', '),
        );
      }
