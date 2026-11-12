// npm run look -- --rail-seed q6-stocked --room b58a --eval dev/look/evals/railway-b5b8-at.ts --query 'b58at=q6'
//  (b58at=village|head|apron|q6|...; seed to match the pose: q5-done for head)
// Disposable accepted B5-B8 seed framing; no route bot or browser-side shared-state fabrication.
const {
  inspectRailway,
  line2Active,
  line2Completed,
  line2Jobs,
  rail: railRow,
  railRead,
  rw,
} = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const rail = (await import(
  '/src/entities/railway/rail-kit.ts' as string
)) as typeof import('../../../src/entities/railway/rail-kit.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const completed = () => (railRead()?.ready() ? line2Completed(rw()) : 0);
const until = performance.now() + 15000;
while (completed() < 5 && performance.now() < until) await wait(50);
const state = inspectRailway();
if (!state || completed() < 5 || !me.body) throw new Error('B5-B8 requires an accepted Q5-complete --rail-seed');
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
} else if (mode === 'q6rack') {
  // Close on station 6's depot rack and its sign, from the Far Head side (boiler-first-choice step 1).
  const d = state.line2View.depot!;
  p = { x: d[0]! - 4, y: d[1]! + 0.85, z: d[2]! + 6 };
  target = { x: d[0]!, y: d[1]! + 1.4, z: d[2]! };
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
} else throw new Error('Choose b58at=apron|camp|village|quarry|head|q6|q6rack|pier');
teleport(me.body, p.x, p.y, p.z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(-(target.x - p.x), -(target.z - p.z));
cam.pitch = -0.12;
const camera: [number, number, number] =
  mode === 'pier'
    ? [p.x + 5, p.y + 5, p.z + 12]
    : mode === 'q6rack'
      ? [p.x - 1.5, p.y + 1.6, p.z + 3]
      : [p.x - 12, p.y + 9, p.z + 16];
const aim: [number, number, number] = [target.x, target.y, target.z];
window.__debugCam!.set(camera, aim, 65);
setTimeout(() => window.__debugCam!.set(camera, aim, 65), 100);
const w = rw();
console.log(
  `BFIVE ${mode} ${JSON.stringify({
    line2: {
      ...railRow(w),
      active: line2Active(w),
      completed: line2Completed(w),
      completions: line2Jobs(w).map((j) => j.job.completion),
    },
    view: state.line2View,
  })}`,
);
export {};
