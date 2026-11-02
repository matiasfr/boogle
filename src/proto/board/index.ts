// The departures board prototype, v2 (docs/game-design/board.md; loaded by src/features/proto-board.ts behind ?proto=board).
// Only hubs are fast travel (docs/proposals/boogle-2.md, "Trains and the world"): the two ends of the line, Court (home,
// where the work starts) and Lighthouse (the line's far end, the place you lay track to reach), are hubs. A hub has the
// big split-flap departures board (station name, next departure, a line map with hubs, stops and the live wagon) and a
// HUB roundel on a mast you spot from afar. Interact on it opens one picker: another hub jumps you there; a stop shows
// when the next wagon leaves and highlights it to ride. Every other station is a stop with a minimal sign, reached by
// riding. Variants differ in that sign only:
//   &v=pole   (default) a small flap sign on one post: next wagon each way, counting down
//   &v=plaque a painted timetable plaque: a dial whose hand reaches a mark when the wagon leaves
// The wagon runs at the wagon prototype's fast pace (6.5 m/s): in a proto- room the board sets the room's tune on load.
// &laid=N shows N laid sections on this tab only (the board and the wagon are Local), to try 1 or 2 without hauling;
// in a proto- room a button lays the whole route for everyone (open.lay, src/world/rules/opening.ts).
// Everything here is Local: every tab computes the same board and wagon from the shared tick and the room's pace.
// Serves DESIGN.md 8 (Designed for drop-in, drop-out: a jump to the far end in a second) and 7 (Telegraph everything:
// the next wagon, its direction and the whole line, readable from the sign).
import './board.css';
import { rules } from '../../world/game-world.ts';
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { getAudio } from '../../render/audio.ts';
import { world, submitEdit, worldStatus } from '../../world/sync.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { getRoomId } from '../../netplay/net.ts';
import { registerInteractable, type Interactable } from '../../player/hands.ts';
import { openModal, closeModal } from '../../player/modal.ts';
import { menuSlot } from '../../player/controls.ts';
import { requestLock } from '../../player/input.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { me, cam } from '../../player/player.ts';
import { angleLerp } from '../../math.ts';
import { BODY, addBody, createBody, teleport, stepAlpha } from '../../physics/engine.ts';
import { NOT_SCENERY, groundMat } from '../../physics/physics.ts';
import { registerPlatform, yawOf, carry, type Platform } from '../../physics/platforms.ts';
import { ROUTE } from '../../sim/route.ts';
import { wagonAt, wagonCycle, type WagonPace } from '../../sim/wagon.ts';
import { isProtoRoom, paceIn } from '../../sim/tune.ts';
import { stationAt, nextCall, towards, dwells } from './departures.ts';
import { onVariant, protoV } from '../flags.ts';
import { protoCount } from '../count.ts';

const params = new URLSearchParams(location.search);
type StopLook = 'pole' | 'plaque';
const lookOf = (v: string): StopLook => (v === 'plaque' ? 'plaque' : 'pole');
let LOOK = lookOf(protoV('board'));
const LAID_OVERRIDE = params.has('laid') ? Math.max(0, Math.min(ROUTE.length, Number(params.get('laid')) | 0)) : -1;
const STATIONS = ROUTE.length + 1;
const NAMES = ['Court', 'Palm Walk', 'Ridge', 'Lighthouse'];
const nameOf = (k: number) => NAMES[k] ?? `Stop ${k + 1}`;
/** The hubs: the two ends of the line. Only these have the big board, and you jump only between them. */
const HUBS = [0, STATIONS - 1];
const isHub = (k: number) => HUBS.includes(k);

const laid = () => (LAID_OVERRIDE >= 0 ? LAID_OVERRIDE : rules.sites.sites.open);
const nowTick = () => sharedSeconds() * 10;
// The room's wagon pace (tuned in proto- rooms; this prototype asks for FAST_PACE on load, below).
const FAST_PACE: WagonPace = { cruise: 65, accel: 20 }; // the wagon prototype's v=fast (src/proto/wagon/index.ts)
const pace = () => paceIn(rules.tune.tune);
const fmt = (ticks: number) => {
  const s = Math.max(0, Math.ceil(ticks / 10));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Distance along the full route to each station, metres (for the line map).
const ALONG: number[] = [0];
for (let s = 0; s < ROUTE.length; s++) {
  const a = stationAt(s),
    b = stationAt(s + 1);
  ALONG.push(ALONG[s] + Math.hypot(b.x - a.x, b.z - a.z));
}
const TOTAL = ALONG[ALONG.length - 1];

// ---------------------------------------------------------------- split flaps
const FLAPS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:<>-.';
const FLIP_MS = 70;
type Cell = { shown: string; target: string; next: number; left: number }; // left: flaps to go
type Flaps = { cols: number; cells: Cell[][]; rowColor: string[] };
const makeFlaps = (rows: number, cols: number): Flaps => ({
  cols,
  cells: Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ shown: ' ', target: ' ', next: 0, left: 0 })),
  ),
  rowColor: Array.from({ length: rows }, () => '#ffd23f'),
});
type Row = { text: string; color: string };

