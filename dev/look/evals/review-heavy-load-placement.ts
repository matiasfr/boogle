// Independent f83e49fa8 review: both prompts work, but the shelf intersects the log rack.
// npm run look -- --real --rail-seed q5-shelved --eval dev/look/evals/review-heavy-load-placement.ts
//   --cam 1151.4,32.4,-12.7 --look 1158.4,25,-22.7 --warm 2 --hud --name review-heavy-q5-framed
const { me } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { inspectRailway, railwayCommands } = await import('/src/entities/railway/state.ts' as string);
const { interactTarget } = await import('/src/player/hands.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!railwayCommands()?.read.ready() || !me.body) await wait(50);
await wait(2000);
const v = inspectRailway().line2View;
console.log('REVIEW Q5 ' + JSON.stringify({ depot: v.depot, shelf: v.shelf, frame: v.frames[4] }));
const d = { x: v.depot[0], y: v.depot[1], z: v.depot[2] };
const s = v.shelf;
for (const p of [d, s]) {
  teleport(me.body, p.x, p.y + 0.6, p.z);
  await wait(300);
  console.log('REVIEW PICK ' + JSON.stringify({ at: p, pick: interactTarget()?.id }));
}
teleport(me.body, d.x - 4, d.y + 0.6, d.z + 4);
await wait(500);
window.__debugCam?.set([d.x - 7, d.y + 8, d.z + 10], [d.x, d.y + 0.6, d.z], 50);
export {};
