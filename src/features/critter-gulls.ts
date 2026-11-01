// Gulls, cosmetic tier: a few gulls idle and peck on the sand, burst into the air when a
// player runs at them or the ball lands nearby, circle for a while and resettle somewhere quiet. Two instanced meshes
// (bodies, wings). Local Math.random is fine: nothing here is read by the sim.
// Serves DESIGN.md 9 (alive island) and 10 (running at gulls is the oldest beach toy).
import * as THREE from 'three';
import { onFrame, onStart } from '../loop.ts';
import { scene } from '../render/scene.ts';
import { createPool } from '../render/instances.ts';
import { groundHeight } from '../adapters/terrain.ts';
import { waterField } from '../physics/water-field.ts';
import { ball } from '../physics/ball.ts';
import { me } from '../player/player.ts';
import { remotes } from '../netplay/net.ts';

const GULLS = {
  count: 7,
  scareRun: 4.5, // m: a player running (>= 3 m/s) this close
  scareBall: 5, // m: a ball landing this close
  flySpeed: 7,
  circleR: [8, 14] as [number, number],
  circleH: [6, 10] as [number, number],
  circleS: [6, 12] as [number, number], // seconds up before resettling
};

const bodyGeo = new THREE.SphereGeometry(0.17, 8, 6).scale(1, 0.8, 2.1);
const wingGeo = new THREE.PlaneGeometry(0.62, 0.24).translate(0.31, 0, 0).rotateX(-Math.PI / 2);
const bodyPool = createPool(bodyGeo, new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.8 }), GULLS.count);
const wingPool = createPool(
  wingGeo,
  new THREE.MeshStandardMaterial({ color: '#c9d1da', roughness: 0.8, side: THREE.DoubleSide }),
  GULLS.count * 2,
);
const bodies = bodyPool.mesh,
  wings = wingPool.mesh;
for (const m of [bodies, wings]) {
  m.visible = false;
  m.castShadow = true;
  scene.add(m);
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const dry = (x: number, z: number) => {
  const g = groundHeight(x, z);
  return g > 0.4 && g < 2.4 && waterField.surfaceAt(x, z) <= g + 0.02;
};
function landingSpot(nearX: number, nearZ: number, avoid: { x: number; z: number }[]) {
  for (let tries = 0; tries < 40; tries++) {
    const a = Math.random() * Math.PI * 2,
      r = rnd(4, 30);
    const x = nearX + Math.cos(a) * r,
      z = nearZ + Math.sin(a) * r;
    if (Math.hypot(x, z) > 62 || !dry(x, z)) continue;
    if (avoid.some((p) => Math.hypot(p.x - x, p.z - z) < 8)) continue;
    return { x, z };
  }
  return null;
}

type Gull = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  state: string;
  t: number;
  flap: number;
  hop: number;
  // set when it takes off (circle centre, radius, height, angle) and when it heads down (target)
  cx: number;
  cz: number;
  cr: number;
  ch: number;
  ang: number;
  tx: number;
  tz: number;
};
const G: Gull[] = [];
onStart(() => {
  // a flock on a stretch of beach
  let spot: { x: number; z: number } | null = null;
  for (let tries = 0; tries < 200 && !spot; tries++) {
    const a = Math.random() * Math.PI * 2,
      r = rnd(38, 55);
    if (dry(Math.cos(a) * r, Math.sin(a) * r)) spot = { x: Math.cos(a) * r, z: Math.sin(a) * r };
  }
  spot ??= { x: 20, z: 30 };
  for (let k = 0; k < GULLS.count; k++) {
    const s = landingSpot(spot.x, spot.z, []) ?? spot;
    G.push({
      x: s.x,
      y: groundHeight(s.x, s.z),
      z: s.z,
      yaw: rnd(0, 6.3),
      state: 'idle',
      t: rnd(0, 3),
      flap: 0,
      hop: 0, // every field from the start: one object shape for all gulls
      cx: 0,
      cz: 0,
      cr: 0,
      ch: 0,
      ang: 0,
      tx: 0,
      tz: 0,
    });
  }
});

// Players near the gulls, refilled every frame into reused entries (the hot path allocates nothing).
type Threat = { p: { x: number; z: number }; run: boolean };
const th: Threat[] = [];
let threatCount = 0;
function threat(p: { x: number; z: number }, run: boolean) {
  const t = th[threatCount] ?? (th[threatCount] = { p, run });
  t.p = p;
  t.run = run;
  threatCount++;
}
function threats() {
  threatCount = 0;
  if (me.body && me.entered) {
    const v = me.body.velocity;
    threat(me.body.position, v.x * v.x + v.z * v.z >= 9);
  }
  for (const r of remotes.values()) if (r.avatar) threat(r.target, r.speed >= 3);
}
const RUN2 = GULLS.scareRun * GULLS.scareRun,
  BALL2 = GULLS.scareBall * GULLS.scareBall;
