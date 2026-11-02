// Topple stack (?proto=minis, research shortlist 3): six painted crates in a pyramid on a stump east of the court.
// Knock them off with the ball (throw or bump) or your body; the count of what fell floats above the stump. 4 s after
// the last one falls, the round scores (most crates, then fewest shots) and the stack rebuilds itself, crate by crate.
// Local: each tab has its own crates and its own best; nobody else's ball or body is simulated against them.
import * as THREE from 'three/webgpu';
import {
  createBody,
  addBody,
  removeBody,
  teleport,
  material,
  onPostStep,
  forEachContact,
  type Body,
} from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { groundHeight } from '../../island/terrain.ts';
import { scene } from '../../render/scene.ts';
import { me } from '../../player/player.ts';
import { ball } from '../../physics/ball.ts';
import { onFrame } from '../../loop.ts';
import { label, best, saveBest, knock, pop, fanfare, confetti, puff, near, onShot, flat } from './common.ts';

export const STUMP = { x: 21, z: 33 };
const R = 1.5; // m: stump top radius
const TOP = 0.95; // m: stump top over the ground at its centre
const S = 0.8; // m: crate size
const GAP = 0.03;
const RESET_AFTER = 4000; // ms after the last crate fell
const SHOVE_GAP = 1000; // ms between two body shoves that count
const REACH = 35; // m from the stump a ball shot counts

const ground = groundHeight(STUMP.x, STUMP.z);
const top = ground + TOP;
// The pyramid faces the court: its rows run across the line from the court to the stump.
const toCourt = Math.atan2(12 - STUMP.x, 21 - STUMP.z);
const ax = Math.cos(toCourt),
  az = -Math.sin(toCourt); // along a row
const HOME: THREE.Vector3[] = [];
for (const [row, n] of [
  [0, 3],
  [1, 2],
  [2, 1],
] as const)
  for (let k = 0; k < n; k++) {
    const u = (k - (n - 1) / 2) * (S + GAP);
    HOME.push(new THREE.Vector3(STUMP.x + ax * u, top + S / 2 + row * (S + 0.005), STUMP.z + az * u));
  }
const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), toCourt);

// ---------------------------------------------------------------- the stump and the crates
const barkMat = new THREE.MeshStandardNodeMaterial({ color: '#6b4a2b', roughness: 0.95, flatShading: true });
const ringMat = new THREE.MeshStandardNodeMaterial({ color: '#d9b27a', roughness: 0.9, flatShading: true });
const stump = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.15, TOP + 0.5, 14), [barkMat, ringMat, barkMat]);
stump.position.set(STUMP.x, ground + (TOP - 0.5) / 2, STUMP.z);
stump.castShadow = stump.receiveShadow = true;
scene.add(stump);
addBody(
  createBody({
    group: GROUP.SCENERY,
    position: { x: STUMP.x, y: ground + (TOP - 0.5) / 2, z: STUMP.z },
    shapes: [{ kind: 'cylinder', rTop: R, rBottom: R * 1.15, h: TOP + 0.5, segments: 14 }],
  }),
);

const DUST = new THREE.Color('#f1dca8');
const WOOD = new THREE.Color('#c99a5e');
const crateMat = material('crate', { friction: 0.7, restitution: 0.2 });
const PAINT = ['#e8453c', '#f2b33a', '#3a86e8', '#e8453c', '#3a86e8', '#f2b33a'];
const crateGeo = new THREE.BoxGeometry(S, S, S);
const bandGeo = new THREE.BoxGeometry(S * 1.02, S * 0.18, S * 1.02);
const bandMat = new THREE.MeshStandardNodeMaterial({ color: '#fff3dc', roughness: 0.8 });
type Crate = { body: Body; mesh: THREE.Group; fell: boolean; v: THREE.Vector3; in: boolean; hitAt: number };
const crates: Crate[] = HOME.map((h, k) => {
  const mesh = new THREE.Group();
  const box = new THREE.Mesh(crateGeo, new THREE.MeshStandardNodeMaterial({ color: PAINT[k], roughness: 0.75 }));
  const band = new THREE.Mesh(bandGeo, bandMat);
  box.castShadow = band.castShadow = true;
  mesh.add(box, band);
  scene.add(mesh);
  const body = createBody({
    mass: 0.7,
    material: crateMat,
    linearDamping: 0.05,
    angularDamping: 0.15,
    position: h,
    rotation: yawQ,
    shapes: [{ kind: 'box', hx: S / 2, hy: S / 2, hz: S / 2 }],
  });
  addBody(body);
  return { body, mesh, fell: false, v: new THREE.Vector3(), in: true, hitAt: -1e9 };
});
const crateOf = new Map(crates.map((c) => [c.body, c]));

