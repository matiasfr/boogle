// The glider on Needle Bell's summit. Setup half: pair with --action dev/look/evals/railway-glide-first-act.ts, which
// flies with real input during the real-time capture. The grant (Interact on the woken device, the card, the glide
// home to the forge apron; `__glideResult`):
//   npm run look -- --rail-seed q5-done --query glideTake=1 --eval dev/look/evals/railway-glide-first.ts \
//     --until window.__placeDone --action dev/look/evals/railway-glide-first-act.ts --video --seconds 40
// Piece A's flight checks in a room that has taken it (and, without --action, the restore: owned, no card):
//   npm run look -- --rail-seed glide-earned --eval dev/look/evals/railway-glide-first.ts --until window.__placeDone \
//     --action dev/look/evals/railway-glide-first-act.ts --video --seconds 14
const { stage } = (await import(
  '/dev/look/bots/railway-glide.ts' as string
)) as typeof import('../bots/railway-glide.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
background(stage(), 'stage the glider on the summit');
export {};
