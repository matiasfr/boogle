// The Sunshine sea (docs/plans/water-sunshine.md, candidates A and B): one blended, camera-centred plane after the
// opaques, coloured by bed depth and lit by the frozen sky's own sun and fill, with two scrolling samples of our wave
// cell and a sparkle band chosen by texture footprint (so it survives DPR, the water ceiling, the telescope and height).
// A reads nothing from the screen. B (`depth`) adds one opaque depth copy for intersection foam and a soft waterline.
import * as THREE from 'three/webgpu';
import { SEA } from '../../../constants.ts';
import { scene, sun } from '../../scene.ts';
import { seaU } from '../state.ts';
import { impactWaves, waterLighting, type Ocean, type WaterSky } from '../surface.ts';
import { TSL, type N } from '../tsl.ts';
import { scalar, vector } from '../live.ts';
import { swellNode, swellPhases } from './swell.ts';
import type { Coast } from './coast.ts';
import { WAVE_SIZE } from './art.ts';

const { Fn, If, abs, cameraPosition, dFdx, dFdy, dot, float, frontFacing, length, log2, max } = TSL;
const { mix, normalize, positionGeometry, positionView, positionWorld, pow, reflect, refract, screenUV } = TSL;
const { select, smoothstep, texture, uniform, varying, vec3, vec4, viewportDepthTexture } = TSL;
const { perspectiveDepthToViewZ, cameraNear, cameraFar } = TSL;

const srgb = (hex: string) => new THREE.Color(hex).toArray(); // THREE.Color parses CSS hex as sRGB into linear
/** Starting values (plan, "Art it needs" 4): an interpretation of a cyan-to-blue holiday sea, not sampled from any game. */
export const SUN = {
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
  ring: 0.8, // m: foam ring around baked contacts
  edgeFoam: 0.35, // m (depth candidate): intersection foam thickness
  macro: 0.08, // brightness variation from the large blotch
};

