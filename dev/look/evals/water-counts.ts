// npm run look -- --real --eval dev/look/evals/water-counts.ts --warm 3
//  (read-only draw accounting after shader warmup; command derived from the file, not from a doc)
// Read-only render accounting for the water demo, after shader warmup.
const scenePath = '/src/render/scene.ts';
const { renderer, scenePass, camera } = await import(scenePath);
setTimeout(() => {
  const rt = scenePass.renderTarget;
  console.info(
    'WATER ' +
      JSON.stringify({
        render: renderer.info.render,
        compute: renderer.info.compute,
        samples: rt.samples,
        depthSamples: renderer.backend.get(rt.depthTexture).texture?.sampleCount,
        storeMultisampledColorBuffer: rt.storeMultisampledColorBuffer,
        storeMultisampledDepthBuffer: rt.storeMultisampledDepthBuffer,
        width: rt.width,
        height: rt.height,
        near: camera.near,
        far: camera.far,
        fov: camera.fov,
        camera: camera.position.toArray(),
      }),
  );
}, 2500);
export {};
