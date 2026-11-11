// What one predicted press costs on the client after the move onto E (docs/plans/ecs-e.md, step 3): the pieces of
// createPredictor's rebuild, timed on a fresh railway world. node dev/spikes/ecs/predict-cost.ts
import { createRailwayWorld } from '../../../src/sim/railway-components.ts';
import { railwayView, fillRailway } from '../../../src/sim/railway-read-model.ts';
import { railSession } from '../../../src/sim/railway-sys-core.ts';
import { railApply } from '../../../src/sim/railway-systems.ts';
import { cloneRailway, railPredict, railwayOf } from '../../../src/world/railway-predict.ts';
import { RAILWAY_SOURCES } from '../../../src/sim/railway-layout.ts';

const w = createRailwayWorld();
for (const pid of ['aa', 'bb']) railSession(w, pid, 1);
railApply(w, 'aa', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
const s = railwayOf(w);
const time = (name: string, n: number, fn: () => void) => {
  for (let k = 0; k < n; k++) fn();
  const t = performance.now();
  for (let k = 0; k < n; k++) fn();
  console.log(name.padEnd(36), (((performance.now() - t) / n) * 1000).toFixed(1), 'µs');
};
time('world.clone()', 500, () => w.clone());
time('structuredClone(read model)', 500, () => structuredClone(s));
time('railwayView(world)', 500, () => railwayView(w));
time('fillRailway(target, world)', 500, () => fillRailway(s, w));
time('cloneRailway (both)', 500, () => cloneRailway(s));
let r = 2;
time('cloneRailway + railPredict(chop)', 500, () => {
  const c = cloneRailway(s);
  railPredict(
    c,
    'aa',
    { op: 'rail.chop', id: RAILWAY_SOURCES[3]![0], yaw: 0, collapsed: false, epoch: 1, request: r++ },
    100,
  );
});
