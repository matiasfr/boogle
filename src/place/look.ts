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
import { flat } from '../render/flat.ts';
import { dressBundleLogs } from '../render/haul-bundle.ts';
import { patchNode } from '../render/material-patch.ts';
import { readableUnlit } from '../render/readable-unlit.ts';
import { woodGrain } from '../render/wood.ts';
import type { OwnedView } from '../render/owned-view.ts';
import { paletteNode, paletteColour, watchPalette } from '../render/material-palette.ts';
import type { MaterialFamily } from '../render/material-palette-tuning.ts';

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
// oxlint-disable-next-line typescript/no-explicit-any
type N = any;

/** Owner's selective pigment choice. Paths, sand, steel and authored vertex colours keep their own treatment. */
export function selectiveColour(base: N, family: 'grass' | 'green' | 'timber' | 'accent') {
  if (family === 'accent') {
    const peak = max(max(base.r, base.g), base.b).max(0.001);
    return base.mul(base.div(peak).mul(0.45).add(0.72));
  }
  const target = base.mul(family === 'green' || family === 'grass' ? vec3(0.88, 1.18, 0.94) : vec3(1.35, 1.19, 0.84));
  return family === 'grass'
    ? paletteNode(mix(base, target, 0.35).mul(0.7), 'grass')
    : family === 'timber'
      ? paletteNode(target, 'timber')
      : target;
}

/** A tree part owns its pigment patch; flat() materials are shared and stay untouched. */
export function treeMaterial(color: string, family: 'green' | 'timber') {
  return patchNode(flat(color).clone(), 'colorNode', (previous) => selectiveColour(previous ?? materialColor, family));
}

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
  const grass: N = mix(selectiveColour(lawn, 'grass'), paletteNode(v.mul(0.85), 'sand'), paths);
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
  m.colorNode = mix(grass, paletteNode(rockCol, 'stone'), rock);
  return m;
}
/** The spire's rock, when the land's is warm too. */
export const spireRock = (color: string) => (LOOK.ground ? (color === '#8c8478' ? '#c6a274' : '#d6b688') : color);

// The frozen water sky owns light and the fog range (src/render/water/frozen-sky.ts).
// Passive compatibility handle for the trusted capture/bot tools; it no longer drives a clock.
export const DAY = { seconds: 1680, u: 0.23, hold: true, low: 0.14, high: 0.42 };

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
/** Where a chunk of a longer batch starts in it (`userData.grainBase`; 0 for any other mesh), so its pieces keep the grain
 * their place in the whole batch gave them. One shared node, so no material gains a variant by it. */
