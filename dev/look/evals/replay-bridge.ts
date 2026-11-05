// Restore the solo "path opened" checkpoint; walk the completed bridge using real inputs.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { L1 } = (await import(
  '/src/proto/place/lines.ts' as string
)) as typeof import('../../../src/proto/place/lines.ts');
const { besideLine } = (await import(
  '/src/proto/place/rail.ts' as string
)) as typeof import('../../../src/proto/place/rail.ts');
const { job } = (await import('/src/proto/place/job.ts' as string)) as typeof import('../../../src/proto/place/job.ts');
if (!L1.open || job.ways.short) throw new Error('Need a completed bridge before its first timed crossing');
const bot = makeBot({
  recover: () => {
    throw new Error('Bridge walk needed recovery');
  },
});
window.__debugCam!.clear();
const banners = new Set<string>();
const sample = setInterval(() => {
  const text = document.querySelector('.place-banner')?.textContent?.trim();
  if (text) banners.add(text);
}, 100);
try {
  const camp = besideLine(L1.spec.line, 191, 0);
  if (!(await bot.walk(camp.x, camp.z, 2))) throw new Error('Did not reach the camp end');
  for (let s = 181; s >= 21; s -= 10) {
    const p = besideLine(L1.spec.line, s, 0);
    if (!(await bot.walk(p.x, p.z, 1.5))) throw new Error(`Bridge walk missed ${s} m`);
  }
  if (!job.ways.short) throw new Error('Crossing was not recorded');
  if ([...banners].some((text) => /long way round|^\d+ s!/.test(text)))
    throw new Error('Unwanted comparison banner appeared');
  console.log('BRIDGE PASS ' + JSON.stringify({ seconds: job.ways.short, banners: [...banners] }));
} finally {
  clearInterval(sample);
}
export {};
