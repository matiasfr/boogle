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
const { inspectRailway } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
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
  // Every change of the cut, the roof show, the axe's heat and the machine's crossing, timed from the first sample.
  const log: string[] = [];
  let last = '';
  const t0 = performance.now();
  const end = t0 + 9000;
  while (performance.now() < end) {
    const v = inspectRailway()!.line2View;
    const cam = v.switchCamera;
    const shot =
      cam.kind === 'forgeAxe' && (cam.active || cam.pending) ? (cam.active ? 'cut playing' : 'cut queued') : 'no cut';
    const now = `${shot}, roof ${v.forgeFinish.stage}, axe ${v.forgeRewards.axe.heat}${v.working ? ', crossed' : ''}`;
    if (now !== last) log.push(`${((performance.now() - t0) / 1000).toFixed(1)} s: ${now}`);
    last = now;
    await wait(50);
  }
  const v = inspectRailway()!.line2View;
  console.log(`FORGE LOOK player ${second ? 2 : 1}: ${log.join(' | ')}; arrivals ${v.forgeRewards.axe.arrivals}`);
}
export {};
