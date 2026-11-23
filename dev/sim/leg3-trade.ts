// Run with node --import ./test/helpers/rail-no-audit.ts dev/sim/leg3-trade.ts.
// Fit at the named stage. Count from opening the Canopy gate through the third lay.
import { Line } from '../../src/sim/railway-components.ts';
import { apply, invariant, need } from '../../src/sim/railway-drive.ts';
import { LOGS, roomOf } from '../../src/sim/railway-queries.ts';
import { RAILS } from '../../src/sim/railway-line2-layout.ts';
import { legRow } from '../../src/sim/railway-queries-route.ts';
import { RAIL_GATES, RAIL_LEGS, ROW_LINE } from '../../src/sim/railway-route.ts';
import { account, rail } from '../../src/sim/railway-rows.ts';
import { railwayAtLegs } from '../../src/sim/railway-seed-legs.ts';
import { act, advance, type Seed } from '../../src/sim/railway-seed-route.ts';

const canopy = RAIL_LEGS.findIndex((l) => l.id === 'bell-canopy');
const bay = RAIL_LEGS.findIndex((l) => l.id === 'bay-cut');
const gate = RAIL_GATES.findIndex((g) => g.id === 'canopy');
const offsets = [0, 75, 150, 225, 300, 375, 450, 525];
function section(s: Seed, k: number, players: readonly string[]) {
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
    advance(s, 1);
  }
  need(invariant(s.w) === null, 'lay and restore');
  return rackTicks;
}

console.log('fit stage, boiler, players, offset, rack 1, rack 2, rack 3, total leg ticks');
for (const stage of ['bay-mid', 'bay-reached'] as const)
  for (const boiler of [0, 4, 5])
    for (const players of [['a'], ['a', 'b']])
      for (const offset of offsets) {
        const s = railwayAtLegs(stage);
        advance(s, offset);
        if (boiler) Object.assign(s.w.mut(Line, s.w.lookup(Line, ROW_LINE.bay)!)!, { boiler, fitted: s.t });
        if (stage === 'bay-mid') section(s, bay, players);
        need(act(s, 'a', 'rail.gate', { id: gate }), 'open Canopy');
        const start = s.t;
        const racks = RAIL_LEGS[canopy]!.sections.map(() => section(s, canopy, players));
        console.log([stage, boiler, players.length, offset, ...racks, s.t - start].join(', '));
      }
