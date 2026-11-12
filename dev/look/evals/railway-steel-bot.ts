// npm run playthrough -- --from ring-joined --to boiler-long
//  (the harness runs this bot: railFrom=steel with --rail-seed ring-joined, steel-kit, steel-lit or steel-home;
//   railStop ends at a named checkpoint: steel-lit|steel-home|boiler-long)
// Ring Island build 2's part of the route against an accepted host seed (docs/plans/ring-island-build2.md, R5): ride out
// to the island, take and feed the kit, bring the steel home and hold the Install, through ordinary inputs and the
// prompts `railway-steel-take-logs`, `railway-steel-take-rails`, `railway-steel-feed` and `railway-install`. No
// teleport, direct op or recovery.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { steelRoute } = (await import(
  '/dev/look/bots/railway-steel.ts' as string
)) as typeof import('../bots/railway-steel.ts');
const { railCheckpoint } = (await import(
  '/dev/look/bots/railway-checkpoint.ts' as string
)) as typeof import('../bots/railway-checkpoint.ts');
const { LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { LINE_SLOTS } = (await import(
  '/src/sim/railway-trains.ts' as string
)) as typeof import('../../../src/sim/railway-trains.ts');
const { line, railReady, rw, shed, steel, train } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const started = Date.now();
const bot = makeBot({
  recover: () => {
    throw new Error('the steel route requested forbidden recovery (a fall or a stuck bot)');
  },
});
const shot = window as Window & { __placeDone?: boolean };
setTimeout(() => window.__debugCam!.clear(), 100);
const facts = () => ({
  steel: { ...steel(rw()) },
  shed: shed(rw()).steel,
  boiler: line(rw(), LINE2).boiler,
  trains: LINE_SLOTS[LINE2]!.map((slot) => train(rw(), slot).boiler),
  seconds: Math.round((Date.now() - started) / 100) / 10,
});
background(
  (async () => {
    if (!(await railReady(300000)) || !(await bot.until(() => me.body && me.coyote > 0, 300000, 'Steel seed arrived')))
      throw new Error('Steel seed did not arrive');
    await steelRoute({ bot, checkpoint: railCheckpoint(bot, 'Steel seeded', facts) });
    // The route's last beat: every line 2 train wears the longer boiler once the install has been adopted at the Village.
    bot.finish('Steel seeded to the longer boiler; no recovery');
  })().catch((error: unknown) => {
    bot.never(`Steel seeded: ${error instanceof Error ? error.message : String(error)}`);
    shot.__placeDone = true; // End the warm-up; background reports the error, so capture health still fails.
    throw error;
  }),
  'Steel seeded real-input route',
);
export {};
