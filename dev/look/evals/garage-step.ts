// Action half of garage-open.ts: steps the garage's selection through a list, as a player pressing through the tiles,
// so a real-time capture shows what each choice changes in the picture (the camera's ease, the chosen part's frame,
// a ghost car where it rides).
//   npm run look -- --rail-seed wagon-on --hud --video --seconds 8 --eval dev/look/evals/garage-open.ts \
//     --action dev/look/evals/garage-step.ts --query "steps=cargo/kitcar,cargo/wagon,cargo/steelcar,cargo/cradle"
// `&steps=<cat>/<part>,...` (default: the Cargo tiles in order); `&every=<ms>` between steps (default 1500).
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
type Cat = import('../../../src/entities/railway/garage-data.ts').CatId;
type PartId = import('../../../src/entities/railway/garage-data.ts').PartId;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const query = new URLSearchParams(location.search);
const steps = (query.get('steps') ?? 'cargo/kitcar,cargo/wagon,cargo/steelcar,cargo/cradle').split(',');
const every = Number(query.get('every') ?? 1500);
window.__debugCam?.clear();
const api = garage.api!;
// Not awaited to the end: the capture samples while it steps.
void (async () => {
  for (const step of steps) {
    const [cat, part] = step.split('/') as [Cat, PartId];
    api.choose(cat, part);
    console.log('GARAGE step', step, JSON.stringify({ t: Math.round(performance.now()) }));
    await wait(every);
  }
})();
export {};
