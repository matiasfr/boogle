// The caves under the north-west massif: tunnels and chambers (network.js) with four mouths, an abandoned mine, an
// underground pond and a wine cellar (decor.js).
//
// The heightfield can't have holes or overhangs, so the caves are their own world below it:
// - one seamless mesh (mesh.js), built a little each frame after start, used for the look and as a trimesh collider;
// - the ground is cut open at the four mouths (setTerrainHoles) once the cave mesh is there;
// - players and the ball switch between the ground's colliders and the cave's (collision groups) when they cross
//   into the cave volume; a safety net puts anything that ends up inside solid rock back where it was;
// - the camera stays inside the tunnels, the fog closes in and the sky light dims a little (sky.js `atmosphere`);
//   the darkness with depth is baked per vertex (aAmb, see ambAt/withCaveAmbient), on the rock and the props alike.
// All of it is local and cosmetic apart from collisions, which only affect bodies this client simulates.
import * as THREE from 'three/webgpu';
import {
  Fn,
  abs,
  attribute,
  cross,
  dFdx,
  dFdy,
  fract,
  floor,
  mix,
  mod,
  positionGeometry,
  select,
  step,
  vec2,
  vec3,
  vec4,
  normalize,
  clamp,
  float,
  If,
  rand,
} from 'three/tsl';
import { patchNode } from '../../render/material-patch.ts';
import { scene, camera } from '../../render/scene.ts';
import { precompile } from '../../render/precompile.ts';
import { groundMat, GROUP, groundProbe, teleport } from '../../physics/physics.ts';
import { type Body, createBody, addBody, onPreStep, getMask, setMask } from '../../physics/engine.ts';
import { groundHeight, setTerrainHoles } from '../../island/terrain.ts';
import { onStart, onFrame } from '../../loop.ts';
import { atmosphere } from '../../render/sky.ts';
import { camConstraints, me } from '../../player/player.ts';
import { ball } from '../../physics/ball.ts';
import { waterField } from '../../physics/water-field.ts';
import { buildCaveMeshSteps, buildCollarMeshSteps, caveSd } from './mesh.ts';
import { MOUTHS, POND, ZONE, TUNNEL_R, FLOOR_CUT, SEGMENTS, NODES } from './network.ts';
import { buildDecor, mouthFrame } from './decor.ts';
import { freezeStatic } from '../../render/instances.ts';

const ENTER = 1.0; // a body counts as in the cave this far out of a mouth (the cave's floor reaches a bit further)
const COLLIDER_OUT = 1.6;
// Ambient light reaching the rock, by distance from the nearest mouth: daylight at the mouth, AMB_DEEP of it from
// AMB_FAR metres in. Baked into the mesh, so the inside reads dark from outside too (the sky's light is global).
const AMB_NEAR = 2,
  AMB_FAR = 14,
  AMB_DEEP = 0.6;
const SURFACE_MASK = ~GROUP.CAVE,
  CAVE_MASK = ~GROUP.SCENERY;

// Rough box around the whole network, for cheap "nowhere near the caves" rejects.
const BOX = (() => {
  const pts = [...SEGMENTS.flatMap((s) => s.pts), ...Object.values(NODES)];
  const xs = pts.map((p) => p.x),
    zs = pts.map((p) => p.z);
  return { x0: Math.min(...xs) - 16, x1: Math.max(...xs) + 16, z0: Math.min(...zs) - 16, z1: Math.max(...zs) + 16 };
})();
const nearCaves = (x: number, z: number, pad = 0) =>
  x > BOX.x0 - pad && x < BOX.x1 + pad && z > BOX.z0 - pad && z < BOX.z1 + pad;

// How far out of a mouth (x, z) is: metres along its outward direction, for points in line with that mouth's tunnel
// (within its radius, sideways); -Infinity anywhere else. Chambers that happen to lie beside a mouth are not "out".
function outOfMouth(x: number, z: number) {
  let best = -Infinity;
  for (const m of MOUTHS) {
    const dx = x - m.x,
      dz = z - m.z;
    const along = dx * m.ox + dz * m.oz;
    if (along < -12 || along > 12) continue;
    const side = Math.abs(dx * m.oz - dz * m.ox);
    if (side < TUNNEL_R + 0.8) best = Math.max(best, along);
  }
  return best;
}

let ready = false;
export const cavesReady = () => ready;
export function inCave(x: number, y: number, z: number) {
  if (!ready || !nearCaves(x, z) || y > 30) return false;
  return outOfMouth(x, z) < ENTER && caveSd(x, y, z) < -0.05;
}

