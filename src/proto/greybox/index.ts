// ?greybox=sickle (dev server only): the Sickle Isles layout (docs/world/map-prototypes.md, option 1) blocked out at
// the real 1 km scale beside today's world, to walk, look and ride round before anything is dressed. It adds to the
// world and changes nothing in it: no ops, no state, no saves, no sim. A review tool, never shipped to players.
//
//   &gbview=<id>            hold the camera at a named view (the panel lists them; Free gives it back)
//   &gbcam=x,y,z&gblook=x,y,z   hold it anywhere (world metres; the panel's readout prints the current pose)
//   &gbfog=game|3600|off    the game's own fog (default), a longer range to compare, or none
//   &pick=A|B               colour lines for High Gorge first (A, default) or Canopy Town first (B)
//   &labels=0               start with labels and station markers hidden
//   &gbcliff=d9d4c8         cliff tint (default mid grey; chalk white loses the far islets in the horizon haze)
// window.__greybox drives the same from a look eval: view(id), pose(cam, look), ride(route, speed), go(place), free(),
// labels(on), fog(mode). The game's fog is the frozen sky's fog node, refreshed here by flushing its lighting.
import * as THREE from 'three/webgpu';
import './greybox.css';
import { camera, scene, toScreen, view as viewport } from '../../render/scene.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { me, cam } from '../../player/state.ts';
import { releaseInput } from '../../player/input.ts';
import { releaseJump } from '../../entities/player/state.ts';
import { teleport } from '../../physics/engine.ts';
import { waterField } from '../../physics/water-field.ts';
import { PLAYER_R } from '../../constants.ts';
import { flushFrozenLighting } from '../../render/water/frozen-sky.ts';
import { FAR, ORIGIN } from '../place/layout.ts';
import { GATES, LINES, PLACES, ROUTES, polyLen, rideSeconds, STAGE_COLOURS, type Pick } from './sickle-data.ts';
import { SPOTS, buildGreybox, deckOf, markers, root, type Built } from './build.ts';

const q = new URLSearchParams(location.search);
const pick: Pick = q.get('pick') === 'B' ? 'B' : 'A';
const { lines } = buildGreybox(pick);
const W = (x: number, y: number, z: number) => new THREE.Vector3(x + ORIGIN.x, y, z + ORIGIN.z);

// ---------------------------------------------------------------- named views (local metres in, world out)
type View = { name: string; cam: THREE.Vector3; look: THREE.Vector3; fog?: Fog };
// In front of the broken ring (its tube passes through the centre), on the freight aperture's west side.
const RING_EYE = W(FAR.x - 140, 100, FAR.z - 10);
const HOME_EYE = W(-100, 25, 14);
export const VIEWS: Record<string, View> = {
  spawn: { name: 'Spawn (West landing), looking west over the bay', cam: W(-188, 8, 22), look: W(-900, 30, -250) },
  'home-wall': { name: 'Home: the White Wall to the west', cam: HOME_EYE, look: W(-1720, 60, -350) },
  'home-crane': { name: 'Home: High Port crane, south-west', cam: HOME_EYE, look: SPOTS.crane!.clone().setY(70) },
  'landing-cave': { name: 'West landing: the sea-cave gate', cam: W(-199, 6.5, 10), look: SPOTS.cave! },
  'pier-wall': { name: 'Pier: the White Wall', cam: W(402, 9, -372), look: W(-1650, 60, -700) },
  'ring-wall': { name: 'Ring aperture: the White Wall', cam: RING_EYE, look: W(-1700, 60, -600) },
  'ring-gorge': { name: 'Ring aperture: the Gorge split', cam: RING_EYE, look: W(-1138, 45, -1880) },
  'ring-canopy': { name: 'Ring aperture: Canopy crowns', cam: RING_EYE, look: SPOTS.crowns! },
  'gorge-original': { name: 'Gorge rim: the Original Island', cam: W(-1400, 95, -1930), look: SPOTS.lighthouse! },
  'bell-canopy': { name: 'Bell Rock: Canopy Town', cam: W(-1050, 22, -450), look: W(-2070, 40, -300) },
  'bell-gorge': { name: 'Bell Rock: the stacks', cam: W(-1050, 22, -450), look: W(-1138, 50, -1880) },
  'salt-port': { name: 'Saltpan: High Port', cam: W(-450, 8, 700), look: W(-1200, 45, 1080) },
  'canopy-wall': { name: 'Canopy Town: the north chalk', cam: W(-2100, 20, -300), look: W(-1760, 70, -1030) },
  overview: {
    name: 'Overview from the south-east, no fog',
    cam: W(900, 1500, 1800),
    look: W(-1300, 0, -600),
    fog: 'off',
  },
};

