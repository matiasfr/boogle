// Shared water-demo AgX look and GPU exposure meter. Local, lazy consumers only.
// Source and rationale: docs/research/tone-comparison.md; preserves the demo's curve and adaptation.
import * as THREE from 'three/webgpu';
import * as tsl from 'three/tsl';
// TSL typings cannot follow the swizzles in this graph (as in the water shaders).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type N = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TSL = tsl as unknown as Record<string, any>;
const {
  Fn,
  Loop,
  clamp,
  dot,
  exp2,
  float,
  log2,
  mat3,
  max,
  mix,
  pow,
  rtt,
  select,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} = TSL;
export const luma = (v: N) => dot(v, vec3(0.2126, 0.7152, 0.0722));
export const agx = Fn(([input, power = 1.12, saturation = 1.3]: [N, N?, N?]) => {
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
  // Look in the AgX log domain, after contrast and before the inverse transform; slope stays 1.
  c.assign(pow(max(c, 0), vec3(power)));
  c.assign(mix(vec3(luma(c)), c, saturation));
  c.assign(outset.mul(c));
  return clamp(toSrgb.mul(pow(max(c, 0), vec3(2.2))), 0, 1);
});

/** Two tiny draws and a one-texel history copy; caller updates once before rendering. */
export function createExposureMeter(hdr: N) {
  const jitter = uniform(new THREE.Vector2()),
    rates = uniform(new THREE.Vector2(1, 1));
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

  const value = clamp(exp2(adaptation.sample(vec2(0.5)).level(0).r.negate()).mul(0.18), 0.05, 20);
  let frames = 0;
  return {
    value,
    dispose() {
      meter.dispose();
      adaptation.dispose();
      history.dispose();
    },
    save(renderer: THREE.WebGPURenderer) {
      renderer.copyTextureToTexture(adaptation.value, history);
    },
    update(dt: number) {
      const f = frames++ & 255;
      jitter.value.set((f * 0.7548776662466927) % 1, (f * 0.5698402909980532) % 1);
      const delta = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 1)) : 0;
      rates.value.set(frames < 3 ? 1 : 1 - Math.exp(-delta * 2.5), frames < 3 ? 1 : 1 - Math.exp(-delta));
    },
  };
}
