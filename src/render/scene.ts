import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { CAMERA_FAR, FOG_HEX, FOG_NEAR, FOG_FAR, isTouch } from '../constants.ts';
import { scene } from './scene-graph.ts';
import { MAX_DPR, installQuality } from './quality.ts';
import { graphicsInitial, registerGraphics } from '../graphics-settings.ts';
import { playMark } from '../proto/mark.ts';
import { bootMark } from '../boot/timeline.ts';
import { splashDone } from '../boot/splash.ts';
import { atLeastOneDevicePixel, clampTargetSize, drawableBox } from './drawable-size.ts';

export const canvas = document.getElementById('view') as HTMLCanvasElement; // in index.html

// WebGPU only: no WebGL 2 fallback, so every feature may use compute, storage buffers and the rest of WebGPU without a
// second path (src/render/README.md). A browser without WebGPU gets a note in the lobby instead of the island.
// render() throws until init() resolves, so main.ts starts the game from rendererReady.
const params = new URLSearchParams(location.search);
const msaaDefault = !isTouch; // Owner call, 4 November: touch devices skip scene MSAA; desktop keeps 4x.
const msaa = graphicsInitial('msaa', [true, false], msaaDefault) === true;
export const renderer = new THREE.WebGPURenderer({
  canvas,
  antialias: msaa,
  powerPreference: 'high-performance',
  trackTimestamp: Number(params.get('prof')) > 0, // GPU ms per frame in the ?prof=1 overlay (src/debug/prof-overlay.ts)
});
(renderer as unknown as { _getFallback: null })._getFallback = null; // three would quietly swap in its WebGL 2 backend when WebGPU can't start; fail instead
// Pinned three passes an object here; its declarations still describe the older string callback.
// Keep its console error (and the harness failure), plus a bounded, untruncated-enough diagnostic mark.
const errorSource = renderer as unknown as {
  onError(info: { api: string; type: string; message: string }): void;
};
const reportError = errorSource.onError.bind(renderer);
const gpuErrors = new Set<string>();
const recordGpuError: typeof errorSource.onError = (info) => {
  if (gpuErrors.size < 8) {
    const message = info.message.slice(0, 2000);
    const key = `${info.type}:${message}`;
    if (!gpuErrors.has(key)) {
      gpuErrors.add(key);
      playMark('gpu error', { api: info.api, type: info.type, message, ...graphicsContext() });
    }
  }
  reportError(info);
};
errorSource.onError = (info) => {
  recordGpuError(info);
  checkGpuFrames = true;
  gpuErrorVersion++;
};
export { MAX_DPR, FIXED_DPR } from './quality.ts';
// The drawing buffer is never empty (./drawable-size.ts): every resize and pixel-ratio change goes through this.
const canvasTarget = renderer.getCanvasTarget();
const setCanvasSize = canvasTarget.setSize.bind(canvasTarget);
canvasTarget.setSize = (width, height, updateStyle) => {
  const ratio = canvasTarget.getPixelRatio();
  setCanvasSize(atLeastOneDevicePixel(width, ratio), atLeastOneDevicePixel(height, ratio), updateStyle);
};
renderer.setPixelRatio(MAX_DPR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
// Neutral, not AgX: AgX greyed the toy palette (sea, sky and grass lost their saturation).
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0; // the one base exposure; lights stay physical
renderer.outputColorSpace = THREE.SRGBColorSpace;

const lobbyNote = (text: string) => {
  const sub = document.getElementById('lobby-sub');
  if (sub) sub.textContent = text;
  document.getElementById('lobby')?.removeAttribute('hidden'); // a returning visit hides the card (src/player/hud.ts)
};
// The backend three is drawing with: 'webgpu' once rendererReady resolves, null before (telemetry, the harness).
let started = false;
export const gfx = () => (started ? 'webgpu' : null);

// Local failure latch: the server still owns the room. Never reset it or automatically navigate away.
let graphicsStopped = false;
// One bad submission can recover. Only 60 consecutive GPU-checked draw submissions may latch the fallback.
// Not seconds, rAFs or console-message counts: a clean draw (or an unobserved gap) breaks the streak.
const FAILED_DRAW_LIMIT = 60;
const MAX_GPU_CHECKS = 8;
let checkGpuFrames = false;
let gpuErrorVersion = 0;
let failedDraws = 0;
let gpuChecks = 0;
let gpuCheckGeneration = 0;
let gpuChecksDone: Promise<void> = Promise.resolve();
let visibilityAt = performance.now();
let frameAt = -1; // the last frame callback that ran; -1 before the first
const graphicsContext = () => ({
  visibility: document.visibilityState,
  sinceVisibilityMs: Math.round(performance.now() - visibilityAt),
  // A visibility event long after the last frame, while it never went hidden: the page stopped, not the tab.
  sinceFrameMs: frameAt < 0 ? -1 : Math.round(performance.now() - frameAt),
  stopped: graphicsStopped,
  calls: renderer.info.render.calls,
  drawCalls: renderer.info.render.drawCalls,
  triangles: renderer.info.render.triangles,
  failedDraws,
});
document.addEventListener('visibilitychange', () => {
  playMark('graphics visibility', graphicsContext());
  visibilityAt = performance.now();
  failedDraws = 0;
  gpuCheckGeneration++;
});

function stopGraphics(cause: string, message: string) {
  if (graphicsStopped) return;
  playMark('graphics stopped', { cause, message: message.slice(0, 2000), ...graphicsContext() });
  graphicsStopped = true;
  lobbyNote('The graphics stopped. Reload to keep playing in this room.');
  splashDone(true);
  document.exitPointerLock?.();
  const enter = document.getElementById('enter') as HTMLButtonElement | null;
  if (enter) {
    enter.textContent = 'Reload';
    enter.disabled = false;
    enter.type = 'button';
    enter.addEventListener('click', () => {
      playMark('graphics reload', graphicsContext());
      location.reload();
    });
  }
}

// Catch the entire callback: water compute can throw before the final draw. No timer/second frame loop.
export const guardGraphicsFrame = (frame: (now: number) => void) => (now: number) => {
  if (graphicsStopped || document.hidden) return;
  frameAt = performance.now();
  // Scopes only after an uncaptured error. Include compute before the draw, and fence submitted work without
  // awaiting it in the game loop. Bound in-flight checks; an unchecked draw invalidates the streak, never proves failure.
  const device =
    checkGpuFrames && gpuChecks < MAX_GPU_CHECKS ? (renderer.backend as unknown as { device: GPUDevice }).device : null;
  const calls = renderer.info.render.calls;
  const version = gpuErrorVersion;
  const generation = gpuCheckGeneration;
  if (device) {
    device.pushErrorScope('validation');
    device.pushErrorScope('internal');
    device.pushErrorScope('out-of-memory');
  }
  try {
    frame(now);
  } catch (error) {
    stopGraphics('frame-error', error instanceof Error ? error.message : String(error));
    console.error('[graphics] frame failed:', error);
  } finally {
    const drew = renderer.info.render.calls > calls;
    if (device) {
      const result = Promise.all([
        device.popErrorScope(),
        device.popErrorScope(),
        device.popErrorScope(),
        device.queue.onSubmittedWorkDone(),
      ]).then(
        (values) => ({ errors: values.slice(0, 3) as (GPUError | null)[] }),
        (error: unknown) => ({ unavailable: String(error) }),
      );
      gpuChecks++;
      // Process in submission order even if GPU promises settle out of order. No more than MAX_GPU_CHECKS are queued.
      gpuChecksDone = gpuChecksDone.then(async () => {
        const checked = await result;
        gpuChecks--;
        if (graphicsStopped) return;
        if ('unavailable' in checked) {
          failedDraws = 0;
          gpuCheckGeneration++;
          playMark('graphics check unavailable', { message: checked.unavailable.slice(0, 2000) });
          return; // an unavailable check is not a GPU failure
        }
        const errors = checked.errors.filter((e): e is GPUError => e !== null);
        for (const error of errors)
          recordGpuError({ api: 'WebGPU', type: error.constructor.name, message: error.message });
        if (generation !== gpuCheckGeneration || !drew) return;
        if (errors.length) {
          checkGpuFrames = true;
          if (++failedDraws >= FAILED_DRAW_LIMIT) stopGraphics('persistent-gpu-error', errors[0]!.message);
        } else {
          const recoveredAfter = failedDraws;
          failedDraws = 0;
          if (version === gpuErrorVersion && checkGpuFrames) {
            checkGpuFrames = false;
            playMark('graphics recovered', { recoveredAfter, ...graphicsContext() });
          }
        }
      });
    } else if (drew && (checkGpuFrames || gpuChecks > 0)) {
      failedDraws = 0;
      gpuCheckGeneration++;
    }
  }
};

export function graphicsFailed() {
  bootMark('graphics-failed');
  lobbyNote(
    'gpu' in navigator
      ? "This device's graphics can't start WebGPU, which Boogle needs to draw the island."
      : 'Boogle needs WebGPU: open it in Chrome, Edge or Safari 26 (iPhone, iPad and Mac), or Firefox on Windows or a Mac.',
  );
  const enter = document.getElementById('enter') as HTMLButtonElement | null;
  if (enter) {
    enter.textContent = "Can't draw the island";
    enter.disabled = true;
  }
}

bootMark('graphics-start');
const initializeRenderer = async () => {
  if (import.meta.env.DEV && params.get('gpuProfile') === 'portable')
    await (await import('./portable-device.ts')).installPortableDevice(renderer);
  return renderer.init();
};
export const rendererReady = initializeRenderer().then(
  (r) => {
    started = true;
    // three ignores deliberate destruction. Observe it too so a forced loss exercises the real recovery path.
    const device = (renderer.backend as unknown as { device: GPUDevice }).device;
    void device.lost.then((info) => {
      if (info.reason === 'destroyed')
        renderer.onDeviceLost({ api: 'WebGPU', reason: info.reason, message: info.message, originalEvent: info });
    });
    return r;
  },
  (e) => {
    graphicsFailed();
    throw e;
  },
);

// Preserve three's lost-device guard; replacing it used to leave compute/render using the dead device.
const reportDeviceLost = renderer.onDeviceLost.bind(renderer);
renderer.onDeviceLost = (info) => {
  playMark('graphics device lost', { reason: info.reason, message: info.message.slice(0, 2000), ...graphicsContext() });
  reportDeviceLost(info);
  stopGraphics('device-lost', info.message);
};

export { scene };
scene.fog = new THREE.Fog(FOG_HEX, FOG_NEAR, FOG_FAR);
export const camera = new THREE.PerspectiveCamera(62, 1, 0.1, CAMERA_FAR);

// Scene -> linear HDR target (MSAA from the renderer) -> one output pass (tone map + sRGB). Post effects (bloom,
// TRAA, GTAO...) extend this chain: set pipeline.outputNode from scenePass and pipeline.needsUpdate = true.
// The 4x MSAA samples are stored as usual. Discarding them (storeMultisampled*Buffer: false, docs/research/
// webgpu-on-ipad.md rec 2) blanked the whole scene on iPad Safari 27, the first Safari with TRANSIENT_ATTACHMENT
// (1 Nov 2026): only the clear colour showed. Re-enable only after it's verified on a Safari 27 device.
// The colour space is the one three's compileAsync target has. It changes nothing in the image (both are linear), but it
// is in the pipeline cache key: left unset, every pipeline the warm-up built was built again by the first frame.
export const scenePass = pass(scene, camera, { colorSpace: THREE.LinearSRGBColorSpace });
clampTargetSize(scenePass.renderTarget); // a lower resolution scale must not floor a tiny canvas to 0x0
export const pipeline = new THREE.RenderPipeline(renderer, scenePass);
export const renderFrame = () => pipeline.render();
installQuality(renderer, scenePass);
registerGraphics({
  id: 'msaa',
  label: 'Scene MSAA',
  choices: [true, false],
  default: msaaDefault,
  applyMode: 'reload',
  cost: 'multisample rendering',
  skips: 'Off uses one scene sample instead of four; caustics MSAA is independent.',
  hitch:
    'Reload builds sample-count pipelines behind loading. Live sample changes invalidate cached depth copies and bind groups.',
  available: () => (msaa && renderer.samples === 0 ? 'This backend does not provide multisampling.' : null),
  read: () => renderer.samples > 0,
  apply: () => {}, // Reload-only: never mutate a live attachment's sample count.
});

// The canvas's CSS box, in CSS pixels: the window, except in the Home Screen app, where src/boot/app-fill.ts may make it
// taller than innerHeight to reach the bottom of the screen. The drawing buffer and the camera follow the box.
// Never under 1x1 (./drawable-size.ts): a page opened with no size yet (a hidden pane, a 0x0 container) gets one later.
export const view = { w: Math.max(1, innerWidth), h: Math.max(1, innerHeight) };
let drawableNow: () => void;
let sized = false, // the canvas has had an area
  waitedForSize = false;
/** Resolves once the canvas first has an area. The first scene frame (the shader warm-up's) waits for it, so no screen
 * target is first built for a page that has no size yet; a later 0x0 only clamps (the ResizeObserver below). */
export const drawable = new Promise<void>((resolve) => (drawableNow = resolve));
function resize() {
  const box = drawableBox(canvas.clientWidth, canvas.clientHeight, innerWidth, innerHeight);
  if (box && !sized) {
    sized = true;
    if (waitedForSize) bootMark('drawable'); // a hidden first load: when it got a size
    drawableNow();
  } else if (!box && !sized) waitedForSize = true;
  view.w = box?.w ?? 1;
  view.h = box?.h ?? 1;
  renderer.setSize(view.w, view.h, false);
  camera.aspect = view.w / view.h;
  camera.updateProjectionMatrix();
  markSize();
}
// The canvas against the window, the visual viewport and the screen, in the play data whenever one changes (24 at
// most): the 9 November iPhone showed a pale band below a canvas 844 px tall on a 912 px screen, and a 420x420 window
// mid-rotation. CSS pixels, but buffer width and height in device pixels.
let sizeMarks = 0,
  lastSize = '';
function markSize() {
  const vv = visualViewport;
  const size = {
    cssW: view.w,
    cssH: view.h,
    innerW: innerWidth,
    innerH: innerHeight,
    vvW: Math.round(vv?.width ?? 0),
    vvH: Math.round(vv?.height ?? 0),
    vvTop: Math.round(vv?.offsetTop ?? 0),
    screenW: screen.width,
    screenH: screen.height,
    bufW: canvas.width,
    bufH: canvas.height,
    standalone: (navigator as Navigator & { standalone?: boolean }).standalone === true,
  };
  const key = Object.values(size).join(' ');
  if (key === lastSize || sizeMarks >= 24) return;
  lastSize = key;
  sizeMarks++;
  playMark('canvas size', size);
}
addEventListener('resize', resize);
new ResizeObserver(resize).observe(canvas);
resize();

// Where world point v lands on a w x h screen, in pixels (y down): out.x, out.y, and out.behind when it is behind the
// camera (x and y then come out mirrored through the centre). Uses the camera's matrices as they are. Returns out.
const ndc = new THREE.Vector3();
export function toScreen<T extends { x: number; y: number; behind?: boolean }>(
  v: THREE.Vector3,
  out: T,
  w = view.w,
  h = view.h,
): T & { behind: boolean } {
  ndc.copy(v).project(camera);
  out.x = (ndc.x * 0.5 + 0.5) * w;
  out.y = (-ndc.y * 0.5 + 0.5) * h;
  out.behind = ndc.z > 1;
  return out as T & { behind: boolean };
}

/** The scene's one sky/ground fill light. */
export const hemi = new THREE.HemisphereLight('#d4f0ff', '#e6d3a0', 1.2);
scene.add(hemi);
export const sun = new THREE.DirectionalLight('#fff0d0', 2.5);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(isTouch ? 1024 : 2048); // phones: a quarter of the shadow fill cost
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 180 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
registerGraphics({
  id: 'shadows',
  label: 'Sun shadows',
  choices: [true, false],
  default: true,
  applyMode: 'rebuild',
  cost: 'shadow rendering',
  skips: 'Removes sun shadow rendering and receiver shadow sampling; leaves sun light and day clock intact.',
  hitch: 'Changing the light shadow key builds material pipelines on first use.',
  read: () => sun.castShadow,
  apply: (value) => {
    sun.castShadow = value === true;
  },
});

// Placeholder dome, hidden once the frozen summer sky (src/render/water/frozen-sky.ts) is ready. The sky entity puts it
// in the scene (src/features/sky.ts): entity.ts imports this file, so this file can't spawn.
export const sky = new THREE.Mesh(
  new THREE.SphereGeometry(700, 32, 16),
  new THREE.MeshBasicMaterial({ color: FOG_HEX, side: THREE.BackSide, depthWrite: false, fog: false }),
);
sky.renderOrder = -1;
