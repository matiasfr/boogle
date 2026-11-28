// Read-only R2b stop-condition probe: an actual terminal arrival, then production car poses.
// node --import ./test/helpers/rail-no-audit.ts dev/level/rider-coach-gorge.ts
import assert from 'node:assert/strict';
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { trains } from '../../src/sim/railway-rows.ts';
import { LINE2, RAIL_TRAINS, TRAIN_EXTENT } from '../../src/sim/railway-lines.ts';
import { RING_END } from '../../src/sim/railway-ring-layout.ts';
import { railTick } from '../../src/sim/railway-systems.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { consistOf } from '../../src/entities/railway/cars.ts';
import { line2At, line2Lat } from '../../src/entities/railway/line2-path.ts';
import { coachTrain, gorgeStageHalts as halts } from './rider-coach.ts';

const state = buildSeedWorld('gorge-reached');
let slot = -1;
for (let n = 0; n < 5000 && slot < 0; n++) {
  railTick(state.w, ++state.t);
  slot = trains(state.w).findIndex(
    (r) => RAIL_TRAINS[r.slot]!.line === LINE2 && r.phase === 0 && r.at === halts.length - 1,
  );
}
assert.ok(slot >= 0, 'No High Gorge arrival within 5000 ticks');
railwayCheck(state.w, state.t);
const halt = halts.at(-1)!;
const crossStart = halt.end!.mergeCm / 100;
const crossEnd = crossStart + (RING_END.cross.u1 - RING_END.cross.u0) / 100;
const end = line2At(crossEnd, { x: 0, z: 0, ux: 0, uz: 1 }, true);
// Independently measure the longest allowed consist at that accepted stop, not the arriving slot's loadout.
const layout = consistOf({ line: LINE2, wagon: true, steel: true });
const poses = [false, true].map((up) => {
  const tail = coachTrain(halt.s / 100, up).at(-1)!;
  const reach = (buffer: number) =>
    Math.min(
      ...[-tail.hx, tail.hx].flatMap((x) =>
        [-tail.back - buffer, tail.front + buffer].map((z) => {
          const px = tail.x + x * Math.cos(tail.yaw) + z * Math.sin(tail.yaw);
          const pz = tail.z - x * Math.sin(tail.yaw) + z * Math.cos(tail.yaw);
          return (px - end.x) * end.ux + (pz - end.z) * end.uz;
        }),
      ),
    );
  return {
    direction: up ? 'homeward terminal' : 'outward arrival',
    tailRole: layout.at(-1)!.role,
    nominalTailCentre: halt.s / 100 + layout.at(-1)!.offset,
    tailBodyPastCrossoverEndPlane: reach(0),
    tailWithBufferPastCrossoverEndPlane: reach(0.2),
    nominalTailTrackLateral: line2Lat(
      { track: Number(up), origin: 0 },
      halt.s / 100 + layout.at(-1)!.offset,
      halts.map((h) => h.s),
    ),
    tailPose: tail,
  };
});
console.log(
  JSON.stringify(
    {
      tick: state.t,
      slot,
      train: trains(state.w)[slot],
      stop: halt.s / 100,
      crossStart,
      crossEnd,
      extentBehind: TRAIN_EXTENT.behindCm / 100,
      reservedTail: (halt.s - TRAIN_EXTENT.behindCm) / 100,
      reservedTailPastCrossover: (halt.s - TRAIN_EXTENT.behindCm) / 100 - crossEnd,
      requiredMargin: 0.3,
      poses,
    },
    null,
    2,
  ),
);
