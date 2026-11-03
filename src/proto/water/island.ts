// The test island of ?proto=water: Ultra Water terrain (or &terrain=toy) on a wide shallow shelf, as one mesh and one
// heightfield. One height function feeds the mesh, the collider and the shore bake, so they can't disagree. Local.
import * as THREE from 'three/webgpu';
import { TSL } from './tsl.ts';
import { flat } from '../flat.ts';
import { addBody, createBody, type Shape } from '../../physics/engine.ts';
import { GROUP, groundMat } from '../../physics/physics.ts';
import { smoothstep } from '../../math.ts';
import { scene, sun } from '../../render/scene.ts';
import { mulberry32 } from '../../sim/rng.ts';
import { ROCK, fbm, islandHeight } from './height.ts';
import { groundNodes, rockGeometry, rockMaps, SEABED_MEAN } from './ground.ts';
import { swashNodes, shoreFields, uTime, vnoise, type ShoreBake } from './shore-nodes.ts';
import { ISLAND_AT, LOOK, TERRAIN } from './tuning.ts';

const { Fn, color, float, max, min, mix, positionWorld, smoothstep: ss, vec3 } = TSL;

// surface.ts reconstructs a constant bed. Ultra's true bed varies with noise and absorbs sunlight: this is its mean
// pre-wet albedo, not that full reconstruction. See docs/game-design/water-proto.md for the surface integration seam.
export const SEABED_HEX = TERRAIN.ultra ? SEABED_MEAN : new THREE.Color('#f2e2b4');

const addStatic = (shape: Shape, position: { x: number; y: number; z: number }) =>
  addBody(createBody({ material: groundMat, group: GROUP.SCENERY, position, shapes: [shape] }));

const CELL = 2,
  EXT = 330,
  N = (EXT * 2) / CELL + 1;

