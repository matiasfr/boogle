// D1's real providers and seat filter, from q5-done or q6-done. No writes to the mirrored world.
// The usual spawn is already within 30 m. notrack delays the recorder until this eval stands outside that radius;
// then importing the real recorder exercises its first approach, without resetting its per-page observations.
// npm run look -- --rail-seed q5-done --query notrack=1 --eval dev/look/evals/forge-reach.ts --hud --name forge-boiler-reach
// npm run look -- --rail-seed q6-done --query notrack=1 --eval dev/look/evals/forge-reach.ts --hud --name forge-breaker-reach
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { interactTarget, interactDown } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const seats = (await import(
  '/src/entities/railway/seat.ts' as string
)) as typeof import('../../../src/entities/railway/seat.ts');
const { watchPlayMarks } = (await import(
  '/src/proto/mark.ts' as string
)) as typeof import('../../../src/proto/mark.ts');
const { boiler, works, railRead, rw, inspectRailway } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { railwayCommands } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const check = (ok: unknown, label: string) => {
  console.log(`FORGE REACH ${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) throw new Error(`FORGE REACH ${label}`);
};
const until = async (ready: () => boolean, label: string) => {
  const end = performance.now() + 30000;
  while (!ready() && performance.now() < end) await wait(50);
  check(ready(), label);
};
await until(() => !!railRead()?.ready() && !!me.body, 'mounted');
check(new URLSearchParams(location.search).has('notrack'), 'notrack delays recorder startup for the approach fixture');
const part = works(rw()).breaker === 1 ? 'breaker' : 'boiler';
const id = `railway-${part}`;
check(part === 'breaker' || boiler(rw()).state === 'pedestal', 'part waiting');
const marks: { name: string; mine?: boolean }[] = [];
watchPlayMarks((name, data) => {
  if (name === `${part} approached` || name === `${part} taken`) {
    marks.push({ name, mine: data?.mine as boolean | undefined });
    console.log(`FORGE MARK ${name} ${JSON.stringify(data)}`);
  }
});
const move = async (distance: number, x = 922, z = -1.17) => {
  teleport(me.body!, x, 18.85, z + distance);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = 0;
  cam.pitch = -0.12;
  await wait(100);
};
await move(31);
await import('/src/proto/playdata/record.ts' as string);
await wait(100);
check(!marks.length, 'outside 30 m does not start the approach measure');
await move(29);
console.log(`FORGE APPROACH position=${JSON.stringify(me.body!.position)} entered=${me.entered}`);
await until(() => marks.some((m) => m.name === `${part} approached`), 'first approach marked');
await move(31);
await move(29);
check(marks.filter((m) => m.name === `${part} approached`).length === 1, 're-entry does not restart the measure');

// Exercise the actual production seat filter with a seated player and competing pickups at their feet, including
// the train's aboard request. These targets deliberately overlap: distance must never make a seated rider pick up.
for (let attempt = 0; !seats.seated() && attempt < 40; attempt++) {
  const m = inspectRailway()!.machine;
  teleport(me.body!, m.x, m.y + 1.6, m.z);
  me.body!.velocity.set(0, 0, 0);
  await wait(300);
  seats.sitDown();
  await wait(100);
}
check(seats.seated(), 'seated on a real railway chair');
const p = me.body!.interpolatedPosition;
const at = me.avatar!.position.clone().set(p.x, p.y, p.z);
const picks = ['railway-boiler', 'railway-breaker'].map((id) => ({ id, verb: 'Pick up', at, run() {} }));
check(
  seats.withSeatTargets(picks).every((t) => t.id === 'place-stand'),
  'seated pickups excluded without a request',
);
const ask = { id: 'railway-request-aboard', verb: 'Request stop', at, run() {} };
check(
  seats.withSeatTargets([...picks, ask]).every((t) => t.id === ask.id),
  'seated request beats both pickups',
);
triggerAction('jump', 'down');
await until(() => !seats.seated(), 'stood up');
triggerAction('jump', 'up');

await move(6.1);
check(interactTarget()?.id !== id, 'no pickup outside 6 m');
await move(5.9);
check(interactTarget()?.id === id, 'pickup offered at 5.9 m');
interactDown();
await until(() => marks.some((m) => m.name === `${part} taken` && m.mine), 'take confirmed and marked');
check(part === 'breaker' ? works(rw()).breaker === 2 : boiler(rw()).state === 'held', 'accepted take changed the part');

if (part === 'boiler') {
  // Put it down by the hauler using the real command, then measure from its accepted ground position.
  const b = boiler(rw());
  const p = me.body!.position;
  check(railwayCommands()!.dropBoiler(Math.round(p.x * 100), 1800, Math.round(p.z * 100), b.revision), 'drop sent');
  await until(() => !railRead()!.pending() && boiler(rw()).state === 'ground', 'drop confirmed');
  const ground = { ...boiler(rw()) };
  await move(4, ground.x / 100, ground.z / 100);
  check(interactTarget()?.id !== id, 'ground boiler not offered at 4 m');
  await move(3.5, ground.x / 100, ground.z / 100);
  check(interactTarget()?.id === id, 'ground boiler offered at 3.5 m');
  check(marks.filter((m) => m.name === 'boiler approached').length === 1, 'drop did not restart the approach measure');
}
console.log(`FORGE REACH COMPLETE ${part}`);
export {};
