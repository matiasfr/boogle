// npm run look -- --rail-seed q4-done --eval dev/look/evals/railway-b4-bot.ts --query 'shot=play&railFrom=sea&railStop=sea gate' --until window.__railStop
//  (the bot half; dev/look/evals/railway-photo.ts imports it for railFrom=sea)
// Run either half against an accepted host seed. No teleport, direct op or recovery.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { seaToFarHead } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
const { railCheckpoint, line2Checkpoint } = (await import(
  '/dev/look/bots/railway-checkpoint.ts' as string
)) as typeof import('../bots/railway-checkpoint.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const query = new URLSearchParams(location.search);
const from = query.get('railFrom');
if (from !== 'sea' && from !== 'q5') throw new Error('B4 seeded proof needs railFrom=sea or railFrom=q5');
const bot = makeBot({
  recover: () => {
    throw new Error('B4 requested forbidden recovery');
  },
});
const shot = window as Window & { __railStop?: string; __placeDone?: boolean; __railPhoto?: boolean };
// look installs its default still camera after setup returns. Hook picking needs the player's follow camera.
setTimeout(() => window.__debugCam!.clear(), 100);
background(
  (async () => {
    if (!(await railReady(300000)) || !(await bot.until(() => me.body && me.coyote > 0, 300000, 'B4 seed arrived')))
      throw new Error('B4 seed did not arrive');
    await seaToFarHead(
      {
        bot,
        checkpoint: railCheckpoint(bot, `B4 seeded ${from}`, line2Checkpoint),
      },
      from,
    );
    bot.finish(`B4 seeded ${from} to Far Head; no recovery`);
  })().catch((error: unknown) => {
    bot.never(`B4 seeded ${from}: ${error instanceof Error ? error.message : String(error)}`);
    shot.__placeDone = true; // End the warm-up; background reports the error, so capture health still fails.
    throw error;
  }),
  'B4 seeded real-input route',
);
export {};