// ---------------------------------------------------------------- build
let caveMesh: THREE.Mesh | null = null,
  collarMesh: THREE.Mesh | null = null,
  decorRoot: THREE.Object3D | null = null;
const PALETTE: Record<number, [string, string]> = {
  [ZONE.TUNNEL]: ['#7b7166', '#6c6255'],
  [ZONE.HUB]: ['#80766a', '#6e6457'],
  [ZONE.MINE]: ['#8a6b4b', '#5f4a36'],
  [ZONE.POND]: ['#5f6c72', '#4c5e4a'],
  [ZONE.CELLAR]: ['#9b5541', '#7d7265'],
};

// A steady 0..1 hash of vertex v's position, to vary the rock colour vertex by vertex.
function vertexNoise(positions: ArrayLike<number>, v: number) {
  const h =
    Math.sin(positions[v * 3] * 12.9898 + positions[v * 3 + 2] * 78.233 + positions[v * 3 + 1] * 37.719) * 43758.5453;
  return h - Math.floor(h);
}

type CaveMesh = { positions: Float32Array; indices: Uint32Array; zones: Uint8Array; grid: number[] };
function makeGeometry(m: CaveMesh) {
  const { positions, indices, zones } = m;
  // Look: everything behind the mouths. Collider: up to a little way out of them.
  const vis: number[] = [],
    col: number[] = [];
  for (let n = 0; n < indices.length; n += 3) {
    const a = indices[n] * 3,
      b = indices[n + 1] * 3,
      c = indices[n + 2] * 3;
    const out = outOfMouth(
      (positions[a] + positions[b] + positions[c]) / 3,
      (positions[a + 2] + positions[b + 2] + positions[c + 2]) / 3,
    );
    if (out < 0.7) vis.push(indices[n], indices[n + 1], indices[n + 2]); // overlaps the trench floor a little
    if (out < COLLIDER_OUT) col.push(indices[n], indices[n + 1], indices[n + 2]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(vis);
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal.array;
  const colors = new Float32Array(positions.length);
  const brick = new Float32Array(positions.length / 3);
  const amb = new Float32Array(positions.length / 3);
  const tmp = new THREE.Color(),
    floorC = new THREE.Color();
  for (let v = 0; v < positions.length / 3; v++) {
    const [wall, floor] = PALETTE[zones[v]] ?? PALETTE[ZONE.TUNNEL];
    tmp.set(wall);
    floorC.set(floor);
    tmp.lerp(floorC, THREE.MathUtils.smoothstep(nrm[v * 3 + 1], 0.45, 0.85)); // floors
    const vary = 0.9 + 0.2 * vertexNoise(positions, v);
    const up = nrm[v * 3 + 1] < -0.5 ? 0.8 : 1; // ceilings a touch darker
    colors.set([tmp.r * vary * up, tmp.g * vary * up, tmp.b * vary * up], v * 3);
    brick[v] = zones[v] === ZONE.CELLAR ? 1 : 0;
    amb[v] = ambAt(positions[v * 3], positions[v * 3 + 2]);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aBrick', new THREE.BufferAttribute(brick, 1));
  geo.setAttribute('aAmb', new THREE.BufferAttribute(amb, 1));
  geo.computeBoundingSphere();
  return { geo, colliderIndices: col };
}

// Ambient (sky) light reaching a point at world (x, z): 1 at the mouths, AMB_DEEP deep in. Fill it into an aAmb vertex
// attribute for any cave mesh drawn with withCaveAmbient, so it darkens with depth like the rock.
export function ambAt(x: number, z: number) {
  let mouthD = Infinity;
  for (const mo of MOUTHS) mouthD = Math.min(mouthD, Math.hypot(x - mo.x, z - mo.z));
  return 1 - (1 - AMB_DEEP) * THREE.MathUtils.smoothstep(mouthD, AMB_NEAR, AMB_FAR);
}

// Scales the sky's ambient (hemisphere) light by the geometry's aAmb attribute; lanterns and the sun are not.
// aoNode multiplies the indirect diffuse light, which here is only the hemisphere light.
const aAmb = attribute('aAmb', 'float');
export function withCaveAmbient<M extends object>(mat: M) {
  return patchNode(mat, 'aoNode', (prev) => (prev ? prev.mul(aAmb) : aAmb));
}

// Brickwork for the cellar: mortar lines in world space on whichever plane the surface faces.
function brickMaterial() {
  const mat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  const aBrick = attribute('aBrick', 'float');
  mat.colorNode = Fn(() => {
    const w = positionGeometry;
    // Derivatives first (toVar emits them here), before the branch: WGSL wants them in uniform control flow.
    const an = abs(normalize(cross(dFdx(w), dFdy(w)))).toVar();
    const k = float(1).toVar();
    If(aBrick.greaterThan(0.5), () => {
      const flat = an.y.greaterThan(0.7);
      const wall = select(an.x.greaterThan(an.z), w.zy, w.xy).mul(vec2(2, 4));
      const p = select(flat, w.xz.mul(1.3), wall).toVar();
      p.x.addAssign(mod(floor(p.y), 2).mul(0.5));
      const f = fract(p);
      const mortar = step(f.x, 0.06).add(step(f.y, 0.1));
      k.assign(mix(rand(floor(p)).mul(0.24).add(0.86), 0.55, clamp(mortar, 0, 1)));
    });
    return vec4(vec3(k), 1);
  })();
  return withCaveAmbient(mat);
}

// Rock rings round the mouths (mesh.js), hiding where the hillside's holes meet the tunnels. Look only: they sit
// in the rock and the trench walls, a hand's width proud of the tunnel wall.
function makeCollars({ positions, indices }: { positions: Float32Array; indices: Uint32Array }) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  const colors = new Float32Array(positions.length);
  const tmp = new THREE.Color();
  for (let v = 0; v < positions.length / 3; v++) {
    tmp.set('#968f83').multiplyScalar(0.88 + 0.24 * vertexNoise(positions, v));
    colors.set([tmp.r, tmp.g, tmp.b], v * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardNodeMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
  );
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function* build() {
  const steps = buildCaveMeshSteps();
  let r = steps.next();
  while (!r.done) {
    yield;
    r = steps.next();
  }
  const m = r.value;
  const { geo, colliderIndices } = makeGeometry(m);
  caveMesh = new THREE.Mesh(geo, brickMaterial());
  caveMesh.receiveShadow = true;
  caveMesh.castShadow = true; // the rock over the tunnels is what keeps the sun out (the heightfield above casts only its back faces)
  scene.add(caveMesh);
  freezeStatic(caveMesh); // never moves: no per-frame matrix work
  precompile(caveMesh); // their pipelines build now, not when the first player walks in

  addBody(
    createBody({
      material: groundMat,
      group: GROUP.CAVE,
      shapes: [{ kind: 'trimesh', vertices: m.positions, indices: colliderIndices }],
    }),
  );
  yield;

  collarMesh = makeCollars(yield* buildCollarMeshSteps());
  scene.add(collarMesh);
  freezeStatic(collarMesh);
  precompile(collarMesh);
  yield;

  decorRoot = buildDecor({ scene });
  precompile(decorRoot);
  setTerrainHoles(
    MOUTHS.map((mo) => ({
      a: [mo.x + mo.ox * 1.5, mo.y + FLOOR_CUT, mo.z + mo.oz * 1.5],
      b: [mo.x - mo.ox * 6, mo.y + FLOOR_CUT, mo.z - mo.oz * 6],
      r: TUNNEL_R - 0.12,
      floor: mo.y + 0.22, // keep the trench floor's last bit, so the seam with the cave floor is covered
    })),
  );
  ready = true;
  console.info(`[caves] ${m.indices.length / 3} triangles from a ${m.grid.join('x')} grid`);
}

// ---------------------------------------------------------------- bodies: ground or cave colliders
const tracked = new WeakMap<Body, { cave: boolean; safe: { x: number; y: number; z: number } }>(); // body -> state
function track(body: Body, yOff: number) {
  let st = tracked.get(body);
  if (!st)
    tracked.set(body, (st = { cave: false, safe: { x: body.position.x, y: body.position.y, z: body.position.z } }));
  const p = body.position;
  const y = p.y + yOff;
  const cave = inCave(p.x, y, p.z);
  if (cave !== st.cave || getMask(body) === -1) {
    st.cave = cave;
    setMask(body, cave ? CAVE_MASK : SURFACE_MASK);
  }
  if (!ready || !nearCaves(p.x, p.z)) return;
  // Safety net: inside solid rock (fast throws can go through a thin wall) -> back to the last good spot.
  const d = caveSd(p.x, y, p.z);
  const keep = () => ((st.safe.x = p.x), (st.safe.y = p.y), (st.safe.z = p.z));
  if (cave && d < -0.35) keep();
  else if (!cave && p.y < groundHeight(p.x, p.z) - 1.2 && d > 0.3 && outOfMouth(p.x, p.z) < ENTER) {
    teleport(body, st.safe.x, st.safe.y, st.safe.z);
    const v = body.velocity;
    v.set(v.x * -0.3, v.y * -0.3, v.z * -0.3);
  } else if (!cave) keep();
}

// The floor under a point that is in the caves (for ball friction and the like).
function floorBelow(x: number, y: number, z: number) {
  for (let k = 0; k < 40; k++) if (caveSd(x, y - k * 0.2, z) > 0) return y - k * 0.2;
  return y - 8;
}

// ---------------------------------------------------------------- camera and atmosphere
// The camera ray stops at rock, at the mouths' timber frames (it may only pass through their doorway, clear of the
// posts, lanterns and beam), and (out past a mouth) at the ground. Pulled in at once when something gets in the way,
// it eases back out while it is in the tunnel (no pop as the tunnel opens up).
const CAM_EASE = 4; // 1/s
const FRAMES = MOUTHS.map((m) => ({ m, ...mouthFrame(m) }));
const tmpV = new THREE.Vector3();
const camRay = { len: Infinity, at: 0 };
function blocked(x: number, y: number, z: number) {
  for (const { m, rx, rz, fx, fz, half } of FRAMES) {
    const along = (x - fx) * m.ox + (z - fz) * m.oz;
    if (Math.abs(along) > 0.45) continue;
    const side = Math.abs((x - fx) * rx + (z - fz) * rz);
    if (side < half + 0.6 && y < m.y + 3.3 && (side > half - 0.55 || y > m.y + 2.3)) return true;
  }
  if (outOfMouth(x, z) > 0.5) return y < groundHeight(x, z) + 0.45;
  return caveSd(x, y, z) > -0.35;
}
function keepCameraInside(look: THREE.Vector3, pos: THREE.Vector3) {
  const now = performance.now();
  const dt = Math.min(0.1, (now - camRay.at) / 1000);
  camRay.at = now;
  // Also when you stand outside a mouth with the camera's spot in the tunnel behind you (walking out): else the usual
  // ground rule would lift it onto the hill over the mouth.
  if (!ready || !me.body || !(tracked.get(me.body)?.cave || inCave(pos.x, pos.y, pos.z))) {
    camRay.len = Infinity;
    return false;
  }
  const dir = tmpV.subVectors(pos, look);
  const len = dir.length();
  dir.divideScalar(len || 1);
  let t = 0;
  for (; t < len; t += 0.2) if (blocked(look.x + dir.x * t, look.y + dir.y * t, look.z + dir.z * t)) break;
  const free = Math.max(0.3, Math.min(len, t - 0.25));
  camRay.len = free < camRay.len ? free : camRay.len + (free - camRay.len) * Math.min(1, dt * CAM_EASE);
  pos.copy(look).addScaledVector(dir, Math.min(free, camRay.len));
  return true;
}

let under = 0;
function update({ dt }: { dt: number }) {
  if (!ready || !caveMesh || !collarMesh || !decorRoot) return;
  const c = camera.position;
  caveMesh.visible = collarMesh.visible = decorRoot.visible = nearCaves(c.x, c.z, 70) && c.y < 60;
  let target = 0;
  if (inCave(c.x, c.y, c.z)) target = THREE.MathUtils.smoothstep(-outOfMouth(c.x, c.z), 1, 9); // daylight near mouths
  under += (target - under) * Math.min(1, dt * 3);
  atmosphere.underground = under < 0.002 ? 0 : under;
}

onStart(() => {
  // The pond is real water: you can wade and swim, and the ball floats.
  const surfaceAt = waterField.surfaceAt;
  waterField.surfaceAt = (x, z) => {
    const q = ((x - POND.x) / POND.rx) ** 2 + ((z - POND.z) / POND.rz) ** 2;
    return q < 0.81 ? Math.max(surfaceAt(x, z), POND.level) : surfaceAt(x, z);
  };
  const under0 = groundProbe.under;
  groundProbe.under = (x, y, z) => (inCave(x, y, z) ? floorBelow(x, y, z) : under0(x, y, z));
  const netted0 = groundProbe.netted;
  groundProbe.netted = (x, z) => !nearCaves(x, z) && netted0(x, z); // track() is the net here
  camConstraints.push(keepCameraInside);
  onPreStep(() => {
    if (me.body) track(me.body, 0.4);
    if (ball.mine && !ball.held) track(ball.body, 0);
  });

  // Build in ~8 ms slices between frames, so nobody notices.
  const job = build();
  const slice = () => {
    const t0 = performance.now();
    while (performance.now() - t0 < 8) if (job.next().done) return;
    setTimeout(slice, 0);
  };
  setTimeout(slice, 0);
});
onFrame(update, { phase: 'late', order: 2000 }); // after anything that moves the camera
