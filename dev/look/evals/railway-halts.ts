// The stations' platforms (halts.ts) at the two places the level check found them against line 2's rails, from the
// accepted trains-on server save (both lines laid, the halts built):
//   npm run look -- --rail-seed trains-on --query 'halt=village2' --eval dev/look/evals/railway-halts.ts \
//     --until window.__haltReady --question "..."        (halt=quarry for the other)
const shots: Record<string, { camera: [number, number, number]; target: [number, number, number] }> = {
  // Line 2's village platform, at the end where the line bends toward it (rails at 0.5 m, sleepers to 1.15 m).
  village2: { camera: [934, 24, 42], target: [936.5, 18.8, 31.6] },
  // The quarry platform, where line 2 swings toward it before the quarry's bend.
  quarry: { camera: [1064, 31, 25], target: [1068.8, 24.5, 38.8] },
};
const halt = new URLSearchParams(location.search).get('halt') ?? 'village2';
const shot = shots[halt];
if (!shot) throw new Error(`railway-halts: halt=${Object.keys(shots).join('|')}`);
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
if (!(await railReady())) throw new Error('railway-halts: the railway never became ready');
const frame = () => window.__debugCam!.set(shot.camera, shot.target, 65);
frame();
setInterval(frame, 100);
(window as unknown as { __haltReady: boolean }).__haltReady = true;
export {};
