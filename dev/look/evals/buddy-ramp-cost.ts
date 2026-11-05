// Existing real-frame ABBA GPU measurement, through the broker. No alternate timing loop.
const { setGraphics } = (await import(
  '/src/graphics-settings.ts' as string
)) as typeof import('../../../src/graphics-settings.ts');
const { measureGraphics } = (await import(
  '/src/debug/dev/performance.ts' as string
)) as typeof import('../../../src/debug/dev/performance.ts');
const { camera } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const p = me.body!.position;
window.__debugCam!.set([p.x + 2.6, p.y + 2.277, p.z + 4.196], [p.x, p.y + 0.65, p.z], 62);
await new Promise((resolve) => setTimeout(resolve, 1000));
for (const mode of ['soft', 'strong']) {
  await setGraphics('buddy-ramp-mode', mode);
  const result = await measureGraphics('buddy-ramp', { seconds: 3, warmSeconds: 2, contention: 'unknown' });
  console.log('RAMP COST ' + JSON.stringify({ mode, camera: camera.position.toArray(), result }));
}
export {};
