// The look lab's in-scene layers (?proto=look, src/debug/look-lab.ts): haze (aerial perspective), soft and cascaded
// sun shadows, procedural material detail, leaf sway, toon shading and a grass field. Material layers install a patch
// once and switch with a uniform, so toggling them never recompiles after the first time; haze, toon and shadow mode
// changes do rebuild pipelines (a one-off hitch, fine in a lab). Debug only: nothing here runs without the flag.
import * as THREE from 'three/webgpu';
import {
  Fn,
  uniform,
  reference,
  fog,
  rangeFogFactor,
  positionWorld,
  positionLocal,
  positionGeometry,
  cameraPosition,
  vertexColor,
  materialColor,
  instanceIndex,
  texture,
  transformNormalToView,
  hash,
  time,
  uv,
  vec2,
  vec3,
  vec4,
  float,
  max,
  min,
  mix,
  exp,
  pow,
  dot,
  sin,
  cos,
  fract,
  length,
  normalize,
  mx_noise_float,
  smoothstep as tslSmoothstep,
} from 'three/tsl';
import { CSMShadowNode } from 'three/addons/csm/CSMShadowNode.js';
import { scene, camera, sun } from '../render/scene.ts';
import { patchNode } from '../render/material-patch.ts';
import { SUN_DIR, GRID_RES, CELL, HALF, COURT } from '../constants.ts';
import { heights } from '../adapters/terrain.ts';
import { PATCH } from '../sim/mushrooms.ts';
import { island } from '../island/index.ts';
import { smoothstep } from '../math.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;

export const worldU = {
  haze: uniform(0.0028), // per metre at sea level
  hazeFalloff: uniform(0.07), // per metre of height
  detail: uniform(0), // 0 off, 1 on: the patch stays installed
  sway: uniform(0),
  grassHeight: uniform(0.32),
};

const recompileAll = () =>
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    for (const x of Array.isArray(m) ? m : [m]) x.needsUpdate = true;
  });

// ---------------------------------------------------------------- haze: aerial perspective
// Today's fog is linear from 110 to 520 m in the horizon colour. Haze keeps that (the island's edge still melts away,
// and caves still close it in through sky.ts) and adds exponential height fog that thins with altitude, so the far
// hills turn sky-blue a step at a time, plus forward scattering: looking towards the sun the haze takes its colour.
let hazeNode: N = null;
function makeHaze() {
  const f = scene.fog as THREE.Fog;
  const col: N = reference('color', 'color', f);
  const near: N = reference('near', 'float', f),
    far: N = reference('far', 'float', f);
  const sunDir = uniform(SUN_DIR);
  const sunCol = uniform(sun.color);
  const factor = Fn(() => {
    const d = positionWorld.sub(cameraPosition);
    const dist = length(d);
    const h = max(positionWorld.y, 0);
    const optical = dist.mul(worldU.haze).mul(exp(h.mul(worldU.hazeFalloff).negate()));
    const aerial = float(1).sub(exp(optical.negate())).mul(0.6);
    return max(rangeFogFactor(near, far), aerial);
  })();
  const color = Fn(() => {
    const dir = normalize(positionWorld.sub(cameraPosition));
    const fwd = pow(max(dot(dir, sunDir), 0), 8);
    const blue = mix(col, vec3(0.45, 0.62, 0.86), 0.18); // a bluer distance than the horizon band itself
    return mix(blue, col.mul(sunCol).mul(0.55).add(col.mul(0.6)), fwd.mul(0.7));
  })();
  return fog(color, factor);
}
export function setHaze(on: boolean) {
  if (on && !hazeNode) hazeNode = makeHaze();
  const want = on ? hazeNode : null;
  if ((scene as N).fogNode === want) return;
  (scene as N).fogNode = want;
  recompileAll();
}

