// Matched sky boards: --room proto-<page> --eval dev/look/evals/sky.ts, &skyShot=home|wide|town|gorge|crossing|beach.
// The toon water background is a capture-only override; its custom water reflections still sample the demo cube.
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const q = new URLSearchParams(location.search);
const shot = q.get('skyShot') ?? 'home';
const tod = Number(q.get('tod') ?? 0.24);
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { paintAvatar } = (await import(
  '/src/player/avatars.ts' as string
)) as typeof import('../../../src/player/avatars.ts');
const { onFrame } = (await import('/src/loop.ts' as string)) as typeof import('../../../src/loop.ts');
const { skyDebug, updateSky } = (await import(
  '/src/render/sky.ts' as string
)) as typeof import('../../../src/render/sky.ts');
const { scene, sky, camera } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
while (!me.body || !me.avatar) await wait(50);
if (q.get('sky') === 'demo') await import('/src/proto/demo-sky.ts' as string);
await wait(1200);
me.colorIdx = 5;
paintAvatar(me.avatar!.userData.mat, 5);
let pos: [number, number, number] = [-18, 5.494, -20];
let cam: [number, number, number] = [-13, 7.2, -25];
let target: [number, number, number] = [-18, 7.3, -20];
if (shot === 'wide') {
  cam = [65, 42, -110];
  target = [-15, 24, 15];
} else if (shot === 'town' || shot === 'gorge') {
  const place = window.__place as { skipTrains(): void; day: { hold: boolean }; H(x: number, z: number): number };
  place.day.hold = true;
  place.skipTrains();
  await wait(3000);
  const { L1, L2, hub, allHeaps } = (await import(
    '/src/proto/place/lines.ts' as string
  )) as typeof import('../../../src/proto/place/lines.ts');
  const { drawHeaps } = (await import(
    '/src/proto/net/crates.ts' as string
  )) as typeof import('../../../src/proto/net/crates.ts');
  L1.train.park(0);
  L2.train.park(1);
  hub.list.splice(0, hub.list.length, ...Array<'wood'>(16).fill('wood'));
  drawHeaps(allHeaps);
  const c = L1.train.tr.cars[0]!;
  pos = [c.x - 3, 18.6, c.z - 3];
  cam = [c.x + 17, c.y + 6, c.z - 20];
  target = [c.x - 3, c.y + 5, c.z + 2];
  if (shot === 'gorge') {
    pos = [900, place.H(900, -80) + 0.5, -80];
    cam = [892, 32, -64];
    target = [1030, 30, -125];
  }
} else if (shot === 'crossing') {
  const cross = window.__crossing as {
    LENGTH: number;
    clock: { running: boolean };
    seekS(s: number): void;
    lineAt(
      s: number,
      out: { x: number; z: number; ux: number; uz: number },
    ): { x: number; z: number; ux: number; uz: number };
    railY(s: number): number;
  };
  const s = cross.LENGTH * 0.42;
  cross.seekS(s);
  cross.clock.running = false;
  const p = cross.lineAt(s, { x: 0, z: 0, ux: 0, uz: 1 });
  const y = cross.railY(s);
  pos = [p.x - p.uz * 2.1, y + 1.2, p.z + p.ux * 2.1];
  cam = [p.x - 9, y + 5, p.z - 16];
  target = [p.x + 8, y + 4, p.z + 110];
} else if (shot === 'beach') {
  const { islandHeight } = (await import(
    '/src/proto/water/height.ts' as string
  )) as typeof import('../../../src/proto/water/height.ts');
  let x = 100;
  while (islandHeight(x, -100) > 2) x++;
  pos = [2400 + x - 6, islandHeight(x - 6, -100) + 0.5, -100];
  cam = [pos[0] - 6, pos[1] + 2.4, pos[2] - 7];
  target = [pos[0] + 8, pos[1] + 2.2, pos[2] + 6];
  if (q.get('sky') !== 'demo') {
    const { demoSky } = (await import(
      '/src/proto/water/sky.ts' as string
    )) as typeof import('../../../src/proto/water/sky.ts');
    skyDebug.preview(tod, 0.5);
    updateSky(0);
    const d = skyDebug.state.sunDir;
    demoSky.update({ elevation: (Math.asin(d.y) * 180) / Math.PI, azimuth: (Math.atan2(d.x, d.z) * 180) / Math.PI });
    demoSky.update = () => {};
    onFrame(
      () => {
        updateSky(0);
        sky.visible = true;
        sky.position.copy(camera.position);
        scene.backgroundNode = null;
        scene.environment = null;
        const f = scene.fog as { near: number; far: number };
        f.near = 18000;
        f.far = 80000;
      },
      { phase: 'late', order: 1090 },
    );
  }
}
// Place's own day writes preview after updateSky; override before the next sky update for a truly identical sun.
onFrame(() => skyDebug.preview(tod, 0.5), { phase: 'update', order: -6 });
teleport(me.body!, ...pos);
me.body!.velocity.set(0, 0, 0);
me.yaw = 0;
setTimeout(() => window.__debugCam!.set(cam, target, shot === 'wide' ? 55 : 50), 300);
if (q.get('skyBake') === '1') {
  const { result } = (await import(
    '/src/debug/sky-bake.ts' as string
  )) as typeof import('../../../src/debug/sky-bake.ts');
  console.info('SKY BAKE RESULT ' + JSON.stringify(result));
  document.querySelectorAll('[style]').forEach((el) => {
    if (el.textContent?.includes('Measure 5 seconds')) (el as HTMLElement).style.display = 'none';
  });
}
console.info('SKY POSE ' + JSON.stringify({ shot, tod, pos, cam, target }));
export {};
