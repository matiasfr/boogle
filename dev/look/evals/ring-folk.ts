// Ring Island's folk (src/entities/ring-folk/; docs/plans/ring-island-build1.md, step 4e): stages the player in the island
// square (the works yard east of the halt) and a fixed camera for one question per mode (`--query folk=<mode>`):
//   stare     (default) four lookers standing upright facing the shard, two resting, from the lane's west end
//   rest      the two resting crew from 3 m: they turn toward the player when near
//   whistle   from 8 s before a shift boundary: Hooter's whistle, two walk off the posts and two walk on
//   platform  from the east platform at the train doors (u 448): where you step off: can you see the lookers?
//   toss      Rivet off shift on the lane, tossing a rivet (run with --until "window.__folkRivetRests?.()" --real --warm 120)
// `fcam=u,lat,y` and `flook=u,lat,y` (metres from the halt's west end, over the yard deck) move the camera; the pause
// button and any open dialog are hidden so nothing sits over the shot.
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
      : mode === 'toss'
        ? { u: h0 + 21, lat: 3.4 }
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
} else if (mode === 'toss') {
  // Rivet (crew 0) rests in one shift of three; `into` past 150 so the walk to the lane is over.
  (window as unknown as { __folkRivetRests: () => boolean }).__folkRivetRests = () => {
    const tick = inspectRailway()?.tick ?? 0,
      into = tick % folk.ROTA_TICKS;
    return folk.stationOf(folk.RIVET_CREW, folk.shiftAt(tick)).kind === 'rest' && into > 150 && into < 300;
  };
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
cams.toss = [
  { u: folk.REST_UV[0]!.u + 3.5, lat: 1.2, y: Y + 1.5 },
  { u: folk.REST_UV[0]!.u, lat: 6.2, y: Y + 0.9 },
];
const [e0, l0] = cams[mode] ?? cams.stare!;
const qp = new URLSearchParams(location.search);
const pick = (k: string, d: Eye): Eye => {
  const v = qp.get(k)?.split(',').map(Number);
  return v && v.length === 3 ? { u: h0 + v[0]!, lat: v[1]!, y: Y + v[2]! } : d;
};
const e = pick('fcam', e0),
  l = pick('flook', l0);
document.querySelectorAll('dialog[open]').forEach((d) => (d as HTMLDialogElement).close());
const hide = document.createElement('style');
hide.textContent = 'dialog, .pause-menu-btn, [class*="pause"] { display: none !important; }';
document.head.append(hide);
const ew = to(e),
  lw = to(l);
window.__debugCam!.set([ew.x, e.y, ew.z], [lw.x, l.y, lw.z]);
window.__debugCam!.set = () => {};

// What the view says as the capture runs, so the whistle can be matched to the frames.
setInterval(() => {
  console.log(`RINGFOLK tick ${inspectRailway()?.tick} into ${(inspectRailway()?.tick ?? 0) % folk.ROTA_TICKS}`);
}, 2000);

export {};
