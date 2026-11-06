// Ultra Water sky.js: owned Hillaire atmosphere + cloud cube, shared by the retained demo and frozen real-water sky.
// Baking and applying a world look are separate. The production adapter calls bake exactly once during loading.
import * as THREE from 'three/webgpu';
import { Atmosphere, atmosphereCoefficients, H_TOP, OBS_H, RB, RT, SKY_SIZE, transmittance } from './atmosphere.ts';
import { TSL, type N } from './tsl.ts';

const { Fn, asin, clamp, cubeTexture, dot, exp, float, floor, fract, inversesqrt, log2, max, mix, normalize } = TSL;
const { positionWorldDirection, pow, select, smoothstep, sqrt, step, texture, uniform, uv, vec2, vec3, vec4 } = TSL;
export type SkyParams = {
  elevation: number;
  azimuth: number;
  turbidity: number;
  rayleigh: number;
  cloudCoverage: number;
  cloudBrightness: number;
  sunIntensity: number;
};
export type SkyCubeSize = 256 | 512 | 1024;
export type SkyArt = (direction: N, sunColor: N, cloudBrightness: N) => N;
export type SunStyle = 'physical' | 'painted';
const gradient = Fn(([i]: [N]) => {
  const p = fract(i.xyx.mul(vec3(0.1031, 0.103, 0.0973))).toVar();
  p.addAssign(dot(p, p.yzx.add(33.33)));
  return fract(p.xx.add(p.yz).mul(p.zy)).mul(2).sub(1);
});
const noise = Fn(([p]: [N]) => {
  const i = floor(p),
    f = fract(p),
    u = f
      .mul(f)
      .mul(f)
      .mul(f.mul(f.mul(6).sub(15)).add(10));
  const a = dot(gradient(i), f),
    b = dot(gradient(i.add(vec2(1, 0))), f.sub(vec2(1, 0)));
  const c = dot(gradient(i.add(vec2(0, 1))), f.sub(vec2(0, 1))),
    d = dot(gradient(i.add(1)), f.sub(1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y).mul(1.6);
});
const fbm = Fn(([p]: [N]) => {
  const sum = float(0).toVar();
  for (let i = 0; i < 4; i++) sum.addAssign(noise(p.mul(2 ** i)).mul(0.5 ** i));
  return sum;
});

export function createWaterSkyFor(
  renderer: THREE.WebGPURenderer,
  bakedArt?: SkyArt,
  cubeSize: SkyCubeSize = 1024,
  sunStyle: SunStyle = 'physical',
) {
  const params: SkyParams = {
    elevation: 50,
    azimuth: 205,
    turbidity: 2,
    rayleigh: 1,
    cloudCoverage: 0.38,
    cloudBrightness: 1,
    sunIntensity: 9,
  };
  const atmosphere = new Atmosphere();
  const sunDirection = uniform(new THREE.Vector3(0, 1, 0));
  const sunColor = uniform(new THREE.Vector3(1, 1, 1));
  const illum = uniform(Math.PI * params.sunIntensity),
    coverage = uniform(params.cloudCoverage),
    cloudBrightness = uniform(params.cloudBrightness),
    face = uniform(0, 'int');
  const maxMip = Math.log2(cubeSize);
  const cubeTarget = new THREE.CubeRenderTarget(cubeSize, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    depthBuffer: false,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
  const cube = cubeTarget.texture;
  const trans = (h: N, mu: N) => {
    const r = h.add(RB),
      rho = sqrt(max(h, 0).mul(h.add(2 * RB)));
    const dmin = float(RT).sub(r),
      dmax = rho.add(H_TOP);
    const dist = max(
      r
        .mul(mu)
        .negate()
        .add(
          sqrt(
            max(
              r
                .mul(r)
                .mul(mu.mul(mu).sub(1))
                .add(RT * RT),
              0,
            ),
          ),
        ),
      0,
    );
    return texture(atmosphere.trans.texture, vec2(dist.sub(dmin).div(dmax.sub(dmin)), rho.div(H_TOP))).level(0).rgb;
  };
  const skyView = (d: N) => {
    const v = sqrt(asin(clamp(d.y, 0, 1)).div(Math.PI * 0.5));
    const cp = dot(d.xz, sunDirection.xz).mul(
      inversesqrt(max(dot(d.xz, d.xz).mul(dot(sunDirection.xz, sunDirection.xz)), 1e-12)),
    );
    const u = sqrt(clamp(float(0.5).sub(cp.mul(0.5)), 0, 1));
    const size = vec2(...SKY_SIZE);
    return texture(atmosphere.sky.texture, vec2(u, v).mul(size.sub(1)).div(size).add(vec2(0.5).div(size))).level(0).rgb;
  };
  const material = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false, fog: false });
  material.fragmentNode = Fn(() => {
    // QuadMesh UV y runs down under WebGPU, matching the source cube face formula.
    const c = uv().mul(2).sub(1);
    const direction = select(
      face.equal(0),
      vec3(1, c.y.negate(), c.x.negate()),
      select(
        face.equal(1),
        vec3(-1, c.y.negate(), c.x),
        select(
          face.equal(2),
          vec3(c.x, 1, c.y),
          select(
            face.equal(3),
            vec3(c.x, -1, c.y.negate()),
            select(face.equal(4), vec3(c.x, c.y.negate(), 1), vec3(c.x.negate(), c.y.negate(), -1)),
          ),
        ),
      ),
    );
    // CubeTextureNode flips x for WebGPU cube conventions. Bake the same mirror so the public API uses world directions.
    const d = normalize(vec3(direction.x.negate(), direction.yz)).toVar();
    if (bakedArt) return bakedArt(d, sunColor, cloudBrightness);
    const up = skyView(vec3(0, 1, 0)).toVar();
    // Explicit LOD for every sample; both hemispheres are evaluated in uniform flow.
    const F = pow(d.y.add(1), 5).mul(0.98).add(0.02);
    const body = vec3(0.02, 0.035, 0.045).mul(sunColor.mul(max(sunDirection.y, 0)).add(up));
    const down = mix(body, skyView(vec3(d.x, d.y.negate(), d.z)), F);
    const col = skyView(d).toVar();
    const p = d.xz.div(max(d.y, 1e-3)).mul(0.396);
    const n = clamp(fbm(p).mul(0.7).add(0.5), 0, 1);
    const th = clamp(coverage.add(noise(p.mul(0.3)).mul(0.222)), 0, 1).oneMinus();
    const fade = smoothstep(0, 0.063, d.y),
      mask = smoothstep(th, th.add(0.3), n).mul(fade);
    const depth = max(n.sub(th), 0),
      beer = exp(depth.mul(-4));
    const shade = mix(0.45, 1, clamp(beer.mul(beer.mul(beer).oneMinus()).mul(2.6), 0, 1));
    const cs = dot(d, sunDirection),
      silver = clamp(float(0.51).div(pow(float(1.49).sub(cs.mul(1.4)), 1.5)), 0, 3);
    const edge = mask.mul(mask.oneMinus()).mul(4);
    const alpha = exp(depth.mul(-6.6)).oneMinus().mul(fade).mul(step(0.001, d.y)).mul(step(1e-6, coverage));
    const r0 = RB + OBS_H,
      rc = RB + 2.5;
    const t = d.y.mul(-r0).add(
      sqrt(
        d.y
          .mul(d.y)
          .mul(r0 * r0)
          .add((rc - r0) * (rc + r0)),
      ),
    );
    const mv = d.y.mul(r0).add(t).div(rc),
      ms = clamp(sunDirection.y.mul(r0).add(t.mul(cs)).div(rc), -1, 1);
    const visible = step(-Math.sqrt(2.5 * (2 * RB + 2.5)) / rc, ms);
    const light = trans(float(2.5), ms).mul(illum).mul(visible).mul(0.22);
    const cloud = up.add(light.mul(shade.add(silver.mul(edge).mul(0.6)))).mul(cloudBrightness);
    const tv = clamp(trans(float(OBS_H), max(d.y, 0)).div(max(trans(float(2.5), mv), vec3(1e-4))), 0, 1);
    col.assign(mix(col, mix(col, cloud, tv), alpha));
    return select(d.y.lessThan(0), vec4(down, 1), vec4(col, alpha.oneMinus()));
  })();
  const quad = new THREE.QuadMesh(material);
  // Stable sampling nodes: prepared looks exchange textures, never rebuild consumer graphs.
  const samples: ReturnType<typeof cubeTexture>[] = [];
  let sampledCube = cube;
  const sample = (direction: N) => {
    const node = cubeTexture(sampledCube, direction);
    samples.push(node);
    return node;
  };
  // Public LODs retain the original 1024 cube's angular blur for water and fog.
  // Keep the default graph unchanged; smaller comparisons only lose the unavailable finest levels.
  const skyLod = (direction: N, lod: N | number = 0) =>
    sample(vec3(direction.x, max(direction.y, 0), direction.z)).level(
      cubeSize === 1024 ? lod : clamp(float(lod).add(maxMip - 10), 0, maxMip),
    ).rgb;
  const skyAt = (direction: N, roughness: N | number = 0) =>
    skyLod(direction, clamp(log2(max(float(roughness).mul(650), 1)), 0, 10));
  const background = Fn(() => {
    const d = normalize(positionWorldDirection),
      sampled = sample(vec3(d.x, max(d.y, 0), d.z)).level(0);
    const cs = dot(d, sunDirection),
      disc = smoothstep(0.999985, 0.999992, cs).mul(smoothstep(0.999985, 1, cs).mul(0.4).add(0.6));
    if (sunStyle === 'painted') {
      // Larger cream graphic, still masked by cube transmittance; never baked into reflections.
      const cream = vec3(1, 0.88, 0.58).mul(sunColor.r).mul(0.95);
      const visibility = step(0, d.y).mul(sampled.a);
      return mix(
        sampled.rgb.add(cream.mul(pow(max(cs, 0), 300).mul(0.08)).mul(visibility)),
        cream,
        smoothstep(0.99935, 0.99955, cs).mul(visibility),
      );
    }
    return sampled.rgb.add(
      sunColor
        .mul(disc.mul(900).add(pow(max(cs, 0), 2200).mul(1.5)))
        .mul(step(0, d.y))
        .mul(sampled.a),
    );
  })();
  let lastKey = '',
    bakes = 0,
    bakeMs = 0;
  return {
    params,
    cube,
    sunDirection,
    sunColor,
    background,
    skyAt,
    skyLod,
    // Readback materials are temporary: do not retain their nodes for prepared-look swaps.
    ambient: (normal: N) => cubeTexture(sampledCube, normal).level(maxMip).rgb,
    selectPrepared(texture: THREE.CubeTexture, direction: THREE.Vector3, radiance: THREE.Vector3) {
      sampledCube = texture;
      for (const node of samples) node.value = texture;
      sunDirection.value.copy(direction);
      sunColor.value.copy(radiance);
    },
    inspect: () => ({
      params: { ...params },
      bakes,
      bakeMs,
      cubeSize,
      sunStyle,
      mipLevels: maxMip + 1,
      // RGBA16F, six faces, full mip chain; excludes PMREM, LUTs and allocation padding.
      cubeTexelBytes: 6 * 8 * ((4 * cubeSize * cubeSize - 1) / 3),
      sunDirection: sunDirection.value.toArray(),
    }),
    dispose() {
      cubeTarget.dispose();
      material.dispose();
      atmosphere.trans.texture.dispose();
      atmosphere.multiple.texture.dispose();
      atmosphere.sky.texture.dispose();
    },
    bake(changes: Partial<SkyParams> = {}) {
      Object.assign(params, changes);
      const key = Object.values(params).join('/');
      if (key !== lastKey) {
        lastKey = key;
        sunDirection.value.setFromSphericalCoords(
          1,
          THREE.MathUtils.degToRad(90 - params.elevation),
          THREE.MathUtils.degToRad(params.azimuth),
        );
        const c = atmosphereCoefficients(params),
          T = transmittance(c, OBS_H, Math.max(sunDirection.value.y, 0));
        sunColor.value
          .fromArray(T)
          .multiplyScalar(params.sunIntensity * THREE.MathUtils.smoothstep(params.elevation, -2, 2));
        illum.value = Math.PI * params.sunIntensity;
        coverage.value = params.cloudCoverage;
        cloudBrightness.value = params.cloudBrightness;
        const started = performance.now();
        atmosphere.update(params, sunDirection.value.y, illum.value);
        const target = renderer.getRenderTarget(),
          savedFace = renderer.getActiveCubeFace(),
          mip = renderer.getActiveMipmapLevel();
        for (let f = 0; f < 6; f++) {
          face.value = f;
          cube.mipmapsAutoUpdate = f === 5;
          renderer.setRenderTarget(cubeTarget, f);
          quad.render(renderer);
        }
        renderer.setRenderTarget(target, savedFace, mip);
        cube.needsPMREMUpdate = true;
        bakes++;
        bakeMs = performance.now() - started;
        console.info(
          `[water] atmosphere LUT CPU + six cube draws: ${(performance.now() - started).toFixed(0)} ms (sun change only)`,
        );
      }
    },
  };
}
