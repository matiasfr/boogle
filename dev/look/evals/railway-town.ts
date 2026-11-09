// The live game's town (src/entities/town/): stand Buddy at a door, facing in, with the debug camera behind, then
// optionally act. Seed later stages with --rail-seed; no shared state is written here.
//   townat=house|shop|museum  1 m inside that door, facing in (a plot not yet built: in front of its stake board)
//   townat=street             on the lane between the three plots, looking at the house and the boards
//   townat=sleeves            on the path at Sleeves, the shore greeter, looking toward the house door
//   townact=walkout           after a moment indoors, walk 3 m out of the door (T2 adds talk, T5 try and take);
//                             with towndefer=1 it waits for an --action body `await window.__townAct(); export {};`
// Prints `TOWN <json>` with the town's inspection after the setup and again after the act.
const { inspectTown } = (await import(
  '/src/entities/town/state.ts' as string
)) as typeof import('../../../src/entities/town/state.ts');
const { railwayRead } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { interactDown, interactUp, interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const layout = (await import(
  '/src/proto/place/layout.ts' as string
)) as typeof import('../../../src/proto/place/layout.ts');
const land = (await import('/src/proto/place/land.ts' as string)) as typeof import('../../../src/proto/place/land.ts');
const shore = (await import(
  '/src/proto/place/shore-layout.ts' as string
)) as typeof import('../../../src/proto/place/shore-layout.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = performance.now() + 20000;
while ((!inspectTown() || !railwayRead()?.ready || !me.body) && performance.now() < deadline) await wait(50);
if (!inspectTown() || !railwayRead()?.ready || !me.body)
  throw new Error('railway-town needs the live town and railway');
const body = me.body;
const query = new URLSearchParams(location.search);
const at = query.get('townat') ?? 'house';
const act = query.get('townact');
type V = { x: number; y: number; z: number };
const ground = (x: number, z: number): V => ({ x, y: land.H(x, z), z });
/** A room's door in world space, and the way in. */
function door(id: 'house' | 'shop' | 'museum') {
  const p = layout.ROOM_PLOTS[id];
  const x = layout.toWorld(p.x),
    s = Math.sin(p.yaw),
    c = Math.cos(p.yaw);
  return { x: x + (p.d / 2) * s, z: p.z + (p.d / 2) * c, inX: -s, inZ: -c, d: p.d, cx: x, cz: p.z };
}
let stand: V, look: V, eye: V;
if (at === 'house' || at === 'shop' || at === 'museum') {
  const d = door(at);
  const up = inspectTown()!.rooms[at].up;
  // Built: 1 m inside. A plot: 3.5 m in front of its board (the board stands 2 m out from the door line).
  const out = up ? -1 : 5.5;
  stand = ground(d.x - d.inX * out, d.z - d.inZ * out);
  look = { x: d.cx, y: stand.y + 1.2, z: d.cz };
  eye = { x: stand.x - d.inX * 4.5, y: stand.y + 3.2, z: stand.z - d.inZ * 4.5 };
} else if (at === 'street') {
  const h = door('house'),
    s = door('shop'),
    m = door('museum');
  const mid = { x: (h.x + s.x + m.x) / 3 + 7, z: (h.z + s.z + m.z) / 3 };
  stand = ground(mid.x, mid.z);
  look = { x: (h.cx + s.cx + m.cx) / 3, y: stand.y + 1.5, z: (h.cz + s.cz + m.cz) / 3 };
  eye = { x: stand.x + 9, y: stand.y + 7, z: stand.z + 2 };
} else if (at === 'sleeves') {
  const g = ground(layout.toWorld(shore.SHORE_WORKER.x), shore.SHORE_WORKER.z);
  const h = door('house');
  // On the path a step from Sleeves, toward the village: what a newcomer sees of the house from there.
  const toX = h.x - g.x,
    toZ = h.z - g.z,
    len = Math.hypot(toX, toZ);
  stand = ground(g.x + (toX / len) * 1.5, g.z + (toZ / len) * 1.5);
  look = { x: h.x, y: land.H(h.x, h.z) + 1.5, z: h.z };
  eye = { x: stand.x - (toX / len) * 5, y: stand.y + 3, z: stand.z - (toZ / len) * 5 };
} else throw new Error('Choose townat=house|shop|museum|street|sleeves');
teleport(body, stand.x, stand.y + 0.9, stand.z);
body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(-(look.x - stand.x), -(look.z - stand.z));
cam.pitch = -0.15;
const free = query.get('towncam') === 'follow';
const setCam = () => {
  if (!free) window.__debugCam?.set([eye.x, eye.y, eye.z], [look.x, look.y, look.z], 60);
};
setCam();
setTimeout(setCam, 100);
await wait(600);
console.log(`TOWN ${JSON.stringify({ at, stand, ...inspectTown(), target: interactTarget()?.id ?? null })}`);

async function runAct() {
  if (act === 'walkout') {
    if (at !== 'house' && at !== 'shop' && at !== 'museum') throw new Error('townact=walkout needs a room');
    const d = door(at);
    // Face out and hold forward until 3 m past the door line.
    cam.yaw = me.yaw = Math.atan2(d.inX, d.inZ);
    const end = performance.now() + 8000;
    input.keys.add('KeyW');
    try {
      while (performance.now() < end) {
        const p = body.position;
        if ((p.x - d.x) * -d.inX + (p.z - d.z) * -d.inZ >= 3) break;
        await wait(30);
      }
    } finally {
      input.keys.delete('KeyW');
    }
    await wait(800);
  } else if (act) {
    // T2 (talk) and T5 (try, take) add their target patterns here; press Interact once the matching one is offered.
    const want: Record<string, RegExp> = {};
    const re = want[act];
    if (!re) throw new Error(`townact=${act} is not available yet`);
    const end = performance.now() + 8000;
    while (!re.test(interactTarget()?.id ?? '') && performance.now() < end) await wait(50);
    interactDown();
    interactUp();
    await wait(800);
  }
  console.log(`TOWN ${JSON.stringify({ at, act, player: { ...body.position }, ...inspectTown() })}`);
}
// With towndefer=1 the act waits for an --action file to call window.__townAct() after warm-up (for --video).
(window as unknown as { __townAct?: () => Promise<void> }).__townAct = runAct;
if (act && query.get('towndefer') !== '1') await runAct();
export {};
