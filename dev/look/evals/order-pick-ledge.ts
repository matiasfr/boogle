// npm run look -- --rail-seed t1-jump-first --real --query "shot=play&ledge=lookout" --eval dev/look/evals/order-pick-ledge.ts --hud --name a3-lookout
// Position the player on the approach ground. Only movement inputs can take them onto the ledge.
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { ORIGIN } = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const { padById } = (await import(
  '/src/place/tech-layout.ts' as string
)) as typeof import('../../../src/place/tech-layout.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');
const { pressJump, releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(ok: () => unknown, label: string, timeout = 6000) {
  const end = performance.now() + timeout;
  while (!ok()) {
    if (performance.now() > end)
      throw new Error(`${label}: feet ${me.body ? me.body.position.y - PLAYER_R : 'absent'}`);
    await wait(16);
  }
}
await until(() => R.railRead()?.ready() && me.body, 'arrival', 60000);
const id = new URLSearchParams(location.search).get('ledge');
if (id !== 'alcove' && id !== 'lookout' && id !== 'apron') throw new Error('Choose an order-pick ledge');
if (!R.rail(R.rw()).jump || R.rail(R.rw()).pack || R.railStation(1).start >= 0)
  throw new Error('Expected jump first before T2');
const pad = padById(id),
  x = ORIGIN.x + pad.x,
  z = pad.z;
const dx = id === 'lookout' ? pad.hx + 1.4 : 0;
const dz = id === 'apron' ? pad.hz + 1.4 : id === 'alcove' ? -pad.hz - 1.4 : 0;
const body = me.body!;
teleport(body, x + dx, H(x + dx, z + dz) + PLAYER_R + 0.5, z + dz);
body.velocity.set(0, 0, 0);
me.yaw = cam.yaw = Math.atan2(dx, dz);
await wait(800);
const feet = () => body.position.y - PLAYER_R;
if (me.swimming || me.coyote <= 0 || feet() >= pad.top) throw new Error(`${id}: approach is not lower dry ground`);
const used = R.inspectRailway()!.reward.tools.jumps;
try {
  pressJump();
  await until(() => me.coyote <= 0 && body.velocity.y > 0, 'first jump');
  await until(() => body.velocity.y < 1.5, 'first apex');
  releaseJump();
  input.keys.add('KeyW');
  pressJump();
  await until(() => R.inspectRailway()!.reward.tools.jumps > used, 'air jump');
  await until(
    () => Math.abs(body.position.x - x) < pad.hx - 0.4 && Math.abs(body.position.z - z) < pad.hz - 0.4,
    'over the pad',
  );
} finally {
  releaseJump();
  input.keys.delete('KeyW');
}
await until(() => me.coyote > 0 && !me.swimming && Math.abs(feet() - pad.top) < 0.35, 'landed on pad');
if (id === 'apron') {
  await until(() => interactTarget()?.id === 'railway-quarry-lever', 'lever prompt');
  triggerAction('interact', 'down');
  triggerAction('interact', 'up');
  await wait(800);
  if (R.rail(R.rw()).lever || R.line2GateOpen(R.rw())) throw new Error('early lever opened gate');
}
console.log(`PLAY ${id}: landed at ${feet().toFixed(2)} before T2`);
window.__debugCam!.set = () => {};
export {};
