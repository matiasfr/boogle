// One cosmetic particle pool for dust, sand and spray. Local only: never networked and never read by the simulation,
// so floats and Math.random are fine. Default look: round soft dots (an instanced Sprite), used by splash foam
// (src/render/splash.ts), the ball's sand puff (features/impact.ts) and skid and splat dust (features/feel.ts).
//
//   emit(p)   one particle. p: { x, y, z, vx, vy, vz (m/s), life (s), size (m), color (THREE.Color),
//                    alpha (default 1), intensity (linear RGB only, default 1), gravity (m/s², default 0), drag (1/s, default 0),
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
  vec2,
  dot,
  clamp,
  sign,
  sin,
  cos,
  fwidth,
  smoothstep,
} from 'three/tsl';
import { guardDrawCount } from './draw-count.ts';

/** Same pool implementation for the game and isolated stage; no game lifecycle on import. */
export function createParticlePool(renderer: THREE.WebGPURenderer, now = () => performance.now()) {
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
  // Opt-in shape, birth angle, radians/second, age. Eight storage bindings in update, seven in spawn.
  const appearance = instancedArray(MAX, 'vec4');
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
    [posLife, velLife, colAlpha, look, motion].forEach((buf, k) =>
      buf.element(slot).assign(queue.element(base.add(k))),
    );
    appearance.element(slot).assign(vec4(queue.element(base.add(5)).yzw, 0));
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
    const size = lk.w
      .greaterThan(0)
      .select(grown.mul(min(1, f.div(lk.w))), grown)
      .toVar();
    const alpha = mo.x
      .greaterThan(0)
      .select(ca.w.mul(min(1, f.div(mo.x))), ca.w)
      .toVar();
    const ap = appearance.element(instanceIndex);
    ap.w.assign(f.oneMinus());
    If(ap.x.greaterThan(0), () => {
      // One quick expansion, then the caller's existing shrink/fade. Dots keep the exact old envelopes.
      const pop = smoothstep(0, 0.16, ap.w).mul(0.65).add(0.35);
      size.mulAssign(pop.mul(1.8));
      alpha.mulAssign(pop);
    });
    out.assign(vec4(pl.xyz, pl.w.greaterThan(0).select(size, 0)));
    drawCol.element(instanceIndex).assign(vec4(ca.xyz, alpha));
  })().compute(MAX);

  // The first dust of a session would build both passes mid-frame.
  spawnPass.setName('particles spawn');
  updatePass.setName('particles update');
  let computeReady = false;
  const prepare = async () => {
    await renderer.compileComputeAsync([spawnPass, updatePass]);
    computeReady = true;
  };

  // ---------------------------------------------------------------- dots and opt-in glints, one material/draw
  const softMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, fog: false });
  softMat.alphaToCoverage = false; // or MSAA dithers the soft edges
  softMat.positionNode = drawPos.toAttribute().xyz;
  softMat.scaleNode = drawPos.toAttribute().w;
  // Signed distance to a diamond: nearest point on its first-quadrant edge, reflected in both axes.
  const diamond = Fn(([p, b]: [THREE.Node<'vec2'>, THREE.Node<'vec2'>]) => {
    const q = p.abs();
    const edge = vec2(b.x, b.y.negate());
    const w = q.sub(vec2(0, b.y));
    const h = clamp(dot(w, edge).div(dot(edge, edge)), 0, 1);
    return length(w.sub(edge.mul(h))).mul(sign(q.x.mul(b.y).add(q.y.mul(b.x)).sub(b.x.mul(b.y))));
  });
  softMat.colorNode = Fn(() => {
    const ap = appearance.toAttribute();
    const angle = ap.y.add(ap.z.mul(ap.w).mul(velLife.toAttribute().w));
    const p = uv().mul(2).sub(1);
    const rotated = vec2(p.x.mul(cos(angle)).sub(p.y.mul(sin(angle))), p.x.mul(sin(angle)).add(p.y.mul(cos(angle))));
    // Union of two tapered diamonds: a compact, concave four-point star, not a rectangular plus.
    const star = min(diamond(rotated, vec2(0.86, 0.17)), diamond(rotated, vec2(0.17, 0.96))).toVar();
    // Derivatives must run uniformly, before any shape branch or discard (WGSL).
    const aa = max(fwidth(star), 0.001).toVar();
    const coverage = smoothstep(aa.negate(), aa, star).oneMinus().toVar();
    const d = length(uv().sub(0.5)).mul(2);
    const c = drawCol.toAttribute();
    const alpha = c.w.mul(d.mul(d).oneMinus()).toVar();
    If(ap.x.greaterThan(0), () => {
      alpha.assign(c.w.mul(coverage));
    }).Else(() => {
      Discard(d.greaterThan(1));
    });
    return vec4(c.xyz, alpha);
  })();
  drawPos.value.name = 'particles positions';
  drawCol.value.name = 'particles colors';
  const softPoints = guardDrawCount(new THREE.Sprite(softMat), () => MAX, 'particles');
  softPoints.count = MAX;
  softPoints.frustumCulled = false;
  softPoints.visible = false;
  softPoints.renderOrder = 5;

  // ---------------------------------------------------------------- emit
  const rgb = { r: 0, g: 0, b: 0 };
  const q = queue.value.array;
  let queued = 0,
    next = 0,
    liveUntil = 0; // when the last particle dies (an estimate: floors can end them sooner)
  const deathAt = new Float64Array(MAX); // CPU estimate of when each slot dies, for particleCounts()

  /** One particle (see the header). */
  type Particle = {
    x: number;
    y: number;
    z: number;
    vx?: number;
    vy?: number;
    vz?: number;
    life: number;
    size: number;
    color: THREE.Color;
    alpha?: number;
    intensity?: number;
    gravity?: number;
    drag?: number;
    floor?: number | null;
    grow?: [number, number];
    shrink?: number;
    fade?: number;
    /** Round is the unchanged default. Glint opts into a four-point SDF and a short size/alpha attack. */
    shape?: 'round' | 'glint';
    rotation?: number; // birth angle in radians; glint only
    spin?: number; // radians/second; glint only
  };
  function emit(p: Particle) {
    if (queued >= SPAWN) return;
    const k = queued++,
      o = k * Q * 4,
      slot = next;
    next = (next + 1) % MAX;
    p.color.getRGB(rgb); // linear: the output pass tone maps and encodes
    const intensity = p.intensity ?? 1;
    q.set([p.x, p.y, p.z, p.life], o);
    q.set([p.vx ?? 0, p.vy ?? 0, p.vz ?? 0, p.life], o + 4);
    q.set([rgb.r * intensity, rgb.g * intensity, rgb.b * intensity, p.alpha ?? 1], o + 8);
    q.set([p.size, p.grow?.[0] ?? 1, p.grow?.[1] ?? 1, p.shrink ?? 0], o + 12);
    q.set([p.fade ?? 0, p.gravity ?? 0, p.drag ?? 0, typeof p.floor === 'number' ? p.floor : NO_FLOOR], o + 16);
    q.set([slot, p.shape === 'glint' ? 1 : 0, p.rotation ?? 0, p.spin ?? 0], o + 20);
    deathAt[slot] = now() + p.life * 1000;
    liveUntil = Math.max(liveUntil, deathAt[slot]);
  }

  // ---------------------------------------------------------------- update
  function update(frameDt: number) {
    // The loading deadline can expire while compilation continues. Three caches its wrapper before
    // createComputePipelineAsync resolves; dispatching it then would call setPipeline(undefined).
    if (!computeReady) return;
    if (queued) {
      queue.value.needsUpdate = true;
      spawnCount.value = queued;
      void renderer.compute(spawnPass); // computeReady guarantees initialization; dispatch stays in this frame
      queued = 0;
    }
    if (now() > liveUntil) {
      softPoints.visible = false;
      return;
    } // nothing alive: no pass, no draw
    softPoints.visible = true;
    dt.value = frameDt;
    void renderer.compute(updatePass);
  }

  // Live counts, for scenarios and dev tooling: estimated from lifetimes (the GPU state is never read back).
  function counts() {
    const time = now();
    let n = 0;
    for (let k = 0; k < MAX; k++) if (deathAt[k]! > time) n++;
    return { soft: n };
  }
  return { object: softPoints, prepare, emit, update, counts };
}
export type Particle = Parameters<ReturnType<typeof createParticlePool>['emit']>[0];
