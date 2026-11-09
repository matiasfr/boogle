// Authored built-town fixture, not played progression. Same cameras before/after; real adaptation warm-up.
await import('/dev/look/evals/place-job.ts' as string);
const { canvas, renderFrame } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const { rooms } = (await import(
  '/src/proto/place/place-rooms.ts' as string
)) as typeof import('../../../src/proto/place/place-rooms.ts');
const { skyNow } = (await import('/src/render/sky.ts' as string)) as typeof import('../../../src/render/sky.ts');
const { hardwareTiming } = (await import(
  '/src/debug/prof-overlay.ts' as string
)) as typeof import('../../../src/debug/prof-overlay.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { waterRuntime } = (await import(
  '/src/render/water-render.ts' as string
)) as typeof import('../../../src/render/water-render.ts');
const { lockExposure, lookSnapshot } = (await import(
  '/src/render/water/looks.ts' as string
)) as typeof import('../../../src/render/water/looks.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const capture = (name: string) => {
  renderFrame();
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  copy.getContext('2d')!.drawImage(canvas, 0, 0);
  const data = copy.toDataURL('image/png').split(',')[1]!;
  console.log(`SHOTS BEGIN ${name}.png ${data.length}`);
  for (let i = 0; i < data.length; i += 16000) console.log('SHOTS DATA ' + data.slice(i, i + 16000));
  console.log('SHOTS END');
};
const q = new URLSearchParams(location.search);
const { bindings } = (await import(
  '/src/render/water/live.ts' as string
)) as typeof import('../../../src/render/water/live.ts');
const { readableIntensity } = (await import(
  '/src/render/readable-unlit.ts' as string
)) as typeof import('../../../src/render/readable-unlit.ts');
const place = window.__place as {
  activeFrame(): { x: number; y: number; z: number } | null;
  H(x: number, z: number): number;
};
const station = place.activeFrame();
const sandY = place.H(890, 144);
type V3 = [number, number, number];
const inside = (room: typeof rooms.shop, x: number, y: number, z: number): V3 => [
  room.x + x * Math.cos(room.yaw) + z * Math.sin(room.yaw),
  room.y + y,
  room.z - x * Math.sin(room.yaw) + z * Math.cos(room.yaw),
];
const views: { name: string; cam: V3; look: V3; stand?: V3 }[] = [
  { name: 'town', cam: [909, 24.45, 35], look: [903, 19.15, 20] },
  ...(station
    ? [
        {
          name: 'station',
          cam: [station.x, station.y + 4, station.z + 11] as V3,
          look: [station.x, station.y + 2.9, station.z] as V3,
        },
      ]
    : []),
  { name: 'sign', cam: [892, 20, 12], look: [886, 20, 11] },
  { name: 'shore', cam: [884, 8, 151], look: [868, 0, 144] },
  { name: 'sand', cam: [890, sandY + 7, 144], look: [890, sandY, 144.01] },
  {
    name: 'sky',
    cam: [890, 25, 65],
    look: [890 + skyNow.sunDir.x * 100, 25 + skyNow.sunDir.y * 100, 65 + skyNow.sunDir.z * 100],
  },
  { name: 'underwater', cam: [868, -3, 144], look: [830, -4, 180] },
  { name: 'waterline', cam: [868, 0, 144], look: [830, -1, 180] },
  ...(['shop', 'museum'] as const).map((id) => ({
    name: id,
    cam: inside(rooms[id], 0, 1.7, 1),
    look: inside(rooms[id], 0, 1.7, -3),
    stand: inside(rooms[id], 0, 0.9, 4),
  })),
];
await wait(1000);
for (const view of views) {
  const only = q.get('exposureView');
  if (only && !only.split(',').includes(view.name)) continue;
  if (view.stand && me.body) {
    teleport(me.body, ...view.stand);
    me.body.velocity.set(0, 0, 0);
  }
  window.__debugCam!.set(view.cam, view.look, 62);
  for (const value of q.get('gainList')?.split(',').map(Number) ?? [null]) {
    if (value !== null) {
      if (!Number.isFinite(value) || value <= 0 || !bindings.has('post.centre'))
        throw new Error('Invalid fixed gain bracket');
      bindings.get('post.centre')!.set(value);
      bindings.get('post.underwaterEV')!.set(Math.log2(0.28 / value));
    }
    await wait(6000);
    if (view.name === 'town' && !q.has('noGPU')) {
      const { setGraphics } = (await import(
        '/src/graphics-settings.ts' as string
      )) as typeof import('../../../src/graphics-settings.ts');
      const meterCases = q.has('meterAblation') ? [true, false, false, true] : [null, null];
      for (const [run, meter] of meterCases.entries()) {
        if (meter !== null) {
          await setGraphics('meter', meter);
          await wait(2000);
        }
        console.log(
          'EXPOSURE GPU ' +
            JSON.stringify({
              run,
              variant: q.get('exposureCase'),
              meter,
              contention: 'unknown: shared Mac; task runs serially',
              timing: await hardwareTiming(5),
            }),
        );
      }
    }
    await lockExposure(true);
    const exposure = lookSnapshot().exposure;
    await lockExposure(false);
    capture(view.name + (value === null ? '' : '-gain' + value));
    console.log(
      'EXPOSURE VIEW ' +
        JSON.stringify({ view, exposure, readableIntensity: readableIntensity(), water: waterRuntime.inspect() }),
    );
  }
}
// Real crystal/crate update paths in an authored fixture; no alternate reward shader or emitter.
if (q.has('rewards')) {
  const { crystalAt, snapCrystals } = (await import(
    '/src/proto/place/crystals.ts' as string
  )) as typeof import('../../../src/proto/place/crystals.ts');
  const { deliver, openCrate } = (await import(
    '/src/proto/place/gifts.ts' as string
  )) as typeof import('../../../src/proto/place/gifts.ts');
  const body = me.body!;
  const c = crystalAt(0);
  teleport(body, c.x + 7, c.y, c.z);
  body.velocity.set(0, 0, 0);
  snapCrystals([]);
  window.__debugCam!.set([c.x + 4, c.y + 3, c.z + 8], [c.x, c.y, c.z], 48);
  await wait(6000);
  capture('crystal');
  teleport(body, c.x + 1, c.y, c.z);
  body.velocity.set(0, 0, 0);
  await wait(450);
  capture('crystal-burst');
  console.log('EXPOSURE REWARD ' + JSON.stringify({ state: c.state, intensity: readableIntensity() }));
  const x = 903,
    y = 18.3,
    z = 22;
  teleport(body, x + 5, y + 2, z);
  body.velocity.set(0, 0, 0);
  deliver(x, y, z, null);
  window.__debugCam!.set([x + 4, y + 3, z + 8], [x, y + 1, z], 48);
  await wait(6000);
  capture('crate');
  openCrate({ x, z });
  await wait(550);
  capture('crate-burst');
  await wait(850);
  capture('crate-prize');
}
export {};
