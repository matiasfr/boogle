// The look lab (?proto=look; loaded by src/features/proto-look.ts; write-up: docs/proposals/visual-target.md). A panel
// of render layers you can switch one by one, and presets that are sets of them. Nothing here changes the default
// look: without the flag this module never loads.
//   ?proto=look&look=high          start on a preset (today, mid, ipad, high, toon, diorama, toybox, miniature, ultra)
//   ?proto=look&look=mid&fx=ao,-bloom   then add or remove layers
//   &era=steam                     start on the second palette row (Y toggles it, and the panel's Steam era button)
// window.boogle.lookLab: { layers, presets, set(ids), preset(name), on(), bench({ batch, reps, dpr }) } for the harness
// (dev/scenarios/look-lab.ts). bench() measures the cost of a frame by rendering batches back to back (see below).
import './look-lab.css';
import { onFrame } from '../loop.ts';
import { Vector2 } from 'three/webgpu';
import { renderer, renderFrame, MAX_DPR } from '../render/scene.ts';
import { buildPost, updatePostUniforms, postU, type PostFlags } from './look-post.ts';
import {
  setFog,
  setShadows,
  setDetail,
  setSway,
  setToon,
  setGrass,
  setRim,
  updateGrass,
  updateRim,
  updateEra,
  era,
  worldU,
} from './look-world.ts';

type Layer = { id: string; label: string; what: string };
export const LAYERS: Layer[] = [
  { id: 'haze', label: 'Haze', what: 'aerial perspective: height fog that blues the distance, sun-side glow' },
  {
    id: 'skyfog',
    label: 'Sky fog',
    what: 'fog in the sky dome colour along the view, low layer over water (wins over haze)',
  },
  { id: 'soft', label: 'Soft shadows', what: '4096 sun map, wider filter' },
  { id: 'csm', label: 'Cascaded shadows', what: 'three cascades to 160 m (today: 36 m); reloads the page' },
  { id: 'detail', label: 'Material detail', what: 'TSL noise on grass, sand and rock' },
  { id: 'sway', label: 'Leaf sway', what: 'fronds and crowns move in the wind (vertex)' },
  { id: 'grass', label: 'Grass field', what: '80k instanced blades around the camera, wind' },
  { id: 'ao', label: 'Ambient occlusion', what: 'GTAO, half resolution' },
  { id: 'ssgi', label: 'SSGI', what: 'screen-space GI + AO (forces TRAA)' },
  { id: 'taa', label: 'TRAA', what: 'temporal AA in place of 4x MSAA' },
  { id: 'bloom', label: 'Bloom', what: 'soft glow on the brightest highlights' },
  { id: 'grade', label: 'Grade', what: 'saturation, warm/cool split, S-curve, vignette' },
  { id: 'outline', label: 'Ink outlines', what: 'depth + normal edges, fade with distance' },
  { id: 'softline', label: 'Soft outlines', what: 'silhouettes in a darker shade of their own colour, gone by 45 m' },
  { id: 'toon', label: 'Toon shading', what: 'four-step grey light ramp on every lit material' },
  { id: 'paint', label: 'Painted light', what: 'three-step ramp, violet shade, warm light, static decor only' },
  { id: 'rim', label: 'Rim + wrap', what: 'toy rim light and lifted shade on players, ball, Boogler' },
  { id: 'plastic', label: 'Soft plastic', what: 'roughness 0.5 at most on things that move' },
  { id: 'tilt', label: 'Tilt-shift', what: 'miniature blur above and below the focus band' },
];
const MID = ['haze', 'soft', 'detail', 'sway', 'bloom', 'grade'];
export const PRESETS: Record<string, string[]> = {
  today: [],
  mid: MID,
  high: [...MID, 'csm', 'grass', 'ao', 'taa'],
  toon: ['haze', 'soft', 'detail', 'sway', 'grade', 'outline', 'toon'], // no grass: thin blades ink into scribble
  // bang-for-buck-aesthetics.md: A, the painted diorama (with B's rim on characters), and B, the toy box
  diorama: ['skyfog', 'soft', 'detail', 'sway', 'paint', 'softline', 'rim', 'grade'],
  toybox: ['haze', 'soft', 'detail', 'sway', 'rim', 'plastic', 'ao', 'grade'],
  miniature: [...MID, 'ao', 'tilt'], // tilt-shift photo mode
  ultra: [...MID, 'csm', 'grass', 'ssgi', 'taa'],
  // the recommended M4 iPad Pro target (docs/proposals/visual-target.md): mid plus grass, minus bloom (nothing in
  // daylight is bright enough to bloom; it earns its 0.8 ms only once night lanterns glow)
  ipad: ['haze', 'soft', 'detail', 'sway', 'grass', 'grade'],
};

