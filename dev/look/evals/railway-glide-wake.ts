// The summit glider waking on Q5's live edge (glider piece B): from --rail-seed q5-finishing, wait for Q5 to finish in
// the page, then for the device to unfurl, before the still. Pass the camera with --cam/--look.
//   npm run look -- --rail-seed q5-finishing --eval dev/look/evals/railway-glide-wake.ts --until window.__placeDone \
//     --cam 1379,27.5,-180 --look 1016,120,-8.8 --name glide-woken
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const page = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (ready: () => boolean, label: string, timeout: number) => {
  const end = performance.now() + timeout;
  while (!ready()) {
    if (performance.now() > end) throw new Error(`GLIDE WAKE timed out: ${label}`);
    await wait(50);
  }
};
await until(() => !!inspectRailway()?.ready && !!me.body, 'railway mounted', 60000);
const read = () => inspectRailway()!;
if (read().line2.completed >= 5)
  throw new Error('GLIDE WAKE needs a live q5-finishing seed, not a restored completion');
if (read().line2View.glideDevice.woken) throw new Error('GLIDE WAKE the device is woken before Q5');
await until(() => read().line2.completed >= 5, 'Q5 finishes live', 120000);
await until(() => read().line2View.glideDevice.woken, 'the device wakes on the live edge', 5000);
await until(() => !read().line2View.glideDevice.unfurling, 'the vane finishes unfurling', 5000);
await wait(600);
console.log(`GLIDE WAKE ${JSON.stringify(read().line2View.glideDevice)}`);
page.__placeDone = true;
export {};
