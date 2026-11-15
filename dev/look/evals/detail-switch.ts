// npm run look -- --real --query dev=1 --size 2208x1281 --warm 0 --eval dev/look/evals/detail-switch.ts --cam 1028,49,-117 --look 1000,31,-144 --name detail-switch
// Measures before screenshots/video, at the same fixed camera.
// Add --action dev/look/evals/detail-switch-action.ts --seconds 5 --frames 20 --video for a separate visual proof.
const { renderer, scene, camera, sun } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const { setGraphics, graphicsSnapshot } = (await import(
  '/src/graphics-settings.ts' as string
)) as typeof import('../../../src/graphics-settings.ts');
const { shaderStats } = (await import(
  '/src/render/precompile.ts' as string
)) as typeof import('../../../src/render/precompile.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
window.__debugCam!.set([1028, 49, -117], [1000, 31, -144]);
await setGraphics('detail', 'sea');
const deadline = performance.now() + 120000;
while (!shaderStats().allDone && performance.now() < deadline) await wait(100);
if (!shaderStats().allDone) throw new Error('Detail probe: background warm-up did not finish');
await wait(2000);
type Sample = { cpuMs: number; calls: number; triangles: number };
let samples: Sample[] | null = null;
let pipelines = 0;
// Pinned r187 backend method; the common Backend declarations omit WebGPU's pipeline API.
const backend = renderer.backend as unknown as {
  createRenderPipeline(object: object, promises: Promise<unknown>[] | null): void;
};
const create = backend.createRenderPipeline.bind(backend);
backend.createRenderPipeline = (...args: Parameters<typeof create>) => {
  if (samples) pipelines++;
  return create(...args);
};
const render = renderer.render.bind(renderer);
renderer.render = (...args: Parameters<typeof render>) => {
  const t = performance.now();
  const result = render(...args);
  if (samples && args[0] === scene && args[1] === camera)
    samples.push({
      cpuMs: performance.now() - t,
      calls: renderer.info.render.drawCalls,
      triangles: renderer.info.render.triangles,
    });
  return result;
};
const measure = async () => {
  const results = [];
  for (const detail of ['shadows', 'sea', 'shadows', 'sea', 'shadows', 'sea']) {
    samples = [];
    pipelines = 0;
    const t = performance.now();
    await setGraphics('detail', detail);
    await wait(1000);
    const frames = samples;
    samples = null;
    const effective = graphicsSnapshot().find((s) => s.id === 'shadows')?.effective;
    if (effective !== (detail === 'sea')) throw new Error(`Detail ${detail}: shadow choice was overwritten`);
    results.push({
      detail,
      ms: performance.now() - t,
      pipelines,
      shadow: { cast: sun.castShadow, intensity: sun.shadow.intensity, update: sun.shadow.autoUpdate },
      frames,
    });
  }
  console.log(
    'DETAIL PROBE ' +
      JSON.stringify({
        all: shaderStats(),
        adapter: await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' }).then(
          (a) =>
            a && {
              vendor: a.info.vendor,
              architecture: a.info.architecture,
              device: a.info.device,
              description: a.info.description,
            },
        ),
        settings: graphicsSnapshot().filter((s) => ['detail', 'shadows', 'seaDetail', 'msaa'].includes(s.id)),
        results,
      }),
  );
};
try {
  await measure();
} finally {
  samples = null;
  backend.createRenderPipeline = create;
  renderer.render = render;
}
export {};
