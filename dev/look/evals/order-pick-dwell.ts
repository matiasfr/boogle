// npm run look -- --rail-seed t1-last-log --players 2 --warp-speed 2 --size 540x338 --hud --eval dev/look/evals/order-pick-dwell.ts --query "shot=play&pick=jump&beat=card" --frames 2 --seconds 0.2 --warm 0
// Stand in the unchosen stand throughout construction, the card and the walk away.
const params = new URLSearchParams(location.search);
if (params.get('player') !== '2') {
  await import('/dev/look/evals/order-pick.ts' as string);
} else {
  const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
  const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
  const { teleport } = (await import(
    '/src/physics/engine.ts' as string
  )) as typeof import('../../../src/physics/engine.ts');
  const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
  const { inspectRailway } = (await import(
    '/src/entities/railway/state.ts' as string
  )) as typeof import('../../../src/entities/railway/state.ts');
  const { fallArrival } = (await import(
    '/src/fall/arrival.ts' as string
  )) as typeof import('../../../src/fall/arrival.ts');
  const { LINE1_PICK_STANDS } = (await import(
    '/src/sim/railway-line-layout.ts' as string
  )) as typeof import('../../../src/sim/railway-line-layout.ts');
  const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  async function until(check: () => unknown, label: string) {
    const end = performance.now() + 60000;
    while (!check()) {
      if (performance.now() > end) throw Error('Timed out at ' + label);
      await pause(50);
    }
  }
  await until(() => inspectRailway() && me.body && !fallArrival.active, 'arrival');
  const x = LINE1_PICK_STANDS.pack.x / 100,
    z = LINE1_PICK_STANDS.pack.z / 100;
  teleport(me.body!, x, H(x, z) + 0.9, z);
  await until(() => inspectRailway()?.reward.arrival.cards.includes('jump'), 'partner jump card');
  if (Math.hypot(me.body!.position.x - x, me.body!.position.z - z) > 0.25) throw Error('Dwelling player was pushed');
  const packs: import('three/webgpu').Object3D[] = [];
  scene.traverse((o) => {
    if (o.type === 'Mesh' && o.scale.x === 2.4 && Math.hypot(o.position.x - x, o.position.z - z) < 0.01) packs.push(o);
  });
  if (packs.length !== 1) throw Error('Expected one pack at the unchosen stand');
  const pack = packs[0]!;
  await pause(2300);
  for (const edge of ['keydown', 'keyup'])
    window.dispatchEvent(new KeyboardEvent(edge, { code: 'KeyE', bubbles: true }));
  await until(() => Math.hypot(pack.position.x - x, pack.position.z - z) > 2, 'pack carried away');
  if (!pack.visible) throw Error('Carried pack is invisible on the dwelling partner');
}
export {};
