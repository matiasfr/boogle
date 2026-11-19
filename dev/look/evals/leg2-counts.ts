// What a frame costs where the greybox route's leg 2 is drawn (docs/plans/greybox-leg2.md, step 4's numbers): stands
// your body at `&countAt=x,y,z` (a staging teleport, so what is resident by distance is there), waits for the railway's
// whole state and for every route area within 380 m of the camera to mount (or, with `&countFar=1`, for them all to be
// gone), then prints the frame's draw calls and triangles, the visible meshes, every static collider and each area's
// residency. Counts are counts; it reads no frame time (timing under load is not evidence).
//   npm run look -- --rail-seed bay-reached --eval dev/look/evals/leg2-counts.ts --query 'countAt=-60,5.5,-845' \
//     --cam <x,y,z> --look <x,y,z> --name counts-bell
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport, forEachStatic } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { railRead } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { inspect } = (await import(
  '/src/entity/inspect.ts' as string
)) as typeof import('../../../src/entity/inspect.ts');
const { renderer, scene, camera } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const { routeAreas } = (await import(
  '/src/entities/route-greybox/state.ts' as string
)) as typeof import('../../../src/entities/route-greybox/state.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const q = new URLSearchParams(location.search);
const at = (q.get('countAt') ?? '').split(',').map(Number),
  far = q.get('countFar') === '1';
if (at.length !== 3 || at.some((n) => !Number.isFinite(n))) throw new Error('leg2-counts: ?countAt=x,y,z');
const until = async (ready: () => boolean, label: string, timeout = 60000) => {
  const end = performance.now() + timeout;
  while (!ready()) {
    if (performance.now() > end) throw new Error(`leg2-counts timed out: ${label}`);
    await wait(100);
  }
};
await until(() => !!me.body && me.entered && !!railRead()?.whole(), 'the player and the railway');
const near = (a: { x: number; z: number }) =>
  Math.hypot(camera.position.x - a.x, camera.position.z - a.z) < 380 || Math.hypot(at[0]! - a.x, at[2]! - a.z) < 380;
const settled = () => [...routeAreas.values()].every((a) => (far ? !a.mounted : a.mounted || !near(a)));
for (let k = 0; !settled(); k++) {
  if (k > 600) throw new Error('leg2-counts: the route areas did not settle');
  teleport(me.body!, at[0]!, at[1]!, at[2]!);
  me.body!.velocity.set(0, 0, 0);
  await wait(100);
}
const { onFrame } = (await import('/src/loop.ts' as string)) as typeof import('../../../src/loop.ts');
// The render comes after the frame's hooks in the same callback, so the counts are read in a microtask after it (as
// src/debug/device/frames.ts does): read anywhere else they are the reset zeros.
let lastDraw = { drawCalls: 0, triangles: 0, frame: 0 };
onFrame(
  () =>
    queueMicrotask(() => {
      const r = renderer.info.render;
      if (r.drawCalls > 0) lastDraw = { drawCalls: r.drawCalls, triangles: r.triangles, frame: lastDraw.frame + 1 };
    }),
  { phase: 'late', order: 91, name: 'leg2 counts' },
);
const frame = async () => {
  const from = lastDraw.frame;
  await until(() => lastDraw.frame > from + 2, 'three drawn frames', 30000);
  return { drawCalls: lastDraw.drawCalls, triangles: lastDraw.triangles };
};
await wait(1000);
const drawn = await frame();
let meshes = 0;
scene.traverseVisible((o) => {
  if ((o as { isMesh?: boolean }).isMesh) meshes++;
});
let colliders = 0;
forEachStatic(~0, () => colliders++);
const areas = inspect().kinds.find((k) => k.kind === 'route-greybox')?.entities[0]?.state ?? {};
console.log(`COUNTS ${JSON.stringify({ at, far, ...drawn, meshes, colliders, areas })}`);
export {};
