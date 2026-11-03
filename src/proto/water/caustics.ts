// Ultra Water Caustics.js (30ea65e), area-ratio splatting of the actual 12 m FFT slopes, in TSL.
// Local presentation. Research: docs/research/ultra-water.md, recommendations 4 and 7.
// Two stored 4x-MSAA targets / three grid draws per update, plus their mip chains; the caller owns frame ordering.
import * as THREE from 'three/webgpu';
import { renderer } from '../../render/scene.ts';
import { TSL, type N } from './tsl.ts';

const { Fn, abs, clamp, float, floor, log2, max, min, mix, normalize, positionGeometry, refract, texture, uniform } =
  TSL;
const { varying, vec2, vec3, vec4 } = TSL;
const PERIOD = 12;
export const CAUSTIC_TEXELS_PER_M = 512 / PERIOD;
const TARGETS = [
  { res: 512, format: THREE.RedFormat },
  { res: 256, format: THREE.RGFormat },
];
const SLICES = [
  { depth: 1.5, target: 0, channel: 0, cells: 128, margin: 6 },
  { depth: 4, target: 1, channel: 0, cells: 64, margin: 7 },
  { depth: 10, target: 1, channel: 1, cells: 32, margin: 8 },
];

/** Cubic B-spline reconstructed with four bilinear taps, GPU Gems 2 ch. 20 as used by the source.
 * Bilinear slopes alone give discontinuous slope derivatives and bead-shaped caustics. All samples use explicit LOD.
 */
function cubicSlope(slope: N, uv: N, lod: number, layer: number, resolution: number) {
  const size = resolution / 2 ** lod;
  const st = uv.mul(size).sub(0.5).toVar();
  const i = floor(st).toVar(),
    f = st.sub(i).toVar(),
    f2 = f.mul(f),
    f3 = f2.mul(f);
  const w0 = float(1).sub(f.mul(3)).add(f2.mul(3)).sub(f3).div(6);
  const w1 = float(4).sub(f2.mul(6)).add(f3.mul(3)).div(6);
  const w2 = float(1).add(f.mul(3)).add(f2.mul(3)).sub(f3.mul(3)).div(6);
  const w3 = f3.div(6);
  const g0 = w0.add(w1).toVar(),
    g1 = w2.add(w3).toVar();
  const h0 = i.sub(0.5).add(w1.div(g0)).div(size).toVar();
  const h1 = i.add(1.5).add(w3.div(g1)).div(size).toVar();
  const at = (p: N) => slope.sample(p).depth(layer).level(lod).xy;
  return g0.y
    .mul(g0.x.mul(at(h0)).add(g1.x.mul(at(vec2(h1.x, h0.y)))))
    .add(g1.y.mul(g0.x.mul(at(vec2(h0.x, h1.y))).add(g1.x.mul(at(h1)))));
}

export type CausticSample = (entryXZ: N, depth: N, lod: N) => N;

/** `slope` is FFT.moments, `layer` is bands.indexOf(2), not necessarily array layer 2. */
export function createCaustics(slope: N, layer: number, resolution: number) {
  if (layer < 0) throw new Error('Wave caustics need the 12 m FFT cascade');
  const targets = TARGETS.map(
    ({ res, format }) =>
      new THREE.RenderTarget(res, res, {
        type: THREE.HalfFloatType,
        format,
        samples: 4,
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        generateMipmaps: true,
        depthBuffer: false,
      }),
  );
  const sun = uniform(new THREE.Vector3(0, 1, 0));
  const scenes = TARGETS.map(() => new THREE.Scene());
  const meshes = SLICES.map(({ depth, target, channel, cells, margin }) => {
    const lod = Math.max(0, Math.log2(resolution / cells));
    const mat = new THREE.MeshBasicNodeMaterial({
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquation: THREE.AddEquation,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    const old = varying(vec2(0), `waterCausticOld${depth.toString().replace('.', '_')}`);
    mat.vertexNode = Fn(() => {
      const t = positionGeometry.xy
        .add(cells / 2 + 0.5)
        .div(cells)
        .toVar();
      const s = cubicSlope(slope, t, lod, layer, resolution).toVar();
      const r = refract(sun.negate(), normalize(vec3(s.x.negate(), 1, s.y.negate())), 1 / 1.33).toVar();
      const flat = refract(sun.negate(), vec3(0, 1, 0), 1 / 1.33).toVar();
      const d = clamp(
        r.xz
          .div(max(r.y.negate(), 0.05))
          .sub(flat.xz.div(flat.y.negate()))
          .mul(depth / PERIOD),
        -(margin - 1) / cells,
        (margin - 1) / cells,
      );
      old.assign(t.mul(TARGETS[target]!.res));
      // TSL custom clip positions need the WebGPU Y convention, unlike GLSL's clip coordinates.
      const clip = t.add(d).mul(2).sub(1);
      return vec4(clip.x, clip.y.negate(), 0, 1);
    })();
    mat.fragmentNode = Fn(() => {
      const a = old.dFdx(),
        b = old.dFdy();
      const ratio = min(abs(a.x.mul(b.y).sub(a.y.mul(b.x))), 16);
      return vec4(vec3(channel === 0 ? 1 : 0, channel === 1 ? 1 : 0, 0).mul(ratio), 0);
    })();
    const span = cells + 2 * margin;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(span, span, span, span), mat);
    mesh.frustumCulled = false;
    scenes[target]!.add(mesh);
    return mesh;
  });
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const savedColor = new THREE.Color();
  let wasFlat = false;
  const sample: CausticSample = (entryXZ, depth, lod) =>
    Fn(() => {
      const uv = entryXZ.div(PERIOD);
      const near = texture(targets[0]!.texture, uv).level(lod).r;
      const deepLod = max(lod.sub(1), 0).add(log2(max(depth.div(10), 1)));
      const deep = texture(targets[1]!.texture, uv).level(deepLod).rg;
      const shallow = mix(near, deep.r, clamp(depth.sub(1.5).div(2.5), 0, 1));
      const intensity = mix(shallow, deep.g, clamp(depth.sub(4).div(6), 0, 1));
      return mix(1, intensity, clamp(depth.div(1.5), 0, 1));
    })();
  return {
    sample,
    targets,
    passes: 2,
    draws: 3,
    update(sunDirection: THREE.Vector3) {
      const up = sunDirection.y > 0;
      if (!up && wasFlat) return;
      wasFlat = !up;
      const previous = renderer.getRenderTarget();
      const face = renderer.getActiveCubeFace(),
        mip = renderer.getActiveMipmapLevel();
      const alpha = renderer.getClearAlpha(),
        autoClear = renderer.autoClear;
      renderer.getClearColor(savedColor);
      sun.value.copy(sunDirection).normalize();
      renderer.setClearColor(up ? 0x000000 : 0xffffff, 1);
      // A render-pass load clear avoids a separate explicit clear pass for each target.
      renderer.autoClear = true;
      try {
        targets.forEach((target, i) => {
          scenes[i]!.visible = up;
          renderer.setRenderTarget(target);
          renderer.render(scenes[i]!, camera);
        });
      } finally {
        renderer.setRenderTarget(previous, face, mip);
        renderer.setClearColor(savedColor, alpha);
        renderer.autoClear = autoClear;
      }
    },
    dispose() {
      for (const mesh of meshes) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      targets.forEach((target) => target.dispose());
    },
  };
}
