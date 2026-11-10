// Toon-shading candidates for the owner's look comparison (docs/research/toon-shading.md). Local, client-only, behind
// ?toon=a|b|c (src/features/toon-look.ts); nothing here loads or runs without the flag, and no default changes.
//   a  stepped direct diffuse and flattened sky fill on characters only (Buddy, remote Buddies, the little guys)
//   b  a on characters and the environment, plus a soft sun-side rim on characters
//   c  b plus an inverted-hull ink line on characters (one extra opaque draw per character mesh, no pass)
// Every Standard-lit material gets the same wrapped lighting model; a per-object uniform says whether the object is a
// character (userData.toonCharacter, set by the Buddy rig and the folk), so shared materials need no clones.
// Water, sky, unlit ink and particles are other material types and keep their own shading.
import {
  BackSide,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  SkinnedMesh,
  Vector3,
  type Material,
  type Object3D,
  type PhysicalLightingModel,
} from 'three/webgpu';
import { scene, sun } from '../render/scene.ts';
import { surfaceExposure } from '../render/exposure.ts';
import { TSL, type N } from '../render/water/tsl.ts';

const {
  uniform,
  vec3,
  float,
  mix,
  smoothstep,
  normalView,
  normalWorld,
  positionViewDirection,
  positionLocal,
  normalLocal,
  materialColor,
  vertexColor,
  dot,
  clamp,
  max,
} = TSL;

export type ToonMode = 'a' | 'b' | 'c';
export const isToonMode = (value: string | null): value is ToonMode => value === 'a' || value === 'b' || value === 'c';

/** Tunables, read once at install from the query (toonEdge=, toonSoft=, ...), for bracketing on a board. */
type Knobs = {
  edge: number;
  soft: number;
  lit: number;
  keep: number;
  flat: number;
  shade: number;
  rim: number;
  ink: number;
  width: number;
};
function knobs(mode: ToonMode, q: URLSearchParams): Knobs {
  const n = (key: string, fallback: number) => {
    const raw = q.get(key);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    edge: n('toonEdge', 0.22), // N·L where the lit step starts
    soft: n('toonSoft', 0.07), // half-width of the step's smooth edge (0 would alias and crawl)
    lit: n('toonLit', 0.8), // the lit plateau, as N·L: flat ground at this sun is ~0.6–0.8, so near today's level
    keep: n('toonKeep', 0.3), // share of the cosine kept on the lit side, so round heads stay round (not a flat dome)
    flat: n('toonFlat', 0.55), // how much of the sky fill's up/down gradient is removed (0 = today's hemisphere)
    shade: n('toonShade', 0.72), // sky fill kept on faces turned from the sun, cool-tinted (Hi-Fi Rush's coloured shade)
    rim: mode === 'a' ? 0 : n('toonRim', 0.35),
    ink: mode === 'c' ? 1 : 0,
    width: n('toonWidth', 0.025), // metres up close, widening with distance so it holds about its size on screen
  };
}

let installed: ToonMode | null = null;

