// The hand-off cut (docs/plans/forge-call-handoff.md, step 1): Far Head's shot and the pier's show end on the forge's
// pedestal, where the crane lifts what the forge just cast, and the camera comes home facing the forge. From a seed a
// few seconds short of the live edge (q5-finishing, or q6-finishing with `handoff=q6`), on foot beside the line: the
// warm-up ends about 4 s before the edge, so the capture holds the edge, the show, the cut and the hand-back. Throws if
// the cut, the forge's call or the lift did not happen, or the call sounded before the cut.
//   npm run look -- --real --rail-seed q5-finishing --eval dev/look/evals/forge-handoff.ts \
//     --until window.__placeDone --video --seconds 16 --hud --name handoff-far-head
//   npm run look -- --real --rail-seed q6-finishing --query handoff=q6 --eval dev/look/evals/forge-handoff.ts \
//     --until window.__placeDone --video --seconds 14 --hud --name handoff-pier
const { inspectRailway, line2Completed, railRead, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const rail = (await import(
  '/src/entities/railway/rail-kit.ts' as string
)) as typeof import('../../../src/entities/railway/rail-kit.ts');
const { actShowing } = (await import(
  '/src/ui/moment-banner.ts' as string
)) as typeof import('../../../src/ui/moment-banner.ts');
const { forgeCue } = (await import(
  '/src/entities/railway/forge-call.ts' as string
)) as typeof import('../../../src/entities/railway/forge-call.ts');
const { yawToForge } = (await import(
  '/src/entities/railway/forge-cut.ts' as string
)) as typeof import('../../../src/entities/railway/forge-cut.ts');
const scene = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const page = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (ready: () => boolean, label: string, timeout: number) => {
  const end = performance.now() + timeout;
  while (!ready()) {
    if (performance.now() > end) throw new Error(`HANDOFF timed out: ${label}`);
    await wait(50);
  }
};
await until(() => !!railRead()?.ready() && !!me.body, 'railway mounted', 60000);
const pier = new URLSearchParams(location.search).get('handoff') === 'q6';
const want = pier ? 6 : 5;
const view = () => inspectRailway()!.line2View;
const hoist = () => inspectRailway()!.hoist;
const completed = () => line2Completed(rw());
if (completed() >= want) throw new Error(`HANDOFF needs a live q${want}-finishing seed, not a restored completion`);
const line = layout.LINKS[1]!.line;
// On foot beside the rail, well back from the laying head, looking down the line away from the forge.
const s = pier ? 540 : 280;
const spot = rail.besideLine(line, s, 0);
teleport(me.body!, spot.x, layout.railY(line, s) + 0.85, spot.z);
me.body!.velocity.set(0, 0, 0);
cam.yaw = yawToForge(spot.x, spot.z) + Math.PI;
cam.pitch = -0.12;
const state = () => ({
  completed: completed(),
  head: Math.round(view().head),
  shot: view().switchCamera,
  act: actShowing(),
  cue: forgeCue.count,
  hoist: hoist() && { part: hoist()!.part, lift: Math.round(hoist()!.lift * 100) / 100, lifts: hoist()!.lifts },
  yawOff:
    Math.round(
      Math.abs(
        Math.atan2(
          Math.sin(cam.yaw - yawToForge(me.body!.position.x, me.body!.position.z)),
          Math.cos(cam.yaw - yawToForge(me.body!.position.x, me.body!.position.z)),
        ),
      ) * 100,
    ) / 100,
  camera: scene.camera.position.toArray().map((v) => Math.round(v)),
});
background(
  (async () => {
    const edgeAt = pier ? 739 : 546;
    await until(() => view().head >= edgeAt - 28 || completed() >= want, 'the layer nears the end', 240000);
    if (completed() >= want) throw new Error('HANDOFF missed the approach');
    window.__debugCam!.clear();
    const clear = setInterval(() => window.__debugCam!.clear(), 50); // look re-applies its pose after the warm-up
    console.log(`HANDOFF ready ${JSON.stringify(state())}`);
    page.__placeDone = true;
    await until(() => completed() >= want, 'the stretch finishes live', 60000);
    const cue0 = forgeCue.count,
      t0 = performance.now();
    console.log(`HANDOFF edge ${JSON.stringify(state())}`);
    // The cut starts 6 s after Far Head's edge, 3.5 s after the pier's; the camera is at the forge during it.
    const cutAt = pier ? 3500 : 6000;
    let sawCut = false,
      cueAt = -1;
    while (performance.now() - t0 < cutAt + 5000) {
      await wait(100);
      const ms = performance.now() - t0;
      if (cueAt < 0 && forgeCue.count > cue0) cueAt = ms;
      const c = scene.camera.position;
      if (view().switchCamera.active && Math.hypot(c.x - 922, c.z + 1) < 30) sawCut = true;
      if (Math.round(ms / 100) % 10 === 0) console.log(`HANDOFF ${Math.round(ms)} ms ${JSON.stringify(state())}`);
    }
    clearInterval(clear);
    const end = state();
    console.log(`HANDOFF end cueAt=${Math.round(cueAt)} sawCut=${sawCut} ${JSON.stringify(end)}`);
    if (!sawCut) throw new Error('HANDOFF the camera never cut to the forge');
    if (cueAt < 0) throw new Error("HANDOFF the forge's call never sounded");
    if (cueAt < cutAt - 400) throw new Error(`HANDOFF the call sounded at ${Math.round(cueAt)} ms, before the cut`);
    if (!end.hoist || end.hoist.lift < 1.5) throw new Error('HANDOFF the crane did not lift the part');
    if (end.yawOff > 0.2) throw new Error(`HANDOFF the camera came home ${end.yawOff} rad off the forge`);
    if (end.shot.active) throw new Error('HANDOFF the shot is still playing');
  })(),
  'the hand-off cut',
);
export {};
