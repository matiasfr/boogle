// npm run look -- --real --rail-seed deck-laid --eval dev/look/evals/railway-ride-bot.ts --until window.__placeDone
// Accepted-seed return ride, ordinary inputs only. q6-done exercises the Pier terminal; deck-laid exercises its
// second platform: --real --rail-seed deck-laid --eval dev/look/evals/railway-ride-bot.ts --until window.__placeDone.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { line2Rides, HALT } = (await import(
  '/dev/look/bots/railway-ride.ts' as string
)) as typeof import('../bots/railway-ride.ts');
const { railReady, line2Completed, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const bot = makeBot({
  recover: () => {
    throw new Error('railway ride requested recovery');
  },
});
setTimeout(() => window.__debugCam?.clear(), 100);
background(
  (async () => {
    if (!(await railReady())) throw new Error('railway ride never ready');
    const { ride, view, check } = line2Rides(bot);
    const pier = await ride(HALT.village2, 3);
    const homeward = view().halts[HALT.pier]!.lever.find((l) => l.on && l.dir === -1);
    if (line2Completed(rw()) >= 7) {
      check(pier.row().track === 1 && homeward?.platform === 'up', 'Q7 Pier arrival serves the west homeward platform');
    }
    console.log(`RIDE PIER ${JSON.stringify({ row: pier.row(), homeward })}`);
    bot.note('Pier reached by train');
    await ride(HALT.pier, 0);
    bot.note('Village return completed');
    const h = view().halts[HALT.village2]!;
    window.__debugCam?.set([h.x + 12, h.y + 12, h.z + 12], [h.x, h.y + 1, h.z]);
    (window as Window & { __placeDone?: boolean }).__placeDone = true;
  })(),
  'railway return ride',
);
export {};
