// Ultra Water UnderwaterPass.js + PostFX.js lens droplets, translated to TSL.
// Local decoration. Research: docs/research/ultra-water.md; DESIGN.md 1 (Toys before chores).
// One 64x36 compute dispatch, one half-resolution shaft draw, and the composite in the EXISTING output quad.
// No second scene render, tone mapper or loop; scenePass keeps its stored 4x MSAA attachments.
import * as THREE from 'three/webgpu';
import { camera, renderer, scenePass } from '../scene.ts';
import { seaU } from './state.ts';
import { waterField } from '../../physics/water-field.ts';
import { uTime } from './shore-nodes.ts';
import { waterLighting, type Ocean, type WaterSky } from './surface.ts';
import { TSL, type N } from './tsl.ts';
import { UNDER } from './tuning.ts';

const { Fn, If, Loop, abs, clamp, cos, dot, exp, float, floor, fract, instanceIndex, length, max, min, mix } = TSL;
const { mod, normalize, pow, refract, rtt, select, sin, smoothstep, storage, storageTexture, texture, textureStore } =
  TSL;
const { uint, uniform, uv, uvec2, vec2, vec3, vec4 } = TSL;

// Hoskins hash33, as in PostFX.js. See public/THIRD_PARTY_NOTICES.md.
const hash33 = Fn(([p]: [N]) => {
  const q = fract(p.mul(vec3(0.1031, 0.103, 0.0973))).toVar();
  q.addAssign(dot(q, q.yxz.add(33.33)));
  return fract(q.xxy.add(q.yxx).mul(q.zyx));
});

function droplets(at: N, wet: N, aspect: N, resY: N) {
  // The source's UV y points up. Render-target UV y points down in WebGPU.
  const p = vec2(at.x.mul(aspect), at.y.oneMinus());
  const lensDrop = (d: N, r: N) => {
    const dist = length(d);
    const cov = clamp(r.sub(dist).mul(resY).add(0.5), 0, 1).mul(select(r.greaterThan(0), 1, 0));
    return vec3(
      d.mul(-1.8).mul(cov),
      smoothstep(0.6, 1, dist.div(max(r, 1e-6)))
        .mul(0.22)
        .mul(cov),
    );
  };
  const out = vec3(0).toVar();
  for (const [scale, density, seed] of [
    [6, 0.3, 0],
    [10, 0.2, 1],
    [17, 0.06, 2],
  ]) {
    const q = p.mul(scale!).add(seed! * 17.31);
    const id = floor(q);
    const h = hash33(vec3(id, seed!)),
      g = hash33(vec3(id.add(57), seed!));
    If(h.x.lessThanEqual(density!), () => {
      const fade = clamp(wet.sub(g.x.mul(0.8)).mul(6), 0, 1);
      const rf = mix(0.1, 0.24, h.y.mul(h.y));
      const c = rf.add(vec2(h.z, g.y).mul(rf.mul(-2).add(1)));
      out.addAssign(lensDrop(fract(q).sub(c).div(scale!), rf.mul(fade).div(scale!)));
    });
  }
  const amp = smoothstep(0, 0.4, wet);
  [0.0625, 0.03125].forEach((speed, id) => {
    const t = uTime.mul(speed).add(id * 0.37);
    const cycle = mod(floor(t), 128),
      f = fract(t).toVar();
    f.addAssign(sin(f.mul(47)).mul(0.012));
    const h = hash33(vec3(id, cycle, 5.1));
    const x0 = h.x.mul(0.84).add(0.08).mul(aspect);
    const hy = mix(1.016, -0.466, f);
    const hx = x0.add(sin(hy.mul(14).add(h.y.mul(6.28))).mul(0.006));
    out.addAssign(lensDrop(p.sub(vec2(hx, hy)), amp.mul(0.016)));
    const ty = p.y.sub(hy);
    If(ty.greaterThan(0).and(ty.lessThan(0.45)), () => {
      const a = smoothstep(0, 0.03, ty).mul(ty.div(0.45).oneMinus()).mul(amp);
      const tx = p.x
        .sub(x0)
        .sub(sin(p.y.mul(14).add(h.y.mul(6.28))).mul(0.006))
        .div(0.0035);
      const cov = clamp(abs(tx).oneMinus().mul(0.0035).mul(resY).add(0.5), 0, 1).mul(a);
      out.addAssign(vec3(tx.mul(-0.0035 * 1.8).mul(cov), 0, smoothstep(0.5, 1, abs(tx)).mul(0.12).mul(cov)));
    });
  });
  return vec3(out.x.div(aspect), out.y.negate(), min(out.z, 0.5));
}

