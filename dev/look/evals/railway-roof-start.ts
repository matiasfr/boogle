// npm run look -- --rail-seed q6-stocked --eval dev/look/evals/railway-roof-start.ts --until window.__placeDone
// The production bot's planner from the roof of a parked train car at the Q6 halt (J4 long-run "BOT HEMMED").
// A car is a moving body, so the bot's static probe can't see it: standing 2 m up, every way down read as too far.
// Feet at 26.44 over the track bed (24.4) and the halt deck (25.02) used to give a one-node path; it must route off.
// node dev/look/look.ts --rail-seed q6-stocked --eval dev/look/evals/railway-roof-start.ts --until window.__placeDone
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const w = window as Window & { __placeDone?: boolean };
const bot = makeBot();
background(
  (async () => {
    if (!(await railReady(300000))) throw new Error('railway-roof-start: the railway never became ready');
    await bot.until(() => me.body && me.coyote > 0, 300000, 'seed arrived');
    // Beside the halt, on the track side of its platform edge (centre 1363.61, -163.53; lateral axis 0.519, 0.855).
    const x = 1363.39,
      z = -166.79;
    for (const feet of [25.34, 25.95, 26.44, 26.84]) {
      teleport(me.body!, x, feet + 0.4, z);
      me.coyote = 1; // standing on a car, as far as the game is concerned
      const r = await bot.plan(1368.8, -179.6, 1.1);
      console.log(`ROOF feet ${feet}: path ${r.path.length} arrives ${r.arrives}`);
      bot.check(`a plan off a roof with feet at ${feet} reaches the depot`, r.arrives && r.path.length > 2);
    }
    bot.finish('planned off every roof height');
    w.__placeDone = true;
  })(),
  'roof start probe',
);
export {};
