// timeout 360 npm run look -- --rail-seed house-ready --eval dev/look/evals/town-b2.ts --action dev/look/evals/town-b2-buy.ts --cam 896,25,23 --look 910,21,32 --hud --real --warm 1 --seconds 14 --frames 15 --video --name town-b2-build --wall 240
// Other shots: --query plotshot=hall|island|built|refused|ready|build; camera-only setup, no shared-state edits.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport, rayHit, raycastClosest } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { jumpOf } = (await import(
  '/src/world/railway-jump.ts' as string
)) as typeof import('../../../src/world/railway-jump.ts');
const { inspectTown } = (await import(
  '/src/entities/town/state.ts' as string
)) as typeof import('../../../src/entities/town/state.ts');
const { townPlotBoard } = (await import(
  '/src/place/town-plan.ts' as string
)) as typeof import('../../../src/place/town-plan.ts');
const { createPosePolicy } = (await import(
  '/src/place/pose.ts' as string
)) as typeof import('../../../src/place/pose.ts');
const { H } = (await import('/src/place/terrain.ts' as string)) as typeof import('../../../src/place/terrain.ts');
const policy = createPosePolicy(
  H,
  () => true,
  () => false,
  { rayHit, raycastClosest },
);
console.log(
  'TOWN B2 landing probes',
  JSON.stringify(
    [
      { name: 'old-ready', x: 904.6, y: 18, z: 35.2 },
      { name: 'old-built', x: 884.993, y: 18, z: 20.076 },
      { name: 'ready-clear', x: 904.6, y: 18, z: 33.4 },
      { name: 'built-clear', x: 890, y: H(890, 22), z: 22 },
    ].map((p) => ({ ...p, ground: H(p.x, p.z), surface: policy.surfaceAt(p.x, p.y, p.z) })),
  ),
);
const shot = new URLSearchParams(location.search).get('plotshot') ?? 'ready';
const land = jumpOf(shot === 'built' ? 'house-built' : 'house-ready')!.land!;
let x = land.x,
  z = land.z,
  y = land.y;
if (shot === 'hall') {
  x = 906.3;
  z = 10.5;
  y = 18;
}
if (shot === 'island') {
  x = 929.71;
  z = 3.8;
  y = 18.62;
}
if (shot === 'probe') {
  x = 890;
  z = 22;
  y = H(x, z);
}
if (shot === 'refused') {
  const b = townPlotBoard(1);
  x = b.x + 1000;
  z = b.z - 1.8;
  window.__debugCam!.set = () => {}; // Keep the player's camera: the prompt projects through it.
}
teleport(me.body!, x, y + 0.9, z);
me.body!.velocity.set(0, 0, 0);
cam.yaw = me.yaw = shot === 'refused' ? Math.PI : (land.yaw ?? 0);
if (shot === 'build') {
  window.__debugCam!.clear();
  window.__debugCam!.set = () => {};
  cam.yaw = me.yaw = -2.076;
  cam.dist = 10;
  cam.pitch = -0.3;
}
setTimeout(
  () =>
    console.log(
      'TOWN B2 settled',
      JSON.stringify({ shot, position: me.body?.position, surface: policy.surfaceAt(x, y, z) }),
    ),
  1800,
);
console.log('TOWN B2 landing', JSON.stringify({ shot, land, actual: { x, y, z }, plots: inspectTown()?.plots }));
export {};

const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
setTimeout(
  () =>
    console.log(
      'TOWN B2 prompt',
      JSON.stringify({
        id: interactTarget()?.id,
        blocked: interactTarget()?.blocked,
        text: document.querySelector('.prompt')?.textContent,
      }),
    ),
  1800,
);
