// Independent f83e49fa8 review reproduction: Q2's full rack crosses the curved running track.
// npm run look -- --real --rail-seed q1-done --eval dev/look/evals/review-heavy-load-q2.ts \
//   --cam 945,22,-12 --look 951,18.5,-6 --warm 2 --hud --name review-heavy-q2-full
const { me } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { inspectRailway, railwayCommands } = await import('/src/entities/railway/state.ts' as string);
const { rail } = await import('/src/sim/railway-rows.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const deadline = performance.now() + 90000;
while (!railwayCommands()?.read.ready() || !me.body || rail(railwayCommands().read.world()).depot < 24) {
  if (performance.now() > deadline) throw new Error('Q2 cart did not supply 24 logs');
  await wait(50);
}
const depot = inspectRailway().line2View.depot;
teleport(me.body, depot[0] - 3, depot[1] + 0.5, depot[2] + 3);
while (inspectRailway().line2View.depotShown < 24) {
  if (performance.now() > deadline) throw new Error('Q2 unloading animation did not settle');
  await wait(50);
}
console.log('REVIEW Q2 FULL ' + JSON.stringify({ depot, shown: inspectRailway().line2View.depotShown }));
export {};
