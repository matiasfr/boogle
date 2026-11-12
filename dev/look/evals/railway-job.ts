// npm run playthrough -- --eval dev/look/evals/railway-job.ts --query 'shot=play'
//  (the default bot file for playthrough; it sets window.__placeDone; add --players 2 for two)
// The production entry's real-input first-path proof.
const flags = (await import('/src/proto/flags.ts' as string)) as typeof import('../../../src/proto/flags.ts');
if (!flags.productionRailway) throw new Error('Railway proof needs the default entry; omit ?proto=');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { play } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
background(play(), 'production line-one playthrough');
export {};
