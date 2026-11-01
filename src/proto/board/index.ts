// The departures board prototype (docs/game-design/board.md; loaded by src/features/board.ts behind ?proto=board).
// Stations are the fast-travel board (docs/proposals/boogle-2.md): at each laid station a greybox sign with a split-flap
// display shows the timetabled wagon's next calls (./departures.ts over wagonAt) and a line map with the wagon on it.
// Interact on the sign opens a picker of the other laid stations:
//   &v=hop  (default) you travel there at once, behind a quick whoosh and fade
//   &v=ride the picker says which wagon to catch (which way, how soon, how many stops) and highlights it; no teleport,
//           so riding is the travel. A greybox wagon you can stand on runs the timetable in both variants.
// &laid=N shows N laid sections on this tab only (the board and the wagon are Local), to try 1 or 2 without hauling;
// in a proto- room a button lays the whole route for everyone (open.lay, src/world/rules/opening.ts).
// Everything here is Local: every tab computes the same board and wagon from the shared tick, nothing is sent.
// Serves DESIGN.md 8 (Designed for drop-in, drop-out: anyone gets anywhere on the line in seconds) and 7 (Telegraph
// everything: the next wagon, its direction and the whole line, readable from the sign).
import './board.css';
import { rules } from '../../world/game-world.ts';
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { getAudio } from '../../render/audio.ts';
import { submitEdit } from '../../world/sync.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { getRoomId } from '../../netplay/net.ts';
import { registerInteractable, type Interactable } from '../../player/hands.ts';
import { openModal, closeModal } from '../../player/modal.ts';
import { requestLock } from '../../player/input.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { me, cam } from '../../player/player.ts';
import { angleLerp } from '../../math.ts';
import { BODY, addBody, createBody, teleport, stepAlpha } from '../../physics/engine.ts';
import { NOT_SCENERY, groundMat } from '../../physics/physics.ts';
import { registerPlatform, yawOf, carry, type Platform } from '../../physics/platforms.ts';
import { ROUTE } from '../../sim/route.ts';
import { wagonAt } from '../../sim/wagon.ts';
import { isProtoRoom } from '../../sim/tune.ts';
import { stationAt, nextCall, towards } from './departures.ts';

const params = new URLSearchParams(location.search);
const VARIANT = params.get('v') === 'ride' ? 'ride' : 'hop';
const LAID_OVERRIDE = params.has('laid') ? Math.max(0, Math.min(ROUTE.length, Number(params.get('laid')) | 0)) : -1;
const STATIONS = ROUTE.length + 1;
const NAMES = ['Court', 'Palm Walk', 'Ridge', 'Lighthouse'];
const nameOf = (k: number) => NAMES[k] ?? `Stop ${k + 1}`;

const laid = () => (LAID_OVERRIDE >= 0 ? LAID_OVERRIDE : rules.sites.sites.open);
const nowTick = () => sharedSeconds() * 10;
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

// ---------------------------------------------------------------- the sign: posts, a board, a canvas face
const BOARD_OFF = -5.6; // metres west of the station (clear of the Track ring), facing east towards the line
const W = 1024,
  H = 512;
const COLS = 20,
  ROWS = 2;
const CELL = { w: 46, h: 92, gap: 4, x0: (W - COLS * 50) / 2 + 2, y0: 106 };
const FLAPS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:<>-.';
const FLIP_MS = 70;

type Cell = { shown: string; target: string; next: number; left: number }; // left: flaps to go
type Sign = {
  k: number;
  group: THREE.Group;
  g: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  cells: Cell[][];
  rowColor: string[];
  drawnAt: number;
  x: number;
  z: number;
  y: number;
  at: THREE.Vector3;
};

const postMat = new THREE.MeshStandardNodeMaterial({ color: '#5b4632', roughness: 0.9 });
const boardMat = new THREE.MeshStandardNodeMaterial({ color: '#23262d', roughness: 0.6 });
const capMat = new THREE.MeshStandardNodeMaterial({ color: '#c9452f', roughness: 0.7 });

function makeSign(k: number): Sign {
  const st = stationAt(k);
  const x = st.x + BOARD_OFF,
    z = st.z;
  const y = groundHeight(x, z);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const box = (w: number, h: number, d: number, mat: THREE.Material, px: number, py: number, pz: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  };
  for (const pz of [-1.6, 1.6]) box(0.16, 3.4, 0.16, postMat, -0.05, 1.7, pz);
  box(0.14, 1.85, 3.5, boardMat, 0, 2.3, 0); // the board, its face 3.2 x 1.6 m
  box(0.5, 0.14, 3.8, capMat, 0, 3.3, 0); // a red cap, so you spot it from afar
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicNodeMaterial({ map: tex }));
  face.rotation.y = Math.PI / 2; // faces +x
  face.position.set(0.075, 2.3, 0);
  group.add(face);
  scene.add(group);
  const cells = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ shown: ' ', target: ' ', next: 0, left: 0 })),
  );
  return { k, group, g, tex, cells, rowColor: ['#ffd23f', '#ffd23f'], drawnAt: -1e9, x, z, y, at: new THREE.Vector3() };
}
const signs = Array.from({ length: STATIONS }, (_, k) => makeSign(k));

