// One opt-in timestamp measurement of the actual first cube bake. No cached resolve total, no extra bake.
import { renderer } from '../render/scene.ts';
type Backend = {
  trackTimestamp: boolean;
  initTimestampQuery(type: string, uid: string, descriptor: unknown): void;
  timestampQueryPool: { render?: { timestamps: Map<string, number> } };
};
export let result: unknown;
export async function measureSkyBake(bake: () => void) {
  const backend = renderer.backend as unknown as Backend;
  await renderer.resolveTimestampsAsync('render');
  const original = backend.initTimestampQuery;
  let passes = 0;
  backend.initTimestampQuery = function (type, uid, descriptor) {
    original.call(this, type, type === 'render' ? `sky-bake-${passes++}:${uid}` : uid, descriptor);
  };
  const start = performance.now();
  try {
    bake();
  } finally {
    backend.initTimestampQuery = original;
  }
  const cpuMs = performance.now() - start;
  await renderer.resolveTimestampsAsync('render');
  const samples = [...(backend.timestampQueryPool.render?.timestamps ?? [])].filter(([id]) =>
    id.startsWith('sky-bake-'),
  );
  result = {
    cpuMs,
    passes,
    gpuMs: backend.trackTimestamp && samples.length === passes ? samples.reduce((sum, [, ms]) => sum + ms, 0) : null,
    samples,
    scope: 'six cube face draws; excludes texture upload, mip generation, PMREM and ambient readback',
  };
  console.info('SKY BAKE ' + JSON.stringify(result));
}
