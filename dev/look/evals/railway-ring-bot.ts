// npm run playthrough -- --from gap-footed --to ring-ride
//  (the harness runs this bot: railFrom=ring with --rail-seed gap-footed or leaf-raised; railStop ends at a checkpoint)
// Ring Island's part of the route against an accepted host seed (docs/plans/ring-island-build1.md, R5): `railFrom=ring`
// with `--rail-seed gap-footed` or `leaf-raised`; `railStop` ends at a named checkpoint. No teleport, direct op or
// recovery. Through the harness: npm run playthrough -- --from gap-footed --to ring-ride
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { ringIslandRoute } = (await import(
  '/dev/look/bots/railway-ring.ts' as string
)) as typeof import('../bots/railway-ring.ts');
const { railCheckpoint } = (await import(
  '/dev/look/bots/railway-checkpoint.ts' as string
)) as typeof import('../bots/railway-checkpoint.ts');
const { aperture, railReady, rw, ringOpen } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const started = Date.now();
const bot = makeBot({
  recover: () => {
    throw new Error('Ring Island requested forbidden recovery (a fall or a stuck bot)');
  },
});
const shot = window as Window & { __placeDone?: boolean };
setTimeout(() => window.__debugCam!.clear(), 100);
background(
  (async () => {
    if (!(await railReady(300000)) || !(await bot.until(() => me.body && me.coyote > 0, 300000, 'Ring seed arrived')))
      throw new Error('Ring seed did not arrive');
    await ringIslandRoute({
      bot,
      checkpoint: railCheckpoint(bot, 'Ring Island seeded', () => ({
        ring: { ...aperture(rw()), ...ringOpen(rw()) },
        seconds: Math.round((Date.now() - started) / 100) / 10,
      })),
    });
    bot.finish('Ring Island seeded to the island halt; no recovery');
  })().catch((error: unknown) => {
    bot.never(`Ring Island seeded: ${error instanceof Error ? error.message : String(error)}`);
    shot.__placeDone = true; // End the warm-up; background reports the error, so capture health still fails.
    throw error;
  }),
  'Ring Island seeded real-input route',
);
export {};
