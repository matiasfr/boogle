const { setupVisualPipeline } = (await import(
  '/dev/look/fixtures/visual-pipeline.ts' as string
)) as typeof import('../fixtures/visual-pipeline.ts');
await setupVisualPipeline();
export {};
