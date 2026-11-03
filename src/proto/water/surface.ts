// The water: Ultra Water's OceanSurface.js, its vertex and fragment shaders, as TSL on a camera-centred polar grid. The
// order and the numbers follow the source section by section, so comparing the two stays easy. What differs:
// - No opaque colour or depth to read (stage 3 decides that). The body is built from the bed the shore field knows. Over the
//   first few metres the real ground shows through by blending; deeper, the bed is the shader's.
// - No sky cube. skyAt() is the one place the reflection asks the sky, so a baked cube can replace it.
// - No planar reflection, underwater branch or floater shadows.
// - Waves come from a source (./waves.ts), which is what the FFT replaces.
// Every reversed smoothstep of the source is written as smoothstep(lo, hi, x).oneMinus(): reversed edges are undefined in WGSL.
import * as THREE from 'three/webgpu';
import { skyU } from '../../render/sky.ts';
import { seaRipples, seaU } from '../../render/water-render.ts';
import { ROCK } from './height.ts';
import { SEABED_HEX } from './island.ts';
import {
  SHORE_WAVE,
  hash12,
  shoreDir,
  shoreExposure,
  shoreGroup,
  shoreNoisePhase,
  uTime,
  vnoise,
  type ShoreBake,
  shoreFields,
} from './shore-nodes.ts';
import { TSL, type N } from './tsl.ts';
import { GRID, ISLAND_AT, LOOK, ULTRA } from './tuning.ts';
import type { WaveSource } from './waves.ts';

const { Break, Fn, If, Loop, abs, cameraPosition, clamp, color, cos, dFdx, dFdy, dot, exp, exp2, float, floor } = TSL;
const { fract, length, log, log2, max, min, mix, mod, normalize, positionGeometry, positionWorld, pow, reflect } = TSL;
const { select, sin, smoothstep, sqrt, texture, uniform, uniformArray, varying, vec2, vec3, vec4 } = TSL;

const PI = Math.PI;

