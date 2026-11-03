// Shader helpers over the shore field, shared by the surface (./surface.ts) and the wet sand (./island.ts), so the two always
// agree: Ultra Water's SHORE_GLSL and SWASH_GLSL (water/OceanSurface.js) as TSL. Samples are explicit-LOD: they sit inside
// branches, which WGSL allows only for those.
import { SHORE_CAPACITY, SHORE_SIZE, type ShoreAtlas } from './shore-providers.ts';
import { TSL, type N } from './tsl.ts';
import { LOOK, ULTRA } from './tuning.ts';
import { seaU } from './state.ts';

const { Fn, If, acos, clamp, cos, dot, float, floor, fract, length, max, min, mix, normalize, select } = TSL;
const { sin, smoothstep, texture, vec2, vec3, vec4 } = TSL;

export const uTime = seaU.uTime;
const a = (ULTRA.swellBearing * Math.PI) / 180;
export const SHORE_WAVE = {
  amp: LOOK.shoreAmp,
  lambda: LOOK.shoreLambda,
  speed: ULTRA.shoreSpeed,
  steep: ULTRA.shoreSteep,
};
export const uSwellDir = vec2(-Math.cos(a), -Math.sin(a));

/** The field's lookups for world xz. Out of the tile: deep open water, no shore. */
export function shoreFields(atlas: ShoreAtlas) {
  const region = Fn(([xz]: [N]) => {
    const layer = float(-1).toVar();
    // Reverse iteration means the first stable provider wins. Real data always wins over an apron.
    for (let pass = 0; pass < 2; pass++)
      for (let i = SHORE_CAPACITY - 1; i >= 0; i--) {
        const t: N = atlas.transforms.element(i),
          b: N = atlas.bounds.element(i);
        const inside =
          pass === 0
            ? TSL.abs(xz.x.sub(t.x))
                .lessThanEqual(t.z.mul(0.5))
                .and(TSL.abs(xz.y.sub(t.y)).lessThanEqual(t.z.mul(0.5)))
            : xz.x
                .greaterThanEqual(b.x)
                .and(xz.x.lessThanEqual(b.y))
                .and(xz.y.greaterThanEqual(b.z))
                .and(xz.y.lessThanEqual(b.w));
        If(atlas.count.greaterThan(i).and(inside), () => {
          layer.assign(i);
        });
      }
    const t: N = atlas.transforms.element(TSL.int(max(layer, 0)));
    const uv = xz.sub(t.xy).div(max(t.z, 1)).add(0.5);
    return vec3(uv, layer);
  }); // Inline Fn: the captured uniform arrays must be bound independently in vertex, fragment and compute stages.
  const lookup = (tex: ShoreAtlas['shore'], fallback: N) =>
    Fn(([xz]: [N]) => {
      const r = region(xz).toVar();
      return select(
        r.z.greaterThanEqual(0),
        texture(tex, r.xy)
          .depth(TSL.int(max(r.z, 0)))
          .level(0),
        fallback,
      );
    });
  const surf = lookup(atlas.surf, vec4(6, 0, 0, 1));
  return {
    shore: Fn(([xz]: [N]) => {
      const r = region(xz).toVar(),
        layer = TSL.int(max(r.z, 0));
      const vertexBed: N = atlas.vertexBeds.element(layer);
      const sh = select(
        r.z.greaterThanEqual(0),
        texture(atlas.shore, r.xy).depth(layer).level(0),
        vec4(-60, 1e4, 0, 0),
      ).toVar();
      If(r.z.greaterThanEqual(0).and(vertexBed.greaterThan(0)), () => {
        const p = clamp(r.xy.mul(SHORE_SIZE), 0, SHORE_SIZE - 1),
          ij = min(floor(p), SHORE_SIZE - 2),
          ab = p.sub(ij);
        const at = (x: number, z: number) => TSL.textureLoad(atlas.shore, TSL.ivec2(ij.add(vec2(x, z)))).depth(layer).r;
        const h00 = at(0, 0),
          h10 = at(1, 0),
          h01 = at(0, 1),
          h11 = at(1, 1);
        sh.x.assign(
          select(
            ab.x.add(ab.y).lessThanEqual(1),
            h00.add(h10.sub(h00).mul(ab.x)).add(h01.sub(h00).mul(ab.y)),
            h11.add(h01.sub(h11).mul(ab.x.oneMinus())).add(h10.sub(h11).mul(ab.y.oneMinus())),
          ),
        );
      });
      return sh;
    }),
    travel: lookup(atlas.travel, vec4(0)),
    surf: (xz: N) => surf(xz).r,
  };
}
export type ShoreFields = ReturnType<typeof shoreFields>;

// David Hoskins, Hash without Sine.
export const hash12 = Fn(([p]: [N]) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  p3.addAssign(dot(p3, p3.yzx.add(33.33)));
  return fract(p3.x.add(p3.y).mul(p3.z));
}).setLayout({ name: 'hash12', type: 'float', inputs: [{ name: 'p', type: 'vec2' }] });

