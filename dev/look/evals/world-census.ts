// npm run look -- --real --fov 62 --rail-seed ring-joined --query tpose=green --cam 909,24.45,35 --look 903,19.15,20 --eval dev/look/evals/world-census.ts --name census-green-before
import type * as Three from 'three/webgpu';

const sceneUrl = '/src/render/scene.ts';
const threeUrl = /from\s+"([^"]*three_webgpu[^"]*)"/.exec(await (await fetch(sceneUrl)).text())?.[1];
if (!threeUrl) throw new Error('three module URL missing');
const { Frustum, Matrix4, Sphere, Vector3 } = (await import(threeUrl)) as typeof Three;
const { renderer, scene, camera } = (await import(sceneUrl)) as typeof import('../../../src/render/scene.ts');
const { currentFrame, prof } = (await import('/src/loop.ts' as string)) as typeof import('../../../src/loop.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { inspect } = (await import(
  '/src/entity/inspect.ts' as string
)) as typeof import('../../../src/entity/inspect.ts');

const pose = new URLSearchParams(location.search).get('tpose') ?? 'green';
const body = me.body;
if (!body) throw new Error('world census needs a player body');
const debugCam = window.__debugCam;
if (!debugCam) throw new Error('world census needs the look camera');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
if (pose === 'ring') {
  const { ringUnstuckHome, ringIslandNear } = (await import(
    '/src/entities/ring-island/state.ts' as string
  )) as typeof import('../../../src/entities/ring-island/state.ts');
  teleport(body, ringUnstuckHome.x, ringUnstuckHome.y + 1, ringUnstuckHome.z);
  const deadline = performance.now() + 60000;
  while (!ringIslandNear.mounted && performance.now() < deadline) await wait(100);
  if (!ringIslandNear.mounted) throw new Error('Ring Island near view did not mount');
  const { ringAt } = (await import(
    '/src/sim/railway-ring-layout.ts' as string
  )) as typeof import('../../../src/sim/railway-ring-layout.ts');
  const ringCam = ringAt(43200, -860);
  debugCam.set([ringCam.x / 100, 11.1, ringCam.z / 100], [1338, 70, -1120], 62);
} else if (pose === 'green' || pose === 'head') {
  const [x, z] = pose === 'green' ? ([903, 20] as const) : ([1392, -170] as const);
  teleport(body, x, H(x, z) + 0.8, z);
  if (pose === 'green') debugCam.set([909, 24.45, 35], [903, 19.15, 20], 62);
  else debugCam.set([1392, 28, -170], [1350, 15, -128], 62);
} else {
  throw new Error('tpose: green, head or ring');
}
body.velocity.set(0, 0, 0);
await wait(6000);

const started = performance.now();
const startFrame = prof.last.frames;
await wait(5000);
const sampleMs = Math.round(performance.now() - started);
const sampleFrames = prof.last.frames - startFrame;
const kinds = inspect()
  .kinds.flatMap(({ kind, count, phases }) => {
    const cost = phases.find(({ phase }) => phase === 'update')?.cost;
    return cost ? [{ kind, count, ...cost }] : [];
  })
  .sort((left, right) => right.avg - left.avg)
  .slice(0, 10);

type Counts = { draws: number; tris: number };
type DrawRow = Counts & { object: Three.Object3D; shadow: boolean };
type Draw = { object: Three.Object3D; material: Three.Material };
const backend = renderer.backend as unknown as { draw(draw: Draw, info: unknown): void };
const original = backend.draw;
const rows = new Map<string, DrawRow>();
let frame = 0;
backend.draw = function (draw, info) {
  const stats = renderer.info.render;
  const { drawCalls, triangles } = stats;
  original.call(this, draw, info);
  const drawingFrame = currentFrame();
  const draws = stats.drawCalls - drawCalls;
  if (!drawingFrame || !draws) return;
  if (frame !== drawingFrame) {
    frame = drawingFrame;
    rows.clear();
  }
  const shadow = draw.material.name === 'ShadowMaterial';
  const key = `${draw.object.id}:${shadow}`;
  const row = rows.get(key) ?? { object: draw.object, shadow, draws: 0, tris: 0 };
  row.draws += draws;
  row.tris += stats.triangles - triangles;
  rows.set(key, row);
};
try {
  const completed = prof.last.frames;
  const deadline = performance.now() + 10000;
  while ((!frame || prof.last.frames === completed) && performance.now() < deadline) await wait(20);
  if (!frame || prof.last.frames === completed) throw new Error('world census saw no completed render');
} finally {
  backend.draw = original;
}

