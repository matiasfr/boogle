// npm run look -- --real --query 'phoneStartup=1&prof=1' --size 440x796 --eval dev/look/evals/replay-phone-cost.ts --warm 1
// needs: BOOGLE_BOOT_FAULTS=1 node .look/see-client.ts look --production (the pre-boot phone proxy)
// Broker --production --real, BOOGLE_BOOT_FAULTS=1, &phoneStartup=1&prof=1.
// Existing proxy configures the top-level document before boot: 440x796, DPR 2, .60 resolution, touch MSAA.
// Mac Chromium only. Each broker invocation starts a fresh browser profile; Metal caches are uncontrolled.
const { hardwareTiming } = (await import(
  '/src/debug/prof-overlay.ts' as string
)) as typeof import('../../../src/debug/prof-overlay.ts');
const { bootTimeline } = (await import(
  '/src/boot/timeline.ts' as string
)) as typeof import('../../../src/boot/timeline.ts');
const { isTouch } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');
if (!isTouch || devicePixelRatio !== 2) throw new Error('Missing pre-boot phone profile proxy');
window.__debugCam!.set([884, 8, 151], [868, 0, 144], 62);
await new Promise((resolve) => setTimeout(resolve, 10000));
console.log('PHONE LOAD ' + JSON.stringify({ boot: bootTimeline() }));
for (let sample = 0; sample < 2; sample++) {
  const timing = await hardwareTiming(5);
  if (timing.status !== 'complete' || !timing.gpu.render.stats)
    throw new Error('Unavailable phone GPU sample: ' + timing.status);
  console.log('PHONE GPU ' + JSON.stringify({ sample, timing }));
}
for (const panel of document.querySelectorAll<HTMLElement>('body > section'))
  if (panel.textContent?.includes('Measure 5 seconds')) panel.style.display = 'none';
export {};
