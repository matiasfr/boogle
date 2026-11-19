// The first bought house, opened (docs/brainstorms/first-house-resident.md, steps 1 to 3). Camera-only setup and real
// input; no shared-state edits. Shots (--query house=...):
//   street  from the hall side, eye height: the open door, the lit window, his `…`
//   inside  walked in, your own camera: the cutaway, the driver at the back facing the door
//   talk    beside him; pair with --action dev/look/evals/first-house-talk.ts for the placeholder card
//   yard    the works yard next door: still no door and nobody
//   stand   standing on the plot as its walls rise; doorway, on its threshold. Pair with --rail-seed house-ready
//           and --action dev/look/evals/town-b2-buy.ts --real
// timeout 300 npm run look -- --rail-seed house-built --eval dev/look/evals/first-house.ts --query house=street --hud --wall 240
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { inspectTown } = (await import(
  '/src/entities/town/state.ts' as string
)) as typeof import('../../../src/entities/town/state.ts');
const { townBuilding, townLocal, townPlotBoard } = (await import(
  '/src/place/town-plan.ts' as string
)) as typeof import('../../../src/place/town-plan.ts');
const { H } = (await import('/src/place/terrain.ts' as string)) as typeof import('../../../src/place/terrain.ts');

const shot = new URLSearchParams(location.search).get('house') ?? 'street';
const house = townBuilding('plot3');
/** Room space (x across the front, z out of the door) to the world, on the ground. */
const at = (x: number, z: number) => {
  const p = townLocal(house, x, z);
  return { x: p.x + 1000, z: p.z, y: H(p.x + 1000, p.z) };
};
const face = (from: { x: number; z: number }, to: { x: number; z: number }) =>
  Math.atan2(-(to.x - from.x), -(to.z - from.z));
const put = (p: { x: number; y: number; z: number }, yaw: number) => {
  teleport(me.body!, p.x, p.y + 0.9, p.z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = yaw;
};
const door = at(0, house.d / 2);
const back = at(0, -house.d / 2);
const debug = window.__debugCam!;
if (shot === 'street') {
  // Out of frame, behind the camera; the camera's fixed from the road on the hall side.
  put(at(-3.5, house.d / 2 + 9), 0);
  const eye = at(-3.2, house.d / 2 + 6.6);
  debug.set([eye.x, eye.y + 1.6, eye.z], [door.x, door.y + 1.4, door.z]);
  debug.set = () => {};
} else if (shot === 'inside' || shot === 'talk') {
  debug.clear();
  debug.set = () => {};
  const p = shot === 'inside' ? at(0, 1.4) : at(0.2, -1.2);
  put(p, face(p, back));
  cam.dist = shot === 'inside' ? 6 : 4;
  cam.pitch = -0.35;
} else if (shot === 'yard') {
  const yard = townBuilding('plot2');
  put(at(-3.5, house.d / 2 + 9), 0);
  const eye = at(-6, house.d / 2 + 10);
  debug.set([eye.x, eye.y + 2.2, eye.z], [(yard.x + house.x) / 2 + 1000, eye.y + 1, (yard.z + house.z) / 2]);
  debug.set = () => {};
} else if (shot === 'stand' || shot === 'doorway') {
  // Inside the footprint (or on the threshold) within reach of the board, so the real hold buys it from there.
  debug.clear();
  debug.set = () => {};
  const p = shot === 'stand' ? at(1.6, 3.0) : at(0, house.d / 2 + 0.05);
  const b = townPlotBoard(0);
  put(p, face(p, { x: b.x + 1000, z: b.z }));
  cam.dist = 7;
  setInterval(() => report('during'), 1000);
}
const report = (label: string) =>
  console.log(
    `FIRST HOUSE ${label}`,
    JSON.stringify({
      shot,
      me: me.body?.position,
      room: inspectTown()?.rooms.plot3,
      plot: inspectTown()?.plots[0],
      indoors: inspectTown()?.indoors,
      driver: (inspectTown()?.residents as Record<string, unknown> | undefined)?.driver,
      bark: inspectTown()?.bark,
      cue: [...document.querySelectorAll<HTMLElement>('.speech-cue')]
        .filter((e) => !e.hidden)
        .map((e) => e.textContent),
    }),
  );
report('setup');
setTimeout(() => report('settled'), 2500);
export {};
