// The sea (owner's pick, 9 November 2026: the Sunshine-style candidate B; docs/game-design/water.md): one blended,
// camera-centred plane after the opaques, coloured by the drawn shelf's depth and lit by the frozen sky's own sun and
// fill, with two scrolling samples of our wave cell and a sparkle band chosen by texture footprint (so it survives DPR,
// the water ceiling, the telescope and height). One opaque depth copy gives intersection foam and a soft waterline.
import * as THREE from 'three/webgpu';
import { SEA } from '../../constants.ts';
import { hemi, sun } from '../scene.ts';
import { seaRipples, seaU } from './state.ts';
import { TSL, type N } from './tsl.ts';
import { derived, scalar, vector } from './live.ts';
import { swellNode, swellPhases } from './swell.ts';
import type { Coast } from './coast.ts';
import { WAVE_SIZE } from './art.ts';
import { skyGradient } from './sky-art.ts';

const { Fn, If, abs, cameraPosition, cos, dFdx, dFdy, dot, exp, float, length, log2, max } = TSL;
const { mix, normalize, positionGeometry, positionView, positionWorld, pow, reflect, screenUV, sin } = TSL;
const { select, smoothstep, texture, uniform, uniformArray, varying, vec3, vec4, viewportDepthTexture } = TSL;
const { perspectiveDepthToViewZ, cameraNear, cameraFar } = TSL;

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

export type Ocean = {
  mesh: THREE.Mesh;

  /** The deep sea's colour as lit on the surface, for the underwater fog. */
  deepColor: N;
  /** Sea detail: the polar grid's spokes (96 full, 48 for the phone ladder's sea rung). */
  setDetail(angular: number): void;

  update(camera: THREE.Camera, time: number): void;
  vertices(): number;
  dispose(): void;
};

const srgb = (hex: string) => new THREE.Color(hex).toArray(); // THREE.Color parses CSS hex as sRGB into linear
/** Starting values (plan, "Art it needs" 4): an interpretation of a cyan-to-blue holiday sea, not sampled from any game. */
const SUN = {
  shallow: srgb('#6fe0d0'),
  middle: srgb('#19b5cf'),
  deep: srgb('#1667b8'),
  foam: srgb('#f4fbff'),
  middleDepth: 4, // m: shallow to middle over 0.3..this
  deepDepth: 14, // m: middle to deep over middleDepth..this
  clearDepth: 2.5, // m: the bed shows through the first metres
  clearMin: 0.2, // opacity at the waterline before it melts into the sand
  scale1: 1 / 11, // wave tiles per metre, first layer
  scale2: 1 / 17, // second layer, scrolling along one axis only
  speed1: [0.045, 0.018, 0],
  speed2: [0, -0.032, 0],
  bandNear: 0.2, // texture footprint lod (log2 texels per pixel) where the sparkle band starts
  bandPeak: 1.6,
  bandFar: 3.6, // and where it has gone calm
  sparkle: 2.4, // band brightness (× the sky colour; the sun lane multiplies on top)
  threshold: 1.25, // pattern (layer one + twice layer two, 0..3) above which a texel sparkles
  cling: 0.08, // the soft cell lines outside the band
  lane: 0.94, // cosine of the sun lane's half-width
  laneGain: 3.5,
  reflect: 0.5, // sky reflection at grazing angles
  foamDepth: 0.35, // m: the lip where water is this shallow

  edgeFoam: 0.35, // m: intersection foam thickness, from the opaque depth
  macro: 0.08, // brightness variation from the large blotch
  // Owner, 10 November: "somewhere in the range of Mario odyssey and Mario sunshine". 0 is the Sunshine-ish preset
  // (flat readable colour bands, crisp cells, a broken foam lip); 1 the Odyssey-ish one, where it costs only arithmetic:
  // a smoother depth gradient, sand clear for longer, a soft rounded lip that breathes, a gentle sun glint band, and
  // larger, softer cells. Dev-only between the two (Water, tuning visits); not a player setting.
  look: 1, // shipped: Odyssey-ish (10 November); 0 brings back the Sunshine-ish preset
};

export type OceanOptions = {
  coast: Coast;
  waveTex: THREE.Texture;
  fog: (distance: N) => N;
  far: number;
};
const OUTER = 160; // m of displaced patch at ground level (scaled with height)

