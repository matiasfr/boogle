// Authored built-town fixture, not played progression. Same cameras before/after; real adaptation warm-up.
await import('/dev/look/evals/place-job.ts' as string);
const { canvas, renderFrame } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const { rooms } = (await import(
  '/src/proto/place/rooms.ts' as string
)) as typeof import('../../../src/proto/place/rooms.ts');
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
type V3 = [number, number, number];
const inside = (room: typeof rooms.shop, x: number, y: number, z: number): V3 => [
  room.x + x * Math.cos(room.yaw) + z * Math.sin(room.yaw),
  room.y + y,
  room.z - x * Math.sin(room.yaw) + z * Math.cos(room.yaw),
];
const views: { name: string; cam: V3; look: V3; stand?: V3 }[] = [
  { name: 'town', cam: [909, 24.45, 35], look: [903, 19.15, 20] },
  { name: 'sign', cam: [892, 20, 12], look: [886, 20, 11] },
  { name: 'shore', cam: [884, 8, 151], look: [868, 0, 144] },
  { name: 'sand', cam: [803, 7, 10], look: [803, 0, 10.01] },
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
  const only = new URLSearchParams(location.search).get('exposureView');
  if (only && view.name !== only) continue;
  if (view.stand && me.body) {
    teleport(me.body, ...view.stand);
    me.body.velocity.set(0, 0, 0);
  }
  window.__debugCam!.set(view.cam, view.look, 62);
  await wait(6000);
  if (view.name === 'town') {
    for (let run = 0; run < 2; run++)
      console.log(
        'EXPOSURE GPU ' + JSON.stringify({ run, contention: 'unknown: shared Mac', timing: await hardwareTiming(3) }),
      );
  }
  await lockExposure(true);
  const exposure = lookSnapshot().exposure;
  await lockExposure(false);
  renderFrame();
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const ctx = copy.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);
  const data = copy.toDataURL('image/png').split(',')[1]!;
  console.log(`SHOTS BEGIN ${view.name}.png ${data.length}`);
  for (let i = 0; i < data.length; i += 16000) console.log('SHOTS DATA ' + data.slice(i, i + 16000));
  console.log('SHOTS END');
  console.log('EXPOSURE VIEW ' + JSON.stringify({ view, exposure, water: waterRuntime.inspect() }));
}
export {};
