// npm run look -- --players 2 --real --eval dev/look/evals/boogler-authority.ts --until window.__placeDone --video --curves --seconds 9 --name boogler-authority
// Visual question: do walking, immediate local talk and a mid-walk rider stay continuous on both screens?
// Teleports stage proximity only; talk and ride use production dialogue and contact detection.
const { boogler } = (await import(
  '/src/boogler/boogler.ts' as string
)) as typeof import('../../../src/boogler/boogler.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { dialogue, closeDialogue } = (await import(
  '/src/boogler/dialogue.ts' as string
)) as typeof import('../../../src/boogler/dialogue.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { groundHeight } = (await import(
  '/src/island/terrain.ts' as string
)) as typeof import('../../../src/island/terrain.ts');
const { railwayMirror } = (await import(
  '/src/world/game-world.ts' as string
)) as typeof import('../../../src/world/game-world.ts');
const { railwayWorldRead } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { net, remotes } = (await import(
  '/src/netplay/net.ts' as string
)) as typeof import('../../../src/netplay/net.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const wait = async (fn: () => unknown, label: string) => {
  for (let i = 0; i < 200 && !fn(); i++) await sleep(100);
  if (!fn()) throw new Error(label);
};
const player = new URLSearchParams(location.search).get('player') ?? '1';
await wait(() => me.body && railwayWorldRead()?.ready() && remotes.size, 'two players ready');
const place = (dx: number, dy = 0.7) => {
  const p = boogler.disp;
  teleport(me.body!, p.x + dx, groundHeight(p.x, p.z) + dy, p.z);
  me.body!.velocity.set(0, 0, 0);
};
place(player === '1' ? 3 : 6);
await wait(() => boogler.disp.walking, 'walking before talk');
if (player === '1') {
  place(2);
  const before = { ...boogler.disp };
  await wait(() => interactTarget()?.id === 'boogler', 'Talk offered');
  interactTarget()?.run?.();
  if (!dialogue.open || boogler.disp.walking) throw new Error('talk did not hold on the press');
  console.log('BOOGLER TALK PRESS ' + JSON.stringify({ before, after: boogler.disp }));
  await sleep(1200);
  closeDialogue();
  boogler.holdTalk(false);
}
await wait(() => boogler.disp.walking, 'walking before rider');
if (player === '1') {
  place(0, 1.4);
  await wait(() => boogler.me.act === 2, 'production contact detected rider');
  await wait(() => railwayMirror!.boogler.leg()?.mode === 2, 'server ridden leg');
}
console.log(
  'BOOGLER RIDER ' +
    JSON.stringify({ player, pose: boogler.disp, leg: railwayMirror!.boogler.leg(), act: boogler.me.act }),
);
(window as Window & { __placeDone?: boolean }).__placeDone = true;
background(
  (async () => {
    const samples = [];
    for (let i = 0; i < 120; i++) {
      const p = boogler.disp;
      // Follow the subject with a fixed relative camera; retain both the head and the rider.
      window.__debugCam?.set([p.x + 7, groundHeight(p.x, p.z) + 5, p.z + 9], [p.x, groundHeight(p.x, p.z) + 1, p.z]);
      samples.push({
        at: performance.now(),
        ...p,
        act: boogler.me.act,
        connected: !!net.room,
        leg: railwayMirror!.boogler.leg(),
      });
      await sleep(100);
    }
    console.log('BOOGLER MOTION ' + JSON.stringify(samples));
  })(),
  'Boogler motion evidence',
);
export {};
