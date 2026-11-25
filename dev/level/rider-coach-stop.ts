// R2b stop-condition reproduction. Read-only: creates an isolated sim world, no saved room writes.
// node --import ./test/helpers/rail-no-audit.ts dev/level/rider-coach-stop.ts
import assert from 'node:assert/strict';
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { apply } from '../../src/sim/railway-drive.ts';
import { account, trains } from '../../src/sim/railway-rows.ts';
import { RAIL_HALTS } from '../../src/sim/railway-lines.ts';
import { railTick } from '../../src/sim/railway-systems.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { line2Lat } from '../../src/entities/railway/line2-path.ts';
import { RIDER_CAR } from '../../src/entities/railway/cars.ts';
import { STACK_WEST } from '../../src/entities/route-greybox/stack-halts.ts';
import { stopsOf } from '../../src/sim/railway-queries.ts';

const state = buildSeedWorld('gorge-reached');
const id = RAIL_HALTS.findIndex((halt) => halt.line === 1 && halt.stop === 8);
const a = account(state.w, 'a')!;
const result = apply(state.w, 'a', { op: 'rail.call', epoch: a.epoch, request: a.request + 1, id, dir: -1 }, state.t);
assert.equal(result.status, 'accepted');
let found = false;
for (let n = 0; n < 4000; n++) {
  railTick(state.w, ++state.t);
  const slot = trains(state.w).findIndex((row) => row.phase === 0 && row.at === 8 && row.track === 1);
  if (slot < 0) continue;
  found = true;
  const row = trains(state.w)[slot]!;
  railwayCheck(state.w, state.t);
  const stops = stopsOf(state.w, 1),
    stop = stops[8]! / 100;
  const lateral = line2Lat(row, stop, stops, undefined, true);
  // This is lateral separation at the stop, not a 3D boarding trajectory or nearest-mesh distance.
  const innerEdge = STACK_WEST.lat + STACK_WEST.w / 2;
  const lateralGap = lateral - innerEdge - RIDER_CAR.hx;
  assert.ok(Math.abs(lateralGap - 1) < 0.01);
  console.log(
    JSON.stringify(
      {
        seed: 'gorge-reached',
        tick: state.t,
        slot,
        request: result,
        train: row,
        stop,
        trackLateral: lateral,
        platformInnerLateral: innerEdge,
        coachHalfWidth: RIDER_CAR.hx,
        lateralGap,
        finding: 'Homeward service stands beside the west deck.',
      },
      null,
      2,
    ),
  );
  break;
}
assert.ok(found, 'Accepted homeward call did not arrive at Stack halt within 4000 ticks');
