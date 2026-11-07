// Track-layer seats in the production railway, through the real-input bot (&ride=1&seat=1, dev/look/bots/railway.ts):
// it boards T1's layer, sits by Interact, rides the laying seated and stands up aboard. &railStop=<beat> holds that
// beat ('T1 seated', 'T1 seated laying', 'T1 seated ride completed', 'T1 stood up') on the game's follow camera,
// swung to the rider's rear quarter. With --players 2 each page shows its own rider and the friend's.
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { play } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const query = new URLSearchParams(location.search);
if (query.get('ride') !== '1' || query.get('seat') !== '1') throw new Error('railway-seats needs &ride=1&seat=1');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shot = window as Window & { __railStop?: string; __placeDone?: boolean };
background(play(), 'seated track-layer ride');
background(
  (async () => {
    const beat = query.get('railStop');
    if (!beat) return;
    while (!shot.__railStop) await wait(100);
    if (shot.__railStop !== beat) throw new Error(`Seat photo missed ${beat}`);
    // Hand the view back to the game's follow camera, swung to the rider's side, a little ahead: it moves with the deck.
    window.__debugCam!.clear();
    cam.yaw = me.yaw + 1.9;
    for (const panel of document.querySelectorAll<HTMLDivElement>('body > div'))
      if (panel.style.zIndex === '9999' && panel.style.whiteSpace === 'pre') panel.style.display = 'none';
    await wait(600);
    shot.__placeDone = true;
  })(),
  'frame the seated rider',
);
export {};
