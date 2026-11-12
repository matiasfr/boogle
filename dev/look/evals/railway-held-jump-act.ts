// npm run look -- --rail-seed q5-done --eval dev/look/evals/railway-held-jump.ts --until window.__placeDone --action dev/look/evals/railway-held-jump-act.ts --video --seconds 9
// Action half of railway-held-jump.ts: jump, air jump while still rising, and hold Jump for six seconds.
const { hold } = (await import(
  '/dev/look/bots/railway-held-jump.ts' as string
)) as typeof import('../bots/railway-held-jump.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
background(hold(), 'double jump and hold Jump');
export {};
