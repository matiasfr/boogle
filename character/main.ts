// The isolated asset stage: only explicit loaders and preview functions; no island, room or game features.
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAssetLoader, type Asset } from '../src/render/asset-loader.ts';
import { catalogue, catalogueTotals, catalogueScope } from './catalogue.ts';
import { prepareBuddy, SAMPLE_FPS, type BuddyMode } from './buddy-preview.ts';
import { createStageLighting, type LightPreset } from './lighting.ts';
import { inspectAsset, formatBytes, cloneMaterials } from './inspect.ts';
import { createBrowser } from './browser.ts';
import { createThumbnails } from './thumbnails.ts';
import { background } from '../src/async.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);
const select = (id: string) => $<HTMLSelectElement>(id);
const q = new URLSearchParams(location.search);
const number = (key: string, fallback: number) => {
  const n = Number(q.get(key));
  return q.has(key) && Number.isFinite(n) ? n : fallback;
};
const state = {
  asset: q.get('asset') ?? 'buddy',
  node: q.get('node') ?? '',
  clip: q.get('clip') ?? '',
  mode: (q.get('mode') === 'played' || (!q.has('mode') && q.has('pose')) ? 'played' : 'raw') as BuddyMode,
  pose: q.get('pose') ?? 'free',
  hat: q.get('hat') ?? '',
  time: Math.max(0, number('t', number('hop', 0))),
  speed: Math.max(0.05, Math.min(4, number('speed', 1))),
  playing: q.get('play') === '1' || !q.has('t'),
  loop: q.get('loop') !== '0',
  light: (q.get('light') === 'shipped' ? 'shipped' : 'studio') as LightPreset,
  exposure: Math.max(0.01, Math.min(4, number('exposure', q.get('light') === 'shipped' ? 0.16 : 1))),
};
const canvas = $<HTMLCanvasElement>('view');
const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
(renderer as unknown as { _getFallback: null })._getFallback = null;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
await renderer.init();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
const lighting = await createStageLighting(renderer, scene, camera);
const loader = createAssetLoader(renderer);
const stage = new THREE.Group();
stage.rotation.y = number('yaw', 0);
scene.add(stage);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100).rotateX(-Math.PI / 2),
  new THREE.MeshStandardNodeMaterial({ color: '#b9bdc1', roughness: 1 }),
);
floor.receiveShadow = true;
floor.position.y = -0.005;
scene.add(floor);
const grid = new THREE.GridHelper(40, 40, '#677985', '#969fa6');
grid.position.y = 0.001;
scene.add(grid);
const bounds = new THREE.Box3Helper(new THREE.Box3(), '#d78a16');
scene.add(bounds);
const helpers = new THREE.Group();
stage.add(helpers);
const assetsById = new Map(catalogue.map((entry) => [entry.id, entry]));
const load = async (id: string) => {
  const entry = assetsById.get(id);
  if (entry?.sourceKind !== 'built' || !entry.url) throw new Error('No built output for ' + id);
  return loader.load(entry.url);
};
const [buddyAsset, clipAsset] = await Promise.all([load('buddy'), load('hero-clips')]);
const buddy = prepareBuddy(buddyAsset, clipAsset);
const reference = buddy.create('raw', 'Idle_Loop', 'free', '');
reference.seek(0.4);
stage.add(reference.group);
const crowd: ReturnType<typeof buddy.create>[] = [];
type Preview = {
  group: THREE.Group;
  figure: THREE.Object3D;
  seek(t: number): void;
  advance(dt: number): void;
  dispose(): void;
  sockets?: { back: THREE.Object3D; hand: THREE.Object3D };
};
let preview: Preview | undefined, currentAsset: Asset | undefined;
let duration = 0,
  generation = 0,
  ready = false,
  frames = 0;