const GRAIN_BASE: N = uniform(0).onObjectUpdate(function (this: N, { object }: { object: THREE.Object3D | null }) {
  this.value = (object?.userData.grainBase as number | undefined) ?? 0;
});
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
  // Today's kit wood averaged 0.955 of its honey; the baked grain keeps that. Logs are bark, not cut timber: their
  // sides stay plain and only the cut ends ring.
  if (wood)
    m.colorNode = materialColor.mul(
      woodGrain(p.grain!.axis, 'instance', p.grain!.scale ?? [1, 1, 1], p.own ? 'plain' : 'grain', 0.955, GRAIN_BASE),
    );
  if (!steel && !p.own) m.colorNode = selectiveColour(m.colorNode ?? materialColor, wood ? 'timber' : 'accent');
  // Own-coloured pieces (the log's bark, amber band and cut ends) keep their pigments: the timber palette is a ratio
  // from the timber anchor's orange and turns bark and pale ends grey and dark (6 November playtest).
  if (steel) m.emissiveNode = skyOnSteel();
  if (p.rust) {
    // Broad material changes fit the painted kit; world-space mottling made moving metal look camouflaged.
    const wear = p.rust === 'train' ? rustTrainU : rustU;
    const base: N = m.colorNode ?? materialColor;
    const aged = steel ? vec3(0.24, 0.12, 0.055) : base.mul(vec3(0.58, 0.5, 0.42)).add(vec3(0.055, 0.035, 0.015));
    m.colorNode = mix(base, aged, wear);
    m.roughnessNode = mix(float(m.roughness), float(0.95), wear);
    m.metalnessNode = mix(float(m.metalness), float(0), wear);
    if (steel) m.emissiveNode = skyOnSteel().mul(wear.oneMinus());
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
  if (LOOK.mats) {
    const owned = mat as THREE.MeshStandardNodeMaterial;
    dressBundleLogs(owned, tint); // its own bark, band and ends: no timber palette, as paint() for the kit's log
  }
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
  const m = readableUnlit(
    new THREE.MeshBasicNodeMaterial({
      color,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
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
const SITE_PIGMENTS: Record<string, string> = {
  '#e8dcc0': '#fff8e9',
  '#a9794c': '#cd9b57',
  '#7f5630': '#a57336',
  '#c9a86a': '#e5bb70',
  '#a9824f': '#c99c59',
  '#c4453a': '#e03c32',
  '#f2b134': '#ffc425',
};
/** Buildings own this display palette; their authored construction and collision colours stay intact. */
export function paintSite(
  mesh: THREE.InstancedMesh,
  boxes: readonly { color: THREE.Color; palette?: MaterialFamily }[],
) {
  mesh.material = boardMaterial(mesh.material as THREE.Material);
  const color = new THREE.Color();
  const entries = boxes.map((box) => {
    const hex = '#' + box.color.getHexString();
    return { pigment: SITE_PIGMENTS[hex] ?? (box.palette ? hex : undefined), family: box.palette };
  });
  const update = () => {
    entries.forEach(({ pigment, family }, i) => {
      if (!pigment) return;
      color.set(pigment);
      if (family) paletteColour(color, family);
      mesh.setColorAt(i, color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  update();
  watchPalette(mesh, update);
}
/** A centred box for the greybox, baked when `contact` is on. */
export function lookBox(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  return LOOK.contact ? bakeContact(g) : g;
}

const BLOBS = 4096;
const ownedBlobs = new WeakMap<OwnedView, THREE.InstancedMesh>();
function blobMeshOf(owner: OwnedView) {
  const existing = ownedBlobs.get(owner);
  if (existing) return existing;
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
  owner.add(mesh);
  owner.cleanup(() => m.dispose());
  owner.cleanup(() => ownedBlobs.delete(owner));
  ownedBlobs.set(owner, mesh);
  return mesh;
}
const bm = new THREE.Matrix4(),
  bp = new THREE.Vector3(),
  bq = new THREE.Quaternion(),
  bs = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
/** A soft dark patch on the ground, w x d m, yaw turned. Returns its handle for `setBlob`. */
export function addBlob(x: number, y: number, z: number, w: number, d: number, yaw: number, owner: OwnedView) {
  const mesh = blobMeshOf(owner);
  if (mesh.count >= BLOBS) return -1;
  const k = mesh.count++;
  setBlob(k, x, y, z, w, d, yaw, owner);
  return k;
}
export function setBlob(k: number, x: number, y: number, z: number, w: number, d: number, yaw: number, owner: OwnedView) {
  const mesh = ownedBlobs.get(owner);
  if (!mesh || k < 0) return;
  bm.compose(bp.set(x, y + 0.03, z), bq.setFromAxisAngle(UP, yaw), bs.set(w, 1, d));
  // Compare the exact uploaded float values, not an epsilon: stationary cars must not dirty the whole blob pool.
  const data = mesh.instanceMatrix.array;
  for (let j = 0; j < 16; j++) {
    if (data[k * 16 + j] === Math.fround(bm.elements[j]!)) continue;
    mesh.setMatrixAt(k, bm);
    mesh.instanceMatrix.needsUpdate = true;
    break;
  }
}