// ---------------------------------------------------------------- shadows
// soft: the same single map at twice the resolution (4096 on a desktop, ~1.8 cm a texel over the 72 m box; 2048 on
// touch, where today has 1024), filtered wider.
// csm: three cascades out to 160 m, so the far palms and hills get shadows too (today they stop at 36 m).
const base = { size: sun.shadow.mapSize.x, radius: sun.shadow.radius };
let csm: N = null;
export function setShadows(soft: boolean, cascades: boolean) {
  const size = soft ? base.size * 2 : base.size;
  if (sun.shadow.mapSize.x !== size) {
    sun.shadow.mapSize.setScalar(size);
    sun.shadow.map?.setSize(size, size);
  }
  sun.shadow.radius = soft ? 3 : base.radius;
  const hasCsm = !!(sun.shadow as N).shadowNode;
  if (cascades === hasCsm) return;
  if (cascades) {
    csm = new CSMShadowNode(sun, { cascades: 3, maxFar: 160, mode: 'practical', lightMargin: 60 });
    csm.fade = true;
    (sun.shadow as N).shadowNode = csm;
  } else {
    (sun.shadow as N).shadowNode = null;
    csm?.dispose();
    csm = null;
  }
  recompileAll();
}

// ---------------------------------------------------------------- materials: which meshes the lab touches
// Static, vertex-coloured, flat-shaded decor: the terrain tiles, trees, rocks, windmills, the lighthouse. Characters
// (skinned or moving) are left alone, so world-space noise never swims over something that moves.
const isDecorMat = (m: THREE.Material): m is THREE.MeshStandardMaterial =>
  (m as THREE.MeshStandardMaterial).isMeshStandardMaterial === true &&
  m.vertexColors &&
  !!(m as THREE.MeshStandardMaterial).flatShading;
function decorMaterials() {
  const out = new Set<THREE.MeshStandardMaterial>();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as N).isSkinnedMesh || mesh.matrixAutoUpdate) return;
    const m = mesh.material as THREE.Material;
    if (!Array.isArray(m) && isDecorMat(m)) out.add(m);
  });
  for (const m of toonOrig.values()) out.add(m); // a material swapped out for toon still gets the patch
  return out;
}

