// Forge-made rewards (docs/plans/forge-made-rewards.md): stand west of the forge's bill board, on the unload approach,
// with the follow camera behind. The action evals deposit the carried log (walk onto the frame's receiver).
// The camera at 8 m from the board, at follow height: --cam 912.2,20.6,-14.4 --look 920.2,20,-14.4
// npm run look -- --rail-seed forge-frame-last --eval dev/look/evals/forge-rewards.ts --cam 912.2,20.6,-14.4 --look 920.2,20,-14.4 --name forge-board-23
// npm run look -- --rail-seed forge-frame-last --query carry=1 --eval dev/look/evals/forge-rewards.ts --action dev/look/evals/forge-rewards-deposit.ts --video --seconds 14 --name forge-pack
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { railwayCommands } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { fallArrival } = (await import(
  '/src/fall/arrival.ts' as string
)) as typeof import('../../../src/fall/arrival.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
while (!railwayCommands()?.read.ready() || !me.avatar || !me.body || fallArrival.active) await wait(50);
const q = new URLSearchParams(location.search);
// ?carry=1: the look's own player is a fresh account, not the seed's player a: chop a near ordinary tree for logs
// to deposit (the action walks onto the receiver).
// With --players 2, player 2 stands at ?p2X=&p2Z= (and needs no logs).
const second = q.get('player') === '2';
if (q.get('carry') && !second) {
  const { inspectRailway, railBack } = (await import(
    '/dev/look/rail-read.ts' as string
  )) as typeof import('../rail-read.ts');
  const p0 = { x: 918, z: -16 };
  const tree = inspectRailway()!
    .trees.filter((t) => !t.cleared && t.remaining > 0 && t.id !== 28 && t.id !== 209 && t.id !== 232)
    .sort((a, b) => Math.hypot(a.x - p0.x, a.z - p0.z) - Math.hypot(b.x - p0.x, b.z - p0.z))[0]!;
  teleport(me.body, tree.x + 1.8, H(tree.x + 1.8, tree.z) + 0.9, tree.z);
  await wait(600);
  for (let n = 0; n < 12 && railBack().carry < 1; n++) {
    railwayCommands()!.chop(tree.id, 0, false);
    await wait(500);
  }
  console.log(`FORGE LOOK carrying ${railBack().carry} from tree ${tree.id}`);
}
// Default: 8 m west of the board (920.2, -14.4), facing east. ?standX=&standZ=&standYaw= override.
const x = Number(q.get(second && q.has('p2X') ? 'p2X' : 'standX') ?? 912.2),
  z = Number(q.get(second && q.has('p2Z') ? 'p2Z' : 'standZ') ?? -14.4),
  yaw = Number(q.get('standYaw') ?? -Math.PI / 2);
teleport(me.body, x, H(x, z) + 0.9, z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = yaw;
cam.pitch = Number(q.get('standPitch') ?? -0.08);
await wait(1500);
// What the interact button would do from here (the prompt's id and verb), and the reward's reach facts.
{
  const { interactTarget } = (await import(
    '/src/player/hands.ts' as string
  )) as typeof import('../../../src/player/hands.ts');
  const { inspectRailway } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
  const t = interactTarget(),
    r = inspectRailway()!.reward,
    p = me.body.position;
  const d = Math.hypot(p.x - r.axeChest.x, p.z - r.axeChest.z);
  console.log(
    `FORGE LOOK target ${t?.id ?? 'none'} ${t?.verb ?? ''}; axe ${r.axeChest.available ? 'offered' : 'not offered'} at ${d.toFixed(2)} m from the pedestal's centre`,
  );
}
// ?report=1 on player 2 (the action runs on player 1's page only): watch for the forge lighting, then report what this
// page saw over the next 9 s, as the action reports player 1's.
if (second && q.get('report')) {
  const { inspectRailway } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
  void (async () => {
    while (inspectRailway()!.line2View.forgeRewards.axe.heat === 'cool') await wait(50);
    const seen = new Set<string>();
    const end = performance.now() + 9000;
    while (performance.now() < end) {
      const v = inspectRailway()!.line2View;
      const cam = v.switchCamera;
      if (cam.kind === 'forgeAxe' && (cam.active || cam.pending)) seen.add(cam.active ? 'cut playing' : 'cut queued');
      seen.add(`axe ${v.forgeRewards.axe.heat}`);
      seen.add(`roof ${v.forgeFinish.stage}`);
      await wait(100);
    }
    const v = inspectRailway()!.line2View;
    console.log(
      `FORGE LOOK player 2: ${[...seen].join(', ')}; arrivals ${v.forgeRewards.axe.arrivals}; turned home ${v.switchCamera.forgeTurns}; ` +
        `at ${me.body!.position.x.toFixed(1)}, ${me.body!.position.z.toFixed(1)}`,
    );
  })();
}
// A lost pointer lock opens the pause menu over the shot: close it, and keep it out of the picture.
((await import('/src/features/pause.ts' as string)) as { closePause(): void }).closePause();
const style = document.createElement('style');
style.textContent = 'dialog.pause, .pause-dim { display: none !important }';
document.head.append(style);
export {};
