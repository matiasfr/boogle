import { prof } from '../../loop.ts';
import { command, note, copy, el, more } from './ui.ts';
import { no, ok, type Tool } from './types.ts';
import { graphicsSnapshot, graphicsOverrides, setGraphics, restoreGraphics } from '../../graphics-settings.ts';
import { mountLoadDetails } from '../../boot/timeline.ts';

let matching = false;
export const graphicsMeasuring = () => matching;
type HardwareTiming = Awaited<ReturnType<typeof import('../prof-overlay.ts').hardwareTiming>>;

/** A sleep alone can finish during late pipeline compilation. Require a continuous window of advancing renders. */
async function warmGraphics(seconds: number) {
  const started = performance.now();
  let stable = started;
  let previousPoll = started;
  let previous = prof.last.frames;
  while (performance.now() - started < 30_000) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (document.hidden) throw new Error('Keep the page visible while warming.');
    const now = performance.now();
    const current = prof.last.frames;
    if (current === previous || now - previousPoll > 500) stable = now;
    previousPoll = now;
    previous = current;
    if (now - stable >= seconds * 1000) return { elapsedMs: now - started };
  }
  throw new Error('Unavailable: warming timed out without continuously advancing rendered frames.');
}

/** Shared real-frame ABBA capture. The renderer's profiler owns all clocks and GPU readbacks. */
export async function measureGraphics(
  id: string,
  {
    seconds = 3,
    warmSeconds = 2,
    contention = 'unknown',
  }: { seconds?: number; warmSeconds?: number; contention?: string } = {},
) {
  if (matching) throw new Error('A matched measurement is already running.');
  if (flags().get('prof') !== '1') throw new Error('Reload with prof=1 before measuring GPU work.');
  if (
    !Number.isFinite(seconds) ||
    seconds < 1 ||
    seconds > 10 ||
    !Number.isFinite(warmSeconds) ||
    warmSeconds < 1 ||
    warmSeconds > 10
  )
    throw new Error('Sample and warm-up durations must be 1–10 seconds.');
  if (!['unknown', 'contended', 'exclusive'].includes(contention)) throw new Error('Invalid contention label.');
  const setting = graphicsSnapshot().find((s) => s.id === id);
  if (!setting?.available) throw new Error(setting?.reason ?? 'This effect is unavailable on this route.');
  if (!setting.choices.includes(true) || !setting.choices.includes(false))
    throw new Error('Measure needs an on/off cost switch.');
  if (setting.applyMode === 'reload')
    throw new Error('This switch needs separate matched reload captures. Pending values cannot be measured.');
  const saved = graphicsOverrides();
  const before = graphicsSnapshot();
  const samples: {
    enabled: boolean;
    settings: ReturnType<typeof graphicsSnapshot>;
    endSettings: ReturnType<typeof graphicsSnapshot>;
    timing: HardwareTiming;
  }[] = [];
  matching = true;
  try {
    const { hardwareTiming } = await import('../prof-overlay.ts');
    await setGraphics('resolution', 1);
    await setGraphics('frameLimit', 'display');
    // Exercise both variants before collecting either side. First-use shader construction is not a steady cost.
    const preparation = [];
    for (const enabled of [true, false]) {
      await setGraphics(id, enabled);
      preparation.push({ enabled, ...(await warmGraphics(warmSeconds)) });
    }
    const warmups = [];
    for (const enabled of [true, false, false, true]) {
      await setGraphics(id, enabled);
      warmups.push({ enabled, ...(await warmGraphics(warmSeconds)) });
      const settings = graphicsSnapshot();
      const applied = settings.find((s) => s.id === id);
      if (!applied || applied.pending || applied.effective !== enabled || applied.error)
        throw new Error(applied?.error ?? 'The requested value is not effective; no cost was measured.');
      const timing = await hardwareTiming(seconds);
      samples.push({ enabled, settings, endSettings: graphicsSnapshot(), timing });
    }
    const mean = (enabled: boolean, select: (t: HardwareTiming) => { avgMs: number; samples: number } | null) => {
      const rows = samples.filter((s) => s.enabled === enabled).map((s) => select(s.timing));
      if (rows.some((r) => r === null)) return null;
      const valid = rows.filter((r) => r !== null);
      const n = valid.reduce((sum, r) => sum + r.samples, 0);
      return n ? valid.reduce((sum, r) => sum + r.avgMs * r.samples, 0) / n : null;
    };
    const metric = (select: (t: HardwareTiming) => { avgMs: number; samples: number } | null) => {
      const on = mean(true, select),
        off = mean(false, select);
      return { onMs: on, offMs: off, deltaMs: on === null || off === null ? null : on - off };
    };
    const first = samples[0]!.timing.start;
    const signature = (value: HardwareTiming['start']) =>
      JSON.stringify({
        route: value.route,
        view: value.view,
        pixels: value.internalPixels,
        ratio: value.rendererPixelRatio,
      });
    const settingsSignature = (rows: ReturnType<typeof graphicsSnapshot>) =>
      JSON.stringify(rows.filter((row) => row.id !== id));
    const originalSettings = settingsSignature(samples[0]!.settings);
    const matched = samples.every(
      (s) =>
        s.timing.status === 'complete' &&
        signature(s.timing.start) === signature(first) &&
        signature(s.timing.end) === signature(first) &&
        settingsSignature(s.settings) === originalSettings &&
        settingsSignature(s.endSettings) === originalSettings &&
        s.endSettings.find((row) => row.id === id)?.effective === s.enabled,
    );
    const gpuMeans = samples.map((s) => s.timing.gpu.span.stats?.avgMs ?? null);
    const drift = ([0, 1] as const).some((i) => {
      const a = gpuMeans[i],
        b = gpuMeans[3 - i];
      return (
        a !== null &&
        a !== undefined &&
        b !== null &&
        b !== undefined &&
        Math.abs(a - b) > Math.max(0.5, Math.min(a, b) * 0.2)
      );
    });
    return {
      id,
      status: matched ? 'complete' : 'invalid: camera, route, pixels, settings or visibility changed',
      contention: drift
        ? `${contention}; repeated samples drifted: contention, scene activity or thermal state possible`
        : contention,
      conditions: {
        order: 'on/off/off/on',
        seconds,
        warmSeconds,
        repeated: true,
        resolution: 'fixed full route scale',
        frameLimit: 'display',
        physicalOcclusion: 'unknown',
        actualPresentation: 'unavailable',
        preparation,
        warmups,
      },
      before,
      samples,
      results: matched
        ? {
            frameInterval: metric((t) => t.presentedFrameIntervals.stats),
            cpu: metric((t) => t.cpu.stats),
            gpuSpan: metric((t) => t.gpu.span.stats),
          }
        : null,
      caution:
        'Deltas are local scene measurements, not additive feature costs. Missing GPU timestamps remain unavailable. Shared-machine exclusivity is a caller label, not detected by the browser.',
    };
  } finally {
    try {
      await restoreGraphics(saved);
    } finally {
      matching = false;
    }
  }
}

