// Run either half against an accepted host seed. No teleport, direct op or recovery. railFrom=glide (from
// --rail-seed q5-done) climbs Needle Bell from the village, takes the glider, glides home and plays on from the boiler.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { boilerToPier, glideHome } = (await import(
  '/dev/look/bots/railway.ts' as string
)) as typeof import('../bots/railway.ts');
const { railCheckpoint, line2Checkpoint } = (await import(
  '/dev/look/bots/railway-checkpoint.ts' as string
)) as typeof import('../bots/railway-checkpoint.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const query = new URLSearchParams(location.search);
const from = query.get('railFrom');
if (from !== 'boiler' && from !== 'q6' && from !== 'glide')
  throw new Error('B5-B8 seeded proof needs railFrom=boiler, railFrom=q6 or railFrom=glide');
const bot = makeBot({
  recover: () => {
    throw new Error('B5-B8 requested forbidden recovery');
  },
});
const shot = window as Window & { __railStop?: string; __placeDone?: boolean; __railPhoto?: boolean };
// look installs its default still camera after setup returns. Hook picking needs the player's follow camera.
setTimeout(() => window.__debugCam!.clear(), 100);
background(
  (async () => {
    if (!(await railReady(300000)) || !(await bot.until(() => me.body && me.coyote > 0, 300000, 'B5-B8 seed arrived')))
      throw new Error('B5-B8 seed did not arrive');
    const checkpoint = railCheckpoint(bot, `B5-B8 seeded ${from}`, () => ({ ...line2Checkpoint(), wall: Date.now() }));
    if (from === 'glide') {
      await glideHome({ bot, checkpoint }, 'village');
      await boilerToPier({ bot, checkpoint }, 'boiler');
    } else await boilerToPier({ bot, checkpoint }, from);
    bot.finish(`B5-B8 seeded ${from} to the pier; no recovery`);
  })().catch((error: unknown) => {
    bot.never(`B5-B8 seeded ${from}: ${error instanceof Error ? error.message : String(error)}`);
    shot.__placeDone = true; // End the warm-up; background reports the error, so capture health still fails.
    throw error;
  }),
  'B5-B8 seeded real-input route',
);
export {};
