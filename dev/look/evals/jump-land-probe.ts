// Diagnostic for docs/plans/playtest-jump-in.md step 7: surface heights in a 5x5 grid (2 m apart) around each jump-in
// anchor, raycast down against scenery, plus line two's frames and the tech pads, as PROBE lines on the console.
// `probe=x,z,y;x,z,y` checks those points instead: each with the railway arrival's own landing test (a sphere swept
// down from 3 m above, src/entities/railway/arrival.ts) and a ray grid 1 m apart against every static collider.
//   npm run look -- --rail-seed crossing-done --eval dev/look/evals/jump-land-probe.ts --until window.__probeDone --name land-probe
const { inspectRailway, railReady } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { raycastClosest, rayHit, sweepSphere } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { GROUP } = (await import(
  '/src/physics/physics.ts' as string
)) as typeof import('../../../src/physics/physics.ts');
const tech = (await import(
  '/src/place/tech-layout.ts' as string
)) as typeof import('../../../src/place/tech-layout.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
if (!(await railReady(30_000))) throw new Error('jump-land-probe: the railway never became ready');
await wait(3000);
const s = inspectRailway()!;
const out: string[] = [];
const frames = s.line2View.frames.map((f: { x: number; y: number; z: number }) =>
  [f.x, f.y, f.z].map((v) => v.toFixed(1)).join(','),
);
out.push(`frames ${frames.join(' | ')}`);
for (const pad of tech.PADS)
  out.push(`pad ${pad.id} ${(pad.x + 1000).toFixed(1)},${pad.z.toFixed(1)} top ${pad.top.toFixed(1)}`);
const hit = rayHit();
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');
const points = (new URLSearchParams(location.search).get('probe') ?? '')
  .split(';')
  .filter(Boolean)
  .map((p) => p.split(',').map(Number) as [number, number, number]);
for (const [x, z, y] of points) {
  const from = { x, y: y + 3, z };
  const hits = (['skip', 'only'] as const)
    .map((thin) => sweepSphere(from, { x, y: y - 1, z }, PLAYER_R, { mask: GROUP.SCENERY, thin }))
    .filter((h) => h >= 0);
  const surface = hits.length ? (from.y - Math.min(...hits) - PLAYER_R).toFixed(2) : 'none';
  const rows: string[] = [];
  for (let dz = -4; dz <= 4; dz++) {
    const cells: string[] = [];
    for (let dx = -4; dx <= 4; dx++) {
      const ok = raycastClosest(
        { x: x + dx, y: y + 20, z: z + dz },
        { x: x + dx, y: y - 20, z: z + dz },
        { mask: -1 },
        hit,
      );
      cells.push(ok ? hit.hitPointWorld.y.toFixed(1).padStart(5) : '   --');
    }
    rows.push(`dz${dz}:${cells.join('')}`);
  }
  out.push(`at ${x},${z} y${y}: arrival sweep surface ${surface}, H ${H(x, z).toFixed(1)}\n${rows.join('\n')}`);
}
const anchors: [string, number, number, number][] = points.length
  ? []
  : [
      ['q2', 949.48, 30.56, 30],
      ['hook', 999.54, 20.86, 23.5],
      ['lever', 1097.4, 42.2, 26.2],
      ['boiler', 919, 5.4, 18.15],
      ['sea', 1011.8, -6, 102.4],
      ['pierstop', 1402.59, -358.46, 24.3],
      ['kiln', 1128, 87, 24.2],
      ['pierframe', 1405.54, -371.07, 24.3],
    ];
for (const [name, x, z, y] of anchors) {
  const rows: string[] = [];
  for (const dz of [-4, -2, 0, 2, 4]) {
    const cells: string[] = [];
    for (const dx of [-4, -2, 0, 2, 4]) {
      const ok = raycastClosest(
        { x: x + dx, y: y + 15, z: z + dz },
        { x: x + dx, y: y - 40, z: z + dz },
        { mask: GROUP.SCENERY },
        hit,
      );
      cells.push(ok ? hit.hitPointWorld.y.toFixed(1) : '--');
    }
    rows.push(`dz${dz}: ${cells.join(' ')}`);
  }
  out.push(`${name} (${x},${z}) y${y} H=${H(x, z).toFixed(1)} :: ${rows.join(' / ')}`);
}
for (const line of out) console.log(`PROBE ${line}`);
(window as Window & { __probeDone?: boolean }).__probeDone = true;
export {};