const on = new Set<string>();
let postKey = '';

// Cascades can only be chosen at load: three builds the sun's shadow node once, with the first program that uses
// it. Switching them later reloads the page with the layers in the URL.
let csmLive: boolean | null = null;
function reloadWith() {
  const q = new URLSearchParams(location.search);
  q.set('look', current in PRESETS ? current : 'today');
  if (current in PRESETS) q.delete('fx');
  else q.set('fx', [...on].join(','));
  location.search = q.toString();
}
function apply() {
  if (csmLive !== null && on.has('csm') !== csmLive) return reloadWith();
  csmLive = on.has('csm');
  setToon('off'); // put the originals back first, so the swap below copies their current patches
  setFog(on.has('skyfog') ? 'sky' : on.has('haze') ? 'haze' : 'none');
  setShadows(on.has('soft'), on.has('csm'));
  setDetail(on.has('detail'));
  setSway(on.has('sway'));
  setGrass(on.has('grass'));
  setRim(on.has('rim'), on.has('plastic'));
  setToon(on.has('toon') ? 'toon' : on.has('paint') ? 'paint' : 'off');
  const f: PostFlags = {
    ao: on.has('ao'),
    ssgi: on.has('ssgi'),
    taa: on.has('taa'),
    bloom: on.has('bloom'),
    outline: on.has('outline'),
    softline: on.has('softline'),
    grade: on.has('grade'),
    tilt: on.has('tilt'),
  };
  const key = JSON.stringify(f);
  if (key !== postKey) {
    postKey = key;
    buildPost(f);
  }
  syncPanel();
}

function set(ids: string[]) {
  on.clear();
  for (const id of ids) if (LAYERS.some((l) => l.id === id)) on.add(id);
  apply();
}
function preset(name: string) {
  current = PRESETS[name] ? name : 'custom';
  set(PRESETS[name] ?? []);
}

// ---------------------------------------------------------------- frame cost (throughput)
// Renders `batch` frames back to back in one task (stepping three's node frame so every pass really redraws), waits
// for the GPU queue to drain, and divides: the cost of a frame with no vsync in the way, GPU-bound on any real scene.
// Median and spread of `reps` batches. (Timestamp queries were tried first: on Apple GPUs passes overlap, so summing
// per-pass spans counts the same time several times over; a many-pass effect like bloom read 50 ms.)
type Internals = {
  _nodes: { nodeFrame: { update(): void } };
  backend: { device: { queue: { onSubmittedWorkDone(): Promise<void> } } };
};
async function bench({ batch = 20, reps = 7, dpr = 0 } = {}) {
  const r = renderer as unknown as Internals;
  const queue = r.backend.device.queue;
  const prevDpr = renderer.getPixelRatio();
  if (dpr) renderer.setPixelRatio(dpr); // the bench's own resolution (2 for the iPad's 2x); put back below
  const frame = () => new Promise((res) => requestAnimationFrame(res));
  for (let k = 0; k < 15; k++) await frame(); // settle after the resize and any pipeline builds
  const calls = renderer.info.render.drawCalls,
    tris = renderer.info.render.triangles;
  const draw = () => {
    r._nodes.nodeFrame.update();
    renderFrame();
  };
  draw();
  await queue.onSubmittedWorkDone();
  const ms: number[] = [],
    cpu: number[] = [];
  for (let k = 0; k < reps; k++) {
    await frame();
    const t0 = performance.now();
    for (let i = 0; i < batch; i++) draw();
    cpu.push((performance.now() - t0) / batch);
    await queue.onSubmittedWorkDone();
    ms.push((performance.now() - t0) / batch);
  }
  const size = renderer.getDrawingBufferSize(new Vector2());
  if (dpr) renderer.setPixelRatio(prevDpr);
  ms.sort((x, y) => x - y);
  const fix = (v: number) => Math.round(v * 100) / 100;
  return {
    layers: [...on],
    ms: { median: fix(ms[Math.floor(ms.length / 2)]), min: fix(ms[0]), max: fix(ms[ms.length - 1]) },
    cpuMs: fix(cpu.sort((x, y) => x - y)[Math.floor(cpu.length / 2)]), // encoding alone; ms near this means CPU-bound
    calls,
    tris,
    px: `${size.x}x${size.y}`,
  };
}

