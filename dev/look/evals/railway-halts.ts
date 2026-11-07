// The stations' platforms (halts.ts) at the two places the level check found them against line 2's rails: a still of each from
// the same state. Uses the tester's "Skip to trains" (window.__place, so no `&fresh=1`), which lays both lines and builds the
// halts; the platform code is the same one the default game builds when trains come.
// node dev/look/playthrough.ts --name halts-after --query 'proto=place' --eval dev/look/evals/railway-halts.ts
type Shot = { name: string; camera: [number, number, number]; target: [number, number, number] };
const shots: Shot[] = [
  // Line 2's village platform, at the end where the line bends toward it (rails at 0.5 m, sleepers to 1.15 m).
  { name: 'halt-village2', camera: [934, 24, 42], target: [936.5, 18.8, 31.6] },
  // The quarry platform, where line 2 swings toward it before the quarry's bend.
  { name: 'halt-quarry', camera: [1064, 31, 25], target: [1068.8, 24.5, 38.8] },
];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const w = window as Window & { __placeDone?: boolean; __shotList?: Shot[]; __place?: { skipTrains(): void } };
void (async () => {
  while (!w.__place) await wait(100);
  w.__place.skipTrains();
  await wait(4000);
  w.__shotList = shots;
  w.__placeDone = true;
})();
export {};
