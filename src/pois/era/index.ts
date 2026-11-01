// The greybox era swap (docs/plans/find-the-fun.md step 4; loaded by src/features/era-swap.ts behind ?proto=era).
// A Local render of the lockstep era (src/world/rules/opening.ts): era-1 blocks (low huts, a campfire) stand around
// the court and along the route; once the route is laid, anyone at the platform at its far end can start opening day;
// a bell counts down on everyone's screen, then the huts sink and the era-2 blocks (taller stalls, a town hall with a
// clock tower, bunting, a marker where the wagon will run) pop up, rippling out from the court. Blocks only: the sets
// are one data table (./blocks.ts) for the art pass to replace. Serves DESIGN.md 7 (Telegraph everything: a countdown
// you hear and see, then a change you read from the court in one glance) and 9 (the island stays changed).
import './era.css';
import { rules } from '../../world/game-world.ts';
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { getAudio } from '../../render/audio.ts';
import { world, submitEdit } from '../../world/sync.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { registerInteractable } from '../../player/hands.ts';
import { groundHeight, heights } from '../../adapters/terrain.ts';
import { me } from '../../player/player.ts';
import { ROUTE } from '../../sim/route.ts';
import { OPENING_DAY } from '../../sim/era.ts';
import { lengthOf } from '../../sim/scripted-run.ts';
import { COURT } from '../../world/grid.ts';
import { ERAS, PLATFORM, BELL_POST, WAGON_MARK, type Block, type Bunting } from './blocks.ts';

const BELL_TICKS = lengthOf(OPENING_DAY);
const POP_S = 0.7; // one block's rise
const RIPPLE_MPS = 28; // how fast the swap spreads out from the court (metres per second)
const REACH = 4.5; // metres from the platform's centre where Start opening day is offered

const END = ROUTE[ROUTE.length - 1].to; // the platform: the far end of the route
const { opening } = rules.opening;

// ---------------------------------------------------------------- boxes
type Box = { x: number; y: number; z: number; w: number; h: number; d: number; yaw: number; color: THREE.Color };
const box = (x: number, y: number, z: number, w: number, h: number, d: number, yaw: number, color: string): Box => ({
  x,
  y,
  z,
  w,
  h,
  d,
  yaw,
  color: new THREE.Color(color),
});
const FLAG_COLORS = ['#e05a4f', '#f2b134', '#3fa7d6', '#7bc96f', '#ffffff'];

function blockBoxes(b: Block): Box[] {
  const y = groundHeight(b.x, b.z),
    yaw = b.yaw ?? 0;
  const out = [box(b.x, y, b.z, b.w, b.h, b.d, yaw, b.color)];
  if (b.top) {
    const o = b.top.over ?? 0;
    out.push(box(b.x, y + b.h, b.z, b.w + o, b.top.h, b.d + o, yaw, b.top.color));
  }
  return out;
}
// Two poles, a line between them and a flag every 0.8 m hanging off it.
function buntingBoxes({ from, to, h }: Bunting): Box[] {
  const [ax, az] = from,
    [bx, bz] = to;
  const len = Math.hypot(bx - ax, bz - az),
    yaw = Math.atan2(bx - ax, bz - az);
  const ya = groundHeight(ax, az),
    yb = groundHeight(bx, bz);
  const out = [box(ax, ya, az, 0.18, h + 0.2, 0.18, 0, '#6b4a2b'), box(bx, yb, bz, 0.18, h + 0.2, 0.18, 0, '#6b4a2b')];
  out.push(box((ax + bx) / 2, (ya + yb) / 2 + h - 0.03, (az + bz) / 2, 0.05, 0.05, len, yaw, '#f4ead2'));
  const n = Math.floor(len / 0.8);
  for (let k = 1; k < n; k++) {
    const u = k / n,
      sag = Math.sin(u * Math.PI) * 0.5;
    const x = ax + (bx - ax) * u,
      z = az + (bz - az) * u;
    const y = ya + (yb - ya) * u + h - 0.45 - sag;
    out.push(box(x, y, z, 0.04, 0.4, 0.42, yaw, FLAG_COLORS[k % FLAG_COLORS.length]));
  }
  return out;
}
// Posts beside the laid line, every WAGON_MARK.every metres: where the wagon will run.
function wagonMarks(): Box[] {
  const out: Box[] = [];
  for (const sec of ROUTE) {
    const [bx, bz] = sec.to;
    const len = Math.hypot(bx - sec.x, bz - sec.z);
    const nx = (bz - sec.z) / len,
      nz = -(bx - sec.x) / len; // to the side of the line
    const yaw = Math.atan2(bx - sec.x, bz - sec.z);
    for (let d = 0; d < len; d += WAGON_MARK.every) {
      const x = sec.x + ((bx - sec.x) * d) / len + nx * WAGON_MARK.off,
        z = sec.z + ((bz - sec.z) * d) / len + nz * WAGON_MARK.off;
      out.push(box(x, groundHeight(x, z), z, WAGON_MARK.w, WAGON_MARK.h, WAGON_MARK.w, yaw, WAGON_MARK.color));
      out.push(box(x, groundHeight(x, z) + 0.02, z, 0.6, 0.06, WAGON_MARK.every * 0.6, yaw, WAGON_MARK.color));
    }
  }
  return out;
}
function platformBoxes(): Box[] {
  const [x, z] = END,
    y = groundHeight(x, z);
  return [
    box(x, y, z, PLATFORM.w, PLATFORM.h, PLATFORM.d, 0, PLATFORM.color),
    box(x + PLATFORM.w / 2 - 0.4, y + PLATFORM.h, z, 0.25, BELL_POST.h, 0.25, 0, BELL_POST.color),
    box(x + PLATFORM.w / 2 - 0.4, y + PLATFORM.h + BELL_POST.h - 1, z, 0.7, 0.7, 0.7, 0, BELL_POST.bell),
  ];
}

