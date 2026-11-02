// The greybox era swap (docs/plans/find-the-fun.md step 4; loaded by src/features/proto-era.ts behind ?proto=era).
// A Local render of the lockstep era (src/world/rules/opening.ts): era-1 blocks (low A-frame huts, a campfire) stand
// around the court and along the route; once the route is laid, anyone at the platform at its far end can start
// opening day. A gathering call (./call.ts: signal smoke and a ring that shows the time left) runs until
// everyone is at the platform or it runs out, then the bell counts down on everyone's screen, then the huts sink and
// the era-2 blocks (tall stalls with smoking chimneys, a town hall with a clock tower, the water tower, bunting, a
// marker where the wagon will run) pop up, rippling out from the court, while the sky and fog (./atmosphere.ts) cross
// over; the wood-age ambience (./ambience.ts) plays on. One hut and the helper hut stay (heritage), and a before/after postcard of the
// court comes up (./postcard.ts). Blocks only: the kits are one data table (./blocks.ts) for the art pass to replace.
// Serves DESIGN.md 7 (Telegraph everything: a call you see from anywhere, a countdown, then a change you read
// from the court in one glance) and 9 (Leave something for the next visitor: the island stays changed, and keeps some
// of what came before).
import './era.css';
import { rules } from '../../world/game-world.ts';
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { world, submitEdit } from '../../world/sync.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { registerInteractable } from '../../player/hands.ts';
import { groundHeight, heights } from '../../adapters/terrain.ts';
import { me } from '../../player/player.ts';
import { ROUTE, HELPER, RING_R, ringAt } from '../../sim/route.ts';
import { BELL_TICKS, bellTick } from '../../sim/era.ts';
import { COURT } from '../../world/grid.ts';
import { HUT_BUILD } from '../../render/hut-blueprint.ts';
import { ERAS, PLATFORM, BELL_POST, WAGON_MARK, type Block, type Bunting } from './blocks.ts';
import { updateCall } from './call.ts';
import { updateAtmosphere } from './atmosphere.ts';
import { updateAmbience } from './ambience.ts';
import { snapBefore, snapAfter, forgetPostcard } from './postcard.ts';

const POP_S = 0.7; // one block's rise
const RIPPLE_MPS = 28; // how fast the swap spreads out from the court (metres per second)
const REACH = 4.5; // metres from the platform's centre where Start opening day is offered
const CROSS_S = 4; // seconds the sky and fog take to cross over to the new era
const AFTER_S = 4.5; // seconds after the swap starts that the "after" still is taken (the ripple and sky change are done)
const PUFFS_PER_S = 5; // per chimney

const END = ROUTE[ROUTE.length - 1].to; // the platform: the far end of the route
const { opening } = rules.opening;

// ---------------------------------------------------------------- boxes
// A box stands on the ground at (x, y, z); `local` places the unit box (standing on its base) relative to that point,
// so a whole block (walls, roof, chimney) grows up out of the ground together.
type Box = { x: number; y: number; z: number; local: THREE.Matrix4; color: THREE.Color; tall: boolean };
type Smoke = { x: number; y: number; z: number };
const Y = new THREE.Vector3(0, 1, 0);
const tq = new THREE.Quaternion(),
  tp = new THREE.Vector3(),
  ts = new THREE.Vector3(),
  tm = new THREE.Matrix4();
/** The local matrix of a box w x h x d whose base middle is at (dx, dy, dz) in a frame turned by yaw, then tilted. */
function place(dx: number, dy: number, dz: number, w: number, h: number, d: number, yaw: number, tilt?: THREE.Euler) {
  const m = new THREE.Matrix4().makeRotationY(yaw);
  m.multiply(tm.makeTranslation(dx, dy, dz));
  if (tilt) m.multiply(tm.makeRotationFromEuler(tilt));
  return m.multiply(tm.makeScale(w, h, d));
}
const box = (x: number, z: number, local: THREE.Matrix4, color: string, tall = false): Box => ({
  x,
  y: groundHeight(x, z),
  z,
  local,
  color: new THREE.Color(color),
  tall,
});
const FLAG_COLORS = ['#e05a4f', '#f2b134', '#3fa7d6', '#7bc96f', '#ffffff'];

