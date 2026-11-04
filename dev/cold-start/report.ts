import type { StartupTimeline } from '../../src/debug/startup-record.ts';

export function summarize(t: StartupTimeline) {
  const visible = t.firstVisibleWaterProxy;
  // Fade starts at boot:first. Waiting for DOM removal misses freezes that delay the removal timer itself.
  const first = t.entries.find((e) => e.name === 'boot:first');
  const reveal = first ? Number(first.startTime) : visible;
  const afterReveal = t.frames.filter((f) => reveal !== null && f.t > reveal);
  const url = new URL(t.url);
  url.searchParams.sort();
  const stalls = t.frames
    .filter((f) => f.dt > 50)
    .map((f) => {
      const begin = f.t - f.dt;
      const loaf = t.entries.filter(
        (e) =>
          e.entryType === 'long-animation-frame' &&
          Number(e.startTime) < f.t &&
          Number(e.startTime) + Number(e.duration) > begin,
      );
      const pipelines = t.pipelines.filter((p) => p.t < f.t && p.t + p.ms > begin);
      return {
        ...f,
        afterVisible: visible !== null && f.t > visible,
        afterReveal: reveal !== null && f.t > reveal,
        straddlesVisibility: visible !== null && begin < visible && f.t > visible,
        attribution: loaf.length
          ? 'LoAF scripts are CPU attribution; overlapping pipelines are candidates only'
          : 'unattributed: rAF cannot identify GPU/OS/presentation owner',
        loaf,
        pipelines,
      };
    });
  const sync = t.pipelines.filter((p) => p.ok && !p.kind.endsWith('Async') && p.kind !== 'createShaderModule');
  const async = t.pipelines.filter((p) => p.ok && p.kind.endsWith('Async'));
  // Union of elapsed intervals avoids counting concurrently compiling pipelines twice.
  let asyncPipelineElapsedMs = 0;
  let end = 0;
  for (const p of async.toSorted((a, b) => a.t - b.t)) {
    asyncPipelineElapsedMs += Math.max(0, p.t + p.ms - Math.max(end, p.t));
    end = Math.max(end, p.t + p.ms);
  }
  return {
    workload: url.pathname + url.search, // allocation IDs and sync/async creation paths are NOT workload identities
    loadMs: reveal,
    postRevealFreezeMs: reveal === null ? null : Math.max(0, ...afterReveal.map((f) => f.dt)),
    exposedFreezeMs:
      reveal === null ? null : Math.max(0, ...afterReveal.map((f) => f.t - Math.max(reveal, f.t - f.dt))),
    pipelinesStartedAfterReveal: t.pipelines.filter(
      (p) => reveal !== null && p.t >= reveal && p.kind.includes('Pipeline'),
    ),
    pipelinesPendingAtReveal: t.pipelines.filter(
      (p) => reveal !== null && p.t < reveal && p.t + p.ms > reveal && p.kind.includes('Pipeline'),
    ),
    firstVisibleWaterProxy: visible,
    frames: t.frames.length,
    stalls,
    syncPipelineMs: sync.reduce((n, p) => n + p.ms, 0),
    asyncPipelineLatencyMs: async.reduce((n, p) => n + p.ms, 0),
    asyncPipelineElapsedMs,
    shaderModuleMs: t.pipelines.filter((p) => p.kind === 'createShaderModule').reduce((n, p) => n + p.ms, 0),
    pipelineSignature: t.pipelines
      .map((p) => `${p.kind}:${p.label}`)
      .sort()
      .join('|'),
  };
}
export const spread = (xs: number[]) => {
  const values = xs.toSorted((a, b) => a - b);
  return { min: values[0], median: values[Math.floor(values.length / 2)], max: values.at(-1), values };
};

type Sample = { run: number; kind: string; summary: ReturnType<typeof summarize>; health: string[] };
export const comparisonThreshold =
  '3+ healthy same-route/settings pairs; every paired delta >5ms and median >10% of cold median in load, longest reveal-crossing rAF interval, or async interval union. Same source and exclusive nonempty clears/writes are separately required. Scheduling, browser caches and host load also differ: not isolated Metal compiler time or statistical proof.';

export function comparePairs(results: Sample[]) {
  const cold = results.filter((r) => r.kind === 'cold');
  const warm = results.filter((r) => r.kind === 'warm');
  const pairs = cold.map((c) => ({ cold: c, warm: warm.find((w) => w.run === c.run) })).filter((p) => p.warm);
  const matched =
    pairs.length >= 3 &&
    pairs.every(
      (p) => p.cold.summary.workload === p.warm!.summary.workload && !p.cold.health.length && !p.warm!.health.length,
    );
  const metrics = ['postRevealFreezeMs', 'loadMs', 'asyncPipelineElapsedMs'] as const;
  const comparison = Object.fromEntries(
    metrics.map((metric) => {
      const valid = pairs.filter((p) => p.cold.summary[metric] !== null && p.warm!.summary[metric] !== null);
      const c = valid.map((p) => p.cold.summary[metric]!);
      const w = valid.map((p) => p.warm!.summary[metric]!);
      const deltas = c.map((value, i) => value - w[i]!);
      return [
        metric,
        {
          cold: spread(c),
          warm: spread(w),
          pairedDelta: spread(deltas),
          measurable:
            matched &&
            valid.length === pairs.length &&
            deltas.every((d) => d > 5) &&
            spread(deltas).median! > spread(c).median! * 0.1,
        },
      ];
    }),
  );
  return { comparison, measurable: Object.values(comparison).some((m) => m.measurable), pairs: pairs.length };
}
