// npm run look -- --real --rail-seed deck-laid --eval dev/look/evals/railway-ride-bot.ts --until window.__placeDone
// Accepted-seed return ride, ordinary inputs only. q6-done exercises the Pier terminal; deck-laid exercises its
// second platform: --real --rail-seed deck-laid --eval dev/look/evals/railway-ride-bot.ts --until window.__placeDone.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { line2Rides, HALT } = (await import(
  '/dev/look/bots/railway-ride.ts' as string
)) as typeof import('../bots/railway-ride.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const bot = makeBot({
  recover: () => {
    throw new Error('railway ride requested recovery');
  },
});
background(
  (async () => {
    if (!(await railReady())) throw new Error('railway ride never ready');
    const { ride } = line2Rides(bot);
    await ride(HALT.village2, 3);
    bot.note('Pier reached by train');
    await ride(HALT.pier, 0);
    bot.note('Village return completed');
    (window as Window & { __placeDone?: boolean }).__placeDone = true;
  })(),
  'railway return ride',
);
export {};
