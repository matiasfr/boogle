// command: unknown, needs a pose: a --real run with --eval of this file, --hud off, camera from --cam/--look (written for the colour-defaults comparison; no doc or bot calls it)
const { hardwareTiming } = (await import(
  '/src/debug/prof-overlay.ts' as string
)) as typeof import('../../../src/debug/prof-overlay.ts');
const { prof } = (await import('/src/loop.ts' as string)) as typeof import('../../../src/loop.ts');
const { setPlayerGraphics } = (await import(
  '/src/graphics-settings.ts' as string
)) as typeof import('../../../src/graphics-settings.ts');
const warm = async () => {
  const before = prof.last.frames;
  await new Promise((r) => setTimeout(r, 3000));
  if (document.hidden || prof.last.frames <= before) throw new Error('GPU warmup did not advance visibly');
};
await setPlayerGraphics('resolution', 1);
await setPlayerGraphics('frameLimit', 'display');
window.__debugCam!.set([892, 20, 12], [886, 20, 11], 62);
for (let sample = 0; sample < 3; sample++) {
  await warm();
  console.log(
    'DEFAULTS GPU ' +
      JSON.stringify({ sample, contention: 'Loaded shared Mac; timings unproven', timing: await hardwareTiming(3) }),
  );
}
export {};