function buildGrid(angular: number, far: number) {
  const q = 1 + (2 * Math.PI) / angular;
  const radii: number[] = [];
  for (let r = 0.4; r < OUTER; r *= q) radii.push(r);
  radii.push(OUTER, far * 0.97); // then one flat skirt to the far plane
  const verts = new Float32Array((1 + radii.length * angular) * 3);
  let v = 3;
  for (const r of radii)
    for (let a = 0; a < angular; a++) {
      const t = (a / angular) * Math.PI * 2;
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

export function createOcean(options: OceanOptions): Ocean {
  const { coast, waveTex } = options;

  const shallow = vector('sun.shallow', SUN, 'shallow'),
    middle = vector('sun.middle', SUN, 'middle'),
    deep = vector('sun.deep', SUN, 'deep'),
    foamColor = vector('sun.foam', SUN, 'foam');
  const middleDepth = float(scalar('sun.middleDepth', SUN, 'middleDepth')),
    deepDepth = float(scalar('sun.deepDepth', SUN, 'deepDepth')),
    clearDepth = float(scalar('sun.clearDepth', SUN, 'clearDepth'));
  scalar('sun.clearMin', SUN, 'clearMin'); // its Dev control; the shader reads it through shoreAlpha below
  const scale1 = scalar('sun.scale1', SUN, 'scale1'),
    scale2 = scalar('sun.scale2', SUN, 'scale2'),
    speed1 = vector('sun.speed1', SUN, 'speed1'),
    speed2 = vector('sun.speed2', SUN, 'speed2');
  const bandNear = float(scalar('sun.bandNear', SUN, 'bandNear')),
    bandPeak = float(scalar('sun.bandPeak', SUN, 'bandPeak')),
    bandFar = float(scalar('sun.bandFar', SUN, 'bandFar')),
    sparkle = float(scalar('sun.sparkle', SUN, 'sparkle')),
    threshold = float(scalar('sun.threshold', SUN, 'threshold')),
    cling = float(scalar('sun.cling', SUN, 'cling')),
    lane = float(scalar('sun.lane', SUN, 'lane')),
    laneGain = float(scalar('sun.laneGain', SUN, 'laneGain')),
    reflectGain = float(scalar('sun.reflect', SUN, 'reflect')),
    foamDepth = float(scalar('sun.foamDepth', SUN, 'foamDepth')),
    edgeFoam = float(scalar('sun.edgeFoam', SUN, 'edgeFoam')),
    macro = float(scalar('sun.macro', SUN, 'macro')),
    ody = float(scalar('sun.look', SUN, 'look'));
  // Blends between the two looks of plain numbers fold on the CPU: off the tuning route `ody` is a literal, and
  // Firefox's WGSL compiler (naga) rejects `mix` of literals only (src/render/reference/tsl.md).
  const byLook = (sunshine: number, odyssey: number) =>
    float(derived(() => sunshine + (odyssey - sunshine) * SUN.look));
  const cellScale = byLook(1, 0.62); // Odyssey's larger, softer shapes

  const uPhases = uniform(new THREE.Vector4());
  const uGridScale = uniform(1);
  const uSunE = uniform(new THREE.Color()); // sun colour × intensity / π: three's Lambert, as the sand is lit
  const uFill = uniform(new THREE.Color()); // hemisphere sky colour × intensity / π, for an upward normal

  const time = seaU.uTime;
  const opaqueDepth = viewportDepthTexture(undefined, null, new THREE.DepthTexture());

  // ---------------------------------------------------------------- vertex
  const local = positionGeometry.xz;
  const r = length(local);
  const vertexXZ = cameraPosition.xz.add(local.mul(select(r.greaterThan(OUTER * 1.01), float(1), uGridScale)));
  const material = new THREE.MeshBasicNodeMaterial({
    side: THREE.FrontSide, // from below there is no surface: the underwater tint covers the view
    forceSinglePass: true,
    transparent: true,
    fog: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  material.name = 'sea';
  material.positionNode = Fn(() => {
    const xz = vertexXZ.toVar();
    const bed = coast.at(xz).g;
    const s = swellNode(xz, float(SEA).sub(bed), uPhases);
    const fade = smoothstep(uGridScale.mul(OUTER * 0.65), uGridScale.mul(OUTER), length(xz.sub(cameraPosition.xz)))
      .oneMinus()
      .toVar();
    const y = s.x
      .sub(SEA)
      .add(impactWaves(xz, float(4)).x)
      .mul(fade)
      .add(SEA);
    return vec3(xz.x, y, xz.y);
  })();
  const vXZ = varying(vertexXZ, 'vSunXZ');

  // ---------------------------------------------------------------- fragment
  material.colorNode = Fn(() => {
    const world = positionWorld;
    const toCam = cameraPosition.sub(world).toVar();
    const dist = length(toCam).toVar();
    const V = toCam.div(dist).toVar();
    const xz = vXZ.toVar();
    // Everything that samples implicitly or takes a derivative comes first: what follows branches or discards.
    const fw = abs(dFdx(xz))
      .add(abs(dFdy(xz)))
      .toVar();
    const footprint = max(max(fw.x, fw.y), 1e-5).toVar();
    const w1 = texture(waveTex, xz.mul(cellScale.mul(scale1)).add(speed1.xy.mul(time))).toVar();
    const w2 = texture(waveTex, xz.mul(cellScale.mul(scale2)).add(speed2.xy.mul(time))).toVar();
    const blotch = texture(waveTex, xz.div(420)).b;
    const c = coast.at(xz).toVar();
    const depthBelow = max(world.y.sub(c.g), 0).toVar(); // to the real bed: the clear shallows, the lip, the glints
    const shadeDepth = max(world.y.sub(c.r), 0).toVar(); // to the drawn shelf: the colour ramp
    const sceneThick = perspectiveDepthToViewZ(opaqueDepth.sample(screenUV).level(0).r, cameraNear, cameraFar)
      .negate()
      .sub(positionView.z.negate())
      .toVar();

    // Slopes: the swell (analytic per pixel, calm beyond the displaced patch) and splash ripples.
    const patch = smoothstep(uGridScale.mul(OUTER * 0.65), uGridScale.mul(OUTER), dist).oneMinus();
    const swell = swellNode(xz, float(SEA).sub(c.g), uPhases);
    const ripple = impactWaves(world.xz, float(2).div(footprint));
    const slope = swell.yz.mul(patch).add(ripple.yz);
    const Nrm = normalize(vec3(slope.x.negate(), 1, slope.y.negate())).toVar();

    // The pattern: two layers of the same cell drifting through each other, the second at double weight, so overlaps
    // bloom (Sunshine's two TEV stages, in our own art). The band is where one pixel covers a few texels.
    const pattern = w1.r.add(w2.r.mul(2)).toVar();
    const lod = log2(footprint.mul(cellScale.mul(scale1)).mul(WAVE_SIZE)).toVar();
    const band = smoothstep(bandNear, bandPeak, lod)
      .mul(smoothstep(bandPeak, bandFar, lod).oneMinus())
      .toVar();

    // Body colour by bed depth, three stops, lit by the same sun and fill as the sand beside it.
    // Sunshine: two smoothstep bands. Odyssey: the same stops along exponential falloffs, so the shallows fade on
    // without a visible band edge.
    const toMiddle = mix(
        smoothstep(0.3, middleDepth, shadeDepth),
        exp(shadeDepth.negate().div(middleDepth.mul(0.6))).oneMinus(),
        ody,
      ),
      toDeep = mix(
        smoothstep(middleDepth, deepDepth, shadeDepth),
        exp(max(shadeDepth.sub(middleDepth), 0).negate().div(deepDepth.mul(0.5))).oneMinus(),
        ody,
      );
    const ramp = mix(mix(shallow, middle, toMiddle), deep, toDeep).toVar();
    ramp.mulAssign(blotch.sub(0.5).mul(macro).add(1));
    const sunY = max(dot(Nrm, seaU.uSun), 0);
    const light = uSunE.mul(sunY.mul(0.8).add(0.2)).add(uFill);
    const body = ramp.mul(light).toVar();

    // The sky: one blurry reflection with a Schlick Fresnel, and the sun lane, which colours the sparkle.
    const R = reflect(V.negate(), Nrm).toVar();
    const NoV = max(dot(Nrm, V), 0);
    const F = pow(NoV.oneMinus(), 5).mul(0.98).add(0.02).mul(reflectGain);
    const skyR = skyGradient(abs(R.y)).toVar();
    const col = mix(body, skyR, F).toVar();
    const inLane = smoothstep(lane, 1, dot(R, seaU.uSun)).toVar();
    const glint = smoothstep(threshold, threshold.add(0.5), pattern);
    // Odyssey: a soft lane of sun on the swell itself, not only on the sparkling cells, and gentler cells.
    const softLane = smoothstep(lane.sub(0.06), 1, dot(R, seaU.uSun));
    const add = skyR
      .mul(sparkle.mul(byLook(1, 0.6)))
      .add(seaU.uSpecCol.mul(inLane).mul(laneGain))
      .mul(glint)
      .mul(band)
      .add(
        skyR
          .mul(cling.mul(byLook(1, 1.6)))
          .mul(pattern)
          .mul(band.oneMinus()),
      )
      .add(seaU.uSpecCol.mul(softLane.mul(softLane)).mul(ody.mul(0.12)))
      .mul(smoothstep(0.02, 0.2, depthBelow))
      .toVar();

    // Foam: a lip where the water is very shallow and an edge where it meets anything standing in it, broken by the
    // cells.
    // Odyssey: the lip is a soft rounded band, mostly whole, whose width breathes on a slow swell-length wave.
    const broken = mix(
      smoothstep(0.6, 1.6, pattern.add(w1.g)),
      smoothstep(0.2, 1.4, pattern.add(w1.g)).mul(0.35).add(0.65),
      ody,
    );
    const breathe = sin(time.mul(0.9).add(xz.x.add(xz.y.mul(0.6)).mul(0.07)))
      .mul(0.35)
      .mul(ody)
      .add(1);
    const lipWidth = foamDepth.mul(byLook(1, 1.5)).mul(breathe);
    const lipOuter = smoothstep(byLook(0.05, 0), lipWidth, depthBelow).oneMinus();
    const lip = mix(lipOuter, lipOuter.mul(lipOuter.mul(-2).add(3)).mul(lipOuter), ody) // rounder shoulder
      .mul(smoothstep(0, 0.04, depthBelow));
    const edge = smoothstep(0, edgeFoam, sceneThick).oneMinus();
    const foam = max(lip, edge).mul(broken).toVar();
    const foamLit = foamColor.mul(light);
    col.assign(mix(col, foamLit, foam));

    // Clear shallows over the sand, solid colour beyond, melting where water meets rock.
    const shoreAlpha = float(derived(() => SUN.clearMin + (0.12 - SUN.clearMin) * SUN.look));
    const alpha = mix(shoreAlpha, 1, smoothstep(0, clearDepth.mul(byLook(1, 1.4)), depthBelow))
      .mul(smoothstep(0, 0.05, depthBelow))
      .mul(smoothstep(0, 0.12, sceneThick))
      .toVar();
    alpha.assign(max(alpha, foam.mul(0.9)));

    // Haze to the summer horizon.
    const fog = options.fog(dist);
    const haze = skyGradient(max(V.y.negate(), 0)); // as the fog: the horizon colour below the horizon
    const outCol = mix(col.mul(alpha).add(add), haze, fog);
    return vec4(outCol, mix(alpha, 1, fog));
  })();

  let angular = 96,
    far = options.far;
  let geo = buildGrid(angular, far);
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1; // drawn before other see-through things, writing depth
  const rebuild = () => {
    geo.dispose();
    mesh.geometry = geo = buildGrid(angular, far);
  };
  const phases = [0, 0, 0, 0];
  return {
    mesh,
    deepColor: mix(middle, deep, 0.6).mul(uSunE.mul(0.3).add(uFill.mul(0.6))),
    setDetail(next) {
      if (next === angular) return;
      angular = next;
      rebuild();
    },

    update(camera, t) {
      if ('far' in camera && typeof camera.far === 'number' && camera.far !== far) {
        far = camera.far;
        rebuild();
      }
      swellPhases(t, phases);
      uPhases.value.set(phases[0]!, phases[1]!, phases[2]!, phases[3]!);
      uGridScale.value = Math.min(Math.max(1, Math.abs(camera.position.y) / 6), (far * 0.9) / OUTER);
      uSunE.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI);
      uFill.value.copy(hemi.color).multiplyScalar(hemi.intensity / Math.PI);
    },
    vertices: () => geo.getAttribute('position').count,
    dispose() {
      geo.dispose();
      material.dispose();
      opaqueDepth.value.dispose();
    },
  };
}
