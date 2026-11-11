// Run either half against an accepted host seed. No teleport, direct op or recovery.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { seaToFarHead } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
const { inspectRailwayLegacy } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
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
    if (!(await bot.until(() => inspectRailwayLegacy()?.ready && me.body && me.coyote > 0, 300000, 'B4 seed arrived')))
      throw new Error('B4 seed did not arrive');
    await seaToFarHead(
      {
        bot,
        checkpoint: async (beat) => {
          bot.note(beat);
          const state = inspectRailwayLegacy()!;
          console.log(
            `RAILWAY CHECKPOINT ${JSON.stringify({
              beat,
              tick: state.tick,
              hash: state.hash,
              line2: state.line2,
              line2View: state.line2View,
              position: me.body!.position,
              swimming: me.swimming,
            })}`,
          );
          if (query.get('railStop') !== beat) return;
          shot.__railStop = beat;
          if (!shot.__railPhoto) bot.finish(`B4 seeded ${from}: ${beat}; no recovery`);
          await new Promise<void>(() => {});
        },
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
