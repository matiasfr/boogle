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
const { LEG, march } = await import('/src/place/home-station.ts' as string);
let clearance = Infinity;
for (let s = 0; s <= LEG.len; s += 0.05) {
  const p = march(LEG.start, LEG.segs, s);
  clearance = Math.min(clearance, Math.hypot(p.x + 1000 - depot[0], p.z - depot[2]));
}
// Conservative footprint: rack/logs within 1.8 m of centre, cart half width 1.1 m plus bend clearance.
if (clearance < 3.5) throw new Error(`Q2 full rack intersects cart corridor: ${clearance} m`);
const frame = inspectRailway().line2View.frames[1];
const haul = Math.hypot(frame.x - depot[0], frame.z - depot[2]);
if (Math.abs(haul - 10) > 0.01) throw new Error(`Q2 haul changed: ${haul} m`);
console.log('REVIEW Q2 CLEAR ' + JSON.stringify({ clearance, haul }));
export {};
