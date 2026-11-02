// Loose logs for the haul variants (?proto=haul&v=barrow|toss): real physics logs that tumble out of a tipped barrow
// or fly from your hand, roll, and settle. A log is counted from your own stack with the existing lockstep ops, so
// nothing new goes on the wire: one that touches down in (or rolls into) a ring of the open work site, or within a metre of it, is poured there
// (`site.stock`, as if you had walked in); one that comes to rest anywhere else becomes a ground pile (`pile.drop`, as
// a spill). Until the
// host applies that, the logs are still on your stack, so a refused edit loses nothing.
// Local: only this tab sees the flying logs (Owner-style: it's your stack).
import { rules } from '../../world/game-world.ts';
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { onApplied, submitEdit } from '../../world/sync.ts';
import { net } from '../../netplay/net.ts';
import { identity } from '../../player/identity.ts';
import { createBody, addBody, removeBody, material, type Body } from '../../physics/engine.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { pieceMesh, pieceColor, commitPieces, PIECE } from '../../render/haul-pieces.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { CELL, HALF, SEA, reducedMotion } from '../../constants.ts';
import { ROUTE, TRACK, HELPER, RING_R, ringAt } from '../../sim/route.ts';
import { materialOf } from '../../sim/materials.ts';
import { PILE_CAP } from '../../sim/piles.ts';

export const LOG_SCALE = 1.5; // drawn and simulated half as big again as a pile's piece: it has to read in flight
const LEN = PIECE.len * LOG_SCALE,
  R = PIECE.r * LOG_SCALE;
const MAX_LIVE = 40; // physics logs at once; a bigger spill puts several units on each
const SETTLE_V = 0.6; // m/s: slower than this...
const SETTLE_S = 0.35; // ...for this long is at rest
const MAX_S = 4; // a log still rolling after this long is counted where it is
const PENDING_MS = 2500; // a submitted count the host never applied is forgotten (the logs are still yours)

const logMat = material('loose-log', { friction: 0.7, restitution: 0.2 });
const sideways = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2); // cylinder along x

type Log = { body: Body; n: number; age: number; still: number; landed: boolean; k: number };
const live: Log[] = [];
const mesh = pieceMesh(MAX_LIVE);

/** Units of your stack that are out of it right now: flying, rolling, or counted and waiting for the host. */
let flying = 0;
const waiting: { n: number; at: number; op: string }[] = [];
export const outOfStack = () => flying + waiting.reduce((t, w) => t + w.n, 0);
/** What's left on your stack to throw or tip, after the logs already on their way. */
export const myLogs = () => (identity.pid ? Math.max(0, rules.stacks.count(identity.pid) - outOfStack()) : 0);

/** Throws n units (one physics log) from p with velocity v and a spin. Returns false when too many are out. */
export function launchLog(
  p: { x: number; y: number; z: number },
  v: { x: number; y: number; z: number },
  n = 1,
  spin = 6,
  yaw = Math.random() * Math.PI * 2,
): boolean {
  if (n < 1) return false;
  if (live.length >= MAX_LIVE) {
    // pile the units onto the youngest log rather than dropping them
    const last = live[live.length - 1];
    last.n += n;
    flying += n;
    return true;
  }
  const body = createBody({
    mass: 6,
    material: logMat,
    linearDamping: 0.15,
    angularDamping: 0.8,
    position: p,
    rotation: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
    shapes: [{ kind: 'cylinder', rTop: R, rBottom: R, h: LEN, segments: 8, rotation: sideways }],
  });
  body.velocity.set(v.x, v.y, v.z);
  // tumbling end over end about an axis across the throw
  const h = Math.hypot(v.x, v.z) || 1;
  body.angularVelocity.set((-v.z / h) * spin, (Math.random() - 0.5) * spin * 0.5, (v.x / h) * spin);
  addBody(body);
  const k = identity.pid ? Math.max(0, rules.stacks.kind(identity.pid)) : 0;
  live.push({ body, n, age: 0, still: 0, landed: false, k });
  flying += n;
  return true;
}

