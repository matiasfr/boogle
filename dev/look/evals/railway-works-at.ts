// J2 poses, plus a no-jump walk through the real colliders. Works on a fresh world; with --rail-seed (look's seeded
// room, look-rail) it first waits for the accepted Works state, then prints the adapter's `works` and `shed`.
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/proto/place/land.ts' as string)) as typeof import('../../../src/proto/place/land.ts');
const { WORKS_WALK } = (await import(
  '/src/entities/railway/works-shape.ts' as string
)) as typeof import('../../../src/entities/railway/works-shape.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = performance.now() + 20000;
while (!inspectRailway()?.ready && performance.now() < deadline) await wait(50);
if (!inspectRailway()?.ready || !me.body) throw new Error('Works view not ready');
const query = new URLSearchParams(location.search),
  mode = query.get('worksat') ?? 'halt';
if (query.get('room') === 'look-rail') {
  const seeded = performance.now() + 15000;
  while ((inspectRailway()?.works.stage ?? 'dormant') === 'dormant' && performance.now() < seeded) await wait(50);
  if (inspectRailway()?.works.stage === 'dormant') console.log('WORKS seed: still dormant (a seed before Q6?)');
}
const poses: Record<
  string,
  { body: [number, number]; camera: [number, number, number]; aim: [number, number, number] }
> = {
  halt: { body: [1081.3, 41.1], camera: [1078, 29, 35], aim: [1119, 28, 82] },
  ledge: { body: [1164, 124], camera: [1171, 26, 131], aim: [1156, 24, 116] },
  bowl: { body: [1140, 102], camera: [1146, 29, 110], aim: [1128, 27, 87] },
  stall: { body: [903, 14], camera: [901, 23, 11], aim: [909.5, 20, 18.5] },
  table: { body: [920, 14], camera: [923, 25, 8], aim: [909.5, 20, 20.5] },
  pier: { body: [1405, -366], camera: [1412, 31, -352], aim: [1403, 24, -390] },
};
const pose = poses[mode];
if (!pose) throw new Error('Choose worksat=halt|ledge|bowl|stall|table|pier');
const shot = window as Window & { __worksPrepared?: boolean; __worksWalkDone?: boolean };
const action = !!shot.__worksPrepared;
if (!action) {
  teleport(me.body, pose.body[0], H(...pose.body) + 0.85, pose.body[1]);
  me.body.velocity.set(0, 0, 0);
}
cam.yaw = me.yaw = Math.atan2(-(pose.aim[0] - pose.body[0]), -(pose.aim[2] - pose.body[1]));
cam.pitch = -0.12;
const frame = () => window.__debugCam!.set(pose.camera, pose.aim, 65);
frame();
setTimeout(frame, 100);
shot.__worksPrepared = true;
{
  const state = inspectRailway()!;
  console.log(`WORKS pose ${mode} ${JSON.stringify({ works: state.works, shed: state.shed, foot: state.foot })}`);
  const view = state as typeof state & { worksView?: unknown; shedView?: unknown };
  console.log(`WORKS view ${JSON.stringify({ works: view.worksView, shed: view.shedView })}`);
}
if (query.get('workswalk') === '1' && action) {
  const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
  const bot = makeBot({
    recover: () => {
      throw new Error('Works walk required recovery');
    },
  });
  // Guard the existing bot's hop assistance. Any attempted jump fails this proof instead of silently helping it.
  const jump = Object.getOwnPropertyDescriptor(me, 'jumpQueued');
  let queued = me.jumpQueued;
  Object.defineProperty(me, 'jumpQueued', {
    configurable: true,
    get: () => queued,
    set: (value: number) => {
      if (value > 0) throw new Error('Works walk attempted a jump');
      queued = value;
    },
  });
  try {
    for (const p of WORKS_WALK.slice(1))
      if (!(await bot.straight(p.x, p.z, 0.25, 30000))) throw new Error(`Works walk missed ${JSON.stringify(p)}`);
    shot.__worksWalkDone = true;
    console.log(`WORKS WALK ARRIVED ${JSON.stringify(me.body.position)} no jumps, no recovery`);
    window.__debugCam!.set(poses.bowl!.camera, poses.bowl!.aim, 65);
  } finally {
    if (jump) Object.defineProperty(me, 'jumpQueued', jump);
  }
}
if (query.get('worksperf') === '1') {
  await wait(3000);
  const { renderer } = (await import(
    '/src/render/scene.ts' as string
  )) as typeof import('../../../src/render/scene.ts');
  const { hardwareTiming, observeGpu } = (await import(
    '/src/debug/prof-overlay.ts' as string
  )) as typeof import('../../../src/debug/prof-overlay.ts');
  const observer = await observeGpu();
  try {
    const timing = await hardwareTiming(5);
    console.log(
      `WORKS PERF ${JSON.stringify({ calls: renderer.info.render.drawCalls, tris: renderer.info.render.triangles, measurement: observer.snapshot(), timing })}`,
    );
  } finally {
    observer.stop();
  }
}
// Measurement waits also run before look's default pose; reapply after setup returns in that case.
if (query.get('worksperf') === '1') setTimeout(frame, 100);
export {};
