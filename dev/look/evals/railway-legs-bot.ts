// npm run playthrough -- --from ring-joined --to gorge
//  (or --from gorge-reached --to bay, --from bay-reached --to canopy, --from canopy-reached --to port)
//  (the harness runs this bot: railFrom=legs with a leg seed; railStop ends at a named checkpoint: gorge reached, bay
//   reached, canopy home, port home)
// The greybox route's built legs (dev/look/bots/railway-legs.ts) against an accepted host seed: ride out to each frame,
// take the kit and feed it, wait out each lay, ride on to each new railhead, press the pickups and barriers, through
// ordinary inputs and the legs' prompts. No teleport, direct op or recovery.
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
const { legOpen, legRow, legsLaid } = (await import(
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
/** The open leg, or the last one laid once none is open. */
const legNow = () => {
  const w = rw(),
    open = RAIL_LEGS.findIndex((_l, k) => legOpen(w, k));
  return open >= 0 ? open : legsLaid(w).findLastIndex((n) => n > 0);
};
const facts = () => {
  const k = legNow(),
    row = legRow(rw(), k);
  return {
    leg: RAIL_LEGS[k]!.id,
    laid: row.laid,
    fed: { logs: row.logs, rails: row.rails },
    sections: RAIL_LEGS[k]!.sections.length,
    seconds: Math.round((Date.now() - started) / 100) / 10,
  };
};
background(
  (async () => {
    if (!(await railReady(300000)) || !(await bot.until(() => me.body && me.coyote > 0, 300000, 'Leg seed arrived')))
      throw new Error('Leg seed did not arrive');
    await legRoute({ bot, checkpoint: railCheckpoint(bot, 'Legs seeded', facts) });
    bot.finish('Greybox legs segment complete; no recovery');
  })().catch((error: unknown) => {
    bot.never(`Legs: ${error instanceof Error ? error.message : String(error)}`);
    shot.__placeDone = true; // End the warm-up; background reports the error, so capture health still fails.
    throw error;
  }),
  'Greybox legs real-input route',
);
export {};