// ---------------------------------------------------------------- detail: procedural material breakup
// Today every face is one flat vertex colour. Detail reads the class from that colour (green: grass, warm and
// unsaturated: sand, grey: rock) and breaks it up with world-space noise: grass gets sun-dried patches and clumps,
// sand fine grain and soft dunes, rock horizontal strata. Colour only: three taps of a small baked noise texture
// (mipmapped, so it doesn't shimmer in the distance). The first version computed the noise per pixel (mx_noise, three
// evaluations): 1 ms a frame on the Mac at iPad resolution; the texture costs a fifth of that.
let noiseTex: THREE.DataTexture | null = null;
function noiseTexture() {
  if (noiseTex) return noiseTex;
  const S = 256;
  const lattice = (period: number, seed: number) => {
    const v = new Float32Array(period * period);
    for (let k = 0; k < v.length; k++) {
      const h = Math.sin((k + 1) * 12.9898 + seed * 78.233) * 43758.5453;
      v[k] = h - Math.floor(h);
    }
    return (x: number, y: number) => {
      const fx = (x / S) * period,
        fy = (y / S) * period;
      const i = Math.floor(fx),
        j = Math.floor(fy);
      const u = smoothstep(0, 1, fx - i),
        w = smoothstep(0, 1, fy - j);
      const at = (a: number, b: number) => v[((b % period) * period + (a % period)) % v.length];
      const top = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
      const bot = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
      return top + (bot - top) * w;
    };
  };
  // R: big shapes (4 cells a tile, three octaves), G: fine grain (32 cells, two octaves); both tile seamlessly
  const r = [lattice(4, 1), lattice(8, 2), lattice(16, 3)],
    g = [lattice(32, 4), lattice(64, 5)];
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const o = (y * S + x) * 4;
      data[o] = Math.round((r[0](x, y) * 0.55 + r[1](x, y) * 0.3 + r[2](x, y) * 0.15) * 255);
      data[o + 1] = Math.round((g[0](x, y) * 0.65 + g[1](x, y) * 0.35) * 255);
      data[o + 2] = 128;
      data[o + 3] = 255;
    }
  noiseTex = new THREE.DataTexture(data, S, S);
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.magFilter = THREE.LinearFilter;
  noiseTex.minFilter = THREE.LinearMipmapLinearFilter;
  noiseTex.generateMipmaps = true;
  noiseTex.needsUpdate = true;
  return noiseTex;
}
// A patch remembers what the slot held, so switching the layer off puts it back: no noise left running at strength 0,
// which would leak its cost into every later measurement.
type Patched = Map<THREE.Material, unknown>;
function unpatch(done: Patched, slot: string) {
  for (const [m, prev] of done) {
    (m as N)[slot] = prev;
    m.needsUpdate = true;
  }
  done.clear();
}
const detailed: Patched = new Map();
function patchDetail(m: THREE.Material) {
  if (detailed.has(m)) return;
  detailed.set(m, (m as N).colorNode ?? null);
  patchNode(m, 'colorNode', (prev: N) => {
    const c: N = prev ?? materialColor;
    return Fn(() => {
      const vc = vertexColor().rgb;
      const p = positionWorld;
      const hi = max(vc.r, max(vc.g, vc.b)),
        lo = min(vc.r, min(vc.g, vc.b));
      const grass = tslSmoothstep(0.02, 0.1, vc.g.sub(max(vc.r, vc.b)));
      const sand = tslSmoothstep(0.08, 0.25, vc.r.sub(vc.b)).mul(grass.oneMinus());
      const rock = tslSmoothstep(0.12, 0.04, hi.sub(lo));
      const tex = noiseTexture();
      const big = texture(tex, p.xz.mul(0.18 / 4))
        .r.mul(2)
        .sub(1);
      const fine = texture(tex, p.xz.mul(3.1 / 32))
        .g.mul(2)
        .sub(1);
      const strata = texture(tex, vec2(p.x.add(p.z).mul(0.15 / 4), p.y.mul(2.6 / 4)))
        .r.mul(2)
        .sub(1);
      const k = grass
        .mul(big.mul(0.12).add(fine.mul(0.07)))
        .add(sand.mul(fine.mul(0.06).add(big.mul(0.05))))
        .add(rock.mul(strata.mul(0.16).add(fine.mul(0.05))))
        .mul(worldU.detail);
      let rgb: N = c.rgb.mul(k.add(1));
      const dry = grass.mul(max(big, 0)).mul(0.55).mul(worldU.detail);
      rgb = mix(rgb, rgb.mul(vec3(1.18, 1.06, 0.72)), dry);
      return vec4(rgb, c.a ?? float(1));
    })();
  });
}
export function setDetail(on: boolean) {
  if (on) for (const m of decorMaterials()) patchDetail(m);
  else unpatch(detailed, 'colorNode');
  worldU.detail.value = on ? 1 : 0;
}

// ---------------------------------------------------------------- sway: leaves in the wind
// Green vertices of static decor (palm fronds, broadleaf crowns, bushes) drift with a slow gust plus a flutter;
// trunks and rocks (not green) stay put. Vertex work only.
const swayed: Patched = new Map();
function patchSway(m: THREE.Material) {
  if (swayed.has(m)) return;
  swayed.set(m, (m as N).positionNode ?? null);
  patchNode(m, 'positionNode', (prev: N) => {
    const p: N = prev ?? positionLocal;
    return Fn(() => {
      const vc = vertexColor().rgb;
      const leaf = tslSmoothstep(0.03, 0.12, vc.g.sub(max(vc.r, vc.b)));
      const gust = mx_noise_float(vec3(p.x.mul(0.05).sub(time.mul(0.25)), p.z.mul(0.05), time.mul(0.1)));
      const flutter = sin(time.mul(3.1).add(p.x.mul(1.7)).add(p.y.mul(2.3)));
      const a = gust.mul(0.12).add(flutter.mul(0.025)).mul(leaf).mul(worldU.sway);
      return p.add(vec3(a, 0, a.mul(0.6)));
    })();
  });
}
export function setSway(on: boolean) {
  if (on) for (const m of decorMaterials()) patchSway(m);
  else unpatch(swayed, 'positionNode');
  worldU.sway.value = on ? 1 : 0;
}

