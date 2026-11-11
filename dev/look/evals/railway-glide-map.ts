// The halts' map displays marking the waiting glider (woken, untaken) on Needle Bell's summit. From --rail-seed
// trains-on (halts up, glider untaken): waits for the halts to stand and logs every display face and the mark, so
// the next run can frame one with --cam/--look.
//   npm run look -- --rail-seed trains-on --eval dev/look/evals/railway-glide-map.ts --until window.__placeDone \
//     --cam <face + 1.2 m out> --look <face> --name glide-map
const { inspectRailway, railReady } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const page = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (ready: () => boolean, label: string, timeout: number) => {
  const end = performance.now() + timeout;
  while (!ready()) {
    if (performance.now() > end) throw new Error(`GLIDE MAP timed out: ${label}`);
    await wait(50);
  }
};
if (!(await railReady(60000))) throw new Error('GLIDE MAP timed out: railway mounted');
background(
  (async () => {
    // The halts' fields ride in line2View at run time (view.ts) but not in its declared type.
    type Halts = {
      halts: { name: string; x: number; y: number; z: number; up: boolean }[];
      boardFaces: { on: boolean; c: number[]; out: number[] }[];
      boardGlider: boolean;
    };
    const view = () => inspectRailway()!.line2View as unknown as Halts;
    await until(() => view().halts.some((h) => h.up) && view().boardFaces.some((f) => f.on), 'halts up', 30000);
    await wait(1500);
    console.log(`GLIDE MAP mark=${view().boardGlider} faces=${JSON.stringify(view().boardFaces)}`);
    console.log(`GLIDE MAP halts=${JSON.stringify(view().halts.map((h) => [h.name, h.x, h.y, h.z]))}`);
    page.__placeDone = true;
  })(),
  'wait for the halts and log their displays',
);
export {};
