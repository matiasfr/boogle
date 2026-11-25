// command: npm run look -- --action dev/look/evals/cliff-counts.ts --name cliff-counts
// The cliff census's counts (docs/plans/cliff-kit-everywhere.md): at each census camera, with Buddy stood under it (a
// staging teleport, so what is resident by distance is there), two seconds to settle, then one completed frame's draw
// calls and triangles (colour and shadow passes together, as renderer.info sums them) and the canyon kit's instanced
// share. Counts are counts; it reads no frame time (timing under load is not evidence).
const { renderer, scene } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/terrain.ts' as string)) as typeof import('../../../src/place/terrain.ts');

/** World cameras: [name, cam, look, where Buddy stands (x, z)]. */
const CAMERAS: [string, number[], number[], number[]][] = [
  ['shore', [796, 10, 0], [806, 3, 52], [801, 10]],
  ['shore climb', [770, 8, -4], [822, 8, 14], [813, 10]],
  ['canyon climb', [962, 7, -80], [942, 14, -114], [960, -84]],
  ['gorge rim', [868, 22, -120], [940, 6, -100], [870, -118]],
  ['gorge mouth', [975, 8, 232], [965, 8, 150], [960, 140]],
  ['Far Head', [1500, 14, -80], [1395, 10, -185], [1452, -170]],
  ['summit', [870, 72, 65], [1080, 0, -500], [880, 60]],
];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const frames = () => window.boogle!.prof.last.frames;
async function frame() {
  const start = frames();
  const deadline = performance.now() + 30000;
  while (frames() < start + 3) {
    if (performance.now() > deadline) throw new Error('cliff-counts: no completed frames');
    await wait(20);
  }
}
// Run this pose with --rail-seed ring-joined --query cliffCensus=ring.
const ringOnly = new URLSearchParams(location.search).get('cliffCensus') === 'ring';
const poses: typeof CAMERAS = ringOnly
  ? [['ring cutting', [1403, 9, -867.5], [1387, 9, -893], [1403, -867.5]]]
  : CAMERAS;
for (const [name, cam, look, [bx, bz]] of poses) {
  teleport(me.body!, bx!, ringOnly ? 8.3 : H(bx!, bz!) + 1.5, bz!);
  me.body!.velocity.set(0, 0, 0);
  window.__debugCam!.set(cam as [number, number, number], look as [number, number, number]);
  await wait(2000);
  await frame();
  let kitInstances = 0,
    kitTriangles = 0;
  scene.traverse((o) => {
    const mesh = o as unknown as {
      isInstancedMesh?: boolean;
      name: string;
      count: number;
      geometry: { index: { count: number } | null; attributes: { position: { count: number } } };
    };
    if (!mesh.isInstancedMesh || !mesh.name.startsWith('terrain.')) return;
    kitInstances += mesh.count;
    kitTriangles += (mesh.count * (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count)) / 3;
  });
  const { drawCalls, triangles } = renderer.info.render;
  console.log('CLIFF COUNTS ' + JSON.stringify({ name, drawCalls, triangles, kitInstances, kitTriangles }));
}
export {};
