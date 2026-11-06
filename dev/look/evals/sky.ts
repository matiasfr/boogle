// Matched sky boards: --room proto-<page> --eval dev/look/evals/sky.ts, &skyShot=home|wide|town|gorge|crossing.
// Demo-only beach framing is archived; Place's production sky stays frozen.
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const q = new URLSearchParams(location.search);
const shot = q.get('skyShot') ?? 'home';
const tod = 0.24; // the fixed time of day
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { paintAvatar } = (await import(
  '/src/player/avatars.ts' as string
)) as typeof import('../../../src/player/avatars.ts');
while (!me.body || !me.avatar) await wait(50);
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
}
teleport(me.body!, ...pos);
me.body!.velocity.set(0, 0, 0);
me.yaw = 0;
setTimeout(() => window.__debugCam!.set(cam, target, shot === 'wide' ? 55 : 50), 300);
console.info('SKY POSE ' + JSON.stringify({ shot, tod, pos, cam, target }));
export {};
