// Debug-only measurements, shared by ?prof=1 and dev/look/perf.ts. See ultra-water.md, audit and recommendation 2.
// Never render an extra frame: RenderPipeline's scene pass only runs once per animation frame.
import { onFrame, onStart, prof } from '../loop.ts';
import { camera, renderer, rendererReady, scenePass } from '../render/scene.ts';
import { ISLAND, ON_ISLAND, PROTO, protoV } from '../proto/flags.ts';
import { gpuInfo } from './gpu-info.ts';
import { bootDone, bootLine } from '../boot/timeline.ts';
import type { RenderTarget, Texture } from 'three/webgpu';

// r187's backend observation surface (not in @types/three). Keep it here, out of the renderer. Wrappers forward
// every argument and preserve receivers; no targets, queries or command buffers are created by the observer.
type GpuTexture = { width: number; height: number; depthOrArrayLayers: number; format: string; sampleCount: number };
type Context = { renderTarget: RenderTarget | null; textures: Texture[] | null; depthTexture: Texture | null };
type QueryPool = { timestamps: Map<string, number>; currentQueryIndex: number; pendingResolve: unknown };
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
  const placeLook = PROTO === 'place' ? (await import('../proto/place/look.ts')).LOOK : null;
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
      const prototypes = ON_ISLAND ? [...ISLAND] : PROTO ? [PROTO] : [];
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

// The counts harness imports the observer without enabling the existing overlay.
if (Number(new URLSearchParams(location.search).get('prof')) > 0) {
  let bootRow = '';
  bootDone.then((tl) => {
    console.info('[boot] ' + bootLine());
    const wanted = ['modules', 'gpu', 'shaders', 'first', 'interactive', 'room'];
    const at = tl.marks.filter((m) => wanted.includes(m.name)).map((m) => `${m.name} ${m.t}`);
    bootRow = `boot ms: ${at.join(' · ')}\n`;
  });

  const WINDOW = 240;
  const gpu = new Float32Array(WINDOW);
  const sorted = new Float32Array(WINDOW);
  let gpuN = 0,
    gpuHead = 0,
    timestamps = false;

  rendererReady.then(
    () => {
      timestamps = !!(renderer.backend as unknown as { trackTimestamp?: boolean }).trackTimestamp;
      gpuInfo().then((t) => console.info('[gpuinfo]\n' + t));
    },
    () => {},
  );

  // Resolve last frame's queries each frame (three returns the pending promise if one is still mapping, and its query
  // pool overflows if nobody resolves). Asynchronous, so the value lands a frame or two late.
  const record = (ms: number | undefined) => {
    if (!ms || !(ms > 0)) return;
    gpu[gpuHead] = ms;
    gpuHead = (gpuHead + 1) % WINDOW;
    if (gpuN < WINDOW) gpuN++;
  };
  onFrame(
    () => {
      if (timestamps) renderer.resolveTimestampsAsync('render').then(record, () => {});
    },
    { phase: 'late', order: 1990 },
  );

  onStart(() => {
    const el = document.createElement('pre');
    el.style.cssText =
      'position:fixed;right:8px;top:72px;margin:0;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.6);' +
      'color:#d8f3ff;font:11px/1.35 ui-monospace,monospace;pointer-events:none;z-index:50;white-space:pre';
    document.body.append(el);
    const ms = (x: number) => x.toFixed(2).padStart(6);
    setInterval(() => {
      const rows = prof.table(14);
      let gpuRow = timestamps ? '     -      -  GPU (waiting)\n' : '  GPU: no timestamp-query\n';
      if (gpuN) {
        sorted.set(gpu);
        const s = sorted.subarray(0, gpuN).sort();
        const avg = s.reduce((a, b) => a + b, 0) / gpuN;
        gpuRow = `${ms(avg)} ${ms(s[Math.floor(gpuN * 0.95)]!)}  GPU, all passes\n`;
      }
      el.textContent =
        bootRow + '   avg    p95  ms\n' + gpuRow + rows.map((r) => `${ms(r.avg)} ${ms(r.p95)}  ${r.name}`).join('\n');
    }, 500);
  });
}
