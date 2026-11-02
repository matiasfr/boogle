// Mushroom hop line (?proto=minis, research shortlist 6): a start crate and five bouncy mushrooms in a row west of the
// court, to a flag on a landing deck. The clock starts on the first bounce; touching the sand on the way spits you
// back up in a burst of sand with a sad trombone. Interact at the start (or anywhere near the line after a run) puts
// you back on the start crate. Time and your best float over the flag. Local: these mushrooms, the clock and the best
// are this tab's own (the garden's mushrooms are lockstep; these are not part of it).
import * as THREE from 'three/webgpu';
import { createBody, addBody, teleport, onPostStep, forEachContact, type Body } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { groundHeight } from '../../island/terrain.ts';
import { scene } from '../../render/scene.ts';
import { me, cam } from '../../player/player.ts';
import { registerInteractable } from '../../player/hands.ts';
import { PLAYER_R } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { label, best, saveBest, fanfare, confetti, puff, boing, womp, near, flat, pop } from './common.ts';

const Z = 31;
export const START = { x: 3.5, z: Z };
// Each mushroom: x, z and cap height (m over the ground). Gaps widen and heights change, so each hop is its own.
const SHROOMS = [
  { x: -1.5, z: Z, h: 1.3 },
  { x: -7, z: Z + 0.6, h: 1.9 },
  { x: -12.6, z: Z - 0.4, h: 1.4 },
  { x: -18.4, z: Z + 0.5, h: 2.2 },
  { x: -24, z: Z, h: 1.6 },
];
export const FLAG = { x: -29.5, z: Z };
const CAP_R = 1.35;
const CAP_T = 0.3;
const BOUNCE = 12.5; // m/s up off a cap
const DECK = 1.0; // m: start crate and landing deck height
const COLORS = ['#e8453c', '#f28a2e', '#f2c53a', '#4fbf6a', '#3a86e8'];

const stemMat = new THREE.MeshStandardNodeMaterial({ color: '#f3e6cf', roughness: 0.8 });
const spotMat = new THREE.MeshStandardNodeMaterial({ color: '#fffaf0', roughness: 0.7 });
const woodMat = new THREE.MeshStandardNodeMaterial({ color: '#b08454', roughness: 0.9, flatShading: true });
type Shroom = {
  cap: THREE.Group;
  body: Body;
  top: number;
  squishAt: number;
  x: number;
  z: number;
  color: THREE.Color;
};
const caps = new Map<Body, Shroom>();
const shrooms: Shroom[] = SHROOMS.map((s, k) => {
  const g = groundHeight(s.x, s.z) - 0.1;
  const stemH = s.h - CAP_T;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, stemH, 10), stemMat);
  stem.position.set(s.x, g + stemH / 2, s.z);
  stem.castShadow = true;
  scene.add(stem);
  const cap = new THREE.Group();
  cap.position.set(s.x, g + stemH, s.z);
  const capMat = new THREE.MeshStandardNodeMaterial({ color: COLORS[k], roughness: 0.55 });
  const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(CAP_R, CAP_R * 0.86, CAP_T, 20), capMat);
  rimMesh.position.y = CAP_T / 2;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(CAP_R, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
  dome.scale.y = 0.28;
  dome.position.y = CAP_T;
  cap.add(rimMesh, dome);
  for (let n = 0; n < 5; n++) {
    const a = n * 2.4 + k,
      r = n ? 0.75 : 0;
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.17, 10), spotMat);
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(Math.cos(a) * r, CAP_T + 0.38 * (1 - (r / CAP_R) ** 2) + 0.01, Math.sin(a) * r);
    cap.add(spot);
  }
  cap.traverse((o) => (o.castShadow = true));
  scene.add(cap);
  const body = createBody({
    group: GROUP.SCENERY,
    position: { x: s.x, y: g, z: s.z },
    shapes: [
      { kind: 'cylinder', rTop: 0.3, rBottom: 0.42, h: stemH, segments: 10, offset: { x: 0, y: stemH / 2, z: 0 } },
      {
        kind: 'cylinder',
        rTop: CAP_R,
        rBottom: CAP_R * 0.86,
        h: CAP_T,
        segments: 16,
        offset: { x: 0, y: stemH + CAP_T / 2, z: 0 },
      },
    ],
  });
  addBody(body);
  const m = { cap, body, top: g + s.h, squishAt: -1e9, x: s.x, z: s.z, color: new THREE.Color(COLORS[k]) };
  caps.set(body, m);
  return m;
});

// The start crate and the landing deck with its flag.
function deck(x: number, z: number, w: number) {
  const g = groundHeight(x, z) - 0.15;
  const h = DECK + 0.15;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), woodMat);
  mesh.position.set(x, g + h / 2, z);
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  const body = createBody({
    group: GROUP.SCENERY,
    position: { x, y: g + h / 2, z },
    shapes: [{ kind: 'box', hx: w / 2, hy: h / 2, hz: w / 2 }],
  });
  addBody(body);
  return { body, top: g + h };
}
const start = deck(START.x, START.z, 2);
const finishDeck = deck(FLAG.x, FLAG.z, 3);
const flagPole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.06, 5, 8),
  new THREE.MeshStandardNodeMaterial({ color: '#fff6e6' }),
);
flagPole.position.set(FLAG.x - 1.2, finishDeck.top + 2.5, FLAG.z - 1.2);
scene.add(flagPole);
const cloth = new THREE.Mesh(
  new THREE.PlaneGeometry(1.6, 1),
  new THREE.MeshStandardNodeMaterial({ color: '#e8453c', side: THREE.DoubleSide }),
);
cloth.position.set(FLAG.x - 1.2 + 0.8, finishDeck.top + 4.45, FLAG.z - 1.2);
scene.add(cloth);

