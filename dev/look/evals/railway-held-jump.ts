// npm run look -- --rail-seed q5-done --eval dev/look/evals/railway-held-jump.ts --until window.__placeDone --action dev/look/evals/railway-held-jump-act.ts --video --seconds 9
// Setup half of the held-jump check (dev/look/bots/railway-held-jump.ts has the commands): stand still, camera side-on.
const { stage } = (await import(
  '/dev/look/bots/railway-held-jump.ts' as string
)) as typeof import('../bots/railway-held-jump.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
background(stage(), 'stage the held jump');
export {};
