// Original Sunshine-inspired art direction, not a simulation change. Linear HDR palette; baked once.
import { TSL, type N } from './tsl.ts';
import { RAW, ULTRA } from './tuning.ts';
import { toyVariant } from './flags.ts';

const { Fn, abs, float, length, max, min, mix, normalize, pow, smoothstep, vec3, vec4 } = TSL;
const punch = toyVariant === 'punch';
const soft = toyVariant === 'soft';
export const toyWater = {
  ...RAW,
  absorption: [0.55, 0.055, 0.035],
  scatter: [0.0, punch ? 0.11 : 0.075, punch ? 0.17 : 0.115],
  saturation: soft ? 1 : 1.08,
  reflectGain: 0.92,
  reflectCap: punch ? 0.55 : 0.8,
  reflectTint: [0.86, 1, 1],
  sunGain: 1.08,
};
export const toyFoam = {
  glint: soft ? ULTRA.glint : 0.72,
  foamTint: [0.78, 0.86, 0.88],
  foamBright: 0.8,
};

// Authored sky-space cumulus clusters. Direction-space ellipses have no UV seam or pole singularity.
const clouds = [
  [0.3, 0.22, 1, 0.22],
  [-0.7, 0.34, 1, 0.18],
  [1, 0.3, -0.25, 0.24],
  [-1, 0.18, -0.3, 0.2],
  [0.15, 0.28, -1, 0.23],
  [-0.65, 0.55, -1, 0.15],
] as const;
export const cumulusPuffs = [
  [-0.66, 0, 0.58],
  [-0.28, 0.25, 0.7],
  [0.18, 0.45, 0.75],
  [0.65, 0.1, 0.52],
] as const;

export const toySky = (direction: N, sunColor: N): N =>
  Fn(() => {
    const height = max(direction.y, 0);
    const top = soft ? vec3(0.12, 0.31, 0.57) : vec3(0.045, 0.23, 0.53);
    const horizon = vec3(0.34, 0.66, 0.94);
    // Direct sunlight is warm; using its RGB would remove blue twice from an authored blue sky.
    const sky = mix(horizon, top, pow(smoothstep(0, 0.65, height), 0.5)).mul(sunColor.r);
    const mask = float(0).toVar();
    const shade = float(0).toVar();
    for (const [x, y, z, size] of clouds) {
      const center = normalize(vec3(x, y, z));
      const right = normalize(vec3(z, 0, -x));
      const delta = direction.sub(center);
      const width = size * 0.6;
      const dx = delta.dot(right).div(width);
      const dy = delta.y.div(width * 0.55);
      const cluster = float(0).toVar();
      for (const [px, py, radius] of cumulusPuffs) {
        const distance = length(vec3(dx.sub(px), dy.sub(py), delta.dot(center).div(width)));
        cluster.assign(max(cluster, smoothstep(radius - 0.025, radius, distance).oneMinus()));
      }
      // Flat, shaded base below round crowns, rather than smoky fractal cloud detail.
      cluster.mulAssign(smoothstep(-0.42, -0.3, dy));
      mask.assign(max(mask, cluster));
      shade.assign(max(shade, cluster.mul(smoothstep(-0.2, 0.8, dy))));
    }
    mask.mulAssign(smoothstep(0.025, 0.09, height));
    const cloud = mix(vec3(0.65, 0.76, 0.9), vec3(1.05, 1.06, 1.02), shade).mul(sunColor.r);
    const upper = mix(sky, cloud, mask);
    const lower = mix(horizon, vec3(0.035, 0.065, 0.075), min(abs(direction.y).mul(4), 1)).mul(sunColor.r);
    return vec4(mix(lower, upper, smoothstep(-0.02, 0, direction.y)), mask.oneMinus());
  })();
