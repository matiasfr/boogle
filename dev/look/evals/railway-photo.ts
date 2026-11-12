// command: unknown, needs the railFrom/railStop pair: --query 'shot=play&railFrom=<seed stage>&railStop=<checkpoint>' (docs/plans/line2-b4.md C3 passes railFrom=sea&railStop=sea gate through the bot halves it imports)
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
  'forge lit': { camera: [930, 27, 14], target: [912, 20, -4] },
  'Q1 laid': { camera: [918, 30, 32], target: [945, 19, 25] },
  'Q2 laid': { camera: [1085, 33, 64], target: [1098, 26, 43] },
  'hook taken': { camera: [1018, 31, 25], target: [1000, 34, 0] },
  'needle bell summit': { camera: [1040, 117, 3], target: [1014, 102.4, -6] },
  'early lever does nothing': { camera: [1088, 31, 56], target: [1098, 26.5, 42] },
  'Q3 laid': { camera: [1085, 33, 64], target: [1098, 26, 43] },
  'quarry gate open': { camera: [1078, 34, 52], target: [1092, 25, 38] },
  'sea gate': { camera: [983, 120, 25], target: [1090, 62, -18] },
  'Q5 laid': { camera: [1150, 42, -10], target: [1260, 25, -88] },
  'Far Head': { camera: [1385, 44, -188], target: [1220, 25, -58] },
  boiler: { camera: [928, 25, 14], target: [919, 20, 5.4] },
  TRAINS: { camera: [1023, 38, -137], target: [1009, 32, -149] },
  'Q6 laid': { camera: [1365, 39, -155], target: [1402, 25, -368] },
  pier: { camera: [1402, 34, -348], target: [1402, 27, -700] },
  // Split-rock (J5f): through the cut from the quarry halt; the stall with its shunter and wagon; the footing wagon
  // coupled behind line 2's train at the village; and the bents from the pier head toward Ring Island.
  'throat open': { camera: [1078, 29, 35], target: [1121, 26, 84] },
  'stall built': { camera: [923, 25, 8], target: [909.5, 20, 20.5] },
  'wagon coupled': { camera: [936, 25, 31], target: [924, 19.5, 16] },
  'crossing footed': { camera: [1408, 33, -372], target: [1404, 2, -470] },
};
const beat = new URLSearchParams(location.search).get('railStop') ?? '';
const frame = frames[beat];
if (!frame) throw new Error(`Choose a played railway photo: ${Object.keys(frames).join(', ')}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shot = window as Window & { __railStop?: string; __placeDone?: boolean; __railPhoto?: boolean };
setTimeout(() => window.__debugCam!.clear(), 100);
if (new URLSearchParams(location.search).has('railFrom')) {
  shot.__railPhoto = true;
  const from = new URLSearchParams(location.search).get('railFrom');
  if (from === 'boiler' || from === 'q6') await import('/dev/look/evals/railway-b5b8-bot.ts' as string);
  else if (from === 'works' || from === 'wagon') await import('/dev/look/evals/railway-works-bot.ts' as string);
  else await import('/dev/look/evals/railway-b4-bot.ts' as string);
} else background(play(), 'played railway photo');
background(
  (async () => {
    while (!shot.__railStop) await wait(100);
    if (shot.__railStop !== beat) throw new Error(`Railway photo missed ${beat}`);
    window.__debugCam!.set(frame.camera, frame.target, 65);
    // The train leaves as the wagon couples, so this frame rides with it: from beside and behind the wagon,
    // along the train (the static frame above is only where it starts).
    if (beat === 'wagon coupled') {
      type Pose = { x: number; y: number; z: number };
      const { inspectRailway } = (await import(
        '/src/entities/railway/state.ts' as string
      )) as typeof import('../../../src/entities/railway/state.ts');
      const follow = () => {
        const train = (inspectRailway() as unknown as { line2View?: { trains: { wagon?: Pose; cars: Pose[] }[] } })
          .line2View?.trains[1];
        const w = train?.wagon,
          head = train?.cars[2];
        if (!w || !head) return;
        const d = Math.hypot(head.x - w.x, head.z - w.z) || 1,
          fx = (head.x - w.x) / d,
          fz = (head.z - w.z) / d;
        window.__debugCam!.set(
          [w.x - fz * 7 - fx * 5, w.y + 4.5, w.z + fx * 7 - fz * 5],
          [w.x + fx * 4, w.y + 0.6, w.z + fz * 4],
          65,
        );
      };
      follow();
      setInterval(follow, 30);
    }
    // Hide only makeBot's diagnostic note panel; the console/report retains every note.
    for (const panel of document.querySelectorAll<HTMLDivElement>('body > div'))
      if (panel.style.zIndex === '9999' && panel.style.whiteSpace === 'pre') panel.style.display = 'none';
    for (const panel of document.querySelectorAll<HTMLElement>('body > section'))
      if (panel.querySelector('button')?.textContent === 'Measure 5 seconds') panel.style.display = 'none';
    await wait(600);
    console.log(`RAILWAY PHOTO ${beat} reached through real inputs; full route proof is separate`);
    shot.__placeDone = true;
  })(),
  'frame the played railway checkpoint',
);
export {};