// ---------------------------------------------------------------- toon: banded light
// Swaps every lit standard material for a MeshToonNodeMaterial with a three-step ramp (keeping colour, maps, vertex
// colours and any node patches), and swaps the originals back when off.
const toonOrig = new Map<THREE.Mesh, THREE.MeshStandardMaterial>();
const toonOf = new WeakMap<THREE.Material, THREE.MeshToonNodeMaterial>();
let ramp: THREE.DataTexture | null = null;
function toonFor(m: THREE.MeshStandardMaterial) {
  let t = toonOf.get(m);
  if (t) return t;
  if (!ramp) {
    const steps = [92, 160, 220, 255];
    ramp = new THREE.DataTexture(new Uint8Array(steps.flatMap((s) => [s, s, s, 255])), steps.length, 1);
    ramp.magFilter = ramp.minFilter = THREE.NearestFilter;
    ramp.needsUpdate = true;
  }
  t = new THREE.MeshToonNodeMaterial({
    color: m.color,
    map: m.map,
    vertexColors: m.vertexColors,
    emissive: m.emissive,
    emissiveIntensity: m.emissiveIntensity,
    emissiveMap: m.emissiveMap,
    transparent: m.transparent,
    opacity: m.opacity,
    side: m.side,
    alphaTest: m.alphaTest,
    depthWrite: m.depthWrite,
    gradientMap: ramp,
  });
  toonOf.set(m, t);
  return t;
}
// The original's node slots (its own looks, plus any detail or sway patch) as they are now.
function copySlots(from: THREE.Material, to: THREE.Material) {
  for (const slot of ['colorNode', 'positionNode', 'normalNode', 'maskNode', 'opacityNode', 'emissiveNode'])
    (to as N)[slot] = (from as N)[slot] ?? null;
  to.needsUpdate = true;
}
export function setToon(on: boolean) {
  if (on) {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (!mesh.isMesh || toonOrig.has(mesh) || Array.isArray(m) || !m?.isMeshStandardMaterial) return;
      toonOrig.set(mesh, m);
      const t = toonFor(m);
      copySlots(m, t);
      mesh.material = t;
    });
  } else {
    for (const [mesh, m] of toonOrig) mesh.material = m;
    toonOrig.clear();
  }
}

// ---------------------------------------------------------------- grass: a field that follows the camera
// One instanced draw of BLADES blades scattered over a SPAN x SPAN square that wraps around the camera (each blade
// keeps its world spot while you walk; the square's edge fades out). The vertex shader reads the ground height and a
// grass mask from a small texture baked once from the terrain heights (grassy ground, not too steep, off the court,
// the garden and painted paths), so the CPU does nothing per frame.
const SPAN = 48;
const BLADES = 80000;
let grass: THREE.Mesh | null = null;
const camXZ = uniform(new THREE.Vector2());
export const updateGrass = () => camXZ.value.set(camera.position.x, camera.position.z);
function groundTexture() {
  const n = GRID_RES;
  const data = new Uint16Array(n * n * 2);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const h = heights[i][j];
      const ie = Math.min(n - 1, i + 1),
        iw = Math.max(0, i - 1),
        jn = Math.max(0, j - 1),
        js = Math.min(n - 1, j + 1);
      const dx = (heights[ie][j] - heights[iw][j]) / (2 * CELL),
        dz = (heights[i][jn] - heights[i][js]) / (2 * CELL);
      const ny = 1 / Math.hypot(dx, 1, dz);
      const x = i * CELL - HALF,
        z = HALF - j * CELL;
      let m = smoothstep(1.5, 1.9, h) * smoothstep(0.8, 0.9, ny) * (1 - smoothstep(9, 14, h));
      m *= smoothstep(COURT.r + 0.5, COURT.r + 2.5, Math.hypot(x - COURT.x, z - COURT.z));
      if (i >= PATCH.i0 - 2 && i <= PATCH.i0 + PATCH.w + 1 && j >= PATCH.j0 - 2 && j <= PATCH.j0 + PATCH.h + 1) m = 0;
      const paint = island.paintAt(x, z);
      if (paint) m *= 1 - Math.min(1, paint[3] * 1.5);
      // texture row v = (z + HALF) / SIZE, column u = (x + HALF) / SIZE
      const o = ((n - 1 - j) * n + i) * 2;
      data[o] = THREE.DataUtils.toHalfFloat(h);
      data[o + 1] = THREE.DataUtils.toHalfFloat(m);
    }
  const t = new THREE.DataTexture(data, n, n, THREE.RGFormat, THREE.HalfFloatType);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
