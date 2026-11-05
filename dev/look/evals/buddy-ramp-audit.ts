import type { Mesh } from 'three/webgpu';
const { scene, camera, renderer, pipeline } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const { devEnabled } = (await import(
  '/src/dev-preferences.ts' as string
)) as typeof import('../../../src/dev-preferences.ts');
const subjects: Mesh[] = [];
const { entityKinds } = (await import(
  '/src/entity/entity.ts' as string
)) as typeof import('../../../src/entity/entity.ts');
scene.traverse((object) => {
  const mesh = object as Mesh;
  if (mesh.isMesh && !Array.isArray(mesh.material) && mesh.material.name === 'M_Main') subjects.push(mesh);
});
const logs = entityKinds().find((kind) => kind.kind === 'haul-stack')?.entities[0]?.mesh?.children[0] as
  Mesh | undefined;
if (logs?.isMesh) subjects.push(logs);
const snapshot = () =>
  subjects.map((mesh) => {
    if (Array.isArray(mesh.material)) throw new Error('Unexpected material array');
    const properties = { ...mesh.material.toJSON() } as Partial<ReturnType<typeof mesh.material.toJSON>>;
    delete properties.uuid;
    delete properties.type;
    return { properties, geometry: mesh.geometry.uuid, cast: mesh.castShadow, receive: mesh.receiveShadow };
  });
const cameraBefore = camera.matrixWorld.toArray();
const output = pipeline.outputNode;
const exposure = renderer.toneMappingExposure;
const original = subjects.map((mesh) => mesh.material);
const before = JSON.stringify(snapshot());
const comparisons = [];
if (devEnabled) {
  const { setRamp } = (await import(
    '/src/debug/dev/buddy-ramp.ts' as string
  )) as typeof import('../../../src/debug/dev/buddy-ramp.ts');
  for (const value of [1, 2, 0]) {
    setRamp(value);
    const unchanged = JSON.stringify(snapshot()) === before;
    comparisons.push({ value, unchanged });
    if (!unchanged) throw new Error('Ramp changed material properties or geometry');
  }
}
const restored = subjects.every((mesh, i) => mesh.material === original[i]);
const fixed =
  output === pipeline.outputNode &&
  exposure === renderer.toneMappingExposure &&
  JSON.stringify(cameraBefore) === JSON.stringify(camera.matrixWorld.toArray());
const rampResources = performance
  .getEntriesByType('resource')
  .map((entry) => entry.name)
  .filter((name) => /(?:diffuse-ramp|buddy-ramp)\.ts/.test(name));
if (!restored || !fixed || (!devEnabled && rampResources.length)) throw new Error('Default graph isolation failed');
console.log(
  'RAMP AUDIT ' +
    JSON.stringify({
      devEnabled,
      subjects: subjects.length,
      comparisons,
      originalMaterialsRestored: restored,
      outputCameraExposureFixed: fixed,
      rampResources,
    }),
);
export {};