export const vnoise = Fn(([p]: [N]) => {
  const i = floor(p),
    f = fract(p);
  const u = f.mul(f).mul(f.mul(-2).add(3));
  return mix(
    mix(hash12(i), hash12(i.add(vec2(1, 0))), u.x),
    mix(hash12(i.add(vec2(0, 1))), hash12(i.add(1)), u.x),
    u.y,
  );
}).setLayout({ name: 'vnoise', type: 'float', inputs: [{ name: 'p', type: 'vec2' }] });

// The phase offset along the coast, the slowly drifting sets, and how much of the swell a coast facing dir receives.
const localXZ = (xz: N) => xz; // immutable world phase, never the camera or the current region centre
export const shoreNoisePhase = (xz: N) =>
  vnoise(localXZ(xz).mul(0.0042))
    .mul(9)
    .add(vnoise(localXZ(xz).mul(0.011).add(7)).mul(2.5));
export const shoreGroup = (xz: N) =>
  vnoise(
    localXZ(xz)
      .mul(0.004)
      .add(vec2(uTime.mul(0.021), uTime.mul(-0.017))),
  )
    .mul(0.55)
    .add(0.45);
export const shoreExposure = (dir: N) => mix(0.25, 1, smoothstep(-0.3, 0.7, dot(dir, uSwellDir)));
export const shoreDir = (sh: N, tr: N) =>
  select(dot(tr.yz, tr.yz).greaterThan(0.25), normalize(tr.yz), sh.zw.negate().div(max(length(sh.zw), 1e-3)));

/**
 * Swash on the beach: every bore reaching the waterline runs up the sand to a height R and drains back. Returns (film
 * thickness m, edge foam 0..1, wetness 0..1). hgt is the height above the sea.
 */
export function swashNodes(xz: N, hgt: N, f: ShoreFields, rockInfluence?: (xz: N, dir: N) => N) {
  const sh = f.shore(xz).toVar(),
    tr = f.travel(xz).toVar(),
    surf = f.surf(xz).toVar();
  const out = vec3(0).toVar();
  const near = sh.y
    .lessThan(60)
    .and(hgt.greaterThan(-0.3))
    .and(hgt.lessThan(1.74 * SHORE_WAVE.amp));
  If(near, () => {
    const dir = shoreDir(sh, tr).toVar();
    const rk = rockInfluence ? rockInfluence(xz, dir).toVar() : vec2(0);
    // The run-up of what's left of the breakers: lagoon and lee beaches only lap.
    const A = min(float(SHORE_WAVE.amp).mul(shoreExposure(dir)).mul(shoreGroup(xz)), surf.mul(0.42).add(0.02));
    const R = A.mul(0.55)
      .mul(smoothstep(0.35, 0.8, length(sh.zw)))
      .mul(float(1).sub(rk.x.mul(0.9))) // SWASH_ROCKS: a dry wedge in the lee
      .toVar();
    // The bore's momentum carries it up the seaward face (~u²/2g), draining before the rest of the backwash.
    const surge = rk.y.mul(1.1).add(1);
    const w = Math.sqrt((9.81 * 6.2831853) / SHORE_WAVE.lambda) * SHORE_WAVE.speed;
    const s = fract(uTime.mul(w).add(shoreNoisePhase(xz)).div(6.2831853)).toVar();
    If(R.greaterThan(0.02), () => {
      If(hgt.greaterThan(R.mul(surge)), () => {
        // Reached by bigger sets.
        out.assign(vec3(0, 0, smoothstep(R.mul(surge), R.mul(surge).mul(1.5), hgt).oneMinus().mul(0.5)));
      }).Else(() => {
        const up = sin(s.div(0.3).mul(1.5708));
        const down = cos(s.sub(0.3).div(0.7).mul(1.5708));
        const eta = R.mul(select(s.lessThan(0.3), up, down)).mul(mix(surge, 1, smoothstep(0.25, 0.45, s)));
        const th = eta.sub(hgt).toVar();
        // A bubbly front while it runs up (a band behind the tip), then only sparse remnants, thinning as they drain.
        const dist = length(xz.sub(TSL.cameraPosition.xz));
        const aa = dist.mul(5e-5).add(0.005);
        const front = smoothstep(aa.negate(), aa, th).mul(smoothstep(0, aa.add(0.06), th).oneMinus());
        const back = smoothstep(0, 0.03, th)
          .mul(smoothstep(0.35, 0.6, s).oneMinus())
          .mul(0.3);
        // Churned foam against the face while the water is up, torn apart during backwash.
        const edge = max(
          select(s.lessThan(0.35), front, back),
          rk.y.mul(smoothstep(0, 0.02, th)).mul(smoothstep(0.15, 0.55, s).oneMinus()),
        );
        // Drying since the backwash uncovered this height.
        const sPass = acos(clamp(hgt.div(R), 0, 1))
          .div(1.5708)
          .mul(0.7)
          .add(0.3);
        const since = select(s.greaterThan(sPass), s.sub(sPass), s.add(1).sub(sPass)).mul(6.2831853 / w);
        const wet = select(th.greaterThan(0), float(1), TSL.exp(since.div(-5)));
        out.assign(vec3(max(th, 0), edge, wet));
      });
    });
  });
  return out;
}
