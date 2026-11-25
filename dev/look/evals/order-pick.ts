// npm run look -- --rail-seed t1-last-log --players 2 --real --eval dev/look/evals/order-pick.ts --query "shot=play&beat=card" --hud --size 1200x750 --name t1-pick-card
// Each page watches the same unpaid board. The first
// walks its last log into the frame, then holds the production Interact action at the selected stand.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { fallArrival } = (await import(
  '/src/fall/arrival.ts' as string
)) as typeof import('../../../src/fall/arrival.ts');
const { railwayCommands, inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { railStation } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { LINE1_PICK_STANDS, LINE1_STATIONS } = (await import(
  '/src/sim/railway-line-layout.ts' as string
)) as typeof import('../../../src/sim/railway-line-layout.ts');
const q = new URLSearchParams(location.search),
  peer = q.get('player') === '2';
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(ok: () => unknown, label: string) {
  const end = performance.now() + 60000;
  while (!ok()) {
    if (performance.now() > end) throw new Error('Order pick look timed out at ' + label);
    await pause(70);
  }
}
await until(() => railwayCommands()?.read.ready() && me.body && !fallArrival.active, 'arrival');
const commands = railwayCommands()!,
  frame = LINE1_STATIONS[0]!;
const part = q.get('pick') === 'jump' ? 'jump' : 'pack';
const stand = LINE1_PICK_STANDS[part];
function place(x: number, z: number, aimX: number, aimZ: number) {
  teleport(me.body!, x, H(x, z) + 0.9, z);
  me.body!.velocity.set(0, 0, 0);
  me.yaw = cam.yaw = Math.atan2(x - aimX, z - aimZ);
}
const scene = q.get('beat') ?? 'board';
const reward = () => inspectRailway()!.reward;
if (!peer && scene !== 'late' && scene !== 'board') {
  const tree = inspectRailway()!.trees.find((t) => !t.cleared && t.remaining > 0 && t.id < 28)!;
  place(tree.x + 1.8, tree.z, tree.x, tree.z);
  await pause(500);
  commands.chop(tree.id, 0, false);
  await until(() => commands.read.pending() === 0, 'chop receipt');
}
place(stand.x / 100 + (peer ? 2 : 0), stand.z / 100 + 2, frame.x / 100, frame.z / 100);
await pause(800);
if (scene === 'late') {
  await until(() => reward().arrival.keys.includes(part), 'late flourish');
  if (reward().arrival.cards.includes(part)) throw new Error('A live card replayed on join');
} else if (scene !== 'board') {
  if (!peer) {
    place(frame.x / 100, frame.z / 100 + 2, frame.x / 100, frame.z / 100);
    await until(() => railStation(0).start >= 0, 'paid frame');
    place(stand.x / 100, stand.z / 100 + 2, stand.x / 100, stand.z / 100);
    await until(() => interactTarget()?.id === 'railway-pick-' + part, 'Take target');
    if (scene !== 'stands') {
      triggerAction('interact', 'down');
      await until(() => reward().arrival.cards.includes(part), 'accepted take');
      triggerAction('interact', 'up');
    }
  }
  if (scene !== 'stands') {
    await until(() => reward().arrival.cards.includes(part), 'shared card');
    if (reward().arrival.cards.filter((k) => k === part).length !== 1) throw new Error('Duplicate card');
    if (scene === 'carry') {
      await pause(2300);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
      await until(() => !reward().showing, 'card dismissal');
    }
  }
}
console.log(
  'PICK LOOK ' + JSON.stringify({ scene, peer, cards: reward().arrival.cards, flourishes: reward().arrival.keys }),
);
export {};
