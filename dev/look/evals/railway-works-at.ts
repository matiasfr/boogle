// npm run look -- --rail-seed <seed> --eval dev/look/evals/railway-works-at.ts --query 'worksat=<pose>'
//  (poses: halt ledge bowl stall table turn pier forge kiln throat rack call callmid callnear crossing pierhead bents wagon; pierhead needs crossing-finishing; a fresh world needs no seed; workswalk=1 walks the colliders)
// J2 poses, plus a no-jump walk through the real colliders. Works on a fresh world; with --rail-seed (look's seeded
// room, look-rail) it first waits for the accepted Works state, then prints the adapter's `works` and `shed`.
const { account, inspectRailway, railPid, railReady, rw, shed, trains, works, worksStage } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { WORKS_WALK } = (await import(
  '/src/entities/railway/works-shape.ts' as string
)) as typeof import('../../../src/entities/railway/works-shape.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
if (!(await railReady(20000)) || !me.body) throw new Error('Works view not ready');
const query = new URLSearchParams(location.search),
  mode = query.get('worksat') ?? 'halt';
if (query.get('room') === 'look-rail') {
  const seeded = performance.now() + 15000;
  while (worksStage(rw()) === 'dormant' && performance.now() < seeded) await wait(50);
  if (worksStage(rw()) === 'dormant') console.log('WORKS seed: still dormant (a seed before Q6?)');
}
const poses: Record<
  string,
  { body: [number, number]; y?: number; camera: [number, number, number]; aim: [number, number, number] }
> = {
  halt: { body: [1081.3, 41.1], camera: [1078, 29, 35], aim: [1119, 28, 82] },
  ledge: { body: [1164, 124], camera: [1171, 26, 131], aim: [1156, 24, 116] },
  bowl: { body: [1140, 102], camera: [1146, 29, 110], aim: [1128, 27, 87] },
  // Home as one station (docs/plans/home-flip.md): the table is at (942.1, 17.1), the open stall's door at
  // (940.6, 25.5), the spur runs west from the table to road 2 at (922.5, 10.5).
  stall: { body: [948, 20], camera: [947, 22.5, 18.5], aim: [940.3, 19.8, 27] },
  table: { body: [948, 10], camera: [950, 25, 6], aim: [941, 19.5, 22] },
  // The whole turn from above: the stall door, the deck, the spur and line 2's first ten metres (works-late-game
  // step 5; the shunt backs down the spur to road 2's buffer stub).
  turn: { body: [948, 10], camera: [933, 40, -8], aim: [932, 18.3, 15] },
  pier: { body: [1405, -366], camera: [1412, 31, -352], aim: [1403, 24, -390] },
  // J4: the boiler's pedestal (the breaker), the kiln at the open cut, and the throat from inside the bowl.
  forge: { body: [922, 9], camera: [925, 22.5, 13], aim: [918.5, 18.5, 5] },
  kiln: { body: [1122, 88], camera: [1120.5, 28.5, 82.5], aim: [1128, 25.5, 87.5] },
  throat: { body: [1124, 86], camera: [1141, 35, 104], aim: [1119, 25, 82] },
  rack: { body: [1094, 57], camera: [1098, 27.5, 61], aim: [1090.5, 24.2, 52.5] },
  // The plume over the forge as seen from the pier (Home flow finding 3: it calls you back).
  call: { body: [1405, -366], camera: [1404, 30, -358], aim: [919, 40, 5] },
  // In reach of "Fill the kiln" (with --hud): the prompt's bill and its reason.
  kilnface: { body: [1124.7, 85.2], camera: [1120.5, 28.5, 82.5], aim: [1128, 25.5, 87.5] },
  callmid: { body: [1000, -60], camera: [1150, 40, -200], aim: [919, 40, 5] },
  callnear: { body: [1000, -60], camera: [1000, 32, -60], aim: [919, 35, 5] },
  // J5: the crossing from the pier head, the Pier halt's rack and jib, and the wagon behind line 2's train at home.
  // Over the sea the body stands on the Pier halt's deck (25 m), not the sea floor.
  crossing: { body: [1399.7, -356], y: 26, camera: [1408, 33, -372], aim: [1404, 2, -470] },
  pierhead: { body: [1399.7, -356], y: 26, camera: [1416, 31, -360], aim: [1403, 25, -370] },
  bents: { body: [1399.7, -356], y: 26, camera: [1432, 16, -455], aim: [1404, 4, -482] },
  wagon: { body: [935, 28], camera: [936, 25, 31], aim: [924, 19.5, 16] },
};
const pose = poses[mode];
if (!pose) throw new Error(`Choose worksat=${Object.keys(poses).join('|')}`);
const shot = window as Window & { __worksPrepared?: boolean; __worksWalkDone?: boolean };
if (mode === 'wagon') {
  // The coupled wagon shows behind line 2's train while it stands at the village.
  const end = performance.now() + 240000;
  const home = () => {
    // The wagon's train (v26: whichever of line 2's two it coupled to).
    const row = trains(rw()).find((r) => r.wagon);
    return !!row && row.phase === 0 && row.at === 0;
  };
  while (!home() && performance.now() < end) await wait(100);
  const train = (
    inspectRailway() as unknown as { line2View: { trains: { wagon?: unknown; cars: unknown[] }[] } }
  ).line2View.trains.find((t) => t.wagon);
  console.log(
    `WORKS wagon pose: line 2 at the village ${home()} ${JSON.stringify({ wagon: train?.wagon, cars: train?.cars })}`,
  );
}
const action = !!shot.__worksPrepared;
if (!action) {
  teleport(me.body, pose.body[0], pose.y ?? H(...pose.body) + 0.85, pose.body[1]);
  me.body.velocity.set(0, 0, 0);
}
cam.yaw = me.yaw = Math.atan2(-(pose.aim[0] - pose.body[0]), -(pose.aim[2] - pose.body[1]));
cam.pitch = -0.12;
const frame = () => window.__debugCam!.set(pose.camera, pose.aim, 65);
frame();
setTimeout(frame, 100);
// `workscam=play` on `--players 2`'s second page: its own follow camera (it never runs the action, which clears the first's).
if (query.get('workscam') === 'play' && query.get('player') === '2') setTimeout(() => window.__debugCam?.clear(), 300);
shot.__worksPrepared = true;
{
  const w = rw();
  const foot = account(w, railPid())?.foot ?? 0;
  console.log(`WORKS pose ${mode} ${JSON.stringify({ works: works(w), stage: worksStage(w), shed: shed(w), foot })}`);
  console.log(`WORKS view ${JSON.stringify(inspectRailway()!.worksView)}`);
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
if (query.get('worksprobe') === '1') {
  // Is the forge call's plume alive where the camera is? (particles near the pedestal, and the camera's distance)
  await wait(3000);
  const { particleCounts } = (await import(
    '/src/render/particles.ts' as string
  )) as typeof import('../../../src/render/particles.ts');
  const { camera } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
  const before = particleCounts();
  await wait(2000);
  const after = particleCounts();
  console.log(
    `WORKS PROBE ${JSON.stringify({ particles: after, perSecond: (after.admitted - before.admitted) / 2, far: camera.far, d: Math.hypot(camera.position.x - 918, camera.position.z - 5) })}`,
  );
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