const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // a unit box standing on its base
const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, flatShading: true });
type BoxSet = { boxes: Box[]; mesh: THREE.InstancedMesh; delay: Float32Array };
function makeSet(boxes: Box[]): BoxSet {
  const mesh = new THREE.InstancedMesh(geo, mat, boxes.length);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  boxes.forEach((b, k) => mesh.setColorAt(k, b.color));
  // When each box moves in the swap: rippling out from the court.
  const delay = Float32Array.from(boxes, (b) => Math.hypot(b.x - COURT.x, b.z - COURT.z) / RIPPLE_MPS);
  scene.add(mesh);
  return { boxes, mesh, delay };
}
const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  p = new THREE.Vector3(),
  s = new THREE.Vector3(),
  up = new THREE.Vector3(0, 1, 0);
// Draws a set with each box grown to f(k) of its height (0 hides it).
function draw(set: BoxSet, f: (k: number) => number): void {
  set.boxes.forEach((b, k) => {
    const g = f(k);
    q.setFromAxisAngle(up, b.yaw);
    s.set(g > 0 ? b.w : 0, Math.max(1e-3, b.h * g), g > 0 ? b.d : 0);
    set.mesh.setMatrixAt(k, m4.compose(p.set(b.x, b.y, b.z), q, s));
  });
  set.mesh.instanceMatrix.needsUpdate = true;
  set.mesh.visible = set.boxes.some((_, k) => f(k) > 0);
}

let era1: BoxSet | null = null,
  era2: BoxSet | null = null;
function build(): void {
  const boxes = (e: number) => [...ERAS[e].blocks.flatMap(blockBoxes), ...ERAS[e].bunting.flatMap(buntingBoxes)];
  era1 = makeSet(boxes(1));
  era2 = makeSet([...boxes(2), ...wagonMarks()]);
  const fixed = makeSet(platformBoxes());
  draw(fixed, () => 1);
}

// ---------------------------------------------------------------- HUD and bell
const hud = document.createElement('div');
hud.className = 'era-count';
hud.hidden = true;
(document.querySelector('.hud') ?? document.body).append(hud);

function bell(loud: boolean): void {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime + 0.01;
  const vol = loud ? 0.5 : 0.28;
  for (const [mul, gain, decay] of [
    [1, 1, 1.6],
    [2.76, 0.4, 0.9],
    [5.4, 0.2, 0.5],
  ]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = (loud ? 523 : 784) * mul;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol * gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay * (loud ? 2 : 1));
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + decay * 2 + 0.1);
  }
}

// ---------------------------------------------------------------- Start opening day
const promptAt = new THREE.Vector3();
registerInteractable(() => {
  if (!me.entered || !me.body || opening.t0 >= 0) return [];
  const pos = me.body.position;
  if (Math.hypot(pos.x - END[0], pos.z - END[1]) > REACH) return [];
  promptAt.set(END[0], groundHeight(END[0], END[1]) + 1.6, END[1]);
  const t = { id: 'opening-day', verb: 'Start opening day', at: promptAt };
  return [
    rules.opening.ready()
      ? { ...t, run: () => submitEdit({ op: 'open.start', i: 0, j: 0 }) }
      : { ...t, blocked: 'Lay the whole route first' },
  ];
});