let measurement: unknown = null;
const flags = () => new URLSearchParams(location.search);
const startup = () => (window as Window & { __startup?: { snapshot(): unknown } }).__startup?.snapshot() ?? null;
function snapshot() {
  return {
    cpu: prof.table(15),
    completedFrames: prof.last.frames,
    measurement,
    startup: startup(),
    gpu: flags().get('prof') === '1' ? 'See measured timestamp availability' : 'unavailable: reload with profiling',
    actualPresentation: 'unavailable',
    cache: 'Reload does not reset the Metal shader cache.',
  };
}
export const tool: Tool = {
  id: 'performance',
  label: 'Performance and startup',
  scope: 'Local diagnostics. Legacy capture stays enabled until a reload without its flag.',
  commands: ['read', 'measure', 'copy', 'reload-prof', 'reload-startup', 'reload-off'],
  available: () => null,
  async run(name) {
    if (name.startsWith('reload-')) {
      const url = new URL(location.href);
      if (name === 'reload-prof') url.searchParams.set('prof', '1');
      else if (name === 'reload-startup') url.searchParams.set('startup', '1');
      else for (const key of ['prof', 'startup', 'startupVideo', 'gpuinfo']) url.searchParams.delete(key);
      location.assign(url.href);
      return ok('Reloading capture settings.');
    }
    if (name === 'measure') {
      if (flags().get('prof') !== '1')
        return no('GPU timestamp capability is selected when the renderer starts. Reload with profiling first.');
      measurement = await (await import('../prof-overlay.ts')).hardwareTiming(5);
      return ok('Five-second measurement completed; inspect availability and visibility status.', measurement);
    }
    const data = snapshot();
    if (name === 'copy') {
      const copied = await copy(JSON.stringify(data, null, 2));
      return ok(copied ? 'Performance report copied.' : 'Clipboard unavailable; select the report text below.', data);
    }
    return ok('Current diagnostics.', data);
  },
  snapshot,
  mount(parent, ctx) {
    const disposeLoad = mountLoadDetails(parent);
    const details = more(parent);
    note(
      details,
      'CPU values cover the existing rolling window. GPU timestamps may be unsupported. Startup needs instrumentation before loading; a reload is not a cold-cache claim.',
    );
    for (const [label, name] of [
      ['Read diagnostics', 'read'],
      ['Measure 5 seconds', 'measure'],
      ['Copy performance report', 'copy'],
      ['Reload with profiling', 'reload-prof'],
      ['Reload with startup capture', 'reload-startup'],
      ['Reload without captures', 'reload-off'],
    ])
      command(name!.startsWith('reload') ? details : parent, ctx, 'performance', label!, name!);
    const text = el('textarea');
    text.readOnly = true;
    text.setAttribute('aria-label', 'Performance report');
    text.value = JSON.stringify(snapshot(), null, 2);
    details.append(text);
    parent.append(details);
    return disposeLoad;
  },
};
