// npm run look -- --query 'ride=1&seat=1&railStop=T1%20seated' --eval dev/look/evals/railway-seats.ts --until window.__railStop
//  (railStop=T1 seated|T1 seated laying|T1 seated ride completed|T1 stood up; --players 2 shows both riders)
// Track-layer seats in the production railway, through the real-input bot (&ride=1&seat=1, dev/look/bots/railway.ts):
// it boards T1's layer, sits by Interact, rides the laying seated and stands up aboard. &railStop=<beat> holds that
// beat ('T1 seated', 'T1 seated laying', 'T1 seated ride completed', 'T1 stood up') on the game's follow camera,
// swung to the rider's rear quarter. With --players 2 each page shows its own rider and the friend's.
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { play } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const query = new URLSearchParams(location.search);
if (query.get('ride') !== '1') throw new Error('railway-seats needs &ride=1 (&seat=1 to sit)');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shot = window as Window & { __railStop?: string; __placeDone?: boolean };
background(play(), 'seated track-layer ride');
background(
  (async () => {
    const beat = query.get('railStop');
    if (!beat) return;
    while (!shot.__railStop) await wait(100);
    if (shot.__railStop !== beat) throw new Error(`Seat photo missed ${beat}`);
    // &railCam=<deg>[,<m>]: a frozen camera <m> metres (default 3) from the rider, <deg> round from straight in front of
    // them (90 is square on one side, -90 the other, 180 behind), a little above their hips. Holds the beat's still deck.
    await wait(Number(query.get('railWait')) || 0); // &railWait=<ms>: let the game run on at the beat first (hands board once laying starts)
    const rail = query.get('railCam');
    const at = query.get('railAt')?.split(',').map(Number);
    if (at?.length === 6) {
      // &railAt=cx,cy,cz,lx,ly,lz: camera and look-at offsets (m) from the machine's centre, for a still of the empty chairs.
      const { inspectRailway } = (await import(
        '/src/entities/railway/state.ts' as string
      )) as typeof import('../../../src/entities/railway/state.ts');
      const aim = () => {
        const m = inspectRailway()!.machine;
        // Line 1's beats only: from Q7 on the machine is out of the scene (line2-view.ts `stowed`), nothing to frame.
        if (m.y < -30) throw new Error('railAt: the track layer is stowed (Q7 laid); no chairs to frame');
        window.__debugCam!.set([m.x + at[0]!, m.y + at[1]!, m.z + at[2]!], [m.x + at[3]!, m.y + at[4]!, m.z + at[5]!]);
      };
      aim();
      setInterval(aim, 16);
    } else if (rail) {
      const [deg, dist = '3'] = rail.split(',');
      // Re-aimed every 16 ms, so a later capture (the two-player look run, which shoots after the warm-up) finds the rider.
      const aim = () => {
        const a = me.avatar!.rotation.y + (Number(deg) * Math.PI) / 180;
        const p = me.body!.position;
        window.__debugCam!.set(
          [p.x - Math.sin(a) * Number(dist), p.y + 0.5, p.z - Math.cos(a) * Number(dist)],
          [p.x, p.y - 0.25, p.z],
        );
      };
      aim();
      setInterval(aim, 16);
    } else {
      // Hand the view back to the game's follow camera, swung to the rider's side, a little ahead: it moves with the deck.
      window.__debugCam!.clear();
      cam.yaw = me.yaw + 1.9;
    }
    for (const panel of document.querySelectorAll<HTMLDivElement>('body > div'))
      if (panel.style.zIndex === '9999' && panel.style.whiteSpace === 'pre') panel.style.display = 'none';
    await wait(600);
    shot.__placeDone = true;
  })(),
  'frame the seated rider',
);
export {};
