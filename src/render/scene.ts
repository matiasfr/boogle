import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { FOG_HEX, FOG_NEAR, FOG_FAR, isTouch } from '../constants.ts';

export const canvas = document.getElementById('view') as HTMLCanvasElement; // in index.html

// WebGPU only: no WebGL 2 fallback, so every feature may use compute, storage buffers and the rest of WebGPU without a
// second path (src/render/README.md). A browser without WebGPU gets a note in the lobby instead of the island.
// render() throws until init() resolves, so main.ts starts the game from rendererReady.
const params = new URLSearchParams(location.search);
export const renderer = new THREE.WebGPURenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  trackTimestamp: Number(params.get('prof')) > 0, // GPU ms per frame in the ?prof=1 overlay (src/debug/prof-overlay.ts)
});
(renderer as unknown as { _getFallback: null })._getFallback = null; // three would quietly swap in its WebGL 2 backend when WebGPU can't start; fail instead
export const MAX_DPR = Math.min(devicePixelRatio, 2); // features/adaptive-res.ts scales the ratio below this
export const FIXED_DPR = params.get('dpr') === 'fixed'; // ?dpr=fixed keeps the full ratio (stills, clips, perf runs)
renderer.setPixelRatio(MAX_DPR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
// Neutral, not AgX: AgX greyed the toy palette (sea, sky and grass lost their saturation).
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0; // the one base exposure; sky.ts eases it up at night (eyes adapting), lights stay physical
renderer.outputColorSpace = THREE.SRGBColorSpace;

const lobbyNote = (text: string) => {
  const sub = document.getElementById('lobby-sub');
  if (sub) sub.textContent = text;
  document.getElementById('lobby')?.removeAttribute('hidden'); // a returning visit hides the card (src/player/hud.ts)
};
// The backend three is drawing with: 'webgpu' once rendererReady resolves, null before (telemetry, the harness).
let started = false;
export const gfx = () => (started ? 'webgpu' : null);

export const rendererReady = renderer.init().then(
  (r) => {
    started = true;
    return r;
  },
  (e) => {
    lobbyNote(
      'gpu' in navigator
        ? "This device's graphics can't start WebGPU, which Boogle needs to draw the island."
        : 'Boogle needs WebGPU: open it in Chrome, Edge or Safari 26 (iPhone, iPad and Mac), or Firefox on Windows or a Mac.',
    );
    const enter = document.getElementById('enter');
    if (enter) enter.textContent = "Can't draw the island";
    throw e;
  },
);

// A lost device is not recovered by three: reload once the tab is visible, at most once a minute.
renderer.onDeviceLost = (info) => {
  console.error(`THREE.WebGPURenderer: device lost: ${info?.message ?? ''}`);
  const reload = () => {
    let last = 0;
    try {
      last = Number(sessionStorage.getItem('boogle.gfxReload')) || 0;
    } catch {
      /* private mode: reload anyway, the minute guard is best effort */
    }
    if (Date.now() - last < 60000) return lobbyNote('The graphics device was reset. Reload to keep playing.');
    try {
      sessionStorage.setItem('boogle.gfxReload', String(Date.now()));
    } catch {
      /* ignore */
    }
    location.reload();
  };
  if (document.visibilityState === 'visible') reload();
  else
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reload(), {
      once: true,
    });
};

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_HEX, FOG_NEAR, FOG_FAR);
export const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1500);

// Scene -> linear HDR target (MSAA from the renderer) -> one output pass (tone map + sRGB). Post effects (bloom,
// TRAA, GTAO...) extend this chain: set pipeline.outputNode from scenePass and pipeline.needsUpdate = true.
// The 4x MSAA samples are stored as usual. Discarding them (storeMultisampled*Buffer: false, docs/research/
// webgpu-on-ipad.md rec 2) blanked the whole scene on iPad Safari 27, the first Safari with TRANSIENT_ATTACHMENT
// (1 Nov 2026): only the clear colour showed. Re-enable only after it's verified on a Safari 27 device.
export const scenePass = pass(scene, camera);
export const pipeline = new THREE.RenderPipeline(renderer, scenePass);
export const renderFrame = () => pipeline.render();

// The canvas's CSS box, in CSS pixels: the window, except in the Home Screen app, where src/boot/app-fill.ts may make it
// taller than innerHeight to reach the bottom of the screen. The drawing buffer and the camera follow the box.
export const view = { w: innerWidth, h: innerHeight };
function resize() {
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  view.w = w > 1 ? w : innerWidth;
  view.h = h > 1 ? h : innerHeight;
  renderer.setSize(view.w, view.h, false);
  camera.aspect = view.w / Math.max(1, view.h);
  camera.updateProjectionMatrix();
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

scene.add(new THREE.HemisphereLight('#d4f0ff', '#e6d3a0', 1.2));
export const sun = new THREE.DirectionalLight('#fff0d0', 2.5);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(isTouch ? 1024 : 2048); // phones: a quarter of the shadow fill cost
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 180 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// Placeholder until createSky (src/render/sky.ts) swaps in the real dome.
export const sky = new THREE.Mesh(
  new THREE.SphereGeometry(700, 32, 16),
  new THREE.MeshBasicMaterial({ color: FOG_HEX, side: THREE.BackSide, depthWrite: false, fog: false }),
);
sky.renderOrder = -1;
scene.add(sky);
