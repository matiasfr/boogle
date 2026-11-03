// Ultra Water, OceanSim.js EVOLVE/FFT/ASSEMBLE and OceanSurface.js's cascade sampling, as native TSL compute.
// Research: docs/research/ultra-water.md, FFT section. Local decoration; DESIGN.md 1 (Toys before chores).
// One workgroup transforms a whole row/column. All Stockham stages stay in shared memory, not full-screen passes.
import * as THREE from 'three/webgpu';
import { renderer } from '../scene.ts';
import { bakeH0, CASCADE_LENGTHS, OCEAN } from './spectrum.ts';
import { uTime, vnoise } from './shore-nodes.ts';
import { FFT, ULTRA } from './tuning.ts';
import { TSL, type N } from './tsl.ts';
import type { WaveSource } from './waves.ts';

const { Fn, Loop, attributeArray, clamp, cos, float, floor, fract, invocationLocalIndex, length, log2 } = TSL;
const {
  max,
  min,
  mix,
  packHalf2x16,
  select,
  sin,
  smoothstep,
  sqrt,
  storageTexture,
  texture,
  textureLoad,
  textureStore,
} = TSL;
const {
  uint,
  uniform,
  uniformArray,
  unpackHalf2x16,
  uvec2,
  vec2,
  vec3,
  vec4,
  workgroupArray,
  workgroupBarrier,
  workgroupId,
} = TSL;
const TAU = 2 * Math.PI;
const cmul = (a: N, b: N) => vec2(a.x.mul(b.x).sub(a.y.mul(b.y)), a.x.mul(b.y).add(a.y.mul(b.x)));
const pack2 = (a: N, b: N) => vec2(a.x.sub(b.y), a.y.add(b.x));
// Scratch matches rgba16float rounding, so every mip averages the values actually written to the preceding level.
// These are core packing builtins, not shader-f16 arithmetic.
const half = (v: N) => vec4(unpackHalf2x16(packHalf2x16(v.xy)), unpackHalf2x16(packHalf2x16(v.zw)));

function outputTexture(size: number, cascades: number) {
  const t = new THREE.StorageArrayTexture(size, size, cascades);
  t.type = THREE.HalfFloatType;
  t.format = THREE.RGBAFormat;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; // allocate the entire chain; we fill it, never three's raster mip generator
  t.mipmapsAutoUpdate = false;
  t.anisotropy = 8;
  return t;
}

// Inverse Stockham, e^{+i}, without 1/N scaling (the spectrum already contains dk²).
// Each lane reads its butterfly into registers, then ALL lanes finish reading before any overwrite shared memory.
// Two vec4 arrays = 8192 bytes at N=256; 256 invocations; no optional GPU features or divergent barriers.
function transform(a: N, b: N, size: number) {
  const lane = invocationLocalIndex;
  workgroupBarrier();
  Loop({ start: uint(2), end: uint(size), type: 'uint', condition: '<=', update: '<<= 1' }, ({ i: sub }: { i: N }) => {
    const hs = sub.shiftRight(1).toVar();
    const e = lane
      .div(sub)
      .mul(hs)
      .add(lane.bitAnd(hs.sub(1)))
      .toVar();
    const angle = float(lane.bitAnd(sub.sub(1)))
      .mul(TAU)
      .div(float(sub));
    const tw = vec2(cos(angle), sin(angle)).toVar();
    const ae = a.element(e).toVar(),
      ao = a.element(e.add(size / 2)).toVar();
    const be = b.element(e).toVar(),
      bo = b.element(e.add(size / 2)).toVar();
    const nextA = vec4(ae.xy.add(cmul(tw, ao.xy)), ae.zw.add(cmul(tw, ao.zw))).toVar();
    const nextB = vec4(be.xy.add(cmul(tw, bo.xy)), be.zw.add(cmul(tw, bo.zw))).toVar();
    workgroupBarrier();
    a.element(lane).assign(nextA);
    b.element(lane).assign(nextB);
    workgroupBarrier();
  });
}

