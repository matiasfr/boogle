// npm run look -- --rail-seed house-ready --eval dev/look/evals/town-b2.ts --action dev/look/evals/town-b2-buy.ts --query plotshot=build --hud --real --warm 5 --seconds 14 --frames 15 --video --name town-b2-build-final-r2 --wall 240
// Real Interact press/hold; no direct buy or fixture mutation. Called after warm-up, while the recording runs.
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { inspectTown } = (await import(
  '/src/entities/town/state.ts' as string
)) as typeof import('../../../src/entities/town/state.ts');
const { railwayWorldRead } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
if (interactTarget()?.id !== 'town.plot.0' || !interactTarget()?.run)
  throw new Error(`B2 wrong target: ${interactTarget()?.id}`);
triggerAction('interact', 'down');
setTimeout(() => triggerAction('interact', 'up'), 1600);
let n = 0;
const timer = setInterval(() => {
  console.log(
    'TOWN B2 construction',
    JSON.stringify({ tick: railwayWorldRead()?.tick(), plots: inspectTown()?.plots }),
  );
  if (++n >= 14) {
    clearInterval(timer);
    if (inspectTown()?.plots[0]?.state !== 'done') throw new Error('B2 house did not finish');
  }
}, 1000);
export {};
