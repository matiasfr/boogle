// Run as --action with --query prof=1: registered sea contacts near this pose, and GPU render time per frame with the
// contact loop in its old form (every contact), culled to reach, the default cap, and off; interleaved, three rounds.
const { observeGpu, hardwareTiming } = (await import(
  '/src/debug/prof-overlay.ts' as string
)) as typeof import('../../../src/debug/prof-overlay.ts');
const { camera } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { waterContacts, setWaterContactLimit } = (await import(
  '/src/render/water/contacts.ts' as string
)) as typeof import('../../../src/render/water/contacts.ts');
const all = waterContacts().contacts;
const p = camera.position;
const within = (m: number) => all.filter((c) => Math.hypot(c.x - p.x, c.z - p.z) - c.radius < m).length;
const counts = {
  registered: all.length,
  within30: within(30),
  within60: within(60),
  within100: within(100),
  within185: within(185),
};
const modes: [string, number, number][] = [
  ['old: all', 512, Infinity],
  ['in reach', 512, 180.65],
  ['nearest 64', 64, 180.65],
  ['off', 0, 180.65],
];
const observer = await observeGpu();
const results: Record<string, number[]> = {};
try {
  for (let round = 0; round < 3; round++)
    for (const [name, n, reach] of modes) {
      setWaterContactLimit(n, reach);
      await new Promise((r) => setTimeout(r, 400));
      const t = await hardwareTiming(2);
      const s = t.gpu.render.stats as { avgMs?: number } | null;
      (results[name] ??= []).push(+(s?.avgMs ?? NaN).toFixed(2));
    }
} finally {
  setWaterContactLimit();
  observer.stop();
}
console.log(
  'CONTACTS ' +
    JSON.stringify({ at: [p.x, p.z].map(Math.round), counts, sent: waterContacts().sent, gpuRenderMs: results }),
);
export {};