function makeGrass() {
  // A blade: three segments tapering to a tip, 7 vertices, 5 triangles; y 0..1, uv.y the height along it.
  const pos: number[] = [],
    uvs: number[] = [],
    nrm: number[] = [];
  const W = [0.07, 0.055, 0.03];
  for (let s = 0; s < 3; s++) {
    const y = s / 3;
    pos.push(-W[s], y, 0, W[s], y, 0);
    uvs.push(0, y, 1, y);
  }
  pos.push(0, 1, 0);
  uvs.push(0.5, 1);
  for (let k = 0; k < 7; k++) nrm.push(0, 1, 0); // lit like the ground under it: soft, no dark backs
  const idx = [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setIndex(idx);

  const ground = groundTexture();
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 1, side: THREE.DoubleSide });
  mat.normalNode = transformNormalToView(vec3(0, 1, 0)); // both faces lit like the ground (DoubleSide would flip the back)
  const id = float(instanceIndex);
  const r1 = hash(id),
    r2 = hash(id.add(7.31)),
    r3 = hash(id.add(13.7)),
    r4 = hash(id.add(23.1));
  // the blade's world spot: a fixed scatter, wrapped into the square around the camera
  const wx = camXZ.x.add(
    fract(r1.sub(camXZ.x.div(SPAN)))
      .sub(0.5)
      .mul(SPAN),
  );
  const wz = camXZ.y.add(
    fract(r2.sub(camXZ.y.div(SPAN)))
      .sub(0.5)
      .mul(SPAN),
  );
  const gUV = vec2(wx.add(HALF).div(2 * HALF), wz.add(HALF).div(2 * HALF));
  const g = texture(ground, gUV).level(float(0));
  const edge = length(vec2(wx, wz).sub(camXZ)).div(SPAN * 0.5);
  const fade = tslSmoothstep(float(1), float(0.75), edge);
  const tall = g.g.mul(fade).mul(r3.mul(0.6).add(0.7)).mul(worldU.grassHeight);
  const yaw = r4.mul(6.283);
  mat.positionNode = Fn(() => {
    const q = positionGeometry;
    const lx = q.x.mul(cos(yaw)),
      lz = q.x.mul(sin(yaw));
    const bend = q.y.mul(q.y);
    const gust = mx_noise_float(vec3(wx.mul(0.08).sub(time.mul(0.5)), wz.mul(0.08), time.mul(0.15)));
    const flutter = sin(time.mul(4).add(r1.mul(40))).mul(0.15);
    const lean = gust.mul(0.6).add(0.25).add(flutter).mul(bend).mul(tall);
    return vec3(wx.add(lx).add(lean), g.r.add(q.y.mul(tall)), wz.add(lz).add(lean.mul(0.5)));
  })();
  const root = vec3(0.16, 0.36, 0.1),
    tip = vec3(0.42, 0.72, 0.2),
    dry = vec3(0.62, 0.66, 0.26);
  const patchy = tslSmoothstep(0.1, 0.6, mx_noise_float(vec3(wx.mul(0.15), 0, wz.mul(0.15))));
  mat.colorNode = vec4(mix(root, mix(tip, dry, patchy.mul(0.35)), uv().y), 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.count = BLADES;
  mesh.frustumCulled = false; // positions come from the shader; the square is always around the camera
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}
export function setGrass(on: boolean) {
  if (on && !grass) grass = makeGrass();
  if (!grass) return;
  if (on && !grass.parent) scene.add(grass);
  if (!on && grass.parent) scene.remove(grass);
}
