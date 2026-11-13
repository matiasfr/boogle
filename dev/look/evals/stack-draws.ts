// npm run look -- --rail-seed stack-laid-4 --eval dev/look/evals/stack-at.ts --query 'stackat=-105.7,5,-1987.3' \
//   --action dev/look/evals/stack-draws.ts --cam <x,y,z> --look <x,y,z> --name gorge-draws
// What the stack line's views and High Gorge's massing add to a frame at the current camera (docs/plans/greybox-route.md,
// checkpoint A: draws against the measured blockout's 58): the frame's draw calls with every mesh named `route-greybox:*`
// drawn, then with them moved off the camera's layer, and the frame cost the game's own profiler holds. Counts are
// counts; the frame time is one reading and means nothing under load.
const { renderer, scene } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const game = (window as unknown as { boogle: { prof: { last: { frames: number } }; inspect(): { frame: unknown } } })
  .boogle;
const frame = () =>
  new Promise<{ drawCalls: number; triangles: number }>((resolve, reject) => {
    const at = game.prof.last.frames,
      deadline = performance.now() + 30000;
    const t = setInterval(() => {
      if (game.prof.last.frames > at + 1) {
        clearInterval(t);
        resolve({ drawCalls: renderer.info.render.drawCalls, triangles: renderer.info.render.triangles });
      } else if (performance.now() > deadline) {
        clearInterval(t);
        reject(new Error('stack-draws: no game frame in 30 s'));
      }
    }, 10);
  });
const mine: { layers: { mask: number }; name: string }[] = [];
scene.traverse((o) => {
  if (o.name.startsWith('route-greybox:')) mine.push(o);
});
const withAll = await frame();
const cost = game.inspect().frame;
const masks = mine.map((o) => o.layers.mask);
for (const o of mine) o.layers.mask = 1 << 31;
const without = await frame();
mine.forEach((o, i) => (o.layers.mask = masks[i]!));
console.log(
  'STACK draws',
  JSON.stringify({
    meshes: mine.length,
    with: withAll,
    without,
    added: withAll.drawCalls - without.drawCalls,
    addedTriangles: withAll.triangles - without.triangles,
    frameMs: cost,
  }),
);
export {};
