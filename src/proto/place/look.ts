// The look of ?proto=place, the default since its third round (owner, on the look test: "it looks pretty great"):
// docs/plans/look-pass.md. `&look=off` gives the old look for comparison, and `&look=ground,light,contact,kit,mats,gtao`
// turns on single layers (`all`, the default, leaves gtao out). This file: the flags, the land's material, the light, the
// materials and the contact shading. The Blender kit is ./look-kit.ts, the AO pass ./look-gtao.ts. Local.
import * as THREE from 'three/webgpu';
import {
  abs,
  float,
  instanceIndex,
  length,
  materialColor,
  max,
  mix,
  normalFlat,
  normalGeometry,
  normalView,
  normalViewGeometry,
  positionGeometry,
  positionWorld,
  reflectVector,
  sin,
  smoothstep as ss,
  uniform,
  uv,
  vec4,
  cameraViewMatrix,
  vec2,
  vec3,
  vertexColor,
} from 'three/tsl';
import { onFrame } from '../../loop.ts';
import { scene, sun } from '../../render/scene.ts';
import { skyColors, skyDebug, skyNow, skyU } from '../../render/sky.ts';
import { smoothstep as ss_ } from '../../math.ts';
import { flat } from '../flat.ts';

const asked = new Set((new URLSearchParams(location.search).get('look') ?? 'all').split(','));
const on = (name: string) => asked.has('all') || asked.has(name);
export const LOOK = {
  ground: on('ground'),
  light: on('light'),
  contact: on('contact'),
  kit: on('kit'),
  mats: on('mats'),
  gtao: asked.has('gtao'),
};

// TSL's types don't follow these graphs; kept loose like src/debug/look-post.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;

// ---------------------------------------------------------------- ground: smooth grass, faceted rock
const ROCK = new THREE.Color('#d0a872'),
  ROCK_DEEP = new THREE.Color('#a98558');
/** The land's material. Grass takes the mesh's smooth normals and rock keeps its facets, per pixel, so no geometry changes. */
export function groundMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 }); // vertex colours are read below: rock doesn't want them
  const p: N = positionWorld;
  // A wandering line where grass gives way to rock, so the rim isn't a contour of the 2 m grid.
  const wander: N = sin(p.x.mul(0.21).add(p.z.mul(0.17)))
    .mul(0.5)
    .add(sin(p.x.mul(0.53).sub(p.z.mul(0.41))).mul(0.3));
  // Steepness from the facet itself: a wall one 2 m cell wide has rim-averaged vertex normals that would call it grass.
  const facetUp: N = cameraViewMatrix.transpose().mul(vec4(normalFlat, 0)).y;
  const rock: N = ss(float(0.7), float(0.82), facetUp.add(wander.mul(0.04))).oneMinus();
  m.normalNode = mix(normalViewGeometry, normalFlat, rock).normalize();
  // Grass: the vertex colours (paths and beaches are in them too), breathing slowly between a cool and a warm green.
  const slow: N = sin(p.x.mul(0.031).add(1.3))
    .mul(sin(p.z.mul(0.027).sub(0.4)))
    .mul(0.55);
  const mid: N = sin(p.x.mul(0.11).add(p.z.mul(0.07))).mul(0.42);
  const fine: N = sin(p.x.mul(0.37).sub(p.z.mul(0.29))).mul(0.2);
  const breathe: N = slow.add(mid).add(fine).mul(0.5).add(0.5);
  const v: N = vertexColor().rgb;
  const paths: N = ss(float(-0.05), float(0.1), v.r.sub(v.g)); // the green shift is for green: dirt and sand stay themselves
  // Dry patches where two slow fields agree, and a little mottling up close, so no two lawns match.
  const dry: N = ss(
    float(0.25),
    float(0.75),
    sin(p.x.mul(0.052).sub(p.z.mul(0.038)).add(0.7))
      .mul(sin(p.z.mul(0.071).add(p.x.mul(0.019))))
      .mul(1.1)
      .add(0.3),
  );
  const mottle: N = sin(p.x.mul(2.3).add(sin(p.z.mul(1.7)).mul(1.4)))
    .mul(sin(p.z.mul(2.9).sub(p.x.mul(0.9))))
    .mul(0.05);
  const tint: N = mix(vec3(0.74, 0.9, 0.78), vec3(1.04, 1.04, 0.82), breathe);
  const lawn: N = mix(v.mul(tint), v.mul(vec3(1.24, 1.1, 0.72)), dry.mul(0.55)).mul(mottle.add(1));
  const grass: N = mix(lawn, v.mul(0.85), paths);
  // Rock: warm tan, darker low down, in soft strata that lean a little.
  const strata: N = sin(
    p.y
      .mul(1.6)
      .add(p.x.mul(0.09))
      .add(sin(p.z.mul(0.13)).mul(1.2)),
  )
    .mul(0.5)
    .add(0.5);
  const rockCol: N = mix(
    vec3(ROCK_DEEP.r, ROCK_DEEP.g, ROCK_DEEP.b),
    vec3(ROCK.r, ROCK.g, ROCK.b),
    ss(float(2), float(18), p.y),
  ).mul(mix(float(0.88), float(1.06), strata));
  m.colorNode = mix(grass, rockCol, rock);
  return m;
}
/** The spire's rock, when the land's is warm too. */
export const spireRock = (color: string) => (LOOK.ground ? (color === '#8c8478' ? '#c6a274' : '#d6b688') : color);

