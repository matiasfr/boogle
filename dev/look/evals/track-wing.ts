// ?layer=wing greybox probe and camera (docs/brainstorms/track-layers-double.md, "Wing greybox").
// --query 'proto=place&layer=wing&wingView=sheet|park|out|cross|side|probe[&wingLine=2][&wingHead=80|&wingPark=178]'.
// sheet: eye height, ~13 m off the front quarter on the down side, following the flatbed; park/side: closer and far stills.
const q = new URLSearchParams(location.search);
const view = q.get('wingView') ?? 'sheet';
const place = window.__place as unknown as {
  skipDelivery(): void;
  skipLine2(): void;
  skipHead(): void;
  skipQ5(): void;
  machine: { flatbed: { platform: unknown; hy: number }; wingStats: Record<string, number> };
  run: { mode: string; head: number; line: { spec: { id: string; dir: number } } };
};
const { fromPlatform } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { BOTTOM } = (await import(
  '/src/entities/railway/car.ts' as string
)) as typeof import('../../../src/entities/railway/car.ts');
const { machine, run } = place;
const car = machine.flatbed;
const pose = { x: 0, y: 0, z: 0, yaw: 0 };
const log = (tag: string) =>
  console.log(
    'WING ' +
      tag +
      ' ' +
      JSON.stringify({ mode: run.mode, head: +run.head.toFixed(1), line: run.line.spec.id, ...machine.wingStats }),
  );
if (q.get('wingLine') === '2') place.skipLine2();
if (q.get('wingLine') === 'head') place.skipHead();
if (q.get('wingLine') === 'q5') place.skipQ5();
place.skipDelivery();
const rail = -(BOTTOM + car.hy);
const camera = () => {
  const side = machine.wingStats.side || (run.line.spec.dir > 0 ? 1 : -1);
  const eyes: Record<string, [number, number, number]> = {
    sheet: [-side * 9.5, rail + 1.6, 9.5],
    park: [-side * 7, rail + 1.7, 7],
    out: [side * 11, rail + 1.7, 5],
    cross: [-side * 7, rail + 9, -7],
    side: [-side * 50, rail + 14, 2],
    probe: [-side * 9.5, rail + 1.6, 9.5],
  };
  const eyeAt = eyes[view]!;
  const target: [number, number, number] = view === 'side' ? [side * 2.5, rail + 1.8, 0] : view === 'cross' ? [side * 1.5, rail, 9] : view === 'park' || view === 'out' ? [side * 2.5, rail + 2.4, 3] : [side * 2.5, rail + 2.2, 3.2];
  fromPlatform(car.platform as never, { x: eyeAt[0], y: eyeAt[1], z: eyeAt[2], yaw: 0 }, true, pose);
  const eye: [number, number, number] = [pose.x, pose.y, pose.z];
  fromPlatform(car.platform as never, { x: target[0], y: target[1], z: target[2], yaw: 0 }, true, pose);
  window.__debugCam!.set(eye, [pose.x, pose.y, pose.z], view === 'side' ? 20 : view === 'sheet' ? 38 : 55);
};
camera();
setInterval(camera, 30);
// Feed each stretch as it ends and flag `window.__wingReady` once the head reaches `wingHead` (metres along the line,
// as the run counts it); pair with `--until "window.__wingReady"` so the warm-up runs warped to there.
const target = q.has('wingHead') ? Number(q.get('wingHead')) : null;
const park = q.has('wingPark') ? Number(q.get('wingPark')) : null; // stand with the head here (an idle stop)
const idles = new Set<number>();
setInterval(() => {
  if (run.mode === 'idle') {
    if (!idles.has(Math.round(run.head))) log('idle');
    idles.add(Math.round(run.head));
    if (park !== null && Math.abs(run.head - park) < 0.5) (window as unknown as { __wingReady: boolean }).__wingReady = true;
    else place.skipDelivery();
  }
  const dir = run.line.spec.dir;
  if (target !== null && run.mode === 'laying' && (dir > 0 ? run.head >= target : run.head <= target))
    (window as unknown as { __wingReady: boolean }).__wingReady = true;
}, 100);
log('start');
export {};