const flagSign = label(4, 2);
flagSign.sprite.position.set(FLAG.x, finishDeck.top + 6.4, FLAG.z);
scene.add(flagSign.sprite);
const startSign = label(3, 1.5);
startSign.sprite.position.set(START.x, start.top + 2.4, START.z);
scene.add(startSign.sprite);

// ---------------------------------------------------------------- the run
const st = { mode: 'ready' as 'ready' | 'run' | 'fail' | 'done', t0: 0, time: 0, hops: 0 };
const fmt = (ms: number) => (ms / 1000).toFixed(1) + ' s';
function paint() {
  const b = best('hop');
  startSign.set('Start', b === null ? "don't touch the sand" : `best ${fmt(b)}`);
  if (st.mode === 'ready') flagSign.set('Hop!', b === null ? 'to the flag' : `best ${fmt(b)}`);
}
paint();

function toStart() {
  if (me.body) {
    teleport(me.body, START.x, start.top + PLAYER_R + 0.6, START.z);
    me.body.velocity.set(0, 0, 0);
    cam.yaw = me.yaw = Math.PI / 2; // facing west, down the line
  }
  st.mode = 'ready';
  st.hops = 0;
  pop(0, 0.6);
  paint();
}
const SAND = new THREE.Color('#f1dca8');
function fail(x: number, y: number, z: number) {
  st.mode = 'fail';
  st.time = performance.now() - st.t0;
  // The punchline: a geyser of sand spits you back up, and a sad trombone.
  puff(x, y, z, 60, 7, SAND, 0.45);
  puff(x, y, z, 20, 3, SAND, 0.8);
  if (me.body) me.body.velocity.y = 9;
  womp(0.9);
  flagSign.set('SPLAT!', `sand at ${fmt(st.time)} · E: again`, '#ff6b5a');
  flagSign.punch();
}
function finish() {
  st.mode = 'done';
  st.time = performance.now() - st.t0;
  const b = best('hop');
  const isBest = b === null || st.time < b;
  if (isBest) saveBest('hop', Math.round(st.time));
  flagSign.set(fmt(st.time), isBest ? 'NEW BEST' : `best ${fmt(b!)}`, isBest ? '#7dff9a' : '#fff7e8');
  flagSign.punch();
  confetti(FLAG.x, finishDeck.top + 1, FLAG.z, isBest ? 140 : 60);
  fanfare(isBest, 1);
  paint();
}

onPostStep(() => {
  const b = me.body;
  if (!b || !me.entered) return;
  forEachContact(b, (_x, _y, _z, other) => {
    if (other === finishDeck.body && st.mode === 'run' && b.position.y > finishDeck.top) {
      finish();
      return true;
    }
    const s = caps.get(other);
    if (!s || b.position.y < s.top - 0.2) return false;
    b.velocity.y = BOUNCE;
    me.coyote = 0;
    s.squishAt = performance.now();
    boing(Math.min(1, st.hops / 5), near(s.x, s.z));
    puff(b.position.x, s.top, b.position.z, 6, 1.5, s.color, 0.16);
    if (st.mode === 'ready') {
      st.mode = 'run';
      st.t0 = performance.now();
    }
    if (st.mode === 'run') st.hops++;
    return true;
  });
  if (st.mode !== 'run') return;
  const p = b.position;
  const g = groundHeight(p.x, p.z);
  if (p.y - PLAYER_R - g < 0.2 || me.swimming) fail(p.x, g, p.z);
});

const promptAt = new THREE.Vector3();
registerInteractable(() => {
  if (!me.body) return [];
  const p = me.body.interpolatedPosition;
  if (flat(p.x, p.z, START.x, START.z) < 3) {
    promptAt.set(START.x, start.top + 1.2, START.z);
    return [{ id: 'hop-start', verb: 'Back to start', at: promptAt, run: toStart }];
  }
  // After a run, from anywhere along the line: one press and you are back on the crate.
  const onLine = p.x < START.x + 6 && p.x > FLAG.x - 6 && Math.abs(p.z - Z) < 9;
  if ((st.mode === 'fail' || st.mode === 'done') && onLine) {
    promptAt.set(p.x, p.y + 1.6, p.z);
    return [{ id: 'hop-again', verb: 'Hop again', at: promptAt, run: toStart }];
  }
  return [];
});

onFrame(
  () => {
    const now = performance.now();
    if (st.mode === 'run') flagSign.set(fmt(now - st.t0), `${st.hops} hop${st.hops === 1 ? '' : 's'}`, '#ffd166');
    // Squash and spring back on each bounce.
    for (const s of shrooms) {
      const t = (now - s.squishAt) / 420;
      const k = t >= 1 ? 0 : Math.sin(t * Math.PI * 2.5) * (1 - t) * 0.35;
      s.cap.scale.set(1 + k * 0.5, 1 - k, 1 + k * 0.5);
    }
  },
  { phase: 'update', order: 62 },
);

export const hopState = () => ({ mode: st.mode, time: st.time, hops: st.hops, best: best('hop') });
export { toStart };
