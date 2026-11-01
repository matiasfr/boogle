// One cosmetic particle pool for dust, sand and spray. Local only: never networked and never read by the simulation,
// so floats and Math.random are fine. One look: round soft dots (an instanced Sprite), used by splash foam
// (src/render/splash.js), the ball's sand puff (features/impact.js) and skid and splat dust (features/feel.js).
//
//   emit(p)   one particle. p: { x, y, z, vx, vy, vz (m/s), life (s), size (m), color (THREE.Color),
//                    alpha (default 1), gravity (m/s², default 0), drag (1/s, default 0),
//                    floor: a height it dies falling through (water level),
//                    grow: [start, end] size multipliers over its life (default [1, 1]),
//                    shrink: the last fraction of its life it shrinks to nothing over (default 0, none),
//                    fade: the last fraction of its life its alpha fades out over (default 0, none) }
// GPU particles (docs/plans/game-loop.md, step 4): the state lives in storage buffers and a compute pass ages and moves
// it, so the CPU does nothing per particle. emit() queues a particle; once a frame the queue is uploaded, a spawn pass
// copies it into its slots (round-robin, so a full pool replaces the oldest), and an update pass integrates every slot
// and writes what the sprite draws. Dead slots draw at size 0.
import * as THREE from 'three/webgpu';
import {
  Fn,
  Discard,
  length,
  uv,
  vec4,
  float,
  uint,
  If,
  Return,
  instanceIndex,
  instancedArray,
  uniform,
  exp,
  max,
  min,
} from 'three/tsl';
import { renderer, scene } from './scene.js';
import { onFrame } from '../loop.ts';

const MAX = 720; // slots
const SPAWN = 256; // particles one frame can emit (more are dropped)
const NO_FLOOR = -1e9;

// Per slot, on the GPU: position + life left, velocity + full life, colour + alpha, look (size, grow0, grow1, shrink),
// motion (fade, gravity, drag, floor height).
const posLife = instancedArray(MAX, 'vec4'),
  velLife = instancedArray(MAX, 'vec4'),
  colAlpha = instancedArray(MAX, 'vec4'),
  look = instancedArray(MAX, 'vec4'),
  motion = instancedArray(MAX, 'vec4');
// What the sprite reads: centre + size, colour + alpha (written by the update pass).
const drawPos = instancedArray(MAX, 'vec4'),
  drawCol = instancedArray(MAX, 'vec4');
// The spawn queue, uploaded whole each frame something was emitted: per particle the five vec4s above, then its slot
// (one buffer, so the spawn pass stays within WebGPU's 8 storage buffers per stage).
const Q = 6;
const queue = instancedArray(new Float32Array(SPAWN * Q * 4), 'vec4');
const spawnCount = uniform(0),
  dt = uniform(0);

const spawnPass = Fn(() => {
  If(float(instanceIndex).greaterThanEqual(spawnCount), () => Return());
  const base = instanceIndex.mul(Q);
  const slot = uint(queue.element(base.add(5)).x);
  [posLife, velLife, colAlpha, look, motion].forEach((buf, k) => buf.element(slot).assign(queue.element(base.add(k))));
})().compute(SPAWN);

const updatePass = Fn(() => {
  const pl = posLife.element(instanceIndex),
    vl = velLife.element(instanceIndex),
    lk = look.element(instanceIndex),
    mo = motion.element(instanceIndex),
    ca = colAlpha.element(instanceIndex);
  const out = drawPos.element(instanceIndex);
  If(pl.w.lessThanEqual(0), () => {
    out.w.assign(0);
    Return();
  });
  pl.w.subAssign(dt);
  vl.xyz.mulAssign(exp(dt.negate().mul(mo.z)));
  vl.y.subAssign(mo.y.mul(dt));
  pl.xyz.addAssign(vl.xyz.mul(dt));
  If(vl.y.lessThan(0).and(pl.y.lessThan(mo.w)), () => pl.w.assign(0)); // fell through its floor (water)
  const f = max(pl.w, 0).div(vl.w); // life left, 1 -> 0
  const grown = lk.x.mul(lk.y.add(lk.z.sub(lk.y).mul(f.oneMinus())));
  const size = lk.w.greaterThan(0).select(grown.mul(min(1, f.div(lk.w))), grown);
  const alpha = mo.x.greaterThan(0).select(ca.w.mul(min(1, f.div(mo.x))), ca.w);
  out.assign(vec4(pl.xyz, pl.w.greaterThan(0).select(size, 0)));
  drawCol.element(instanceIndex).assign(vec4(ca.xyz, alpha));
})().compute(MAX);

// ---------------------------------------------------------------- soft dots
const softMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, fog: false });
softMat.alphaToCoverage = false; // or MSAA dithers the soft edges
softMat.positionNode = drawPos.toAttribute().xyz;
softMat.scaleNode = drawPos.toAttribute().w;
softMat.colorNode = Fn(() => {
  const d = length(uv().sub(0.5)).mul(2);
  Discard(d.greaterThan(1));
  const c = drawCol.toAttribute();
  return vec4(c.xyz, c.w.mul(d.mul(d).oneMinus()));
})();
const softPoints = new THREE.Sprite(softMat);
softPoints.count = MAX;
softPoints.frustumCulled = false;
softPoints.visible = false;
softPoints.renderOrder = 5;
scene.add(softPoints);

// ---------------------------------------------------------------- emit
const rgb = { r: 0, g: 0, b: 0 };
const q = queue.value.array;
let queued = 0,
  next = 0,
  liveUntil = 0; // when the last particle dies (an estimate: floors can end them sooner)
const deathAt = new Float64Array(MAX); // CPU estimate of when each slot dies, for particleCounts()

export function emit(p) {
  if (queued >= SPAWN) return;
  const k = queued++,
    o = k * Q * 4,
    slot = next;
  next = (next + 1) % MAX;
  p.color.getRGB(rgb); // linear: the output pass tone maps and encodes
  q.set([p.x, p.y, p.z, p.life], o);
  q.set([p.vx ?? 0, p.vy ?? 0, p.vz ?? 0, p.life], o + 4);
  q.set([rgb.r, rgb.g, rgb.b, p.alpha ?? 1], o + 8);
  q.set([p.size, p.grow?.[0] ?? 1, p.grow?.[1] ?? 1, p.shrink ?? 0], o + 12);
  q.set([p.fade ?? 0, p.gravity ?? 0, p.drag ?? 0, typeof p.floor === 'number' ? p.floor : NO_FLOOR], o + 16);
  q[o + 20] = slot;
  deathAt[slot] = performance.now() + p.life * 1000;
  liveUntil = Math.max(liveUntil, deathAt[slot]);
}

// ---------------------------------------------------------------- update
onFrame(
  ({ dt: frameDt }) => {
    if (queued) {
      queue.value.needsUpdate = true;
      spawnCount.value = queued;
      renderer.compute(spawnPass);
      queued = 0;
    }
    if (performance.now() > liveUntil) return (softPoints.visible = false); // nothing alive: no pass, no draw
    softPoints.visible = true;
    dt.value = frameDt;
    renderer.compute(updatePass);
  },
  { phase: 'late', order: -20 },
);

// Live counts, for scenarios and dev tooling: estimated from lifetimes (the GPU state is never read back).
export function particleCounts() {
  const now = performance.now();
  let n = 0;
  for (let k = 0; k < MAX; k++) if (deathAt[k] > now) n++;
  return { soft: n };
}
