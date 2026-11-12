// npm run look -- --real --query intro=1 --warm 0 --eval dev/look/evals/spawn-view.ts --name spawn-view
//  (derived from the file: it needs the real first-visit fall, intro=1 on a fresh profile)
// The real first-visit fall, with no movement, teleport or authored camera.
const { fallArrival } = (await import(
  '/src/fall/arrival.ts' as string
)) as typeof import('../../../src/fall/arrival.ts');
const { scene, camera } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const start = performance.now();
if (!fallArrival.active) throw new Error('Spawn fixture requires the real intro=1 arrival');
while (fallArrival.active || !me.body || me.coyote <= 0) {
  if (performance.now() - start > 30000) throw new Error('First-visit arrival did not finish');
  await wait(50);
}
// Let the director release its final pitch/FOV ease before the first idle gameplay view.
await wait(1400);
const target = camera.position.clone().add(camera.getWorldDirection(camera.position.clone()));
scene.userData.spawnGameplayCamera = { cam: camera.position.toArray(), look: target.toArray(), fov: camera.fov };
// Supplemental diagnostic only: same position/yaw, lift the gaze to show the sky absent from the first view.
const skyTarget = camera.position
  .clone()
  .add(camera.getWorldDirection(camera.position.clone()).setY(0).normalize().multiplyScalar(10));
skyTarget.y = camera.position.y + 2;
scene.userData.spawnSkyCamera = { cam: camera.position.toArray(), look: skyTarget.toArray(), fov: camera.fov };
scene.userData.lookFixture = {
  kind: 'real first-visit landing',
  active: fallArrival.active,
  position: { ...me.body!.position },
  camera: scene.userData.spawnGameplayCamera,
  settlingMs: 1400,
};
export {};
