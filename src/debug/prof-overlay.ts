// Debug-only measurements, shared by ?prof=1 and dev/look/perf.ts. See ultra-water.md, audit and recommendation 2.
// Never render an extra frame: RenderPipeline's scene pass only runs once per animation frame.
import { onFrame, onStart, prof } from '../loop.ts';
import { camera, renderer, rendererReady, scenePass } from '../render/scene.ts';
import { CARD, productionRailway, protoV } from '../proto/flags.ts';
import { gpuInfo } from './gpu-info.ts';
import { bootDone, bootLine } from '../boot/timeline.ts';
import type { RenderTarget, Texture } from 'three/webgpu';

// r187's backend observation surface (not in @types/three). Keep it here, out of the renderer. Wrappers forward
// every argument and preserve receivers; no targets, queries or command buffers are created by the observer.
type GpuTexture = { width: number; height: number; depthOrArrayLayers: number; format: string; sampleCount: number };
type Context = {
  id: number;
  renderTarget: RenderTarget | null;
  textures: Texture[] | null;
  depthTexture: Texture | null;
};
// What each render context draws into, by its id (timestamp uids are `r:<call>:<context id>:f<frame>`): per-pass GPU
// time in hardwareTiming. A target's texture name, the scene pass, or its size and whether it has colour.
const contextNames = new Map<number, string>();
function contextName(context: Context) {
  const target = context.renderTarget;
  if (!target) return 'canvas';
  if (target === scenePass.renderTarget) return 'scenePass';
  const kind = context.textures?.length ? 'colour' : 'depth';
  return (
    target.texture.name || `${target.width}x${target.height} ${kind}${target.depth > 1 ? ` x${target.depth}` : ''}`
  );
}
type QueryPool = {
  currentQueryIndex: number;
  pendingResolve: unknown;
  queryOffsets: Map<string, number>;
  _resolveQueries(): Promise<number>;
  resultBuffer: { getMappedRange(offset?: number, size?: number): ArrayBuffer; mapState: string };
};
type Backend = {
  beginRender: (context: Context) => void;
  compute: (...args: unknown[]) => void;
  get: (texture: Texture) => { texture?: GpuTexture; msaaTexture?: GpuTexture; msaaTextures?: GpuTexture[] };
  device?: {
    adapterInfo?: {
      vendor?: string;
      architecture?: string;
      device?: string;
      description?: string;
      isFallbackAdapter?: boolean;
    };
  };
  trackTimestamp?: boolean;
  timestampQueryPool?: Partial<Record<'render' | 'compute', QueryPool>>;
};
const backend = renderer.backend as unknown as Backend;

function textureInfo(texture: Texture) {
  const data = backend.get(texture);
  const describe = (t: GpuTexture) => ({
    width: t.width,
    height: t.height,
    layers: t.depthOrArrayLayers,
    format: t.format,
    samples: t.sampleCount,
  });
  return {
    name: texture.name || null,
    format: texture.format,
    type: texture.type,
    gpu: data.texture ? describe(data.texture) : null,
    multisampled: [data.msaaTexture, ...(data.msaaTextures ?? [])].filter((t) => t !== undefined).map(describe),
  };
}

