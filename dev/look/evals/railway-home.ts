// npm run playthrough -- --query 'railStop=path%20walked%20home' --eval dev/look/evals/railway-home.ts
// command: playthrough, not look: it plays the bot to the checkpoint first
// A targeted played checkpoint, not a full-route proof: the same bot earns the path before the still.
// playthrough --query 'railStop=path%20walked%20home' --eval dev/look/evals/railway-home.ts
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { play } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shot = window as Window & { __railStop?: string; __placeDone?: boolean };
if (new URLSearchParams(location.search).get('railStop') !== 'path walked home')
  throw new Error('Home capture requires the played path walked home checkpoint');
background(play(), 'played railway home capture');
background(
  (async () => {
    while (!shot.__railStop) await wait(100);
    if (shot.__railStop !== 'path walked home') throw new Error('Home capture missed its expected checkpoint');
    window.__debugCam!.set([918, 27, 15], [939, 20, -12], 65);
    await wait(600);
    console.log('RAILWAY PHOTO reached the village through real inputs; full route proof is separate');
    shot.__placeDone = true;
  })(),
  'frame the played home checkpoint',
);
export {};
