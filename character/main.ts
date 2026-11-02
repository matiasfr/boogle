// The character viewer (/character/): the player's character alone, away from the game, for iterating on the model, its
// rendering and its animations, and the start of a customization screen. The same renderer, tone mapping, sun and sky
// light as src/render/scene.ts, and the same clips and retargeting as ?proto=hero (src/proto/hero/). Serves DESIGN.md
// "How we work": see a change at a glance.
import * as THREE from 'three/webgpu';
import { color, float, normalView, positionViewDirection, uniform, vec3 } from 'three/tsl';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { patchNode } from '../src/render/material-patch.ts';
import { retargetClip, UAL_TO_MESHY, UAL_TO_SELF } from '../src/proto/hero/retarget.ts';
import tracklayerUrl from '../assets/built/tracklayer.glb?url';
import buddyUrl from '../assets/built/buddy.glb?url';
import clipsUrl from '../assets/built/hero-clips.glb?url';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const CLIPS: [string, string][] = [
  ['Idle', 'Idle_Loop'],
  ['Walk', 'Walk_Loop'],
  ['Jog', 'Jog_Fwd_Loop'],
  ['Sprint', 'Sprint_Loop'],
  ['Jump', 'Jump_Start'],
  ['Air', 'Jump_Loop'],
  ['Land', 'Jump_Land'],
];
const HEIGHT = 0.95; // m the camera looks at
const VIEWS: Record<string, { yaw: number; dist: number; y: number }> = {
  Front: { yaw: 0, dist: 3.6, y: HEIGHT },
  Three: { yaw: 0.65, dist: 3.6, y: 1.15 },
  Side: { yaw: Math.PI / 2, dist: 3.6, y: HEIGHT },
  Back: { yaw: Math.PI, dist: 3.6, y: HEIGHT },
  Close: { yaw: 0.4, dist: 1.5, y: 1.5 },
  Game: { yaw: Math.PI, dist: 6.5, y: 2.6 }, // about where the game's camera sits
};

const MODELS: Record<string, { label: string; url: string; map: Record<string, string> }> = {
  buddy: { label: 'The Buddy', url: buddyUrl, map: UAL_TO_SELF },
  tracklayer: { label: 'The Tracklayer', url: tracklayerUrl, map: UAL_TO_MESHY },
};
const modelName = new URLSearchParams(location.search).get('model') ?? 'buddy';
const chosen = MODELS[modelName] ?? MODELS.buddy!;
const modelUrl = chosen.url;
const COLOURS = ['#1fbfc4', '#ff6b5a', '#ffb02e', '#7ed321', '#4a90e2', '#a55eea', '#ff5e9e', '#ff8a3d'];

const canvas = $<HTMLCanvasElement>('view');
const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
await renderer.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color('#9db4cc');
scene.add(new THREE.HemisphereLight('#d4f0ff', '#e6d3a0', 1.2));
const sun = new THREE.DirectionalLight('#fff0d0', 2.5);
sun.position.set(3, 6, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 20 });
sun.shadow.bias = -0.0005;
scene.add(sun);
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2),
  new THREE.MeshStandardNodeMaterial({ color: '#c8a874', roughness: 1 }),
);
ground.receiveShadow = true;
scene.add(ground);

const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, HEIGHT, 0);
const setView = (name: string) => {
  const v = VIEWS[name]!;
  camera.fov = name === 'Game' ? 62 : 40;
  camera.updateProjectionMatrix();
  controls.target.set(0, name === 'Close' ? 1.35 : HEIGHT, 0);
  camera.position.set(Math.sin(v.yaw) * v.dist, v.y, Math.cos(v.yaw) * v.dist);
};
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / Math.max(1, innerHeight);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

await MeshoptDecoder.ready;
const loader = new GLTFLoader()
  .setMeshoptDecoder(MeshoptDecoder)
  .setKTX2Loader(new KTX2Loader().detectSupport(renderer));
const [model, clipKit] = await Promise.all([loader.loadAsync(modelUrl), loader.loadAsync(clipsUrl)]);

// The game's rim of sky light, as in src/player/hero.ts, here with a switch.
const rimOn = uniform(1);
const rim = float(1)
  .sub(normalView.dot(positionViewDirection).saturate())
  .pow(3)
  .mul(color('#cfe6ff'))
  .mul(0.45)
  .mul(rimOn);
const materials = new Set<THREE.MeshStandardNodeMaterial>();
const toNode = new Map<THREE.Material, THREE.MeshStandardNodeMaterial>();
let triangles = 0;
model.scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  m.castShadow = true;
  m.frustumCulled = false;
  triangles += (m.geometry.index?.count ?? m.geometry.attributes.position!.count) / 3;
  const old = m.material as THREE.Material;
  let n = toNode.get(old);
  if (!n) {
    n = (renderer.library.fromMaterial(old) ?? old) as THREE.MeshStandardNodeMaterial;
    patchNode(n, 'emissiveNode', (prev) => (prev ?? vec3(0)).add(rim));
    toNode.set(old, n);
    materials.add(n);
  }
  m.material = n;
});
const textures = [...materials].flatMap((m) => [m.map, m.normalMap, m.roughnessMap].filter(Boolean)) as THREE.Texture[];
const texSize = Math.max(...textures.map((t) => (t.image as { width: number }).width), 0);
const fileKB = async (url: string) => Math.round((await (await fetch(url)).arrayBuffer()).byteLength / 1024);
const kb = await fileKB(modelUrl);
$('stats').textContent =
  `${chosen.label}. ${Math.round(triangles).toLocaleString()} triangles, ${kb.toLocaleString()} KB` +
  (textures.length ? `, ${new Set(textures).size} textures at ${texSize} px.` : ', no textures.');

