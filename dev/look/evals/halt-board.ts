// npm run look -- --rail-seed stack-laid-2 --eval dev/look/evals/halt-board.ts --query 'board=3' \
//   --until 'window.__boardReady && window.__trainOnLeg()' --name map-laid-2
// One halt map display, face on (docs/plans/greybox-route.md, leg 1 step 4b): `board` is its index in
// halt-map.ts's haltDisplays (0 Village, 1 Camp, 2 Village line 2, 3 Quarry, 4 Far Head, 5 Pier, then the stack line's
// three heads and High Gorge: 6 to 9), `boarddist` the camera's distance from the face in metres (1.05). Stands your
// body 1.4 m behind the camera (a staging teleport), so whatever is resident by distance is there.
// `window.__trainOnLeg()` is whether a line 2 train is past Ring Island's platforms now. Prints the map's stage and
// every line 2 train's metres along.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { inspectRailway, railRead, rw, railAt, train, trainStops } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { trainAlong, TRAIN_PHASE } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { LINE_SLOTS } = (await import(
  '/src/sim/railway-trains.ts' as string
)) as typeof import('../../../src/sim/railway-trains.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const query = new URLSearchParams(location.search);
const index = Number(query.get('board') ?? 0),
  dist = Number(query.get('boarddist') ?? 1.05);
type Face = { on: boolean; c: [number, number, number]; out: [number, number] };
const faces = () => (inspectRailway()?.line2View as unknown as { boardFaces?: Face[] } | undefined)?.boardFaces;
const deadline = performance.now() + 60000;
while (!me.body || !me.entered || !railRead()?.whole() || !faces()?.[index]) {
  if (performance.now() > deadline) throw new Error('halt-board: the player, the railway or the display never came');
  await wait(100);
}
const face = faces()![index]!;
const [x, y, z] = face.c,
  [ox, oz] = face.out;
const frame = () => {
  window.__debugCam!.set([x + ox * dist, y, z + oz * dist], [x, y, z], 50);
  teleport(me.body!, x + ox * (dist + 1.4), y - 0.3, z + oz * (dist + 1.4));
  me.body!.velocity.set(0, 0, 0);
};
frame();
setInterval(frame, 100);
const along = () =>
  LINE_SLOTS[1]!.map((k) => {
    const r = train(rw(), k);
    return r.phase === TRAIN_PHASE.SHED ? null : Math.round(trainAlong(r, 1, railAt()) / 100);
  });
const page = window as unknown as { __boardReady: boolean; __trainOnLeg: () => boolean };
page.__trainOnLeg = () => along().some((s) => s !== null && s > 1260);
await wait(600);
console.log(
  'BOARD',
  JSON.stringify({
    index,
    on: faces()![index]!.on,
    at: face.c.map((n) => +n.toFixed(1)),
    stops: trainStops(rw(), 1).length,
    trains: along(),
  }),
);
page.__boardReady = true;
export {};
