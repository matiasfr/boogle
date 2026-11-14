// npm run look -- --rail-seed q6-done --query townat=museum --eval dev/look/evals/railway-town.ts --action dev/look/evals/prefab-museum.ts --hud
// Existing town setup and interaction service: prove the live table, both residents' E actions and doorway traversal.
const { inspectTown } = (await import(
  '/src/entities/town/state.ts' as string
)) as typeof import('../../../src/entities/town/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { interactTarget, interactDown, interactUp } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { endTalk, talking } = (await import(
  '/src/place/talk.ts' as string
)) as typeof import('../../../src/place/talk.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { ROOM_PLOTS, toWorld } = (await import(
  '/src/place/layout.ts' as string
)) as typeof import('../../../src/place/layout.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const require = (ok: unknown, message: string) => {
  if (!ok) throw new Error(`MUSEUM ${message}`);
};
const body = me.body!;
const start = { x: body.position.x, y: body.position.y, z: body.position.z };
const p = ROOM_PLOTS.museum;
const c = Math.cos(p.yaw),
  s = Math.sin(p.yaw);
const floor = H(toWorld(p.x), p.z) + 0.14;
const stand = (x: number, z: number) => {
  teleport(body, toWorld(p.x) + x * c + z * s, floor + 0.9, p.z - x * s + z * c);
  body.velocity.set(0, 0, 0);
};
await wait(400);
require(inspectTown()!.rooms.museum.ready &&
  inspectTown()!.museumBits > 0, 'ready museum draws the shared-world table');
const said: Record<string, string> = {};
for (const who of ['moss', 'wren'] as const) {
  const resident = inspectTown()!.residents[who];
  require(resident.on, `${who} is present`);
  teleport(body, resident.x + 1.4, floor + 0.9, resident.z);
  body.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.PI / 2;
  await wait(500);
  const target = interactTarget();
  require(target?.id === `place-talk-${who}` && target.verb === 'Talk', `${who} retains Talk as E target`);
  interactDown();
  interactUp();
  await wait(1500);
  require(talking(), `E starts ${who}'s conversation`);
  said[who] = document.querySelector('.place-talk-say')?.textContent ?? '';
  endTalk();
  await wait(200);
}
// Walk through the unchanged open doorway, then return to the comparison pose.
stand(0, p.d / 2 - 1);
await wait(400);
require(inspectTown()!.indoors.room === 'museum', 'museum cutaway is active inside');
async function walk(yaw: number, done: () => boolean) {
  cam.yaw = me.yaw = yaw;
  const until = performance.now() + 6000;
  input.keys.add('KeyW');
  try {
    while (!done() && performance.now() < until) await wait(30);
  } finally {
    input.keys.delete('KeyW');
  }
  require(done(), 'walking crosses the open doorway');
}
await walk(p.yaw + Math.PI, () => inspectTown()!.indoors.inside !== 'museum');
await walk(p.yaw, () => inspectTown()!.indoors.inside === 'museum');
teleport(body, start.x, start.y, start.z);
body.velocity.set(0, 0, 0);
await wait(500);
require(inspectTown()!.museumBits > 0, 'table resumes indoors');
console.log(`MUSEUM PASS ${JSON.stringify({ said, town: inspectTown() })}`);
export {};
