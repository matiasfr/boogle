// The summer sky: original direction-space art (docs/research/skybox.md), the daytime sky since 6 November. Loading-time only.
// Palette literals are linear RGB. All consumers receive the same RGB + sun-transmittance cube.
import { TSL, type N } from './tsl.ts';

const { Fn, abs, float, length, max, min, mix, normalize, pow, smoothstep, vec3, vec4 } = TSL;

/** The summer sky as two colours, read once (9 November, linear) from a healthy bake at the blur the sea and fog used:
 *  the horizon averaged round the compass and the clear sky above 45°. The sea's reflection and haze and the scene fog
 *  use these; only the visible background and the PBR environment read the cube. `y` is the direction's height, 0..1. */
const HORIZON = vec3(3.6, 5.25, 7.15),
  ZENITH = vec3(0.45, 1.96, 5.21);
export const skyGradient = (y: N) => mix(HORIZON, ZENITH, smoothstep(0, 0.75, y).sqrt());

// Irregular azimuth, elevation, size and aspect: distant banks, medium clusters and a few high crowns.
// These are authored Local coordinates, never simulation state.
const clusters = [
  [0.3, 0.24, 1, 0.25, 0.6],
  [-0.65, 0.38, 1, 0.19, 0.8],
  [-0.2, 0.14, 1, 0.09, 0.48],
  [1, 0.32, -0.25, 0.28, 0.64],
  [1, 0.13, 0.48, 0.12, 0.42],
  [-1, 0.2, -0.3, 0.23, 0.55],
  [-1, 0.43, 0.35, 0.15, 0.85],
  [0.15, 0.3, -1, 0.27, 0.62],
  [-0.65, 0.65, -1, 0.16, 0.84],
  [0.7, 0.13, -1, 0.13, 0.4],
  [-0.32, 0.12, -1, 0.09, 0.46],
  [-1, 0.1, 0.8, 0.1, 0.4],
  [0.64, 0.72, 0.8, 0.18, 0.8],
] as const;

// Four-puff cumulus crown shared by every cluster: [x, y, radius] in cluster space.
const cumulusPuffs = [
  [-0.66, 0, 0.58],
  [-0.28, 0.25, 0.7],
  [0.18, 0.45, 0.75],
  [0.65, 0.1, 0.52],
] as const;

/** Typed recipe controls; changing them needs a reload, never an in-play bake. */
const SUMMER = { edge: 0.16, hazeTop: 0.18, base: [0.58, 0.67, 0.78], crown: [1.02, 1.03, 1] } as const;

function summerGradient(direction: N): N {
  const h = max(direction.y, 0);
  const blue = mix(vec3(0.17, 0.48, 0.88), vec3(0.055, 0.24, 0.64), pow(smoothstep(0.06, 0.85, h), 0.65));
  return mix(vec3(0.62, 0.76, 0.88), blue, smoothstep(0, SUMMER.hazeTop, h));
}

export const summerSky = (direction: N, sunColor: N, brightness: N): N =>
  Fn(() => {
    const recipe = SUMMER;
    const h = max(direction.y, 0);
    const sky = summerGradient(direction);
    const mask = float(0).toVar();
    const shade = float(0).toVar();
    for (const [i, [x, y, z, size, aspect]] of clusters.entries()) {
      const center = normalize(vec3(x, y, z));
      const right = normalize(vec3(z, 0, -x));
      const delta = direction.sub(center);
      const width = size * 0.7;
      const dx = delta.dot(right).div(width);
      const dy = delta.y.div(width * aspect);
      const cluster = float(0).toVar();
      for (const [j, [px, py, radius]] of cumulusPuffs.entries()) {
        // Alter each crown's proportions without random noise or repeated identical scallops.
        const r = radius * (1 + ((i + j * 2) % 4) * 0.075);
        const distance = length(vec3(dx.sub(px), dy.sub(py + ((i + j) % 3) * 0.09), delta.dot(center).div(width)));
        cluster.assign(max(cluster, smoothstep(r - recipe.edge, r + recipe.edge, distance).oneMinus()));
      }
      cluster.mulAssign(smoothstep(-0.52, -0.18, dy));
      mask.assign(max(mask, cluster));
      shade.assign(max(shade, cluster.mul(smoothstep(-0.35, 0.95, dy))));
    }
    mask.mulAssign(smoothstep(0.025, recipe.hazeTop, h));
    const cloud = mix(vec3(...recipe.base), vec3(...recipe.crown), shade)
      .mul(brightness)
      .toVar();
    const upper = mix(sky, cloud, mask);
    // Deliberate dark, neutral ground bounce; horizon remains continuous at y=0.
    const lower = mix(sky, vec3(0.045, 0.055, 0.06), min(abs(direction.y).mul(4), 1));
    return vec4(mix(lower, upper, smoothstep(-0.02, 0, direction.y)).mul(sunColor.r), mask.oneMinus());
  })();
