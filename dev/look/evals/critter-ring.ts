// npm run look -- --rail-seed ring-joined --eval dev/look/evals/critter-ring.ts --size 1200x750 --cam 1406,12.3,-788 --look 1399,4,-817 --fov 78 --warm 0.5 --frames 2 --seconds 0.3
// Sprint: --query shoreRun=1 --action dev/look/evals/sprint-jump.ts --cam 1445,7,-839 --look 1437,5,-819 --fov 75
import type { InstancedMesh } from 'three/webgpu';
const { me, cam } = (await import('/src/player/state.ts' as string)) as typeof import('../../../src/player/state.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { scene } = (await import(
  '/src/render/scene-graph.ts' as string
)) as typeof import('../../../src/render/scene-graph.ts');
const { setPlayerGraphics } = (await import(
  '/src/graphics-settings.ts' as string
)) as typeof import('../../../src/graphics-settings.ts');
const { ringAnchor, ringCounts } = (await import(
  '/src/place/ring-wildlife-sites.ts' as string
)) as typeof import('../../../src/place/ring-wildlife-sites.ts');
async function expectPools(detail: number) {
  const deadline = performance.now() + 20000;
  while (
    !Object.entries(ringCounts).every(([k, count]) => {
      const mesh = scene.getObjectByName('critter-ring-' + k) as InstancedMesh | undefined;
      return detail ? mesh?.count === count / detail && (detail === 1 || !mesh.castShadow) : !mesh;
    })
  ) {
    if (performance.now() > deadline) throw Error('Ring pool mismatch at detail ' + detail);
    await new Promise((r) => setTimeout(r, 40));
  }
  if (!detail && scene.getObjectByName('critter-ring-rocks')) throw Error('Ring shore rocks remained resident');
  console.log('PLAY Ring pools ' + (detail ? 'full population / ' + detail : 'absent from scene'));
}
teleport(me.body!, 1414, 11, -810);
await setPlayerGraphics('detail', 'full');
await expectPools(1);
teleport(me.body!, 960, 15, 0);
await expectPools(0);
teleport(me.body!, 1414, 11, -810);
await setPlayerGraphics('detail', 'lowest');
await expectPools(2);
await setPlayerGraphics('detail', 'full');
await expectPools(1);
if (new URL(location.href).searchParams.has('shoreRun')) {
  const p = ringAnchor('flock', 0);
  teleport(me.body!, p.x, p.y + 1, p.z + 4);
  const flock = scene.getObjectByName('critter-ring-flock') as InstancedMesh;
  const start = flock.instanceMatrix.array[13]!;
  console.log('PLAY Shore bird starts at ' + start.toFixed(2) + ' m');
  const watch = setInterval(() => {
    const height = flock.instanceMatrix.array[13]!;
    if (height > start + 2) {
      console.log('PLAY Shore bird rose to ' + height.toFixed(2) + ' m');
      clearInterval(watch);
    }
  }, 50);
  setTimeout(() => clearInterval(watch), 10000);
  cam.yaw = 0;
  me.body!.velocity.set(0, 0, 0);
}
export {};