/** Observe only work that really executes. Stop in finally; counts can use this without enabling timestamps/UI. */
export async function observeGpu() {
  await rendererReady;
  const placeLook = productionRailway ? (await import('../place/look.ts')).LOOK : null;
  const targets = new Map<RenderTarget, Context>();
  let frame = -1,
    renderPasses = 0,
    computeDispatches = 0;
  const touch = () => {
    if (frame === renderer.info.frame) return;
    frame = renderer.info.frame;
    renderPasses = computeDispatches = 0;
  };
  const disposed = (event: { target?: RenderTarget }) => {
    if (event.target) {
      targets.delete(event.target);
      event.target.removeEventListener('dispose', disposed);
    }
  };
  const work = () => {
    touch();
    return { frame, renderPasses, computeDispatches, computePasses: renderer.info.compute.frameCalls };
  };
  const begin = backend.beginRender;
  const compute = backend.compute;
  const beginWrapped: Backend['beginRender'] = function (context) {
    begin.call(backend, context);
    touch();
    renderPasses++;
    if (!contextNames.has(context.id)) contextNames.set(context.id, contextName(context));
    if (context.renderTarget) {
      if (!targets.has(context.renderTarget)) context.renderTarget.addEventListener('dispose', disposed);
      targets.set(context.renderTarget, context);
    }
  };
  const computeWrapped: Backend['compute'] = function (...args) {
    compute.apply(backend, args);
    touch();
    computeDispatches++; // r187: one direct or indirect dispatch per backend.compute (not per renderer.compute).
  };
  backend.beginRender = beginWrapped;
  backend.compute = computeWrapped;
  return {
    work,
    snapshot() {
      touch();
      const q = new URLSearchParams(location.search);
      const prototypes = CARD ? [CARD] : [];
      return {
        ...work(),
        internalPixels: { width: renderer.domElement.width, height: renderer.domElement.height },
        devicePixelRatio,
        rendererPixelRatio: renderer.getPixelRatio(),
        msaaSamples: Math.max(1, scenePass.renderTarget.samples),
        adapter: backend.device?.adapterInfo
          ? {
              vendor: backend.device.adapterInfo.vendor ?? null,
              architecture: backend.device.adapterInfo.architecture ?? null,
              device: backend.device.adapterInfo.device ?? null,
              description: backend.device.adapterInfo.description ?? null,
              isFallbackAdapter: backend.device.adapterInfo.isFallbackAdapter ?? null,
            }
          : null,
        workCountScope:
          'backend beginRender contexts and compute dispatches; excludes internal copy/clear/mipmap passes and XR layer splits',
        renderTargets: [...targets].map(([target, context]) => ({
          id: target.texture.uuid,
          name: target.texture.name || (target === scenePass.renderTarget ? 'scenePass' : null),
          width: target.width,
          height: target.height,
          depth: target.depth,
          samples: Math.max(1, target.samples),
          colors: (context.textures ?? []).map(textureInfo),
          depthStencil: context.depthTexture ? textureInfo(context.depthTexture) : null,
        })),
        targetInventoryScope:
          'offscreen targets observed since collection began; not total residency; GPU descriptors are actual allocations, null means unavailable',
        route: { pathname: location.pathname, query: Object.fromEntries(q), hash: location.hash },
        view: {
          position: camera.position.toArray(),
          quaternion: camera.quaternion.toArray(),
          fov: camera.fov,
          near: camera.near,
          far: camera.far,
        },
        flags: {
          prototypes: prototypes.map((id) => ({ id, variant: protoV(id) || 'default' })),
          look: q.get('look'),
          fx: q.get('fx'),
          activeLook: window.boogle?.lookLab?.on() ?? placeLook,
          dpr: q.get('dpr') ?? 'adaptive',
        },
      };
    },
    stop() {
      if (backend.beginRender === beginWrapped) backend.beginRender = begin;
      if (backend.compute === computeWrapped) backend.compute = compute;
      for (const target of targets.keys()) target.removeEventListener('dispose', disposed);
      targets.clear();
    },
  };
}

type FrameSample = {
  frame: number;
  cpuMs: number;
  intervalMs: number | null;
  renderPasses: number;
  computeDispatches: number;
  computePasses: number;
};
type GpuSample = { frame: number; ms: number; contexts: number; startMs: number; endMs: number; stale?: boolean };
/** One timed pass: what it drew into (contextNames) and its own begin-to-end GPU time. */
type PassSample = { frame: number; name: string; ms: number };
type Timing = { frames: FrameSample[]; render: GpuSample[]; compute: GpuSample[]; passes: PassSample[] };
const emptyTiming = (): Timing => ({ frames: [], render: [], compute: [], passes: [] });
let recent = emptyTiming();
let session: Timing | null = null;
let collecting = false;
let observer: Awaited<ReturnType<typeof observeGpu>> | null = null;
let previousNow: number | null = null;
let bootRow = '';
const pending: Record<'render' | 'compute', Promise<void> | null> = { render: null, compute: null };
const watchedPools = new WeakSet<QueryPool>();
const lastGpuStart = { render: { frame: -1, ms: -Infinity }, compute: { frame: -1, ms: -Infinity } };

