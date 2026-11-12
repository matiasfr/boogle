// One played checkpoint, then a still of every place a timber deck or walkway meets the laid track (dev/level/timber-track.ts
// finds them): the bot earns the state through real inputs, parks, and `playthrough` takes one still per entry in
// `window.__shotList` before its own final one.
// node dev/look/playthrough.ts --name clips-after --query 'shot=play&railStop=hook%20taken' --eval dev/look/evals/railway-clips.ts
// (`--root <checkout>` plays another build, for the before set.)
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { play } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
type Shot = { name: string; camera: [number, number, number]; target: [number, number, number] };
const shots: Shot[] = [
  // Line 1's walking approaches beside the parked machine, from the grass side (rails at 0.5 m, sleepers to 1.15 m).
  { name: 'approach-s14', camera: [934.5, 22.5, 8.5], target: [928.3, 18.3, 2.4] },
  { name: 'approach-s30', camera: [945.2, 22.5, -3.5], target: [939, 18.3, -9.5] },
  // Route v2's hook walk where it leaves the trestle deck at Q2.
  { name: 'hook-walk-start', camera: [1003, 26, 38], target: [998.3, 21.3, 27] },
  { name: 'hook-walk-wide', camera: [1016, 31, 42], target: [999, 22, 22] },
  // The jump pillar's lip, meeting line 1's trestle.
  { name: 'p1-lip', camera: [970.5, 31, -62], target: [961.9, 26.4, -66.7] },
  // The hook's return pad beside line 2's trestle.
  { name: 'stack-return', camera: [1331.5, 30, -128], target: [1325.8, 24.3, -136] },
];
const beat = new URLSearchParams(location.search).get('railStop') ?? '';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shot = window as Window & { __railStop?: string; __placeDone?: boolean; __shotList?: Shot[] };
background(play(), 'played railway clips');
background(
  (async () => {
    while (!shot.__railStop) await wait(100);
    if (shot.__railStop !== beat) throw new Error(`Railway clips missed ${beat}`);
    for (const panel of document.querySelectorAll<HTMLDivElement>('body > div'))
      if (panel.style.zIndex === '9999' && panel.style.whiteSpace === 'pre') panel.style.display = 'none';
    shot.__shotList = shots;
    console.log(`RAILWAY CLIPS ${beat} reached through real inputs`);
    shot.__placeDone = true;
  })(),
  'frame the clip spots',
);
export {};