// ---------------------------------------------------------------- fog
type Fog = 'game' | 'off' | number;
const parseFog = (v: string | null): Fog => (v === 'off' ? 'off' : v && Number.isFinite(+v) && +v > 0 ? +v : 'game');
let fogMode: Fog = parseFog(q.get('gbfog'));
let viewFog: Fog | null = null;
/** The far plane the world set before this tool stretched it (the railway's arrival sets it after load). */
let ownFar: number | null = null;
function setFar(far: number | null) {
  if (far === null) {
    if (ownFar === null) return;
    camera.far = ownFar;
    ownFar = null;
  } else {
    if (camera.far === far) return;
    ownFar ??= camera.far;
    camera.far = far;
  }
  camera.updateProjectionMatrix();
}
/** The frozen sky copies scene.fog into its fog node only when its lighting flushes, so a change has to flush it. */
let flushedFor = '';
function flushFog(key: string) {
  if (flushedFor === key) return;
  try {
    flushFrozenLighting();
    flushedFor = key;
  } catch {
    // Not baked yet: try again next frame. The bake itself reads scene.fog as this frame leaves it.
  }
}
function applyFog() {
  const fog = scene.fog as THREE.Fog | null;
  const mode = viewFog ?? fogMode;
  if (!fog) return;
  if (mode === 'game') {
    setFar(null);
    // Back to the route's own range (it rewrites scene.fog every frame): flush once if this tool changed it.
    if (flushedFor) flushFog('');
    return;
  }
  if (mode === 'off') {
    fog.near = 20000;
    fog.far = 40000;
    setFar(9000);
  } else {
    fog.near = mode * 0.05; // the crossing's own ratio (180 to 3600)
    fog.far = mode;
    setFar(Math.max(ownFar ?? camera.far, mode * 1.3));
  }
  flushFog(String(mode));
}

// ---------------------------------------------------------------- camera: free, held at a view, or riding a route
type Ride = {
  name: string;
  path: THREE.Vector3[];
  along: number[];
  total: number;
  s: number;
  speed: number;
  model: number;
};
let held: { cam: THREE.Vector3; look: THREE.Vector3 } | null = null;
let ride: Ride | null = null;
let heldId = '';
const look = new THREE.Vector3(),
  ahead = new THREE.Vector3();