export type SunOceanOptions = {
  sky: WaterSky;
  coast: Coast;
  waveTex: THREE.Texture;
  fog: (distance: N) => N;
  far: number;
  /** Candidate B: read the opaque depth once for intersection foam and a soft waterline. */
  depth: boolean;
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

export function createSunOcean(options: SunOceanOptions): Ocean & { vertices(): number } {
  const { sky, coast, waveTex } = options;
  const { deepWater } = waterLighting(sky);
  const shallow = vector('sun.shallow', SUN, 'shallow'),
    middle = vector('sun.middle', SUN, 'middle'),
    deep = vector('sun.deep', SUN, 'deep'),
    foamColor = vector('sun.foam', SUN, 'foam');
  const middleDepth = float(scalar('sun.middleDepth', SUN, 'middleDepth')),
    deepDepth = float(scalar('sun.deepDepth', SUN, 'deepDepth')),
    clearDepth = float(scalar('sun.clearDepth', SUN, 'clearDepth')),
    clearMin = float(scalar('sun.clearMin', SUN, 'clearMin'));
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
    ring = float(scalar('sun.ring', SUN, 'ring')),
    edgeFoam = float(scalar('sun.edgeFoam', SUN, 'edgeFoam')),
    macro = float(scalar('sun.macro', SUN, 'macro'));

  const uPhases = uniform(new THREE.Vector4());
  const uGridScale = uniform(1);
  const uSunE = uniform(new THREE.Color()); // sun colour × intensity / π: three's Lambert, as the sand is lit
  const uFill = uniform(new THREE.Color()); // hemisphere sky colour × intensity / π, for an upward normal
  let cameraDepth: N = cameraPosition.y.negate();
  const time = seaU.uTime;
  const opaqueDepth = options.depth ? viewportDepthTexture(undefined, null, new THREE.DepthTexture()) : null;

  // ---------------------------------------------------------------- vertex
  const local = positionGeometry.xz;
  const r = length(local);
  const vertexXZ = cameraPosition.xz.add(local.mul(select(r.greaterThan(OUTER * 1.01), float(1), uGridScale)));
  const material = new THREE.MeshBasicNodeMaterial({
    side: THREE.DoubleSide,
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
  material.name = options.depth ? 'sun-depth sea' : 'sun sea';
  material.positionNode = Fn(() => {
    const xz = vertexXZ.toVar();
    const bed = coast.at(xz).r;
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
    const w1 = texture(waveTex, xz.mul(scale1).add(speed1.xy.mul(time))).toVar();
    const w2 = texture(waveTex, xz.mul(scale2).add(speed2.xy.mul(time))).toVar();
    const blotch = texture(waveTex, xz.div(420)).b;
    const c = coast.at(xz).toVar();
    const depthBelow = max(world.y.sub(c.r), 0).toVar();
    const sceneThick = opaqueDepth
      ? perspectiveDepthToViewZ(opaqueDepth.sample(screenUV).level(0).r, cameraNear, cameraFar)
          .negate()
          .sub(positionView.z.negate())
          .toVar()
      : float(1e4);

    // Slopes: the swell (analytic per pixel, calm beyond the displaced patch) and splash ripples.
    const patch = smoothstep(uGridScale.mul(OUTER * 0.65), uGridScale.mul(OUTER), dist).oneMinus();
    const swell = swellNode(xz, float(SEA).sub(c.r), uPhases);
    const ripple = impactWaves(world.xz, float(2).div(footprint));
    const slope = swell.yz.mul(patch).add(ripple.yz);
    const Nrm = normalize(vec3(slope.x.negate(), 1, slope.y.negate())).toVar();

    // The pattern: two layers of the same cell drifting through each other, the second at double weight, so overlaps
    // bloom (Sunshine's two TEV stages, in our own art). The band is where one pixel covers a few texels.
    const pattern = w1.r.add(w2.r.mul(2)).toVar();
    const lod = log2(footprint.mul(scale1).mul(WAVE_SIZE)).toVar();
    const band = smoothstep(bandNear, bandPeak, lod)
      .mul(smoothstep(bandPeak, bandFar, lod).oneMinus())
      .toVar();

    const result = vec4(0).toVar();
    TSL.Discard(select(frontFacing, cameraDepth.greaterThan(0.5), cameraDepth.lessThan(-0.5)));
    If(frontFacing.not(), () => {
      // From below: the water's own colour, with the sky in Snell's window (no screen copy, so only the sky shows there).
      const Nu = Nrm.negate();
      const cosI = dot(V, Nu);
      const col = deepWater(reflect(V.negate(), Nu)).toVar();
      const win = smoothstep(0.62, 0.7, cosI);
      const td = refract(V.negate(), Nu, 1.33);
      col.assign(mix(col, sky.skyLod(td, float(3)), win.mul(0.85)));
      result.assign(vec4(col, 1));
    }).Else(() => {
      // Body colour by bed depth, three stops, lit by the same sun and fill as the sand beside it.
      const ramp = mix(
        mix(shallow, middle, smoothstep(0.3, middleDepth, depthBelow)),
        deep,
        smoothstep(middleDepth, deepDepth, depthBelow),
      ).toVar();
      ramp.mulAssign(blotch.sub(0.5).mul(macro).add(1));
      const sunY = max(dot(Nrm, seaU.uSun), 0);
      const light = uSunE.mul(sunY.mul(0.8).add(0.2)).add(uFill);
      const body = ramp.mul(light).toVar();

      // The sky: one blurry reflection with a Schlick Fresnel, and the sun lane, which colours the sparkle.
      const R = reflect(V.negate(), Nrm).toVar();
      const NoV = max(dot(Nrm, V), 0);
      const F = pow(NoV.oneMinus(), 5).mul(0.98).add(0.02).mul(reflectGain);
      const skyR = sky.skyLod(vec3(R.x, abs(R.y), R.z), float(5)).toVar();
      const col = mix(body, skyR, F).toVar();
      const inLane = smoothstep(lane, 1, dot(R, seaU.uSun)).toVar();
      const glint = smoothstep(threshold, threshold.add(0.5), pattern);
      const add = skyR
        .mul(sparkle)
        .add(sky.sunColor.mul(inLane).mul(laneGain))
        .mul(glint)
        .mul(band)
        .add(skyR.mul(cling).mul(pattern).mul(band.oneMinus()))
        .mul(smoothstep(0.02, 0.2, depthBelow))
        .toVar();

      // Foam: a lip where the water is very shallow and rings around baked contacts, broken by the cells.
      const broken = smoothstep(0.6, 1.6, pattern.add(w1.g));
      const lip = smoothstep(0.05, foamDepth, depthBelow)
        .oneMinus()
        .mul(smoothstep(0, 0.04, depthBelow));
      const rings = smoothstep(0, ring, c.g).oneMinus();
      const foam = max(lip, rings).mul(broken).toVar();
      if (opaqueDepth) {
        foam.assign(max(foam, smoothstep(0, edgeFoam, sceneThick).oneMinus().mul(broken)));
      }
      const foamLit = foamColor.mul(light);
      col.assign(mix(col, foamLit, foam));

      // Clear shallows over the sand, solid colour beyond; the depth candidate also melts where water meets rock.
      const alpha = mix(clearMin, 1, smoothstep(0, clearDepth, depthBelow))
        .mul(smoothstep(0, 0.05, depthBelow))
        .toVar();
      if (opaqueDepth) alpha.mulAssign(smoothstep(0, 0.12, sceneThick));
      alpha.assign(max(alpha, foam.mul(0.9)));

      // Haze to the summer horizon.
      const fog = options.fog(dist);
      const haze = sky.skyLod(V.negate(), float(3));
      const outCol = mix(col.mul(alpha).add(add), haze, fog);
      result.assign(vec4(outCol, mix(alpha, 1, fog)));
    });
    return result;
  })();

  let angular = 96,
    far = options.far;
  let geo = buildGrid(angular, far);
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1; // as the Ultra sea: drawn before other see-through things, writing depth
  const hemi = () =>
    scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight;
  const rebuild = () => {
    geo.dispose();
    mesh.geometry = geo = buildGrid(angular, far);
  };
  const phases = [0, 0, 0, 0];
  return {
    mesh,
    heightAt: (xz: N) => swellNode(xz, float(SEA).sub(coast.at(xz).r), uPhases).x,
    setCameraDepth(depth) {
      cameraDepth = depth;
      material.needsUpdate = true;
    },
    setDetail(next) {
      const value = Math.max(48, Math.round(next / 4));
      if (value === angular) return;
      angular = value;
      rebuild();
    },
    setFarSea() {},
    update(camera, t) {
      if ('far' in camera && typeof camera.far === 'number' && camera.far !== far) {
        far = camera.far;
        rebuild();
      }
      swellPhases(t, phases);
      uPhases.value.set(phases[0]!, phases[1]!, phases[2]!, phases[3]!);
      uGridScale.value = Math.min(Math.max(1, Math.abs(camera.position.y) / 6), (far * 0.9) / OUTER);
      uSunE.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI);
      const h = hemi();
      if (h) uFill.value.copy(h.color).multiplyScalar(h.intensity / Math.PI);
    },
    vertices: () => geo.getAttribute('position').count,
    dispose() {
      geo.dispose();
      material.dispose();
      opaqueDepth?.value.dispose();
    },
  };
}
