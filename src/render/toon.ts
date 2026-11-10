// The game's toon lighting (owner, 10 November: style B, without its rim; docs/research/toon-shading.md). Every
// Standard-lit material, characters and the world alike, gets a soft step on the sun's diffuse, a flattened sky fill
// and a cool shade side. One wrapped lighting model patched onto MeshStandardNodeMaterial before anything compiles:
// no clones, no draws, no pass. Water, sky, unlit ink, particles and Physical/Lambert materials keep their own shading.
// Knobs: toon-tuning.ts (live with Dev or tune=1). `?toon=off` keeps three's plain lighting, for before/after looks.
import {
  MeshStandardNodeMaterial,
  Vector3,
  type DirectionalLight,
  type HemisphereLight,
  type Object3D,
  type PhysicalLightingModel,
  type Scene,
} from 'three/webgpu';
import { TSL, type N } from './water/tsl.ts';
import { scalar, tuningEnabled } from './water/live.ts';
import { TOON_PARAMETERS, type ToonKey } from './toon-tuning.ts';

const { uniform, vec3, float, mix, smoothstep, normalView, normalWorld, positionViewDirection, dot, max } = TSL;

const settings = Object.fromEntries(Object.entries(TOON_PARAMETERS).map(([k, s]) => [k, s.default])) as Record<
  ToonKey,
  number
>;
const knob = (key: ToonKey): N => float(scalar(`toon.${key}`, settings, key));

type Lights = { hemi?: HemisphereLight; sun?: DirectionalLight };
const lightsByScene = new WeakMap<Scene, Lights>();
function lightsOf(scene: Scene): Lights {
  let lights = lightsByScene.get(scene);
  if (!lights) {
    lights = {
      hemi: scene.children.find((o) => (o as HemisphereLight).isHemisphereLight) as HemisphereLight | undefined,
      sun: scene.children.find((o) => (o as DirectionalLight).isDirectionalLight) as DirectionalLight | undefined,
    };
    lightsByScene.set(scene, lights);
  }
  return lights;
}

let installed = false;
export const toonInstalled = () => installed;

/** Patch the lighting model once, at renderer setup, before the first material compiles (scene.ts). */
export function installToon() {
  if (installed || new URLSearchParams(location.search).get('toon') === 'off') return;
  installed = true;
  const edge = knob('edge'),
    soft = knob('soft'),
    lit = knob('lit'),
    keep = knob('keep'),
    flat = knob('flat'),
    shade = knob('shade');
  const lo: N = edge.sub(soft),
    hi: N = edge.add(soft);
  // The rim is built only when it can show: tuned live, or its default turned up (one line in toon-tuning.ts).
  const rimGain = settings.rim > 0 || tuningEnabled ? knob('rim') : null;
  // 1 on a character's draw (userData.toonCharacter: the Buddy rig and the folk), 0 elsewhere; read only for the rim.
  const character = rimGain
    ? uniform(0).onObjectUpdate(({ object }: { object: Object3D }) => (object.userData.toonCharacter === true ? 1 : 0))
    : null;
  // The rendered scene's hemisphere fill and key light, mirrored once per render (frozen-sky.ts owns their values;
  // the item icons render their own scene and lights through the same materials).
  const hemiSky = uniform(new Vector3()),
    hemiGround = uniform(new Vector3()),
    hemiDir = uniform(new Vector3(0, 1, 0)),
    sunDir = uniform(new Vector3(0, 1, 0));
  hemiSky.onRenderUpdate(({ scene }: { scene: Scene | null }) => {
    const { hemi, sun } = scene ? lightsOf(scene) : {};
    if (sun) sunDir.value.subVectors(sun.position, sun.target.position).normalize();
    if (!hemi) return hemiSky.value.set(0, 0, 0);
    hemiGround.value.set(hemi.groundColor.r, hemi.groundColor.g, hemi.groundColor.b).multiplyScalar(hemi.intensity);
    hemiDir.value.copy(hemi.position).normalize();
    return hemiSky.value.set(hemi.color.r, hemi.color.g, hemi.color.b).multiplyScalar(hemi.intensity);
  });
  const shadeTint: N = vec3(0.92, 0.96, 1.12).mul(shade);

  const wrap = (model: PhysicalLightingModel) => {
    const direct = model.direct;
    model.direct = (input, builder) => {
      // three's unchanged BRDF and specular, with this light's diffuse collected apart (archive/buddy-light-ramp).
      const diffuse = vec3(0).toVar();
      direct.call(model, { ...input, reflectedLight: { ...input.reflectedLight, directDiffuse: diffuse } }, builder);
      const raw: N = dot(normalView, input.lightDirection as N);
      const n: N = raw.clamp();
      let response: N = smoothstep(lo, hi, n).mul(mix(lit, n, keep));
      if (rimGain && character) {
        // Sun-side rim: the grazing silhouette where the light still reaches, never the shaded back.
        const fresnel: N = float(1).sub(dot(normalView, positionViewDirection).clamp());
        response = response.add(
          smoothstep(0.55, 0.85, fresnel)
            .mul(smoothstep(-0.05, 0.25, raw))
            .mul(character.mul(rimGain)),
        );
      }
      // diffuse = n · light · BRDF, so dividing by n recovers light · BRDF (shadow attenuation stays in it).
      (input.reflectedLight.directDiffuse as N).addAssign(diffuse.mul(response.div(max(n, 1e-4))));
    };
    const indirectDiffuse = model.indirectDiffuse;
    model.indirectDiffuse = (builder) => {
      // Keep the step the only strong shape cue: move the hemisphere's normal-weighted fill toward the value it has
      // three-quarters up, which leaves sun-lit ground close to before and lifts the dark undersides.
      const ctx = builder.context as { irradiance: N };
      const w: N = dot(normalWorld, hemiDir).mul(0.5).add(0.5);
      const target: N = mix(w, float(0.75), flat);
      ctx.irradiance.addAssign(mix(hemiGround, hemiSky, target).sub(mix(hemiGround, hemiSky, w)));
      // The shade side keeps less of the fill, cool-tinted, so the step reads against a 3.2× sky fill.
      const sunSide: N = smoothstep(lo, hi, dot(normalWorld, sunDir));
      ctx.irradiance.mulAssign(mix(shadeTint, vec3(1), sunSide));
      indirectDiffuse.call(model, builder);
    };
    return model;
  };
  const proto = MeshStandardNodeMaterial.prototype as unknown as {
    setupLightingModel: (builder: unknown) => PhysicalLightingModel;
  };
  const base = proto.setupLightingModel;
  proto.setupLightingModel = function (this: MeshStandardNodeMaterial, builder: unknown) {
    return wrap(base.call(this, builder));
  };
}