// r187 exposes durations, not absolute endpoints. Observe its existing readback before unmap, without another
// query, submission or fence. Version-specific structural guards deliberately fail closed on a backend change.
function watchSpans(pool: QueryPool, type: 'render' | 'compute') {
  if (watchedPools.has(pool)) return;
  if (!pool.queryOffsets || !pool.resultBuffer || typeof pool._resolveQueries !== 'function') return;
  watchedPools.add(pool);
  const resolve = pool._resolveQueries;
  const buffer = pool.resultBuffer;
  const read = buffer.getMappedRange;
  let offsets = new Map<string, number>();
  pool._resolveQueries = function () {
    if (buffer.mapState === 'unmapped') offsets = new Map(pool.queryOffsets);
    return resolve.call(this);
  };
  buffer.getMappedRange = function (offset, size) {
    const range = read.call(this, offset, size);
    const times = new BigUint64Array(range);
    const frames = new Map<number, GpuSample>();
    for (const [uid, index] of offsets) {
      const match = /:f(\d+)$/.exec(uid);
      const start = times[index];
      const end = times[index + 1];
      if (!match || start === undefined || end === undefined || start === 0n || end < start) continue;
      const frame = Number(match[1]);
      const startMs = Number(start) / 1e6;
      const endMs = Number(end) / 1e6;
      const row = frames.get(frame) ?? { frame, startMs, endMs, ms: 0, contexts: 0 };
      row.startMs = Math.min(row.startMs, startMs);
      row.endMs = Math.max(row.endMs, endMs);
      row.ms = row.endMs - row.startMs;
      row.contexts++;
      frames.set(frame, row);
      if (session) {
        const id = /^[rc]:\d+:(\d+):f/.exec(uid)?.[1];
        const name = type === 'compute' ? 'compute' : (contextNames.get(Number(id)) ?? `context ${id}`);
        session.passes.push({ frame, name, ms: endMs - startMs });
      }
    }
    for (const row of [...frames.values()].sort((a, b) => a.frame - b.frame)) {
      // A freshly allocated query index can still contain an old GPU value if that slot was not written.
      // Context counts alone cannot validate it. Queue-ordered newer frames must advance their first timestamp.
      const last = lastGpuStart[type];
      if (row.frame > last.frame) {
        row.stale = row.startMs <= last.ms;
        last.frame = row.frame;
        if (!row.stale) last.ms = row.startMs;
      }
      const add = (timing: Timing) => {
        const previous = timing[type].find((r) => r.frame === row.frame);
        if (previous) {
          previous.startMs = Math.min(previous.startMs, row.startMs);
          previous.endMs = Math.max(previous.endMs, row.endMs);
          previous.ms = previous.endMs - previous.startMs;
          previous.contexts += row.contexts;
          previous.stale ||= row.stale;
        } else timing[type].push({ ...row });
      };
      add(recent);
      if (recent[type].length > 240) recent[type].shift();
      if (session?.frames.some((f) => f.frame === row.frame)) add(session);
    }
    offsets.clear();
    return range;
  };
}

function stats(values: number[]) {
  if (!values.length) return null;
  const s = values.slice().sort((a, b) => a - b);
  return {
    samples: s.length,
    avgMs: s.reduce((a, b) => a + b, 0) / s.length,
    p95Ms: s[Math.ceil(s.length * 0.95) - 1]!,
    maxMs: s.at(-1)!,
  };
}

