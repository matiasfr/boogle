// Run either Split-rock half against an accepted host seed (docs/plans/split-rock-roundhouse.md, J5e):
// `railFrom=works` with `--rail-seed works-arrive`, `railFrom=wagon` with `--rail-seed wagon-on`; `railStop` ends at a
// named checkpoint. No teleport, direct op or recovery.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { splitRockToCrossing } = (await import(
  '/dev/look/bots/railway-works.ts' as string
)) as typeof import('../bots/railway-works.ts');
const { inspectRailway, railAt, railRead, rw, shed, trains, works, worksStage } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const query = new URLSearchParams(location.search);
const from = query.get('railFrom');
if (from !== 'works' && from !== 'wagon')
  throw new Error('Split-rock seeded proof needs railFrom=works or railFrom=wagon');
const started = Date.now();
const bot = makeBot({
  recover: () => {
    throw new Error('Split-rock requested forbidden recovery');
  },
});
const shot = window as Window & { __railStop?: string; __placeDone?: boolean; __railPhoto?: boolean };
setTimeout(() => window.__debugCam!.clear(), 100);
background(
  (async () => {
    if (!(await bot.until(() => railRead()?.ready() && me.body && me.coyote > 0, 300000, 'Split-rock seed arrived')))
      throw new Error('Split-rock seed did not arrive');
    const want = from === 'works' ? 'breaker' : 'wagon';
    if (!(await bot.until(() => worksStage(rw()) === want, 30000, `seed at stage ${want}`)))
      throw new Error(`Split-rock seed is at ${worksStage(rw())}, not ${want}`);
    await splitRockToCrossing(
      {
        bot,
        checkpoint: async (beat) => {
          bot.note(beat);
          const w = rw();
          console.log(
            `RAILWAY CHECKPOINT ${JSON.stringify({
              beat,
              tick: railAt(),
              hash: railRead()!.debug().hash,
              works: works(w),
              stage: worksStage(w),
              shed: shed(w),
              trains: trains(w),
              crossingView: inspectRailway()!.crossingView,
              wall: Date.now(),
              seconds: Math.round((Date.now() - started) / 100) / 10,
              position: me.body!.position,
              swimming: me.swimming,
            })}`,
          );
          if (query.get('railStop') !== beat) return;
          shot.__railStop = beat;
          if (!shot.__railPhoto) bot.finish(`Split-rock seeded ${from}: ${beat}; no recovery`);
          await new Promise<void>(() => {});
        },
      },
      from,
    );
    bot.finish(`Split-rock seeded ${from} to the crossing; no recovery`);
  })().catch((error: unknown) => {
    bot.never(`Split-rock seeded ${from}: ${error instanceof Error ? error.message : String(error)}`);
    shot.__placeDone = true;
    throw error;
  }),
  'Split-rock seeded real-input route',
);
export {};
