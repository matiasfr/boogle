// The glider's first flight from Needle Bell's summit, in a dev test room that grants the fact. Setup half: pair with
// --action dev/look/evals/railway-glide-first-act.ts, which flies with real input during the real-time capture.
//   npm run look -- --rail-seed q5-done --query railGlide=1 --eval dev/look/evals/railway-glide-first.ts \
//     --until window.__placeDone --action dev/look/evals/railway-glide-first-act.ts --video --seconds 14
const { stage } = (await import(
  '/dev/look/bots/railway-glide.ts' as string
)) as typeof import('../bots/railway-glide.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
background(stage(), 'stage the glider on the summit');
export {};
