// Ultra Water terrain.js / terrainGeometry.js, real metres, on this prototype page only.
// Research: docs/research/ultra-water.md recs 1-3. Local; DESIGN.md: Toys before chores.
import * as THREE from 'three/webgpu';
import { addBody, createBody, type Shape } from '../../physics/engine.ts';
import { GROUP, groundMat } from '../../physics/physics.ts';
import { scene, sun } from '../../render/scene.ts';
import { ROCK, fbm, islandHeight } from './height.ts';
import { groundNodes, rockGeometry, rockMaps } from './ground.ts';
import { swashNodes, shoreFields, uTime, type ShoreBake } from './shore-nodes.ts';
import { TSL, type N } from './tsl.ts';
import { ISLAND_AT, LOOK, TERRAIN } from './tuning.ts';

const addStatic = (shape: Shape, position: { x: number; y: number; z: number }) =>
  addBody(createBody({ material: groundMat, group: GROUP.SCENERY, position, shapes: [shape] }));
type Spot = { x: number; y: number; z: number; s: number; r: number; hero?: boolean };

export function buildIsland(bake: ShoreBake, caustics?: (entry: N, depth: N, lod: N) => N) {
  const segments = 384,
    extent = 2400,
    cell = extent / segments;
  const geo = new THREE.PlaneGeometry(extent, extent, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position!;
  const heights: number[][] = Array.from({ length: segments + 1 }, () => []);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      h = islandHeight(x, z);
    pos.setXYZ(i, x + ISLAND_AT.x, h, z + ISLAND_AT.z);
    heights[i % (segments + 1)]![segments - Math.floor(i / (segments + 1))] = h;
  }
  const oldIndex = geo.index!,
    keep: number[] = [];
  for (let i = 0; i < oldIndex.count; i += 3) {
    const a = oldIndex.getX(i),
      b = oldIndex.getX(i + 1),
      c = oldIndex.getX(i + 2);
    if (Math.max(pos.getY(a), pos.getY(b), pos.getY(c)) > -34) keep.push(a, b, c);
  }
  geo.setIndex(keep);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  // Source LCG and consumption order, including the hero's orientation after the shore rocks.
  let seed = 7;
  const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const spots: Spot[] = [];
  for (let i = 0; i < 540 && spots.length < 90; i++) {
    const a = rand() * Math.PI * 2;
    let r = 150;
    while (r < 700 && islandHeight(Math.cos(a) * r, Math.sin(a) * r) > 0) r += 4;
    r += (rand() - 0.6) * 40;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r,
      h = islandHeight(x, z);
    if (h < -5 || h > 6) continue;
    const s = 1.5 + Math.pow(rand(), 2.2) * 9;
    spots.push({ x, z, y: h - s * 0.15, s, r: 0 });
    for (let k = 0; k < 3 && spots.length < 90; k++) {
      const ox = x + (rand() - 0.5) * s * 4,
        oz = z + (rand() - 0.5) * s * 4;
      const ss = s * (0.25 + rand() * 0.35);
      spots.push({ x: ox, z: oz, y: islandHeight(ox, oz) - ss * 0.2, s: ss, r: 0 });
    }
  }
  spots.push({ ...ROCK, y: islandHeight(ROCK.x, ROCK.z) - 1.6, s: 0, hero: true });
  const matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion(),
    scale = new THREE.Vector3();
  const transforms = spots.map((s) => {
    rotation.setFromEuler(new THREE.Euler(rand() * 0.6, rand() * Math.PI * 2, rand() * 0.6));
    if (s.hero) scale.set(9, 6, 7.5);
    else scale.set(s.s * (0.8 + rand() * 0.6), s.s * (0.5 + rand() * 0.5), s.s * (0.8 + rand() * 0.6));
    s.r = (0.95 * (scale.x + scale.z)) / 2;
    const point = { x: s.x + ISLAND_AT.x, y: s.y, z: s.z + ISLAND_AT.z };
    addStatic({ kind: 'sphere', r: s.r * 0.85 }, point);
    return matrix.compose(new THREE.Vector3(point.x, point.y, point.z), rotation, scale).clone();
  });
  const maps = rockMaps(
    spots
      .filter((s) => !s.hero && islandHeight(s.x, s.z) > -3 && islandHeight(s.x, s.z) < 2.5)
      .map((s) => ({ x: s.x + ISLAND_AT.x, z: s.z + ISLAND_AT.z, r: s.r })),
    ISLAND_AT,
    bake.extent,
  );
  const field = shoreFields(bake);
  const material = (rock: boolean) => {
    const mat = new THREE.MeshStandardNodeMaterial({
      roughness: rock ? 0.85 : 0.92,
      envMapIntensity: 0.9,
      vertexColors: false, // groundNodes applies the rock's baked cavity colour once
      flatShading: rock ? TERRAIN.flatRocks : TERRAIN.flatGround,
    });
    Object.assign(
      mat,
      groundNodes({
        position: TSL.positionWorld,
        normal: TSL.normalWorldGeometry,
        time: uTime,
        sunDirection: TSL.lightPosition(sun).sub(TSL.lightTargetPosition(sun)).normalize(),
        absorption: TSL.vec3(...LOOK.absorption),
        rock,
        caustics,
        swash: (xz, height) => swashNodes(xz, height, field, maps.influence),
      }),
    );
    return mat;
  };
  const ground = new THREE.Mesh(geo, material(false));
  const rocks = new THREE.InstancedMesh(rockGeometry(fbm), material(true), spots.length);
  transforms.forEach((m, i) => rocks.setMatrixAt(i, m));
  rocks.computeBoundingSphere();
  for (const mesh of [ground, rocks]) {
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
  }
  addStatic({ kind: 'heightfield', heights, cell }, { x: ISLAND_AT.x - extent / 2, y: 0, z: ISLAND_AT.z + extent / 2 });
  return ground;
}
