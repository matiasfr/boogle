// npm run look -- --real --eval dev/look/evals/sky-pan.ts --warm 2 --seconds 6 --video --name sky-pan
//  (command derived from the file, not from a doc: it turns __debugCam through 360 degrees over 6 s at the shore)
// Diagnostic full horizon turn at the established shore, not player input or a timing benchmark.
const { waterRuntime } = (await import(
  '/src/render/water-render.ts' as string
)) as typeof import('../../../src/render/water-render.ts');
const read = () => waterRuntime.inspect().sky;
console.log('SKY PAN BEFORE ' + JSON.stringify(read()));
const started = performance.now();
const duration = 6000;
const timer = setInterval(() => {
  const t = Math.min(1, (performance.now() - started) / duration);
  const yaw = Math.PI * 2 * t;
  window.__debugCam!.set([884, 8, 151], [884 + Math.sin(yaw) * 100, 23, 151 + Math.cos(yaw) * 100], 62);
  if (t === 1) {
    clearInterval(timer);
    console.log('SKY PAN AFTER ' + JSON.stringify(read()));
  }
}, 16);
export {};
