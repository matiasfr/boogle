// ?greybox=<option> (dev server only; default sickle): a map prototype from docs/world/map-prototypes.html blocked out
// at the real scale beside today's world, to walk, look and ride round before anything is dressed. It adds to the
// world and changes nothing in it: no ops, no state, no saves, no sim. How to use it: ./README.md.
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
import { background } from '../../async.ts';
import { precompile } from '../../render/precompile.ts';
import { FAR } from '../place/layout.ts';
import { MAP } from './page.ts';
import { layout, polyLen, rideSeconds, type Pick, type XZ } from './map-data.ts';
import { createGround, wx, wz } from './ground.ts';
import { buildGreybox, STAGE_COLOURS } from './build.ts';

const q = new URLSearchParams(location.search);
const optionId = q.get('greybox') || 'sickle';
const pick: Pick = q.get('pick') === 'B' ? 'B' : 'A';
const map = layout(MAP, optionId, pick);
const ground = createGround(map);
const box = buildGreybox(map, ground);
// Build every pipeline up front, as the game does for its lazy parts, and show the blockout once they're ready: drawn
// first-time inside the look harness's warped frames, some of its far meshes never appeared (seen 7 November).
box.root.visible = false;
background(
  precompile(box.root).then(() => {
    box.root.visible = true;
  }),
  'greybox pipelines',
);
const W = (x: number, y: number, z: number) => new THREE.Vector3(wx(x), y, wz(z));
const placeAt = (id: string) => map.places.find((p) => p.id === id)?.at;