const figure = cloneSkinned(model.scene);
const srcFigure = cloneSkinned(clipKit.scene);
const restFigure = cloneSkinned(model.scene);
scene.add(figure);

// The clips, baked for this skeleton. Arms out rebakes them.
let baked = new Map<string, THREE.AnimationClip>();
function bake(armOut: number) {
  baked = new Map(
    CLIPS.map(([, name]) => {
      const clip = clipKit.animations.find((a) => a.name === name)!;
      return [name, retargetClip(clip, srcFigure, restFigure, { map: chosen.map, armOut }).clip];
    }),
  );
}

const mixer = new THREE.AnimationMixer(figure);
let current = 'Idle_Loop',
  action: THREE.AnimationAction | null = null,
  speed = 1;
function play(name: string, fade = 0.15) {
  current = name;
  const next = mixer.clipAction(baked.get(name)!);
  next.reset().setEffectiveTimeScale(speed).play();
  if (action && action !== next) action.crossFadeTo(next, fade, false);
  action = next;
  for (const b of $('clips').children) b.classList.toggle('on', (b as HTMLElement).dataset.clip === name);
}
function rebake(armOut: number) {
  const t = action?.time ?? 0;
  mixer.stopAllAction();
  for (const c of baked.values()) mixer.uncacheClip(c);
  action = null;
  bake(armOut);
  play(current, 0);
  action!.time = t;
  updateCrowd();
}

function button(parent: string, label: string, on: () => void) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', on);
  $(parent).append(b);
  return b;
}
for (const [label, name] of CLIPS) button('clips', label, () => play(name)).dataset.clip = name;
for (const name of Object.keys(VIEWS)) button('views', name, () => setView(name));
for (const [name, m] of Object.entries(MODELS))
  button('models', m.label, () => (location.search = '?model=' + name)).classList.toggle('on', m === chosen);
const skin = [...materials].find((m) => m.name === 'M_Main');
if (skin)
  for (const c of COLOURS) {
    const b = button('colours', '', () => skin.color.set(c));
    b.style.cssText = `background:${c};width:24px;height:24px;padding:0`;
    b.setAttribute('aria-label', 'Colour ' + c);
  }
const rimButtons = [button('rims', 'Rim on', () => setRim(1)), button('rims', 'Rim off', () => setRim(0))];
function setRim(v: number) {
  rimOn.value = v;
  rimButtons[0]!.classList.toggle('on', v === 1);
  rimButtons[1]!.classList.toggle('on', v === 0);
}

$<HTMLInputElement>('speed').addEventListener('input', (e) => {
  speed = Number((e.target as HTMLInputElement).value);
  $('speed-out').textContent = String(speed);
  action?.setEffectiveTimeScale(speed);
});
$<HTMLInputElement>('arm').addEventListener('input', (e) => {
  const deg = Number((e.target as HTMLInputElement).value);
  $('arm-out').textContent = deg + '°';
  rebake((deg * Math.PI) / 180);
});
$<HTMLInputElement>('wire').addEventListener('change', (e) => {
  for (const m of materials) m.wireframe = (e.target as HTMLInputElement).checked;
});

// Eight in a line behind the first, each its own mixer: a look at them as a crowd, and at their cost.
const crowd = new THREE.Group();
scene.add(crowd);
const crowdMixers: THREE.AnimationMixer[] = [];
function updateCrowd() {
  crowdMixers.length = 0;
  crowd.clear();
  if (!$<HTMLInputElement>('crowd').checked) return;
  for (let i = 1; i < 8; i++) {
    const f = cloneSkinned(model.scene);
    const col = i % 4,
      rowN = Math.floor(i / 4);
    f.position.set((col - 1.5) * 1.5, 0, -1.6 - rowN * 1.8);
    crowd.add(f);
    const m = new THREE.AnimationMixer(f);
    m.clipAction(baked.get(current)!).play().time = i * 0.13;
    m.timeScale = speed;
    crowdMixers.push(m);
  }
}
$<HTMLInputElement>('crowd').addEventListener('change', updateCrowd);

bake((12 * Math.PI) / 180);
play('Idle_Loop', 0);
setRim(1);
setView('Three');
const q = new URLSearchParams(location.search);
if (q.get('clip')) play(q.get('clip')!, 0);
if (q.get('view')) setView(q.get('view')!);
const spin = $<HTMLInputElement>('spin');
if (q.has('spin')) spin.checked = true;
if (q.has('crowd')) {
  $<HTMLInputElement>('crowd').checked = true;
  updateCrowd();
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  mixer.update(dt);
  for (const m of crowdMixers) m.update(dt);
  if (spin.checked) figure.rotation.y += dt * 0.8;
  controls.update();
  renderer.render(scene, camera);
});
