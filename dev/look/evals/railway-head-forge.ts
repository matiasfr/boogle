// From Far Head's halt, at eye height, looking back at the forge apron (919, 18, 5) where the boiler waits
// (docs/plans/boiler-first-choice.md, step 1: is the forge's call plume visible against the tree line from there?).
// Run with `--eval` on a Q5-done seed; `headfov=30` narrows the lens to see what a player squinting would.
const { line2Completed, railRead, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const completed = () => (railRead()?.ready() ? line2Completed(rw()) : 0);
const until = performance.now() + 15000;
while (completed() < 5 && performance.now() < until) await wait(50);
if (!me.body || completed() < 5) throw new Error('needs a Q5-complete --rail-seed');
const p = { x: 1363.61, y: 25.02 + 0.85, z: -163.53 },
  target = { x: 919, y: 18, z: 5 };
teleport(me.body, p.x, p.y, p.z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(-(target.x - p.x), -(target.z - p.z));
const fov = Number(new URLSearchParams(location.search).get('headfov') ?? 65);
const eye: [number, number, number] = [p.x, p.y + 1.6, p.z];
const aim: [number, number, number] = [target.x, target.y + 25, target.z];
window.__debugCam!.set(eye, aim, fov);
setTimeout(() => window.__debugCam!.set(eye, aim, fov), 100);
console.log(
  `HEADFORGE ${JSON.stringify({ from: p, to: target, metres: Math.hypot(target.x - p.x, target.z - p.z), fov })}`,
);
export {};
