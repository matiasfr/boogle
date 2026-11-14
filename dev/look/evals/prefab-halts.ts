// Broker look, --rail-seed trains-on --query 'haltEdge=0|1' --real --until window.__haltReady.
// Fixed Home island frame; wait for an actual train at the selected edge before capturing.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const { railReady, rw, trains, inspectRailway } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { TRAIN_PHASE } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { RAIL_TRAINS } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const edge = Number(new URLSearchParams(location.search).get('haltEdge') ?? 0);
if (!(await railReady()) || !me.body || ![0, 1].includes(edge)) throw new Error('Home halt setup not ready');
const h = layout.HALTS.find((h) => h.island && h.line === edge)!;
const p = { x: 0, z: 0, ux: 0, uz: 1 };
const line = layout.LINKS[edge]!.line;
layout.lineAt(line, (h.s0 + h.s1) / 2, p);
const x = p.x - p.uz * h.lat + layout.ORIGIN.x,
  z = p.z + p.ux * h.lat + layout.ORIGIN.z,
  y = Math.min(layout.railY(line, h.s0), layout.railY(line, h.s1)) + 0.72;
teleport(me.body, x, y + 0.6, z);
const frame = () =>
  window.__debugCam!.set([x + p.uz * 12 - p.ux * 16, y + 10, z - p.ux * 12 - p.uz * 16], [x, y + 2, z], 65);
frame();
setInterval(frame, 100);
const end = performance.now() + 180_000;
while (!trains(rw()).some((t) => RAIL_TRAINS[t.slot]!.line === edge && t.at === 0 && t.phase === TRAIN_PHASE.STAND)) {
  if (performance.now() > end) throw new Error(`No train stood at Home edge ${edge}`);
  await new Promise((r) => setTimeout(r, 100));
}
console.log('HALT HOME', edge, JSON.stringify(inspectRailway()?.line2View));
(window as unknown as { __haltReady: boolean }).__haltReady = true;
export {};
