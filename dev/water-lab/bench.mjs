// node dev/water-lab/bench.mjs : 128x128 water step benchmark
import { createWater } from '../../src/sim/water.js';

const W = 128;
const t = new Int32Array(W * W);
for (let i = 0; i < W; i++) for (let j = 0; j < W; j++) t[i * W + j] = 400 + ((i * 13 + j * 7) % 5);
for (let i = 10; i < 120; i++) t[i * W + 64] = 300 - i;
const run = (w, n) => {
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < n; k++) w.step();
  return Number(process.hrtime.bigint() - t0) / 1e6 / n;
};
const w = createWater({ width: W, height: W, terrain: t, seaEdges: 0 });
w.setSource(10, 64, 6);
run(w, 300);
console.log(`spring+channel: ${run(w, 500).toFixed(3)} ms/step, active ${w.stats().active}`);

// worst case: whole island flooded and every cell active
const t2 = new Int32Array(W * W);
for (let i = 0; i < W; i++) for (let j = 0; j < W; j++) t2[i * W + j] = (i * 31 + j * 17) % 50;
const f = createWater({ width: W, height: W, terrain: t2, seaEdges: 0 });
for (let i = 0; i < W; i += 4) for (let j = 0; j < W; j += 4) f.addWater(i, j, 200);
console.log(`flood (first 100 ticks): ${run(f, 100).toFixed(3)} ms/step, active ${f.stats().active}`);
