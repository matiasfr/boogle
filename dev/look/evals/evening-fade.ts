// npm run look -- --query 'evening=preview' --real --action dev/look/evals/evening-fade.ts --name evening-fade
//  (evening=preview prepares the evening look but starts on day; evening=1 starts on it; the eval fades day -> evening -> day with setEveningLook)
// Broker --action: prepared day -> evening -> day. Real scene, no milestone or invented shared state.
const { setEveningLook } = (await import(
  '/src/render/water/evening-transition.ts' as string
)) as typeof import('../../../src/render/water/evening-transition.ts');
const { waterRuntime } = (await import(
  '/src/render/water-render.ts' as string
)) as typeof import('../../../src/render/water-render.ts');
const { renderer } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { exposureSettings } = (await import(
  '/src/render/exposure.ts' as string
)) as typeof import('../../../src/render/exposure.ts');
const read = (label: string) => {
  const water = waterRuntime.inspect();
  console.log(
    'EVENING ' +
      JSON.stringify({
        label,
        sky: water.sky,
        exposure: exposureSettings,
        draws: renderer.info.render.drawCalls,
        passes: renderer.info.render.frameCalls,
        textures: renderer.info.memory.textures,
        geometries: renderer.info.memory.geometries,
        limits: 'Counts only; shared GPU. Recorded cadence is not presentation smoothness.',
      }),
  );
};
read('day-before');
if (!setEveningLook()) throw new Error('Prepared evening unavailable');
if (setEveningLook()) throw new Error('An overlapping fade was accepted');
const samples = setInterval(() => read('transition'), 100);
setTimeout(() => read('evening-settled'), 2200);
setTimeout(() => {
  if (!setEveningLook(false)) throw new Error('Return to day refused');
}, 3000);
setTimeout(() => {
  clearInterval(samples);
  read('day-restored');
}, 5400);
export {};
