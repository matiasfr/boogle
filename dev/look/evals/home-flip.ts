// npm run look -- --question "..." --eval dev/look/evals/home-flip.ts --rail-seed q1-done --query 'home=b&homeat=platform'
// The Home flip's proof framings (docs/plans/home-flip.md, "What the stills must show"), each a fixed eye-height
// camera in the station's axis frame (src/place/home-station.ts) with Buddy stood where the question is:
//   homeat=platform   from the hall's back bay: the lane beside the rack with Buddy in it, the head ramp at its end and
//                     the goods door with the forge through it
//   homeat=arrival    from spawn at eye height: Sleeves, the shelf and the open bay (use --rail-seed awake)
//   homeat=crossing   from where line 2's train stops, on the deck's road 2 edge: the board crossing over road 2
//                     (Buddy on its far side) and the stall's footing sockets
// Without `home=b` the same cameras look at today's Home (the layout's numbers are read either way).
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const land = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const home = (await import(
  '/src/place/home-station.ts' as string
)) as typeof import('../../../src/place/home-station.ts');

type V = { x: number; y: number; z: number };
const query = new URLSearchParams(location.search);
const at = query.get('homeat') ?? 'platform';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** A world point at axis coordinates (a, c), `up` metres over the ground (or over `y` when given). */
const axis = (a: number, c: number, up = 0, y?: number): V => {
  const p = home.axisPoint(a, c),
    x = layout.toWorld(p.x);
  return { x, y: (y ?? land.H(x, p.z)) + up, z: p.z };
};
const local = (p: { x: number; z: number }, up = 0): V => {
  const x = layout.toWorld(p.x);
  return { x, y: land.H(x, p.z) + up, z: p.z };
};

let stand: V, eye: V, look: V;
let fov = 60;
if (at === 'platform') {
  // Buddy in the lane between road 1's sleepers and the rack's posts; the camera in the hall's back south bay.
  stand = axis(-3.9, 2.1);
  eye = axis(-10.3, 8.2, 1.6, home.HALL.floor);
  look = axis(-4.6, 1.2, 1.0);
  fov = 75;
} else if (at === 'arrival') {
  // The camera where a newcomer stands; Buddy a step behind it, out of frame.
  eye = local(layout.SPAWN, 1.6);
  stand = local({ x: layout.SPAWN.x - 1.6, z: layout.SPAWN.z + 0.6 });
  const hall = local(home.HALL, 1.6);
  look = { x: (hall.x + local(layout.GREETER).x) / 2, y: eye.y, z: (hall.z + local(layout.GREETER).z) / 2 };
} else if (at === 'crossing') {
  // Line 2's train stops with its engine at s 18.25: a rider steps onto the deck's road 2 edge there.
  // The eye is a rider's on the deck beside the standing train's last car (the steel car, s 5.55 to 8.75), back at
  // the deck's road 1 edge so the boards (toward the buffers) and the stall (across road 2) are under 60° apart;
  // Buddy stands on the boards' far side. `homeeye=stop` stands at the engine's stop mark instead, 80° between them.
  const stop = layout.LINKS[1]!.stops[0]!,
    atStop = query.get('homeeye') === 'stop',
    deck = layout.railY(layout.LINES.east, stop) + home.ISLAND.lift;
  const boards = axis(home.CROSSING.s - home.ROAD2_S, home.ROAD_GAP, 0.3);
  stand = axis(home.CROSSING.s - home.ROAD2_S, home.CROSSING.c1 - 0.6);
  eye = atStop
    ? axis(stop - home.ROAD2_S, home.ISLAND_C + 1.6, 1.6, deck)
    : axis(7.15 - home.ROAD2_S, home.ISLAND_C - 1.7, 1.6, deck);
  const door = local(home.stallFrame(home.STALLS.open).door, 1.0);
  const unit = (p: V) => {
    const len = Math.hypot(p.x - eye.x, p.z - eye.z);
    return { x: (p.x - eye.x) / len, z: (p.z - eye.z) / len };
  };
  const u = unit(boards),
    v = unit(door);
  look = { x: eye.x + (u.x + v.x) * 8, y: eye.y - 1.4, z: eye.z + (u.z + v.z) * 8 };
  fov = 78;
} else throw new Error('Choose homeat=platform|arrival|crossing');

const body = me.body;
if (!body) throw new Error('home-flip look: no player body');
await wait(500);
teleport(body, stand.x, stand.y + 0.9, stand.z);
cam.yaw = me.yaw = Math.atan2(-(look.x - stand.x), -(look.z - stand.z));
const setCam = () => window.__debugCam?.set([eye.x, eye.y, eye.z], [look.x, look.y, look.z], fov);
setCam();
setTimeout(setCam, 100);
const hold = setInterval(setCam, 200);
setTimeout(() => clearInterval(hold), 120_000);
console.log(`HOMEFLIP ${at} ${JSON.stringify({ stand, eye, look, homeB: home.homeLayout() })}`);
export {};