// ---------------------------------------------------------------- light: warm sun, cool open shadow
const LIGHT = {
  frac: 0.2,
  sun: new THREE.Color('#ffe6bf'),
  sunI: 3.1,
  hemiSky: new THREE.Color('#b4cffa'), // the shade's colour: sky
  hemiGround: new THREE.Color('#c4b48c'), // bounce off the grass
  hemiI: 2.3,
  top: new THREE.Color('#2a6fe0'),
  horizon: new THREE.Color('#a8d0f5'),
  curve: 0.42,
  fog: new THREE.Color('#a6c8ef'),
  fogNear: 170,
  fogFar: 1500,
};
// The owner, round 3: "the sun doesn't go away"; then "mostly daylight, with a brief night". The day moves, slowly, and most of it
// is the accepted look's daylight: the sun swings across, then a short golden hour, a brief moonlit night and a dawn.
// One cycle is DAY.seconds of play. Where the sun's up, LIGHT's palette holds; as it sinks, the game's sky takes over.
export const DAY = {
  seconds: 1680, // s for a whole day
  u: 0.23, // where in it we are: the look's morning, at the start
  hold: new URLSearchParams(location.search).get('day') === 'off', // `&day=off` holds this morning; evals can set `u` too
  low: 0.14, // the sun's height where LIGHT's palette is gone
  high: 0.42, // and where it's all there
};
/** How the sky's own clock (0 sunrise, 0.3 noon, 0.6 sunset, 0.8 midnight) runs through a day of ours. */
const DAY_KEYS: [u: number, frac: number][] = [
  [0, 0.09],
  [0.82, 0.46],
  [0.88, 0.6],
  [0.94, 0.86],
  [1, 1.09],
];
export function dayFrac(u: number) {
  for (let k = 0; k < DAY_KEYS.length - 1; k++) {
    const [u0, f0] = DAY_KEYS[k]!,
      [u1, f1] = DAY_KEYS[k + 1]!;
    if (u <= u1) return (f0 + ((f1 - f0) * (u - u0)) / (u1 - u0)) % 1;
  }
  return DAY_KEYS[0]![1];
}
export function installLight() {
  // A late morning to start: a higher sun, for short shadows and lit grass. Phase 0.5 keeps the moon opposite the sun, under
  // the horizon by day, where its pale disc can't stand out against the deeper sky, and full at night.
  skyDebug.preview(dayFrac(DAY.u), 0.5);
  const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as
    THREE.HemisphereLight | undefined;
  onFrame(
    ({ dt }) => {
      if (!DAY.hold) DAY.u = (DAY.u + dt / DAY.seconds) % 1;
      skyDebug.preview(dayFrac(DAY.u), 0.5);
      const d = ss_(DAY.low, DAY.high, skyNow.sunDir.y);
      sun.color.lerp(LIGHT.sun, d);
      sun.intensity += (LIGHT.sunI - sun.intensity) * d;
      if (hemi) {
        hemi.color.lerp(LIGHT.hemiSky, d);
        hemi.groundColor.lerp(LIGHT.hemiGround, d);
        hemi.intensity += (LIGHT.hemiI - hemi.intensity) * d;
      }
      skyColors.top.lerp(LIGHT.top, d);
      skyColors.horizon.lerp(LIGHT.horizon, d);
      skyU.uCurve.value = skyU.uCurve.value + (LIGHT.curve - skyU.uCurve.value) * d;
      const fog = scene.fog as THREE.Fog;
      fog.color.lerp(LIGHT.fog, d);
      fog.near = LIGHT.fogNear;
      fog.far = LIGHT.fogFar;
    },
    { phase: 'update', order: -2 }, // after the crossing's day (-4) and the place's fog (-3)
  );
}