export function installToon(mode: ToonMode, query = new URLSearchParams(location.search)) {
  if (installed) return;
  installed = mode;
  const k = knobs(mode, query);
  // 1 on a character's draw, 0 elsewhere: object-level, so the folk's and Buddy's shared materials need no clones.
  const character = uniform(0).onObjectUpdate(({ object }: { object: Object3D }) =>
    object.userData.toonCharacter === true ? 1 : 0,
  );
  // Whether this draw gets the ramp: characters only in A, everything Standard-lit in B and C.
  const toon: N = mode === 'a' ? character : float(1);
  const rimOn: N = character.mul(k.rim);
  // The hemisphere fill, mirrored from the scene's one HemisphereLight each render (frozen-sky.ts owns its values).
  const hemiSky = uniform(new Vector3()),
    hemiGround = uniform(new Vector3()),
    hemiDir = uniform(new Vector3(0, 1, 0));
  // The sun's world direction, for the shade step on the fill (frozen-sky.ts aims the one key light).
  const sunDir = uniform(new Vector3(0, 1, 0)).onRenderUpdate(() =>
    sunDir.value.subVectors(sun.position, sun.target.position).normalize(),
  );
  const shadeTint = vec3(0.92, 0.96, 1.12).mul(k.shade);
  let hemi: HemisphereLight | undefined;
  hemiSky.onRenderUpdate(() => {
    hemi ??= scene.children.find((o) => (o as HemisphereLight).isHemisphereLight) as HemisphereLight | undefined;
    if (!hemi) return hemiSky.value;
    hemiGround.value.set(hemi.groundColor.r, hemi.groundColor.g, hemi.groundColor.b).multiplyScalar(hemi.intensity);
    hemiDir.value.copy(hemi.position).normalize();
    return hemiSky.value.set(hemi.color.r, hemi.color.g, hemi.color.b).multiplyScalar(hemi.intensity);
  });

  const wrap = (model: PhysicalLightingModel) => {
    const direct = model.direct;
    model.direct = (input, builder) => {
      // three's unchanged BRDF and specular, with this light's diffuse collected apart (archive/buddy-light-ramp).
      const diffuse = vec3(0).toVar();
      direct.call(model, { ...input, reflectedLight: { ...input.reflectedLight, directDiffuse: diffuse } }, builder);
      const raw: N = dot(normalView, input.lightDirection as N);
      const n: N = raw.clamp();
      const step: N = smoothstep(k.edge - k.soft, k.edge + k.soft, n).mul(mix(float(k.lit), n, k.keep));
      // Sun-side rim: the grazing silhouette where the light still reaches, never the shaded back.
      const fresnel: N = float(1).sub(dot(normalView, positionViewDirection).clamp());
      const rim: N = smoothstep(0.55, 0.85, fresnel)
        .mul(smoothstep(-0.05, 0.25, raw))
        .mul(rimOn);
      const response: N = mix(n, step, toon).add(rim);
      // diffuse = n · light · BRDF, so dividing by n recovers light · BRDF (shadow attenuation stays in it).
      (input.reflectedLight.directDiffuse as N).addAssign(diffuse.mul(response.div(max(n, 1e-4))));
    };
    const indirectDiffuse = model.indirectDiffuse;
    model.indirectDiffuse = (builder) => {
      // Keep the toon step the only strong shape cue: move the hemisphere's normal-weighted fill toward the value it
      // has three-quarters up, which leaves sun-lit ground close to today and lifts the dark undersides.
      const ctx = builder.context as { irradiance: N };
      const w: N = dot(normalWorld, hemiDir).mul(0.5).add(0.5);
      const target: N = mix(w, float(0.75), toon.mul(k.flat));
      const delta: N = mix(hemiGround, hemiSky, target).sub(mix(hemiGround, hemiSky, w));
      ctx.irradiance.addAssign(delta);
      // The shade side keeps less of the fill, cool-tinted, so the step reads against a 3.2× sky fill.
      const lit: N = smoothstep(k.edge - k.soft, k.edge + k.soft, dot(normalWorld, sunDir));
      ctx.irradiance.mulAssign(mix(vec3(1), mix(shadeTint, vec3(1), lit), toon));
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
  // Anything already compiled before this chunk arrived rebuilds with the wrapped model.
  scene.traverse((o) => {
    const m = (o as Mesh).material as Material | Material[] | undefined;
    for (const mat of Array.isArray(m) ? m : m ? [m] : [])
      if (mat instanceof MeshStandardNodeMaterial) mat.needsUpdate = true;
  });
  if (k.ink) startInk(k);
}

// ---------------------------------------------------------------- C: inverted-hull ink on characters
const inks = new WeakMap<Material, MeshBasicNodeMaterial>();
const seen = new Vector3();
// How far the hull's object is from the camera, per draw (CPU), for a line that keeps its width on screen.
const inkGrow = uniform(1).onObjectUpdate(({ object, camera }: { object: Object3D; camera: Object3D }) =>
  Math.min(4, Math.max(1, object.getWorldPosition(seen).distanceTo(camera.position) / 4)),
);
function inkFor(source: Material, k: Knobs, instanced: boolean) {
  let ink = inks.get(source);
  if (ink) return ink;
  const std = source as MeshStandardNodeMaterial;
  ink = new MeshBasicNodeMaterial({ side: BackSide });
  ink.name = 'toon-ink';
  // A darker shade of the body's own colour (A Short Hike's soft line, not black), at display range like ink.
  const albedo: N = std.vertexColors ? materialColor.mul(vertexColor()) : materialColor;
  ink.colorNode = TSL.vec4(albedo.rgb.mul(vec3(0.12, 0.1, 0.1)).div(surfaceExposure), 1);
  ink.color.copy(std.color ?? ink.color);
  // Push along the (skinned) normal; widen with distance so the line holds about its size on screen. An instanced
  // hull's positionLocal is already in the world (the folk's InstancedMeshes sit at the origin), so it measures itself.
  const grow: N = instanced ? clamp(positionLocal.sub(TSL.cameraPosition).length().div(4), 1, 4) : inkGrow;
  ink.positionNode = positionLocal.add(normalLocal.normalize().mul(float(k.width).mul(grow)));
  ink.vertexColors = std.vertexColors;
  inks.set(source, ink);
  return ink;
}
function addInk(mesh: Mesh, k: Knobs) {
  const material = mesh.material;
  if (Array.isArray(material) || !(material instanceof MeshStandardNodeMaterial)) return;
  const ink = inkFor(material, k, (mesh as InstancedMesh).isInstancedMesh === true);
  let hull: Mesh;
  if ((mesh as SkinnedMesh).isSkinnedMesh) {
    const skinned = mesh as SkinnedMesh;
    const s = new SkinnedMesh(skinned.geometry, ink);
    s.bind(skinned.skeleton, skinned.bindMatrix);
    s.bindMode = skinned.bindMode;
    // The rig sets one whole-pose sphere on its skins (rig.ts boundsOf); a hull's own bind-pose sphere culls it away.
    s.boundingSphere = skinned.boundingSphere;
    s.frustumCulled = skinned.frustumCulled;
    hull = s;
  } else if ((mesh as InstancedMesh).isInstancedMesh) {
    const source = mesh as InstancedMesh;
    const i = new InstancedMesh(source.geometry, ink, source.count);
    i.instanceMatrix = source.instanceMatrix;
    i.frustumCulled = source.frustumCulled;
    i.onBeforeRender = () => {
      i.count = source.count;
    };
    hull = i;
  } else hull = new Mesh(mesh.geometry, ink);
  hull.name = 'toon-ink';
  hull.castShadow = hull.receiveShadow = false;
  hull.userData.toonInk = true;
  hull.matrixAutoUpdate = false; // identity under its source
  mesh.userData.toonInked = true;
  mesh.add(hull);
}
function startInk(k: Knobs) {
  const scan = () =>
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || mesh.userData.toonInk || mesh.userData.toonInked || mesh.userData.toonCharacter !== true)
        return;
      if (!mesh.visible && !(mesh.parent?.visible ?? false)) return;
      addInk(mesh, k);
    });
  scan();
  // Avatars and residents arrive after load; a slow scan picks them up (Local, no frame hook).
  setInterval(scan, 1000);
}
export const toonInstalled = () => installed;
