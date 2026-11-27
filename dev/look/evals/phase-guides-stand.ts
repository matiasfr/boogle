// npm run look -- --rail-seed works-open --eval dev/look/evals/phase-guides-stand.ts --query stand=1081.5,48.5 --until window.__placeDone --hud --size 1200x750 --name pg-quarry-overview
// Standing beside a Wave 1 phase guide (docs/brainstorms/phase-guides.md), on foot with the follow camera.
// Query params:
//   stand=x,z    where the player stands (metres)
//   y=h          optional standing floor height (metres; defaults to land.H(x, z))
//   face=x,z     world point to face (metres)
//   talk=1       press Interact when it offers Talk, opening the card
//   wait=ms      hold before reporting (default 1500)
const { inspectRailway, railRead } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const land = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const page = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const end = performance.now() + 60000;
while (!(railRead()?.ready() && me.body)) {
  if (performance.now() > end) throw new Error('GUIDE_STAND timed out: railway mounted');
  await wait(50);
}
const q = new URLSearchParams(location.search);
const pair = (key: string, x: number, z: number) => {
  const [a, b] = (q.get(key) ?? '').split(',').map(Number);
  return Number.isFinite(a) && Number.isFinite(b) ? { x: a!, z: b! } : { x, z };
};
const at = pair('stand', 1080.5, 42.5);
const face = pair('face', 1085.5, 45.5);
const yParam = Number(q.get('y'));
const floorY = Number.isFinite(yParam) && q.has('y') ? yParam : land.H(at.x, at.z);
teleport(me.body!, at.x, floorY + 0.9, at.z);
me.body!.velocity.set(0, 0, 0);
me.yaw = Math.atan2(at.x - face.x, at.z - face.z);
cam.yaw = me.yaw;
cam.pitch = -0.1;
window.__debugCam!.clear();
const clear = setInterval(() => window.__debugCam!.clear(), 50);
setTimeout(() => clearInterval(clear), 20000);
await wait(Number(q.get('wait') ?? 1500));
// With a stocked rack: stand=1085.9,47.2&face=1088,50&expectRack=1.
if (q.has('expectRack') && interactTarget()?.id !== 'railway-foot-take-0')
  throw new Error('Facing the stocked Quarry rack within reach must offer Shoulder a footing');
if (q.get('talk')) {
  const t = interactTarget();
  if (t?.verb !== 'Talk' || !t.run) throw new Error(`GUIDE_STAND no Talk here: ${t?.verb ?? 'nothing'}`);
  t.run();
  await wait(2500);
}
const scene = inspectRailway()!;
console.log(
  `GUIDE_STAND ${JSON.stringify({
    at,
    picks: interactTarget()?.verb ?? null,
    picksId: interactTarget()?.id ?? null,
    talkCard: document.querySelector('.place-talk:not([hidden])')
      ? {
          name: document.querySelector('.place-talk-name')?.textContent ?? null,
          say: document.querySelector('.place-talk-say')?.textContent ?? null,
        }
      : null,
    stationGuides: scene.worksView?.stationGuides ?? null,
    hooter: scene.worksView?.folkView?.hooter ?? null,
  })}`,
);
page.__placeDone = true;
export {};
