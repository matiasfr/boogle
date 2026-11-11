// Ring Island's folk (src/entities/ring-folk/; docs/plans/ring-island-build1.md, step 4e): stages the player in the island
// square (the works yard east of the halt) and a fixed camera for one question per mode (`--query folk=<mode>`):
//   stare     (default) four lookers standing upright facing the shard, two resting, from the lane's west end
//   rest      the two resting crew from 3 m: they turn toward the player when near
//   whistle   from 8 s before a shift boundary: Hooter's whistle, two walk off the posts and two walk on
//   platform  from the east platform at the train doors (u 448): where you step off: can you see the lookers?
//   npm run look -- --rail-seed ring-joined --eval dev/look/evals/ring-folk.ts --size 960x600
//   npm run look -- --rail-seed ring-joined --eval dev/look/evals/ring-folk.ts --size 390x844 --name phone
//   npm run look -- --rail-seed ring-joined --query folk=whistle --real --warm 120 --until "window.__folkInto?.() >= 365 && window.__folkInto() < 440" --seconds 14 --frames 12 --eval dev/look/evals/ring-folk.ts
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
type UV = { u: number; lat: number };
const to = (uv: UV) => folk.worldOf(uv);
const c = to(folk.SQUARE_UV);
const Y = folk.YARD_Y;
const h0 = folk.POST_UV[0]!.u - 17.5;
const stand: UV =
  mode === 'rest'
    ? { u: h0 + 6.5, lat: 6.2 }
    : mode === 'platform' || mode === 'whistle'
      ? { u: h0 + 19, lat: 3.4 }
      : { u: folk.POST_UV[0]!.u - 7, lat: 6.2 };
const p = to(stand);
teleport(b, p.x, Y + PLAYER_R + 0.3, p.z);
b.velocity.set(0, 0, 0);
input.keys.clear();
releaseJump();
cam.yaw = me.yaw = Math.atan2(-(c.x - p.x), -(c.z - p.z));
cam.pitch = -0.05;
await until(() => ring.ringIslandNear.mounted, 'near view mounted');
if (mode === 'whistle') {
  // Room time does not run during the eval, only in the warm-up: this says how far into a shift the room is, and the run
  // is started with --until "window.__folkInto?.() >= 365 && window.__folkInto() < 440" --real --warm 120 (the room clock only runs in real time, about 10 ticks a second) so the capture opens
  // 5 to 8 s before the whistle.
  (window as unknown as { __folkInto: () => number }).__folkInto = () =>
    (inspectRailway()?.tick ?? 0) % folk.ROTA_TICKS;
} else await wait(1500);
// look would otherwise freeze its own default camera over the staging: a fixed one per mode.
type Eye = UV & { y: number };
const cams: Record<string, [Eye, Eye]> = {
  stare: [
    { u: folk.SQUARE_UV.u - 5, lat: 5.2, y: Y + 3.2 },
    { ...folk.SQUARE_UV, y: Y + 1.6 },
  ],
  rest: [
    { u: folk.REST_UV[0]!.u + 1, lat: 3.4, y: Y + 1.7 },
    { u: folk.REST_UV[0]!.u + 1, lat: 6.2, y: Y + 0.9 },
  ],
  whistle: [
    { u: h0 + 25.5, lat: 4.2, y: Y + 3.2 },
    { u: h0 + 16, lat: 8.8, y: Y + 0.8 },
  ],
  platform: [
    { u: h0 + 19, lat: 3.4, y: Y + 1.9 },
    { ...folk.SQUARE_UV, y: Y + 1.2 },
  ],
};
const [e, l] = cams[mode] ?? cams.stare!;
const ew = to(e),
  lw = to(l);
window.__debugCam!.set([ew.x, e.y, ew.z], [lw.x, l.y, lw.z]);
window.__debugCam!.set = () => {};

// What the view says as the capture runs, so the whistle can be matched to the frames.
setInterval(() => {
  console.log(`RINGFOLK tick ${inspectRailway()?.tick} into ${(inspectRailway()?.tick ?? 0) % folk.ROTA_TICKS}`);
}, 2000);

export {};
