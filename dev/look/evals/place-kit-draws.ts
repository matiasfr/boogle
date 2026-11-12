// command: unknown, needs a rail seed: it poses the production town itself (views listed in the file); run as --eval with --real, the seed that holds the town (not stated anywhere)
// Matched production poses through the existing broker; draw attribution stays in place-draws.ts.
const { installWarp } = (await import('/dev/look/warp.ts' as string)) as typeof import('../warp.ts');
if (!window.__warp) installWarp();
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { captureShots } = (await import('/dev/look/shot-page.ts' as string)) as typeof import('../shot-page.ts');
const { paintNative } = (await import('/dev/look/sheet-render.ts' as string)) as typeof import('../sheet-render.ts');
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
type V = [number, number, number];
const views: { name: string; cam: V; look: V; player: [number, number] }[] = [
  { name: 'town', cam: [909, 24.45, 35], look: [903, 19.15, 20], player: [903, 20] },
  { name: 'T1', cam: [994, 38, -152], look: [984, 30, -140], player: [984, -140] },
  { name: 'cove', cam: [775, 9, 16], look: [806, 3, 43], player: [806, 40] },
];
for (const view of views) {
  teleport(me.body!, view.player[0], H(...view.player) + 0.8, view.player[1]);
  me.body!.velocity.set(0, 0, 0);
  window.__debugCam!.set(view.cam, view.look, 62);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log('KIT POSE ' + view.name);
  await import(`/dev/look/evals/place-draws.ts?pose=${view.name}`);
  const group = {
    name: `${view.name}-bounded`,
    query: '',
    size: [innerWidth, innerHeight] as [number, number],
    cameras: [{ ...view, fov: 62 }],
    variants: [{ name: 'kit', look: 'current' }],
    keepPaused: true,
  };
  console.log('KIT IMAGE bounded');
  await captureShots(group, paintNative);
  // Same frozen state, exact baseline culling policy; no retained old-build path in the game.
  const changed: typeof scene.children = [];
  scene.traverse((node) => {
    if (!node.name.startsWith('place kit ') || !node.frustumCulled || node.name === 'place kit frame_post') return;
    changed.push(node);
    node.frustumCulled = false;
  });
  try {
    console.log('KIT IMAGE uncull');
    await captureShots({ ...group, name: `${view.name}-uncull` }, paintNative);
  } finally {
    for (const node of changed) node.frustumCulled = true;
    window.__warp!.go(1);
  }
}
export {};