// ---------------------------------------------------------------- the count
const sign = label(4.2, 2.1);
sign.sprite.position.set(STUMP.x, top + 4.3, STUMP.z);
scene.add(sign.sprite);
const enc = (n: number, shots: number) => n * 100 + (99 - Math.min(shots, 99));
const dec = (v: number) => ({ n: Math.floor(v / 100), shots: 99 - (v % 100) });
const bestText = () => {
  const b = best('topple');
  if (b === null) return 'knock them off!';
  const { n, shots } = dec(b);
  return `best ${n} in ${shots} shot${shots === 1 ? '' : 's'}`;
};

const st = {
  mode: 'set' as 'set' | 'live' | 'rebuild',
  fallen: 0,
  shots: 0,
  lastFall: 0,
  lastMove: 0,
  shoveAt: 0,
  rebuildAt: 0,
  freezeUntil: 0,
};
const paint = () => {
  if (st.mode === 'set') sign.set(`${st.fallen}/6`, bestText());
  else if (st.mode === 'live') sign.set(`${st.fallen}/6`, `${st.shots} shot${st.shots === 1 ? '' : 's'}`, '#ffd166');
};
paint();

const inReach = () => !!me.body && flat(me.body.position.x, me.body.position.z, STUMP.x, STUMP.z) < REACH;
function shot() {
  if (st.mode === 'rebuild' || !inReach()) return;
  st.shots++;
  if (st.mode === 'set') st.mode = 'live';
  st.lastMove = performance.now();
  paint();
}
onShot(shot);
// The ball's designed hit (research, "make the player's verb reliable and what it hits loose"): on top of what the
// solver gives, a crate the ball hits takes a share of the ball's velocity and a little lift, so a good throw clears
// the stack instead of nudging one crate.
const HIT = { share: 0.55, lift: 1.6, minSpeed: 4, gapMs: 250 };
onPostStep(() => {
  if (!ball.mine || ball.held) return;
  const v = ball.body.velocity;
  const speed = Math.hypot(v.x, v.y, v.z);
  if (speed < HIT.minSpeed) return;
  forEachContact(ball.body, (_x, _y, _z, other) => {
    const c = crateOf.get(other);
    const now = performance.now();
    if (!c || now - c.hitAt < HIT.gapMs) return false;
    c.hitAt = now;
    const cv = c.body.velocity;
    cv.set(cv.x + v.x * HIT.share, cv.y + Math.max(0, v.y) * HIT.share + HIT.lift, cv.z + v.z * HIT.share);
    const w = c.body.angularVelocity;
    w.set(w.x + v.z * 0.8, w.y + (Math.random() - 0.5) * 4, w.z - v.x * 0.8);
    return false;
  });
});

// Walking or jumping into a crate counts as a shot too (one per second of shoving).
onPostStep(() => {
  if (!me.body || st.mode === 'rebuild') return;
  forEachContact(me.body, (_x, _y, _z, other) => {
    if (!crateOf.has(other)) return false;
    const now = performance.now();
    if (now - st.shoveAt > SHOVE_GAP) shot();
    st.shoveAt = now;
    return true;
  });
});