let skeleton: THREE.SkeletonHelper | undefined, trajectory: THREE.Line | undefined;
let socketHelpers: THREE.AxesHelper[] = [];
const selectionBox = new THREE.Box3();
const options = (element: HTMLSelectElement, entries: [string, string][]) => {
  element.replaceChildren(
    ...entries.map(([value, label]) => {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = label;
      return o;
    }),
  );
};
const selectedId = () => catalogue.find((e) => e.assetId === state.asset && e.node === state.node)?.id ?? state.asset;
async function selectEntry(id: string) {
  const entry = assetsById.get(id);
  if (!entry) throw new Error('Unknown catalogue entry: ' + id);
  state.asset = entry.assetId;
  state.node = entry.node;
  state.clip = '';
  state.time = 0;
  await choose();
  history.replaceState(null, '', input('link').value);
}
const thumbnails = createThumbnails(renderer, async (entry) => {
  if (entry.sourceKind === 'code') return (await import('./code-preview.ts')).codePreview(entry.codeId);
  if (entry.id === 'buddy') {
    const pose = buddy.create('raw', 'Idle_Loop', 'free', '');
    pose.seek(0.4);
    return pose;
  }
  const asset = await load(entry.assetId);
  return { group: asset.instance(entry.node || undefined), dispose() {} };
});
const browser = createBrowser(selectEntry, thumbnails.get);
function generic(asset: Asset): Preview {
  const group = asset.instance(state.node || undefined),
    own = cloneMaterials(group);
  const mixer = new THREE.AnimationMixer(group);
  const clip = state.clip ? asset.clip(state.clip, state.node || undefined) : undefined;
  const action = clip ? mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1).play() : undefined;
  if (action) action.clampWhenFinished = true;
  let time = 0;
  const seek = (t: number) => {
    time = t;
    if (action) {
      action.enabled = true;
      action.paused = false;
      action.time = Math.min(t, clip!.duration);
      mixer.update(0);
    }
    group.updateMatrixWorld(true);
  };
  seek(0);
  return {
    group,
    figure: group,
    seek,
    advance: (dt) => seek(time + dt),
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(group);
      own.dispose();
    },
  };
}
function clearHelpers() {
  if (skeleton) {
    skeleton.removeFromParent();
    skeleton.dispose();
    skeleton = undefined;
  }
  if (trajectory) {
    trajectory.removeFromParent();
    trajectory.geometry.dispose();
    (trajectory.material as THREE.Material).dispose();
    trajectory = undefined;
  }
  for (const axes of socketHelpers) {
    axes.removeFromParent();
    axes.dispose();
  }
  socketHelpers = [];
}
function overlays() {
  clearHelpers();
  if (!preview) return;
  preview.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh)
      for (const material of Array.isArray(m.material) ? m.material : [m.material])
        if ('wireframe' in material) material.wireframe = input('wire').checked;
  });
  if (input('bones').checked || state.asset === 'hero-clips') {
    skeleton = new THREE.SkeletonHelper(preview.figure);
    (skeleton.material as THREE.LineBasicMaterial).depthTest = false;
    skeleton.renderOrder = 20;
    helpers.add(skeleton);
  }
  if (input('sockets').checked && preview.sockets)
    for (const [name, socket] of Object.entries(preview.sockets)) {
      const axes = new THREE.AxesHelper(0.25);
      axes.name = name + ' socket';
      socket.add(axes);
      socketHelpers.push(axes);
    }
  const clip =
    state.asset === 'buddy'
      ? buddy.clips.get(state.clip)
      : currentAsset?.gltf.animations.find((c) => c.name === state.clip);
  const tracks = clip?.tracks.filter((track) => track.name.endsWith('.position')) ?? [];
  const track =
    tracks.find((t) => t.name === state.node + '.position') ??
    tracks.find((t) => /pelvis|root/i.test(t.name)) ??
    tracks[0];
  if (input('trajectory').checked && track) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < track.values.length; i += 3)
      points.push(new THREE.Vector3(track.values[i], track.values[i + 1], track.values[i + 2]));
    trajectory = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: '#b54280', depthTest: false }),
    );
    trajectory.renderOrder = 21;
    helpers.add(trajectory);
  }
  $('root-note').textContent =
    assetsById.get(state.asset)?.rootNote ??
    (track ? `Authored local trajectory: ${track.name}. No camera motion included.` : 'No authored position track.');
  bounds.visible = input('bounds').checked;
  reference.group.visible = input('reference').checked;
  for (const item of crowd) item.group.visible = input('crowd').checked;
}
function measure() {
  if (!preview) return;
  preview.group.updateMatrixWorld(true);
  selectionBox.makeEmpty();
  preview.group.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) selectionBox.expandByObject(object, true);
  });
  if (selectionBox.isEmpty()) selectionBox.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 2, 0.5));
  bounds.box.copy(selectionBox);
  const size = selectionBox.getSize(new THREE.Vector3());
  $('dimensions').textContent = `${size.x.toFixed(3)} × ${size.y.toFixed(3)} × ${size.z.toFixed(3)} m · 1 m grid`;
}
function stats() {
  if (!preview) return;
  const e = assetsById.get(state.asset)!,
    s = inspectAsset(preview.figure);
  const build =
    e.sourceKind === 'built'
      ? `${formatBytes(e.health.bytes)} GLB / ${e.health.budgetKB} KB budget\nsource hash ${e.health.sourceHash}\noutput hash ${e.health.outHash}`
      : 'Live code · no build/download budget';
  $('stats').textContent =
    `${s.triangles.toLocaleString()} triangles · ${s.vertices.toLocaleString()} vertices\n${s.materialSlots} material slots · ${s.geometries} geometries\n${build}\n${formatBytes(s.estimatedBytes)} estimated GPU memory\n${formatBytes(s.geometryBytes)} geometry + ${formatBytes(s.textureBytes)} textures\n${s.textures.map((t) => `${t.name}: ${t.width}×${t.height}, ${t.format}, ${formatBytes(t.bytes)} estimated`).join('\n') || 'No textures'}\nsource ${e.source}\nTotal built catalogue ${formatBytes(catalogueTotals.bytes)} / ${catalogueTotals.budgetKB} KB`;
  const card = assetsById.get(selectedId());
  if (card) {
    card.triangles = s.triangles;
    browser.refresh(card.id);
  }
  $('selection-facts').textContent =
    `${s.triangles.toLocaleString()} triangles · ${e.animations.length} clips · ${e.sourceKind === 'code' ? 'in code' : 'built'}${e.flags.length ? ' · ⚠ ' + e.flags.join(' · ') : ''}`;
  $('health').textContent =
    [...e.flags, ...catalogueTotals.flags].join(' · ') ||
    (e.sourceKind === 'built'
      ? 'Fresh output · within budget · expected clips present'
      : 'Live code geometry · no authored clips or build budget');
  $('health').title = catalogueScope;
  $('memory-note').textContent =
    'Resident asset meshes include hidden wear parts. GPU bytes are estimates; exclude render targets, driver overhead and the rest of the stage.';
}
function view(name: string) {
  const frameBox = selectionBox.clone();
  if (input('reference').checked) frameBox.union(new THREE.Box3().setFromObject(reference.group));
  frameBox.min.y = Math.min(0, frameBox.min.y);
  const clip = currentAsset?.gltf.animations.find((item) => item.name === state.clip);
  const travel = clip?.tracks.find((track) => track.name === state.node + '.position');
  if (travel)
    for (let i = 1; i < travel.values.length; i += 3)
      frameBox.max.y = Math.max(frameBox.max.y, travel.values[i]! + 0.3);
  const centre = frameBox.getCenter(new THREE.Vector3());
  const size = frameBox.getSize(new THREE.Vector3());
  const dist = Math.max(3.6, size.length() * 1.35);
  const yaw =
    name === 'Side'
      ? Math.PI / 2
      : name === 'Back' || name === 'Game'
        ? Math.PI
        : name === 'Front' || name === 'Face'
          ? 0
          : 0.65;
  const close = name === 'Close' || name === 'Face';
  controls.target.set(centre.x, close ? 1.36 : Math.max(0.7, centre.y * 0.75), centre.z);
  const d = close ? 1.7 : name === 'Game' ? Math.max(6.5, dist) : dist;
  camera.fov = name === 'Game' ? 62 : 40;
  camera.position
    .copy(controls.target)
    .add(new THREE.Vector3(Math.sin(yaw) * d, close ? 0 : d * 0.28, Math.cos(yaw) * d));
  camera.updateProjectionMatrix();
  controls.update();
}
for (const name of ['Front', 'Three', 'Side', 'Back', 'Close', 'Face', 'Game']) {
  const b = document.createElement('button');
  b.textContent = name;
  b.onclick = () => {
    view(name);
    updateLink();
  };
  $('views').append(b);
}
function syncClock() {
  input('scrub').max = String(duration);
  input('scrub').value = String(state.time);
  input('time').max = String(duration);
  input('time').value = String(Number(state.time.toFixed(6)));
  $('play').textContent = state.playing ? 'Pause' : 'Play';
  $('clock').textContent =
    `${state.time.toFixed(3)} / ${duration.toFixed(3)} s · frame ${(state.time * SAMPLE_FPS).toFixed(2)} · ${SAMPLE_FPS} Hz preview sampling`;
}
function seek(t: number) {
  if (!preview || !Number.isFinite(t)) return;
  state.time = Math.max(0, Math.min(duration, t));
  clearHelpers();
  preview.seek(state.time);
  overlays();
  measure();
  syncClock();
  updateLink();
}
function setPlaying(playing: boolean) {
  state.playing = playing && duration > 0;
  if (state.playing && state.time >= duration) seek(0);
  syncClock();
  updateLink();
}
async function choose(reframe = true) {
  ready = false;
  const token = ++generation;
  try {
    const entry = assetsById.get(state.asset);
    if (!entry) throw new Error('Missing asset: ' + state.asset);
    const asset = entry.sourceKind === 'built' ? await load(state.asset) : undefined;
    const code =
      entry.sourceKind === 'code' ? await (await import('./code-preview.ts')).codePreview(entry.codeId) : undefined;
    if (token !== generation) {
      code?.dispose();
      return;
    }
    clearHelpers();
    preview?.group.removeFromParent();
    preview?.dispose();
    currentAsset = asset;
    const nodes: string[] = [];
    if (asset && state.asset !== 'buddy')
      asset.gltf.scene.traverse((o) => {
        if (!o.name || o === asset.gltf.scene || (o as THREE.Bone).isBone) return;
        let hasMesh = false;
        o.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) hasMesh = true;
        });
        if (hasMesh) nodes.push(o.name);
      });
    options(select('node'), [['', 'Whole asset'], ...nodes.map((n): [string, string] => [n, n])]);
    if (state.node && !nodes.includes(state.node)) state.node = '';
    select('node').value = state.node;
    const clips = state.asset === 'buddy' ? [...buddy.clips.values()] : (asset?.gltf.animations ?? []);
    if (!clips.some((clip) => clip.name === state.clip))
      state.clip = state.asset === 'buddy' && buddy.clips.has('Idle_Loop') ? 'Idle_Loop' : (clips[0]?.name ?? '');
    options(
      select('clip'),
      clips.length
        ? clips.map((clip) => [clip.name, `${clip.name} · ${clip.duration.toFixed(3)} s`])
        : [['', 'No clips']],
    );
    select('clip').value = state.clip;
    duration = clips.find((clip) => clip.name === state.clip)?.duration ?? 0;
    preview =
      state.asset === 'buddy'
        ? buddy.create(state.mode, state.clip, state.pose, state.hat, q.has('blink') ? number('blink', 1) : undefined)
        : code
          ? { ...code, figure: code.group, seek() {}, advance() {} }
          : generic(asset!);
    stage.add(preview.group);
    $('buddy-controls').hidden = state.asset !== 'buddy';
    $('mode-note').textContent =
      state.asset === 'buddy'
        ? state.mode === 'played'
          ? 'Real body stride/blend + retarget + life. Clip selects movement inputs; pose and preview clock reset on seek.'
          : 'Retargeted authored clip only; no body blend or procedural life. Inspect hero-clips for the original skeleton.'
        : entry.sourceKind === 'code'
          ? 'Shared code factory · static representative geometry; no game behavior.'
          : 'Authored glTF clip; no game placement or procedural layers.';
    stats();
    seek(state.time);
    measure();
    reference.group.position.set(selectionBox.max.x + 1.1, 0, 0);
    if (reframe) view(q.get('view') ?? (state.asset.startsWith('code:windmill') ? 'Back' : 'Three'));
    $('status').textContent = entry.label + (state.node ? ' / ' + state.node : '') + ' · ready';
    ready = true;
    browser.select(selectedId());
    updateLink();
  } catch (error) {
    $('status').textContent = String(error);
    ready = !!preview;
  }
}
function updateLink() {
  const url = new URL(location.href);
  url.search = '';
  const p = url.searchParams;
  for (const [key, value] of Object.entries({
    asset: state.asset,
    node: state.node,
    clip: state.clip,
    t: state.time.toFixed(6),
    mode: state.mode,
    pose: state.pose,
    hat: state.hat,
    speed: state.speed,
    loop: state.loop ? '1' : '0',
    play: state.playing ? '1' : '0',
    light: state.light,
    exposure: state.exposure,
    fps: SAMPLE_FPS,
    cam: camera.position
      .toArray()
      .map((n) => n.toFixed(5))
      .join(','),
    target: controls.target
      .toArray()
      .map((n) => n.toFixed(5))
      .join(','),
    fov: camera.fov,
    yaw: stage.rotation.y,
  }))
    if (value !== '') p.set(key, String(value));
  // Explicit empty part means whole kit; absent node preserves the legacy scaffold default.
  p.set('node', state.node);
  for (const id of ['spin', 'bounds', 'reference', 'wire', 'bones', 'sockets', 'trajectory', 'crowd'])
    p.set(id, input(id).checked ? '1' : '0');
  input('link').value = url.href;
}
select('node').onchange = () => {
  state.node = select('node').value;
  state.time = 0;
  void choose();
};
select('clip').onchange = () => {
  state.clip = select('clip').value;
  state.time = 0;
  void choose(false);
};
for (const key of ['mode', 'pose', 'hat'] as const) {
  select(key).value = state[key];
  select(key).onchange = () => {
    if (key === 'mode') state.mode = select(key).value as BuddyMode;
    else state[key] = select(key).value;
    void choose(false);
  };
}
$('play').onclick = () => setPlaying(!state.playing);
$('reset').onclick = () => {
  setPlaying(false);
  seek(0);
};
$('back').onclick = () => {
  setPlaying(false);
  seek(state.time - 1 / SAMPLE_FPS);
};
$('next').onclick = () => {
  setPlaying(false);
  seek(state.time + 1 / SAMPLE_FPS);
};
for (const id of ['scrub', 'time'])
  input(id).oninput = () => {
    setPlaying(false);
    seek(Number(input(id).value));
  };
