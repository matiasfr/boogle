// The caves under the north-west massif: tunnels and chambers (network.js) with four mouths, an abandoned mine, an
// underground pond and a wine cellar (decor.js).
//
// The heightfield can't have holes or overhangs, so the caves are their own world below it:
// - one seamless mesh (mesh.js), built a little each frame after start, used for the look and as a trimesh collider;
// - the ground is cut open at the four mouths (setTerrainHoles) once the cave mesh is there;
// - players and the ball switch between the ground's colliders and the cave's (collision groups) when they cross
//   into the cave volume; a safety net puts anything that ends up inside solid rock back where it was;
// - the camera stays inside the tunnels, the sky light dims and the fog closes in (sky.js `atmosphere`).
// All of it is local and cosmetic apart from collisions, which only affect bodies this client simulates.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene, camera } from '../../scene.js';
import { world, groundMat, GROUP, groundProbe, teleport } from '../../physics.js';
import { groundHeight, setTerrainHoles } from '../../terrain.js';
import { onStart, onFrame } from '../../loop.js';
import { atmosphere } from '../../sky.js';
import { camConstraints, me } from '../../player.js';
import { ball } from '../../ball.js';
import { waterField } from '../../water-field.js';
import { buildCaveMeshSteps, caveSd } from './mesh.js';
import { MOUTHS, POND, ZONE, TUNNEL_R, FLOOR_CUT, SEGMENTS, NODES } from './network.js';
import { buildDecor } from './decor.js';

const ENTER = 1.0; // a body counts as in the cave this far out of a mouth (the cave's floor reaches a bit further)
const COLLIDER_OUT = 1.6;
const SURFACE_MASK = ~GROUP.CAVE,
  CAVE_MASK = ~GROUP.SCENERY;

// Rough box around the whole network, for cheap "nowhere near the caves" rejects.
const BOX = (() => {
  const pts = [...SEGMENTS.flatMap((s) => s.pts), ...Object.values(NODES)];
  const xs = pts.map((p) => p.x),
    zs = pts.map((p) => p.z);
  return { x0: Math.min(...xs) - 16, x1: Math.max(...xs) + 16, z0: Math.min(...zs) - 16, z1: Math.max(...zs) + 16 };
})();
const nearCaves = (x, z, pad = 0) => x > BOX.x0 - pad && x < BOX.x1 + pad && z > BOX.z0 - pad && z < BOX.z1 + pad;

