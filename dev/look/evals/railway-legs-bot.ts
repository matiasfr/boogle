// npm run playthrough -- --from ring-joined --to gorge
//  (the harness runs this bot: railFrom=legs with --rail-seed ring-joined, gorge-open or gorge-mid;
//   railStop ends at a named checkpoint: gorge reached)
// The greybox route's leg 1 (docs/plans/greybox-route.md, step 5) against an accepted host seed: ride out to Ring
// Island, take the kit and feed the frame, wait out each lay, ride on to each new railhead, and step off at High Gorge,
// through ordinary inputs and the prompts `railway-leg-take-logs`, `railway-leg-take-rails` and `railway-leg-feed`. No
// teleport, direct op or recovery.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { legRoute } = (await import(
  '/dev/look/bots/railway-legs.ts' as string
)) as typeof import('../bots/railway-legs.ts');
const { railCheckpoint } = (await import(
  '/dev/look/bots/railway-checkpoint.ts' as string
)) as typeof import('../bots/railway-checkpoint.ts');
const { RAIL_LEGS } = (await import(
  '/src/sim/railway-route.ts' as string
)) as typeof import('../../../src/sim/railway-route.ts');
const { legRow } = (await import(
  '/src/sim/railway-queries-route.ts' as string
)) as typeof import('../../../src/sim/railway-queries-route.ts');
const { railReady, rw } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const started = Date.now();
const bot = makeBot({
  recover: () => {
    throw new Error('the leg route requested forbidden recovery (a fall or a stuck bot)');
  },
});
const shot = window as Window & { __placeDone?: boolean };
setTimeout(() => window.__debugCam!.clear(), 100);
const facts = () => ({
  laid: legRow(rw(), 0).laid,
  fed: { logs: legRow(rw(), 0).logs, rails: legRow(rw(), 0).rails },
  sections: RAIL_LEGS[0]!.sections.length,
  seconds: Math.round((Date.now() - started) / 100) / 10,
});
background(
  (async () => {
    if (!(await railReady(300000)) || !(await bot.until(() => me.body && me.coyote > 0, 300000, 'Leg seed arrived')))
      throw new Error('Leg seed did not arrive');
    await legRoute({ bot, checkpoint: railCheckpoint(bot, 'Leg 1 seeded', facts) });
    bot.finish('Leg 1 played to High Gorge; no recovery');
  })().catch((error: unknown) => {
    bot.never(`Leg 1: ${error instanceof Error ? error.message : String(error)}`);
    shot.__placeDone = true; // End the warm-up; background reports the error, so capture health still fails.
    throw error;
  }),
  'Leg 1 real-input route',
);
export {};
