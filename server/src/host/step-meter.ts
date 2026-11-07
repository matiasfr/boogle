// How well a room's 60 Hz step timer keeps its schedule (docs/plans/replication.md, "Fly shared-cpu-1x throttling
// check"): the gap between timer callbacks, the cost of each step's replication commit + flush, and the steps the
// catch-up cap dropped. It is shown by GET /rooms/:id/host as `steps`, over the last WINDOW samples (a minute at 60 Hz)
// plus run totals, so a load run can read a window after the CPU burst balance has drained.
//
//   const m = createStepMeter()
//   m.timer(now)        each step-timer callback (performance.now())
//   m.cost(ms)          each step's commit + flush time
//   m.report(dropped)   { gapMs: {p50,p95,max}, costMs: {p50,p95,max}, samples, timers, dropped, lateOver25: n }
//                       `dropped`: the sync's running total of steps lost to the catch-up cap
const WINDOW = 3600;

function ring() {
  const buf = new Float64Array(WINDOW);
  let n = 0;
  let max = 0;
  return {
    add(v: number) {
      buf[n++ % WINDOW] = v;
      if (v > max) max = v;
    },
    stats() {
      const have = Math.min(n, WINDOW);
      const s = Array.from(buf.subarray(0, have)).sort((a, b) => a - b);
      const at = (q: number) => (have ? s[Math.min(have - 1, Math.floor(q * have))]! : 0);
      const r = (v: number) => Math.round(v * 1000) / 1000;
      return { p50: r(at(0.5)), p95: r(at(0.95)), max: r(max), recentMax: r(have ? s[have - 1]! : 0) };
    },
    count: () => n,
  };
}

export function createStepMeter() {
  const gaps = ring();
  const costs = ring();
  let lastAt = -1;
  let late = 0;
  return {
    timer(now: number) {
      if (lastAt >= 0) {
        const gap = now - lastAt;
        gaps.add(gap);
        if (gap > 25) late++;
      }
      lastAt = now;
    },
    cost(ms: number) {
      costs.add(ms);
    },
    report(dropped: number) {
      return {
        gapMs: gaps.stats(),
        costMs: costs.stats(),
        timers: gaps.count(),
        steps: costs.count(),
        gapsOver25ms: late,
        dropped,
      };
    },
  };
}
export type StepMeter = ReturnType<typeof createStepMeter>;