// How far out of a mouth (x, z) is: metres along its outward direction, for points in line with that mouth's tunnel
// (within its radius, sideways); -Infinity anywhere else. Chambers that happen to lie beside a mouth are not "out".
function outOfMouth(x, z) {
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
export function inCave(x, y, z) {
  if (!ready || !nearCaves(x, z) || y > 30) return false;
  return outOfMouth(x, z) < ENTER && caveSd(x, y, z) < -0.05;
}

// ---------------------------------------------------------------- build
let caveMesh = null,
  decorRoot = null;
const PALETTE = {
  [ZONE.TUNNEL]: ['#7b7166', '#6c6255'],
  [ZONE.HUB]: ['#80766a', '#6e6457'],
  [ZONE.MINE]: ['#8a6b4b', '#5f4a36'],
  [ZONE.POND]: ['#5f6c72', '#4c5e4a'],
  [ZONE.CELLAR]: ['#9b5541', '#7d7265'],
};

function makeGeometry(m) {
  const { positions, indices, zones } = m;
  // Look: everything behind the mouths. Collider: up to a little way out of them.
  const vis = [],
    col = [];
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
  const tmp = new THREE.Color(),
    floorC = new THREE.Color();
  for (let v = 0; v < positions.length / 3; v++) {
    const [wall, floor] = PALETTE[zones[v]] ?? PALETTE[ZONE.TUNNEL];
    tmp.set(wall);
    floorC.set(floor);
    tmp.lerp(floorC, THREE.MathUtils.smoothstep(nrm[v * 3 + 1], 0.45, 0.85)); // floors
    const h =
      Math.sin(positions[v * 3] * 12.9898 + positions[v * 3 + 2] * 78.233 + positions[v * 3 + 1] * 37.719) * 43758.5453;
    const vary = 0.9 + 0.2 * (h - Math.floor(h));
    const up = nrm[v * 3 + 1] < -0.5 ? 0.8 : 1; // ceilings a touch darker
    colors.set([tmp.r * vary * up, tmp.g * vary * up, tmp.b * vary * up], v * 3);
    brick[v] = zones[v] === ZONE.CELLAR ? 1 : 0;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aBrick', new THREE.BufferAttribute(brick, 1));
  geo.computeBoundingSphere();
  return { geo, colliderIndices: col };
}

// Brickwork for the cellar: mortar lines in world space on whichever plane the surface faces.
function brickMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aBrick; varying float vBrick; varying vec3 vCaveW;',
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBrick = aBrick; vCaveW = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vBrick; varying vec3 vCaveW;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (vBrick > 0.5) {
          vec3 n = normalize(cross(dFdx(vCaveW), dFdy(vCaveW)));
          vec3 an = abs(n);
          vec2 p = an.y > 0.7 ? vCaveW.xz * vec2(1.3, 1.3) : (an.x > an.z ? vCaveW.zy : vCaveW.xy) * vec2(2.0, 4.0);
          float row = floor(p.y);
          p.x += mod(row, 2.0) * 0.5;
          vec2 f = fract(p);
          float mortar = step(f.x, 0.06) + step(f.y, 0.1);
          float tint = fract(sin(dot(floor(p), vec2(12.99, 78.23))) * 43758.5);
          diffuseColor.rgb *= mix(0.86 + 0.24 * tint, 0.55, clamp(mortar, 0.0, 1.0));
        }`,
      );
  };
  return mat;
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
  scene.add(caveMesh);

  const body = new CANNON.Body({ mass: 0, material: groundMat, collisionFilterGroup: GROUP.CAVE });
  body.addShape(new CANNON.Trimesh(Array.from(m.positions), colliderIndices));
  world.addBody(body);
  yield;

  decorRoot = buildDecor({ world, scene });
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
const tracked = new WeakMap(); // body -> { cave, safe: Vec3 }
function track(body, yOff) {
  let st = tracked.get(body);
  if (!st) tracked.set(body, (st = { cave: false, safe: body.position.clone() }));
  const p = body.position;
  const y = p.y + yOff;
  const cave = inCave(p.x, y, p.z);
  if (cave !== st.cave || body.collisionFilterMask === -1) {
    st.cave = cave;
    body.collisionFilterMask = cave ? CAVE_MASK : SURFACE_MASK;
  }
  if (!ready || !nearCaves(p.x, p.z)) return;
  // Safety net: inside solid rock (fast throws can go through a thin wall) -> back to the last good spot.
  const d = caveSd(p.x, y, p.z);
  if (cave && d < -0.35) st.safe.copy(p);
  else if (!cave && p.y < groundHeight(p.x, p.z) - 1.2 && d > 0.3 && outOfMouth(p.x, p.z) < ENTER) {
    teleport(body, st.safe.x, st.safe.y, st.safe.z);
    body.velocity.scale(-0.3, body.velocity);
  } else if (!cave) st.safe.copy(p);
}

// The floor under a point that is in the caves (for ball friction and the like).
function floorBelow(x, y, z) {
  for (let k = 0; k < 40; k++) if (caveSd(x, y - k * 0.2, z) > 0) return y - k * 0.2;
  return y - 8;
}

// ---------------------------------------------------------------- camera and atmosphere
const tmpV = new THREE.Vector3();
function keepCameraInside(look, pos) {
  if (!ready || !me.body || !tracked.get(me.body)?.cave) return false;
  const dir = tmpV.subVectors(pos, look);
  const len = dir.length();
  dir.divideScalar(len || 1);
  let t = 0;
  for (; t < len; t += 0.2) if (caveSd(look.x + dir.x * t, look.y + dir.y * t, look.z + dir.z * t) > -0.35) break;
  pos.copy(look).addScaledVector(dir, Math.max(0.3, t - 0.25));
  return true;
}

let under = 0;
function update({ dt }) {
  if (!ready) return;
  const c = camera.position;
  caveMesh.visible = decorRoot.visible = nearCaves(c.x, c.z, 70) && c.y < 60;
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
  camConstraints.push(keepCameraInside);
  world.addEventListener('preStep', () => {
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
