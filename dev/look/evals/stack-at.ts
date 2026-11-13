// npm run look -- --rail-seed stack-laid-4 --eval dev/look/evals/stack-at.ts --query 'stackat=-105,5,-1987' \
//   --cam <x,y,z> --look <x,y,z> --name gorge
// The stack line's looks (docs/plans/greybox-route.md, leg 1 step 4): stands your body at `stackat` (world x, y, z;
// a staging teleport, since the leg has no bot until step 5), so what is resident by distance is there (High Gorge's
// massing mounts within 400 m of the split: src/entities/route-greybox/index.ts), and waits for the railway's first
// whole state and, near the Gorge, for the massing. Prints what the leg's view and the massing report.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { inspectRailway, railRead } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { inspect } = (await import(
  '/src/entity/inspect.ts' as string
)) as typeof import('../../../src/entity/inspect.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const at = (new URLSearchParams(location.search).get('stackat') ?? '').split(',').map(Number);
if (at.length !== 3 || at.some((n) => !Number.isFinite(n))) throw new Error('stack-at: ?stackat=x,y,z');
const deadline = performance.now() + 60000;
while (!me.body || !me.entered || !railRead()?.whole()) {
  if (performance.now() > deadline) throw new Error('stack-at: the player or the railway did not become ready');
  await wait(100);
}
const { AREA_CENTRES } = (await import(
  '/src/entities/route-greybox/leg2-layout.ts' as string
)) as typeof import('../../../src/entities/route-greybox/leg2-layout.ts');
/** What the massing reports, an area: `{ gorge: { resident, boxes, solids }, ... }` (only the areas it builds). */
const areas = () =>
  (inspect().kinds.find((k) => k.kind === 'route-greybox')?.entities[0]?.state ?? {}) as Record<
    string,
    { resident: boolean; boxes?: number; solids?: number } | undefined
  >;

console.log('STACK before', JSON.stringify(areas()));
teleport(me.body, at[0]!, at[1]!, at[2]!);
me.body.velocity.set(0, 0, 0);
// The areas within 380 m of where you stand (they mount within 400 m) that this build has.
const near = Object.entries(AREA_CENTRES)
  .filter(([id, c]) => id in areas() && Math.hypot(at[0]! - c.x, at[2]! - c.z) < 380)
  .map(([id]) => id);
for (let k = 0; near.some((id) => !areas()[id]?.resident); k++) {
  if (k > 300) throw new Error(`stack-at: the massing did not mount: ${near.join(', ')}`);
  // Held where it was put until the colliders are there.
  teleport(me.body, at[0]!, at[1]!, at[2]!);
  me.body.velocity.set(0, 0, 0);
  await wait(100);
}
await wait(500);
const p = me.body.position;
console.log(
  'STACK at',
  JSON.stringify({ x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1) }),
  JSON.stringify(areas()),
  JSON.stringify(inspectRailway()?.worksView?.legView ?? null),
);
export {};
