// Frame a checkpoint reached by the existing real-input bot; this does not restore or seed shared progress.
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { play } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
type Frame = { camera: [number, number, number]; target: [number, number, number] };
const frames: Record<string, Frame> = {
  'T2 laid': { camera: [989, 41, -137], target: [976, 30, -116] },
  'T3 laid': { camera: [1002, 47, -86], target: [971, 29, -85] },
  'T3 beam carried': { camera: [1007, 35, -133], target: [995, 31, -134] },
  'T3 helped beam carried': { camera: [1003, 37, -122], target: [990, 31, -131] },
  'path walked home': { camera: [918, 27, 15], target: [939, 20, -12] },
};
const beat = new URLSearchParams(location.search).get('railStop') ?? '';
const frame = frames[beat];
if (!frame) throw new Error(`Choose a played railway photo: ${Object.keys(frames).join(', ')}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shot = window as Window & { __railStop?: string; __placeDone?: boolean };
background(play(), 'played railway photo');
background(
  (async () => {
    while (!shot.__railStop) await wait(100);
    if (shot.__railStop !== beat) throw new Error(`Railway photo missed ${beat}`);
    window.__debugCam!.set(frame.camera, frame.target, 65);
    // Hide only makeBot's diagnostic note panel; the console/report retains every note.
    for (const panel of document.querySelectorAll<HTMLDivElement>('body > div'))
      if (panel.style.zIndex === '9999' && panel.style.whiteSpace === 'pre') panel.style.display = 'none';
    await wait(600);
    console.log(`RAILWAY PHOTO ${beat} reached through real inputs; full route proof is separate`);
    shot.__placeDone = true;
  })(),
  'frame the played railway checkpoint',
);
export {};