function pointAt(r: Ride, s: number, out: THREE.Vector3) {
  s = Math.max(0, Math.min(r.total, s));
  let i = 1;
  while (i < r.along.length - 1 && r.along[i]! < s) i++;
  const a = r.path[i - 1]!,
    b = r.path[i]!,
    t = (s - r.along[i - 1]!) / Math.max(1e-6, r.along[i]! - r.along[i - 1]!);
  return out.copy(a).lerp(b, t);
}
const lineById = Object.fromEntries(lines.map((b) => [b.line.id, b]));
function startRide(id: string, speed = 1) {
  const route = ROUTES.find((r) => r.id === id);
  if (!route) return false;
  const path: THREE.Vector3[] = [];
  for (const leg of route.legs) for (const p of lineById[leg]!.path) if (!path.at(-1)?.equals(p)) path.push(p);
  const along = [0];
  for (let i = 1; i < path.length; i++) along.push(along[i - 1]! + path[i]!.distanceTo(path[i - 1]!));
  const lens = route.legs.map((leg) => polyLen(LINES.find((l) => l.id === leg)!.pts));
  ride = { name: route.name, path, along, total: along.at(-1)!, s: 0, speed, model: rideSeconds(lens) };
  held = null;
  heldId = `ride:${id}`;
  return true;
}
function holdView(id: string) {
  const v = VIEWS[id];
  if (!v) return false;
  ride = null;
  held = { cam: v.cam.clone(), look: v.look.clone() };
  viewFog = v.fog ?? null;
  heldId = id;
  return true;
}
function free() {
  held = null;
  ride = null;
  viewFog = null;
  heldId = '';
}
const vec = (s: string | null) => {
  const v = s?.split(',').map(Number);
  return v?.length === 3 && v.every(Number.isFinite) ? new THREE.Vector3(v[0], v[1], v[2]) : null;
};
{
  const c = vec(q.get('gbcam')),
    l = vec(q.get('gblook'));
  if (c && l) {
    held = { cam: c, look: l };
    heldId = 'custom';
  } else if (q.get('gbview')) holdView(q.get('gbview')!);
}

// ---------------------------------------------------------------- travel: your own body, in your own tab
function goTo(id: string) {
  const body = me.body;
  const p = PLACES.find((x) => x.id === id);
  if (!body || !p) return;
  const at = id === 'home' ? ([-199, 10] as [number, number]) : p.at;
  const y = id === 'home' ? 3.6 : deckOf(id, at);
  free();
  releaseInput();
  releaseJump();
  teleport(body, at[0] + ORIGIN.x, y + PLAYER_R + 0.6, at[1] + ORIGIN.z);
  body.velocity.set(0, 0, 0);
  body.angularVelocity.set(0, 0, 0);
  me.wish.set(0, 0, 0);
  waterField.invalidate('player');
  cam.yaw = me.yaw;
}

// ---------------------------------------------------------------- labels
const labelRoot = document.createElement('div');
labelRoot.className = 'gbx-labels';
document.body.append(labelRoot);
type Label = { el: HTMLDivElement; at: THREE.Vector3 };
const labels: Label[] = [];
function label(text: string, at: THREE.Vector3, kind: 'place' | 'gate' | 'mark' = 'place', colour?: string) {
  const el = document.createElement('div');
  el.className = `gbx-label gbx-${kind}`;
  if (colour) el.style.borderColor = colour;
  el.append(text, document.createElement('small'));
  labelRoot.append(el);
  labels.push({ el, at });
}
const firstStage = (id: string) => {
  const stages = lines
    .filter((b) => !b.line.built && (b.line.from === id || b.line.to === id))
    .map((b) => b.stage ?? 99);
  return stages.length ? Math.min(...stages) : 99;
};
for (const p of PLACES)
  label(p.name, SPOTS[p.id]!.clone().setY(SPOTS[p.id]!.y + 34), 'place', STAGE_COLOURS[firstStage(p.id)]);
for (const g of GATES)
  label(g.name, (SPOTS[g.id] ?? SPOTS.crane!).clone().setY((SPOTS[g.id] ?? SPOTS.crane!).y + 12), 'gate');