function blockBoxes(b: Block, smokes: Smoke[]): Box[] {
  const yaw = b.yaw ?? 0,
    y0 = b.y ?? 0;
  const out = [box(b.x, b.z, place(0, y0, 0, b.w, b.h, b.d, yaw), b.color, y0 + b.h > 1)];
  if (b.top) {
    const o = b.top.over ?? 0;
    out.push(box(b.x, b.z, place(0, y0 + b.h, 0, b.w + o, b.top.h, b.d + o, yaw), b.top.color));
  }
  if (b.pitch) {
    // Two boards leaning on a ridge along x, from the ridge down past the walls' eaves.
    const o = b.pitch.over ?? 0,
      eave = (b.d + o) / 2,
      { rise } = b.pitch;
    const tilt = Math.atan2(rise, eave),
      slope = Math.hypot(rise, eave);
    for (const side of [-1, 1]) {
      const m = place(
        0,
        y0 + b.h + rise / 2 - 0.1,
        (side * eave) / 2,
        b.w + o,
        0.16,
        slope,
        yaw,
        new THREE.Euler(side * tilt, 0, 0),
      );
      out.push(box(b.x, b.z, m, b.pitch.color, true));
    }
    // The gable ends: a narrower box under the ridge, so the A reads from the side too.
    out.push(box(b.x, b.z, place(0, y0 + b.h, 0, b.w * 0.92, rise * 0.55, b.d * 0.5, yaw), b.color));
  }
  if (b.chimney) {
    const { h, dx = 0, dz = 0 } = b.chimney;
    if (h > 0) out.push(box(b.x, b.z, place(dx, y0 + b.h, dz, 0.6, h, 0.6, yaw), '#9a4a3a'));
    tp.set(dx, 0, dz).applyAxisAngle(Y, yaw);
    smokes.push({ x: b.x + tp.x, y: groundHeight(b.x, b.z) + y0 + b.h + h, z: b.z + tp.z });
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
  const at = (x: number, y: number, z: number, w: number, hh: number, d: number, c: string): Box => ({
    ...box(x, z, place(0, 0, 0, w, hh, d, yaw), c),
    y,
  });
  const out = [at(ax, ya, az, 0.18, h + 0.2, 0.18, '#6b4a2b'), at(bx, yb, bz, 0.18, h + 0.2, 0.18, '#6b4a2b')];
  out.push(at((ax + bx) / 2, (ya + yb) / 2 + h - 0.03, (az + bz) / 2, 0.05, 0.05, len, '#f4ead2'));
  const n = Math.floor(len / 0.8);
  for (let k = 1; k < n; k++) {
    const u = k / n,
      sag = Math.sin(u * Math.PI) * 0.5;
    const x = ax + (bx - ax) * u,
      z = az + (bz - az) * u;
    out.push(at(x, ya + (yb - ya) * u + h - 0.45 - sag, z, 0.04, 0.4, 0.42, FLAG_COLORS[k % FLAG_COLORS.length]));
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
      out.push(box(x, z, place(0, 0, 0, WAGON_MARK.w, WAGON_MARK.h, WAGON_MARK.w, yaw), WAGON_MARK.color, true));
      out.push(box(x, z, place(0, 0.02, 0, 0.6, 0.06, WAGON_MARK.every * 0.6, yaw), WAGON_MARK.color));
    }
  }
  return out;
}
function platformBoxes(): Box[] {
  const [x, z] = END,
    bx = PLATFORM.w / 2 - 0.4,
    top = PLATFORM.h;
  return [
    box(x, z, place(0, 0, 0, PLATFORM.w, PLATFORM.h, PLATFORM.d, 0), PLATFORM.color),
    box(x, z, place(bx, top, 0, 0.25, BELL_POST.h, 0.25, 0), BELL_POST.color),
    box(x, z, place(bx, top + BELL_POST.h - 1, 0, 0.7, 0.7, 0.7, 0), BELL_POST.bell),
  ];
}
// The first site's helper hut, built (the hut blueprint without its scaffolding): it stands in every era.
function helperHut(): Box[] {
  const h = ringAt(0, HELPER),
    x = h.x + RING_R + 1.9,
    z = h.z;
  const wood = (k: string) => (k === 'roof' || k === 'ridge' ? '#c9a86a' : k === 'board' ? '#efe3c8' : '#a07a4e');
  return HUT_BUILD.filter((p) => p.kind !== 'scaffold').map((p) =>
    box(x, z, place(p.x, p.y, p.z, p.w, p.h, p.d, 0, new THREE.Euler(p.rx ?? 0, 0, p.rz ?? 0)), wood(p.kind)),
  );
}

const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // a unit box standing on its base
const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, flatShading: true });
type BoxSet = { boxes: Box[]; mesh: THREE.InstancedMesh; delay: Float32Array };
function makeSet(boxes: Box[]): BoxSet {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, boxes.length));
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  boxes.forEach((b, k) => mesh.setColorAt(k, b.color));
  // When each box moves in the swap: rippling out from the court.
  const delay = Float32Array.from(boxes, (b) => Math.hypot(b.x - COURT.x, b.z - COURT.z) / RIPPLE_MPS);
  scene.add(mesh);
  return { boxes, mesh, delay };
}
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
// Draws a set with each box grown to f(k) of its height, from the ground up (0 hides it).
function draw(set: BoxSet, f: (k: number) => number): void {
  let any = false;
  set.boxes.forEach((b, k) => {
    const g = f(k);
    if (g <= 0) return set.mesh.setMatrixAt(k, ZERO);
    any = true;
    tm.compose(tp.set(b.x, b.y, b.z), tq.identity(), ts.set(1, Math.max(1e-3, g), 1)).multiply(b.local);
    set.mesh.setMatrixAt(k, tm);
  });
  set.mesh.instanceMatrix.needsUpdate = true;
  set.mesh.visible = any;
}

let era1: BoxSet | null = null,
  era2: BoxSet | null = null;
