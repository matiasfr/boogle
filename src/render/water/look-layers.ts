// Lazy Dev Looks only. Recipes follow docs/research/low-poly-post-looks.md; zero strength omits shader work.
import { Color, HalfFloatType, type Object3D } from 'three/webgpu';
import { camera, scenePass } from '../scene.ts';
import { TSL, type N } from './tsl.ts';
import { createLookCoverage } from './look-coverage.ts';

export type LookLayerContext = {
  ocean: Object3D;
  cameraDepth: N;
  setFog(transform?: (base: N, position: N) => N): void;
};
export const LAYER_LIMITS = {
  shade: [0, 0.3],
  dither: [0, 1],
  haze: [0, 0.003],
  ink: [0, 1],
  width: [1, 2],
  toon: [0, 1],
  bloom: [0, 0.05],
  bands: [0, 0.35],
  paint: [0, 0.3],
  mask: [0, 1],
} as const;
export type LayerId = keyof typeof LAYER_LIMITS;
export type Layers = Record<LayerId, number>;
export const EMPTY_LAYERS: Layers = {
  shade: 0,
  dither: 0,
  haze: 0,
  ink: 0,
  width: 1,
  toon: 0,
  bloom: 0,
  bands: 0,
  paint: 0,
  mask: 0,
};
const B = { shade: 0.1, dither: 0.5 },
  C = { ...B, haze: 0.0015 },
  D = { ...B, ink: 0.45 };
export const RECIPES = {
  A: { label: 'A · Current', layers: {} },
  B: { label: 'B · Clean colour', layers: B },
  C: { label: 'C · Airy toys', layers: C },
  D: { label: 'D · Drawn toys', layers: D },
  E: { label: 'E · Luminous toys', layers: { ...C, bloom: 0.025 } },
  F: { label: 'F · Contact gate (B)', layers: B },
  G: { label: 'G · Graphic boundary', layers: { ...D, bands: 0.18 } },
  H: { label: 'H · Painted boundary', layers: { ...C, paint: 0.15 } },
  strong: { label: 'D+ · Strong ink', layers: { ...B, ink: 0.8, width: 1.5 } },
  toon: { label: 'Toon · Dark line reference', layers: { ...B, ink: 0.9, width: 1.5, toon: 1 } },
} as const;
export type RecipeId = keyof typeof RECIPES;
export const isRecipe = (id: unknown): id is RecipeId => typeof id === 'string' && Object.hasOwn(RECIPES, id);
export const isLayer = (id: unknown): id is LayerId => typeof id === 'string' && Object.hasOwn(LAYER_LIMITS, id);

const {
  Fn,
  uniform,
  vec2,
  vec3,
  vec4,
  dot,
  mix,
  smoothstep,
  clamp,
  max,
  min,
  abs,
  exp,
  select,
  float,
  floor,
  ceil,
  fract,
  fwidth,
  screenSize,
  uv,
  textureSize,
  perspectiveDepthToViewZ,
  reference,
  cameraPosition,
  length,
  color,
  rtt,
  step,
} = TSL;