function setRows(f: Flaps, rows: Row[], now: number) {
  f.cells.forEach((cells, r) => {
    const text = (rows[r]?.text ?? '').toUpperCase().padEnd(f.cols).slice(0, f.cols);
    f.rowColor[r] = rows[r]?.color ?? '#ffd23f';
    cells.forEach((cell, col) => {
      const ch = FLAPS.includes(text[col]) ? text[col] : ' ';
      if (cell.target === ch) return;
      cell.target = ch;
      cell.next = now;
      cell.left = /\d/.test(ch) && /\d/.test(cell.shown) ? 1 : 3; // a digit ticks over; a word riffles
    });
  });
}

// Steps every flipping cell one flap on; true while any still flips.
function flip(f: Flaps, now: number): boolean {
  let busy = false;
  for (const row of f.cells)
    for (const cell of row) {
      if (cell.shown === cell.target) continue;
      busy = true;
      if (now < cell.next) continue;
      cell.left--;
      cell.shown = cell.left > 0 ? FLAPS[(FLAPS.indexOf(cell.shown) + 7) % FLAPS.length] : cell.target;
      cell.next = now + FLIP_MS;
    }
  return busy;
}

// Draws the flaps: cells w x h with `gap` between, rows `rowGap` apart, from (x0, y0).
function drawFlaps(g: CanvasRenderingContext2D, f: Flaps, x0: number, y0: number, w: number, h: number, gap: number) {
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${Math.round(h * 0.78)}px ui-monospace, Menlo, Consolas, monospace`;
  f.cells.forEach((cells, r) =>
    cells.forEach((cell, col) => {
      const x = x0 + col * (w + gap),
        y = y0 + r * (h + gap * 2);
      g.fillStyle = '#25282f';
      g.fillRect(x, y, w, h);
      const moving = cell.shown !== cell.target;
      g.fillStyle = moving ? '#fff3c0' : f.rowColor[r];
      if (cell.shown !== ' ') {
        g.save();
        g.translate(x + w / 2, y + h / 2 + h * 0.05);
        if (moving) g.scale(1, 0.55);
        g.fillText(cell.shown, 0, 0);
        g.restore();
      }
      g.fillStyle = '#0b0c0f';
      g.fillRect(x, y + h / 2 - 1.5, w, 3); // the split
    }),
  );
}

// ---------------------------------------------------------------- sign parts
const BOARD_OFF = -5.6; // metres west of the station (clear of the Track ring), facing east towards the line
const postMat = new THREE.MeshStandardNodeMaterial({ color: '#5b4632', roughness: 0.9 });
const boardMat = new THREE.MeshStandardNodeMaterial({ color: '#23262d', roughness: 0.6 });
const capMat = new THREE.MeshStandardNodeMaterial({ color: '#c9452f', roughness: 0.7 });
const plankMat = new THREE.MeshStandardNodeMaterial({ color: '#8a6a45', roughness: 0.9 });
const mastMat = new THREE.MeshStandardNodeMaterial({ color: '#3a3d44', roughness: 0.6 });

type Face = { g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; w: number; h: number };
// A canvas face `mw` x `mh` metres, facing +x, its centre at (x, y, z) in `group`.
function addFace(group: THREE.Group, w: number, h: number, mw: number, mh: number, x: number, y: number, z = 0): Face {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), new THREE.MeshBasicNodeMaterial({ map: tex }));
  mesh.rotation.y = Math.PI / 2;
  mesh.position.set(x, y, z);
  group.add(mesh);
  return { g, tex, w, h };
}
function boxIn(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  group.add(m);
  return m;
}

// The HUB roundel, drawn once: a cream disc, a red ring and a dark bar reading HUB.
function roundelTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c9452f';
  g.beginPath();
  g.arc(128, 128, 126, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f4efe2';
  g.beginPath();
  g.arc(128, 128, 84, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#16181d';
  g.fillRect(8, 98, 240, 60);
  g.fillStyle = '#ffd23f';
  g.font = '900 52px Figtree, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('HUB', 128, 130);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const ROUNDEL = new THREE.MeshBasicNodeMaterial({ map: roundelTexture(), side: THREE.DoubleSide });

type Sign = {
  k: number;
  hub: boolean;
  group: THREE.Group;
  x: number;
  z: number;
  y: number;
  at: THREE.Vector3;
  drawnAt: number;
  face: Face; // the hub's board, or the stop's pole face
  flaps: Flaps;
  plaque: Face | null; // stops only
  pole: THREE.Group | null;
  plaqueGroup: THREE.Group | null;
};

// A hub: a wide board on two posts (face 4 x 2.25 m) under a red cap, and a 6 m mast with the HUB roundel beside it.
const HUB_FACE = { w: 1024, h: 576 };
function makeHub(group: THREE.Group) {
  for (const pz of [-2.2, 2.2]) boxIn(group, 0.16, 4, 0.16, postMat, -0.05, 2, pz);
  boxIn(group, 0.14, 2.5, 4.3, boardMat, 0, 2.75, 0);
  boxIn(group, 0.5, 0.16, 4.6, capMat, 0, 4.08, 0);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.6, 10), mastMat);
  mast.position.set(-0.1, 3.3, -3.1);
  mast.castShadow = true;
  group.add(mast);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.85, 40), ROUNDEL);
  disc.rotation.y = Math.PI / 2;
  disc.position.set(-0.1, 6.4, -3.1);
  group.add(disc);
  return addFace(group, HUB_FACE.w, HUB_FACE.h, 4, 2.25, 0.075, 2.75);
}

// A stop's pole: one post, a 1.6 x 0.75 m flap face on top, a thin red cap.
const POLE_FACE = { w: 512, h: 240 };
function makePole() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.2, 10), mastMat);
  post.position.set(-0.08, 1.1, 0);
  post.castShadow = true;
  g.add(post);
  boxIn(g, 0.12, 0.88, 1.72, boardMat, 0, 2.35, 0);
  boxIn(g, 0.3, 0.08, 1.8, capMat, 0, 2.82, 0);
  return { g, face: addFace(g, POLE_FACE.w, POLE_FACE.h, 1.6, 0.75, 0.065, 2.35) };
}

// A stop's plaque: a painted plank on two short posts, its face 1.6 x 0.95 m.
const PLAQUE_FACE = { w: 512, h: 304 };
function makePlaque() {
  const g = new THREE.Group();
  for (const pz of [-0.7, 0.7]) boxIn(g, 0.12, 1.6, 0.12, postMat, -0.06, 0.8, pz);
  boxIn(g, 0.1, 1.05, 1.75, plankMat, 0, 1.3, 0);
  return { g, face: addFace(g, PLAQUE_FACE.w, PLAQUE_FACE.h, 1.6, 0.95, 0.055, 1.3) };
}

function makeSign(k: number): Sign {
  const st = stationAt(k);
  const x = st.x + BOARD_OFF,
    z = st.z;
  const y = groundHeight(x, z);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  scene.add(group);
  const base = { k, group, x, z, y, at: new THREE.Vector3(), drawnAt: -1e9 };
  if (isHub(k))
    return {
      ...base,
      hub: true,
      face: makeHub(group),
      flaps: makeFlaps(2, 22),
      plaque: null,
      pole: null,
      plaqueGroup: null,
    };
  const pole = makePole(),
    plaque = makePlaque();
  group.add(pole.g, plaque.g);
  return {
    ...base,
    hub: false,
    face: pole.face,
    flaps: makeFlaps(2, 16),
    plaque: plaque.face,
    pole: pole.g,
    plaqueGroup: plaque.g,
  };
}
const signs = Array.from({ length: STATIONS }, (_, k) => makeSign(k));
function showLook() {
  for (const s of signs) {
    if (s.pole) s.pole.visible = LOOK === 'pole';
    if (s.plaqueGroup) s.plaqueGroup.visible = LOOK === 'plaque';
    s.drawnAt = -1e9;
  }
}
showLook();
onVariant('board', ['', 'pole', 'plaque'], (v) => {
  LOOK = lookOf(v);
  showLook();
}); // live, from the bar

// ---------------------------------------------------------------- what the signs say
// The far end the wagon heads for leaving `dir`, with `n` sections laid.
const endOf = (dir: 1 | -1, n: number) => (dir === 1 ? n : 0);
const NO_SERVICE: Row[] = [
  { text: 'NO SERVICE YET', color: '#ffd23f' },
  { text: 'LAY THE TRACK', color: '#9aa3ad' },
];

// A hub's two rows: the next departure (`> LIGHTHOUSE    0:42`, BOARDING while it stands here) and the stops it calls at.
function hubRows(k: number, n: number, tick: number, p: WagonPace): Row[] {
  if (n <= 0) return NO_SERVICE;
  const dir: 1 | -1 = k === 0 ? 1 : -1;
  const c = nextCall(n, k, dir, tick, p);
  if (!c) return NO_SERVICE;
  const end = endOf(dir, n);
  const head = `${dir === 1 ? '>' : '<'} ${nameOf(end).toUpperCase()}`.padEnd(13).slice(0, 13);
  const due = c.arrive <= 0 ? 'BOARDING' : fmt(c.arrive);
  const via: string[] = [];
  for (let s = k + dir; s !== end; s += dir) via.push(nameOf(s).toUpperCase());
  return [
    { text: head + due.padStart(9), color: c.arrive <= 0 ? '#8ff08f' : '#ffd23f' },
    { text: via.length ? `VIA ${via.join(' ')}` : 'DIRECT', color: '#cfd3da' },
  ];
}

// A stop's pole: one row each way, `>LIGHTHOUSE  0:42` (NOW while it stands here), the next to leave first.
function poleRows(k: number, n: number, tick: number, p: WagonPace): Row[] {
  if (n <= 0) return NO_SERVICE;
  const rows: (Row & { t: number })[] = [];
  for (const dir of [1, -1] as const) {
    const c = nextCall(n, k, dir, tick, p);
    if (!c) continue;
    const head = `${dir === 1 ? '>' : '<'}${nameOf(endOf(dir, n)).toUpperCase()}`.padEnd(11).slice(0, 11);
    const due = c.arrive <= 0 ? 'NOW' : fmt(c.arrive);
    rows.push({ text: head + due.padStart(5), color: c.arrive <= 0 ? '#8ff08f' : '#ffd23f', t: c.leave });
  }
  return rows.sort((a, b) => a.t - b.t);
}

function drawHub(s: Sign, n: number, wagonDist: number | null) {
  const { g } = s.face;
  const { w: W, h: H } = HUB_FACE;
  g.fillStyle = '#16181d';
  g.fillRect(0, 0, W, H);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillStyle = '#f4efe2';
  g.font = '800 68px Figtree, system-ui, sans-serif';
  g.fillText(nameOf(s.k).toUpperCase(), 30, 54);
  // the hub tag
  g.font = '800 30px Figtree, system-ui, sans-serif';
  const tag = 'HUB · FAST TRAVEL';
  const tw = g.measureText(tag).width + 36;
  g.fillStyle = '#c9452f';
  g.beginPath();
  g.roundRect(W - 30 - tw, 32, tw, 46, 23);
  g.fill();
  g.fillStyle = '#f4efe2';
  g.textAlign = 'center';
  g.fillText(tag, W - 30 - tw / 2, 56);
  // next departure
  drawFlaps(g, s.flaps, (W - 22 * 46) / 2 + 2, 104, 42, 78, 4);
  // the line map: the whole route, laid part solid, the rest dashed; hubs square, stops round; the wagon on it
  g.fillStyle = '#2c3038';
  g.fillRect(24, 296, W - 48, 3);
  const mx = (m: number) => 120 + (m / TOTAL) * (W - 240);
  const ly = 400;
  g.lineCap = 'round';
  g.lineWidth = 10;
  g.strokeStyle = '#3c414b';
  g.setLineDash([16, 18]);
  g.beginPath();
  g.moveTo(mx(ALONG[Math.max(0, n)]), ly);
  g.lineTo(mx(TOTAL), ly);
  g.stroke();
  g.setLineDash([]);
  if (n > 0) {
    g.strokeStyle = '#f4efe2';
    g.beginPath();
    g.moveTo(mx(0), ly);
    g.lineTo(mx(ALONG[n]), ly);
    g.stroke();
  }
  g.textAlign = 'center';
  for (let k = 0; k < STATIONS; k++) {
    const on = n > 0 && k <= n;
    const x = mx(ALONG[k]);
    const here = k === s.k;
    g.fillStyle = on || here ? '#f4efe2' : '#3c414b';
    g.strokeStyle = '#c9452f';
    g.lineWidth = 6;
    g.beginPath();
    if (isHub(k)) g.roundRect(x - 20, ly - 20, 40, 40, 8);
    else g.arc(x, ly, 12, 0, Math.PI * 2);
    g.fill();
    if (isHub(k)) g.stroke();
    if (here) {
      g.lineWidth = 5;
      g.beginPath();
      g.arc(x, ly, 32, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#c9452f';
      g.font = '800 24px Figtree, system-ui, sans-serif';
      g.fillText('YOU ARE HERE', x, ly - 54);
    }
    g.font = `${isHub(k) ? 800 : 600} 26px Figtree, system-ui, sans-serif`;
    g.fillStyle = on || here ? '#cfd3da' : '#4a505b';
    g.fillText(nameOf(k).toUpperCase(), x, ly + 52);
    if (isHub(k)) {
      g.font = '800 18px Figtree, system-ui, sans-serif';
      g.fillStyle = on || here ? '#e0705c' : '#4a505b';
      g.fillText('HUB', x, ly + 78);
    }
  }
  if (wagonDist !== null) {
    const x = mx(wagonDist);
    g.fillStyle = '#ffd23f';
    g.beginPath();
    g.roundRect(x - 24, ly - 16, 48, 32, 8);
    g.fill();
    g.fillStyle = '#16181d';
    g.fillRect(x - 14, ly - 8, 10, 10);
    g.fillRect(x + 4, ly - 8, 10, 10);
  }
  g.font = '700 24px Figtree, system-ui, sans-serif';
  g.fillStyle = '#9aa3ad';
  g.fillText(n > 0 ? 'E  ·  JUMP TO A HUB  ·  OR RIDE TO A STOP' : 'LAY THE TRACK TO OPEN THE LINE', W / 2, 540);
  s.face.tex.needsUpdate = true;
}

function drawPole(s: Sign) {
  const { g } = s.face;
  const { w: W, h: H } = POLE_FACE;
  g.fillStyle = '#16181d';
  g.fillRect(0, 0, W, H);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillStyle = '#f4efe2';
  g.font = '800 40px Figtree, system-ui, sans-serif';
  g.fillText(nameOf(s.k).toUpperCase(), 14, 34);
  g.textAlign = 'right';
  g.fillStyle = '#9aa3ad';
  g.font = '700 20px Figtree, system-ui, sans-serif';
  g.fillText('NEXT WAGON', W - 14, 36);
  drawFlaps(g, s.flaps, (W - 16 * 31) / 2 + 1, 70, 28, 70, 3);
  s.face.tex.needsUpdate = true;
}

const OUT = '#c9452f',
  BACK = '#2f6aa8';
// The plaque: painted name, a timetable dial (one turn is one round trip; a coloured band each way while the wagon
// stands here, its end the mark where it leaves; the hand is now), and which colour goes where.
function drawPlaque(s: Sign, n: number, tick: number, p: WagonPace) {
  const f = s.plaque!;
  const { g } = f;
  const { w: W, h: H } = PLAQUE_FACE;
  g.fillStyle = '#efe4c8';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#2a2620';
  g.lineWidth = 6;
  g.strokeRect(9, 9, W - 18, H - 18);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillStyle = '#2a2620';
  g.font = '800 44px Figtree, system-ui, sans-serif';
  g.fillText(nameOf(s.k).toUpperCase(), 28, 50);
  g.textAlign = 'right';
  g.fillStyle = OUT;
  g.font = '800 20px Figtree, system-ui, sans-serif';
  g.fillText('WAGON STOP', W - 28, 52);
  const cycle = wagonCycle(n, p);
  const cx = 112,
    cy = 186,
    r = 84;
  g.fillStyle = '#f8f1de';
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = '#2a2620';
  g.stroke();
  if (!cycle) {
    g.textAlign = 'left';
    g.fillStyle = '#2a2620';
    g.font = '700 26px Figtree, system-ui, sans-serif';
    g.fillText('NO SERVICE YET', 220, 186);
    f.tex.needsUpdate = true;
    return;
  }
  const ang = (t: number) => -Math.PI / 2 + (t / cycle) * Math.PI * 2;
  for (const d of dwells(n, p)) {
    if (d.stop !== s.k) continue;
    const col = d.dir === 1 ? OUT : BACK;
    g.strokeStyle = col;
    g.lineWidth = 16;
    g.lineCap = 'butt';
    g.beginPath();
    g.arc(cx, cy, r - 14, ang(d.start), ang(d.end));
    g.stroke();
    // the mark: where it leaves
    const a = ang(d.end);
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * (r - 30), cy + Math.sin(a) * (r - 30));
    g.lineTo(cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6));
    g.stroke();
  }
  let ph = tick % cycle;
  if (ph < 0) ph += cycle;
  const a = ang(ph);
  g.strokeStyle = '#2a2620';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18));
  g.stroke();
  g.fillStyle = '#2a2620';
  g.beginPath();
  g.arc(cx, cy, 9, 0, Math.PI * 2);
  g.fill();
  // the key
  g.textAlign = 'left';
  let y = 128;
  for (const dir of [1, -1] as const) {
    if (!nextCall(n, s.k, dir, tick, p)) continue;
    g.fillStyle = dir === 1 ? OUT : BACK;
    g.fillRect(222, y - 13, 30, 26);
    g.fillStyle = '#2a2620';
    g.font = '800 30px Figtree, system-ui, sans-serif';
    g.fillText(`TO ${nameOf(endOf(dir, n)).toUpperCase()}`, 264, y + 1);
    y += 46;
  }
  g.fillStyle = '#6b6252';
  g.font = '700 18px Figtree, system-ui, sans-serif';
  g.fillText('LEAVES WHEN THE HAND', 222, 228);
  g.fillText('HITS ITS MARK', 222, 250);
  g.fillText(`ROUND TRIP ${fmt(cycle)}`, 222, 272);
  f.tex.needsUpdate = true;
}

// ---------------------------------------------------------------- the greybox wagon (the real one replaces wagonLook)
const DECK = { hx: 1.1, hz: 1.8, hy: 0.15 };
const CLEARANCE = 0.45; // ground to the deck's centre: a hop up
function wagonLook() {
  const g = new THREE.Group();
  const mat = (color: string) => new THREE.MeshStandardNodeMaterial({ color, roughness: 0.8 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
  };
  box(DECK.hx * 2, DECK.hy * 2, DECK.hz * 2, mat('#9a7b55'), 0, 0, 0);
  const wheel = mat('#3a3a40');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.2, 0.5, 0.5, wheel, sx * 0.95, -0.3, sz * 1.2);
  const lamp = mat('#ffd23f');
  for (const sz of [-1, 1]) box(0.5, 0.3, 0.2, lamp, 0, 0.3, sz * (DECK.hz - 0.1)); // a lamp at each end
  return g;
}
const wagonMesh = wagonLook();
scene.add(wagonMesh);
const wagonBody = createBody({
  type: BODY.KINEMATIC,
  material: groundMat,
  mask: NOT_SCENERY,
  position: { x: 0, y: -50, z: 0 },
  shapes: [{ kind: 'box', hx: DECK.hx, hz: DECK.hz, hy: DECK.hy }],
});
addBody(wagonBody);

// The deck follows wagonAt on a clock of its own, stepped with physics and pulled gently onto shared time, so the
// fixed steps of one frame never all land on the same instant.
let clock = sharedSeconds(),
  yaw = 0,
  prevYaw = 0,
  deckY = -50,
  live: ReturnType<typeof wagonAt> = null;
function deckHeight(x: number, z: number, yw: number) {
  let h = -Infinity;
  const c = Math.cos(yw),
    s = Math.sin(yw);
  for (const [a, b] of [
    [0, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const ox = a * DECK.hx,
      oz = b * DECK.hz;
    h = Math.max(h, groundHeight(x + ox * c + oz * s, z - ox * s + oz * c));
  }
  return h + CLEARANCE;
}
const platform: Platform = {
  body: wagonBody,
  hx: DECK.hx,
  hz: DECK.hz,
  top: DECK.hy,
  move(dt) {
    clock += dt;
    const err = sharedSeconds() - clock;
    clock += Math.abs(err) > 1 ? err : err * 0.05;
    const n = laid();
    live = wagonAt(n, clock * 10, 0, pace());
    const b = wagonBody;
    prevYaw = yawOf(b.quaternion);
    if (!live) {
      teleport(b, 0, -50, 0);
      b.velocity.set(0, 0, 0);
      return;
    }
    // The deck is the same both ways: keep its axis on the line and turn the short way (only at a corner).
    let want = Math.atan2(live.dx, live.dz);
    if (Math.abs(angleLerp(yaw, want, 1) - yaw) > Math.PI / 2) want += Math.PI;
    const turn = angleLerp(yaw, want, 1) - yaw;
    yaw += Math.sign(turn) * Math.min(Math.abs(turn), 0.9 * dt);
    const ty = deckHeight(live.x, live.z, yaw);
    const jump = Math.hypot(live.x - b.position.x, live.z - b.position.z) > 3;
    deckY = jump ? ty : deckY + (ty - deckY) * Math.min(1, dt * 4);
    if (jump) {
      // a new timetable (laid changed) or the first step: put it there
      teleport(b, live.x, deckY, live.z);
      b.velocity.set(0, 0, 0);
      b.angularVelocity.set(0, 0, 0);
      b.quaternion.set(0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2));
      prevYaw = yaw;
      return;
    }
    b.velocity.set((live.x - b.position.x) / dt, (deckY - b.position.y) / dt, (live.z - b.position.z) / dt);
    b.angularVelocity.set(0, (angleLerp(prevYaw, yaw, 1) - prevYaw) / dt, 0);
  },
};
registerPlatform(platform);
const onDeck = () => carry.on === platform;

// ---------------------------------------------------------------- ride to a stop: which wagon, and where to get off
const beaconMat = new THREE.MeshBasicNodeMaterial({
  color: '#ffd23f',
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
});
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 14, 12, 1, true), beaconMat);
const arrow = new THREE.Mesh(
  new THREE.ConeGeometry(0.55, 0.9, 4),
  new THREE.MeshBasicNodeMaterial({ color: '#ffd23f' }),
);
arrow.rotation.x = Math.PI;
const goalMat = new THREE.MeshBasicNodeMaterial({
  color: '#8ff08f',
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
});
const goal = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 10, 24, 1, true), goalMat);
for (const m of [beacon, arrow, goal]) {
  m.visible = false;
  m.renderOrder = 5;
  scene.add(m);
}

type Plan = { from: number; to: number; at: number; phase: 'catch' | 'aboard' | 'arrived'; doneAt: number };
let plan: Plan | null = null;
const hud = document.createElement('div');
hud.className = 'board-plan';
hud.hidden = true;
(document.querySelector('.hud') ?? document.body).append(hud);

function nearestStation(x: number, z: number, n: number) {
  let best = 0,
    bd = Infinity;
  for (let k = 0; k <= n; k++) {
    const s = stationAt(k);
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < bd) [best, bd] = [k, d];
  }
  return { k: best, d: bd };
}

function updatePlan(now: number) {
  const n = laid();
  if (!plan || plan.to > n || !me.body) {
    hud.hidden = true;
    beacon.visible = arrow.visible = goal.visible = false;
    if (plan && plan.to > n) plan = null;
    return;
  }
  const p = me.body.interpolatedPosition;
  const dest = stationAt(plan.to);
  const stops = Math.abs(plan.to - plan.from);
  if (plan.phase !== 'arrived') {
    if (onDeck()) plan.phase = 'aboard';
    else if (Math.hypot(p.x - dest.x, p.z - dest.z) < 7 && plan.phase === 'aboard') {
      plan.phase = 'arrived';
      plan.doneAt = now;
    } else if (plan.phase === 'aboard') {
      // got off somewhere else: catch it again from wherever that is
      plan.from = nearestStation(p.x, p.z, n).k;
      plan.phase = plan.from === plan.to ? 'arrived' : 'catch';
      plan.doneAt = now;
    }
  }
  let html: string;
  if (plan.phase === 'catch') {
    const dir = towards(plan.from, plan.to);
    const c = nextCall(n, plan.from, dir, nowTick(), pace());
    const end = nameOf(dir === 1 ? n : 0);
    html = c
      ? `<small>Catch the wagon towards ${end} at ${nameOf(plan.from)}</small>${c.arrive <= 0 ? `Boarding — leaves in ${fmt(c.leave)}` : `Due in ${fmt(c.arrive)}`}`
      : `<small>No wagon from ${nameOf(plan.from)}</small>`;
  } else if (plan.phase === 'aboard') {
    const here = live && live.stop === plan.to;
    const left = live
      ? Math.max(0, Math.abs(plan.to - (live.stop >= 0 ? live.stop : nearestStation(live.x, live.z, n).k)))
      : stops;
    html = here
      ? `<small>${nameOf(plan.to)}</small>Get off here!`
      : `<small>Riding to ${nameOf(plan.to)}</small>${left} stop${left === 1 ? '' : 's'} to go`;
  } else {
    html = `<small>Arrived</small>${nameOf(plan.to)} · ${fmt((now - plan.at) / 100)}`;
    if (now - plan.doneAt > 4000) plan = null;
  }
  hud.innerHTML = html;
  hud.hidden = !plan;
  hud.className = `board-plan${plan?.phase === 'aboard' && live?.stop === plan.to ? ' board-go' : ''}`;
  const showBeacon = !!plan && plan.phase === 'catch' && !!live;
  beacon.visible = arrow.visible = showBeacon;
  if (showBeacon) {
    const w = wagonMesh.position;
    beacon.position.set(w.x, w.y + 7.2, w.z);
    arrow.position.set(w.x, w.y + 2 + Math.sin(now / 220) * 0.25, w.z);
    arrow.rotation.y = now / 600;
  }
  goal.visible = !!plan && plan.phase !== 'arrived' && Math.hypot(p.x - dest.x, p.z - dest.z) > 9; // not round the camera
  if (goal.visible) goal.position.set(dest.x, groundHeight(dest.x, dest.z) + 5, dest.z);
}

// ---------------------------------------------------------------- jump between hubs: a whoosh, a fade, and you are there
const fade = document.createElement('div');
fade.className = 'board-fade';
const toast = document.createElement('div');
toast.className = 'board-toast';
toast.hidden = true;
document.body.append(fade);
(document.querySelector('.hud') ?? document.body).append(toast);
let hopping = false;

export function whoosh() {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const len = Math.floor(ctx.sampleRate * 0.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  const t = ctx.currentTime;
  bp.frequency.setValueAtTime(260, t);
  bp.frequency.exponentialRampToValueAtTime(2600, t + 0.22);
  bp.frequency.exponentialRampToValueAtTime(500, t + 0.5);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  src.connect(bp).connect(gain).connect(out);
  src.start(t);
  src.stop(t + 0.5);
}

function puff(x: number, y: number, z: number) {
  const color = new THREE.Color('#fff3c0');
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    emit({
      x,
      y,
      z,
      vx: Math.cos(a) * 3,
      vy: 1 + Math.random() * 2,
      vz: Math.sin(a) * 3,
      life: 0.6,
      size: 0.25,
      color,
    });
  }
}

// Where you arrive: in front of the hub's board, facing it (so the first thing you read is where you are).
function arrival(k: number) {
  const s = signs[k];
  const x = s.x + 4.6,
    z = s.z + 2.4;
  return { x, z, y: groundHeight(x, z), yaw: Math.atan2(x - s.x, z - s.z) };
}

function hop(k: number) {
  if (hopping || !me.body) return;
  hopping = true;
  const from = me.body.position;
  puff(from.x, from.y, from.z);
  whoosh();
  fade.classList.add('on');
  setTimeout(() => {
    if (me.body) {
      const a = arrival(k);
      teleport(me.body, a.x, a.y + 1, a.z);
      me.body.velocity.set(0, 0, 0);
      me.yaw = cam.yaw = a.yaw; // facing the board, a little from the side: the camera stays clear of its posts
      puff(a.x, a.y + 0.6, a.z);
    }
    toast.textContent = nameOf(k);
    toast.hidden = false;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    fade.classList.remove('on');
    hopping = false;
    setTimeout(() => (toast.hidden = true), 1800);
  }, 200);
}

// ---------------------------------------------------------------- the picker (hubs only)
const pick = document.createElement('div');
pick.className = 'board-pick';
pick.hidden = true;
document.body.append(pick);
let pickFrom = -1;
let buttons: HTMLButtonElement[] = [];

/** From hub `from`: another open hub jumps you there; a stop sets the ride plan (catch the wagon, get off there). */
function choose(k: number) {
  const from = pickFrom;
  closePicker();
  if (k === from || from < 0) return;
  protoCount('trips', 1, 'board');
  if (isHub(k)) hop(k);
  else plan = { from, to: k, at: performance.now(), phase: 'catch', doneAt: 0 };
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
// What a row of the picker says, and whether it can be picked.
function entry(from: number, to: number, n: number): { tag: string; text: string; ok: boolean } {
  if (to === from) return { tag: 'here', text: 'You are here', ok: false };
  if (to > n) return { tag: isHub(to) ? 'hub' : 'stop', text: 'Opens when the line reaches it', ok: false };
  if (isHub(to)) return { tag: 'hub', text: 'Jump there now', ok: true };
  const dir = towards(from, to);
  const c = nextCall(n, from, dir, nowTick(), pace());
  if (!c) return { tag: 'stop', text: 'No wagon from here', ok: false };
  const when = c.arrive <= 0 ? `boarding now, leaves in ${fmt(c.leave)}` : `next wagon in ${fmt(c.arrive)}`;
  return { tag: 'stop', text: `Ride: ${when} · ${plural(Math.abs(to - from), 'stop')}`, ok: true };
}

function openPicker(k: number) {
  if (!openModal({ onKey, onPad })) return;
  pickFrom = k;
  const n = laid();
  pick.innerHTML = '';
  const head = document.createElement('header');
  head.innerHTML = `<small>${nameOf(k)} · hub</small>Where to?`;
  const list = document.createElement('div');
  list.className = 'board-pick-list';
  buttons = [];
  for (let to = 0; to < STATIONS; to++) {
    const e = entry(k, to, n);
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.to = String(to);
    b.dataset.kind = e.tag;
    b.disabled = !e.ok;
    b.innerHTML = `<b>${to + 1}. ${nameOf(to)}<i>${e.tag === 'here' ? 'hub' : e.tag}</i></b><span>${e.text}</span>`;
    b.addEventListener('click', () => choose(to));
    list.append(b);
    buttons.push(b);
  }
  const foot = document.createElement('footer');
  foot.textContent = 'Hubs jump · stops are reached by wagon · Esc to close';
  pick.append(head, list, foot);
  pick.hidden = false;
  buttons.find((b) => !b.disabled)?.focus();
}
function closePicker() {
  if (pick.hidden) return;
  pick.hidden = true;
  pickFrom = -1;
  closeModal();
  requestLock();
}
function move(d: number) {
  const open = buttons.filter((b) => !b.disabled);
  const i = open.indexOf(document.activeElement as HTMLButtonElement);
  open[(i + d + open.length) % open.length]?.focus();
}
function onKey(e: KeyboardEvent) {
  if (e.code === 'Escape' || e.code === 'KeyE') closePicker();
  else if (e.code === 'ArrowDown' || e.code === 'KeyS') move(1);
  else if (e.code === 'ArrowUp' || e.code === 'KeyW') move(-1);
  else if (e.code === 'Enter' || e.code === 'Space') (document.activeElement as HTMLElement | null)?.click();
  else if (/^Digit[1-9]$/.test(e.code)) buttons[Number(e.code.slice(5)) - 1]?.click();
  e.preventDefault();
}
function onPad(slot: string) {
  if (slot === 'up') move(-1);
  else if (slot === 'down') move(1);
  else if (slot === menuSlot('confirm')) (document.activeElement as HTMLElement | null)?.click();
  else if (slot === menuSlot('back')) closePicker();
}

// ---------------------------------------------------------------- interact on a sign
const REACH = 3.6; // metres from a hub board's face (2.6 from a stop's)
registerInteractable(() => {
  if (!me.body || !pick.hidden) return [];
  const n = laid();
  const p = me.body.interpolatedPosition;
  const out: Interactable[] = [];
  for (const s of signs) {
    if (!s.group.visible) continue;
    if (Math.hypot(p.x - (s.x + 1.2), p.z - s.z) > (s.hub ? REACH : 2.6)) continue;
    s.at.set(s.x + 0.3, s.y + (s.hub ? 1.4 : 1.2), s.z);
    if (!s.hub) {
      out.push({ id: `board-${s.k}`, verb: 'Stop', at: s.at, blocked: 'Ride the wagon to a hub to jump' });
      continue;
    }
    const t = { id: `board-${s.k}`, verb: 'Departures', at: s.at };
    out.push(n > 0 ? { ...t, run: () => openPicker(s.k) } : { ...t, blocked: 'No track laid yet' });
  }
  return out;
});

// ---------------------------------------------------------------- the solo shortcut, and the room's pace
const proto = document.createElement('div');
proto.className = 'board-proto';
const layBtn = document.createElement('button');
layBtn.type = 'button';
layBtn.textContent = 'Lay the whole route';
const note = document.createElement('span');
proto.append(layBtn, note);
(document.querySelector('.hud') ?? document.body).append(proto);
const protoRoom = isProtoRoom(getRoomId());
layBtn.addEventListener('click', () => submitEdit({ op: 'open.lay', i: 0, j: 0 }));
let paced = false;
// The fast pace for the whole room, once its state is here (proto- rooms only; tune.set, src/world/rules/tune.ts).
function setPace() {
  if (paced || !protoRoom || !worldStatus().ready || world.tick <= 0) return;
  paced = true;
  const { v } = rules.tune.tune;
  if (v.wagonCruise !== FAST_PACE.cruise)
    submitEdit({ op: 'tune.set', i: 0, j: 0, key: 'wagonCruise', v: FAST_PACE.cruise });
  if (v.wagonAccel !== FAST_PACE.accel)
    submitEdit({ op: 'tune.set', i: 0, j: 0, key: 'wagonAccel', v: FAST_PACE.accel });
}

// ---------------------------------------------------------------- per frame
const DRAW_MS = 100;
onFrame(
  ({ now }) => {
    setPace();
    const n = laid();
    const p = pace();
    const tick = nowTick();
    const w = wagonAt(n, tick, 0, p);
    const cam3 = me.body?.interpolatedPosition;
    for (const s of signs) {
      s.group.visible = s.k === 0 || s.k <= n;
      if (!s.group.visible) continue;
      if (cam3 && Math.hypot(cam3.x - s.x, cam3.z - s.z) > 90) continue; // too far to read
      const plaque = !s.hub && LOOK === 'plaque';
      let busy = false;
      if (!plaque) {
        setRows(s.flaps, s.hub ? hubRows(s.k, n, tick, p) : poleRows(s.k, n, tick, p), now);
        busy = flip(s.flaps, now);
      }
      if (now - s.drawnAt < (busy ? FLIP_MS : DRAW_MS)) continue;
      s.drawnAt = now;
      if (s.hub) drawHub(s, n, w ? w.dist / 100 : null);
      else if (plaque) drawPlaque(s, n, tick, p);
      else drawPole(s);
    }
    // the wagon's look follows its body
    const ip = wagonBody.interpolatedPosition;
    wagonMesh.visible = !!live;
    wagonMesh.position.set(ip.x, ip.y, ip.z);
    wagonMesh.rotation.y = angleLerp(prevYaw, yawOf(wagonBody.quaternion), stepAlpha());
    updatePlan(now);
    const all = rules.sites.sites.open >= ROUTE.length;
    layBtn.disabled = !protoRoom || all;
    note.textContent = !protoRoom ? 'needs ?room=proto-board' : LAID_OVERRIDE >= 0 ? `showing &laid=${n}` : '';
    proto.hidden = all && LAID_OVERRIDE < 0;
  },
  { phase: 'update', order: 37 },
);

// Console and look evals: jump or open the picker at a hub, ride plans, the wagon.
Object.assign(window, {
  __board: {
    look: () => LOOK,
    HUBS,
    signs,
    hop,
    openPicker,
    closePicker,
    choose,
    arrival,
    wagonBody,
    laid,
    pace,
    plan: () => plan,
    nextCall,
  },
});
