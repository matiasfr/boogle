// The sea's swell (docs/plans/water-sunshine.md, step 2): four long, low sines, one function in TypeScript and
// TSL so swimming reads the same heights the eye sees with no GPU readback. Vertical only (no horizontal push), so a
// height at (x, z) needs no inversion and the two sides agree to float rounding. Mean level is SEA; the swell fades to
// flat over the shallows, so the surface never dips below the bed and the bed clamp is not needed.
import { SEA } from '../../constants.ts';
import { TSL, type N } from './tsl.ts';

const G = 9.81;
const TAU = Math.PI * 2;
/** Wavelength m, amplitude m, heading degrees (the direction the crest travels), phase rad. */
const WAVES = [
  { length: 61, amp: 0.09, heading: 215, phase: 0.0 },
  { length: 38, amp: 0.12, heading: 200, phase: 1.7 },
  { length: 23, amp: 0.08, heading: 235, phase: 4.1 },
  { length: 14, amp: 0.045, heading: 170, phase: 2.6 },
] as const;
export const SWELL = WAVES.map((w) => {
  const k = TAU / w.length,
    a = (w.heading * Math.PI) / 180;
  return { kx: k * Math.cos(a), kz: k * Math.sin(a), omega: Math.sqrt(G * k), amp: w.amp, phase: w.phase };
});
/** The largest crest above SEA: the swell's whole budget. */
export const SWELL_MAX = SWELL.reduce((sum, w) => sum + w.amp, 0);
/** Depth (m below SEA) over which the swell fades in from flat at the waterline. */
export const FADE = { shallow: 0.4, full: 6 } as const;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Each wave's time phase, wrapped in doubles: the shader's uniform and the CPU use the same values. */
export function swellPhases(time: number, out: number[] = [0, 0, 0, 0]) {
  for (let i = 0; i < SWELL.length; i++) out[i] = (SWELL[i]!.omega * time + SWELL[i]!.phase) % TAU;
  return out;
}
const swellFade = (depth: number) => smooth(FADE.shallow, FADE.full, depth);

/** Height above SEA and its rate of change at (x, z), for water `depth` metres deep there (bed below SEA). */
export function swellAt(x: number, z: number, time: number, depth: number) {
  const fade = swellFade(depth);
  let height = 0,
    rate = 0;
  if (fade > 0)
    for (const w of SWELL) {
      const arg = w.kx * x + w.kz * z - (w.omega * time + w.phase);
      height += w.amp * Math.sin(arg);
      rate -= w.amp * w.omega * Math.cos(arg);
    }
  return { height: SEA + height * fade, rate: rate * fade };
}

const { cos, float, sin, smoothstep, vec2, vec3 } = TSL;
/**
 * TSL twin of swellAt: (height above SEA, slope x, slope z) for world xz, the bed depth there and per-wave phases (a
 * vec4 uniform from swellPhases). The slope ignores the fade's own gradient, which is gentle over the shallows.
 */
export function swellNode(xz: N, depth: N, phases: N) {
  // A plain expression (no variables), so it builds inside or outside a Fn.
  const fade = smoothstep(FADE.shallow, FADE.full, depth);
  const lanes = ['x', 'y', 'z', 'w'] as const;
  let out: N = vec3(0);
  SWELL.forEach((w, i) => {
    const arg = xz.x.mul(w.kx).add(xz.y.mul(w.kz)).sub(phases[lanes[i]!]);
    out = out.add(vec3(sin(arg).mul(w.amp), vec2(w.kx, w.kz).mul(cos(arg).mul(w.amp))));
  });
  return out.mul(fade).add(vec3(float(SEA), 0, 0));
}