// ---------------------------------------------------------------- panel
let current = 'today';
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const panel = el('aside', 'look-lab open');
const head = el('button', 'll-head', 'Look lab');
head.type = 'button';
head.onclick = () => panel.classList.toggle('open');
const body = el('div', 'll-body');
const presetRow = el('div', 'll-presets');
for (const name of Object.keys(PRESETS)) {
  const b = el('button', 'll-preset', name);
  b.type = 'button';
  b.dataset.preset = name;
  b.onclick = () => preset(name);
  presetRow.append(b);
}
const list = el('div', 'll-list');
const boxes = new Map<string, HTMLInputElement>();
for (const l of LAYERS) {
  const row = el('label', 'll-row');
  const box = el('input');
  box.type = 'checkbox';
  box.onchange = () => {
    if (box.checked) on.add(l.id);
    else on.delete(l.id);
    current = 'custom';
    apply();
  };
  boxes.set(l.id, box);
  const txt = el('span', '', l.label);
  txt.title = l.what;
  row.append(box, txt);
  list.append(row);
}
const stat = el('div', 'll-stat', '');
const benchBtn = el('button', 'll-preset', 'Measure frame');
benchBtn.type = 'button';
benchBtn.onclick = async () => {
  stat.textContent = 'measuring...';
  const r = await bench();
  stat.textContent = r
    ? `${r.ms.median} ms a frame (${r.ms.min}-${r.ms.max}) at ${r.px}, ${r.calls} calls`
    : 'no result';
};
body.append(presetRow, list, benchBtn, stat);
panel.append(head, body);
document.body.append(panel);
function syncPanel() {
  for (const [id, b] of boxes) b.checked = on.has(id);
  for (const b of presetRow.querySelectorAll<HTMLButtonElement>('.ll-preset'))
    b.classList.toggle('on', b.dataset.preset === current);
}

// ---------------------------------------------------------------- start from the URL, per-frame upkeep
const params = new URLSearchParams(location.search);
{
  const look = params.get('look') ?? 'today';
  const ids = new Set(PRESETS[look] ?? []);
  current = PRESETS[look] ? look : 'custom';
  const fx = params.get('fx');
  for (const t of fx ? fx.split(',') : []) {
    if (t.startsWith('-')) ids.delete(t.slice(1));
    else if (t) ids.add(t);
    current = 'custom';
  }
  set([...ids]);
}
if (params.has('lookpanel') && params.get('lookpanel') === '0') panel.remove();

function toggleEra() {
  era.target = era.target ? 0 : 1;
  eraBtn.classList.toggle('on', !!era.target);
}
const eraBtn = el('button', 'll-preset', 'Steam era (Y)');
eraBtn.type = 'button';
eraBtn.onclick = toggleEra;
body.insertBefore(eraBtn, benchBtn);
addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement | null;
  if (e.code !== 'KeyY' || e.repeat || t?.closest('input, textarea, [contenteditable]')) return;
  toggleEra();
});
if (params.get('era') === 'steam') {
  toggleEra();
  era.mix = 1;
}

onFrame(
  ({ dt }) => {
    updateEra(dt);
    postU.eraDesat.value = era.mix * 0.45;
    updateRim(dt);
    updatePostUniforms();
    if (on.has('grass')) updateGrass();
  },
  { phase: 'late', order: 2900, name: 'look-lab' },
);

window.boogle.lookLab = {
  layers: LAYERS,
  presets: PRESETS,
  set,
  preset,
  on: () => [...on],
  bench,
  era,
  postU,
  worldU,
  maxDpr: MAX_DPR,
};
