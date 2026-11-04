import type { StartupTimeline } from '../../src/debug/startup-record.ts';

export function summarize(t: StartupTimeline) {
  const visible = t.firstVisibleWaterProxy;
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
  return {
    firstVisibleWaterProxy: visible,
    frames: t.frames.length,
    stalls,
    syncPipelineMs: sync.reduce((n, p) => n + p.ms, 0),
    asyncPipelineLatencyMs: async.reduce((n, p) => n + p.ms, 0),
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
