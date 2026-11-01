// The gathering call (docs/research/shared-moments-and-events.md, recs 1 to 3, 5 and 9): opening day's first phase,
// up to CALL_S (src/sim/era.ts), before the 10 s bell. A column of signal smoke over the platform that you can see
// from anywhere on the island, a slow bell toll that carries (louder the closer you are), and a ring on the ground
// round the platform whose lit segments burn down with the time left (Destiny's rally flag). It ends early once every
// online player is inside the ring: any tab that sees that submits `open.here`, and the first one stamps the tick, so
// alone at the platform it is straight to the bell. It never waits for a head count, and nothing resets or cancels
// it. Local view of lockstep state; the early end is the only thing it submits.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { getAudio } from '../../render/audio.ts';
import { submitEdit } from '../../world/sync.ts';
import { remotes } from '../../netplay/net.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { me } from '../../player/player.ts';
import { ROUTE } from '../../sim/route.ts';
import { CALL_S } from '../../sim/era.ts';
import type { RunState } from '../../sim/scripted-run.ts';
import { GATHER } from './blocks.ts';

const END = ROUTE[ROUTE.length - 1].to;
const SEGMENTS = 40;
const TOLL_S = 3.2; // seconds between the call's tolls
const SMOKE_PER_S = 14;
const HEAR_M = 140; // the toll fades to its floor this far away (the island is about this wide)

// ---------------------------------------------------------------- the bell's sound
/** One strike of the platform bell. `loud`: the swap's big ring; otherwise a countdown tick, or a toll (`toll`, 0..1
 * for how far it carries to this tab) during the call. */
export function bell(loud: boolean, toll = -1): void {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime + 0.01;
  const vol = toll >= 0 ? 0.08 + 0.32 * toll : loud ? 0.5 : 0.28;
  const base = toll >= 0 ? 392 : loud ? 523 : 784; // the call tolls low and slow
  const long = toll >= 0 ? 2.6 : loud ? 2 : 1;
  for (const [mul, gain, decay] of [
    [1, 1, 1.6],
    [2.76, 0.4, 0.9],
    [5.4, 0.2, 0.5],
  ]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = base * mul;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol * gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay * long);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + decay * long + 0.1);
  }
}

// ---------------------------------------------------------------- the ring
const ring = new THREE.InstancedMesh(
  new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  new THREE.MeshStandardNodeMaterial({ roughness: 0.6 }),
  SEGMENTS,
);
ring.frustumCulled = false;
ring.visible = false;
scene.add(ring);
let ringBuilt = false;
const lit = new THREE.Color(),
  dim = new THREE.Color('#5b4632'),
  ringCol = new THREE.Color(GATHER.ring),
  bellCol = new THREE.Color(GATHER.bell);
function buildRing(): void {
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    p = new THREE.Vector3(),
    s = new THREE.Vector3(((2 * Math.PI * GATHER.r) / SEGMENTS) * 0.7, 0.55, 0.45),
    up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < SEGMENTS; k++) {
    // Clockwise from north, so the lit arc burns down like a clock hand.
    const a = (k / SEGMENTS) * Math.PI * 2;
    const x = END[0] + Math.sin(a) * GATHER.r,
      z = END[1] - Math.cos(a) * GATHER.r;
    q.setFromAxisAngle(up, -a);
    ring.setMatrixAt(k, m.compose(p.set(x, groundHeight(x, z) - 0.15, z), q, s)); // sunk a little: slopes
    ring.setColorAt(k, dim);
  }
  ring.instanceMatrix.needsUpdate = true;
  ring.instanceColor!.needsUpdate = true;
  ringBuilt = true;
}
let litShown = -1;
function paintRing(left: number, col: THREE.Color): void {
  const n = Math.ceil(left * SEGMENTS);
  if (n === litShown) return;
  litShown = n;
  for (let k = 0; k < SEGMENTS; k++) ring.setColorAt(k, k < n ? lit.copy(col) : dim);
  ring.instanceColor!.needsUpdate = true;
}

// ---------------------------------------------------------------- HUD
const banner = document.createElement('div');
banner.className = 'era-call';
banner.hidden = true;
(document.querySelector('.hud') ?? document.body).append(banner);
let bannerText = '';

// ---------------------------------------------------------------- everyone here?
const inRing = (x: number, z: number) => Math.hypot(x - END[0], z - END[1]) <= GATHER.r;
function everyoneHere(): boolean {
  if (!me.entered || !me.body || !inRing(me.body.position.x, me.body.position.z)) return false;
  for (const r of remotes.values()) if (r.entered && r.avatar && !inRing(r.target.x, r.target.z)) return false;
  return true;
}

// ---------------------------------------------------------------- frame (called by ./index.ts)
const smokeCol = new THREE.Color(GATHER.smoke);
let smokeAcc = 0,
  lastSec = 0,
  nextToll = 0,
  sentAt = -1;

export function updateCall(r: RunState, sec: number): void {
  const dt = Math.min(0.05, Math.max(0, sec - lastSec));
  lastSec = sec;
  const running = r.phase >= 0 && !r.done;
  ring.visible = running;
  if (!running) {
    banner.hidden = true;
    litShown = -1;
    return;
  }
  if (!ringBuilt) buildRing();
  const left = 1 - r.progress / 1000;
  paintRing(left, r.name === 'call' ? ringCol : bellCol);

  // The signal smoke: a tall, warm column over the platform, through the call and the bell.
  smokeAcc += dt * SMOKE_PER_S;
  const y = groundHeight(END[0], END[1]) + 3.5;
  for (; smokeAcc >= 1; smokeAcc--)
    emit({
      // From the platform's west end, leaning west on the breeze: clear of the lighthouse behind it from the court.
      x: END[0] - 2 + (Math.random() - 0.5) * 0.8,
      y,
      z: END[1] + (Math.random() - 0.5) * 0.8,
      vx: -1.6 + (Math.random() - 0.5) * 0.6,
      vy: 7 + Math.random() * 2,
      vz: (Math.random() - 0.5) * 0.6,
      life: 7,
      size: 2,
      grow: [1, 4],
      alpha: 0.95,
      fade: 0.35,
      color: smokeCol,
      drag: 0.12,
    });

  if (r.name !== 'call') {
    banner.hidden = true;
    return;
  }
  // The call: a toll every few seconds, louder the closer you are.
  if (sec >= nextToll) {
    nextToll = sec + TOLL_S;
    const p = me.body?.position;
    const d = p ? Math.hypot(p.x - END[0], p.z - END[1]) : HEAR_M;
    bell(false, Math.max(0, 1 - d / HEAR_M));
  }
  const here = everyoneHere();
  const s = Math.ceil(left * CALL_S); // an upper bound: the call may end sooner
  const text = here
    ? `<b>Opening day</b>Everyone's here: ringing the bell`
    : `<b>Opening day</b>Gather at the platform (follow the smoke) <span>0:${String(s).padStart(2, '0')}</span>`;
  if (text !== bannerText) banner.innerHTML = bannerText = text;
  banner.hidden = false;
  if (here && sec - sentAt > 1) {
    sentAt = sec;
    submitEdit({ op: 'open.here', i: 0, j: 0 });
  }
}