// Never use resolveTimestampsAsync's return value: it sums passes and can be cached. Only raw fresh readbacks count.
async function resolveGpu(type: 'render' | 'compute') {
  if (pending[type]) return pending[type];
  const pool = backend.timestampQueryPool?.[type];
  if (!backend.trackTimestamp || !pool || (!pool.currentQueryIndex && !pool.pendingResolve)) return;
  watchSpans(pool, type);
  pending[type] = (async () => {
    try {
      await renderer.resolveTimestampsAsync(type);
    } finally {
      pending[type] = null;
    }
  })();
  return pending[type];
}

/** Each pass's GPU ms per frame over the frames with a complete span, slowest first. Passes overlap and leave gaps, so
 *  they need not add up to the span. */
function passTable(timing: Timing, spans: { frame: number }[]) {
  const ids = new Set(spans.map((s) => s.frame));
  const by = new Map<string, { ms: number; n: number; max: number }>();
  for (const p of timing.passes) {
    if (!ids.has(p.frame)) continue;
    const row = by.get(p.name) ?? { ms: 0, n: 0, max: 0 };
    row.ms += p.ms;
    row.n++;
    row.max = Math.max(row.max, p.ms);
    by.set(p.name, row);
  }
  const frames = ids.size || 1;
  return [...by]
    .map(([name, r]) => ({
      name,
      msPerFrame: +(r.ms / frames).toFixed(3),
      perFrame: +(r.n / frames).toFixed(2),
      maxMs: +r.max.toFixed(3),
    }))
    .sort((a, b) => b.msPerFrame - a.msPerFrame);
}

function summarize(timing: Timing) {
  const complete = (frame: FrameSample, type: 'render' | 'compute') => {
    const expected = type === 'render' ? frame.renderPasses : frame.computePasses;
    const row = timing[type].find((r) => r.frame === frame.frame);
    return expected === 0 || (row !== undefined && !row.stale && row.contexts === expected);
  };
  const gpu = (type: 'render' | 'compute') => {
    const eligible = timing.frames.filter((f) => (type === 'render' ? f.renderPasses > 0 : f.computeDispatches > 0));
    const ids = new Set(eligible.map((f) => f.frame));
    const rows = timing[type].filter((f) => ids.has(f.frame));
    const full = rows.filter((r) =>
      complete(
        eligible.find((f) => f.frame === r.frame)!,
        type,
      ),
    );
    return {
      status: !backend.trackTimestamp
        ? 'unavailable: timestamp-query not supported/enabled'
        : !eligible.length
          ? 'no observed work'
          : !full.length
            ? 'unavailable: no complete fresh timestamps'
            : 'available',
      stats: stats(full.map((r) => r.ms)),
      eligibleFrames: eligible.length,
      missingFrames: eligible.length - rows.length,
      staleFrames: rows.filter((r) => r.stale).length,
      partialFrames: rows.filter((r) => {
        const frame = eligible.find((f) => f.frame === r.frame)!;
        return !complete(frame, type);
      }).length,
      samples: rows,
    };
  };
  const spans = timing.frames.flatMap((frame) => {
    if (!complete(frame, 'render') || !complete(frame, 'compute')) return [];
    const rows = [...timing.render, ...timing.compute].filter((r) => r.frame === frame.frame);
    if (!rows.length) return [];
    return [
      { frame: frame.frame, ms: Math.max(...rows.map((r) => r.endMs)) - Math.min(...rows.map((r) => r.startMs)) },
    ];
  });
  return {
    cpu: {
      scope: 'completed game frame main-thread CPU, including submission; excludes GPU execution',
      stats: stats(timing.frames.map((f) => f.cpuMs)),
    },
    gpu: {
      render: gpu('render'),
      compute: gpu('compute'),
      span: {
        status: spans.length ? 'available' : 'unavailable: no complete fresh timestamp spans',
        stats: stats(spans.map((r) => r.ms)),
        eligibleFrames: timing.frames.length,
        missingFrames: timing.frames.length - spans.length,
        samples: spans,
      },
      scope:
        'earliest GPU start to latest GPU end per frame, including intervening gaps; never summed pass timers. Partial frames excluded. Not presentation latency.',
    },
    presentedFrameIntervals: {
      scope:
        'animation callback timestamps for completed visible game frames; presentation proxy, not actual display/scan-out timestamps',
      stats: stats(timing.frames.flatMap((f) => (f.intervalMs === null ? [] : [f.intervalMs]))),
      actualPresentationTimestamps: 'unavailable',
    },
    passes: passTable(timing, spans),
    completedFrames: timing.frames.length,
  };
}

