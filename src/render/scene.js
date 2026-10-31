import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { FOG_HEX, FOG_NEAR, FOG_FAR, isTouch } from '../constants.js';

export const canvas = document.getElementById('view');

// WebGPU only: no WebGL 2 fallback, so every feature may use compute, storage buffers and the rest of WebGPU without a
// second path (src/render/README.md). A browser without WebGPU gets a note in the lobby instead of the island.
// render() throws until init() resolves, so main.js starts the game from rendererReady.
const params = new URLSearchParams(location.search);
export const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer._getFallback = null; // three would quietly swap in its WebGL 2 backend when WebGPU can't start; fail instead
export const MAX_DPR = Math.min(devicePixelRatio, 2); // features/adaptive-res.js scales the ratio below this
export const FIXED_DPR = params.get('dpr') === 'fixed'; // ?dpr=fixed keeps the full ratio (stills, clips, perf runs)
renderer.setPixelRatio(MAX_DPR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
// Neutral, not AgX: AgX greyed the toy palette (sea, sky and grass lost their saturation).
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0; // the one base exposure; sky.js eases it up at night (eyes adapting), lights stay physical
renderer.outputColorSpace = THREE.SRGBColorSpace;

const lobbyNote = (text) => {
  const sub = document.getElementById('lobby-sub');
  if (sub) sub.textContent = text;
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
      navigator.gpu
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
export const scenePass = pass(scene, camera);
export const pipeline = new THREE.RenderPipeline(renderer, scenePass);
export const renderFrame = () => pipeline.render();

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / Math.max(1, innerHeight);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// Where world point v lands on a w x h screen, in pixels (y down): out.x, out.y, and out.behind when it is behind the
// camera (x and y then come out mirrored through the centre). Uses the camera's matrices as they are. Returns out.
const ndc = new THREE.Vector3();
export function toScreen(v, out, w = innerWidth, h = innerHeight) {
  ndc.copy(v).project(camera);
  out.x = (ndc.x * 0.5 + 0.5) * w;
  out.y = (-ndc.y * 0.5 + 0.5) * h;
  out.behind = ndc.z > 1;
  return out;
}

scene.add(new THREE.HemisphereLight('#d4f0ff', '#e6d3a0', 1.2));
export const sun = new THREE.DirectionalLight('#fff0d0', 2.5);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(isTouch ? 1024 : 2048); // phones: a quarter of the shadow fill cost
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 180 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// Placeholder until createSky (src/render/sky.js) swaps in the real dome.
export const sky = new THREE.Mesh(
  new THREE.SphereGeometry(700, 32, 16),
  new THREE.MeshBasicMaterial({ color: FOG_HEX, side: THREE.BackSide, depthWrite: false, fog: false }),
);
sky.renderOrder = -1;
scene.add(sky);
