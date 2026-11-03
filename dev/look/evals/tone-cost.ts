// Run as --action after warmup, with &prof=1. Uses the existing GPU observer; never renders an extra frame.
const { observeGpu, hardwareTiming } = (await import(
  '/src/debug/prof-overlay.ts' as string
)) as typeof import('../../../src/debug/prof-overlay.ts');
const { renderer } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const observer = await observeGpu();
try {
  const timing = await hardwareTiming(3);
  const snapshot = observer.snapshot();
  console.info(
    'TONE COST ' +
      JSON.stringify({
        render: renderer.info.render,
        passes: snapshot.renderPasses,
        adapter: snapshot.adapter,
        targets: snapshot.renderTargets.map((t) => ({ name: t.name, width: t.width, height: t.height })),
        cpu: timing.cpu.stats,
        gpu: timing.gpu.render.stats,
        gpuStatus: timing.gpu.render.status,
        partial: timing.gpu.render.partialFrames,
        missing: timing.gpu.render.missingFrames,
        loadedTone: performance.getEntriesByType('resource').some((e) => e.name.includes('/src/proto/tone.ts')),
      }),
  );
} finally {
  observer.stop();
}
export {};