function simulation(size: number, bands: number[], probe = false, settings = FFT, energy = ULTRA.waveScale) {
  const count = bands.length,
    logN = Math.log2(size);
  // A buffer holds one cascade's complete pyramid in consecutive ranges. Column assembly may overwrite its own
  // column after loading it into shared memory; mips only read the previous range and write a disjoint next range.
  const stride = (4 * size * size - 1) / 3;
  const a = attributeArray(count * stride, 'vec4'),
    b = attributeArray(count * stride, 'vec4');
  const initial = new Float32Array(count * size * size * 4);
  bands.forEach((c, layer) => initial.set(bakeH0(c, size, probe ? 1 : energy), layer * size * size * 4));
  const h0 = attributeArray(initial, 'vec4').toReadOnly();
  const lengths = uniformArray(
    bands.map((c) => CASCADE_LENGTHS[c]!),
    'float',
  );
  const time = uniform(0),
    dt = uniform(0),
    reset = uniform(true);
  const displacement = [outputTexture(size, count), outputTexture(size, count)];
  const moments = outputTexture(size, count);
  const dispNode = texture(displacement[0]),
    slopeNode = texture(moments);
  // Only the director's check allocates this: independently transformed sx/sz imaginary parts and packing residuals.
  const residual = probe ? attributeArray(size * size, 'vec4') : null;

  const rows = Fn(() => {
    const x = invocationLocalIndex,
      y = workgroupId.x,
      c = workgroupId.y;
    const k = vec2(float(x).sub(size / 2), float(y).sub(size / 2))
      .mul(float(TAU).div(lengths.element(c)))
      .toVar();
    const kl = length(k).toVar();
    const ik = select(kl.greaterThan(1e-6), float(1).div(max(kl, 1e-6)), 0);
    // OceanSim: omega = n·W0; reduce phase BEFORE sin/cos (the capillary band reaches omega ~130).
    const omega = sqrt(kl.mul(9.81).add(kl.mul(kl).mul(kl).mul(7.4e-5)));
    const ph = fract(floor(omega.div(TAU / settings.loop)).mul(time.div(settings.loop)))
      .mul(TAU)
      .toVar();
    const e = vec2(cos(ph), sin(ph)).toVar();
    const seed = h0
      .element(
        c
          .mul(size * size)
          .add(y.mul(size))
          .add(x),
      )
      .toVar();
    const h = cmul(seed.xy, e)
      .add(cmul(seed.zw, vec2(e.x, e.y.negate())))
      .toVar();
    const ih = vec2(h.y.negate(), h.x);
    const dx = ih.mul(k.x).mul(ik),
      dz = ih.mul(k.y).mul(ik);
    const dxx = h.negate().mul(k.x).mul(k.x).mul(ik),
      dzz = h.negate().mul(k.y).mul(k.y).mul(ik);
    const dxz = h.negate().mul(k.x).mul(k.y).mul(ik);
    const sx = ih.mul(k.x),
      sz = ih.mul(k.y);
    const wa = workgroupArray('vec4', size),
      wb = workgroupArray('vec4', size);
    // The check uses the spare two complex fields to transform each slope separately: imaginary parts must vanish.
    wa.element(x).assign(probe ? vec4(sx, sz) : vec4(pack2(dx, dz), pack2(h, dxz)));
    wb.element(x).assign(vec4(pack2(sx, sz), pack2(dxx, dzz)));
    transform(wa, wb, size);
    const out = c.mul(stride).add(y.mul(size)).add(x);
    a.element(out).assign(wa.element(x));
    b.element(out).assign(wb.element(x));
  })().compute([size, count, 1], [size]); // explicit workgroups avoid ComputeNode's non-uniform count early return

  const groups = displacement.map((target, parity) => {
    const previous = displacement[parity ^ 1]!;
    const columns = Fn(() => {
      const x = workgroupId.x,
        y = invocationLocalIndex,
        c = workgroupId.y;
      const id = uvec2(x, y),
        index = c.mul(stride).add(y.mul(size)).add(x);
      const wa = workgroupArray('vec4', size),
        wb = workgroupArray('vec4', size);
      wa.element(y).assign(a.element(index));
      wb.element(y).assign(b.element(index));
      transform(wa, wb, size);
      const sign = select(x.add(y).bitAnd(1).equal(0), 1, -1);
      const av = wa.element(y).mul(sign).toVar(),
        bv = wb.element(y).mul(sign).toVar();
      // Undo centred-k shift. A=(Dx,Dz,Dy,Dxz), B=(Dyx,Dyz,Dxx,Dzz).
      const lambda = probe ? 0 : OCEAN.choppiness;
      const dxx = bv.z.mul(lambda),
        dzz = bv.w.mul(lambda),
        dxz = av.w.mul(lambda);
      const jac = dxx.add(1).mul(dzz.add(1)).sub(dxz.mul(dxz)).toVar();
      const slope = bv.xy.div(max(vec2(dxx.add(1), dzz.add(1)), vec2(0.2))).toVar();
      const prev = select(reset, 1, textureLoad(previous, id).depth(c).w);
      // Foam follows the Jacobian down instantly and recovers at a dt-based rate; history starts at 1 (no foam).
      const turb = min(jac, prev.add(dt.mul(settings.foamRecovery).div(max(jac, 0.5))));
      const disp = half(vec4(av.x.mul(lambda), probe ? float(0) : av.z, av.y.mul(lambda), turb)).toVar();
      const sl = half(vec4(slope, slope.mul(slope))).toVar();
      textureStore(storageTexture(target).depth(c), id, disp);
      textureStore(storageTexture(moments).depth(c), id, sl);
      a.element(index).assign(disp);
      b.element(index).assign(sl);
      if (residual) residual.element(y.mul(size).add(x)).assign(vec4(av.y, av.w, av.x.sub(bv.x), av.z.sub(bv.y)));
    })().compute([size, count, 1], [size]);

    const nodes = [rows, columns];
    let offset = 0;
    for (let level = 1, width = size / 2; level <= logN; level++, width /= 2) {
      const from = offset,
        to = offset + (width * 2) ** 2;
      offset = to;
      // Read buffers, NOT the texture being written: r187's sampled view spans all mips, which would overlap the
      // storage view. Two write-only rgba16float bindings; no read-write storage textures, no per-layer dispatches.
      const mip = Fn(() => {
        const i = workgroupId.x.mul(64).add(invocationLocalIndex),
          c = workgroupId.y;
        TSL.If(i.lessThan(width * width), () => {
          const x = i.mod(width),
            y = i.div(width);
          const src = c
            .mul(stride)
            .add(from)
            .add(y.mul(width * 4))
            .add(x.mul(2));
          const dst = c.mul(stride).add(to).add(i);
          const down = (buf: N) =>
            half(
              buf
                .element(src)
                .add(buf.element(src.add(1)))
                .add(buf.element(src.add(width * 2)))
                .add(buf.element(src.add(width * 2 + 1)))
                .mul(0.25),
            );
          const da = down(a).toVar(),
            db = down(b).toVar();
          a.element(dst).assign(da);
          b.element(dst).assign(db);
          textureStore(storageTexture(target).depth(c).setMipLevel(level), uvec2(x, y), da);
          textureStore(storageTexture(moments).depth(c).setMipLevel(level), uvec2(x, y), db);
        });
      })().compute([Math.ceil((width * width) / 64), count, 1], [64]);
      nodes.push(mip);
    }
    return nodes;
  });
  let last: number | undefined,
    parity = 0;
  return {
    displacement: dispNode,
    moments: slopeNode,
    residual,
    update(t: number) {
      reset.value = last === undefined || t < last;
      dt.value = reset.value ? 0 : t - last!;
      time.value = ((t % settings.loop) + settings.loop) % settings.loop;
      last = t;
      renderer.compute(groups[parity]!);
      dispNode.value = displacement[parity]!;
      parity ^= 1;
    },
    dispose() {
      for (const node of new Set(groups.flat())) node.dispose();
      for (const tex of [...displacement, moments]) tex.dispose();
      for (const buffer of [a, b, h0, residual]) buffer?.value.dispose();
    },
  };
}

