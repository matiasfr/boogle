// Garage step 4 (docs/plans/garage-step4.md, step 3): a trade line's train wearing its fit, framed where it stands.
// The same file is the setup eval and the action: the eval stands Buddy on the halt's platform and waits for the train;
// the action frames it (look places its own camera after the eval).
//   npm run look -- --rail-seed trade-held --eval dev/look/evals/trade-held.ts --action dev/look/evals/trade-held.ts \
//     --query 'view=platform' --name th-platform
// `line=bay` (default): a Strong bay train holding at Bell Rock's upper platform with kit crates on its flatbed;
// `line=ns`: a Quick ns train standing at High Gorge. `view=platform` (default) from the platform beside the train's
// tail, `view=frame` from leg 3's first frame (Bell Rock only).
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { inspectRailway, railReady } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { RAIL_HALTS } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { RAIL_LEGS, ROW_LINE, legFrame } = (await import(
  '/src/sim/railway-route.ts' as string
)) as typeof import('../../../src/sim/railway-route.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const query = new URLSearchParams(location.search);
const ns = query.get('line') === 'ns';
const line = ns ? ROW_LINE.ns : ROW_LINE.bay,
  stop = ns ? 0 : 2,
  row = ns ? 4 : 5;
const halt = RAIL_HALTS.find((h) => h.line === line && h.stop === stop)!;
const flag = window as unknown as { __tradeTrain?: { x: number; y: number; z: number; tx: number; tz: number } };
type Car = { role?: string; x: number; y: number; z: number };
type Tr = {
  line: number;
  boiler: number;
  phase: number;
  at: number;
  tailCrates: number;
  cars: Car[];
  longBoiler: boolean;
};
const standing = () =>
  ((inspectRailway() as unknown as { line2View?: { trains?: Tr[] } })?.line2View?.trains ?? []).find(
    (t) => t.line === line && t.boiler === row && t.phase === 0 && t.at === stop && (ns || t.tailCrates > 0),
  );
if (!flag.__tradeTrain) {
  const end = performance.now() + 60000;
  while (!me.body || !me.entered || !(await railReady(1000))) {
    if (performance.now() > end) throw new Error('trade look: not ready');
    await wait(200);
  }
  const p = halt.platforms[0];
  teleport(me.body, p.x / 100, p.y / 100 + 0.5, p.z / 100);
  me.body.velocity.set(0, 0, 0);
  const until = performance.now() + Number(query.get('wait') ?? 600000);
  let t = standing();
  while (!t) {
    if (performance.now() > until) {
      const all = (inspectRailway() as unknown as { line2View?: { trains?: Tr[] } })?.line2View?.trains ?? [];
      const mine = all
        .filter((x) => x.line === line)
        .map(({ boiler, phase, at, tailCrates, cars }) => ({
          boiler,
          phase,
          at,
          tailCrates,
          roles: cars.map((c) => c.role),
        }));
      throw new Error(`trade look: no train standing there wearing its fit: ${JSON.stringify(mine)} of ${all.length}`);
    }
    await wait(250);
    t = standing();
  }
  // The tail car (Strong's flatbed) and the engine, picked by role.
  const tail = t.cars.find((c) => c.role === 'cargo') ?? t.cars.at(-1)!,
    head = t.cars.find((c) => c.role === 'engine')!;
  flag.__tradeTrain = { x: tail.x, y: tail.y, z: tail.z, tx: head.x, tz: head.z };
  console.log(
    'TRADE train',
    JSON.stringify({
      boiler: t.boiler,
      tailCrates: t.tailCrates,
      long: t.longBoiler,
      roles: t.cars.map((c) => c.role),
    }),
  );
} else {
  // Live again: the one found during the eval may have gone on through the warm-up; frame whichever stands now.
  const until = performance.now() + Number(query.get('wait') ?? 600000);
  let t = standing();
  while (!t && performance.now() < until) {
    await wait(100);
    t = standing();
  }
  if (!t) throw new Error('trade look: the train left before the still');
  const tail = t.cars.find((x) => x.role === 'cargo') ?? t.cars.at(-1)!,
    head = t.cars.find((x) => x.role === 'engine')!;
  const c = { x: tail.x, y: tail.y, z: tail.z, tx: head.x, tz: head.z };
  // Across the platform from the tail, a little above eye height, looking along the train toward the engine; or from
  // leg 3's first frame, looking at the train's middle.
  const ux = c.tx - c.x,
    uz = c.tz - c.z,
    n = Math.hypot(ux, uz) || 1;
  const p = halt.platforms[0];
  const side = { x: p.x / 100 - c.x, z: p.z / 100 - c.z };
  const s = Math.hypot(side.x, side.z) || 1;
  if (query.get('view') === 'frame') {
    const f = legFrame(
      RAIL_LEGS.find((l) => l.id === 'bell-canopy')!,
      0,
    );
    window.__debugCam?.set(
      [f.x / 100, f.y / 100 + 1.7, f.z / 100],
      [(c.x + c.tx) / 2, c.y + 0.5, (c.z + c.tz) / 2],
      60,
    );
  } else
    // On the platform's side of the flatbed, behind it, looking along the train past the flatbed to the engine.
    window.__debugCam?.set(
      [c.x + (side.x / s) * 5 - (ux / n) * 6, c.y + 2.6, c.z + (side.z / s) * 5 - (uz / n) * 6],
      [c.x + (ux / n) * 3, c.y + 0.2, c.z + (uz / n) * 3],
      60,
    );
}
export {};