/** Bounded real-frame sample. No fake clock, extra render calls, GPU fences, or claim of headless FPS. */
export async function hardwareTiming(seconds = 5) {
  if (!observer) throw new Error('Hardware timing needs ?prof=1 and a ready renderer');
  if (session) throw new Error('Hardware timing already running');
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 30) throw new Error('Sample duration must be 1–30 seconds');
  if (document.hidden) throw new Error('Keep the page visible while measuring');
  const timing = emptyTiming();
  session = timing;
  collecting = true;
  const start = observer.snapshot();
  let hidden = false;
  const visibility = () => {
    hidden ||= document.hidden;
  };
  document.addEventListener('visibilitychange', visibility);
  const started = performance.now();
  try {
    await new Promise((r) => setTimeout(r, seconds * 1000));
    collecting = false;
    const end = observer.snapshot();
    const elapsedMs = performance.now() - started;
    // Do not wait indefinitely for a GPU/driver. Late results count as missing, never zero.
    await Promise.race([
      Promise.all([resolveGpu('render'), resolveGpu('compute')]),
      new Promise((r) => setTimeout(r, 250)),
    ]);
    return {
      status: hidden
        ? 'invalid: page was hidden'
        : timing.frames.length
          ? 'complete'
          : 'unavailable: no completed frames',
      elapsedMs,
      userAgent: navigator.userAgent,
      start,
      end,
      ...summarize(timing),
    };
  } finally {
    session = null;
    collecting = false;
    document.removeEventListener('visibilitychange', visibility);
  }
}