// ---------------------------------------------------------------- the grid
// Camera-centred polar grid. Ring radii grow geometrically so cells stay square and screen density stays about constant.
// Displacement is band-limited to the local vertex spacing, which is what kills swimming; no clipmap snapping needed.
function buildGrid(angular: number) {
  const q = 1 + (2 * PI) / angular;
  const radii: number[] = [];
  // A few coarser rings inside INNER, so the surface right at the lens isn't one flat fan on the waterline.
  for (let r = GRID.inner / 16; r < GRID.inner * 0.99; r *= 1.12) radii.push(r);
  for (let r = GRID.inner; r < GRID.outer; r *= q) radii.push(r);
  radii.push(GRID.far * 0.97); // then one flat skirt to the far plane
  const verts = new Float32Array((1 + radii.length * angular) * 3);
  let v = 3; // vertex 0 is the centre
  for (const r of radii)
    for (let a = 0; a < angular; a++) {
      const t = (a / angular) * PI * 2;
      verts[v++] = Math.cos(t) * r;
      verts[v++] = 0;
      verts[v++] = Math.sin(t) * r;
    }
  const idx: number[] = [];
  for (let a = 0; a < angular; a++) idx.push(0, 1 + ((a + 1) % angular), 1 + a);
  for (let ring = 0; ring < radii.length - 1; ring++) {
    const i0 = 1 + ring * angular,
      i1 = i0 + angular;
    for (let a = 0; a < angular; a++) {
      const b = (a + 1) % angular;
      idx.push(i0 + a, i0 + b, i1 + a, i0 + b, i1 + b, i1 + a);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
  return geo;
}

// ---------------------------------------------------------------- shared: long waves in the shallows, and breakers
// FFT cascade weights by water depth: long swell is replaced by shore waves in the shallows, chop survives almost to the beach.
const cascadeDamp = (depth: N) => {
  const swell = smoothstep(2, ULTRA.swellFull, depth);
  const chop = smoothstep(-0.4, 2, depth).mul(mix(ULTRA.chopShallow, 1, smoothstep(0, 10, depth)));
  return vec3(swell, chop, chop);
};

// Travelling breakers on the eikonal travel-time field (./shore.ts): phase = w (tau + t) with local wavenumber
// w / sqrt(g depth), so fronts slow down, bunch up and bend around the bathymetry on their way in. Gerstner push along the
// propagation direction, Green's law + ray-tube shoaling, breaking limit A <= 0.42 depth. Breaking crests pitch forward of
// their base, glow where thin (lip) and leave lace behind in the surf zone (residual).
// cell: the sampling interval (m); trains only a few cells long fade out instead of aliasing.
function shoreWaves(xz: N, sh: N, tr: N, surf: N, cell: N) {
  const o = {
    disp: vec3(0).toVar(),
    slope: vec2(0).toVar(),
    foam: float(0).toVar(),
    wave0: vec4(0).toVar(),
    dir: vec2(0).toVar(),
    lip: float(0).toVar(),
    residual: float(0).toVar(),
  };
  const depth = sh.x.negate(),
    sdf = sh.y,
    gl = length(sh.zw);
  const env0 = smoothstep(70, 180, sdf)
    .oneMinus()
    .mul(smoothstep(0.35, 0.8, gl))
    .mul(smoothstep(-0.9, 0.5, depth))
    .toVar();
  If(env0.greaterThan(0), () => {
    const dir = shoreDir(sh, tr).toVar();
    o.dir.assign(dir);
    // Coasts facing the swell get the big sets, lee shores only small ones.
    const env = env0.mul(shoreExposure(dir)).toVar();
    const shoal = select(
      dot(tr.yz, tr.yz).greaterThan(0.25),
      tr.w,
      pow(clamp(max(depth, 0.6).div(14), 0.04, 1), -0.25),
    ).toVar();
    const cel = sqrt(clamp(depth, 0.3, 14).mul(9.81)).toVar();
    // Dissipation memory: a wave that already broke over a bar (shelter depth S) reaches here at most 0.42 S high; once it
    // runs into water much deeper than S it re-forms as unbroken swell instead of breaking again on every inner bar.
    const amax = min(max(depth, 0), surf)
      .mul(0.42)
      .add(smoothstep(0.5, 2, surf).mul(0.14))
      .add(0.02)
      .toVar();
    const gate = smoothstep(1.05, 1.4, depth.div(max(surf, 0.05)))
      .oneMinus()
      .toVar();
    const noisePhase = shoreNoisePhase(xz).toVar();
    const group = shoreGroup(xz).toVar();
    const pinch = float(0.85).toVar(); // the total horizontal compression allowed (Jacobian stays > 0.15)
    for (let i = 0; i < 2; i++) {
      const lambda = SHORE_WAVE.lambda * (i === 0 ? 1 : 0.61);
      const w = Math.sqrt((9.81 * 2 * PI) / lambda) * SHORE_WAVE.speed;
      const k = float(w).div(cel).toVar();
      const a = min(
        env
          .mul(shoal)
          .mul(group)
          .mul(SHORE_WAVE.amp * (i === 0 ? 1 : 0.45)),
        amax.mul(i === 0 ? 1 : 0.5),
      ).toVar();
      const ph = tr.x
        .add(uTime)
        .mul(w)
        .add(noisePhase.mul(i === 0 ? 1 : 1.37))
        .add(i * 2.1)
        .toVar();
      const c = cos(ph).mul(0.5).add(0.5).toVar();
      const s = sin(ph).toVar();
      const P = 1.6; // narrower crests, flatter troughs
      const cp = pow(max(c, 0), P - 1).toVar();
      const rel = a.div(max(depth, 0.05)).toVar();
      // Sections of each crest break early or late (peeling), a new layout every wave.
      const cycle = floor(ph.add(PI).div(2 * PI));
      const early = vnoise(xz.mul(0.03).add(vec2(cycle.mul(7.3), cycle.mul(3.1).add(i * 31)))).toVar();
      // Too little height left to whiten anything.
      const energy = smoothstep(0.03, 0.2, a);
      const breaking = smoothstep(early.mul(0.14).add(0.12), early.mul(0.2).add(0.3), rel)
        .mul(gate)
        .mul(energy)
        .toVar();
      // Plunging only around the break point; the inner surf zone runs as a bore.
      const pitch = float(0).toVar();
      if (i === 0) {
        pitch.assign(
          a
            .mul(2 * SHORE_WAVE.steep)
            .mul(smoothstep(0.16, 0.28, rel))
            .mul(smoothstep(0.4, 0.6, rel).oneMinus())
            .mul(gate),
        );
        // A heightfield can't overhang: the lean and both trains' Gerstner pinch share one budget.
        pitch.assign(min(pitch, float(0.35).div(k.mul(1.08))));
        // On cells coarser than the lean's pulse it only folds triangles into flickering slivers along the crest.
        pitch.mulAssign(smoothstep(0.03, 0.1, k.mul(cell).div(2 * PI)).oneMinus());
      }
      pinch.subAssign(pitch.mul(k).mul(1.08));
      const qak = min(pinch, a.mul(k).mul(SHORE_WAVE.steep * 8)).toVar();
      pinch.subAssign(qak);
      const c5 = c.mul(c).mul(c).mul(c).mul(c).toVar();
      // The grid slides as the view moves: a crest only a cell or two long gets resampled differently every frame.
      const bl = smoothstep(0.1, 0.3, k.mul(cell).div(2 * PI))
        .oneMinus()
        .toVar();
      o.disp.y.addAssign(bl.mul(a).mul(cp.mul(c).mul(2).sub(0.78)));
      const push = bl.mul(qak.div(k).mul(s).add(pitch.mul(c5).mul(c)));
      o.disp.x.addAssign(dir.x.mul(push));
      o.disp.z.addAssign(dir.y.mul(push));
      o.slope.addAssign(
        dir.mul(
          bl
            .mul(a)
            .mul(k)
            .mul(P)
            .mul(cp)
            .mul(s)
            .div(
              max(
                float(1)
                  .sub(qak.mul(cos(ph)))
                  .add(pitch.mul(k).mul(c5).mul(s).mul(3)),
                0.2,
              ),
            ),
        ),
      );
      // Whitewater: on the crest and trailing behind it once the wave is near breaking. An established bore also drags a
      // long spilling sheet over its back face; small breakers get a wider, fainter tail, not a bright line along every crest.
      const psi = mod(ph.add(PI), 2 * PI)
        .sub(PI)
        .toVar();
      const big = smoothstep(0.2, 0.5, a).toVar();
      const tail = max(
        exp(
          max(psi, 0)
            .negate()
            .mul(mix(0.45, 1, big)),
        ),
        smoothstep(0.3, 0.55, rel)
          .mul(smoothstep(0.3, 2.4, psi).oneMinus())
          .mul(0.65),
      );
      o.foam.addAssign(
        breaking
          .mul(smoothstep(mix(-0.7, -0.35, big), 0, psi))
          .mul(tail)
          .mul(mix(0.55, 1, big)),
      );
      if (i === 0) {
        o.wave0.assign(vec4(a, k, w, ph));
        o.lip.assign(breaking.mul(c5).mul(smoothstep(-0.2, 0.6, psi).oneMinus()));
        // The lace outlives single crests: no peeling, or it would pop between waves.
        o.residual.assign(
          smoothstep(0.18, 0.4, rel)
            .mul(
              exp(mod(ph, 2 * PI).mul(-0.4))
                .mul(0.45)
                .add(0.3),
            )
            .mul(gate)
            .mul(energy),
        );
      }
    }
  });
  return o;
}

// Ripple rings from things hitting the water (Cauchy-Poisson), driven by the game's own splash slots (splash.ts): by
// stationary phase a point impulse gives local wavenumber k = g t² / (4 r²) at radius r and phase k r, so long waves race
// ahead and short ones trail inside. Returns (height, dh/dx, dh/dz).
const uRip = uniformArray(seaRipples, 'vec4');
function impactWaves(xz: N, kMax: N) {
  const o = vec3(0).toVar();
  for (let i = 0; i < seaRipples.length; i++) {
    const e = uRip.element(i);
    If(e.w.greaterThan(0), () => {
      const dv = xz.sub(e.xy).toVar();
      const r = length(dv).add(1e-3).toVar();
      const age = max(seaU.uTime.sub(e.z), 0).toVar();
      const L = float(0.5);
      const k = age.mul(age).mul(9.81).div(r.mul(r).mul(4)).toVar();
      const kl2 = k.mul(k).mul(L).mul(L).toVar();
      const amp = e.w
        .mul(0.1)
        .mul(2.72)
        .mul(kl2)
        .mul(
          exp(
            kl2
              .add(k.mul(k).div(kMax.mul(kMax)))
              .add(age.mul(0.12))
              .negate(),
          ),
        )
        .mul(L)
        .div(L.add(r))
        .toVar();
      const ph = k.mul(r);
      o.x.addAssign(amp.mul(cos(ph)));
      o.y.addAssign(dv.x.div(r).mul(amp).mul(k).mul(sin(ph)));
      o.z.addAssign(dv.y.div(r).mul(amp).mul(k).mul(sin(ph)));
    });
  }
  return o;
}

// Poisson count with mean lam from one uniform number: inverse CDF, a logistic approximation for large means.
const poisson = Fn(([lam, u]: [N, N]) => {
  const n = float(0).toVar();
  If(lam.greaterThan(6), () => {
    n.assign(
      max(
        0,
        lam.add(
          sqrt(lam)
            .mul(log(u.div(float(1).sub(u))))
            .div(1.702),
        ),
      ),
    );
  }).Else(() => {
    const p = exp(lam.negate()).toVar(),
      F = p.toVar();
    Loop(14, () => {
      If(u.lessThanEqual(F), () => {
        Break();
      });
      n.addAssign(1);
      p.mulAssign(lam.div(n));
      F.addAssign(p);
    });
  });
  return n;
}).setLayout({
  name: 'poisson',
  type: 'float',
  inputs: [
    { name: 'lam', type: 'float' },
    { name: 'u', type: 'float' },
  ],
});

const lin3 = (v: number[]) => vec3(v[0]!, v[1]!, v[2]!);
const seabed = color(SEABED_HEX).mul(0.6); // what the real bed shows under water (./island.ts)
const uSunCol = uniform(new THREE.Color(1, 1, 1)); // the sun's colour times its intensity
const uHemi = uniform(new THREE.Color(1.2, 1.2, 1.2)); // the hemisphere light's, facing up

// The one place the water asks the sky. blur 0..1 is how rough the lobe is: the gradient widens toward its middle.
function skyAt(dir: N, blur: N) {
  const y = max(dir.y, 0);
  const sharp = mix(skyU.uHorizon, skyU.uTop, pow(y, skyU.uCurve));
  return mix(sharp, mix(skyU.uHorizon, skyU.uTop, 0.6), blur);
}

export type Ocean = {
  mesh: THREE.Mesh;
  update: (camera: THREE.Camera, time: number, sun: THREE.DirectionalLight, hemi?: THREE.HemisphereLight) => void;
};

export function createOcean(source: WaveSource, bake: ShoreBake, foamTex: THREE.Texture): Ocean {
  const uGridScale = uniform(1),
    uCellStep = uniform((2 * PI) / GRID.angular);
  const f = shoreFields(bake);

  // ---------------------------------------------------------------- vertex
  // The undisplaced point and the displaced one both go to the fragment shader.
  const vertex = (() => {
    const local = positionGeometry.xz;
    const r = length(local);
    const scale = select(r.greaterThan(GRID.outer * 2), float(1), uGridScale);
    const xz = cameraPosition.xz.add(local.mul(scale));
    const cell = max(r, GRID.inner).mul(uCellStep).mul(scale);
    return { xz, cell };
  })();
  const vXZ = varying(vertex.xz, 'vXZ');
  const vSurf = varying(f.surf(vertex.xz), 'vSurf');

  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    fog: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });

  material.positionNode = Fn(() => {
    const { xz, cell } = vertex;
    const sh = f.shore(xz).toVar(),
      tr = f.travel(xz).toVar(),
      surf = f.surf(xz).toVar();
    const damp = cascadeDamp(sh.x.negate()).toVar();
    const d = source.displace(xz, cell, damp).toVar();
    d.addAssign(shoreWaves(xz, sh, tr, surf, cell).disp);
    d.y.addAssign(impactWaves(xz.add(d.xz), float(2 * PI).div(max(cell, 1e-3))).x);
    const p = vec3(xz.x.add(d.x), d.y, xz.y.add(d.z)).toVar();
    // Water can't drain below the bed: a trough over a bar only thins the water. The clearance grows with distance, as
    // the depth buffer's precision falls off.
    const bedAt = f.shore(p.xz).x;
    const dc = length(p.xz.sub(cameraPosition.xz));
    If(p.y.lessThan(0), () => {
      p.y.assign(max(p.y, min(bedAt.add(0.04).add(dc.mul(dc).mul(2e-7)), 0)));
    });
    return p;
  })();

  // ---------------------------------------------------------------- fragment
  material.colorNode = Fn(() => {
    const vWorld = positionWorld;
    const toCam = cameraPosition.sub(vWorld).toVar();
    const dist = length(toCam).toVar();
    const V = toCam.div(dist).toVar();

    // --- surface: slopes and slope variance -------------------------------------------
    // Everything that samples implicitly or takes a derivative comes first: what follows branches.
    const xz = vXZ;
    const sh = f.shore(xz).toVar();
    const tr = f.travel(xz).toVar();
    const depthBelow = sh.x.negate().toVar();
    const damp = cascadeDamp(depthBelow).toVar();
    const fwXZ = abs(dFdx(xz))
      .add(abs(dFdy(xz)))
      .toVar();
    const footprint = max(fwXZ.x, fwXZ.y).toVar();
    const surfaces = source.shade(xz, footprint, damp);
    const shore = shoreWaves(xz, sh, tr, vSurf, footprint);
    const imp = impactWaves(vWorld.xz, float(2).div(max(footprint, 1e-3))).toVar();
    const slope = surfaces.slope.add(shore.slope).add(imp.yz).toVar();
    const variance = surfaces.variance.toVar();
    const Nrm = normalize(vec3(slope.x.negate(), 1, slope.y.negate())).toVar();

    // Geometric specular AA (Kaplanyan): the normal's change across the pixel adds variance.
    const dndx = dFdx(Nrm),
      dndy = dFdy(Nrm);
    const geoVar = min(dot(dndx, dndx).add(dot(dndy, dndy)).mul(0.25), 0.18).toVar();
    const alpha2 = float(ULTRA.roughness * ULTRA.roughness)
      .add(surfaces.unresolved)
      .add(variance.x)
      .add(variance.y)
      .add(geoVar)
      .toVar();
    const alpha = sqrt(alpha2).toVar();

    const NoV = max(dot(Nrm, V), 1e-4).toVar();
    const NoL = dot(Nrm, seaU.uSun).toVar();

    // --- foam --------------------------------------------------------------------------
    const foam = surfaces.whitecap.toVar();
    const shoreFoam = clamp(shore.foam, 0, 1).toVar();
    // Vertical water thickness, from the bed the field knows rather than a depth buffer.
    const vth = max(depthBelow.add(vWorld.y), 0).toVar();
    // Contact foam where the water gets thin: in the shallows only, broken into drifting patches so it never traces the
    // waterline as a continuous rim, and mostly where bores arrive (a lee shore gets almost none, not an outline).
    If(depthBelow.lessThan(6), () => {
      const act = clamp(shore.residual.mul(1.5).add(shoreFoam), 0, 1);
      const contact = smoothstep(0, ULTRA.foamBand, vth)
        .oneMinus()
        .mul(smoothstep(2, 6, depthBelow).oneMinus())
        .mul(act.mul(0.5))
        .mul(
          smoothstep(
            0.3,
            0.6,
            vnoise(xz.mul(0.7).add(shore.dir.mul(uTime).mul(0.4)))
              .mul(0.65)
              .add(vnoise(xz.mul(2.3)).mul(0.35)),
          ),
        )
        // Gone before the mesh edge, which would otherwise wear it as a row of white beads; far off, only sparkle.
        .mul(smoothstep(0.03, 0.2, vth))
        .mul(smoothstep(300, 600, dist).oneMinus());
      foam.assign(max(foam, contact));
    });
    // The surf rock: each crest slams into it and leaves a churned skirt that fades until the next one and trails off into
    // the lee. Phase of the main train, so it pulses with the sets.
    const rd = vWorld.xz.sub(vec2(ISLAND_AT.x + ROCK.x, ISLAND_AT.z + ROCK.z)).toVar();
    const rl = length(rd).toVar();
    If(rl.lessThan(ROCK.r * 3), () => {
      const lee = max(dot(rd, shore.dir).div(max(rl, 1e-3)), 0);
      const since = mod(shore.wave0.w, 2 * PI);
      const hit = exp(since.mul(-0.7)).toVar();
      const reach = lee.mul(0.9).add(0.3).mul(hit.mul(0.7).add(0.3)).add(1.15).mul(ROCK.r);
      const ring = smoothstep(ROCK.r * 0.95, reach, rl)
        .oneMinus()
        .toVar();
      const n = vnoise(xz.mul(0.55).sub(shore.dir.mul(uTime).mul(0.9)))
        .mul(0.6)
        .add(vnoise(xz.mul(1.9).add(uTime.mul(0.35))).mul(0.4));
      const skirt = ring.mul(
        smoothstep(float(0.62).sub(hit.mul(0.3).mul(ring)), float(0.85).sub(hit.mul(0.3).mul(ring)), n),
      );
      foam.assign(max(foam, skirt.mul(mix(0.35, 0.75, hit))));
    });

    // --- lighting ----------------------------------------------------------------------
    const ambient = skyAt(vec3(0, 1, 0), float(1)).toVar();
    const sunI = seaU.uSpecCol.mul(LOOK.sunGain).toVar();
    const sunY = max(seaU.uSun.y, 0).toVar();
    const absorption = lin3(LOOK.absorption);
    const scatter = lin3(LOOK.scatter);
    // No depth buffer: the path through the water along the view, from the field's bed.
    const thick = vth.div(max(V.y, 0.1)).toVar();
    const T = exp(absorption.negate().mul(thick)).toVar();
    // In-scatter of the water column (sun and sky), then Atlas-style subsurface scatter on crests.
    const inscatter = scatter
      .mul(ambient.add(sunI.mul(sunY)))
      // Over shallow bright sand the light scattered back up has crossed little water: turquoise.
      .mul(exp(max(depthBelow, 0).mul(-0.3)).mul(1.5).add(1))
      .toVar();
    const h = max(vWorld.y, 0);
    const toward = clamp(dot(seaU.uSun, V.negate()), 0, 1).toVar();
    const k1 = float(ULTRA.sss[0]!)
      .mul(h)
      .mul(pow(toward, 4))
      .mul(pow(NoL.mul(-0.5).add(0.5), 3));
    const k2 = float(ULTRA.sss[1]!).mul(pow(NoV, 2));
    const sss = scatter
      .mul(sunI)
      .mul(k1.add(k2).add(max(NoL, 0).mul(ULTRA.sss[2]!)))
      // Thin breaking lips: sunlight through about a metre of water glows turquoise, strongest looking into the sun.
      .add(
        sunI
          .mul(shore.lip)
          .mul(exp(absorption.mul(-2)))
          .mul(0.06)
          .mul(pow(toward, 3).mul(2.5).add(0.3)),
      )
      .toVar();
    const glow = inscatter.add(sss).toVar();
    // The bed the shader knows, tinted per channel: the body is its own colour, so nothing can shimmer between two beds.
    // Only the last hand of water blends with the real ground (feet, the wet edge): Tm is how much of it the blend keeps, and
    // T - Tm tints that part per channel, exact where the real ground looks like `bed`. Stage 3 is what would show the rest.
    const bedFade = smoothstep(20, 45, depthBelow).oneMinus();
    // Lit as three lights the real one: the hemisphere plus the sun, each over pi.
    const bed = seabed.mul(uSunCol.mul(sunY).add(uHemi).div(PI)).mul(bedFade).toVar();
    const Tm = dot(T, vec3(1 / 3))
      .mul(smoothstep(0.25, 0.9, vth).oneMinus())
      .toVar();
    // Surf-zone turbidity: sand stirred up behind the bores clouds the water a little, sandy-green, never white.
    const turb = clamp(shore.residual.mul(0.8).add(shoreFoam.mul(0.6)), 0, 1)
      .mul(smoothstep(1, 5, depthBelow).oneMinus())
      .mul(smoothstep(0.1, 0.8, vth))
      .mul(
        vnoise(xz.mul(0.08).sub(shore.dir.mul(uTime).mul(0.3)))
          .mul(0.4)
          .add(0.6),
      )
      .toVar();
    const body = bed
      .mul(T.sub(Tm))
      .add(glow.mul(vec3(1).sub(T)))
      .toVar();
    If(turb.greaterThan(0), () => {
      const ext = turb.mul(0.7);
      const Tt = T.mul(exp(ext.mul(thick).negate())).toVar();
      const wm = min(ext.div(ext.add(dot(absorption, vec3(0.333)))), 0.4);
      body.assign(bed.mul(Tt.sub(Tm)).add(mix(glow, inscatter.mul(vec3(1.2, 1.1, 0.75)), wm).mul(vec3(1).sub(Tt))));
    });
    // The grade: saturation of the body only, so foam and the sun stay as they are.
    if (LOOK.saturation !== 1) body.assign(mix(vec3(dot(body, vec3(0.2126, 0.7152, 0.0722))), body, LOOK.saturation));

    // Fresnel with roughness-aware F90 (Lagarde), so the rough far field doesn't go white.
    const F0 = 0.02;
    const F90 = max(float(1).sub(sqrt(alpha).mul(0.7)), F0);
    const F = min(
      float(F0)
        .add(F90.sub(F0).mul(pow(float(1).sub(NoV), 5)))
        .mul(LOOK.reflectGain),
      LOOK.reflectCap,
    ).toVar();

    // --- reflection: the sky ------------------------------------------------------------
    const Rr = reflect(V.negate(), Nrm).toVar();
    const R = vec3(Rr.x, abs(Rr.y), Rr.z);
    const refl = skyAt(R, clamp(alpha.mul(2), 0, 1))
      .mul(lin3(LOOK.reflectTint))
      .toVar();

    // --- sun specular: GGX, alpha floored so the sun acts as a small area light -----------
    const aS = max(alpha, 0.015).toVar();
    const aS2 = aS.mul(aS).toVar();
    const H = normalize(seaU.uSun.add(V)).toVar();
    const NoH = max(dot(Nrm, H), 0).toVar();
    const nl = max(NoL, 0).toVar();
    const dd = NoH.mul(NoH).mul(aS2.sub(1)).add(1).toVar();
    const D = aS2.div(dd.mul(dd).mul(PI)).toVar();
    const vis = float(0.5).div(
      nl
        .mul(sqrt(NoV.mul(NoV).mul(aS2.oneMinus()).add(aS2)))
        .add(NoV.mul(sqrt(nl.mul(nl).mul(aS2.oneMinus()).add(aS2))))
        .add(1e-5),
    );
    const VoH = max(dot(V, H), 0).toVar();
    const Fs = float(F0).add(pow(VoH.oneMinus(), 5).mul(1 - F0));
    const spec = sunI.mul(D.mul(vis).mul(Fs).mul(nl).mul(PI)).toVar();

    // Glitter: the lobe as a finite number of sub-pixel facets. Per cell of about the pixel footprint the expected count
    // mirroring the sun is lam; a Poisson draw / lam scales the smooth lobe (mean 1, energy kept). Dense cells stay smooth,
    // sparse ones break into points; each cell crossfades between draws so they twinkle.
    If(dot(spec, vec3(1)).greaterThan(0.02), () => {
      const FACETS = 2e4; // per m² (calibration knob)
      const lf = log2(max(footprint, 1e-3)).add(1).toVar();
      const l0 = floor(lf).toVar();
      const per = D.mul(NoH)
        .mul(FACETS * 6.8e-5)
        .div(max(dot(V, H), 0.05).mul(4))
        .toVar();
      const m = float(0).toVar();
      for (let j = 0; j < 2; j++) {
        const l = l0.add(j);
        const sz = exp2(l).toVar();
        const cell = floor(xz.div(sz)).toVar();
        const lam = per.mul(sz).mul(sz).toVar();
        const tt = uTime
          .mul(3)
          .add(hash12(cell.add(l.mul(17.17))).mul(64))
          .toVar();
        const it = floor(tt).toVar();
        const n0 = poisson(lam, clamp(hash12(cell.mul(1.31).add(it.mul(3.7))), 1e-4, 0.9999));
        const n1 = poisson(lam, clamp(hash12(cell.mul(1.31).add(it.add(1).mul(3.7))), 1e-4, 0.9999));
        const weight = j === 0 ? float(1).sub(lf.sub(l0)) : lf.sub(l0);
        m.addAssign(weight.mul(min(mix(n0, n1, smoothstep(0, 1, tt.sub(it))).div(max(lam, 1e-4)), 30)));
      }
      spec.mulAssign(
        mix(
          1,
          m,
          smoothstep(4, 30, dist)
            .mul(smoothstep(0.05, 0.3, vth))
            .mul(ULTRA.glint),
        ),
      );
    });

    // The thin wash is churned and aerated, so it mirrors only a dim, broken sky.
    const mirror = F.mul(mix(0.45, 1, smoothstep(0.08, 0.8, vth))).toVar();
    // col and keep: this pixel, premultiplied, and how much of what's behind it survives.
    const col = mix(body, refl, mirror).add(spec).toVar();
    const keep = Tm.mul(mirror.oneMinus()).toVar();
    // A vanishing film at the waterline: no reflection or specular seam where the mesh cuts the sand. The edge melts.
    const film = smoothstep(0, dist.mul(5e-4).add(0.12), vth).toVar();
    col.mulAssign(film);
    keep.assign(mix(1, keep, film));

    // --- foam surface: eroded by age via the pattern threshold, kills specular -------------
    // Dense foam is nearly solid, ageing foam thins out to the lace network. Explicit LODs: these taps sit in branches, only
    // where there is foam; most of the ocean has none.
    const foamLod = (scale: number) => log2(max(footprint.mul(512 * scale), 1e-3)).sub(0.5);
    const foamAt = (uv: N, scale: number) => texture(foamTex, uv).level(foamLod(scale));
    const cover = float(0).toVar(),
      pat = float(0).toVar(),
      fh = float(0.5).toVar(),
      dens = float(0).toVar();
    const fg = vec2(0).toVar();
    If(foam.greaterThan(0), () => {
      const t0 = foamAt(xz.mul(0.11), 0.11).toVar();
      pat.assign(t0.r.mul(0.65).add(foamAt(xz.mul(0.031).add(0.37), 0.031).r.mul(0.35)));
      cover.assign(smoothstep(float(1.05).sub(foam), float(1.3).sub(foam), pat).mul(sqrt(foam)));
      fh.assign(t0.g);
      fg.assign(t0.ba.sub(0.5).mul(64 * 0.11));
      dens.assign(foam);
    });
    If(shoreFoam.greaterThan(0), () => {
      // Whitewater rides shoreward with the bore: a world-space flow map at the phase speed, two phases crossfaded every half
      // period (which also makes it churn). On the displaced surface, so the crest pinch doesn't squash it into streaks.
      const FLOW_T = 2.5;
      const vel = shore.dir.mul(shore.wave0.z).div(max(shore.wave0.y, 1e-3)).toVar();
      const f0 = fract(uTime.div(FLOW_T)).toVar(),
        f1 = fract(uTime.div(FLOW_T).add(0.5)).toVar(),
        wb = abs(f0.mul(2).sub(1)).toVar();
      const b0 = foamAt(vWorld.xz.sub(vel.mul(f0.mul(FLOW_T))).mul(0.15), 0.15).toVar();
      const b1 = foamAt(
        vWorld.xz
          .sub(vel.mul(f1.mul(FLOW_T)))
          .mul(0.15)
          .add(0.43),
        0.15,
      ).toVar();
      const sh_ = mix(b0.g, b1.g, wb).toVar();
      const sPattern = mix(b0.r, b1.r, wb)
        .mul(0.3)
        .add(sh_.mul(0.45))
        .add(foamAt(vWorld.xz.mul(0.023).add(0.5), 0.023).r.mul(0.25))
        .toVar();
      // Lace over a thin, patchy veil on the fresh bore only: an even sheet over the whole surf zone reads as ice.
      const sCover = smoothstep(float(1).sub(shoreFoam.mul(1.1)), float(1.45).sub(shoreFoam.mul(1.1)), sPattern)
        .mul(sqrt(shoreFoam))
        .toVar();
      sCover.assign(
        max(
          sCover,
          smoothstep(0.45, 0.9, shoreFoam)
            .mul(smoothstep(0.35, 0.7, sPattern))
            .mul(smoothstep(0.1, 0.5, vth))
            .mul(0.3),
        ),
      );
      sCover.mulAssign(mix(0.55, 1, smoothstep(0.05, 0.4, vth)));
      If(sCover.greaterThanEqual(cover), () => {
        pat.assign(sPattern);
        fh.assign(sh_);
        dens.assign(shoreFoam);
        fg.assign(
          mix(b0.ba, b1.ba, wb)
            .mul(64 * 0.15)
            .sub(32 * 0.15),
        );
      });
      cover.assign(max(cover, sCover));
    });
    If(shore.residual.greaterThan(0), () => {
      // Lace left behind in the surf zone, drifting shoreward (two-phase flow map).
      const fp = fract(uTime.div(8)).toVar();
      const drift = shore.dir.mul(2.8).toVar();
      const r0 = foamAt(vWorld.xz.sub(drift.mul(fp)).mul(0.06), 0.06).r;
      const r1 = foamAt(
        vWorld.xz
          .sub(drift.mul(fract(fp.add(0.5))))
          .mul(0.06)
          .add(0.5),
        0.06,
      ).r;
      const rp = mix(r0, r1, abs(fp.mul(2).sub(1))).toVar();
      const rCover = smoothstep(float(1.2).sub(shore.residual), float(1.35).sub(shore.residual), rp)
        .mul(shore.residual)
        .toVar();
      If(rCover.greaterThanEqual(cover), () => {
        pat.assign(rp);
        fh.assign(0.5);
        fg.assign(vec2(0));
        dens.assign(shore.residual.mul(0.5));
      });
      cover.assign(max(cover, rCover));
    });
    // No foam on the vanishing film at the waterline, whose thickness flickers as the far mesh slides.
    cover.mulAssign(smoothstep(0, dist.mul(3e-4).add(0.05), vth));
    If(cover.greaterThan(0), () => {
      // Billows bump the normal and shade their creases; thin foam is a bubble film tinted by the water under it, dense foam
      // a bright diffuse white with a little sheen on the bubble tops.
      const fN = normalize(Nrm.sub(vec3(fg.x, 0, fg.y).mul(dens.mul(0.12).add(0.03)))).toVar();
      const fl = dot(fN, seaU.uSun);
      const ao = mix(0.45, 1, smoothstep(0.15, 0.75, fh)).toVar();
      const solid = smoothstep(0.2, 0.9, dens.mul(fh.mul(0.7).add(0.55))).toVar();
      const albedo = mix(lin3(ULTRA.foamTint), vec3(0.93, 0.92, 0.88), max(solid, smoothstep(0.3, 0.9, pat).mul(0.6)));
      const lit = sunI
        .mul(clamp(fl.mul(0.8).add(0.2), 0, 1).mul(0.85).add(0.15))
        .mul(mix(ao, 1, 0.4))
        .add(ambient.mul(1.1).mul(ao))
        // Sun behind the crest shines through the thin foam on top.
        .add(sunI.mul(pow(toward, 4)).mul(0.4).mul(solid.oneMinus()));
      const foamCol = lit
        .mul(albedo)
        .mul(ULTRA.foamBright)
        .add(
          sunI
            .mul(pow(max(dot(fN, H), 0), 90))
            .mul(0.5)
            .mul(smoothstep(0.55, 0.85, fh))
            .mul(solid),
        );
      const a = cover.mul(mix(0.8, 1, solid)).toVar();
      col.assign(mix(col, foamCol, a));
      keep.mulAssign(a.oneMinus());
    });

    // --- aerial perspective into the horizon sky --------------------------------------------
    const fog = float(1)
      .sub(exp(dist.mul(-LOOK.fogDensity)))
      .toVar();
    col.assign(mix(col, skyAt(V.negate(), float(0)), fog));
    keep.mulAssign(fog.oneMinus());
    col.mulAssign(seaU.uLight);

    return vec4(col, keep.oneMinus());
  })();

  const geo = buildGrid(GRID.angular);
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1; // before the other see-through things: it writes depth
  return {
    mesh,
    update(camera, time, sun, hemi) {
      uTime.value = time;
      (uSunCol.value as THREE.Color).copy(sun.color).multiplyScalar(sun.intensity);
      if (hemi) (uHemi.value as THREE.Color).copy(hemi.color).multiplyScalar(hemi.intensity);
      source.update(time);
      uGridScale.value = Math.max(1, Math.abs(camera.position.y) / 2);
    },
  };
}