// ---------------------------------------------------------------- rounds
function finish() {
  const b = best('topple');
  const score = enc(st.fallen, st.shots);
  const isBest = st.fallen > 0 && (b === null || score > b);
  if (isBest) {
    saveBest('topple', score);
    sign.set(`${st.fallen}/6!`, 'NEW BEST', '#7dff9a');
    confetti(STUMP.x, top + 2, STUMP.z, 120);
    fanfare(true, near(STUMP.x, STUMP.z));
  } else sign.set(`${st.fallen}/6`, bestText());
  sign.punch();
  // Off the island with a puff, then back one by one from the bottom row up.
  for (const c of crates) {
    const p = c.body.position;
    puff(p.x, p.y, p.z, 6, 2, DUST, 0.3);
    if (c.in) removeBody(c.body);
    c.in = false;
    c.mesh.visible = false;
  }
  st.mode = 'rebuild';
  st.rebuildAt = performance.now() + (isBest ? 1600 : 700);
}
function rebuildStep(now: number) {
  const k = Math.floor((now - st.rebuildAt) / 110);
  for (let i = 0; i < crates.length && i <= k; i++) {
    const c = crates[i];
    if (c.in) continue;
    const h = HOME[i];
    teleport(c.body, h.x, h.y + 0.12, h.z);
    c.body.quaternion.set(yawQ.x, yawQ.y, yawQ.z, yawQ.w);
    c.body.velocity.set(0, 0, 0);
    c.body.angularVelocity.set(0, 0, 0);
    addBody(c.body);
    c.in = true;
    c.fell = false;
    c.v.set(0, 0, 0);
    c.mesh.visible = true;
    puff(h.x, h.y - S / 2, h.z, 5, 1.2, WOOD, 0.2);
    pop(i, 0.6 * near(STUMP.x, STUMP.z));
  }
  if (crates.every((c) => c.in) && now - st.rebuildAt > crates.length * 110 + 600) {
    st.mode = 'set';
    st.fallen = st.shots = 0;
    paint();
  }
}

const dv = new THREE.Vector3();
onFrame(
  () => {
    const now = performance.now();
    if (st.mode === 'rebuild') rebuildStep(now);
    const vol = near(STUMP.x, STUMP.z);
    let moving = false;
    for (const c of crates) {
      if (!c.in) continue;
      const v = c.body.velocity;
      // An impact: a sudden change of velocity. A knock, a little dust and, for a big one, a hit-stop.
      const hit = dv.set(v.x, v.y, v.z).sub(c.v).length();
      c.v.set(v.x, v.y, v.z);
      if (st.mode !== 'rebuild' && hit > 2.2) {
        const k = Math.min(1, (hit - 2.2) / 6);
        knock(k, vol);
        puff(
          c.body.position.x,
          c.body.position.y - 0.3,
          c.body.position.z,
          3 + Math.round(6 * k),
          1 + 2 * k,
          WOOD,
          0.18,
        );
        if (hit > 4) st.freezeUntil = Math.max(st.freezeUntil, now + 45 + 35 * k);
      }
      if (Math.hypot(v.x, v.y, v.z) > 0.4) moving = true;
      const p = c.body.position;
      if (!c.fell && st.mode !== 'rebuild' && (p.y < top - 0.1 || flat(p.x, p.z, STUMP.x, STUMP.z) > R + 0.5)) {
        c.fell = true;
        st.fallen++;
        st.lastFall = now;
        if (st.mode === 'set') st.mode = 'live';
        pop(st.fallen, vol);
        paint();
        sign.punch();
      }
    }
    if (moving) st.lastMove = now;
    if (st.mode === 'live') {
      if (st.fallen > 0 && now - st.lastFall > RESET_AFTER && now - st.lastMove > 400) finish();
      // Shots that toppled nothing: once all is still for a few seconds, put things straight and count again.
      else if (!st.fallen && now - st.lastMove > RESET_AFTER + 2000) {
        const shifted = crates.some((c, i) => HOME[i].distanceTo(c.body.position) > 0.25);
        if (shifted) finish();
        else {
          st.mode = 'set';
          st.shots = 0;
          paint();
        }
      }
    }
    // Hit-stop: the drawn crates hold their pose for a few frames; physics never pauses.
    if (now < st.freezeUntil) return;
    for (const c of crates) {
      if (!c.in) continue;
      c.mesh.position.copy(c.body.interpolatedPosition);
      const q = c.body.quaternion;
      c.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    }
  },
  { phase: 'update', order: 60 },
);

/** For scenarios and the console: the round so far. */
export const toppleState = () => ({ mode: st.mode, fallen: st.fallen, shots: st.shots, best: best('topple') });
export const crateBodies = () => crates.map((c) => c.body);