// ---------------------------------------------------------------- materials
export type Paint = {
  color: string;
  /** With `mats`: the wood is honey, with its grain running along this axis. Its value: metres per unit of the geometry. */
  grain?: { axis: 'x' | 'y' | 'z'; scale?: [number, number, number]; honey?: string };
  /** With `mats`: reads as steel. */
  steel?: boolean;
  rough?: number;
  /** The geometry brings colours of its own (the log's bark, band and cut ends). */
  own?: boolean;
  /** Goes to rust and dust with `rustU` (the machine, stranded) or `rustTrainU` (the old train, stranded longer). */
  rust?: boolean | 'train';
};
/** 1 asleep, rusty and dusty; 0 awake. */
export const rustU = uniform(0);
export const rustTrainU = uniform(0);
const made = new Map<string, THREE.MeshStandardNodeMaterial>();
/** A piece's material, built from what's on: plain and flat with no layer, grain or metal with `mats`, soft with `kit`. */
export function paint(p: Paint) {
  const key = JSON.stringify(p);
  let m = made.get(key);
  if (m) return m;
  const wood = LOOK.mats && p.grain;
  const steel = LOOK.mats && p.steel;
  m = new THREE.MeshStandardNodeMaterial({
    color: wood && p.grain?.honey ? p.grain.honey : steel ? '#59616b' : p.color,
    roughness: steel ? 0.45 : (p.rough ?? 0.85),
    metalness: steel ? 0.7 : 0,
    flatShading: !LOOK.kit,
    vertexColors: LOOK.contact || p.own === true,
  });
  if (wood) m.colorNode = materialColor.mul(grainOf(p.grain!.axis, p.grain!.scale ?? [1, 1, 1]));
  if (steel) m.emissiveNode = skyOnSteel();
  if (p.rust) {
    const pw: N = positionWorld;
    const patch: N = sin(pw.x.mul(7.1).add(sin(pw.z.mul(5.3)).mul(2)))
      .mul(sin(pw.y.mul(9.7)))
      .mul(0.5)
      .add(0.5);
    const base: N = m.colorNode ?? materialColor;
    m.colorNode = mix(
      base,
      mix(vec3(0.27, 0.13, 0.06), vec3(0.42, 0.36, 0.28), patch),
      (p.rust === 'train' ? rustTrainU : rustU).mul(0.9),
    );
    m.metalness = 0;
  }
  made.set(key, m);
  return m;
}
/** A box's material for the greybox's own boxes, with no kit: unchanged unless `mats` or `contact` is on. */
export function boxPaint(color: string, w: number, h: number, d: number, roughness?: number) {
  if (!LOOK.mats && !LOOK.contact) return flat(color, roughness);
  const axis = w >= h && w >= d ? 'x' : h >= d ? 'y' : 'z';
  return paint({
    color,
    grain: { axis, honey: honeyOf(color) },
    ...(roughness === undefined ? {} : { rough: roughness }),
  });
}
/** Wood, a little lighter and warmer: the board's fresh timber, keeping each colour's dark or light place in the kit. */
export function honeyOf(color: string) {
  return color === '#6e4c2a' || color === '#7f5630' ? '#a56a2c' : color === '#8a6236' ? '#c98a3e' : '#d59a4e';
}
export const STEEL: Paint = { color: '#4c5058', steel: true, rough: 0.6 };