function scaredBy(g: Gull, ballLanding: boolean, bp: THREE.Vector3) {
  for (let k = 0; k < threatCount; k++) {
    const t = th[k];
    const dx = t.p.x - g.x,
      dz = t.p.z - g.z;
    if (t.run && dx * dx + dz * dz < RUN2) return true;
  }
  const dx = bp.x - g.x,
    dz = bp.z - g.z;
  return ballLanding && dx * dx + dz * dz < BALL2;
}

const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  one = new THREE.Vector3(1, 1, 1),
  UP = new THREE.Vector3(0, 1, 0),
  sc = new THREE.Vector3(),
  v3 = new THREE.Vector3(),
  off = new THREE.Vector3();
let lastBallY = 0;

onFrame(
  ({ dt, elapsed }) => {
    const on = G.length > 0;
    bodies.visible = wings.visible = on;
    if (!on || dt <= 0) return;
    threats();
    const bp = ball.mesh.position;
    const ballLanding = lastBallY - bp.y > 0.03 && bp.y - groundHeight(bp.x, bp.z) < 0.7;
    lastBallY = bp.y;
    bodyPool.begin();
    wingPool.begin();
    for (let k = 0; k < G.length; k++) {
      const g = G[k];
      g.t -= dt;
      if (g.state === 'idle') {
        if (scaredBy(g, ballLanding, bp)) {
          g.state = 'up';
          g.cx = g.x + rnd(-6, 6);
          g.cz = g.z + rnd(-6, 6);
          g.cr = rnd(...GULLS.circleR);
          g.ch = groundHeight(g.x, g.z) + rnd(...GULLS.circleH);
          g.ang = Math.atan2(g.z - g.cz, g.x - g.cx);
          g.t = rnd(...GULLS.circleS);
        } else if (g.t <= 0) {
          g.yaw += rnd(-1.2, 1.2); // a little turn and hop now and then
          g.t = rnd(1, 4);
          g.hop = 0.25;
        }
        g.hop = Math.max(0, g.hop - dt);
        g.y = groundHeight(g.x, g.z) + Math.sin((g.hop / 0.25) * Math.PI) * 0.12;
        g.flap = Math.max(0, g.flap - dt * 4);
      } else if (g.state === 'up') {
        // circle around a point, climbing; when the time is up, pick a quiet place and glide down to it
        g.ang += (GULLS.flySpeed / g.cr) * dt;
        const tx = g.cx + Math.cos(g.ang) * g.cr,
          tz = g.cz + Math.sin(g.ang) * g.cr;
        const k2 = Math.min(1, dt * 2);
        g.yaw = Math.atan2(tx - g.x, tz - g.z);
        g.x += (tx - g.x) * k2;
        g.z += (tz - g.z) * k2;
        g.y += (g.ch - g.y) * Math.min(1, dt * 1.5);
        g.flap = 1;
        if (g.t <= 0) {
          const s = landingSpot(
            g.cx,
            g.cz,
            th.slice(0, threatCount).map((t) => t.p),
          );
          if (s) {
            g.state = 'down';
            g.tx = s.x;
            g.tz = s.z;
          } else g.t = 2;
        }
      } else {
        const dx = g.tx - g.x,
          dz = g.tz - g.z,
          d = Math.sqrt(dx * dx + dz * dz);
        const gy = groundHeight(g.tx, g.tz);
        g.yaw = Math.atan2(dx, dz);
        const step = Math.min(d, GULLS.flySpeed * dt);
        g.x += (dx / (d || 1)) * step;
        g.z += (dz / (d || 1)) * step;
        g.y += (gy + Math.min(d * 0.4, 8) - g.y) * Math.min(1, dt * 2);
        g.flap = d > 3 ? 0.6 : 0.3;
        if (d < 0.2) {
          g.state = 'idle';
          g.t = rnd(1, 3);
        }
      }
      const pos = v3.set(g.x, g.y + 0.16, g.z);
      q.setFromEuler(e.set(0, g.yaw, 0));
      bodyPool.pushMatrix(m4.compose(pos, q, one));
      // wings: flap when flying, folded along the body when idle
      const flying = g.state !== 'idle';
      const beat = flying ? Math.sin(elapsed * 13 + k) * 0.7 * g.flap : -0.15;
      const span = flying ? 1 : 0.45;
      for (let side = 1; side >= -1; side -= 2) {
        q.setFromEuler(e.set(0, g.yaw, side * beat, 'YXZ'));
        off.set(0.1 * side, 0.05, 0).applyAxisAngle(UP, g.yaw);
        m4.compose(v3.copy(pos).add(off), q, sc.set(side * span, 1, 1));
        wingPool.pushMatrix(m4);
      }
    }
    bodyPool.end();
    wingPool.end();
  },
  { phase: 'update' },
);

window.__gulls = G;