// ---------------------------------------------------------------- frame
let shown = 0; // the era drawn (0: nothing built yet)
let swapAt = -1; // performance.now() / 1000 when the swap animation started (-1: none)
let lastCount = -1,
  saidAt = 0;
const easeBack = (u: number) => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2; // overshoots a little, lands at 1
const dust = new THREE.Color('#d8c8a6');

function puff(b: Box): void {
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    emit({
      x: b.x + Math.cos(a) * b.w * 0.5,
      y: b.y + 0.2,
      z: b.z + Math.sin(a) * b.d * 0.5,
      vx: Math.cos(a) * 1.5,
      vy: 1.2,
      vz: Math.sin(a) * 1.5,
      life: 0.9,
      size: 0.5,
      color: dust,
      gravity: -0.5,
      drag: 2,
    });
  }
}
const puffed = new Set<number>();

onFrame(
  ({ now }) => {
    if (!era1) {
      if (!heights.length) return; // the ground isn't built yet
      build();
    }
    const tick = world.tick;
    const era = rules.opening.era(tick);
    const sec = now / 1000;
    if (era !== shown) {
      // Seen happen (the bell ran out while we watched): animate. Already era 2 on arrival: just show it.
      swapAt = shown === 1 && era === 2 ? sec : -1;
      shown = era;
      puffed.clear();
      if (swapAt < 0) {
        draw(era1!, () => (era === 1 ? 1 : 0));
        draw(era2!, () => (era === 2 ? 1 : 0));
      } else {
        bell(true);
        hud.textContent = 'Opening day!';
        hud.className = 'era-count era-done';
        hud.hidden = false;
        saidAt = sec;
      }
    }
    if (swapAt >= 0) {
      const t = sec - swapAt;
      draw(era1!, (k) => 1 - Math.min(1, Math.max(0, (t - era1!.delay[k]) / (POP_S * 0.6))));
      draw(era2!, (k) => {
        const u = (t - era2!.delay[k]) / POP_S;
        if (u > 0 && !puffed.has(k) && era2!.boxes[k].h > 1) {
          puffed.add(k);
          puff(era2!.boxes[k]);
        }
        return u <= 0 ? 0 : u >= 1 ? 1 : easeBack(u);
      });
      if (era2!.delay.every((d) => t > d + POP_S)) swapAt = -1;
    }
    // The countdown: a big number on everyone's screen and a bell each second.
    const r = rules.opening.bell(tick);
    if (opening.t0 >= 0 && r.phase >= 0 && !r.done) {
      const left = Math.max(1, Math.ceil((opening.t0 + BELL_TICKS - sharedSeconds() * 10) / 10));
      if (left !== lastCount) {
        lastCount = left;
        hud.innerHTML = `<small>Opening day in</small>${left}`;
        hud.className = 'era-count';
        hud.hidden = false;
        bell(false);
      }
    } else if (!hud.className.includes('era-done') || sec - saidAt > 3) hud.hidden = true;
  },
  { phase: 'update', order: 36 },
);

// ---------------------------------------------------------------- the solo shortcut
// A small button that lays the rest of the route at once (open.lay), so one tester reaches opening day in seconds. The
// host only takes it in a proto- room (env protoRoom, set by src/features/era-swap.ts).
export function shortcutButton(protoRoom: boolean): void {
  const box = document.createElement('div');
  box.className = 'era-proto';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Lay the whole route';
  const note = document.createElement('span');
  box.append(btn, note);
  (document.querySelector('.hud') ?? document.body).append(box);
  btn.addEventListener('click', () => submitEdit({ op: 'open.lay', i: 0, j: 0 }));
  onFrame(
    () => {
      const laid = rules.sites.sites.open >= ROUTE.length;
      btn.disabled = !protoRoom || laid;
      note.textContent = !protoRoom
        ? 'needs ?room=proto-era'
        : laid
          ? opening.t0 < 0
            ? 'Route laid: Start opening day at the platform'
            : ''
          : '';
      box.hidden = laid && opening.t0 >= 0;
    },
    { phase: 'late', order: 120 },
  );
}
