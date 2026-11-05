// Existing profiler and matched graphics measurement; no second GPU timing implementation.
const { measureGraphics } = await import('/src/debug/dev/performance.ts' as string);
for (let repeat = 0; repeat < 2; repeat++) {
  const result = await measureGraphics('groundEdges', { seconds: 3, warmSeconds: 2, contention: 'unknown' });
  console.log('GROUND COST', JSON.stringify({ repeat, result }));
}
export {};
