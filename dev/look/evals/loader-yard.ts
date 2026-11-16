// npm run look -- --rail-seed yard-built --eval dev/look/evals/loader-yard.ts --query yardshot=arm --warm 2 --seconds 2 --name loader-yard-coloured
// Camera-only L1/V2 evidence; accepted --rail-seed supplies all progression. No row edits.
// --query yardshot=hall|island|yard|arm|bill|jump|load|pier; load/pier use --until window.__loaderReady.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/terrain.ts' as string)) as typeof import('../../../src/place/terrain.ts');
const { inspectRailway, railReady, railAt, rw, trains } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { trainArrives } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { jumpOf } = (await import(
  '/src/world/railway-jump.ts' as string
)) as typeof import('../../../src/world/railway-jump.ts');
if (!(await railReady()) || !me.body) throw new Error('loader evidence: room not ready');
const mode = new URLSearchParams(location.search).get('yardshot') ?? 'arm';
const poses: Record<
  string,
  { body: [number, number]; camera: [number, number, number]; aim: [number, number, number] }
> = {
  hall: { body: [901, 24], camera: [904, 24, 24], aim: [883, 20, 39] },
  island: { body: [930, 4], camera: [937, 27, -2], aim: [890, 21, 40] },
  yard: { body: [899, 32], camera: [900, 23, 30], aim: [893, 21, 43] },
  bill: { body: [1084, 45], camera: [1080, 27.5, 41], aim: [1088, 25.3, 49.5] },
  arm: { body: [1084, 45], camera: [1099, 29, 41], aim: [1088, 26, 49] },
  load: { body: [1084, 45], camera: [1072, 38, 65], aim: [1082, 25, 43] },
  pier: { body: [1399.7, -356], camera: [1384, 36, -345], aim: [1400, 25, -353] },
};
const shot = window as Window & { __loaderReady?: boolean };
if (mode === 'jump') {
  const p = jumpOf('yard-wagon')!.land!;
  teleport(me.body, p.x, p.y + 0.9, p.z);
  cam.yaw = me.yaw = p.yaw ?? 0;
  cam.pitch = -0.25;
  cam.dist = 7;
  window.__debugCam!.clear();
  window.__debugCam!.set = () => {};
  console.log('LOADER landing', JSON.stringify(p));
} else {
  const p = poses[mode];
  if (!p) throw new Error('loader evidence: unknown shot');
  teleport(me.body, p.body[0], mode === 'pier' ? 26 : H(...p.body) + 0.9, p.body[1]);
  me.body.velocity.set(0, 0, 0);
  const frame = () => window.__debugCam!.set(p.camera, p.aim, mode === 'load' ? 60 : 55);
  frame();
  setTimeout(frame, 100);
}
if (mode === 'load' || mode === 'pier') {
  const timer = setInterval(() => {
    const row = trains(rw()).find(
      (r) =>
        !r.wagon &&
        r.slot > 0 &&
        r.phase === 1 &&
        r.to === (mode === 'load' ? 1 : 3) &&
        r.track === 0 &&
        (mode !== 'pier' || r.foot > 0) &&
        trainArrives(r, 1) - railAt() < (mode === 'load' ? 15 : 50),
    );
    if (!row) return;
    shot.__loaderReady = true;
    console.log('LOADER ready', JSON.stringify({ mode, tick: railAt(), row }));
    clearInterval(timer);
  }, 25);
} else shot.__loaderReady = true;
setTimeout(() => {
  const view = inspectRailway();
  console.log(
    'LOADER view',
    JSON.stringify({ tick: railAt(), works: view?.worksView, rows: trains(rw()), position: me.body?.position }),
  );
}, 2000);
export {};