// One departure row: an arrow and where it goes, then when.
function departureRows(k: number, n: number, tick: number): { text: string; color: string }[] {
  if (n <= 0)
    return [
      { text: 'NO SERVICE YET', color: '#ffd23f' },
      { text: 'LAY THE TRACK', color: '#9aa3ad' },
    ];
  const rows: { text: string; color: string }[] = [];
  for (const dir of [1, -1] as const) {
    const c = nextCall(n, k, dir, tick);
    if (!c) continue;
    const end = dir === 1 ? n : 0;
    const head = `${dir === 1 ? '>' : '<'} ${nameOf(end).toUpperCase()}`.padEnd(12).slice(0, 12);
    const due = c.arrive <= 0 ? 'BOARDING' : fmt(c.arrive);
    rows.push({ text: head + due.padStart(8), color: c.arrive <= 0 ? '#8ff08f' : '#ffd23f' });
  }
  rows.sort((a, b) => (a.text.endsWith('BOARDING') ? -1 : b.text.endsWith('BOARDING') ? 1 : 0));
  return rows;
}

function setRows(s: Sign, rows: { text: string; color: string }[], now: number) {
  for (let r = 0; r < ROWS; r++) {
    const text = (rows[r]?.text ?? '').toUpperCase().padEnd(COLS).slice(0, COLS);
    s.rowColor[r] = rows[r]?.color ?? '#ffd23f';
    for (let col = 0; col < COLS; col++) {
      const cell = s.cells[r][col];
      const ch = FLAPS.includes(text[col]) ? text[col] : ' ';
      if (cell.target !== ch) {
        cell.target = ch;
        cell.next = now;
        cell.left = /\d/.test(ch) && /\d/.test(cell.shown) ? 1 : 3; // a digit ticks over; a word riffles
      }
    }
  }
}