// Which ring of the open site (x, z) counts as in, or -1: the ring's radius plus a metre, so a log that lands at its
// edge counts (docs/research/carrying-and-logistics-play.md rec 5). Nearer ring first.
const COUNT_SLACK = 1;
function ringOf(x: number, z: number): number {
  const s = rules.sites.sites.open;
  if (s >= ROUTE.length) return -1;
  let best = -1,
    bestD = RING_R + COUNT_SLACK;
  for (const ring of [TRACK, HELPER]) {
    const c = ringAt(s, ring);
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < bestD) [best, bestD] = [ring, d];
  }
  return best;
}
/** Where a ring of the open site is and whether it takes logs, for the variants' prompts and juice. */
export function openRingNear(x: number, z: number, slack = 0): { ring: number; x: number; z: number } | null {
  const s = rules.sites.sites.open;
  if (s >= ROUTE.length || !identity.pid || rules.stacks.kind(identity.pid) !== materialOf(ROUTE[s].age)) return null;
  for (const ring of [TRACK, HELPER]) {
    const c = ringAt(s, ring);
    if (Math.hypot(x - c.x, z - c.z) < RING_R + slack && rules.sites.room(s, ring) > 0) return { ring, ...c };
  }
  return null;
}

const GOLD = new THREE.Color(0xffd36b),
  DUST = new THREE.Color(0xd9c49a);
function burst(x: number, y: number, z: number, color: THREE.Color, count: number, speed: number) {
  if (reducedMotion) return;
  for (let k = 0; k < count; k++)
    emit({
      x,
      y,
      z,
      vx: (Math.random() - 0.5) * speed,
      vy: 1 + Math.random() * speed * 0.6,
      vz: (Math.random() - 0.5) * speed,
      life: 0.35 + Math.random() * 0.35,
      size: color === GOLD ? 0.09 : 0.18,
      alpha: 0.85,
      color,
      gravity: color === GOLD ? 6 : 3,
      drag: 1.5,
      grow: color === GOLD ? [1, 0.4] : [1, 2.2],
      fade: 0.5,
    });
}

// "+n" over a ring when logs count: rises and fades (a few sprites, reused).
type Pop = { sprite: THREE.Sprite; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; t: number; n: number };
const popPool: Pop[] = [];
function pop(x: number, y: number, z: number, n: number) {
  let p = popPool.find((q) => q.t >= 1);
  if (!p && popPool.length < 8) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(1.4, 0.7, 1);
    sprite.renderOrder = 11;
    scene.add(sprite);
    popPool.push((p = { sprite, g: c.getContext('2d')!, tex, t: 1, n: 0 }));
  }
  if (!p) return;
  p.t = 0;
  p.sprite.position.set(x, y, z);
  if (p.n !== n) {
    p.n = n;
    const { g } = p;
    g.clearRect(0, 0, 128, 64);
    g.font = '800 46px Figtree, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(60, 36, 8, 0.9)';
    g.strokeText(`+${n}`, 64, 34);
    g.fillStyle = '#ffd36b';
    g.fillText(`+${n}`, 64, 34);
    p.tex.needsUpdate = true;
  }
}
function updatePops(dt: number) {
  for (const p of popPool) {
    p.sprite.visible = p.t < 1;
    if (p.t >= 1) continue;
    p.t = Math.min(1, p.t + dt / 0.9);
    p.sprite.position.y += dt * 1.2;
    p.sprite.material.opacity = 1 - p.t * p.t;
    const s = 1 + Math.sin(Math.min(1, p.t * 5) * Math.PI) * 0.35; // a pop, then settle
    p.sprite.scale.set(1.4 * s, 0.7 * s, 1);
  }
}

