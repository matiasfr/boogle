// command: unknown, needs the seed and the --until expression that re-attaches after the real reload (see railway-reload.ts for the pattern); player 2 is the helper, so --players 2 --real
// Existing look eval/until mechanism re-enters after a real page reload.
const { startHookReload } = (await import(
  '/dev/look/bots/railway.ts' as string
)) as typeof import('../bots/railway.ts');
const helper = new URLSearchParams(location.search).get('player') === '2';
if (helper && !document.documentElement.dataset.railwayHookReload) {
  // --until imports this module too; pageScript's first evaluation must not start a second helper bot.
  document.documentElement.dataset.railwayHookReload = 'helper';
  const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
  const { play } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
  const { inspectRailway } = (await import(
    '/src/entities/railway/state.ts' as string
  )) as typeof import('../../../src/entities/railway/state.ts');
  background(play(), 'hook reload helper');
  background(
    (async () => {
      while (!inspectRailway()?.hookShot.owned) await new Promise<void>((resolve) => setTimeout(resolve, 100));
      document.documentElement.dataset.railwayHookReload = 'done';
    })(),
    'observe the helper unlock',
  );
} else if (!helper) startHookReload();
export {};