// The logs on your back, in the game's own piece meshes (src/render/haul-pieces.ts share one material): bark, one amber
// band and pale cut ends, as the kit's log has. The game tints each piece by its kind; this divides that tint back out.
export function lookBackLogs(mat: THREE.Material, tint: THREE.Color) {
  if (!LOOK.mats) return;
  const m = mat as THREE.MeshStandardNodeMaterial;
  m.flatShading = false;
  const p: N = positionGeometry;
  const c = (hex: string): N => {
    const k = new THREE.Color(hex);
    return vec3(k.r / tint.r, k.g / tint.g, k.b / tint.b);
  };
  const band: N = ss(float(0.11), float(0.12), p.x).mul(ss(float(0.17), float(0.16), p.x));
  const grain: N = sin(
    p.y
      .add(p.z)
      .mul(90)
      .add(sin(p.x.mul(9)).mul(1.4)),
  )
    .mul(0.08)
    .add(1);
  m.colorNode = mix(
    mix(c('#6a4526').mul(grain), c('#f2a51a'), band),
    c('#e3b877'),
    ss(float(0.7), float(0.9), abs(normalGeometry.x)),
  );
  m.needsUpdate = true;
}

// A little wood: bands across the grain's axis that wander slowly along it, and rings on the cut ends. Each piece its own.
function grainOf(axis: 'x' | 'y' | 'z', scale: [number, number, number]) {
  const p: N = positionGeometry
    .mul(vec3(scale[0], scale[1], scale[2]))
    .add(float(instanceIndex).mul(vec3(1.37, 0.73, 2.11)));
  const along: N = p[axis];
  const [a, b]: N[] = axis === 'x' ? [p.y, p.z] : axis === 'y' ? [p.x, p.z] : [p.x, p.y];
  const wave: N = sin(along.mul(1.7))
    .mul(0.9)
    .add(sin(along.mul(4.3)).mul(0.25));
  const bands: N = sin(a.add(b).mul(34).add(wave)).mul(0.5).add(0.5);
  const fine: N = sin(a.sub(b).mul(91).add(wave.mul(2)))
    .mul(0.5)
    .add(0.5);
  const side: N = float(1.03).sub(bands.mul(0.1)).sub(fine.mul(0.05));
  const rings: N = sin(length(vec2(a.fract().sub(0.5), b.fract().sub(0.5))).mul(120))
    .mul(0.5)
    .add(0.5);
  const end: N = float(1.24).sub(rings.mul(0.12));
  return mix(side, end, ss(float(0.72), float(0.92), abs(normalGeometry[axis])));
}
// Metal needs something to reflect, and the scene has no environment map. This is the cheapest honest stand-in: what a
// mirror pointing that way would see of a two-colour sky, dimmed by the steel's own response. A few ALU, no texture.
function skyOnSteel() {
  const up: N = reflectVector.y;
  return mix(vec3(0.05, 0.055, 0.04), vec3(0.42, 0.52, 0.68), ss(float(-0.15), float(0.85), up)).mul(0.28);
}

