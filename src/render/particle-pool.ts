// One Local cosmetic GPU pool, shared by the game and isolated asset stage. Never read by simulation.
// Fixed slots replace oldest births; all silhouettes share one alpha-blended draw. No per-frame CPU particles.
import * as THREE from 'three/webgpu';
import {
  Fn,
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
  mix,
  texture,
} from 'three/tsl';
import { guardDrawCount } from './draw-count.ts';

/** Multipliers at birth, half-life and death; smooth interpolation, no per-emitter shader. */
export type ParticleCurve = readonly [number, number, number];
export type Particle = {
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
  grow?: readonly [number, number];
  shrink?: number;
  fade?: number;
  shape?: 'round' | 'glint' | 'star' | 'quad' | 'chip' | 'dust';
  rotation?: number; // birth radians
  spin?: number; // radians/second
  /** Floor restitution, then a 180 ms retirement. Unset retains floor death (water spray). */
  bounce?: number;
  sizeCurve?: ParticleCurve;
  alphaCurve?: ParticleCurve;
  /** Linear-RGB interpolation at birth, half-life and death; intensity is applied once to every key. */
  colorCurve?: readonly [THREE.Color, THREE.Color, THREE.Color];
};

// Our own padded, soft lobes. Generated once per pool, 16 KiB RGBA8, no downloaded asset or runtime noise.
function dustTexture() {
  const side = 64,
    pixels = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      const u = ((x + 0.5) / side) * 2 - 1,
        v = ((y + 0.5) / side) * 2 - 1;
      const lobes =
        Math.exp(-5 * ((u + 0.28) ** 2 + (v + 0.1) ** 2)) +
        0.9 * Math.exp(-7 * ((u - 0.24) ** 2 + (v - 0.2) ** 2)) +
        0.7 * Math.exp(-9 * ((u - 0.12) ** 2 + (v + 0.35) ** 2));
      const i = (y * side + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
      pixels[i + 3] = Math.round(255 * Math.min(1, lobes) * Math.max(0, 1 - u * u - v * v));
    }
  const map = new THREE.DataTexture(pixels, side, side);
  map.name = 'procedural dust lobes';
  map.minFilter = map.magFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  return map;
}