input('speed').value = String(state.speed);
input('speed').onchange = () => {
  state.speed = Math.max(0.05, Math.min(4, Number(input('speed').value) || 1));
  updateLink();
};
input('loop').checked = state.loop;
input('loop').onchange = () => {
  state.loop = input('loop').checked;
  updateLink();
};
for (const id of ['spin', 'bounds', 'reference', 'wire', 'bones', 'sockets', 'trajectory', 'crowd']) {
  if (q.has(id)) input(id).checked = q.get(id) !== '0';
  input(id).onchange = () => {
    overlays();
    updateLink();
  };
}
select('light').value = state.light;
const light = () => {
  lighting.set(state.light);
  lighting.setExposure(state.exposure);
  input('exposure').value = String(state.exposure);
  $('light-note').textContent = lighting.note;
  updateLink();
};
select('light').onchange = () => {
  state.light = select('light').value as LightPreset;
  state.exposure = state.light === 'shipped' ? 0.16 : 1;
  light();
};
input('exposure').onchange = () => {
  state.exposure = Math.max(0.01, Math.min(4, Number(input('exposure').value) || 1));
  light();
};
$('copy').onclick = async () => {
  updateLink();
  input('link').select();
  try {
    await navigator.clipboard.writeText(input('link').value);
    $('copy').textContent = 'Copied view';
  } catch {
    $('copy').textContent = 'Select and copy the URL below';
  }
};
controls.addEventListener('end', updateLink);
const resize = () => {
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(canvas);
resize();
if (!assetsById.has(state.asset)) {
  $('status').textContent = 'Unknown asset; showing Buddy';
  state.asset = 'buddy';
}
if (!q.has('node')) state.node = assetsById.get(state.asset)?.defaultNode ?? '';
if (q.has('hop')) {
  state.mode = 'played';
  state.clip = state.time < 0.18 ? 'Jump_Start' : 'Jump_Loop';
  select('mode').value = state.mode;
}
await choose();
for (let i = 0; i < 7; i++) {
  const item = buddy.create('raw', 'Idle_Loop', 'free', state.hat);
  item.seek(i * 0.13);
  item.group.position.set(((i % 4) - 1.5) * 1.5, 0, -2 - Math.floor(i / 4) * 1.8);
  stage.add(item.group);
  crowd.push(item);
}
overlays();
light();
const vector = (key: string) => {
  const v = q.get(key)?.split(',').map(Number);
  return v?.length === 3 && v.every(Number.isFinite) ? v : undefined;
};
const cam = vector('cam'),
  target = vector('target');
if (cam) camera.position.fromArray(cam);
if (target) controls.target.fromArray(target);
camera.fov = Math.max(10, Math.min(100, number('fov', camera.fov)));
camera.updateProjectionMatrix();
controls.update();
updateLink();
const api = {
  catalogue,
  select: selectEntry,
  get ready() {
    return ready;
  },
  get frames() {
    return frames;
  },
  gfx: 'webgpu',
  state,
  camera,
  controls,
  get figure() {
    return preview?.figure;
  },
  seek,
  setPlaying,
  inspect() {
    return {
      state: { ...state },
      duration,
      frames,
      draws: renderer.info.render.drawCalls,
      bounds: selectionBox.min.toArray().concat(selectionBox.max.toArray()),
      link: input('link').value,
      clips: Array.from(select('clip').options).map((o) => o.value),
    };
  },
};
Object.assign(window, { assetStage: api, character: api });
let last = performance.now(),
  uiAt = 0;
const loopStarted = renderer.setAnimationLoop(() => {
  const now = performance.now(),
    dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (ready && state.playing && duration > 0 && preview) {
    let next = state.time + dt * state.speed;
    if (next > duration) {
      if (state.loop) {
        next %= duration;
        clearHelpers();
        preview.seek(next);
        overlays();
      } else {
        next = duration;
        state.playing = false;
        preview.advance(next - state.time);
      }
    } else preview.advance(next - state.time);
    state.time = next;
    measure();
  }
  if (input('spin').checked) stage.rotation.y += dt * 0.6;
  controls.update();
  lighting.update();
  lighting.pipeline.render();
  frames++;
  if (now - uiAt > 100) {
    syncClock();
    $('draws').textContent =
      `${renderer.info.render.drawCalls} measured stage draw calls (includes floor, Buddy reference, helpers, shadows and output pass).`;
    uiAt = now;
  }
});
background(loopStarted, 'asset stage loop');
addEventListener('pagehide', () => {
  background(renderer.setAnimationLoop(null), 'stop asset stage');
  browser.dispose();
  thumbnails.dispose();
  clearHelpers();
  preview?.dispose();
  reference.dispose();
  crowd.forEach((c) => c.dispose());
  controls.dispose();
  lighting.dispose();
  loader.dispose();
  floor.geometry.dispose();
  floor.material.dispose();
  grid.dispose();
  bounds.dispose();
  background(renderer.dispose(), 'dispose asset stage');
});