export function createUnderwater(ocean: Ocean, sky: WaterSky) {
  const { deepWater, waterAbsorption, waterSun } = waterLighting(sky);
  const body = uniform(0),
    level = uniform(0),
    ellipse = uniform(new THREE.Vector4(0, 0, 1, 1));
  const bodyDepth = (p: N) =>
    Fn(() => {
      const d = float(-1e4).toVar();
      If(body.equal(1), () => d.assign(ocean.heightAt(p.xz).sub(p.y)));
      If(body.equal(2), () => {
        const q = p.xz.sub(ellipse.xy).div(ellipse.zw);
        If(dot(q, q).lessThan(1), () => d.assign(level.sub(p.y)));
      });
      return d;
    })();
  const active = uniform(false),
    near = uniform(false),
    full = uniform(false);
  const invProj = uniform(camera.projectionMatrixInverse),
    camWorld = uniform(camera.matrixWorld);
  const camPos = uniform(camera.position),
    dt = uniform(0),
    frame = uniform(0);
  const size = uniform(new THREE.Vector2(1, 1));
  const lens = new THREE.StorageTexture(UNDER.lensWidth, UNDER.lensHeight);
  lens.type = THREE.HalfFloatType;
  lens.minFilter = lens.magFilter = THREE.LinearFilter;
  lens.generateMipmaps = false;
  // (was submerged, remaining lens wetness, actual camera depth, unused). Only invocation 0 writes this.
  const wetState = storage(new THREE.StorageBufferAttribute(new Float32Array(4), 4), 'vec4', 1);
  // Reuse the same GPU water-height query as the lens, without a second query or a delayed CPU readback.
  // Far above water the lens sleeps, so its last submerged value must not keep culling the top surface.
  ocean.setCameraDepth(select(near.and(body.equal(1)), wetState.element(0).z, -1e4));
  const viewPos = (at: N, depth: N) => {
    // WebGPU NDC depth is 0..1, y is up. Do not apply the source WebGL z*2-1 conversion.
    const v = invProj.mul(vec4(at.x.mul(2).sub(1), at.y.mul(-2).add(1), depth, 1));
    return v.xyz.div(v.w);
  };
  const lensPass = Fn(() => {
    const i = instanceIndex;
    const pixel = uvec2(i.mod(UNDER.lensWidth), i.div(UNDER.lensWidth));
    const at = vec2(pixel).add(0.5).div(vec2(UNDER.lensWidth, UNDER.lensHeight));
    const world = camWorld.mul(vec4(viewPos(at, float(0)), 1)).xyz.toVar();
    const depth = bodyDepth(world);
    textureStore(storageTexture(lens), pixel, vec4(depth, 0, 0, 1));
    If(i.equal(uint(0)), () => {
      const state = wetState.element(0);
      const camDepth = bodyDepth(camPos).toVar();
      const submerged = camDepth.greaterThan(0.3);
      const wet = max(state.y.sub(dt.div(UNDER.drySeconds)), 0).toVar();
      If(submerged, () => wet.assign(0)).ElseIf(state.x.greaterThan(0.5), () => wet.assign(1));
      state.assign(vec4(select(submerged, 1, 0), wet, camDepth, 0));
    });
  })().compute(UNDER.lensWidth * UNDER.lensHeight);
  lensPass.setName('water wet lens');
  const color: N = scenePass.getTextureNode();
  const depth: N = scenePass.getTextureNode('depth');
  const ray = (at: N) => {
    const z = depth.sample(at).level(0).r.toVar();
    const hit = viewPos(at, z).toVar();
    return {
      dist: select(z.greaterThan(0.999999), 1e5, length(hit)),
      dir: normalize(camWorld.mul(vec4(hit, 0)).xyz),
    };
  };
  const shafts = rtt(
    Fn(() => {
      const at = uv();
      const { dist, dir } = ray(at);
      const sigT = waterAbsorption().add(UNDER.scattering);
      const rs = refract(seaU.uSun.negate(), vec3(0, 1, 0), 1 / 1.33).toVar();
      const acc = vec3(0).toVar();
      If(body.equal(1).and(seaU.uSun.y.greaterThan(0.02)).and(rs.y.lessThan(-0.05)), () => {
        const stepL = min(dist, UNDER.shaftRange).div(UNDER.shaftSteps).toVar();
        const jitter = fract(
          fract(dot(at.mul(size).mul(0.5), vec2(0.06711056, 0.00583715)))
            .mul(52.9829189)
            .add(frame.mul(0.618034)),
        );
        const mu = dot(dir, rs.negate());
        const phase = float(1 - 0.7 * 0.7)
          .div(pow(float(1 + 0.7 * 0.7).sub(mu.mul(1.4)), 1.5).mul(4 * Math.PI))
          .add(0.04);
        Loop(UNDER.shaftSteps, ({ i }: { i: N }) => {
          const s = float(i).add(jitter).mul(stepL);
          const p = camPos.add(dir.mul(s));
          const pd = p.y.negate();
          If(pd.greaterThan(0), () => {
            // The allowed plain illumination: no invented caustics or floater shadows.
            acc.addAssign(exp(sigT.mul(s.add(pd.div(rs.y.negate()))).negate()).mul(smoothstep(0, 0.6, pd)));
          });
        });
        acc.mulAssign(phase.mul(stepL));
      });
      return vec4(acc, dist);
    })(),
    null,
    null,
    {
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      autoUpdate: false,
      resolutionScale: 0.5,
    },
  );
  shafts.name = 'water shafts';
  shafts.textureNeedsUpdate = false;

  // Bilateral four-tap upsample from UnderwaterPass.js: distance agreement keeps light off foreground silhouettes.
  const upsample = (at: N, dist: N) => {
    const hs = max(floor(size.mul(0.5)), vec2(1));
    const st = at.mul(hs).sub(0.5),
      f = fract(st),
      i0 = floor(st);
    const sum = vec3(0).toVar(),
      wsum = float(1e-5).toVar();
    for (let k = 0; k < 4; k++) {
      const x = k & 1,
        y = k >> 1;
      const atSample = clamp(i0.add(vec2(x, y)), vec2(0), hs.sub(1))
        .add(0.5)
        .div(hs);
      const t = shafts.sample(atSample).level(0).toVar();
      const w = (x ? f.x : f.x.oneMinus())
        .mul(y ? f.y : f.y.oneMinus())
        .div(abs(t.a.sub(dist)).div(max(dist, 0.5)).add(1e-3));
      sum.addAssign(t.rgb.mul(w));
      wsum.addAssign(w);
    }
    return sum.div(wsum);
  };

  const outputNode = Fn(() => {
    const at = uv();
    const col = color.sample(at).level(0).rgb.toVar();
    // Dry and away: exactly one uniform branch beyond the original scene texture read.
    If(active, () => {
      const wet = wetState.element(0).y;
      const drop = vec3(0).toVar();
      If(wet.greaterThan(0.001), () => drop.assign(droplets(at, wet, size.x.div(size.y), size.y)));
      const atDrop = clamp(at.add(drop.xy), vec2(0), vec2(1)).toVar();
      col.assign(color.sample(atDrop).level(0).rgb);
      If(near, () => {
        const d = texture(lens, atDrop).level(0).r.toVar();
        // A 2-pixel cross detects the lens-depth sign change without alpha tags or another MRT.
        const edge = float(0).toVar();
        If(full.not(), () => {
          for (const [x, y] of [
            [2, 0],
            [-2, 0],
            [0, 2],
            [0, -2],
          ]) {
            const other = texture(lens, atDrop.add(vec2(x!, y!).div(size))).level(0).r;
            edge.assign(max(edge, select(d.mul(other).lessThan(0), 1, 0)));
          }
        });
        const meniscus = edge
          .mul(smoothstep(0.1, 0.35, abs(d)).oneMinus())
          .mul(UNDER.meniscus)
          .oneMinus();
        If(d.greaterThan(0), () => {
          const wobble = vec2(sin(atDrop.y.mul(37).add(uTime.mul(1.9))), cos(atDrop.x.mul(29).add(uTime.mul(1.6)))).mul(
            0.0012,
          );
          const sampleAt = clamp(atDrop.add(wobble), vec2(0), vec2(1)).toVar();
          const { dist, dir } = ray(sampleAt);
          // A cave pond transmits its locally lit scene; outdoor sky/sun in-scatter cannot pass through its roof.
          const fog = vec3(0).toVar();
          If(body.equal(1), () => fog.assign(deepWater(dir).mul(exp(waterAbsorption().mul(max(d, 0)).mul(-0.5)))));
          const trans = exp(waterAbsorption().add(UNDER.scattering).mul(dist).negate());
          col.assign(color.sample(sampleAt).level(0).rgb.mul(trans).add(fog.mul(trans.oneMinus())));
          If(body.equal(1), () =>
            col.addAssign(
              waterSun()
                .mul(upsample(sampleAt, dist))
                .mul(UNDER.scattering * UNDER.shafts),
            ),
          );
        });
        col.mulAssign(meniscus);
      });
      col.mulAssign(drop.z.oneMinus());
    });
    return vec4(col, 1);
  })();
  let lastNear = -Infinity,
    initialized = false;
  return {
    outputNode,
    prepare: () => renderer.compileComputeAsync(lensPass),
    update(time: number, delta: number) {
      const sample = waterField.nearby(camera.position);
      body.value = sample.body === 'sea' ? 1 : sample.body === 'pond' ? 2 : 0;
      level.value = Number.isFinite(sample.height) ? sample.height : 0;
      const volume =
        waterField.pond(sample.bodyId) ?? waterField.opticalPondAt(camera.position, Math.max(0.5, camera.near * 3));
      const pond = volume?.ellipse;
      if (volume && pond) {
        body.value = 2;
        level.value = volume.level;
      }
      if (pond) ellipse.value.set(pond.x, pond.z, pond.rx, pond.rz);
      if (body.value === 2 && !pond) body.value = 0;
      near.value = body.value > 0 && camera.position.y < level.value + UNDER.nearHeight;
      if (near.value) lastNear = time;
      active.value = near.value || time - lastNear < UNDER.drySeconds;
      // Both branches are conservative: ±4 m exceeds the default near-lens wave envelope.
      full.value = body.value === 1 && camera.position.y < level.value - UNDER.nearHeight;
      renderer.getDrawingBufferSize(size.value);
      shafts.textureNeedsUpdate = !initialized || (near.value && body.value === 1);
      if (!active.value && initialized) return;
      initialized = true; // prime the lens kernel and shaft target on the loading frame, before the first dive
      camera.updateMatrixWorld();
      dt.value = Math.min(delta, 0.1);
      frame.value = (frame.value + 1) % 64;
      renderer.compute(lensPass);
    },
    inspect: () => ({
      body: body.value === 1 ? 'sea' : body.value === 2 ? 'pond' : 'dry',
      near: near.value,
      full: full.value,
    }),
    dispose() {
      lens.dispose();
      wetState.value.dispose();
      lensPass.dispose();
      shafts.dispose();
    },
    near,
  };
}
