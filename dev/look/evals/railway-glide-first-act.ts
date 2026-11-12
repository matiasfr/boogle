// npm run look -- --rail-seed q5-done --query glideTake=1 --eval dev/look/evals/railway-glide-first.ts --until window.__placeDone --action dev/look/evals/railway-glide-first-act.ts --video --seconds 14
// The flying half of railway-glide-first.ts: walk off the summit and fly, all through real input.
const { fly } = (await import(
  '/dev/look/bots/railway-glide.ts' as string
)) as typeof import('../bots/railway-glide.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
background(fly(), 'fly the glider off the summit');
export {};
