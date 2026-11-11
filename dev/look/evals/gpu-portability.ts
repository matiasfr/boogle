// Existing broker look operation, accepted --rail-seed fixtures, production views and real jump input.
// gpuShot=depot|cart|jump|rockets; gpuProfile=portable constrains the device before renderer initialization.
const query = new URLSearchParams(location.search);
const { inspectRailwayLegacy } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, pressJump, releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { renderer } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { onFrame } = (await import('/src/loop.ts' as string)) as typeof import('../../../src/loop.ts');
const { particleCounts } = (await import(
  '/src/render/particles.ts' as string
)) as typeof import('../../../src/render/particles.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (ready: () => boolean, label: string, timeout = 15000) => {
  const end = performance.now() + timeout;
  while (!ready()) {
    if (performance.now() > end) throw new Error(`GPU probe timed out: ${label}`);
    await wait(25);
  }
};
await until(() => !!inspectRailwayLegacy()?.ready && !!me.body, 'railway mounted');
const read = () => inspectRailwayLegacy()!;
const device = (renderer.backend as unknown as { device: GPUDevice }).device;
console.log(
  'GPU PROBE ' +
    JSON.stringify({
      features: [...device.features],
      storage: device.limits.maxStorageBuffersPerShaderStage,
      vertexBuffers: device.limits.maxVertexBuffers,
      colourBytes: device.limits.maxColorAttachmentBytesPerSample,
      msaa: renderer.samples,
    }),
);
if (query.get('gpuProfile') === 'portable' && device.features.has('float32-filterable'))
  throw new Error('Portable device unexpectedly enabled float32-filterable');
const mode = query.get('gpuShot') ?? 'depot';
if (mode === 'depot' || mode === 'cart') {
  const start = performance.now();
  const frame = () => {
    const s = read().line2View;
    // A three-second --video with &gpuTour=1 includes the depot, the cart, then the depot again.
    const cart = mode === 'cart' || (query.has('gpuTour') && Math.floor((performance.now() - start) / 1250) % 2 === 1);
    const p = cart ? [s.cart.x, s.cart.y, s.cart.z] : s.depot;
    if (!p) throw new Error('Depot capture needs --rail-seed q5-stocked');
    window.__debugCam!.set([p[0]! + 7, p[1]! + 5, p[2]! + 9], [p[0]!, p[1]! + 0.8, p[2]!]);
  };
  frame();
  onFrame(frame, { phase: 'late', order: 999, name: 'GPU cart/depot framing' });
  console.log('GPU DEPOT ' + JSON.stringify(read().line2View));
} else if (mode === 'rockets') {
  if (read().line2.completed >= 5) throw new Error('Rockets need a live q5-finishing seed, not a restored completion');
  const p = read().line2View.farHead;
  onFrame(() => window.__debugCam!.set([p.x + 65, p.y + 42, p.z + 80], [p.x, p.y + 30, p.z], 65), {
    phase: 'late',
    order: 999,
    name: 'GPU rocket framing',
  });
  await until(() => read().line2View.head >= 532, 'live Far Head approach', 60000);
  console.log('GPU ROCKETS approaching ' + JSON.stringify(read().line2View.farHead));
  const start = performance.now();
  let last = '';
  onFrame(
    () => {
      const value = JSON.stringify({ done: read().line2.completed, rockets: read().line2View.farHeadRockets });
      if (performance.now() - start < 7000 && value !== last) {
        last = value;
        console.log('GPU ROCKETS live ' + value);
      }
    },
    { phase: 'late', order: 998, name: 'GPU live rocket observation' },
  );
} else if (mode === 'jump') {
  const { interactTarget } = (await import(
    '/src/player/hands.ts' as string
  )) as typeof import('../../../src/player/hands.ts');
  const { triggerAction } = (await import(
    '/src/player/controls.ts' as string
  )) as typeof import('../../../src/player/controls.ts');
  const { PILLARS } = (await import(
    '/src/place/tech-layout.ts' as string
  )) as typeof import('../../../src/place/tech-layout.ts');
  const d = read().reward.jumpDevice;
  teleport(me.body!, d.x, d.y + 0.5, d.z);
  me.body!.velocity.set(0, 0, 0);
  await until(() => interactTarget()?.id === 'railway-jump-device', 'jump device target');
  triggerAction('interact', 'down');
  triggerAction('interact', 'up');
  await until(() => read().jump, 'accepted jump unlock');
  await wait(2000);
  // The reveal owns a capture-phase keyboard listener, as in the existing railway bot's dismiss().
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
  await until(() => !read().reward.showing, 'jump reveal dismissed');
  const pillar = PILLARS[0]!;
  const x = pillar.x + 1000 + 2,
    y = pillar.top,
    z = pillar.z + 1;
  teleport(me.body!, x, y + 0.45, z);
  me.body!.velocity.set(0, 0, 0);
  onFrame(() => window.__debugCam!.set([x + 4, y + 3.5, z + 6], [x, y + 1.2, z], 45), {
    phase: 'late',
    order: 999,
    name: 'GPU jump framing',
  });
  await until(() => me.coyote > 0, 'grounded before jump');
  Object.assign(window, {
    __gpuJump: async () => {
      const before = read().reward.tools.jumps;
      console.log('GPU JUMP before ' + JSON.stringify({ jumps: before, particles: particleCounts() }));
      pressJump();
      await until(() => me.coyote <= 0 && me.body!.velocity.y > 0, 'first jump');
      releaseJump();
      await wait(180);
      pressJump();
      await until(() => read().reward.tools.jumps === before + 1, 'second jump');
      releaseJump();
      console.log(
        'GPU JUMP after ' + JSON.stringify({ jumps: read().reward.tools.jumps, particles: particleCounts() }),
      );
    },
  });
} else if (mode === 'compile-error') {
  const { precompile } = (await import(
    '/src/render/precompile.ts' as string
  )) as typeof import('../../../src/render/precompile.ts');
  const compile = renderer.compileAsync;
  try {
    renderer.compileAsync = () => Promise.reject(new Error('Injected GPU precompile failure'));
    await precompile(new window.boogle.THREE.Group());
  } finally {
    renderer.compileAsync = compile;
  }
} else throw new Error(`Unknown gpuShot: ${mode}`);
export {};
