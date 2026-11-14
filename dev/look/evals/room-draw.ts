// npm run look -- --eval dev/look/evals/room-draw.ts --query 'drawcam=19' --name room-draw-19 --wall 600
//  (drawcam=<m>: a fixed camera that far in front of the house's door, looking in through it; Buddy stands 4 m nearer
//   and 3 m aside. drawcam=follow&drawfrom=<m> with --action dev/look/evals/room-draw-walk.ts: Buddy starts that far
//   out and walks in under the player camera. --players 2: player 2 stands inside the house under their own camera.
//   drawroom=shop|museum with --rail-seed q6-done: that building instead of the house.)
// Interiors draw by distance from the camera to the door (`ROOM_CAM.drawWithin`, src/entities/town/rooms.ts):
// prints `ROOMDRAW <json>` with the camera's distance to the door, whether its resident (and so the interior) is drawn, and
// the frame's draw calls and triangles.
const { inspectTown } = (await import(
  '/src/entities/town/state.ts' as string
)) as typeof import('../../../src/entities/town/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { renderer, camera } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const land = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = performance.now() + 20000;
while ((!inspectTown() || !me.body) && performance.now() < deadline) await wait(50);
if (!inspectTown() || !me.body) throw new Error('room-draw needs the live town');
const body = me.body;
const query = new URLSearchParams(location.search);
const room = (query.get('drawroom') ?? 'house') as 'house' | 'shop' | 'museum';
const who = ({ house: 'pip', shop: 'button', museum: 'moss' } as const)[room];
const p = layout.ROOM_PLOTS[room];
const s = Math.sin(p.yaw),
  c = Math.cos(p.yaw);
const door = { x: layout.toWorld(p.x) + (p.d / 2) * s, z: p.z + (p.d / 2) * c };
/** Room space from the door: `out` metres in front of it, `side` metres along the wall. */
const spot = (out: number, side = 0) => {
  const x = door.x + out * s + side * c,
    z = door.z + out * c - side * s;
  return { x, y: land.H(x, z), z };
};
const put = (at: { x: number; y: number; z: number }) => {
  teleport(body, at.x, at.y + 0.9, at.z);
  body.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = p.yaw; // forward is (-sin yaw, -cos yaw): in through the door
  cam.pitch = -0.15;
};
// The counters read 0 between some frames: the largest of a few.
const counted = { draws: 0, triangles: 0 };
setInterval(() => {
  const r = renderer.info.render;
  if (r.drawCalls) Object.assign(counted, { draws: r.drawCalls, triangles: r.triangles });
}, 16);
const report = (name: string) =>
  console.log(
    `ROOMDRAW ${JSON.stringify({
      name,
      player: query.get('player'),
      camToDoor: +Math.hypot(camera.position.x - door.x, camera.position.z - door.z).toFixed(2),
      interior: inspectTown()!.residents[who].on,
      indoors: inspectTown()!.indoors.room,
      ...counted,
    })}`,
  );
const camAt = query.get('drawcam') ?? '19';
if (query.get('player') === '2') {
  put(spot(-p.d / 2 - 1));
  // `look` frames its own --view after the eval: keep this player's own camera, indoors.
  const own = setInterval(() => window.__debugCam?.clear(), 200);
  setTimeout(() => clearInterval(own), 8000);
} else if (camAt === 'follow') {
  const from = Number(query.get('drawfrom') ?? 16);
  put(spot(from));
  (window as unknown as { __roomWalk?: () => Promise<void> }).__roomWalk = async () => {
    // `look` frames its own --view after the eval: back to the player camera for the walk.
    window.__debugCam?.clear();
    await wait(300);
    report('start');
    let was = inspectTown()!.residents[who].on;
    const end = performance.now() + 15000;
    input.keys.add('KeyW');
    try {
      while (inspectTown()!.indoors.inside !== room && performance.now() < end) {
        const on = inspectTown()!.residents[who].on;
        if (on !== was) report(on ? 'drawn' : 'undrawn');
        was = on;
        // Steer for the door till the last metre, so a nudge off something on the way doesn't miss it.
        const bx = body.position.x - door.x,
          bz = body.position.z - door.z;
        if (Math.hypot(bx, bz) > 1) cam.yaw = me.yaw = Math.atan2(bx, bz);
        await wait(30);
      }
      await wait(400);
    } finally {
      input.keys.delete('KeyW');
    }
    report('inside');
  };
} else {
  const out = Number(camAt);
  put(spot(out - 4, 3));
  // drawside=<m> swings the camera that far along the wall at the same distance from the door, round whatever stands
  // on the axis; drawup=<m> is its height over the ground (2.2); drawfov=<deg> (50).
  const side = Number(query.get('drawside') ?? 0),
    up = Number(query.get('drawup') ?? 2.2);
  const eye = spot(Math.sqrt(out * out - side * side), side),
    to = spot(-p.d / 2);
  const fov = Number(query.get('drawfov') ?? 50);
  const setCam = () => window.__debugCam?.set([eye.x, eye.y + up, eye.z], [to.x, to.y + 1.2, to.z], fov);
  setCam();
  const hold = setInterval(setCam, 200);
  setTimeout(() => clearInterval(hold), 6000);
  // Once more after the warm-up, when a frame has been counted.
  setTimeout(() => report('held'), 5000);
}
await wait(600);
report('set');
export {};