export function fftWaves(
  options: { fft?: typeof FFT; energy?: number; phaseOrigin?: { x: number; z: number } } = {},
): WaveSource & { fft: { displacement: N; moments: N; bands: number[]; size: number } } {
  const settings = options.fft ?? FFT,
    origin = options.phaseOrigin ?? { x: 0, z: 0 };
  const { size, bands } = settings;
  const sim = simulation(size, bands, false, settings, options.energy ?? ULTRA.waveScale),
    lodMax = Math.log2(size);
  return {
    fft: { displacement: sim.displacement, moments: sim.moments, bands, size },
    displace(xz, cell, damp) {
      const local = xz.sub(vec2(origin.x, origin.z));
      const d = vec3(0).toVar();
      bands.forEach((c, layer) => {
        if (c === 3) return; // gravity-capillary detail adds slopes only, never geometry
        const L = CASCADE_LENGTHS[c]!;
        // OceanSurface line 339: +1 LOD bias, since box-filtered mips still leak a little past Nyquist.
        const lod = max(log2(max(cell.mul(size / L), 1e-6)).add(1), 0);
        d.addAssign(
          sim.displacement
            .sample(local.div(L))
            .depth(layer)
            .level(lod)
            .xyz.mul(c === 0 ? damp.x : c === 1 ? damp.y : damp.z),
        );
      });
      return d;
    },
    shade(xz, _footprint, damp) {
      const local = xz.sub(vec2(origin.x, origin.z));
      const slope = vec2(0).toVar(),
        variance = vec2(0).toVar(),
        carried = float(0).toVar();
      const jac = float(1).toVar();
      const slick = smoothstep(0.3, 0.7, vnoise(local.mul(0.006).add(uTime.mul(0.01)))).toVar();
      const sl2 = mix(0.75, 1, slick),
        sl3 = mix(0.4, 1, slick);
      bands.forEach((c, layer) => {
        const uv = local.div(CASCADE_LENGTHS[c]!);
        const dampC = c === 0 ? damp.x : c === 1 ? damp.y : damp.z;
        const w = dampC.mul(c === 2 ? sl2 : c === 3 ? sl3 : 1).toVar();
        // Implicit derivatives stay in uniform control flow. Slopes scale by damp, second moments by damp².
        const m = sim.moments.sample(uv).depth(layer).toVar();
        const s = m.xy.mul(w).toVar();
        slope.addAssign(s);
        variance.addAssign(max(m.zw.mul(w).mul(w).sub(s.mul(s)), 0));
        const mean = sim.moments.sample(vec2(0.5)).depth(layer).level(lodMax).toVar();
        carried.addAssign(mean.z.add(mean.w));
        // Source lines 465-467: absent bands contribute a neutral Jacobian of 1; capillaries contribute no foam.
        if (c !== 3) jac.addAssign(sim.displacement.sample(uv).depth(layer).w.sub(1).mul(dampC));
      });
      const unresolved = max(float(0.003 + 0.00512 * ULTRA.wind).sub(carried), 0)
        .mul(damp.z)
        .mul(damp.z)
        .mul(sl3)
        .mul(sl3);
      const whitecap = clamp(float(ULTRA.foamBias).sub(jac).mul(ULTRA.foamScale), 0, 1);
      return { slope, variance, unresolved, whitecap };
    },
    update: sim.update,
    dispose: sim.dispose,
  };
}

/** Director-only check, on the existing renderer. No frame hook and no readback in the live source.
 * bakeSlopeTile is UNCHOPPED: lambda=0 here to compare like for like. The second packed pair is unchanged; the first
 * independently transforms sx and sz to measure imaginary residue, which isn't observable in two-real-field packing.
 */
export async function readFftCheck(cascade: number, size: number) {
  if (![128, 256].includes(size) || !Number.isInteger(cascade) || cascade < 0 || cascade > 3)
    throw new Error('Invalid FFT check band/size');
  const sim = simulation(size, [cascade], true);
  const out = attributeArray(size * size, 'vec4');
  const read = Fn(() => {
    const i = TSL.instanceIndex;
    out.element(i).assign(textureLoad(sim.moments.value, uvec2(i.mod(size), i.div(size))).depth(0));
  })().compute(size * size);
  try {
    sim.update(0);
    renderer.compute(read);
    const [slopes, residue] = await Promise.all([
      renderer.getArrayBufferAsync(out.value),
      renderer.getArrayBufferAsync(sim.residual!.value),
    ]);
    return { slopes: new Float32Array(slopes), residue: new Float32Array(residue) };
  } finally {
    read.dispose();
    out.value.dispose();
    sim.dispose();
  }
}