/** No game lifecycle on import. Clocks are injected for the asset stage. */
export function createParticlePool(renderer: THREE.WebGPURenderer, now = () => performance.now()) {
  const MAX = 720,
    SPAWN = 256,
    NO_FLOOR = -1e9;
  // Packed vec4 records: position/life, velocity/full life, colour/alpha, size/grow/shrink,
  // fade/gravity/drag/floor, shape/rotation/spin/elapsed, size curve, alpha curve, middle colour, end colour/bounce.
  // One state buffer avoids growing the storage-binding count with each authoring feature.
  const STRIDE = 10,
    Q = STRIDE + 1;
  const state = instancedArray(MAX * STRIDE, 'vec4');
  const drawPos = instancedArray(MAX, 'vec4'),
    drawCol = instancedArray(MAX, 'vec4'),
    drawLook = instancedArray(MAX, 'vec4');
  const queue = instancedArray(new Float32Array(SPAWN * Q * 4), 'vec4');
  const spawnCount = uniform(0),
    dt = uniform(0);
  const spawnPass = Fn(() => {
    If(float(instanceIndex).greaterThanEqual(spawnCount), () => Return());
    const base = instanceIndex.mul(Q);
    const target = uint(queue.element(base.add(STRIDE)).x).mul(STRIDE);
    for (let k = 0; k < STRIDE; k++) state.element(target.add(k)).assign(queue.element(base.add(k)));
  })().compute(SPAWN);
  const curve = Fn(([keys, age]: [THREE.Node<'vec3'>, THREE.Node<'float'>]) =>
    mix(mix(keys.x, keys.y, smoothstep(0, 0.5, age)), keys.z, smoothstep(0.5, 1, age)),
  );
  const updatePass = Fn(() => {
    const base = instanceIndex.mul(STRIDE),
      pl = state.element(base),
      vl = state.element(base.add(1)),
      ca = state.element(base.add(2)),
      lk = state.element(base.add(3)),
      mo = state.element(base.add(4)),
      ap = state.element(base.add(5)),
      end = state.element(base.add(9));
    const out = drawPos.element(instanceIndex);
    If(pl.w.lessThanEqual(0), () => {
      out.w.assign(0);
      Return();
    });
    pl.w.subAssign(dt);
    vl.xyz.mulAssign(exp(dt.negate().mul(mo.z)));
    vl.y.subAssign(mo.y.mul(dt));
    pl.xyz.addAssign(vl.xyz.mul(dt));
    If(vl.y.lessThan(0).and(pl.y.lessThan(mo.w)), () => {
      If(end.w.greaterThan(0), () => {
        pl.y.assign(mo.w);
        vl.y.assign(vl.y.negate().mul(end.w));
        vl.xz.mulAssign(0.35);
        pl.w.assign(min(pl.w, 0.18));
      }).Else(() => {
        pl.w.assign(0);
      });
    });
    const f = max(pl.w, 0).div(vl.w),
      age = f.oneMinus();
    const grown = lk.x.mul(mix(lk.y, lk.z, age));
    const size = lk.w
      .greaterThan(0)
      .select(grown.mul(min(1, f.div(lk.w))), grown)
      .mul(curve(state.element(base.add(6)).xyz, age))
      .toVar();
    const alpha = mo.x
      .greaterThan(0)
      .select(ca.w.mul(min(1, f.div(mo.x))), ca.w)
      .mul(curve(state.element(base.add(7)).xyz, age))
      .toVar();
    If(ap.x.equal(1), () => {
      // Preserve the axe glint's existing brief attack.
      const pop = smoothstep(0, 0.16, age).mul(0.65).add(0.35);
      size.mulAssign(pop.mul(1.8));
      alpha.mulAssign(pop);
    });
    const rgb = mix(
      mix(ca.xyz, state.element(base.add(8)).xyz, smoothstep(0, 0.5, age)),
      end.xyz,
      smoothstep(0.5, 1, age),
    );
    out.assign(vec4(pl.xyz, pl.w.greaterThan(0).select(size, 0)));
    drawCol.element(instanceIndex).assign(vec4(rgb, alpha));
    // Rotation uses elapsed seconds, independent of the lifetime curve's ground retirement.
    ap.w.addAssign(dt);
    drawLook.element(instanceIndex).assign(vec4(ap.x, ap.y.add(ap.z.mul(ap.w)), age, ap.w));
  })().compute(MAX);
  spawnPass.setName('particles spawn');
  updatePass.setName('particles update');
  let computeReady = false;
  const prepare = async () => {
    await renderer.compileComputeAsync([spawnPass, updatePass]);
    computeReady = true;
  };

  const mat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, fog: false });
  mat.alphaToCoverage = false;
  mat.positionNode = drawPos.toAttribute().xyz;
  mat.scaleNode = drawPos.toAttribute().w;
  const diamond = Fn(([p, b]: [THREE.Node<'vec2'>, THREE.Node<'vec2'>]) => {
    const q = p.abs(),
      edge = vec2(b.x, b.y.negate()),
      w = q.sub(vec2(0, b.y));
    const h = clamp(dot(w, edge).div(dot(edge, edge)), 0, 1);
    return length(w.sub(edge.mul(h))).mul(sign(q.x.mul(b.y).add(q.y.mul(b.x)).sub(b.x.mul(b.y))));
  });
  const dust = dustTexture();
  mat.colorNode = Fn(() => {
    const ap = drawLook.toAttribute(),
      c = drawCol.toAttribute(),
      p = uv().mul(2).sub(1);
    const angle = ap.y,
      rotated = vec2(p.x.mul(cos(angle)).sub(p.y.mul(sin(angle))), p.x.mul(sin(angle)).add(p.y.mul(cos(angle))));
    const star = min(diamond(rotated, vec2(0.86, 0.17)), diamond(rotated, vec2(0.17, 0.96)));
    const tumble = cos(angle.mul(1.7)).abs().mul(0.8).add(0.2);
    // A tapered, flat splinter; the changing projected width and face shade suggest tumbling.
    const chip = max(
      rotated.x.abs().sub(0.78),
      rotated.y
        .abs()
        .div(tumble)
        .sub(float(0.22).add(rotated.x.mul(0.09))),
    );
    const quad = max(rotated.x.abs(), rotated.y.abs()).sub(0.7);
    // Derivatives and texture sampling stay uniform before shape selection (WGSL).
    const starA = smoothstep(max(fwidth(star), 0.001).negate(), max(fwidth(star), 0.001), star)
      .oneMinus()
      .toVar();
    const chipA = smoothstep(max(fwidth(chip), 0.001).negate(), max(fwidth(chip), 0.001), chip)
      .oneMinus()
      .toVar();
    const quadA = smoothstep(max(fwidth(quad), 0.001).negate(), max(fwidth(quad), 0.001), quad)
      .oneMinus()
      .toVar();
    const dustA = texture(dust, rotated.mul(0.5).add(0.5)).a.toVar();
    const alpha = max(0, dot(p, p).oneMinus()).toVar(),
      shade = float(1).toVar();
    If(ap.x.equal(1), () => {
      alpha.assign(starA);
    });
    If(ap.x.equal(2), () => {
      alpha.assign(quadA);
    });
    If(ap.x.equal(3), () => {
      alpha.assign(chipA);
      shade.assign(tumble.mul(0.25).add(0.75));
    });
    If(ap.x.equal(4), () => {
      alpha.assign(dustA);
    });
    return vec4(c.xyz.mul(shade), c.w.mul(alpha));
  })();
  drawPos.value.name = 'particles positions';
  drawCol.value.name = 'particles colors';
  const object = guardDrawCount(new THREE.Sprite(mat), () => MAX, 'particles');
  object.count = MAX;
  object.frustumCulled = false;
  object.visible = false;
  object.renderOrder = 5;

  const rgb = { r: 0, g: 0, b: 0 },
    q = queue.value.array;
  let queued = 0,
    next = 0,
    liveUntil = 0,
    admitted = 0,
    dropped = 0,
    replaced = 0,
    uploads = 0;
  const deathAt = new Float64Array(MAX);
  // Scalar writes, including emit bursts: no temporary arrays/colours on frame paths.
  function four(o: number, a: number, b: number, c: number, d: number) {
    q[o] = a;
    q[o + 1] = b;
    q[o + 2] = c;
    q[o + 3] = d;
  }
  function colorAt(o: number, color: THREE.Color, intensity: number, alpha: number) {
    color.getRGB(rgb);
    four(o, rgb.r * intensity, rgb.g * intensity, rgb.b * intensity, alpha);
  }
  function emit(p: Particle) {
    if (queued >= SPAWN) {
      dropped++;
      return;
    }
    const o = queued++ * Q * 4,
      slot = next,
      time = now(),
      intensity = p.intensity ?? 1;
    next = (next + 1) % MAX;
    if (deathAt[slot]! > time) replaced++;
    admitted++;
    four(o, p.x, p.y, p.z, p.life);
    four(o + 4, p.vx ?? 0, p.vy ?? 0, p.vz ?? 0, p.life);
    colorAt(o + 8, p.colorCurve?.[0] ?? p.color, intensity, p.alpha ?? 1);
    four(o + 12, p.size, p.grow?.[0] ?? 1, p.grow?.[1] ?? 1, p.shrink ?? 0);
    four(o + 16, p.fade ?? 0, p.gravity ?? 0, p.drag ?? 0, p.floor ?? NO_FLOOR);
    const shape =
      p.shape === 'glint' || p.shape === 'star'
        ? 1
        : p.shape === 'quad'
          ? 2
          : p.shape === 'chip'
            ? 3
            : p.shape === 'dust'
              ? 4
              : 0;
    four(o + 20, shape, p.rotation ?? 0, p.spin ?? 0, 0);
    four(o + 24, p.sizeCurve?.[0] ?? 1, p.sizeCurve?.[1] ?? 1, p.sizeCurve?.[2] ?? 1, 0);
    four(o + 28, p.alphaCurve?.[0] ?? 1, p.alphaCurve?.[1] ?? 1, p.alphaCurve?.[2] ?? 1, 0);
    colorAt(o + 32, p.colorCurve?.[1] ?? p.color, intensity, 0);
    colorAt(o + 36, p.colorCurve?.[2] ?? p.color, intensity, p.bounce ?? 0);
    four(o + 40, slot, 0, 0, 0);
    deathAt[slot] = time + p.life * 1000;
    liveUntil = Math.max(liveUntil, deathAt[slot]);
  }
  function update(frameDt: number) {
    if (!computeReady) return;
    if (queued) {
      queue.value.needsUpdate = true;
      spawnCount.value = queued;
      void renderer.compute(spawnPass);
      uploads++;
      queued = 0;
    }
    if (now() > liveUntil) {
      object.visible = false;
      return;
    }
    object.visible = true;
    dt.value = frameDt;
    void renderer.compute(updatePass);
  }
  // Occupancy is an upper bound: no GPU readback, and a floor can retire a slot earlier.
  function counts() {
    const time = now();
    let n = 0;
    for (let k = 0; k < MAX; k++) if (deathAt[k]! > time) n++;
    return {
      soft: n,
      capacity: MAX,
      spawnCapacity: SPAWN,
      queued,
      admitted,
      dropped,
      replaced,
      draws: object.visible ? 1 : 0,
      uploadBytes: uploads * q.byteLength,
      uploadBytesPerBatch: q.byteLength,
      storageBytes: (MAX * (STRIDE + 3) + SPAWN * Q) * 16,
    };
  }
  return { object, prepare, emit, update, counts };
}
