// Standing where Grant passed the forge's pedestal (docs/plans/forge-call-handoff.md, "Done means"), on foot with the
// game's follow camera: (922, 6) at 7 m by default, `stand=x,z` for another of his passes, `face=x,z` to look at
// something else (the rack's board). Reports the prompt on offer, the target Interact would pick, the hoist and the
// crew's foreman (forge-guide.ts: his stage, bubble and unread `…`). `wait=ms` holds before the report (default 1500). `take=1` first takes what waits on the pedestal, as a player
// would, so the foreman's later stages show (--rail-seed trains-on take=1: the breaker taken, no seam struck).
//   npm run look -- --rail-seed q5-done --eval dev/look/evals/forge-pedestal-stand.ts --until window.__placeDone \
//     --hud --name pedestal-7m
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
  if (performance.now() > end) throw new Error('STAND timed out: railway mounted');
  await wait(50);
}
const q = new URLSearchParams(location.search);
const pair = (key: string, x: number, z: number) => {
  const [a, b] = (q.get(key) ?? '').split(',').map(Number);
  return Number.isFinite(a) && Number.isFinite(b) ? { x: a!, z: b! } : { x, z };
};
if (q.get('take')) {
  teleport(me.body!, 921, land.H(921, -1.5) + 0.9, -1.5);
  me.body!.velocity.set(0, 0, 0);
  me.yaw = cam.yaw = Math.atan2(921 - 922, -1.5 + 1.17);
  await wait(800);
  const t = interactTarget();
  if (!t?.run) throw new Error(`STAND nothing to take: ${t?.verb ?? 'no target'}`);
  t.run();
  const by = performance.now() + 15000;
  while (inspectRailway()!.hoist?.part) {
    if (performance.now() > by) throw new Error('STAND the take never landed');
    await wait(100);
  }
}
const at = pair('stand', 922, 6),
  face = pair('face', 922, -1.17);
teleport(me.body!, at.x, land.H(at.x, at.z) + 0.9, at.z);
me.body!.velocity.set(0, 0, 0);
me.yaw = Math.atan2(at.x - face.x, at.z - face.z);
cam.yaw = me.yaw;
cam.pitch = -0.1;
window.__debugCam!.clear();
const clear = setInterval(() => window.__debugCam!.clear(), 50);
setTimeout(() => clearInterval(clear), 20000);
await wait(Number(q.get('wait') ?? 1500));
const scene = inspectRailway()!;
console.log(
  `STAND ${JSON.stringify({
    at,
    prompt: document.querySelector('.prompt, .interact-prompt')?.textContent ?? null,
    picks: interactTarget()?.verb ?? null,
    hoist: scene.hoist,
    guide: scene.guide,
    rackSign: scene.line2View.rackSign,
  })}`,
);
page.__placeDone = true;
export {};