// Steps every flipping cell one flap on; true while any still flips.
function flip(s: Sign, now: number): boolean {
  let busy = false;
  for (const row of s.cells)
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

function draw(s: Sign, n: number, wagonDist: number | null) {
  const g = s.g;
  g.fillStyle = '#16181d';
  g.fillRect(0, 0, W, H);
  // header: the station, and what this is
  g.fillStyle = '#f4efe2';
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.font = '800 64px Figtree, system-ui, sans-serif';
  g.fillText(nameOf(s.k).toUpperCase(), 28, 52);
  g.textAlign = 'right';
  g.font = '700 30px Figtree, system-ui, sans-serif';
  g.fillStyle = '#9aa3ad';
  g.fillText(VARIANT === 'ride' ? 'DEPARTURES · RIDE' : 'DEPARTURES · E TO TRAVEL', W - 28, 54);
  // the flaps
  g.textAlign = 'center';
  g.font = '700 70px ui-monospace, Menlo, Consolas, monospace';
  for (let r = 0; r < ROWS; r++)
    for (let col = 0; col < COLS; col++) {
      const cell = s.cells[r][col];
      const x = CELL.x0 + col * (CELL.w + CELL.gap),
        y = CELL.y0 + r * (CELL.h + 10);
      g.fillStyle = '#25282f';
      g.fillRect(x, y, CELL.w, CELL.h);
      const moving = cell.shown !== cell.target;
      g.fillStyle = moving ? '#fff3c0' : s.rowColor[r];
      if (cell.shown !== ' ') {
        g.save();
        g.translate(x + CELL.w / 2, y + CELL.h / 2 + 4);
        if (moving) g.scale(1, 0.55);
        g.fillText(cell.shown, 0, 0);
        g.restore();
      }
      g.fillStyle = '#0b0c0f';
      g.fillRect(x, y + CELL.h / 2 - 1.5, CELL.w, 3); // the split
    }
  // the line map: the whole route, laid part solid, the rest dashed; this station ringed; the wagon on it
  const mx = (m: number) => 110 + (m / TOTAL) * (W - 220);
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
  g.font = '700 26px Figtree, system-ui, sans-serif';
  for (let k = 0; k < STATIONS; k++) {
    const on = n > 0 && k <= n;
    const x = mx(ALONG[k]);
    g.fillStyle = on ? '#f4efe2' : '#3c414b';
    g.beginPath();
    g.arc(x, ly, k === s.k ? 18 : 13, 0, Math.PI * 2);
    g.fill();
    if (k === s.k) {
      g.lineWidth = 6;
      g.strokeStyle = '#c9452f';
      g.stroke();
      g.fillStyle = '#c9452f';
      g.fillText('YOU ARE HERE', x, ly - 44);
    }
    g.fillStyle = on ? '#cfd3da' : '#4a505b';
    g.fillText(nameOf(k).toUpperCase(), x, ly + 52);
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
  s.tex.needsUpdate = true;
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
    live = wagonAt(n, clock * 10);
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

// ---------------------------------------------------------------- ride: which wagon, and where to get off
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
    const c = nextCall(n, plan.from, dir, nowTick());
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

// ---------------------------------------------------------------- hop: a whoosh, a fade, and you are there
const fade = document.createElement('div');
fade.className = 'board-fade';
const toast = document.createElement('div');
toast.className = 'board-toast';
toast.hidden = true;
document.body.append(fade);
(document.querySelector('.hud') ?? document.body).append(toast);
let hopping = false;

function whoosh() {
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

// Where you arrive: in front of the station's sign, facing it (so the first thing you read is where you are).
function arrival(k: number) {
  const s = signs[k];
  const x = s.x + 2.6,
    z = s.z + 2.6;
  return { x, z, y: groundHeight(x, z) };
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
      me.yaw = cam.yaw = Math.PI / 4; // facing the sign, half from the side: the camera stays clear of its posts
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

// ---------------------------------------------------------------- the picker
const pick = document.createElement('div');
pick.className = 'board-pick';
pick.hidden = true;
document.body.append(pick);
let pickFrom = -1;
let buttons: HTMLButtonElement[] = [];

function choose(k: number) {
  const from = pickFrom;
  closePicker();
  if (k === from) return;
  if (VARIANT === 'hop') hop(k);
  else plan = { from, to: k, at: performance.now(), phase: 'catch', doneAt: 0 };
}

function detail(from: number, to: number, n: number) {
  if (VARIANT === 'hop') return `${Math.abs(to - from)} stop${Math.abs(to - from) === 1 ? '' : 's'} · travel now`;
  const dir = towards(from, to);
  const c = nextCall(n, from, dir, nowTick());
  if (!c) return '';
  const end = nameOf(dir === 1 ? n : 0);
  const when = c.arrive <= 0 ? `boarding, leaves ${fmt(c.leave)}` : `in ${fmt(c.arrive)}`;
  return `${dir === 1 ? '▶' : '◀'} wagon towards ${end} ${when} · ${Math.abs(to - from)} stop${Math.abs(to - from) === 1 ? '' : 's'}`;
}

function openPicker(k: number) {
  if (!openModal({ onKey, onPad })) return;
  pickFrom = k;
  const n = laid();
  pick.innerHTML = '';
  const head = document.createElement('header');
  head.innerHTML = `<small>${VARIANT === 'hop' ? 'Travel from' : 'Ride from'}</small>${nameOf(k)}`;
  const list = document.createElement('div');
  list.className = 'board-pick-list';
  buttons = [];
  for (let to = 0; to <= n; to++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.to = String(to);
    b.disabled = to === k;
    b.innerHTML = `<b>${to + 1}. ${nameOf(to)}</b><span>${to === k ? 'you are here' : detail(k, to, n)}</span>`;
    b.addEventListener('click', () => choose(to));
    list.append(b);
    buttons.push(b);
  }
  const foot = document.createElement('footer');
  foot.textContent = 'Esc to close';
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
  const live = buttons.filter((b) => !b.disabled);
  const i = live.indexOf(document.activeElement as HTMLButtonElement);
  live[(i + d + live.length) % live.length]?.focus();
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
  else if (slot === 'a') (document.activeElement as HTMLElement | null)?.click();
  else if (slot === 'b') closePicker();
}

// ---------------------------------------------------------------- interact on a sign
const REACH = 3.4; // metres from the sign's face
registerInteractable(() => {
  if (!me.body || !pick.hidden) return [];
  const n = laid();
  const p = me.body.interpolatedPosition;
  const out: Interactable[] = [];
  for (const s of signs) {
    if (!s.group.visible) continue;
    const fx = s.x + 1,
      fz = s.z;
    if (Math.hypot(p.x - fx, p.z - fz) > REACH) continue;
    s.at.set(s.x + 0.3, s.y + 1.4, s.z);
    const t = { id: `board-${s.k}`, verb: 'Departures', at: s.at };
    out.push(n > 0 ? { ...t, run: () => openPicker(s.k) } : { ...t, blocked: 'No track laid yet' });
  }
  return out;
});

// ---------------------------------------------------------------- the solo shortcut
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

// ---------------------------------------------------------------- per frame
const DRAW_MS = 70;
onFrame(
  ({ now }) => {
    const n = laid();
    const tick = nowTick();
    const w = wagonAt(n, tick);
    const cam3 = me.body?.interpolatedPosition;
    for (const s of signs) {
      s.group.visible = s.k === 0 || s.k <= n;
      if (!s.group.visible) continue;
      if (cam3 && Math.hypot(cam3.x - s.x, cam3.z - s.z) > 90) continue; // too far to read
      setRows(s, departureRows(s.k, n, tick), now);
      const busy = flip(s, now);
      if (now - s.drawnAt < (busy ? FLIP_MS : DRAW_MS)) continue;
      s.drawnAt = now;
      draw(s, n, w ? w.dist / 100 : null);
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

// Console and look evals: hop or open the picker at a station, ride plans, the wagon.
Object.assign(window, {
  __board: {
    VARIANT,
    signs,
    hop,
    openPicker,
    closePicker,
    choose,
    arrival,
    wagonBody,
    laid,
    plan: () => plan,
    nextCall,
  },
});
