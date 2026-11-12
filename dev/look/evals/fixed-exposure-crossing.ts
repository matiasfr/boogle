// command: unknown, needs a pose: --real --eval dev/look/evals/fixed-exposure-crossing.ts on the default island (it moves __debugCam through the water for 18 s; no doc or bot calls it)
// Reuse color-vibrance-3's diagnostic descent/ascent. Real water, not a player-controlled swim.
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { waterRuntime } = (await import(
  '/src/render/water-render.ts' as string
)) as typeof import('../../../src/render/water-render.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
background(
  (async () => {
    const began = performance.now();
    let sample = -1;
    while (performance.now() - began < 18000) {
      const seconds = (performance.now() - began) / 1000;
      const y = 3 * Math.cos((seconds * Math.PI) / 9);
      window.__debugCam!.set([868, y, 144], [830, y - 1, 180], 62);
      if (Math.floor(seconds * 4) !== sample) {
        sample = Math.floor(seconds * 4);
        console.log('EXPOSURE CROSSING ' + JSON.stringify({ seconds, y, water: waterRuntime.inspect() }));
      }
      await wait(16);
    }
  })(),
  'fixed exposure waterline crossing',
);
export {};