label('Lantern', SPOTS.lantern!.clone().setY(SPOTS.lantern!.y + 10), 'mark');
label('Lighthouse', SPOTS.lighthouse!.clone().setY(SPOTS.lighthouse!.y + 10), 'mark');
label('Shard (today)', W(FAR.x + 10, 200, FAR.z), 'mark');
label('Classic island (today, world origin)', new THREE.Vector3(0, 40, 0), 'mark');
label('White Wall, 120 m', W(-1610, 150, -1260), 'mark');
label('White Wall, 120 m', W(-1840, 150, 560), 'mark');
let labelsOn = q.get('labels') !== '0';
function setLabels(on: boolean) {
  labelsOn = on;
  labelRoot.hidden = !on;
  markers.visible = on;
}
setLabels(labelsOn);
const screen = { x: 0, y: 0, behind: false };
function drawLabels() {
  if (!labelsOn) return;
  for (const l of labels) {
    toScreen(l.at, screen, viewport.w, viewport.h);
    const on =
      !screen.behind && screen.x > -50 && screen.x < viewport.w + 50 && screen.y > -20 && screen.y < viewport.h + 20;
    l.el.hidden = !on;
    if (!on) continue;
    l.el.style.transform = `translate(${screen.x.toFixed(0)}px, ${screen.y.toFixed(0)}px) translate(-50%, -100%)`;
    const d = camera.position.distanceTo(l.at);
    (l.el.lastChild as HTMLElement).textContent = d < 950 ? ` ${d.toFixed(0)} m` : ` ${(d / 1000).toFixed(2)} km`;
  }
}

// ---------------------------------------------------------------- the panel
const panel = document.createElement('div');
panel.className = 'gbx-panel';
const readout = document.createElement('div');
readout.className = 'gbx-readout';
function section(title: string) {
  const s = document.createElement('details');
  const h = document.createElement('summary');
  h.textContent = title;
  s.append(h);
  panel.append(s);
  return s;
}
function button(parent: HTMLElement, text: string, run: () => void, title = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.title = title;
  b.onclick = (e) => {
    e.stopPropagation();
    run();
  };
  parent.append(b);
  return b;
}
{
  const head = document.createElement('div');
  head.className = 'gbx-head';
  head.textContent = `Sickle Isles greybox · pick ${pick === 'A' ? 'A (Gorge first)' : 'B (Canopy first)'}`;
  panel.append(head);
  const row = document.createElement('div');
  row.className = 'gbx-row';
  panel.append(row);
  button(row, 'Labels', () => setLabels(!labelsOn));
  const fogButton = button(row, '', () => {
    fogMode = fogMode === 'game' ? 3600 : fogMode === 3600 ? 'off' : 'game';
    fogButton.textContent = `Fog: ${fogMode}`;
  });
  fogButton.textContent = `Fog: ${fogMode}`;
  button(row, 'Free camera', free);
  button(row, `Pick ${pick === 'A' ? 'B' : 'A'}`, () => {
    const u = new URL(location.href);
    u.searchParams.set('pick', pick === 'A' ? 'B' : 'A');
    location.assign(u.href);
  });
  const views = section('Views');
  for (const [id, v] of Object.entries(VIEWS)) button(views, v.name, () => holdView(id), id);
  const go = section('Go to (moves your body)');
  for (const p of PLACES) button(go, p.name, () => goTo(p.id));
  const rides = section('Ride at 20 m/s (x4 for review)');
  for (const r of ROUTES) {
    const row2 = document.createElement('div');
    row2.className = 'gbx-row';
    button(row2, 'x1', () => startRide(r.id, 1));
    button(row2, 'x4', () => startRide(r.id, 4));
    row2.append(r.name);
    rides.append(row2);
  }
  panel.append(readout);
  (document.querySelector('.hud') ?? document.body).append(panel);
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmt = (v: THREE.Vector3) => `${v.x.toFixed(0)},${v.y.toFixed(0)},${v.z.toFixed(0)}`;
let readoutClock = 0;
function drawReadout(dt: number) {
  readoutClock += dt;
  if (readoutClock < 0.25) return;
  readoutClock = 0;
  if (ride) {
    const t = ride.s / RIDE_SPEED;
    readout.textContent = `${ride.name}: ${(ride.s / 1000).toFixed(2)} / ${(ride.total / 1000).toFixed(2)} km, ${mmss(t)} of ${mmss(ride.total / RIDE_SPEED)} at 20 m/s (x${ride.speed}); the model's ride with boarding and stops: ${mmss(ride.model)}`;
    return;
  }
  camera.getWorldDirection(ahead);
  look.copy(camera.position).addScaledVector(ahead, 100);
  readout.textContent = `${heldId ? `view ${heldId}` : 'follow camera'} · gbcam=${fmt(camera.position)}&gblook=${fmt(look)}`;
}
const RIDE_SPEED = 20;

// ---------------------------------------------------------------- one late hook: camera, fog, labels, the blinking light
// The blockout's draws compiled before the frozen sky installed its fog node kept the placeholder fog: far islets in the
// first camera's view rendered as pure horizon haze (seen 6 November; material.needsUpdate did not cure it, fresh
// materials did). So whenever the fog node changes, give every greybox mesh fresh clones of its materials.
const baseMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
let clones: THREE.Material[] = [];
let fogNodeSeen: unknown = null;
function refreshMaterials() {
  const made = new Map<THREE.Material, THREE.Material>();
  const swap = (m: THREE.Material) => {
    let c = made.get(m);
    if (!c) made.set(m, (c = m.clone()));
    return c;
  };
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (!baseMaterials.has(o)) baseMaterials.set(o, o.material as THREE.Material | THREE.Material[]);
    const base = baseMaterials.get(o)!;
    o.material = Array.isArray(base) ? base.map(swap) : swap(base);
  });
  for (const c of clones) c.dispose();
  clones = [...made.values()];
}