const label = (object: Three.Object3D) => object.name || object.type;
function ownerPath(object: Three.Object3D) {
  const parents: string[] = [];
  for (let parent = object.parent; parent; parent = parent.parent) parents.push(label(parent));
  return parents.reverse().join('/');
}
// Unnamed rows share a path across unrelated owners, so each group also splits by the parent its meshes hang
// from, and each part says what its meshes are (geometry, vertices, material, colour) and the horizontal box
// (x0, z0, x1, z1) they span: enough to grep for the owner.
type Tally = Counts & { objects: number; kinds: Map<string, number>; box: [number, number, number, number] };
const tally = (): Tally => ({ objects: 0, draws: 0, tris: 0, kinds: new Map(), box: [Infinity, Infinity, -Infinity, -Infinity] });
const at = new Vector3();
function kindOf(object: Three.Object3D) {
  const mesh = object as Three.Mesh;
  const geometry = mesh.geometry;
  const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
    | (Three.Material & { color?: Three.Color })
    | undefined;
  const verts = geometry?.getAttribute('position')?.count ?? 0;
  const colour = material?.color ? ` #${material.color.getHexString()}` : '';
  return `${geometry?.type ?? '?'} ${verts}v ${material?.type ?? '?'}${material?.name ? ':' + material.name : ''}${colour}`;
}
function add(into: Tally, row: DrawRow, kind: string) {
  into.objects++;
  into.draws += row.draws;
  into.tris += row.tris;
  into.kinds.set(kind, (into.kinds.get(kind) ?? 0) + 1);
  row.object.getWorldPosition(at);
  const box = into.box;
  into.box = [Math.min(box[0], at.x), Math.min(box[1], at.z), Math.max(box[2], at.x), Math.max(box[3], at.z)];
}
const show = ({ kinds, box, ...counts }: Tally) => ({
  ...counts,
  kinds: [...kinds].sort((left, right) => right[1] - left[1]).slice(0, 6),
  box: box.map(Math.round),
});
function summarize(shadow: boolean) {
  const total = { draws: 0, tris: 0 };
  const groups = new Map<string, Tally & { name: string; ownerPath: string; parents: Map<number, Tally> }>();
  for (const row of rows.values()) {
    if (row.shadow !== shadow) continue;
    const name = label(row.object);
    const path = ownerPath(row.object);
    const key = JSON.stringify([name, path]);
    const group = groups.get(key) ?? { name, ownerPath: path, parents: new Map(), ...tally() };
    const kind = kindOf(row.object);
    add(group, row, kind);
    const parent = row.object.parent?.id ?? -1;
    const part = group.parents.get(parent) ?? tally();
    add(part, row, kind);
    group.parents.set(parent, part);
    total.draws += row.draws;
    total.tris += row.tris;
    groups.set(key, group);
  }
  return {
    ...total,
    groups: [...groups.values()]
      .sort((left, right) => right.draws - left.draws)
      .map(({ name, ownerPath, parents, ...group }) => ({
        name,
        ownerPath,
        ...show(group),
        parents: [...parents.values()]
          .sort((left, right) => right.draws - left.draws)
          .slice(0, 8)
          .map(show),
      })),
  };
}

const frustum = new Frustum().setFromProjectionMatrix(
  new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  camera.coordinateSystem,
  camera.reversedDepth,
);
const local = new Matrix4();
const world = new Matrix4();
const sphere = new Sphere();
const uncullable: unknown[] = [];
scene.traverse((object) => {
  const mesh = object as Three.Mesh;
  if (!mesh.isMesh || mesh.frustumCulled) return;
  const batch = (mesh as Three.InstancedMesh).isInstancedMesh ? (mesh as Three.InstancedMesh) : null;
  const instances = batch?.count ?? 1;
  const geometry = mesh.geometry;
  const count = geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0;
  const range = Math.max(0, Math.min(count - geometry.drawRange.start, geometry.drawRange.count));
  const tris = Math.floor(range / 3) * instances;
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const bounds = geometry.boundingSphere;
  let inView = false;
  for (let index = 0; bounds && !bounds.isEmpty() && index < instances && !inView; index++) {
    if (batch) batch.getMatrixAt(index, local);
    world.copy(mesh.matrixWorld);
    if (batch) world.multiply(local);
    inView = frustum.intersectsSphere(sphere.copy(bounds).applyMatrix4(world));
  }
  const submitted = (shadow: boolean) => {
    const row = rows.get(`${mesh.id}:${shadow}`);
    return { draws: row?.draws ?? 0, tris: row?.tris ?? 0 };
  };
  uncullable.push({
    id: mesh.id,
    name: label(mesh),
    ownerPath: ownerPath(mesh),
    instances,
    tris,
    castsShadow: mesh.castShadow,
    inView,
    main: submitted(false),
    shadow: submitted(true),
  });
});

console.log(
  'WORLD CENSUS ' +
    JSON.stringify({
      pose,
      frame,
      main: summarize(false),
      shadow: summarize(true),
      uncullable,
      update: { sampleMs, sampleFrames, rollingFrames: 240, kinds },
    }),
);
export {};
