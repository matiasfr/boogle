// driven by: dev/look/evals/forge-rewards.ts (its --action for the lit edge; commands below)
// The forge lights and makes the proper axe (forge-made rewards, step 5): hand the camera back to the game (the look's
// frozen view would hide the cut), then player 1 walks onto the frame's receiver so the 56th log goes in. Player 2
// (with --players 2) stays where the setup stood it. ?report=1 waits out the cut and prints what this page saw.
// npm run look -- --rail-seed forge-lit-last --query 'carry=1&standX=919&standZ=-14.5&standYaw=0.2' --eval dev/look/evals/forge-rewards.ts --action dev/look/evals/forge-rewards-lit.ts --video --seconds 8 --name forge-axe-cut
// npm run look -- --players 2 --rail-seed forge-lit-last --query 'carry=1&report=1' --eval dev/look/evals/forge-rewards.ts --action dev/look/evals/forge-rewards-lit.ts --name forge-axe-two
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { inspectRailway, railBack } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const q = new URLSearchParams(location.search);
const second = q.get('player') === '2';
window.__debugCam?.clear();
if (!second) {
  const back = { x: me.body!.position.x, z: me.body!.position.z };
  teleport(me.body!, 922, H(922, -12) + 0.9, -12);
  me.body!.velocity.set(0, 0, 0);
  await wait(700);
  teleport(me.body!, back.x, H(back.x, back.z) + 0.9, back.z);
  me.body!.velocity.set(0, 0, 0);
}
if (q.get('report')) {
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
    `FORGE LOOK player ${second ? 2 : 1}: ${[...seen].join(', ')}; arrivals ${v.forgeRewards.axe.arrivals}; ` +
      `carrying ${railBack().carry}; at ${me.body!.position.x.toFixed(1)}, ${me.body!.position.z.toFixed(1)}`,
  );
}
export {};
