// Local, opt-in diagnostic. Also injected before navigation by dev/cold-start.ts.
// No game imports: installation must precede main.ts and the first GPUDevice.
export function installStartupRecorder() {
  if (window.__startup) return;
  const started = performance.now();
  const frames: { t: number; dt: number }[] = [];
  const pipelines: { kind: string; label: string; t: number; ms: number; ok: boolean; pending: boolean }[] = [];
  const entries: Record<string, unknown>[] = [];
  const visibility = [{ t: started, hidden: document.hidden }];
  const errors: string[] = [];
  const videoFrames: { t: number; presentationTime: number; expectedDisplayTime: number; presentedFrames: number }[] =
    [];
  const restores: (() => void)[] = [];
  const observers: PerformanceObserver[] = [];
  let last = 0;
  let stopped = false;
  let ended: number | undefined;
  let statusLabel: HTMLElement | undefined;
  let firstVisibleWaterProxy: number | null = null;
  let video: HTMLVideoElement | undefined;
  let stream: MediaStream | undefined;
  let presentation = 'rAF callbacks only; not scan-out evidence';
  const nativeRAF = window.requestAnimationFrame;
  // Observe the existing callbacks, including loading. Never start a second frame loop.
  const wrappedRAF: typeof requestAnimationFrame = (callback) =>
    nativeRAF.call(window, (t) => {
      if (!stopped && t !== last) {
        if (last && frames.length < 30000) frames.push({ t, dt: t - last });
        last = t;
      }
      callback(t);
    });
  window.requestAnimationFrame = wrappedRAF;
  restores.push(() => {
    if (window.requestAnimationFrame === wrappedRAF) window.requestAnimationFrame = nativeRAF;
  });

  for (const type of ['mark', 'measure', 'longtask', 'long-animation-frame', 'paint']) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (entries.length < 12000) entries.push(entry.toJSON());
    });
    observer.observe({ type, buffered: true });
    observers.push(observer);
  }

  // Structural types keep this usable on Safari versions without WebGPU declarations.
  const gpu = (globalThis as unknown as { GPUDevice?: { prototype: Record<string, unknown> } }).GPUDevice;
  if (gpu)
    for (const kind of [
      'createShaderModule',
      'createRenderPipeline',
      'createComputePipeline',
      'createRenderPipelineAsync',
      'createComputePipelineAsync',
    ]) {
      const original = gpu.prototype[kind] as ((...args: unknown[]) => unknown) | undefined;
      if (!original) continue;
      const wrapped = function (this: unknown, ...args: unknown[]) {
        const t = performance.now();
        const label = String((args[0] as { label?: string })?.label ?? 'unlabelled');
        const pipeline = { kind, label, t, ms: 0, ok: false, pending: true };
        if (!stopped && pipelines.length < 10000) pipelines.push(pipeline);
        const record = (ok: boolean) => {
          if (!stopped) Object.assign(pipeline, { ms: performance.now() - t, ok, pending: false });
        };
        try {
          const value = original.apply(this, args);
          if (value instanceof Promise)
            return value.then(
              (result: unknown) => {
                record(true);
                return result;
              },
              (error: unknown) => {
                record(false);
                throw error;
              },
            );
          record(true);
          return value;
        } catch (error) {
          record(false);
          throw error;
        }
      };
      try {
        gpu.prototype[kind] = wrapped;
        restores.push(() => {
          if (gpu.prototype[kind] === wrapped) gpu.prototype[kind] = original;
        });
      } catch {
        errors.push(`Cannot instrument ${kind}`);
      }
    }

  const onVisibility = () => visibility.push({ t: performance.now(), hidden: document.hidden });
  document.addEventListener('visibilitychange', onVisibility);
  const onError = (event: ErrorEvent) => {
    if (errors.length < 100) errors.push(event.message);
  };
  addEventListener('error', onError);
  // Splash removal follows boot:first (GPU completed). It is an upper-bound proxy for
  // water visibility in the starting camera, not an assertion about the pixels.
  const dom = new MutationObserver(() => {
    if (
      firstVisibleWaterProxy === null &&
      performance.getEntriesByName('boot:first').length &&
      !document.querySelector('.splash')
    ) {
      firstVisibleWaterProxy = performance.now();
      performance.mark('startup:water-visible-proxy');
      dom.disconnect();
    }
  });
  dom.observe(document, { childList: true, subtree: true });

  function snapshot() {
    return {
      version: 1,
      url: location.href,
      ua: navigator.userAgent,
      started,
      end: ended ?? performance.now(),
      stopped,
      build: document.querySelector('meta[name="boogle-build"]')?.getAttribute('content'),
      capabilities: { observer: PerformanceObserver.supportedEntryTypes, gpuHooks: !!gpu },
      limits: [
        'Pipeline API elapsed time includes JS scheduling, not isolated compiler time.',
        'Water time is splash-removal proxy; confirm water pixels in captures.',
        presentation,
      ],
      firstVisibleWaterProxy,
      frames,
      pipelines: pipelines.map((p) => (p.pending ? { ...p, ms: (ended ?? performance.now()) - p.t } : p)),
      entries,
      visibility,
      errors,
      videoFrames,
      resources: performance.getEntriesByType('resource').map((e) => e.toJSON()),
      navigation: performance.getEntriesByType('navigation').map((e) => e.toJSON()),
    };
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    ended = performance.now();
    if (statusLabel) statusLabel.textContent = 'Startup timeline (stopped)';
    restores.forEach((restore) => restore());
    observers.forEach((observer) => {
      entries.push(...observer.takeRecords().map((e) => e.toJSON()));
      observer.disconnect();
    });
    dom.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    removeEventListener('error', onError);
    stream?.getTracks().forEach((track) => track.stop());
    video?.remove();
    clearTimeout(timer);
  }
  const timer = setTimeout(stop, 90000);
  window.__startup = { snapshot, stop };

  function controls() {
    const panel = document.createElement('details');
    panel.style.cssText =
      'position:fixed;bottom:8px;left:8px;z-index:10000;background:#fff;color:#111;padding:8px;max-width:85vw;font:14px sans-serif';
    const summary = document.createElement('summary');
    statusLabel = summary;
    summary.textContent = 'Startup recording (90 seconds)';
    panel.append(summary);
    const output = document.createElement('textarea');
    output.setAttribute('aria-label', 'Startup timeline JSON');
    output.style.cssText = 'display:none;width:70vw;height:160px';
    for (const action of ['Copy timeline', 'Save timeline']) {
      const button = document.createElement('button');
      button.textContent = action;
      button.onclick = async () => {
        stop();
        const text = JSON.stringify(snapshot());
        if (action === 'Copy timeline') {
          try {
            await navigator.clipboard.writeText(text);
            button.textContent = 'Copied';
          } catch {
            output.style.display = 'block';
            output.value = text;
            output.select();
          }
        } else {
          const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = `boogle-startup-${Date.now()}.json`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      };
      panel.append(button);
    }
    panel.append(output);
    document.body.append(panel);
    // Optional because canvas capture adds work. Video callbacks concern the captured
    // video compositor, not the canvas's physical presentation. Default runs omit it.
    if (new URLSearchParams(location.search).get('startupVideo') !== '1') return;
    const canvas = document.querySelector<HTMLCanvasElement>('#view');
    if (!canvas?.captureStream || !HTMLVideoElement.prototype.requestVideoFrameCallback) return;
    try {
      stream = canvas.captureStream();
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      video.style.cssText = 'position:fixed;right:0;bottom:0;width:2px;height:2px;z-index:10001';
      document.body.append(video);
      presentation = 'Captured canvas video compositor callbacks; capture overhead present; not physical scan-out';
      const frame: VideoFrameRequestCallback = (t, m) => {
        if (stopped) return;
        if (videoFrames.length < 30000)
          videoFrames.push({
            t,
            presentationTime: m.presentationTime,
            expectedDisplayTime: m.expectedDisplayTime,
            presentedFrames: m.presentedFrames,
          });
        video!.requestVideoFrameCallback(frame);
      };
      video.requestVideoFrameCallback(frame);
      void video.play().catch((e: unknown) => errors.push(String(e)));
    } catch (e) {
      errors.push(String(e));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', controls, { once: true });
  else controls();
}

export type StartupTimeline = ReturnType<NonNullable<Window['__startup']>['snapshot']>;
declare global {
  interface Window {
    __startup?: {
      snapshot: () => {
        version: number;
        url: string;
        ua: string;
        started: number;
        end: number;
        stopped: boolean;
        build: string | null | undefined;
        capabilities: { observer: readonly string[]; gpuHooks: boolean };
        limits: string[];
        firstVisibleWaterProxy: number | null;
        frames: { t: number; dt: number }[];
        pipelines: { kind: string; label: string; t: number; ms: number; ok: boolean; pending: boolean }[];
        entries: Record<string, unknown>[];
        visibility: { t: number; hidden: boolean }[];
        errors: string[];
        videoFrames: { t: number; presentationTime: number; expectedDisplayTime: number; presentedFrames: number }[];
        resources: Record<string, unknown>[];
        navigation: Record<string, unknown>[];
      };
      stop: () => void;
    };
  }
}
