// Q4's shot (owner, 15 November: "Q4 can get camera shot yeah"; src/entities/railway/sea-gate-shot.ts): as Q4 is laid
// live, the camera goes to the sea gate's far jamb, the drum drops into its cradle once the camera is there, the
// strips light down the jamb and the camera comes home. From the look-only seed q4-held (dev/look/lay-seed.ts):
// the page pulls the quarry lever as a player would, then stands on the grass beside the line; the warm-up ends
// about 3 s before the edge, so the capture holds the edge, the shot and the hand-back. Throws if the shot did not play, the drum dropped before the camera reached the jamb, or the control was
// not live at the end.
//   npm run look -- --real --rail-seed q4-held --eval dev/look/evals/sea-install-shot.ts \
//     --until window.__placeDone --video --seconds 9 --frames 16 --hud --name sea-install-shot
const { inspectRailway, line2Completed, railRead, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const rail = (await import(
  '/src/entities/railway/line-geometry.ts' as string
)) as typeof import('../../../src/entities/railway/line-geometry.ts');
const { SEA_INSTALL_SHOT } = (await import(
  '/src/entities/railway/sea-gate-shot.ts' as string
)) as typeof import('../../../src/entities/railway/sea-gate-shot.ts');
const { watchPlayMarks } = (await import(
  '/src/proto/mark.ts' as string
)) as typeof import('../../../src/proto/mark.ts');
const scene = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const page = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (ready: () => boolean, label: string, timeout: number) => {
  const end = performance.now() + timeout;
  while (!ready()) {
    if (performance.now() > end) throw new Error(`SEASHOT timed out: ${label}`);
    await wait(50);
  }
};
await until(() => !!railRead()?.ready() && !!me.body, 'railway mounted', 60000);
type Sea = { installed: boolean; seating: number; held: boolean };
type Shot = { active: boolean; pending: boolean; seconds: number; weight: number; kind: string | null };
type Lever = { x: number; y: number; z: number; pulled: boolean };
const view = () =>
  inspectRailway()!.line2View as unknown as { head: number; sea: Sea; switchCamera: Shot; lever: Lever };
const completed = () => line2Completed(rw());
if (completed() >= 4 || view().lever.pulled) throw new Error('SEASHOT needs the q4-held seed, its lever not pulled');
for (let n = 0; n < 100 && !view().lever.pulled; n++) {
  const lever = view().lever;
  teleport(me.body!, lever.x, lever.y + 0.9, lever.z);
  await wait(200);
  const target = interactTarget();
  if (target?.id === 'railway-quarry-lever') target.run?.();
}
if (!view().lever.pulled) throw new Error('SEASHOT could not pull the quarry lever');
const line = layout.LINKS[1]!.line;
// On foot on the grass 9 m off the rail, 57 m back from the gate, looking back up the line: the shot has to take the
// camera there. Dropped from above, to land on the ground.
const spot = rail.besideLine(line, 240, 9);
teleport(me.body!, spot.x, layout.railY(line, 240) + 6, spot.z);
me.body!.velocity.set(0, 0, 0);
cam.yaw = me.yaw + Math.PI;
cam.pitch = -0.12;
const state = () => ({
  completed: completed(),
  head: Math.round(view().head),
  sea: view().sea,
  shot: view().switchCamera,
  camera: scene.camera.position.toArray().map((v) => Math.round(v)),
});
watchPlayMarks((name, data) => {
  if (name === 'moment played') console.log(`SEASHOT moment ${JSON.stringify(data)}`);
});
background(
  (async () => {
    await until(() => view().head >= 286 - 5 || completed() >= 4, 'the layer nears the gate', 240000);
    if (completed() >= 4) throw new Error('SEASHOT missed the approach');
    window.__debugCam!.clear();
    const clear = setInterval(() => window.__debugCam!.clear(), 50); // look re-applies its pose after the warm-up
    console.log(`SEASHOT ready ${JSON.stringify(state())}`);
    page.__placeDone = true;
    await until(() => completed() >= 4, 'Q4 finishes live', 60000);
    const t0 = performance.now();
    console.log(`SEASHOT edge ${JSON.stringify(state())}`);
    let played = false,
      dropAt = -1,
      early = false;
    while (performance.now() - t0 < SEA_INSTALL_SHOT.seconds * 1000 + 1500) {
      await wait(50);
      const { sea, switchCamera: shot } = view();
      if (shot.active && shot.kind === 'seaInstall' && shot.weight > 0.9) played = true;
      if (dropAt < 0 && sea.installed && !sea.held) {
        dropAt = performance.now() - t0;
        early = !(shot.active && shot.weight > 0.9);
      }
      if (Math.round((performance.now() - t0) / 50) % 10 === 0) console.log(`SEASHOT ${JSON.stringify(state())}`);
    }
    clearInterval(clear);
    const end = state();
    console.log(`SEASHOT end dropAt=${Math.round(dropAt)} played=${played} ${JSON.stringify(end)}`);
    if (!played) throw new Error('SEASHOT the camera never went to the jamb');
    if (dropAt < 0) throw new Error('SEASHOT the drum never dropped');
    if (early) throw new Error(`SEASHOT the drum dropped at ${Math.round(dropAt)} ms, before the camera was there`);
    if (end.sea.seating < 1 || end.sea.held) throw new Error('SEASHOT the control is not live');
    if (end.shot.active) throw new Error('SEASHOT the shot is still playing');
  })(),
  "Q4's shot",
);
export {};
