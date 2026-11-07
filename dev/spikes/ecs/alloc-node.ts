// Bytes allocated per sim tick (with the view sync), per option at 3,000 entities, normal and 5x churn, from
// dev/spikes/ecs:   node --expose-gc --max-semi-space-size=512 alloc-node.ts
// The young generation is made large enough that no collection runs inside a measured window; a window in which one
// did is dropped rather than reported.
import { PerformanceObserver } from 'node:perf_hooks';
import { OPTIONS, fresh, setHeat, tickOps } from './bench.ts';

const gc = (globalThis as { gc?: () => void }).gc;
if (!gc) throw new Error('run with --expose-gc');
let collections = 0;
new PerformanceObserver((list) => (collections += list.getEntries().length)).observe({ entryTypes: ['gc'] });
const settle = () => new Promise((r) => setTimeout(r, 30));
const N = 3000,
  TICKS = 100;
const rows: Record<string, string | number>[] = [];
for (const heat of [1, 5]) {
  setHeat(heat);
  for (const make of OPTIONS) {
    const s = fresh(make, N);
    for (let k = 0; k < 200; k++) {
      tickOps(s, N);
      s.view.sync();
    }
    const samples: number[] = [];
    for (let r = 0; r < 5; r++) {
      gc();
      await settle();
      collections = 0;
      const before = process.memoryUsage().heapUsed;
      for (let k = 0; k < TICKS; k++) {
        tickOps(s, N);
        s.view.sync();
      }
      const after = process.memoryUsage().heapUsed;
      await settle();
      if (!collections) samples.push((after - before) / TICKS);
    }
    samples.sort((a, b) => a - b);
    rows.push({
      option: s.name,
      heat,
      bytesPerTick: samples.length ? Math.round(samples[samples.length >> 1]!) : 'a collection in every window',
      windows: samples.length,
    });
    s.dispose?.();
  }
}
setHeat(1);
console.table(rows);