// ---------------------------------------------------------------- contact: baked into vertex colours, and blobs on the ground
/** Darkens a geometry toward its underside, in colour: where a piece meets what it stands on. */
export function bakeContact(geo: THREE.BufferGeometry, k = 0.42, fade?: number) {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  geo.computeBoundingBox();
  const y0 = geo.boundingBox!.min.y,
    span = fade ?? 0.6 * (geo.boundingBox!.max.y - y0 || 1);
  const has = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, (pos.getY(i) - y0) / span),
      dark = k * (1 - t) * (1 - t);
    const c = 1 - dark;
    col[i * 3] = (has?.getX(i) ?? 1) * c * 0.97 + (has?.getX(i) ?? 1) * 0.03 * (1 - dark * 2); // the shade leans cool
    col[i * 3 + 1] = (has?.getY(i) ?? 1) * c;
    col[i * 3 + 2] = (has?.getZ(i) ?? 1) * (c + dark * 0.12);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
/** A glow with no hard edge: fades where a surface turns away from you, and, with `fade`, along the geometry's v. */
export function softGlow(color: string, strength: number, fade: boolean | 'up' = false) {
  const m = new THREE.MeshBasicNodeMaterial({
    color,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const u = uniform(strength);
  const face: N = abs(normalView.z);
  const a: N = face.mul(face).mul(u);
  const up: N = float(1).sub(uv().y);
  m.opacityNode = fade === 'up' ? a.mul(up.mul(up)) : fade ? a.mul(uv().y.mul(uv().y)) : a;
  return { mat: m, strength: u };
}
/** What buildings are made of (./sites.ts): each piece a little lighter or darker than the next and a little shaded along
 * its underside, so a wall reads as boards and courses. The colours are the instances'. */
export function boardMaterial(plain: THREE.Material) {
  if (!LOOK.mats) return plain;
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, flatShading: true });
  const each: N = sin(float(instanceIndex).mul(12.9898)).mul(43758.5453).fract();
  const under: N = mix(float(0.74), float(1), ss(float(0), float(0.3), positionGeometry.y));
  m.colorNode = materialColor.mul(mix(float(0.88), float(1.08), each)).mul(under);
  return m;
}
/** A centred box for the greybox, baked when `contact` is on. */
export function lookBox(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  return LOOK.contact ? bakeContact(g) : g;
}

const BLOBS = 4096;
let blobMesh: THREE.InstancedMesh | null = null;
function blobMeshOf() {
  if (blobMesh) return blobMesh;
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, polygonOffset: true });
  m.polygonOffsetFactor = -2;
  m.polygonOffsetUnits = -4;
  const q: N = abs(uv().sub(0.5)).mul(2);
  const d: N = length(max(q.sub(0.45), vec2(0, 0)));
  m.colorNode = vec3(0.04, 0.06, 0.08);
  m.opacityNode = ss(float(0.02), float(0.55), d).oneMinus().mul(0.3);
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), m, BLOBS);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  scene.add(mesh);
  return (blobMesh = mesh);
}
const bm = new THREE.Matrix4(),
  bp = new THREE.Vector3(),
  bq = new THREE.Quaternion(),
  bs = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
/** A soft dark patch on the ground, w x d m, yaw turned. Returns its handle for `setBlob`. */
export function addBlob(x: number, y: number, z: number, w: number, d: number, yaw = 0) {
  const mesh = blobMeshOf();
  if (mesh.count >= BLOBS) return -1;
  const k = mesh.count++;
  setBlob(k, x, y, z, w, d, yaw);
  return k;
}
export function setBlob(k: number, x: number, y: number, z: number, w: number, d: number, yaw = 0) {
  const mesh = blobMesh;
  if (!mesh || k < 0) return;
  mesh.setMatrixAt(k, bm.compose(bp.set(x, y + 0.03, z), bq.setFromAxisAngle(UP, yaw), bs.set(w, 1, d)));
  mesh.instanceMatrix.needsUpdate = true;
}
