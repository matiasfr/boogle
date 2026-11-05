// Shared pose/palette for the tone boards. Use with --query '...&toneShot=home|place|crossing'.
// The timeout places the debug camera after look's own --view setup; all candidates use these exact coordinates.
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { paintAvatar } = (await import(
  '/src/player/avatars.ts' as string
)) as typeof import('../../../src/player/avatars.ts');
while (!me.body || !me.avatar) await wait(50);
await wait(1000);
me.colorIdx = 5;
paintAvatar(me.avatar!.userData.mat, 5);
const q = new URLSearchParams(location.search),
  shot = q.get('toneShot') ?? 'home';
let pos: [number, number, number] = [-18, 5, -20];
let cam: [number, number, number], target: [number, number, number];
if (shot === 'place') {
  const place = window.__place as { skipTrains(): void; day: { hold: boolean; u: number } };
  place.skipTrains();
  place.day.hold = true;
  place.day.u = 0.26;
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
  cam = [c.x + 12, c.y + 6, c.z - 12];
  target = [c.x - 2, c.y + 0.5, c.z];
} else if (shot === 'crossing') {
  pos = [20, 10, -25];
  cam = [60, 12, 90];
  target = [90, 4, 300];
} else {
  const { groundHeight } = (await import(
    '/src/island/terrain.ts' as string
  )) as typeof import('../../../src/island/terrain.ts');
  pos[1] = groundHeight(pos[0], pos[2]) + 0.5;
  cam = [pos[0] + 4, pos[1] + 2.5, pos[2] - 5];
  target = [pos[0], pos[1] + 0.8, pos[2]];
}
teleport(me.body!, ...pos);
me.body!.velocity.set(0, 0, 0);
me.yaw = 0;
if (q.get('toneTime') === 'sunset') await import('/dev/look/evals/sunset.ts' as string);
else if (q.get('toneTime') === 'night') await import('/dev/look/evals/night.ts' as string);
else if (!q.has('tod')) window.boogle.sky.preview(0.28, 0.5);
setTimeout(() => window.__debugCam!.set(cam, target, 50), 300);
console.info('TONE POSE ' + JSON.stringify({ shot, pos, cam, target }));
export {};
