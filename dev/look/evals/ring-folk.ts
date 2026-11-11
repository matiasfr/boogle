// Ring Island's folk (src/entities/ring-folk/; docs/plans/ring-island-build1.md, step 4e): stages the player in the island
// square (the works yard east of the halt) facing the posts, so the stills show four lookers leaning back at the shard and
// two resting. Stills and motion only; every state is the view's own.
//   npm run look -- --rail-seed ring-joined --eval dev/look/evals/ring-folk.ts                       the stare
//   npm run look -- --rail-seed ring-joined --query folk=nod --eval dev/look/evals/ring-folk.ts     stand still, look up: a nod after 1.5 s
//   npm run look -- --rail-seed ring-joined --seconds 50 --frames 10 --eval dev/look/evals/ring-folk.ts   the whistle swaps two (every 45 s of room time)
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const ring = (await import(
  '/src/entities/ring-island/state.ts' as string
)) as typeof import('../../../src/entities/ring-island/state.ts');
const folk = (await import(
  '/src/entities/ring-folk/shape.ts' as string
)) as typeof import('../../../src/entities/ring-folk/shape.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const until = async (fn: () => unknown, label: string, ms = 60000) => {
  const end = performance.now() + ms;
  while (!fn()) {
    if (performance.now() > end) throw new Error(`ring-folk: ${label}`);
    await wait(50);
  }
};
const mode = new URLSearchParams(location.search).get('folk') ?? 'stare';

await until(() => me.body && inspectRailway()?.ready, 'body and railway ready');
const b = me.body!;
const to = (uv: { u: number; lat: number }) => folk.worldOf(uv);
// Nod: in the middle of the square. Stare: back on the lane's west end, the four posts ahead and the rests beside you.
const stand = mode === 'nod' ? folk.SQUARE_UV : { u: folk.POST_UV[0]!.u - 7, lat: 6.2 };
const p = to(stand),
  c = to(folk.SQUARE_UV);
teleport(b, p.x, folk.YARD_Y + PLAYER_R + 0.3, p.z);
b.velocity.set(0, 0, 0);
input.keys.clear();
releaseJump();
cam.yaw = me.yaw = Math.atan2(-(c.x - p.x), -(c.z - p.z));
cam.pitch = mode === 'nod' ? 0.9 : -0.05;
await until(() => ring.ringIslandNear.mounted, 'near view mounted');
await wait(mode === 'nod' ? 300 : 1500);
// look would otherwise freeze its own default camera over the staging: a fixed one for the nod (on the nearest looker) and
// for the stare one on the lane's east end, high, looking at the square's middle (posts ahead, rests beside).
if (mode !== 'nod') {
  const eye = to({ u: folk.SQUARE_UV.u - 5, lat: 5.2 });
  window.__debugCam!.set([eye.x, folk.YARD_Y + 3.2, eye.z], [c.x, folk.YARD_Y + 1.6, c.z]);
} else {
  // the nod fires once, 1.5 s into the stillness, so the setup hardly waits (run with --warm 0); the nearest looker is post 2, 1.6 m from the player: watch it from the lane's east side, level with its head, the player out of the line
  const eye = to({ u: folk.POST_UV[2]!.u + 0.3, lat: 8.0 }),
    at = to(folk.POST_UV[2]!);
  window.__debugCam!.set([eye.x, folk.YARD_Y + 1.5, eye.z], [at.x, folk.YARD_Y + 1.2, at.z]);
}
window.__debugCam!.set = () => {};

export {};
