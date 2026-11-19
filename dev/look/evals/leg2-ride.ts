// Riding the greybox route's own lines (docs/plans/greybox-leg2.md, step 4's stills): waits for a train of line
// `&rideLine=` (2 the `ns` line, 3 the `bay` line) to stand at its stop `&rideFrom=`, puts Buddy on its players' car,
// turns the follow camera the way it will leave, and ends the warm-up (window.__placeDone) as the train passes
// `&rideAt=` metres along its line, so the capture is the rider's view there. Prints the train's row and whether Buddy
// rides it, at boarding and at the capture.
//   npm run look -- --rail-seed bell-reached --eval dev/look/evals/leg2-ride.ts \
//     --query 'rideLine=2&rideFrom=2&rideAt=90&rideSide=1' --until window.__placeDone --real --name ride-bore-home
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { carry } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { rowAt } = (await import(
  '/src/entities/railway/row-path.ts' as string
)) as typeof import('../../../src/entities/railway/row-path.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

type Car = { role?: string; x: number; y: number; z: number; riding: boolean };
type Train = { line: number; phase: number; at: number; track: number; along: number; cars: Car[]; kitBoard: string };
const q = new URLSearchParams(location.search);
const line = Number(q.get('rideLine') ?? 2),
  from = Number(q.get('rideFrom') ?? 0),
  rideAt = Number(q.get('rideAt') ?? 100),
  // Metres off the car's middle across it (+ right of the way the cars stand), so the follow camera sees past a cab.
  side = Number(q.get('rideSide') ?? 0);
const w = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const trains = () => (inspectRailway()?.line2View as unknown as { trains: Train[] } | undefined)?.trains ?? [];
const until = async (ready: () => boolean, label: string, timeout: number) => {
  const end = performance.now() + timeout;
  while (!ready()) {
    if (performance.now() > end) throw new Error(`RIDE timed out: ${label}`);
    await wait(50);
  }
};
const standingHere = (t: Train) => t.line === line && t.phase === 0 && t.at === from && t.cars[0]!.y > -30;
const state = (t: Train) => ({
  at: t.at,
  phase: t.phase,
  track: t.track,
  along: +(t.along / 100).toFixed(1),
  kitBoard: t.kitBoard,
  riding: t.cars.some((c) => c.riding),
  carry: carry.on?.id ?? null,
});
background(
  (async () => {
    await until(() => trains().length > 0 && !!me.body, 'the trains view', 60000);
    await until(() => trains().some(standingHere), `a line ${line} train standing at stop ${from}`, 600000);
    const k = trains().findIndex(standingHere),
      t = () => trains()[k]!;
    const car = t().cars.find((c) => c.role === 'player') ?? t().cars[1]!,
      [e, f] = [t().cars[0]!, t().cars[1]!],
      len = Math.hypot(e.x - f.x, e.z - f.z) || 1;
    teleport(me.body!, car.x - ((e.z - f.z) / len) * side, car.y + 1.4, car.z + ((e.x - f.x) / len) * side);
    me.body!.velocity.set(0, 0, 0);
    await wait(600);
    console.log(`RIDE boarded ${JSON.stringify(state(t()))}`);
    await until(() => t().phase !== 0, 'the train leaves', 300000);
    // The way it runs: +s on track 0 (outward), -s on track 1.
    const sign = t().track ? -1 : 1,
      p = rowAt(line, t().along / 100, { x: 0, z: 0, ux: 0, uz: 1 });
    me.yaw = cam.yaw = Math.atan2(-p.ux * sign, -p.uz * sign);
    cam.pitch = -0.05;
    await until(
      () => (sign > 0 ? t().along / 100 >= rideAt : t().along / 100 <= rideAt),
      `the train passes s ${rideAt}`,
      300000,
    );
    window.__debugCam?.clear();
    const clear = setInterval(() => window.__debugCam?.clear(), 50); // look re-applies its pose after the warm-up
    me.yaw = cam.yaw = Math.atan2(-p.ux * sign, -p.uz * sign);
    w.__placeDone = true;
    console.log(`RIDE at ${JSON.stringify(state(t()))}`);
    await wait(4000);
    console.log(`RIDE after ${JSON.stringify(state(t()))}`);
    clearInterval(clear);
  })(),
  'ride a greybox line',
);
export {};
