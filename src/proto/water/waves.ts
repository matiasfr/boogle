// Where the surface gets its waves. The material asks a source for displacement in the vertex shader and for slope, variance
// and whitecaps in the fragment shader; stage 1 answers with a few analytic Gerstner waves over baked tiles of filtered
// slope moments, and stage 2's FFT answers with cascades, so the surface doesn't change.
import { uTime, vnoise } from './shore-nodes.ts';
import { TSL, type N } from './tsl.ts';
import { ULTRA, WAVES } from './tuning.ts';
import { bakeSlopeTile } from './spectrum.ts';

const { clamp, cos, float, max, mix, sin, smoothstep, texture, vec2, vec3 } = TSL;

export type WaveSource = {
  /** The vertex's displacement: damp is (swell, chop, chop) by depth, cell the mesh's spacing here. */
  displace: (xz: N, cell: N, damp: N) => N;
  /** Slope, per-axis slope variance, unresolved roughness and a whitecap amount for this pixel. Runs in uniform control flow. */
  shade: (xz: N, footprint: N, damp: N) => { slope: N; variance: N; unresolved: N; whitecap: N };
  update: (time: number) => void;
};

const TWO_PI = Math.PI * 2;
const G = 9.81;
const PARAMS = WAVES.map((w) => {
  const k = TWO_PI / w.lambda,
    a = (w.dir * Math.PI) / 180;
  return { k, w: Math.sqrt(G * k), amp: w.amp, dx: Math.cos(a), dz: Math.sin(a), q: w.steep };
});

// The tiles: what stage 1 knows below the analytic waves. Each is read twice, drifting apart, so a frozen instant doesn't
// slide as one sheet; two independent reads at 1/√2 keep the slope's energy.
const TILES = [1, 2, 3].map((c) => bakeSlopeTile(c));
const DRIFT = [
  [
    [0.9, 0.25],
    [-0.5, 0.75],
  ],
  [
    [0.55, 0.3],
    [-0.28, 0.5],
  ],
  [
    [0.3, 0.12],
    [-0.1, 0.28],
  ],
];

// Cox-Munk's mean square slope for the wind, less what the waves carry: the rest is sub-texel roughness.
const carried =
  TILES.reduce((s, t) => s + t.meanSquareSlope, 0) + PARAMS.reduce((s, p) => s + (p.amp * p.k) ** 2 / 2, 0);
const UNRESOLVED = Math.max(0.003 + 0.00512 * ULTRA.wind - carried, 0);

export function analyticWaves(): WaveSource {
  return {
    displace(xz, cell, damp) {
      const d = vec3(0).toVar();
      for (const p of PARAMS) {
        // At least a few samples per wavelength: past that the wave fades rather than swims.
        const bl = smoothstep(0.1, 0.3, cell.mul(p.k / TWO_PI)).oneMinus();
        const ph = xz.x.mul(p.dx).add(xz.y.mul(p.dz)).mul(p.k).sub(uTime.mul(p.w)).toVar();
        const a = bl.mul(p.amp).mul(damp.x).toVar();
        d.y.addAssign(a.mul(cos(ph)));
        const push = a.mul(p.q).mul(sin(ph)).negate();
        d.x.addAssign(push.mul(p.dx));
        d.z.addAssign(push.mul(p.dz));
      }
      return d;
    },
    shade(xz, footprint, damp) {
      const slope = vec2(0).toVar(),
        variance = vec2(0).toVar();
      const sq = float(0).toVar(); // the waves' Gerstner squeeze here: the Jacobian's distance from 1
      for (const p of PARAMS) {
        const res = smoothstep(0.1, 0.4, footprint.mul(p.k / TWO_PI))
          .oneMinus()
          .toVar();
        const ph = xz.x.mul(p.dx).add(xz.y.mul(p.dz)).mul(p.k).sub(uTime.mul(p.w)).toVar();
        const ak = float(p.amp * p.k)
          .mul(damp.x)
          .toVar();
        const c = cos(ph).toVar();
        const s = ak
          .mul(sin(ph))
          .mul(res)
          .div(max(float(1).sub(ak.mul(p.q).mul(c)), 0.2))
          .negate();
        slope.addAssign(vec2(s.mul(p.dx), s.mul(p.dz)));
        // What the pixel can no longer resolve stays as variance.
        const lost = res.oneMinus().mul(ak).mul(ak).mul(0.5);
        variance.addAssign(vec2(lost.mul(p.dx * p.dx), lost.mul(p.dz * p.dz)));
        sq.addAssign(ak.mul(p.q).mul(c).mul(res));
      }
      // Wind slicks: surfactant patches damp the short waves (capillaries most), so the far field breaks into calm and rough
      // streaks instead of a uniform speckle.
      const slick = smoothstep(0.3, 0.7, vnoise(xz.mul(0.006).add(uTime.mul(0.01)))).toVar();
      const sl3 = mix(0.4, 1, slick).toVar();
      const slicked = [float(1), mix(0.75, 1, slick), sl3];
      TILES.forEach((tile, i) => {
        const dampC = (i === 0 ? damp.y : damp.z).mul(slicked[i]);
        for (const dr of DRIFT[i]!) {
          const uv = xz
            .add(vec2(dr[0]!, dr[1]!).mul(uTime))
            .div(tile.length)
            .add(vec2(dr[1]! * 3.1, dr[0]! * 7.3));
          const m = texture(tile.tex, uv).toVar();
          const w = dampC.mul(Math.SQRT1_2).toVar();
          const sxz = m.xy.mul(w).toVar();
          slope.addAssign(sxz);
          variance.addAssign(max(m.zw.mul(w).mul(w).sub(sxz.mul(sxz)), 0));
        }
      });
      const unresolved = float(UNRESOLVED).mul(damp.z).mul(damp.z).mul(sl3).mul(sl3);
      // Whitecaps from the squeeze, as the demo's from its Jacobian: broken up, since these waves are too regular to do it
      // themselves. The FFT's real history replaces this.
      const gust = smoothstep(0.55, 0.75, vnoise(xz.mul(0.021).add(uTime.mul(0.03))));
      const whitecap = clamp(sq.sub(0.045).mul(ULTRA.foamScale * 12), 0, 1)
        .mul(gust)
        .mul(damp.x);
      return { slope, variance, unresolved, whitecap };
    },
    update() {},
  };
}
