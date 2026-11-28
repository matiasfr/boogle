/** Browser proof setup for dev/look/look.ts. Use --query habitat=ring with --rail-seed ring-joined for the exit. */
import type { InstancedMesh } from 'three';
const { railReady } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../../../dev/look/rail-read.ts');
const { me } = (await import('/src/player/state.ts' as string)) as typeof import('../../../src/player/state.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { CAMP_PAD } = (await import(
  '/src/place/works-landing.ts' as string
)) as typeof import('../../../src/place/works-landing.ts');
const { H } = (await import('/src/place/terrain.ts' as string)) as typeof import('../../../src/place/terrain.ts');
const { scene } = (await import(
  '/src/render/scene-graph.ts' as string
)) as typeof import('../../../src/render/scene-graph.ts');
if (!(await railReady())) throw Error('Railway not ready');
const visit = (x: number, y: number, z: number) => {
  teleport(me.body!, x, y, z);
  me.body!.velocity.set(0, 0, 0);
};
const settle = async (mounted: boolean) => {
  const deadline = performance.now() + 10000;
  while (Boolean((scene.getObjectByName('critter-home-school') as InstancedMesh | undefined)?.count) !== mounted) {
    if (performance.now() > deadline) throw Error('Home residency did not settle');
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
};
const habitat = new URLSearchParams(location.search).get('habitat');
const step = habitat === 'step' || habitat === 'step-low' ? 1 : 0;
const x = CAMP_PAD.x - step * Math.sin(CAMP_PAD.yaw),
  z = CAMP_PAD.z - step * Math.cos(CAMP_PAD.yaw);
visit(x, H(x, z) + 1, z);
await settle(true);
const pools = ['school', 'flock', 'swarm'];
const low = habitat === 'step-low';
const expected = low ? [20, 6, 19] : [40, 12, 38];
if (low) {
  const { setPlayerGraphics } = (await import(
    '/src/graphics-settings.ts' as string
  )) as typeof import('../../graphics-settings.ts');
  await setPlayerGraphics('detail', 'lowest');
  const deadline = performance.now() + 10000;
  while ((scene.getObjectByName('critter-home-school') as InstancedMesh)?.count !== 20) {
    if (performance.now() > deadline) throw Error('Detail change did not reach Home pools');
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}
for (const [i, name] of pools.entries()) {
  const pool = scene.getObjectByName('critter-home-' + name) as InstancedMesh;
  if (pool?.count !== expected[i]) throw Error('Unexpected population for ' + name + ': ' + pool?.count);
  if (low && pool.castShadow) throw Error('Shadow enabled on low Detail');
  for (let j = 0; j < pool.count; j++) {
    const a = pool.instanceMatrix.array;
    const x = a[j * 16 + 12]!,
      z = a[j * 16 + 14]!;
    if (Math.hypot(x - 900, z - 14) <= 42 || Math.hypot(x - CAMP_PAD.x, z - CAMP_PAD.z) < 8)
      throw Error('Clearance at ' + x + ', ' + z);
  }
  console.log('PLAY ' + name + ' ' + pool.count);
}
if (habitat === 'ring') {
  const { ringUnstuckHome: p } = (await import(
    '/src/entities/ring-island/state.ts' as string
  )) as typeof import('../../../src/entities/ring-island/state.ts');
  visit(p.x, p.y + 1, p.z);
  await settle(false);
  for (const name of pools)
    if (scene.getObjectByName('critter-home-' + name)) throw Error('Still present on Ring Island: ' + name);
  console.log('PLAY Ring Island: 0 instances, 0 drawable pools');
}
export {};
