// Disposable accepted B5-B8 seed framing; no route bot or browser-side shared-state fabrication.
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const layout = (await import(
  '/src/proto/place/layout.ts' as string
)) as typeof import('../../../src/proto/place/layout.ts');
const rail = (await import('/src/proto/place/rail.ts' as string)) as typeof import('../../../src/proto/place/rail.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = performance.now() + 15000;
while ((!inspectRailway()?.ready || (inspectRailway()?.line2?.completed ?? 0) < 5) && performance.now() < until)
  await wait(50);
const state = inspectRailway();
if (!state?.ready || !state.line2 || state.line2.completed < 5 || !me.body)
  throw new Error('B5-B8 requires an accepted Q5-complete --rail-seed');
const mode = new URLSearchParams(location.search).get('b58at') ?? 'q6';
let p: { x: number; y: number; z: number }, target: { x: number; y: number; z: number };
if (mode === 'apron') {
  p = { x: 916, y: 19, z: 8 };
  target = { x: 919, y: 20, z: 5.4 };
} else if (mode === 'camp') {
  p = { x: 1007, y: 31.15, z: -144 };
  target = { x: 1009.64, y: 32, z: -149 };
} else if (mode === 'q6') {
  const f = state.line2View.frames[5]!;
  p = { x: f.x - 3, y: f.y + 0.85, z: f.z + 4 };
  target = { x: f.x, y: f.y + 1.5, z: f.z };
} else if (mode === 'village' || mode === 'quarry' || mode === 'head') {
  const h = { village: [927.79, 19.02, 26.17], quarry: [1081.32, 25.02, 41.14], head: [1363.61, 25.02, -163.53] }[
    mode
  ]!;
  p = { x: h[0]!, y: h[1]! + 0.85, z: h[2]! };
  const q = rail.besideLine(layout.LINKS[1]!.line, mode === 'village' ? 35 : mode === 'quarry' ? 190 : 540, 0);
  target = { x: q.x, y: p.y, z: q.z };
} else if (mode === 'pier') {
  const line = layout.LINKS[1]!.line,
    q = rail.besideLine(line, 739, 0);
  p = { x: q.x, y: layout.railY(line, 739) + 0.85, z: q.z };
  target = { x: q.x, y: p.y, z: q.z - 751 };
} else throw new Error('Choose b58at=apron|camp|village|quarry|head|q6|pier');
teleport(me.body, p.x, p.y, p.z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(-(target.x - p.x), -(target.z - p.z));
cam.pitch = -0.12;
const camera: [number, number, number] = mode === 'pier' ? [p.x + 5, p.y + 5, p.z + 12] : [p.x - 12, p.y + 9, p.z + 16];
const aim: [number, number, number] = [target.x, target.y, target.z];
window.__debugCam!.set(camera, aim, 65);
setTimeout(() => window.__debugCam!.set(camera, aim, 65), 100);
console.log(`BFIVE ${mode} ${JSON.stringify({ line2: state.line2, view: state.line2View })}`);
export {};