export function createLookLayers(context: LookLayerContext) {
  // The output QuadMesh has its own orthographic camera; reconstruct the scene's perspective depth explicitly.
  const near = reference('near', 'float', camera),
    far = reference('far', 'float', camera);
  let active: Layers = { ...EMPTY_LAYERS };
  const values = Object.fromEntries(
    Object.entries(EMPTY_LAYERS).map(([key, value]) => [key, uniform(value)]),
  ) as Record<LayerId, N>;
  const dry = smoothstep(0.1, 0.5, context.cameraDepth.negate());
  let coverage: ReturnType<typeof createLookCoverage> | undefined;
  let fogActive = false;
  const targets = new Set<N>();
  const heightFog = (base: N, position: N) => {
    const q = clamp(position.y.sub(cameraPosition.y).mul(0.035), -8, 8);
    const safeQ = select(abs(q).lessThan(1e-3), float(1e-3), q);
    const integral = select(abs(q).lessThan(1e-3), q.mul(-0.5).add(1), exp(q.negate()).oneMinus().div(safeQ));
    const distance = length(position.sub(cameraPosition));
    const tau = values.haze
      .mul(exp(clamp(cameraPosition.y.mul(-0.035), -8, 8)))
      .mul(distance)
      .mul(integral)
      .mul(smoothstep(40, 80, distance));
    const extra = min(exp(tau.negate()).oneMinus(), 0.18).mul(dry);
    return base.add(base.oneMinus().mul(extra));
  };
  function configure(next: Layers) {
    active = { ...next };
    for (const key of Object.keys(values) as LayerId[]) values[key].value = next[key];
    const spatial = next.ink > 0 || next.bands > 0 || next.paint > 0 || next.mask > 0;
    if (spatial) coverage ??= createLookCoverage(context.ocean);
    coverage?.enable(spatial);
    if (fogActive !== next.haze > 0) {
      fogActive = next.haze > 0;
      context.setFog(fogActive ? heightFog : undefined);
    }
  }
  const luminance = (c: N) => dot(c, vec3(0.2126, 0.7152, 0.0722));
  function finish(input: N, config: Layers, paintSource?: N): N {
    let c = input;
    if (config.shade) {
      const y = luminance(c);
      const weight = smoothstep(0.02, 0.08, y)
        .mul(smoothstep(0.18, 0.4, y).oneMinus())
        .mul(values.shade);
      const tinted = c.mul(vec3(0.92, 0.99, 1.08));
      c = mix(c, tinted.mul(y.div(max(luminance(tinted), 1e-5))), weight);
    }
    if (!coverage || !(config.ink || config.bands || config.paint || config.mask)) return c;
    const mask = coverage.sampled;
    if (config.mask) return mask.rgb;
    const depth: N = scenePass.getTextureNode('depth');
    const size = vec2(textureSize(depth));
    const snap = (p: N) =>
      clamp(floor(p.mul(size)).add(0.5).div(size), vec2(0.5).div(size), vec2(1).sub(vec2(0.5).div(size)));
    const at = snap(uv());
    const readMask = (p: N) => mask.sample(snap(p)).level(0);
    const rawAt = (p: N) => depth.sample(snap(p)).level(0).r;
    const raw = rawAt(at).toVar();
    const z = perspectiveDepthToViewZ(raw, near, far).negate().toVar();
    const maskTaps = new Map<string, N>();
    const maskOffset = (x: number, y: number) => {
      const key = `${x},${y}`;
      if (!maskTaps.has(key)) maskTaps.set(key, readMask(at.add(vec2(x, y).div(size))).toVar());
      return maskTaps.get(key)!;
    };
    const centre = maskOffset(0, 0);
    const eligible = step(0.98, centre.r)
      .mul(step(centre.g.add(centre.b), 0.01))
      .mul(dry);
    // Symmetric integer scene-texel support avoids asymmetric +/-1.5 rounding on a sloped plane.
    const supportPixels = ceil(max(vec2(values.width).mul(size).div(screenSize), vec2(1)));
    const support = supportPixels.div(size);
    const guardPixels = ceil(max(vec2(2).mul(size).div(screenSize), vec2(1)));
    // A full, conservative square around the kernel; each scene-mask texel is fetched only once.
    const guard = (radius: N) => {
      let safe = float(1);
      const bound = config.ink || config.paint ? 4 : 2;
      for (let y = -bound; y <= bound; y++)
        for (let x = -bound; x <= bound; x++) {
          const m = maskOffset(x, y);
          const inside = float(Math.abs(x))
            .lessThanEqual(radius.x)
            .and(float(Math.abs(y)).lessThanEqual(radius.y));
          safe = safe.mul(select(inside, step(m.g.add(m.b), 0.01), 1));
        }
      return safe;
    };
    const protection = guard(guardPixels.add(config.paint ? vec2(2) : config.ink ? supportPixels : vec2(0)));
    if (config.ink) {
      const positions = [
        at.add(vec2(support.x, 0)),
        at.sub(vec2(support.x, 0)),
        at.add(vec2(0, support.y)),
        at.sub(vec2(0, support.y)),
      ];
      const depths = positions.map((p) => rawAt(p).toVar());
      const [left, right, up, down] = depths.map((d) => perspectiveDepthToViewZ(d, near, far).negate());
      const rel = max(max(left, right), max(up, down)).sub(z).div(max(z, 0.5));
      // Device depth (affine inverse-z) is planar in screen space. Linear view-distance curvature is not:
      // it outlined a receding flat floor in horizontal bands, especially with the stronger reference.
      const bend = max(
        abs(depths[0].add(depths[1]).sub(raw.mul(2))),
        abs(depths[2].add(depths[3]).sub(raw.mul(2))),
      ).div(max(raw.oneMinus(), 1e-6));
      const gate = eligible.mul(protection);
      const edge = smoothstep(0.015, 0.04, rel)
        .mul(smoothstep(0.006, 0.02, bend))
        .mul(smoothstep(30, 100, z).oneMinus())
        .mul(values.ink)
        .mul(gate)
        .mul(min(size.y.div(screenSize.y), 1));
      const tinted = mix(c.mul(0.45), color(new Color('#465968')), 0.35);
      c = mix(c, mix(tinted, color(new Color('#20252b')), values.toon), edge);
    }
    if (config.bands) {
      const y = luminance(c),
        q = y.mul(6),
        base = floor(q),
        f = fract(q);
      const aa = max(fwidth(q), 0.08);
      const band = base.add(smoothstep(float(0.5).sub(aa), float(0.5).add(aa), f)).div(6);
      const protect = smoothstep(0.04, 0.1, y).mul(smoothstep(0.65, 0.85, y).oneMinus());
      c = c.mul(mix(y, band, protect.mul(values.bands).mul(eligible).mul(protection)).div(max(y, 1e-5)));
    }
    if (config.paint) {
      const source = paintSource;
      c = Fn(() => {
        const texel = vec2(1).div(size);
        const taps: { x: number; y: number; c: N }[] = [];
        let gate = eligible.mul(protection);
        for (let y = -2; y <= 2; y++)
          for (let x = -2; x <= 2; x++) {
            const p = at.add(vec2(x, y).mul(texel)),
              m = maskOffset(x, y);
            gate = gate.mul(step(0.98, m.r));
            taps.push({ x, y, c: source.sample(snap(p)).level(0).rgb.toVar() });
          }
        let chosen: N, best: N;
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ]) {
          let sum = vec3(0),
            squares = float(0);
          for (const tap of taps)
            if (tap.x * sx! >= 0 && tap.y * sy! >= 0) {
              sum = sum.add(tap.c);
              squares = squares.add(dot(tap.c, tap.c));
            }
          const mean = sum.div(9),
            variance = max(squares.div(9).sub(dot(mean, mean)), 0);
          if (!chosen) {
            chosen = mean;
            best = variance;
          } else {
            chosen = select(variance.lessThan(best), mean, chosen);
            best = min(best, variance);
          }
        }
        return mix(
          source.sample(at).level(0).rgb,
          chosen,
          values.paint.mul(smoothstep(15, 35, z).oneMinus()).mul(gate),
        );
      })();
    }
    return c;
  }
  return {
    configure,
    structuralKey: () =>
      [active.shade, active.dither, active.ink, active.bands, active.paint, active.mask]
        .map((value) => value > 0)
        .join(','),
    releaseTargets() {
      for (const target of targets) target.dispose();
      targets.clear();
    },
    finish(input: N) {
      const config = { ...active };
      if (!config.paint || config.mask) return Fn(() => finish(input, config))();
      const graded = Fn(() => vec4(finish(input, { ...config, paint: 0 }), 1))();
      const source = rtt(graded, null, null, { type: HalfFloatType, depthBuffer: false });
      source.name = source.value.name = 'post_look_display_linear';
      targets.add(source);
      return Fn(() => finish(source.rgb, { ...config, shade: 0, ink: 0, bands: 0 }, source))();
    },
    encode(srgb: N) {
      if (!active.dither) return srgb;
      const p = floor(uv().mul(screenSize));
      const n = fract(fract(dot(p, vec2(0.06711056, 0.00583715))).mul(52.9829189));
      return clamp(srgb.add(n.sub(0.5).mul(values.dither.mul(2 / 255))), 0, 1);
    },
    inspect: () => ({
      coverage: coverage?.inspect() ?? { enabled: false },
      fog: fogActive,
      ao: 'Not built: baseline town and Buddy already have readable contact shadows; revisit gate not met.',
      particleHaze: 'Existing fog:false soft particles retain their current treatment.',
    }),
    dispose() {
      coverage?.dispose();
      if (fogActive) context.setFog();
      for (const target of targets) target.dispose();
    },
  };
}
