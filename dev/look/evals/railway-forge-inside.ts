// Inside the finished forge's workshop (town-layout step 4a): stand in the doorway just inside the front wall and look
// at the furnace and the chair. From `--rail-seed q1-done` (forge lit, so finished).
// npm run look -- --rail-seed q1-done --eval dev/look/evals/railway-forge-inside.ts --cam <set by the eval>
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
background(
  (async () => {
    while (!me.body || !inspectRailway()?.ready) await new Promise((r) => setTimeout(r, 100));
    teleport(me.body!, 910.3, 19.5, -0.8);
    me.body!.velocity.set(0, 0, 0);
    await new Promise((r) => setTimeout(r, 1500));
    window.__debugCam?.set([909.4, 20.8, -5.2], [913.2, 19.1, 0.4], 75);
  })(),
  'forge inside',
);
export {};