// Importing this module from the counts harness alone must not install UI, frame hooks or timestamp collection.
if (Number(new URLSearchParams(location.search).get('prof')) > 0) {
  void bootDone.then(() => {
    bootRow = bootLine();
    console.info('[boot] ' + bootRow);
  });
  void observeGpu()
    .then((value) => {
      observer = value;
    })
    .catch(() => {});
  void rendererReady
    .then(() => gpuInfo())
    .then(
      (text) => console.info('[gpuinfo]\n' + text),
      () => {},
    );
  onFrame(
    ({ now }) => {
      const completed = prof.last.frames;
      // Runs after main's renderFrame/endFrame, so CPU and queries belong to this completed animation frame.
      queueMicrotask(() => {
        if (!observer || prof.last.frames === completed) return;
        const snapshot = observer.work();
        const row = {
          frame: renderer.info.frame,
          cpuMs: prof.last.ms,
          intervalMs: previousNow === null || document.hidden ? null : now - previousNow,
          renderPasses: snapshot.renderPasses,
          computeDispatches: snapshot.computeDispatches,
          computePasses: snapshot.computePasses,
        };
        previousNow = document.hidden ? null : now;
        recent.frames.push(row);
        if (recent.frames.length > 240) recent.frames.shift();
        if (session && collecting)
          session.frames.push({ ...row, intervalMs: session.frames.length ? row.intervalMs : null });
        void resolveGpu('render').catch(() => {});
        void resolveGpu('compute').catch(() => {});
      });
    },
    { phase: 'late', order: 1990 },
  );
  document.addEventListener('visibilitychange', () => {
    previousNow = null;
    recent = emptyTiming();
  });
  onStart(() => {
    // `&profui=0`: the timing hooks without the panel and its 500 ms refresh (the device test, src/debug/device/).
    if (new URLSearchParams(location.search).get('profui') === '0') return;
    const panel = document.createElement('section');
    panel.style.cssText =
      'position:fixed;right:8px;top:72px;max-width:calc(100vw - 16px);max-height:70vh;overflow:auto;padding:8px;border-radius:6px;background:#001b26e8;color:#d8f3ff;font:11px/1.35 ui-monospace,monospace;z-index:50;pointer-events:none';
    const run = document.createElement('button');
    run.textContent = 'Measure 5 seconds';
    const copy = document.createElement('button');
    copy.textContent = 'Copy';
    const output = document.createElement('pre');
    output.style.cssText = 'white-space:pre-wrap;margin:6px 0;user-select:text';
    // The panel lets touches through to the lobby and game; only its controls take them.
    run.style.pointerEvents = copy.style.pointerEvents = 'auto';
    panel.append(run, copy, output);
    document.body.append(panel);
    // Debug controls must not also throw/jump/interact in the game.
    for (const event of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup'])
      panel.addEventListener(event, (e) => e.stopPropagation());
    let report: Awaited<ReturnType<typeof hardwareTiming>> | null = null;
    let message = '';
    const format = (s: ReturnType<typeof stats>) =>
      s ? `${s.avgMs.toFixed(2)} avg / ${s.p95Ms.toFixed(2)} p95 ms (${s.samples})` : 'unavailable';
    const refresh = () => {
      const data = report ?? summarize(recent);
      const context = report?.end ?? observer?.snapshot();
      output.textContent = [
        message,
        report ? 'Captured sample (press Measure to repeat)' : 'Live: last 240 frames',
        `CPU: ${format(data.cpu.stats)}`,
        `GPU span: ${format(data.gpu.span.stats)}; missing ${data.gpu.span.missingFrames}/${data.gpu.span.eligibleFrames}`,
        ...(['render', 'compute'] as const).map(
          (type) =>
            `GPU ${type}: ${format(data.gpu[type].stats)}\n  ${data.gpu[type].status}; missing ${data.gpu[type].missingFrames}/${data.gpu[type].eligibleFrames}; partial ${data.gpu[type].partialFrames}`,
        ),
        `Presented interval proxy: ${format(data.presentedFrameIntervals.stats)}`,
        'Actual presentation times: unavailable',
        context
          ? `${context.internalPixels.width}×${context.internalPixels.height} px · DPR ${context.devicePixelRatio} / render ${context.rendererPixelRatio} · MSAA ${context.msaaSamples}\npasses ${context.renderPasses} · dispatches ${context.computeDispatches}\n${context.route.pathname} ${JSON.stringify(context.flags)}`
          : 'Waiting for renderer',
        report
          ? ''
          : '\navg / p95 CPU sections\n' +
            prof
              .table(8)
              .map((r) => `${r.avg.toFixed(2)} / ${r.p95.toFixed(2)} ${r.name}`)
              .join('\n'),
        bootRow,
      ]
        .filter(Boolean)
        .join('\n');
    };
    run.onclick = async () => {
      run.disabled = true;
      report = null;
      message = 'Measuring real animation frames…';
      refresh();
      try {
        report = await hardwareTiming();
        message = report.status;
      } catch (e) {
        message = String(e);
      } finally {
        run.disabled = false;
        refresh();
      }
    };
    copy.onclick = async () => {
      const text = JSON.stringify(report ?? { context: observer?.snapshot(), ...summarize(recent) }, null, 2);
      try {
        await navigator.clipboard.writeText(text);
        message = 'Copied JSON';
      } catch {
        // Safari/private mode/clipboard denial: a selectable fallback still works without Web Inspector.
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('aria-label', 'Profiling report to copy');
        area.style.pointerEvents = 'auto';
        panel.append(area);
        area.focus();
        area.select();
        message = 'Select and copy the report below';
      }
      refresh();
    };
    setInterval(refresh, 500);
    refresh();
  });
}
