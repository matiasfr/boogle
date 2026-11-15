// npm run look -- --real --query dev=1 --size 2208x1281 --warm 0 --eval dev/look/evals/detail-switch.ts --action dev/look/evals/detail-switch-action.ts --cam 1028,49,-117 --look 1000,31,-144 --name detail-switch --seconds 5 --frames 20 --video
// Move the player into the measured view so its shadow frustum covers the timber camp.
const { me } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { setGraphics } = (await import(
  '/src/graphics-settings.ts' as string
)) as typeof import('../../../src/graphics-settings.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
if (!me.body) throw new Error('Detail capture needs a spawned player');
teleport(me.body, 1000, 32, -144);
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
background(
  (async () => {
    await wait(1000);
    await setGraphics('detail', 'shadows');
    await wait(1000);
    await setGraphics('detail', 'sea');
    await wait(1000);
    await setGraphics('detail', 'shadows');
    await wait(1000);
    await setGraphics('detail', 'sea');
  })(),
  'Detail switch capture',
);
export {};
