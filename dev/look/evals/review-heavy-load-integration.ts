// npm run look -- --real --rail-seed q4-done --eval dev/look/evals/review-heavy-load-integration.ts --warm 0 --hud --name review-heavy-integration
// Accepted cargo commands and real movement inputs. Teleports isolate the two landings, not route reachability.
const { me } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { pressJump, releaseJump } = await import('/src/entities/player/state.ts' as string);
const { triggerAction } = await import('/src/player/controls.ts' as string);
const { railwayCommands, inspectRailway } = await import('/src/entities/railway/state.ts' as string);
const { account, rail, piles } = await import('/src/sim/railway-rows.ts' as string);
const { carryMax, carryComfort } = await import('/src/sim/railway-queries.ts' as string);
const { H } = await import('/src/place/terrain.ts' as string);
const { PADS, SEA_LEDGE } = await import('/src/place/tech-layout.ts' as string);
const { LINE2_GLIDE } = await import('/src/sim/railway-line2-layout.ts' as string);
const { fallArrival } = await import('/src/fall/arrival.ts' as string);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function check(ok: unknown, label: string) {
  if (!ok) throw new Error(`INTEGRATION HEAVY ${label}`);
  console.log(`INTEGRATION HEAVY PASS ${label}`);
}
async function until(fn: () => unknown, label: string) {
  const deadline = performance.now() + 30000;
  while (!fn()) {
    if (performance.now() > deadline) throw new Error(`INTEGRATION HEAVY timeout ${label}`);
    await wait(30);
  }
}
await until(() => railwayCommands()?.read.ready() && me.body && !fallArrival.active, 'ready');
const adapter = railwayCommands()!;
const world = () => adapter.read.world();
const count = () => {
  const a = account(world(), adapter.read.pid);
  return a.carry + a.stone + a.rails;
};
async function at(x: number, y: number, z: number) {
  teleport(me.body, x, y, z);
  me.body.velocity.set(0, 0, 0);
  await wait(600);
}
check(rail(world()).hook, 'Q4 has the hook');
await at(LINE2_GLIDE.x / 100, LINE2_GLIDE.y / 100 + 0.5, LINE2_GLIDE.z / 100);
check(adapter.claimGlide(), 'first-climb glider command queued before Q5');
await until(() => rail(world()).glide && adapter.read.pending() === 0, 'first-climb glider accepted');
await wait(1000);
for (let i = 0; inspectRailway().reward.showing; i++) {
  check(i < 30, 'bounded reveal dismissal');
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
  await wait(350);
}
for (const pad of [SEA_LEDGE, PADS.find((p: { id: string }) => p.id === 'summit')]) {
  for (let i = 0; count() < carryMax(world()); i++) {
    check(i < 32, 'bounded accepted collection');
    const tree = inspectRailway().trees.find((t: { remaining: number; cleared: boolean }) => t.remaining && !t.cleared);
    check(tree, 'source available');
    await at(tree.x + 2, H(tree.x + 2, tree.z) + 0.5, tree.z);
    check(adapter.chop(tree.id, 0, false), 'chop queued');
    await until(() => adapter.read.pending() === 0, 'chop accepted');
  }
  const x = pad.x + 1000;
  await at(x, pad.top + 0.5, pad.z);
  await until(() => me.coyote > 0 && !me.swimming, `${pad.id} grounded`);
  check(count() > carryComfort(world()), `${pad.id} overloaded`);
  const pulls = inspectRailway().hookShot.pulls;
  triggerAction('hook', 'down');
  await wait(100);
  check(inspectRailway().hookShot.pulls === pulls, `${pad.id} heavy hook refused`);
  check(
    document.querySelector('.notify-text')?.textContent === 'Too heavy to hook. Drop cargo to travel light.',
    `${pad.id} hook refusal explains Drop`,
  );
  triggerAction('glide', 'down');
  await wait(100);
  check(!inspectRailway().glider.open, `${pad.id} heavy glide refused`);
  check(
    document.querySelector('.notify-text')?.textContent === 'Too heavy to glide. Drop cargo to travel light.',
    `${pad.id} glide refusal explains Drop`,
  );
  const before = count();
  triggerAction('place-drop', 'down');
  await wait(700);
  triggerAction('place-drop', 'up');
  await until(() => count() === 0 && adapter.read.pending() === 0, `${pad.id} accepted whole-back drop`);
  const local = piles(world()).filter(
    (p: { x: number; y: number; z: number }) =>
      Math.abs(p.y / 100 - pad.top) < 1 && Math.hypot(p.x / 100 - x, p.z / 100 - pad.z) < 4,
  );
  check(
    local.reduce((n: number, p: { n: number }) => n + p.n, 0) >= before,
    `${pad.id} cargo remains at landing height`,
  );
  pressJump();
  await wait(150);
  releaseJump();
  triggerAction('glide', 'down');
  await wait(100);
  check(inspectRailway().glider.open, `${pad.id} drop restores actual jump and glide`);
  triggerAction('glide', 'down');
  await at(x, pad.top + 0.5, pad.z);
  window.__debugCam?.set([x + 8, pad.top + 5, pad.z + 9], [x, pad.top + 1, pad.z], 55);
  console.log(`INTEGRATION HEAVY LOCATION ${JSON.stringify({ id: pad.id, count: count(), piles: local })}`);
}
console.log('INTEGRATION HEAVY COMPLETE');
export {};
