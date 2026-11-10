// Setup half of the held-jump check (dev/look/bots/railway-held-jump.ts has the commands): stand still, camera side-on.
const { stage } = (await import(
  '/dev/look/bots/railway-held-jump.ts' as string
)) as typeof import('../bots/railway-held-jump.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
background(stage(), 'stage the held jump');
export {};
