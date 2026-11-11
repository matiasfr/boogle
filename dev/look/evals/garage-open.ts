// The train garage (docs/brainstorms/engine-garage.md, first build): stand at the Roundhouse table's lever post under
// `?home=b` and press Interact through the real action, so the garage opens as a player opens it.
//   npm run look -- --rail-seed wagon-on --query 'home=b' --hud --eval dev/look/evals/garage-open.ts \
//     --action dev/look/evals/garage-act.ts --question "..."
// `?garage=<cat>/<part>` picks what is chosen on entry (default engine/long); `&hold=<ms>` holds Try it that long.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const home = (await import(
  '/src/place/home-station.ts' as string
)) as typeof import('../../../src/place/home-station.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = performance.now() + 60000;
while (!me.body || !me.entered) {
  if (performance.now() > deadline) throw new Error('garage look: the player did not become ready');
  await wait(100);
}
const rad = (d: number) => (d * Math.PI) / 180;
const post = {
  x: home.TABLE.x + 1000 + Math.sin(rad(60)) * 5.6,
  z: home.TABLE.z - Math.cos(rad(60)) * 5.6,
};
teleport(me.body!, post.x + 0.8, 19.2, post.z + 0.8);
await wait(1500);
triggerAction('interact', 'down');
triggerAction('interact', 'up');
const open = performance.now() + 8000;
while (!garage.api?.isOpen()) {
  if (performance.now() > open) throw new Error('garage look: Interact at the post did not open the garage');
  await wait(100);
}
await wait(900);
console.log('GARAGE open', JSON.stringify(garage.api.snap().cat));
export {};
