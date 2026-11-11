// A player walks the furnished workshop with the real colliders: in at the door, to the furnace's mouth lane, to the
// stool's exit spot, to the bench, and back out of the door. Each leg prints `PLAY walk <leg> ok|FAILED` with how close
// it got. From `--rail-seed q1-done` (forge lit, so finished).
// npm run look -- --rail-seed q1-done --eval dev/look/evals/railway-forge-walk.ts --until window.__walkDone
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { X, Z, forgePlan } = (await import(
  '/src/place/opening-plans.ts' as string
)) as typeof import('../../../src/place/opening-plans.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const floor = forgePlan().y + 0.5;
background(
  (async () => {
    if (!(await railReady())) throw new Error('railway-forge-walk: the railway never became ready');
    while (!me.body) await new Promise((r) => setTimeout(r, 100));
    teleport(me.body!, X - 2.9, floor + 3, Z + 10);
    await new Promise((r) => setTimeout(r, 1500));
    const bot = makeBot();
    const legs: [string, number, number][] = [
      ['door', -2.9, 3.2],
      ['furnace mouth', 0, 1.9],
      ['stool exit', 2.7, 1.4],
      ['bench', 1, -2.3],
      ['rails corner', -3.8, 1.7],
      ['chimney hearth', -3.6, -1.3],
      ['out the door', -2.9, 8],
    ];
    let failed = 0;
    for (const [name, x, z] of legs) {
      const ok = await bot.walk(X + x, Z + z, 0.6, { limit: 60000 });
      const p = me.body!.position;
      console.log(
        `PLAY walk ${name} ${ok ? 'ok' : 'FAILED'} at (${(p.x - X).toFixed(1)}, ${(p.z - Z).toFixed(1)}) wanted (${x}, ${z})`,
      );
      if (!ok) failed++;
    }
    console.log(`PLAY walk ${failed ? failed + ' legs FAILED' : 'all legs ok'}`);
    (window as Window & { __walkDone?: boolean }).__walkDone = true;
  })(),
  'forge walk',
);
export {};
