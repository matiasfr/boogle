// Heavy-load recovery regression. Accepted cargo ops; teleports isolate movement contracts, not route reachability.
// npm run look -- --real --rail-seed glide-earned --eval dev/look/evals/review-heavy-load.ts --warm 2 --hud --name review-heavy-load
const { me, cam } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { input } = await import('/src/player/input.ts' as string);
const { pressJump, releaseJump, localJumpCount } = await import('/src/entities/player/state.ts' as string);
const { triggerAction } = await import('/src/player/controls.ts' as string);
const { railwayCommands, inspectRailway } = await import('/src/entities/railway/state.ts' as string);
const { account, rail } = await import('/src/sim/railway-rows.ts' as string);
const { carryMax, carryComfort } = await import('/src/sim/railway-queries.ts' as string);
const { H } = await import('/src/place/terrain.ts' as string);
const { LINE2_PACK } = await import('/src/sim/railway-line2-layout.ts' as string);
const { LINE1_JUMP_DEVICE } = await import('/src/sim/railway-line-layout.ts' as string);
const { fallArrival } = await import('/src/fall/arrival.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
function check(ok: unknown, label: string) {
  if (!ok) throw new Error(`HEAVY REVIEW ${label}`);
  console.log(`HEAVY REVIEW PASS ${label}`);
}
async function until(fn: () => unknown, label: string) {
  const deadline = performance.now() + 30000;
  while (!fn()) {
    if (performance.now() > deadline) throw new Error(`HEAVY REVIEW timed out: ${label}`);
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
async function at(x: number, y: number, z: number, settle = 300) {
  teleport(me.body, x, y, z);
  me.body.velocity.set(0, 0, 0);
  await wait(settle);
}
async function fill() {
  for (let i = 0; count() < carryMax(world()); i++) {
    check(i < 32, 'bounded collection');
    const tree = inspectRailway().trees.find(
      (t: { remaining: number; cleared: boolean }) => t.remaining > 0 && !t.cleared,
    );
    check(tree, 'remaining source');
    await at(tree.x + 2, H(tree.x + 2, tree.z) + 0.5, tree.z, 450);
    check(adapter.chop(tree.id, 0, false), 'chop queued');
    await until(() => adapter.read.pending() === 0, 'chop settled');
  }
}
async function dismiss() {
  await wait(1000);
  for (let i = 0; inspectRailway().reward.showing; i++) {
    check(i < 30, 'bounded reveal dismissal');
    // Reward cards own the menu key; the world interact action does not dismiss them.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
    await wait(350);
  }
}
check(rail(world()).glide && rail(world()).hook, 'seed grants glide and hook');
if (!rail(world()).pack) {
  await at(LINE2_PACK.x / 100, H(LINE2_PACK.x / 100, LINE2_PACK.z / 100) + 0.5, LINE2_PACK.z / 100);
  check(adapter.openPack(), 'pack queued');
  await until(() => rail(world()).pack && adapter.read.pending() === 0, 'pack settled');
  await dismiss();
}
if (!rail(world()).jump) {
  await at(LINE1_JUMP_DEVICE.x / 100, LINE1_JUMP_DEVICE.y / 100 + 0.45, LINE1_JUMP_DEVICE.z / 100);
  check(adapter.claimJump(), 'air jump queued');
  await until(() => rail(world()).jump && adapter.read.pending() === 0, 'air jump settled');
  await dismiss();
}
await fill();
check(count() === 24, 'accepted packed heavy load');
const home = { x: me.body.position.x + 4, z: me.body.position.z + 4 };
await at(home.x, H(home.x, home.z) + 0.5, home.z, 1000);
await until(() => me.coyote > 0 && !me.swimming, 'ground contact');
const jumps = localJumpCount();
const airJumps = inspectRailway().reward.tools.jumps;
pressJump();
await wait(350);
releaseJump();
check(localJumpCount() === jumps, 'heavy ground jump blocked');
check(
  document.querySelector('.notify-text')?.textContent === 'Too heavy to jump. Drop cargo to travel light.',
  'jump explains recovery',
);
cam.yaw = 0;
input.keys.add('KeyW');
await wait(800);
console.log(`HEAVY REVIEW walk ${JSON.stringify({ count: count(), vx: me.body.velocity.x, vz: me.body.velocity.z })}`);
input.keys.delete('KeyW');
await at(home.x, H(home.x, home.z) + 10, home.z, 200);
triggerAction('glide', 'down');
await wait(50);
check(
  document.querySelector('.notify-text')?.textContent === 'Too heavy to glide. Drop cargo to travel light.',
  'glide explains recovery',
);
pressJump();
await wait(100);
releaseJump();
check(!inspectRailway().glider.open, 'heavy glide blocked in air');
check(inspectRailway().reward.tools.jumps === airJumps, 'heavy air jump blocked');
const pulls = inspectRailway().hookShot.pulls;
triggerAction('hook', 'down');
await wait(100);
check(inspectRailway().hookShot.pulls === pulls, 'heavy hook does not start');
check(
  document.querySelector('.notify-text')?.textContent === 'Too heavy to hook. Drop cargo to travel light.',
  'hook explains recovery',
);
// A water pose with the bed below us, away from an edge; exercises the actual swimming controller.
await at(850, -1.2, -350, 100);
await until(() => me.swimming, 'water contact');
pressJump();
await wait(50);
console.log(`HEAVY REVIEW swim ${JSON.stringify({ count: count(), vy: me.body.velocity.y, swimming: me.swimming })}`);
check(me.body.velocity.y > 0, 'heavy swimming ascent available');
releaseJump();
const { PADS } = await import('/src/place/tech-layout.ts' as string);
const ledge = PADS.find((p: { id: string }) => p.id === 'p2');
home.x = ledge.x + 1000;
home.z = ledge.z;
await at(home.x, ledge.top + 0.5, home.z, 1000);
triggerAction('place-drop', 'down');
await wait(700);
triggerAction('place-drop', 'up');
await until(() => count() === 0 && adapter.read.pending() === 0, 'whole-back drop');
check(count() === 0, 'hold Drop sheds all 24');
await until(() => me.coyote > 0, 'ground contact after drop');
const { piles } = await import('/src/sim/railway-rows.ts' as string);
check(
  piles(world()).some(
    (p: { y: number; x: number; z: number }) =>
      Math.abs(p.y / 100 - ledge.top) < 1 && Math.hypot(p.x / 100 - home.x, p.z / 100 - home.z) < 4,
  ),
  'ledge drop stays at feet height',
);
pressJump();
await wait(100);
releaseJump();
check(localJumpCount() > jumps, 'drop restores ground jump');
await at(home.x, H(home.x, home.z) + 10, home.z, 200);
triggerAction('glide', 'down');
await wait(100);
check(inspectRailway().glider.open, 'drop restores glide');
triggerAction('glide', 'down');
await at(home.x, H(home.x, home.z) + 0.5, home.z, 1000);
console.log(`HEAVY REVIEW COMPLETE ${JSON.stringify({ count: count(), comfort: carryComfort(world()) })}`);
await fill();
await at(home.x, ledge.top + 0.5, home.z, 1000);
window.__debugCam?.set([home.x + 7, ledge.top + 4, home.z + 8], [home.x, ledge.top + 1.5, home.z], 55);
triggerAction('hook', 'down');
export {};
