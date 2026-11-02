// The crossing's sea (?proto=crossing): one colour graph on the game's water material, also worn by the open-sea
// rectangles in ./sky.ts, so the two can't disagree at their seam. The look of previz shot 2, after Super Mario Sunshine's
// cool water under warm solids: body colour by depth, the sky by view angle, and a broken lane of sun glitter from two
// world-locked normal layers. docs/research/sunshine-look.md, recommendations 1 and 3. Local and cosmetic: nothing reads it.
//
// The glitter stays still at speed because no layer outlives its pixels: as a layer's features shrink to a few pixels it
// fades out, and the slope it took away widens the highlight instead (the idea of Toksvig's filtering, from the slope we
// know rather than from a mip's shortened normal). So far water gets a soft lane, not crawling dots.
import * as THREE from 'three/webgpu';
import {
  Fn,
  abs,
  cameraPosition,
  clamp as tslClamp,
  cos,
  dFdx,
  dFdy,
  dot,
  float,
  length,
  max,
  min,
  mix,
  normalize,
  positionLocal,
  positionWorld,
  pow,
  reflect,
  sin,
  smoothstep,
  sqrt,
  texture,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { HALF } from '../../constants.ts';
import { skyU } from '../../render/sky.ts';
import { seaDepth, seaFoam, seaRings, seaU, waterMat } from '../../render/water-render.ts';
import { mulberry32 } from '../../sim/rng.ts';
import { LOOK } from './tuning.ts';

const hex = (h: string) => {
  const c = new THREE.Color(h);
  return vec3(c.r, c.g, c.b);
};

// A repeating slope field, ours: a few waves with whole numbers of cycles across the tile, so it wraps. RG holds the
// slope along x and z, 0.5 for flat, scaled so that the field's RMS slope reads as 1 in the shader.
const TILE = 128,
  RANGE = 3; // RMS slopes that fit in the texture's range
function slopeTexture(seed: number) {
  const rng = mulberry32(seed);
  const waves = Array.from({ length: 40 }, () => {
    const a = rng() * Math.PI * 2,
      k = 2 + rng() * 8;
    const kx = Math.round(Math.cos(a) * k),
      kz = Math.round(Math.sin(a) * k);
    return { kx, kz, amp: 1 / (1 + Math.hypot(kx, kz)) ** 1.3, phase: rng() * Math.PI * 2 };
  });
  const sx = new Float32Array(TILE * TILE),
    sz = new Float32Array(TILE * TILE);
  let sum = 0;
  for (let j = 0; j < TILE; j++)
    for (let i = 0; i < TILE; i++) {
      let x = 0,
        z = 0;
      for (const w of waves) {
        const c = Math.cos(((w.kx * i + w.kz * j) / TILE) * Math.PI * 2 + w.phase) * w.amp;
        x += c * w.kx;
        z += c * w.kz;
      }
      sx[j * TILE + i] = x;
      sz[j * TILE + i] = z;
      sum += x * x + z * z;
    }
  const rms = Math.sqrt(sum / (TILE * TILE));
  const data = new Uint8Array(TILE * TILE * 4);
  const pack = (v: number) => Math.round((Math.max(-1, Math.min(1, v / rms / RANGE)) * 0.5 + 0.5) * 255);
  for (let n = 0; n < TILE * TILE; n++) {
    data[n * 4] = pack(sx[n]!);
    data[n * 4 + 1] = pack(sz[n]!);
    data[n * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, TILE, TILE, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

const OPEN_DEPTH = 14; // m: past the game's height grid the sea is simply open water, the same on both meshes

const LAYERS = [
  { repeat: 8, feature: 1.2, slope: LOOK.slope8, scroll: [0.03, 0.01], turn: 0.5, tex: slopeTexture(11) },
  { repeat: 2, feature: 0.3, slope: LOOK.slope2, scroll: [-0.012, 0.017], turn: 2.1, tex: slopeTexture(23) },
];

const seaColor = Fn(() => {
  const t = seaU.uTime;
  const w = positionWorld;
  const p = w.xz;
  // Everything that samples or takes a derivative comes first: seaRings branches.
  const off = max(abs(p.x), abs(p.y));
  const depth = mix(seaDepth(), float(OPEN_DEPTH), smoothstep(HALF - 20, HALF + 20, off)) as unknown as ReturnType<
    typeof seaDepth
  >;
  // A pixel's footprint on the water, by its area: at a grazing angle flecks may stay as long thin dashes, as real glitter does.
  const metresPerPx = sqrt(length(dFdx(p)).mul(length(dFdy(p))));
  const slope = vec2(0, 0).toVar();
  const lost = float(0).toVar(); // the slope variance the faded layers no longer show
  // A slow warp of where the layers are read, so their tiles never line up into a grid across the sea.
  const q = p.add(vec2(sin(p.y.mul(0.19)), cos(p.x.mul(0.23))).mul(1.3));
  for (const l of LAYERS) {
    const c = Math.cos(l.turn),
      s = Math.sin(l.turn);
    const uv = vec2(q.x.mul(c).sub(q.y.mul(s)), q.x.mul(s).add(q.y.mul(c)))
      .add(vec2(l.scroll[0]!, l.scroll[1]!).mul(t))
      .div(l.repeat);
    const lod = float(1).sub(smoothstep(l.feature / LOOK.fadePx[1], l.feature / LOOK.fadePx[0], metresPerPx));
    const sample = texture(l.tex, uv)
      .xy.sub(0.5)
      .mul(2 * RANGE * l.slope);
    slope.addAssign(sample.mul(lod));
    lost.addAssign(
      float(1)
        .sub(lod)
        .mul(l.slope * l.slope),
    );
  }
  // A slow, broad, irregular swell under the layers (three waves that never line up), so the lane breaks into patches.
  const sw = (x: number, z: number, speed: number) => sin(p.x.mul(x).add(p.y.mul(z)).add(t.mul(speed)));
  const swellFade = float(1).sub(smoothstep(1, 2.5, metresPerPx));
  const swellA = sw(0.27, 0.11, 0.5)
    .add(sw(-0.13, 0.19, 0.37))
    .add(sw(0.08, -0.31, 0.61))
    .mul(swellFade);
  const swellB = sw(0.17, -0.23, 0.43)
    .add(sw(0.31, 0.07, -0.29))
    .mul(swellFade);
  const broad = vec2(swellA.mul(LOOK.swell), swellB.mul(LOOK.swell));
  const V = normalize(cameraPosition.sub(w));
  // Only the glitter gets the layers in full: the sea's colour stays broad and smooth, like the shot's.
  const Nsky = normalize(
    vec3(slope.x.mul(LOOK.skyRipple).add(broad.x.mul(0.5)), 1, slope.y.mul(LOOK.skyRipple).add(broad.y.mul(0.5))),
  );
  const N = normalize(vec3(slope.x.add(broad.x), 1, slope.y.add(broad.y)));
  const NoV = tslClamp(dot(Nsky, V), 0, 1);

  const col = mix(hex(LOOK.shallow), hex(LOOK.body), smoothstep(0, 2.5, depth)).toVar();
  col.assign(mix(col, hex(LOOK.deep), smoothstep(2.5, 9, depth)));
  col.mulAssign(seaU.uLight as unknown as typeof col); // a color uniform; three's TSL types want a float

  const R = reflect(V.negate(), Nsky);
  const sky = mix(skyU.uHorizon, skyU.uTop, pow(max(R.y, 0), skyU.uCurve));
  const F = min(
    float(LOOK.f0)
      .add(pow(float(1).sub(NoV), 5).mul(1 - LOOK.f0))
      .mul(LOOK.reflectGain),
    LOOK.reflectCap,
  );
  col.assign(mix(col, sky, F));

  const foam = seaFoam(depth).toVar();
  const ring = seaRings();
  col.addAssign(vec3(0.25, 0.3, 0.3).mul(ring));
  foam.assign(max(foam, tslClamp(ring, 0, 1)));
  col.assign(mix(col, vec3(1), foam.mul(0.9)));

  // The lobe, widened by the variance the faded layers took with them, its energy spread to match.
  const s = float(1).div(float(1 / LOOK.glintExp).add(lost));
  const H = normalize(V.add(seaU.uSun));
  const glint = pow(max(dot(N, H), 0), s)
    .mul(s.add(1).div(LOOK.glintExp + 1))
    .mul(LOOK.glintGain)
    .mul(mix(LOOK.laneGain, 1, s.div(LOOK.glintExp))); // the far lane is a sheen, not a veil over the blue
  col.addAssign(seaU.uSpecCol.mul(glint));

  return vec4(col, max(mix(0.5, 1, smoothstep(0.2, 5, depth)), foam.mul(0.95)));
});

/** Gives the game's sea this look, and calms its vertex waves toward its edge so it meets the flat rectangles level. */
export function dressSea() {
  waterMat.positionNode = Fn(() => {
    const p = positionLocal;
    const wave = sin(p.x.mul(0.21).add(seaU.uTime.mul(1.3)))
      .mul(0.06)
      .add(cos(p.z.mul(0.17).sub(seaU.uTime.mul(1.1))).mul(0.06));
    const calm = float(1).sub(smoothstep(HALF, HALF + 60, max(abs(p.x), abs(p.z))));
    return vec3(p.x, p.y.add(wave.mul(calm)), p.z);
  })();
  waterMat.colorNode = seaColor();
  waterMat.needsUpdate = true;
}
