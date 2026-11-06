// Reuse the established authored town fixture; the sun camera follows the real frozen light.
const { setupVisualPipeline } = (await import(
  '/dev/look/fixtures/visual-pipeline.ts' as string
)) as typeof import('../fixtures/visual-pipeline.ts');
await setupVisualPipeline();
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { SUN_DIR } = (await import(
  '/src/render/sun-dir.ts' as string
)) as typeof import('../../../src/render/sun-dir.ts');
scene.userData.sunSkyCamera = {
  cam: [884, 8, 151],
  look: [884 + SUN_DIR.x * 100, 8 + SUN_DIR.y * 100, 151 + SUN_DIR.z * 100],
  fov: 62,
};
export {};
