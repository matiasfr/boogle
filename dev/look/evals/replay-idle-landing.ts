// Restore the path-opened checkpoint, then reproduce the failed co-op idle pose.
// Staged diagnostic only: its recovery probes cannot count as a route pass.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { diagnoseLanding, landingEvidence } = (await import(
  '/dev/look/bots/place-landing.ts' as string
)) as typeof import('../bots/place-landing.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { gettingItem, press } = (await import(
  '/src/proto/place/got.ts' as string
)) as typeof import('../../../src/proto/place/got.ts');
const bot = makeBot();
const dismiss = setInterval(() => {
  if (gettingItem()) press();
}, 250);
try {
  await bot.wait(3000);
  teleport(me.body!, 976.9396362304688, 30.750547409057617, -92.01862335205078);
  me.body!.velocity.set(0, 0, 0);
  await bot.wait(45000);
  console.log('IDLE SUPPORT ' + JSON.stringify(landingEvidence()));
  const result = await diagnoseLanding(bot);
  console.log(
    'IDLE JUMP ' +
      JSON.stringify({
        rise: result.jump.rise,
        coyote: result.failed.coyote,
        support: result.failed.support,
        walks: result.walks.map((w) => w.metres),
      }),
  );
} finally {
  clearInterval(dismiss);
}
export {};