const chimneys: Smoke[] = []; // era 2's smoking chimneys
function build(): void {
  const none: Smoke[] = [];
  const boxes = (e: number, keep: boolean, smokes: Smoke[]) => [
    ...ERAS[e].blocks.filter((b) => !!b.keep === keep).flatMap((b) => blockBoxes(b, smokes)),
    ...(keep ? [] : ERAS[e].bunting.flatMap(buntingBoxes)),
  ];
  era1 = makeSet(boxes(1, false, none));
  era2 = makeSet([...boxes(2, false, chimneys), ...wagonMarks()]);
  const fixed = makeSet([...platformBoxes(), ...helperHut(), ...boxes(1, true, none)]);
  draw(fixed, () => 1);
}

// ---------------------------------------------------------------- HUD
const hud = document.createElement('div');
hud.className = 'era-count';
hud.hidden = true;
(document.querySelector('.hud') ?? document.body).append(hud);

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
  saidAt = 0,
  snapped = -1, // the opening day (its t0) whose "before" still was taken
  after = false, // its "after" still is taken
  snapNow = false,
  mix = 0, // the sky, fog and ambience: 0 era 1 .. 1 era 2
  smokeAcc = 0;
const easeBack = (u: number) => 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2; // overshoots a little, lands at 1
const dust = new THREE.Color('#d8c8a6'),
  soot = new THREE.Color('#8d8780');

function puff(b: Box): void {
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    emit({
      x: b.x + Math.cos(a) * 1.2,
      y: b.y + 0.2,
      z: b.z + Math.sin(a) * 1.2,
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
// Era 2's signature in motion: chunky soot puffs from every chimney (era-progression rec 11).
function chimneySmoke(dt: number): void {
  smokeAcc += dt * PUFFS_PER_S;
  for (; smokeAcc >= 1; smokeAcc--)
    for (const c of chimneys)
      emit({
        x: c.x + (Math.random() - 0.5) * 0.3,
        y: c.y + 0.2,
        z: c.z + (Math.random() - 0.5) * 0.3,
        vx: 0.6 + Math.random() * 0.4,
        vy: 1.6 + Math.random() * 0.6,
        vz: (Math.random() - 0.5) * 0.4,
        life: 3.5,
        size: 0.7,
        grow: [1, 3.2],
        alpha: 0.75,
        fade: 0.5,
        color: soot,
        drag: 0.3,
      });
}

onFrame(
  ({ now, dt }) => {
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
        forgetPostcard();
      } else {
        hud.innerHTML = `Opening day!<small>Era 2: ${ERAS[2].name}</small>`;
        hud.className = 'era-count era-done';
        hud.hidden = false;
        saidAt = sec;
        after = false;
      }
    }
    if (swapAt >= 0) {
      const t = sec - swapAt;
      mix = Math.min(1, t / CROSS_S);
      draw(era1!, (k) => 1 - Math.min(1, Math.max(0, (t - era1!.delay[k]) / (POP_S * 0.6))));
      draw(era2!, (k) => {
        const u = (t - era2!.delay[k]) / POP_S;
        if (u > 0 && !puffed.has(k) && era2!.boxes[k].tall) {
          puffed.add(k);
          puff(era2!.boxes[k]);
        }
        return u <= 0 ? 0 : u >= 1 ? 1 : easeBack(u);
      });
      if (!after && t > AFTER_S) after = snapNow = true; // taken below, once the sky is tinted this frame
      if (after && era2!.delay.every((d) => t > d + POP_S)) swapAt = -1;
    }
    if (swapAt < 0) mix = shown === 2 ? 1 : 0;
    if (shown === 2 && (swapAt < 0 || sec - swapAt > 1.5)) chimneySmoke(dt);
    updateAtmosphere(mix);
    updateAmbience();
    if (snapNow) {
      snapNow = false;
      snapAfter(ERAS[2].name);
    }

    const r = rules.opening.bell(tick);
    const running = opening.t0 >= 0 && r.phase >= 0 && !r.done;
    // The "before" still: the court as it was, taken the first time we see this opening day running.
    if (running && shown === 1 && snapped !== opening.t0) {
      snapped = opening.t0;
      snapBefore();
    }
    updateCall(r, sec);
    // The bell: a big number on everyone's screen (silent for now: its rings were cut in the sound audit, 2026-11-02).
    if (running && r.name === 'bell') {
      const left = Math.max(1, Math.ceil((bellTick(opening) + BELL_TICKS - sharedSeconds() * 10) / 10));
      if (left !== lastCount) {
        lastCount = left;
        hud.innerHTML = `<small>Opening day in</small>${left}`;
        hud.className = 'era-count';
        hud.hidden = false;
      }
    } else if (!hud.className.includes('era-done') || sec - saidAt > 3) hud.hidden = true;
  },
  { phase: 'update', order: 36 },
);

// ---------------------------------------------------------------- the solo shortcut
// A small button that lays the rest of the route at once (open.lay), so one tester reaches opening day in seconds. The
// host only takes it in a proto- room (env protoRoom, set by src/features/proto-era.ts).
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