// Settled logs, gathered per frame: pours per ring, drops per cell.
const pours = new Map<number, number>();
const drops = new Map<string, { i: number; j: number; n: number }>();
function settle(log: Log) {
  const p = log.body.position;
  const ring = p.y > SEA - 0.2 ? ringOf(p.x, p.z) : -1;
  if (ring >= 0) {
    pours.set(ring, (pours.get(ring) ?? 0) + log.n);
    burst(p.x, p.y + 0.2, p.z, GOLD, 26, 4.5);
    pop(p.x, p.y + 0.6, p.z, log.n);
  } else {
    const i = Math.round((p.x + HALF) / CELL),
      j = Math.round((HALF - p.z) / CELL);
    const key = `${i},${j}`;
    const d = drops.get(key) ?? { i, j, n: 0 };
    d.n += log.n;
    drops.set(key, d);
  }
  removeBody(log.body);
  flying -= log.n;
}
function submit(now: number) {
  const s = rules.sites.sites.open;
  for (const [ring, n] of pours) {
    const room = Math.max(
      0,
      rules.sites.room(s, ring) - waiting.filter((w) => w.op === `site${ring}`).reduce((t, w) => t + w.n, 0),
    );
    const fit = Math.min(n, room);
    if (fit > 0 && submitEdit({ op: 'site.stock', i: 0, j: 0, s, ring, n: fit }))
      waiting.push({ n: fit, at: now, op: `site${ring}` });
    if (n > fit) {
      // the ring was full: what didn't fit lies beside it as a pile
      const c = ringAt(s, ring);
      const i = Math.round((c.x + HALF) / CELL),
        j = Math.round((HALF - c.z) / CELL) + 2;
      const d = drops.get(`${i},${j}`) ?? { i, j, n: 0 };
      d.n += n - fit;
      drops.set(`${i},${j}`, d);
    }
  }
  for (const d of drops.values())
    for (let left = d.n; left > 0; left -= PILE_CAP) {
      const n = Math.min(left, PILE_CAP);
      if (submitEdit({ op: 'pile.drop', i: d.i, j: d.j, n })) waiting.push({ n, at: now, op: 'pile' });
    }
  pours.clear();
  drops.clear();
}
// The host applied one of ours: those units have left the stack for real.
onApplied((e: { op: string; p: string; ring?: number; n: number }) => {
  if (e.p !== (net.room?.selfId ?? 'local')) return;
  const key = e.op === 'site.stock' ? `site${e.ring}` : e.op === 'pile.drop' ? 'pile' : '';
  if (!key) return;
  const w = waiting.findIndex((x) => x.op === key && x.n === e.n);
  if (w >= 0) waiting.splice(w, 1);
});

const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  at = new THREE.Vector3(),
  sc = new THREE.Vector3(LOG_SCALE, LOG_SCALE, LOG_SCALE);
onFrame(
  ({ dt, now }: { dt: number; now: number }) => {
    for (let w = waiting.length - 1; w >= 0; w--) if (now - waiting[w].at > PENDING_MS) waiting.splice(w, 1);
    let c = 0;
    for (let k = live.length - 1; k >= 0; k--) {
      const log = live[k];
      const b = log.body;
      const p = b.position,
        v = b.velocity;
      log.age += dt;
      const speed = Math.hypot(v.x, v.y, v.z);
      const g = groundHeight(p.x, p.z);
      if (!log.landed && p.y < g + R * 3 && log.age > 0.1) {
        log.landed = true;
        burst(p.x, g + 0.05, p.z, DUST, 8, 2.5); // a thud
      }
      if (p.y < g - 0.5) b.position.set(p.x, g + R, p.z); // through the heightfield: back on top
      if (log.landed) {
        // grass: once down, a log rolls a little and stops rather than bowling on down the hill
        const k = Math.exp(-dt * 1.4);
        v.x *= k;
        v.z *= k;
        const w = b.angularVelocity;
        w.set(w.x * k, w.y * k, w.z * k);
      }
      log.still = speed < SETTLE_V ? log.still + dt : 0;
      // a log that touches down in a ring (or rolls into one) counts there and then
      const inRing = log.age > 0.15 && p.y < g + R * 2.5 && ringOf(p.x, p.z) >= 0;
      if (inRing || log.still > SETTLE_S || log.age > MAX_S || p.y < SEA - 1.5) {
        settle(log);
        live.splice(k, 1);
        continue;
      }
      const ip = (b as Body & { interpolatedPosition: THREE.Vector3 }).interpolatedPosition;
      q.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      mesh.setMatrixAt(c, m4.compose(at.set(ip.x, ip.y, ip.z), q, sc));
      mesh.setColorAt(c++, pieceColor(log.k));
    }
    if (c || mesh.count) commitPieces(mesh, c);
    if (pours.size || drops.size) submit(now);
    updatePops(dt);
  },
  { phase: 'update', order: 40 },
);
