// Browser integration proof: npm run look -- --rail-seed works-lit --eval dev/look/evals/critter-quarry.ts
import type { InstancedMesh } from 'three/webgpu';
const { me } = (await import('/src/player/state.ts' as string)) as typeof import('../../../src/player/state.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/terrain.ts' as string)) as typeof import('../../../src/place/terrain.ts');
const { scene } = (await import(
  '/src/render/scene-graph.ts' as string
)) as typeof import('../../../src/render/scene-graph.ts');
const { setPlayerGraphics } = (await import(
  '/src/graphics-settings.ts' as string
)) as typeof import('../../../src/graphics-settings.ts');
function visit(x: number, z: number) {
  teleport(me.body!, x, H(x, z) + 1, z);
  me.body!.velocity.set(0, 0, 0);
}
async function expectPools(a: number, b: number) {
  const end = performance.now() + 10000;
  while (true) {
    const flock = scene.getObjectByName('quarry-flock') as InstancedMesh | undefined;
    const colony = scene.getObjectByName('quarry-colony') as InstancedMesh | undefined;
    if (
      a === 0
        ? !flock && !colony
        : flock?.count === a && colony?.count === b && (a !== 12 || (!flock.castShadow && !colony.castShadow))
    )
      break;
    if (performance.now() > end) throw Error('Unexpected Quarry pools ' + flock?.count + ' / ' + colony?.count);
    await new Promise((r) => setTimeout(r, 40));
  }
  console.log('PLAY Quarry pools ' + a + ' / ' + b);
}
await setPlayerGraphics('detail', 'full');
visit(1081, 41);
await expectPools(24, 36);
visit(899, 0);
await expectPools(0, 0);
visit(1081, 41);
await setPlayerGraphics('detail', 'lowest');
await expectPools(12, 18);
await setPlayerGraphics('detail', 'full');
await expectPools(24, 36);
export {};