// ---------------------------------------------------------------- views, derived from the map's places and sights
type View = { name: string; cam: THREE.Vector3; look: THREE.Vector3; fog?: Fog };
const eye = (id: string) => {
  const s = box.spots[id];
  if (!s) return null;
  // Ring Island's eye is the freight aperture, on the west side of the broken ring; elsewhere a play camera's height.
  if (id === 'ring') return W(FAR.x - 140, 100, FAR.z - 10);
  return s.pos.clone().setY(s.pos.y + 8);
};
const target = (id: string) => box.spots[id]?.pos.clone() ?? null;
const centreOf = (pred: (g: (typeof map.land)[number]) => boolean, y: number) => {
  const pts = map.land.filter(pred).flatMap((g) => (g.c ? [g.c] : []));
  if (!pts.length) return null;
  const c = pts.reduce<XZ>((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
  return W(c[0], y, c[1]);
};
const WEST_LANDING = W(-188, 8, 22);
const wall = centreOf((g) => g.module === 'chalk', 60);
const newLand = centreOf((g) => !g.existing && !g.horizon && g.id !== 'home-land' && g.id !== 'ring-land', 0);
export const VIEWS: Record<string, View> = {};
const addView = (id: string, name: string, from: THREE.Vector3 | null, to: THREE.Vector3 | null, fog?: Fog) => {
  if (from && to) VIEWS[id] = { name, cam: from, look: to, ...(fog ? { fog } : {}) };
};
addView('spawn', 'Spawn (West landing), over the bay to the Wall', WEST_LANDING, wall);
addView('home-wall', 'Home: the White Wall', eye('home')?.setY(25) ?? null, wall);
for (const s of map.sights)
  addView(
    `${s.from}-${s.to}`,
    `${s.from} to ${s.to}: ${s.note}`,
    eye(s.from),
    s.to === 'port' ? target('crane') : target(s.to),
  );
addView('landing-cave', 'West landing: the sea-cave gate', W(-199, 6.5, 10), target('cave'));
addView('pier-wall', 'Pier: the White Wall', W(402, 9, -372), wall);
addView('ring-wall', 'Ring aperture: the White Wall', eye('ring'), wall);
addView('bell-original', 'Bell Rock: the causeway to The Boogler', eye('bell'), target('original'));
addView('salt-port', 'Saltpan: the line into High Port', eye('saltpan'), target('quay'));
addView(
  'harbour',
  'High Port harbour from the mouth',
  target('harbour-mouth')?.add(new THREE.Vector3(80, 10, 120)) ?? null,
  target('quay'),
);
addView('port-mainland', 'High Port: the mainland city', eye('port'), target('city'));
{
  // Through the arch the way its telescope points: back from the arch, looking out at the mainland coast.
  const notch = placeAt('notch'),
    arch = map.landmarks.find((l) => l.kind === 'arch');
  if (notch && arch?.bearing !== undefined) {
    const b = (arch.bearing * Math.PI) / 180,
      fx = Math.sin(b),
      fz = -Math.cos(b);
    addView(
      'notch-mainland',
      'Lantern Notch: through the arch to the mainland',
      W(notch[0] - fx * 90, 22, notch[1] - fz * 90),
      W(notch[0] + fx * 1800, 60, notch[1] + fz * 1800),
    );
  }
}
addView('gorge-ring', 'High Gorge bridge: down the split to Ring Island', eye('gorge'), eye('ring'));
addView('canopy-cleft', 'Canopy Town: the cleft in the Wall', eye('canopy'), target('bell'));
if (newLand)
  addView(
    'overview',
    'Overview from the south-east, no fog',
    newLand.clone().add(new THREE.Vector3(3200, 1500, 2400)),
    newLand,
    'off',
  );

// ---------------------------------------------------------------- fog compare (the game's own is 3.6 km, src/constants.ts)
type Fog = 'game' | 'off' | number;
const parseFog = (v: string | null): Fog => (v === 'off' ? 'off' : v && Number.isFinite(+v) && +v > 0 ? +v : 'game');
let fogMode: Fog = parseFog(q.get('gbfog'));
let viewFog: Fog | null = null;
/** The far plane the world set before this tool stretched it. */
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
/** Late, after the sky holds the outdoor range: the fog node reads scene.fog at render time. */
function applyFog() {
  const fog = scene.fog as THREE.Fog | null;
  const mode = viewFog ?? fogMode;
  if (!fog || mode === 'game') return setFar(null);
  if (mode === 'off') {
    fog.near = 20000;
    fog.far = 40000;
    setFar(9000);
  } else {
    fog.near = mode * 0.05;
    fog.far = mode;
    setFar(Math.max(ownFar ?? camera.far, mode * 1.3));
  }
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
const RIDE_SPEED = map.ride.speed;
let held: { cam: THREE.Vector3; look: THREE.Vector3 } | null = null;
let ride: Ride | null = null;
let heldId = '';
const look = new THREE.Vector3(),
  ahead = new THREE.Vector3();
function pointAt(r: Ride, s: number, out: THREE.Vector3) {
  s = Math.max(0, Math.min(r.total, s));
  let i = 1;
  while (i < r.along.length - 1 && r.along[i]! < s) i++;
  const t = (s - r.along[i - 1]!) / Math.max(1e-6, r.along[i]! - r.along[i - 1]!);
  return out.copy(r.path[i - 1]!).lerp(r.path[i]!, t);
}
/** Review rides: named runs of lines (when the option has them), then every line on its own. */
const NAMED_ROUTES: { id: string; name: string; legs: string[] }[] = [
  {
    id: 'bell-before',
    name: 'Home to Bell Rock the long way (Line 2, pier, Ring Island, bay trestle)',
    legs: ['l2a', 'l2b', 'ringx', 'ring-bell'],
  },
  { id: 'bell-after', name: 'Home to Bell Rock by the bay shortcut', legs: ['bay-cut'] },
  { id: 'canopy-after', name: 'Home to Canopy Town after the shortcut', legs: ['bay-cut', 'bell-canopy'] },
  { id: 'port', name: 'Home to High Port through the sea cave', legs: ['seacave', 'salt-quay', 'lift'] },
  { id: 'wall', name: 'The White Wall line, High Port to High Gorge', legs: ['wall-s', 'wall-n'] },
  { id: 'ending', name: 'Home to The Boogler: shortcut and causeway', legs: ['bay-cut', 'final'] },
];
const ROUTES = [
  ...NAMED_ROUTES.filter((r) => r.legs.every((id) => box.lines.some((l) => l.id === id))),
  ...box.lines.filter((l) => l.stage !== 0).map((l) => ({ id: l.id, name: l.name, legs: [l.id] })),
];
function startRide(id: string, speed = 1) {
  const route = ROUTES.find((r) => r.id === id);
  if (!route) return false;
  const path: THREE.Vector3[] = [];
  for (const leg of route.legs)
    for (const p of box.lines.find((l) => l.id === leg)!.path) if (!path.at(-1)?.equals(p)) path.push(p);
  const along = [0];
  for (let i = 1; i < path.length; i++) along.push(along[i - 1]! + path[i]!.distanceTo(path[i - 1]!));
  const lens = route.legs.map((leg) => polyLen(map.lines.find((l) => l.id === leg)!.pts));
  ride = { name: route.name, path, along, total: along.at(-1)!, s: 0, speed, model: rideSeconds(map.ride, lens) };
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
  const at = id === 'home' ? ([-199, 10] as XZ) : placeAt(id);
  if (!body || !at) return false;
  const y = id === 'home' ? 3.6 : ground.deckOf(id, at);
  free();
  releaseInput();
  releaseJump();
  teleport(body, wx(at[0]), y + PLAYER_R + 0.6, wz(at[1]));
  body.velocity.set(0, 0, 0);
  body.angularVelocity.set(0, 0, 0);
  me.wish.set(0, 0, 0);
  waterField.invalidate('player');
  cam.yaw = me.yaw;
  return true;
}

// ---------------------------------------------------------------- labels
const labelRoot = document.createElement('div');
labelRoot.className = 'gbx-labels';
document.body.append(labelRoot);
const labels: { el: HTMLDivElement; at: THREE.Vector3 }[] = [];
for (const s of Object.values(box.spots)) {
  const el = document.createElement('div');
  el.className = `gbx-label gbx-${s.kind}`;
  const colour = s.stage != null ? STAGE_COLOURS[s.stage] : undefined;
  if (colour) el.style.borderColor = colour;
  el.append(s.label, document.createElement('small'));
  labelRoot.append(el);
  labels.push({ el, at: s.pos.clone().setY(s.pos.y + (s.kind === 'place' ? 34 : 12)) });
}
let labelsOn = q.get('labels') !== '0';
function setLabels(on: boolean) {
  labelsOn = on;
  labelRoot.hidden = !on;
  box.markers.visible = on;
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

// ---------------------------------------------------------------- the panel (inside .hud, so captures leave it out)
const panel = document.createElement('div');
panel.className = 'gbx-panel';
const readout = document.createElement('div');
readout.className = 'gbx-readout';
const section = (title: string) => {
  const s = document.createElement('details');
  const h = document.createElement('summary');
  h.textContent = title;
  s.append(h);
  panel.append(s);
  return s;
};
const button = (parent: HTMLElement, text: string, run: () => void, title = '') => {
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
};
{
  const head = document.createElement('div');
  head.className = 'gbx-head';
  head.textContent = `${map.option.name} greybox · pick ${pick === 'A' ? 'A (first branch)' : 'B (second branch)'}`;
  panel.append(head);
  const row = document.createElement('div');
  row.className = 'gbx-row';
  panel.append(row);
  button(row, 'Labels', () => setLabels(!labelsOn));
  const fogButton = button(row, '', () => {
    fogMode = fogMode === 'game' ? 1500 : fogMode === 1500 ? 'off' : 'game';
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
  for (const p of map.places) button(go, p.name, () => goTo(p.id));
  const rides = section(`Ride at ${RIDE_SPEED} m/s (x4 for review)`);
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
    readout.textContent = `${ride.name}: ${(ride.s / 1000).toFixed(2)} / ${(ride.total / 1000).toFixed(2)} km, ${mmss(ride.s / RIDE_SPEED)} of ${mmss(ride.total / RIDE_SPEED)} at ${RIDE_SPEED} m/s (x${ride.speed}); the model's ride with boarding and stops: ${mmss(ride.model)}`;
    return;
  }
  camera.getWorldDirection(ahead);
  look.copy(camera.position).addScaledVector(ahead, 100);
  readout.textContent = `${heldId ? `view ${heldId}` : 'follow camera'} · gbcam=${fmt(camera.position)}&gblook=${fmt(look)}`;
}

// ---------------------------------------------------------------- one late hook: fog, camera, motion, labels
defineKind('greybox', { lateUpdate: 1002 });
let clock = 0;
spawn({
  kind: 'greybox',
  lateUpdate({ dt }) {
    clock += dt;
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
    box.animate(dt, clock);
    drawLabels();
    drawReadout(dt);
  },
});

// window.__greybox drives the same from a look eval.
const api = {
  option: optionId,
  views: Object.keys(VIEWS),
  routes: ROUTES.map((r) => r.id),
  view: holdView,
  pose(at: [number, number, number], to: [number, number, number]) {
    free();
    held = { cam: new THREE.Vector3(...at), look: new THREE.Vector3(...to) };
    heldId = 'custom';
  },
  ride: startRide,
  go: goTo,
  free,
  labels: setLabels,
  fog(mode: string) {
    fogMode = parseFog(mode);
  },
  viewPose: (id: string) =>
    VIEWS[id] && { cam: VIEWS[id].cam.toArray(), look: VIEWS[id].look.toArray(), fog: VIEWS[id].fog },
  state: () => ({
    held: heldId,
    ride: ride && { s: ride.s, total: ride.total, model: ride.model },
    camera: camera.position.toArray(),
    fog: { near: (scene.fog as THREE.Fog).near, far: (scene.fog as THREE.Fog).far, cameraFar: camera.far },
  }),
};
(window as unknown as { __greybox: typeof api }).__greybox = api;
console.log('GREYBOX', JSON.stringify({ option: optionId, pick, views: api.views.length, routes: api.routes.length }));