/** Shared land/collider; only its material and the shore-rock presentation change between terrain modes. */
export function buildIsland(bake: ShoreBake) {
  // Keep today's positions and RNG consumption in both modes, so the A/B doesn't also move the trees and rocks.
  const rng = mulberry32(5);
  const spots = [{ x: ROCK.x, z: ROCK.z, r: ROCK.r }];
  for (let n = 0, placed = 0; n < 400 && placed < 14; n++) {
    const a = rng() * Math.PI * 2;
    let r = 60;
    while (r < 400 && islandHeight(Math.cos(a) * r, Math.sin(a) * r) > 0) r += 2;
    r += (rng() - 0.5) * 16;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (islandHeight(x, z) < -2.5) continue;
    spots.push({ x, z, r: 0.5 + rng() * rng() * 2.4 });
    placed++;
  }
  const heights = new Float32Array(N * N);
  const at = (i: number, j: number) => i + j * N;
  const pos = new Float32Array(N * N * 3),
    col = new Float32Array(N * N * 3);
  const SAND = new THREE.Color('#f6e7bb'),
    SEABED = SEABED_HEX,
    GRASS = new THREE.Color('#79b84a'),
    GRASS2 = new THREE.Color('#5ea241'),
    ROCKY = new THREE.Color('#a08a70'),
    c = new THREE.Color();
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const x = -EXT + i * CELL,
        z = -EXT + j * CELL,
        h = islandHeight(x, z);
      heights[at(i, j)] = h;
      pos.set([x + ISLAND_AT.x, h, z + ISLAND_AT.z], at(i, j) * 3);
    }
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const k = at(i, j),
        h = heights[k]!,
        x = -EXT + i * CELL,
        z = -EXT + j * CELL;
      const hx = heights[at(Math.min(N - 1, i + 1), j)]! - heights[at(Math.max(0, i - 1), j)]!,
        hz = heights[at(i, Math.min(N - 1, j + 1))]! - heights[at(i, Math.max(0, j - 1))]!;
      c.copy(GRASS).lerp(
        GRASS2,
        0.5 + 0.25 * Math.sin(x * 0.023 + 1) * Math.cos(z * 0.031) + 0.25 * Math.sin(x * 0.07),
      );
      c.lerp(SAND, smoothstep(3.4, 1.8, h));
      c.lerp(SEABED, smoothstep(0, -1.5, h));
      c.lerp(ROCKY, smoothstep(0.6, 1.1, Math.hypot(hx, hz) / (2 * CELL)));
      col.set([c.r, c.g, c.b], k * 3);
    }
  const idx: number[] = [];
  for (let j = 0; j < N - 1; j++)
    for (let i = 0; i < N - 1; i++) {
      const a = at(i, j),
        b = at(i + 1, j),
        c0 = at(i, j + 1),
        d = at(i + 1, j + 1);
      if (Math.max(heights[a]!, heights[b]!, heights[c0]!, heights[d]!) < -9) continue; // the water is opaque by here
      idx.push(a, c0, b, b, c0, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.95 }); // vertex colours: read below
  // Faceted on land; smooth under water, where the facets would show through as a quilt.
  mat.normalNode = TSL.select(positionWorld.y.lessThan(-0.2), TSL.normalView, TSL.normalFlat);
  const uF = shoreFields(bake);
  const hgt = positionWorld.y;
  mat.colorNode = Fn(() => {
    const base = TSL.vertexColor();
    const sw = swashNodes(positionWorld.xz, hgt, uF).toVar();
    const wet = max(float(1).sub(ss(0.35, 1.3, hgt)), sw.z);
    // Wet sand darkens roughly as albedo squared and the seabed to 0.6 (terrain.js), so the waterline dissolves into warm
    // wet sand and the bed under the water is what the surface assumes (surface.ts, `bed`).
    const under = ss(-0.8, 0, hgt).oneMinus();
    const albedo = base.mul(mix(vec3(1), mix(base.mul(0.8).add(0.06), vec3(0.6), under), wet)).toVar();
    // The film: only faintly tinted, since a few cm of water absorb almost nothing.
    albedo.mulAssign(mix(vec3(1), vec3(0.9, 0.97, 0.97), ss(0, 0.06, sw.x).mul(ss(-0.05, 0.05, hgt))));
    // Bubbles: lace on the running-up edge, broken remnants in the backwash. The less foam is left, the higher the
    // threshold, so it breaks into ever smaller islands rather than fading as a veil. Pale, sand-tinted, never paper white.
    const p = positionWorld.xz;
    const n = vnoise(p.mul(3.1).add(uTime.mul(0.15)))
      .mul(0.6)
      .add(vnoise(p.mul(7.3)).mul(0.4));
    const lace = ss(float(0.75).sub(sw.y.mul(0.4)), float(0.92).sub(sw.y.mul(0.3)), n);
    albedo.assign(mix(albedo, albedo.mul(0.4).add(vec3(0.42, 0.41, 0.38)), min(sw.y.mul(1.4), 1).mul(lace).mul(0.7)));
    return albedo;
  })();
  mat.roughnessNode = Fn(() => {
    const wet = max(float(1).sub(ss(0.35, 1.3, hgt)), swashNodes(positionWorld.xz, hgt, uF).z);
    return mix(float(0.95), float(0.32), wet.mul(ss(-0.05, 0.05, hgt)));
  })();
  let landMat = mat;
  let ultraRockMat: THREE.MeshStandardNodeMaterial | undefined;
  if (TERRAIN.ultra) {
    // The hero already changes the shore field; the source excludes it from this small-rock shelter map too.
    const rocks = rockMaps(
      spots
        .slice(1)
        .filter((s) => islandHeight(s.x, s.z) < 2.5)
        .map((s) => ({
          x: s.x + ISLAND_AT.x,
          z: s.z + ISLAND_AT.z,
          r: s.r * 0.95,
        })),
      ISLAND_AT,
      bake.extent,
    );
    const sunDirection = TSL.lightPosition(sun).sub(TSL.lightTargetPosition(sun)).normalize();
    const absorption = vec3(...LOOK.absorption);
    const nodes = (rock: boolean) =>
      groundNodes({
        position: positionWorld,
        normal: TSL.normalWorldGeometry,
        time: uTime,
        sunDirection,
        absorption,
        rock,
        swash: (xz, height) => swashNodes(xz, height, uF, rocks.influence),
      });
    landMat = new THREE.MeshStandardNodeMaterial({ flatShading: TERRAIN.flatGround });
    Object.assign(landMat, nodes(false));
    ultraRockMat = new THREE.MeshStandardNodeMaterial({ flatShading: TERRAIN.flatRocks });
    Object.assign(ultraRockMat, nodes(true));
    landMat.addEventListener('dispose', rocks.dispose);
    mat.dispose();
  }
  const mesh = new THREE.Mesh(geo, landMat);
  mesh.receiveShadow = mesh.castShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);

  const hf: number[][] = [];
  for (let i = 0; i < N; i++) {
    const row: number[] = [];
    for (let j = 0; j < N; j++) row.push(heights[at(i, N - 1 - j)]!);
    hf.push(row);
  }
  addStatic({ kind: 'heightfield', heights: hf, cell: CELL }, { x: ISLAND_AT.x - EXT, y: 0, z: ISLAND_AT.z + EXT });

  // The surf rock, some shore rocks and a few toy trees: something warm for the water to sit against.
  // Under the water a rock takes on the bed's colour: the surface tints what's behind it as if it were sand (surface.ts).
  const rockMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, flatShading: true });
  rockMat.colorNode = mix(color('#a8917a'), color(SEABED_HEX).mul(0.45), ss(-0.7, 0, positionWorld.y).oneMinus());
  const addRock = (x: number, z: number, r: number) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), rockMat);
    m.position.set(ISLAND_AT.x + x, islandHeight(x, z) + r * 0.25, ISLAND_AT.z + z);
    m.rotation.set(x, z, x + z);
    m.scale.y = 0.9;
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    addStatic({ kind: 'sphere', r: r * 0.85 }, { x: m.position.x, y: m.position.y, z: m.position.z });
  };
  if (ultraRockMat) {
    const rocks = new THREE.InstancedMesh(rockGeometry(fbm), ultraRockMat, spots.length);
    const matrix = new THREE.Matrix4(),
      rotation = new THREE.Quaternion(),
      scale = new THREE.Vector3();
    const point = new THREE.Vector3();
    for (const [i, s] of spots.entries()) {
      point.set(ISLAND_AT.x + s.x, islandHeight(s.x, s.z) + s.r * 0.25, ISLAND_AT.z + s.z);
      // Stay upright enough for the source's flattened base/bedding, unlike toy's freely tumbled icosahedra.
      rotation.setFromEuler(new THREE.Euler(Math.sin(s.x) * 0.3, s.z, Math.sin(s.z) * 0.3));
      scale.set(s.r, s.r * 0.9, s.r);
      rocks.setMatrixAt(i, matrix.compose(point, rotation, scale));
      addStatic({ kind: 'sphere', r: s.r * 0.85 }, { x: point.x, y: point.y, z: point.z });
    }
    rocks.computeBoundingSphere();
    rocks.castShadow = rocks.receiveShadow = true;
    scene.add(rocks);
    rockMat.dispose();
  } else {
    for (const s of spots) addRock(s.x, s.z, s.r);
  }
  const trunk = flat('#7f5630'),
    leaf = flat('#4f9440');
  for (let n = 0, placed = 0; n < 400 && placed < 26; n++) {
    const a = rng() * Math.PI * 2,
      r = 30 + rng() * 110,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r,
      h = islandHeight(x, z);
    if (h < 4 || h > 16) continue;
    const s = 0.9 + rng() * 0.8;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 1.6 * s, 6), trunk);
    t.position.set(ISLAND_AT.x + x, h + 0.8 * s, ISLAND_AT.z + z);
    const l = new THREE.Mesh(new THREE.ConeGeometry(1.5 * s, 4 * s, 7), leaf);
    l.position.set(0, 2.6, 0);
    t.add(l);
    t.castShadow = l.castShadow = true;
    scene.add(t);
    placed++;
  }
  return mesh;
}