defineKind('greybox', { lateUpdate: 1002 });
let clock = 0;
const LAMP = root.getObjectByName('lighthouse-lamp');
spawn({
  kind: 'greybox',
  lateUpdate({ dt }) {
    clock += dt;
    const fogNode = (scene as unknown as { fogNode?: unknown }).fogNode;
    if (fogNode && fogNode !== fogNodeSeen) {
      fogNodeSeen = fogNode;
      refreshMaterials();
    }
    applyFog();
    if (ride) {
      ride.s = Math.min(ride.total, ride.s + RIDE_SPEED * ride.speed * dt);
      pointAt(ride, ride.s, camera.position).y += 6;
      pointAt(ride, ride.s + 90, look).y += 4;
      camera.lookAt(look);
      camera.updateMatrixWorld();
    } else if (held) {
      camera.position.copy(held.cam);
      camera.lookAt(held.look);
      camera.updateMatrixWorld();
    }
    const lamp = LAMP;
    if (lamp) lamp.visible = clock % 4 < 0.9;
    drawLabels();
    drawReadout(dt);
  },
});

const api = {
  views: Object.keys(VIEWS),
  routes: ROUTES.map((r) => r.id),
  view: holdView,
  /** Hold the camera at any pose, world metres. */
  pose(at: [number, number, number], target: [number, number, number]) {
    free();
    held = { cam: new THREE.Vector3(...at), look: new THREE.Vector3(...target) };
    heldId = 'custom';
  },
  ride: startRide,
  free,
  go: goTo,
  labels: setLabels,
  fog(mode: string) {
    fogMode = parseFog(mode);
  },
  state: () => ({
    held: heldId,
    ride: ride && { s: ride.s, total: ride.total, model: ride.model },
    camera: camera.position.toArray(),
    fog: { near: (scene.fog as THREE.Fog).near, far: (scene.fog as THREE.Fog).far, cameraFar: camera.far },
    lines: lines.map((b: Built) => ({ id: b.line.id, stage: b.stage, km: +(polyLen(b.line.pts) / 1000).toFixed(2) })),
  }),
};
(window as unknown as { __greybox: typeof api }).__greybox = api;
console.log('GREYBOX sickle ready', JSON.stringify({ pick, views: api.views.length, routes: api.routes.length }));
