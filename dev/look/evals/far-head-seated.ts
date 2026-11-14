// Far Head's shot for a rider in the track layer's chair (the owner's session, 14 November 2026: he rode the machine to
// the end of Q5 and "the cinematic didn't do the aerial camera pan"). From --rail-seed q5-finishing: board the layer,
// sit (fhseat=0 stands on the rim instead, the control), hand the view to the game's follow camera and end the warm-up
// a few seconds before Q5's live edge, so the capture holds the edge, the shot and the hand-back. Throws if the shot
// was not playing one second after the edge.
//   npm run look -- --real --rail-seed q5-finishing --eval dev/look/evals/far-head-seated.ts \
//     --until window.__placeDone --video --seconds 12 --hud --name far-head-seated
const { inspectRailway, line2Completed, railRead, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const seats = (await import(
  '/src/entities/railway/seat.ts' as string
)) as typeof import('../../../src/entities/railway/seat.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const rail = (await import(
  '/src/entities/railway/rail-kit.ts' as string
)) as typeof import('../../../src/entities/railway/rail-kit.ts');
const { actShowing } = (await import(
  '/src/ui/moment-banner.ts' as string
)) as typeof import('../../../src/ui/moment-banner.ts');
const scene = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const page = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (ready: () => boolean, label: string, timeout: number) => {
  const end = performance.now() + timeout;
  while (!ready()) {
    if (performance.now() > end) throw new Error(`FARHEAD timed out: ${label}`);
    await wait(50);
  }
};
await until(() => !!railRead()?.ready() && !!me.body, 'railway mounted', 60000);
const view = () => inspectRailway()!.line2View;
const completed = () => line2Completed(rw());
if (completed() >= 5) throw new Error('FARHEAD needs a live q5-finishing seed, not a restored completion');
const sit = new URLSearchParams(location.search).get('fhseat') !== '0';
const line = layout.LINKS[1]!.line;
if (sit) {
  // Onto the moving deck, then the chair, as a player's Interact would.
  for (let tries = 0; !seats.seated() && tries < 40; tries++) {
    const m = inspectRailway()!.machine;
    teleport(me.body!, m.x, m.y + 1.6, m.z);
    me.body!.velocity.set(0, 0, 0);
    await wait(400);
    seats.sitDown();
    await wait(100);
  }
  if (!seats.seated()) throw new Error('FARHEAD could not sit on the track layer');
} else {
  const rim = rail.besideLine(line, 280, 0);
  teleport(me.body!, rim.x, layout.railY(line, 280) + 0.85, rim.z);
}
// Behind Buddy, looking down the line he faces.
cam.yaw = me.yaw;
cam.pitch = -0.12;
const state = () => ({
  seated: seats.seated(),
  completed: completed(),
  head: Math.round(view().head),
  shot: view().switchCamera,
  act: actShowing(),
  rockets: view().farHeadRockets,
  camera: scene.camera.position.toArray().map((v) => Math.round(v)),
});
background(
  (async () => {
    // The warm-up ends about 4 s before the edge (the head runs about 7 m/s over the last metres, 546 at the end).
    await until(() => view().head >= 518 || completed() >= 5, 'the layer nears Far Head', 180000);
    if (completed() >= 5) throw new Error('FARHEAD missed the approach');
    window.__debugCam!.clear();
    const clear = setInterval(() => window.__debugCam!.clear(), 50); // look re-applies its pose after the warm-up
    console.log(`FARHEAD ready ${JSON.stringify(state())}`);
    page.__placeDone = true;
    await until(() => completed() >= 5, 'Q5 finishes live', 60000);
    console.log(`FARHEAD edge ${JSON.stringify(state())}`);
    for (const ms of [1000, 2000, 2000, 2500]) {
      await wait(ms);
      console.log(`FARHEAD after ${JSON.stringify(state())}`);
      if (ms === 1000 && !view().switchCamera.active) throw new Error('FARHEAD no shot one second after the edge');
    }
    clearInterval(clear);
  })(),
  'ride to Far Head',
);
export {};
