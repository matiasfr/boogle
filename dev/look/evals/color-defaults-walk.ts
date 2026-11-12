// command: unknown, needs a pose: a --real run with --eval of this file (it walks SHORE_PATH with makeBot and sets __debugCam; no doc or bot calls it)
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { SHORE_PATH } = (await import(
  '/src/place/shore-layout.ts' as string
)) as typeof import('../../../src/place/shore-layout.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { exposureSettings } = (await import(
  '/src/render/exposure.ts' as string
)) as typeof import('../../../src/render/exposure.ts');
const began = performance.now(),
  bot = makeBot();
window.__debugCam!.clear();
background(
  (async () => {
    for (const [x, z] of SHORE_PATH.slice(1)) await bot.walk(1000 + x, z, 1.5, { limit: 15000 });
    await bot.walk(892.5, 12, 0.5, { limit: 15000 });
    console.log(
      'COLOUR DOORWAY ' +
        JSON.stringify({ seconds: (performance.now() - began) / 1000, position: me.body?.position, exposureSettings }),
    );
    await new Promise((r) => setTimeout(r, 2000));
    await bot.walk(924.5, -14, 0.7, { limit: 20000 });
    console.log(
      'COLOUR WALK END ' + JSON.stringify({ seconds: (performance.now() - began) / 1000, position: me.body?.position }),
    );
  })(),
  'colour defaults shore doorway shade walk',
);
export {};
