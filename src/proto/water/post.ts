// Ultra Water PostFX.js exposure meter and AgX, expressed in TSL in the existing output pipeline.
// Two tiny draws (32² meter, 1² adaptation). No extra full-screen composite, renderer, loop or MSAA changes.
// The adaptation reads a separate previous-state texture; a one-texel GPU copy after the output saves it for next frame.
import * as THREE from 'three/webgpu';
import { MAX_DPR, pipeline, renderer, scenePass } from '../../render/scene.ts';
import { TSL, type N } from './tsl.ts';
import { waterQuality } from './quality.ts';

const { Fn, Loop, clamp, dot, exp2, float, fract, log2, mat3, max, mix, pow, rtt, screenCoordinate, select } = TSL;
const { OnAfterRenderPipeline, OnBeforeRenderPipeline, texture, uniform, uv, vec2, vec3, vec4 } = TSL;
const luma = (v: N) => dot(v, vec3(0.2126, 0.7152, 0.0722));
const hash33 = Fn(([p]: [N]) => {
  const q = fract(p.mul(vec3(0.1031, 0.103, 0.0973))).toVar();
  q.addAssign(dot(q, q.yxz.add(33.33)));
  return fract(q.xxy.add(q.yxx).mul(q.zyx));
});
const agx = Fn(([input]: [N]) => {
  const to2020 = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.088), vec3(0.0433, 0.0113, 0.8956));
  const toSrgb = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
  const inset = mat3(
    vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
    vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
    vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859),
  );
  const outset = mat3(
    vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
    vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
    vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405),
  );
  const c = inset.mul(to2020.mul(input)).toVar();
  c.assign(
    clamp(
      log2(max(c, vec3(1e-10)))
        .add(12.47393)
        .div(4.026069 + 12.47393),
      0,
      1,
    ),
  );
  const c2 = c.mul(c),
    c4 = c2.mul(c2);
  c.assign(
    c4
      .mul(c2)
      .mul(15.5)
      .sub(c4.mul(c).mul(40.14))
      .add(c4.mul(31.96))
      .sub(c2.mul(c).mul(6.868))
      .add(c2.mul(0.4298))
      .add(c.mul(0.1191))
      .sub(0.00232),
  );
  c.assign(pow(max(c, 0), vec3(1.12)));
  c.assign(mix(vec3(luma(c)), c, 1.3));
  c.assign(outset.mul(c));
  return clamp(toSrgb.mul(pow(max(c, 0), vec3(2.2))), 0, 1);
});

/** Call after createUnderwater has installed its HDR composite. update() belongs in the prototype's existing frame hook. */
export function installDemoPost() {
  const hdr: N = scenePass.getTextureNode();
  const source: N = pipeline.outputNode;
  const jitter = uniform(new THREE.Vector2()),
    rates = uniform(new THREE.Vector2(1, 1)),
    frame = uniform(0);
  const exposure = uniform(1);
  const history = new THREE.DataTexture(
    new Float32Array([Math.log2(0.18), 0, 0, 1]),
    1,
    1,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  history.minFilter = history.magFilter = THREE.NearestFilter;
  history.needsUpdate = true;
  const meter = rtt(
    Fn(() => {
      const sum = float(0).toVar();
      Loop(4, ({ i }: { i: N }) => {
        Loop(4, ({ i: j }: { i: N }) => {
          const offset = vec2(float(i), float(j)).add(jitter).mul(0.25).sub(0.5).div(32);
          const c = max(hdr.sample(uv().add(offset)).level(0).rgb, 0);
          sum.addAssign(log2(clamp(luma(c), 1e-4, 64)));
        });
      });
      return vec4(sum.div(16), 0, 0, 1);
    })(),
    32,
    32,
    { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter },
  );
  meter.name = 'water exposure meter';
  const adaptation = rtt(
    Fn(() => {
      const sum = float(0).toVar();
      Loop(16, ({ i }: { i: N }) => {
        Loop(16, ({ i: j }: { i: N }) => {
          sum.addAssign(meter.sample(vec2(float(i), float(j)).add(0.5).div(16)).level(0).r);
        });
      });
      const target = clamp(sum.div(256), Math.log2(0.18 / 20), Math.log2(0.18 / 0.05));
      const previous = texture(history, vec2(0.5)).level(0).r,
        k = select(target.greaterThan(previous), rates.x, rates.y);
      const next = mix(previous, target, k).toVar();
      return vec4(next, 0, 0, 1);
    })(),
    1,
    1,
    { depthBuffer: false, type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter },
  );
  adaptation.name = 'water exposure adaptation';
  pipeline.outputNode = Fn(() => {
    OnBeforeRenderPipeline(() => {
      // Apply after adaptive-res's late hook. Normalize by its current DPR so the world stays at
      // 0.6 of MAX_DPR, never 0.6 * 0.6. Keep the canvas/output, shared settings and MSAA storage intact.
      scenePass.setResolutionScale(Math.min(1, (waterQuality.resolution * MAX_DPR) / renderer.getPixelRatio()));
    });
    OnAfterRenderPipeline(() => renderer.copyTextureToTexture(adaptation.value, history));
    const ex = clamp(exp2(adaptation.sample(vec2(0.5)).level(0).r.negate()).mul(0.18), 0.05, 20).mul(exposure);
    const d = uv().sub(0.5).mul(Math.SQRT2);
    const c = agx(source.rgb.mul(ex)).mul(dot(d, d).mul(-0.08).add(1)).toVar();
    const srgb = select(
      c.lessThanEqual(vec3(0.0031308)),
      c.mul(12.92),
      pow(c, vec3(1 / 2.4))
        .mul(1.055)
        .sub(0.055),
    );
    const noise = hash33(vec3(screenCoordinate.xy, frame))
      .add(hash33(vec3(screenCoordinate.xy, frame.add(17))))
      .sub(1)
      .div(255);
    return vec4(srgb.add(noise), 1);
  })();
  // Already AgX + sRGB. This is an explicit prototype override, not renderer.toneMapping's shared Neutral setting.
  pipeline.outputColorTransform = false;
  pipeline.needsUpdate = true;
  let frames = 0;
  return {
    exposure,
    update(dt: number) {
      const f = frames++ & 255;
      frame.value = f;
      jitter.value.set((f * 0.7548776662466927) % 1, (f * 0.5698402909980532) % 1);
      const delta = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 1)) : 0;
      rates.value.set(frames < 3 ? 1 : 1 - Math.exp(-delta * 2.5), frames < 3 ? 1 : 1 - Math.exp(-delta));
    },
  };
}
