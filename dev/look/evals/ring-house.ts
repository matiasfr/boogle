// Ring Island's greybox station house (src/proto/greybox/ring-house.ts, drawn by ring.ts), by real input: the walk from
// the east platform's stop mark over the plank crossing to the west platform's fingerpost, timed; the walk in through
// the house's doorway to the bench and out again, never airborne; then a staging for the stills. Staging teleports only;
// every measured move is the controller's. Prints `HOUSE ...` lines and writes `window.__houseResult`.
//   npm run look -- --query 'ring=greybox&househow=walk' --rail-seed crossing-done --eval dev/look/evals/ring-house.ts
// househow=walk (default)  the timed walk, ends at the fingerpost, default camera
// househow=door           in through the doorway to the bench front and back out; ends inside, default third-person camera
// househow=inside         stands the player in the room facing the window, default camera, no walk
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const H = (await import(
  '/src/proto/greybox/ring-house.ts' as string
)) as typeof import('../../../src/proto/greybox/ring-house.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');

const page = window as unknown as Window & { __ring?: unknown; __houseResult?: Record<string, unknown> };
const how = new URLSearchParams(location.search).get('househow') ?? 'walk';
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const say = (text: string) => console.log(`HOUSE ${text}`);
const f2 = (n: number) => +n.toFixed(2);
const until = async (fn: () => unknown, label: string, ms = 60000) => {
  const end = performance.now() + ms;
  while (!fn()) {
    if (performance.now() > end) throw new Error(`ring-house: ${label}`);
    await wait(50);
  }
};
if (!(await railReady())) throw new Error('ring-house: the railway never became ready');
await until(() => page.__ring && me.body, 'greybox and body ready');
const b = me.body!;
const result: Record<string, unknown> = {};
page.__houseResult = result;
const faceTo = (dx: number, dz: number) => {
  cam.yaw = me.yaw = Math.atan2(-dx, -dz);
};
const stage = async (x: number, y: number, z: number) => {
  teleport(b, x, y + PLAYER_R + 0.3, z);
  b.velocity.set(0, 0, 0);
  input.keys.clear();
  releaseJump();
  await wait(800);
};
let air = 0,
  longestAir = 0;
const watch = setInterval(() => {
  if (me.coyote > 0) air = 0;
  else longestAir = Math.max(longestAir, (air += 0.05));
}, 50);
/** Walk by holding forward, facing each waypoint; returns the seconds taken, or null if it never arrived. */
async function walkTo(x: number, z: number, tol: number, ms = 20000) {
  const t0 = performance.now();
  input.keys.add('KeyW');
  try {
    while (performance.now() - t0 < ms) {
      const dx = x - b.position.x,
        dz = z - b.position.z;
      if (Math.hypot(dx, dz) < tol) return (performance.now() - t0) / 1000;
      faceTo(dx, dz);
      await wait(16);
    }
    return null;
  } finally {
    input.keys.delete('KeyW');
  }
}
const uv = (u: number, lat: number) => H.at(u, lat);
const Y = H.HALT.platformY;

if (how === 'walk') {
  // the east platform's stop mark (u 448, mid-platform), then the platforms' north end, across the crossing, to the
  // fingerpost at the west platform's north end (u 464, 1.7 m off its edge)
  const start = uv(448, 3.5);
  await stage(start.x, Y, start.z);
  const legs: [string, number, number][] = [
    ['east platform north end', 469.5, 3.5],
    ['over the crossing', 469.5, -7.5],
    ['west platform, at the fingerpost', 464.6, -7.5],
  ];
  const times: Record<string, number | null> = {};

  const t0 = performance.now();
  for (const [name, u, lat] of legs) {
    const p = uv(u, lat);
    times[name] = await walkTo(p.x, p.z, 0.9);
    if (times[name] === null) break;
  }
  const total = (performance.now() - t0) / 1000;
  Object.assign(result, {
    times,
    total: f2(total),
    longestAir: f2(longestAir),
    end: { x: f2(b.position.x), y: f2(b.position.y), z: f2(b.position.z) },
  });
  say(`walk ${JSON.stringify(result)}`);
} else if (how === 'door') {
  // from the forecourt, in through the doorway to the bench's front, and back out to the forecourt
  const w = (x: number, z: number) => H.toWorld(x, 0, z);
  const out = w(H.HOUSE.door.x, H.HOUSE.room.d / 2 + 3.5);
  await stage(out.x, Y, out.z);
  const legs: [string, { x: number; z: number }][] = [
    ['through the door', w(H.HOUSE.door.x, 1.3)],
    ['to the bench front', w(0.3, 0.4 - 0.5 - 0.3)],
    ['back round the bench', w(H.HOUSE.door.x, 1.3)],
    ['out', out],
  ];
  const times: Record<string, number | null> = {};
  for (const [name, p] of legs) {
    times[name] = await walkTo(p.x, p.z, 0.6);
    if (times[name] === null) break;
  }
  Object.assign(result, {
    times,
    longestAir: f2(longestAir),
    end: { x: f2(b.position.x), y: f2(b.position.y), z: f2(b.position.z) },
  });
  say(`door ${JSON.stringify(result)}`);
  // finish inside, facing the window, for the third-person still
  const inside = w(0.3, -0.6);
  await stage(inside.x, Y, inside.z);
  const f = H.dirToWorld(0, 0, -1);
  faceTo(f.x, f.z);
  await wait(1200);
} else if (how === 'perf') {
  // draw calls and triangles at the halt (renderer.info right after completed game frames, as dev/look/perf.ts reads
  // them); run with &house=0 and without it: the difference is what the concourse, house and paint add
  const { renderer } = (await import(
    '/src/render/scene.ts' as string
  )) as typeof import('../../../src/render/scene.ts');
  const start = uv(448, 3.5);
  await stage(start.x, Y, start.z);
  const frames = () =>
    (window as unknown as { boogle: { prof: { last: { frames: number } } } }).boogle.prof.last.frames;
  await wait(3000);
  const drawCalls: number[] = [],
    triangles: number[] = [];
  for (let k = 0; k < 10; k++) {
    const was = frames();
    await until(() => frames() > was, 'a completed frame', 30000);
    drawCalls.push(renderer.info.render.drawCalls);
    triangles.push(renderer.info.render.triangles);
  }
  const root = (page.__ring as { root: { children: unknown[] } }).root;
  say(
    `perf ${JSON.stringify({ house: new URLSearchParams(location.search).get('house') !== '0', drawCalls: [Math.min(...drawCalls), Math.max(...drawCalls)], triangles: [Math.min(...triangles), Math.max(...triangles)], greyboxMeshes: root.children.length })}`,
  );
} else {
  const inside = H.toWorld(0, 0, 1.4);
  await stage(inside.x, Y, inside.z);
  const f = H.dirToWorld(0, 0, -1);
  faceTo(f.x, f.z);
  await wait(1500);
  say(`inside ${JSON.stringify({ x: f2(b.position.x), y: f2(b.position.y), z: f2(b.position.z) })}`);
}
clearInterval(watch);
// keep the game's own third-person camera for the capture: look would otherwise put its debug camera on top
window.__debugCam?.clear();
if (window.__debugCam) window.__debugCam.set = () => {};
export {};
