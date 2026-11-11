// A train held at a stub end's signal while the other leaves the end (review of v26, P2-1; docs/plans/generic-lines.md,
// 4b), from `--rail-seed q6-done`: the up train comes to the pier's signal (s 529.8 m, the turnout's 20 m plus the
// engine's reach short of the merge at 556 m) while the other is still in the pier's block, and waits; the still is
// taken as the leaving train runs past it on the down track, the camera broadside from beyond the down track. Logs where
// each stands and the clear lateral gap between them. The Village's signal is the same rule at the other end; play
// with two trains doesn't bunch them there (test/review-v26.test.ts holds a train at it headlessly).
// npm run look -- --rail-seed q6-done --eval dev/look/evals/railway-signal-hold.ts --until window.__placeDone --real \
//   --name signal-hold
const { inspectRailway, line2Trains, railRead, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');

type Car = { x: number; y: number; z: number };
type Train = { slot: number; line: number; along: number; track: number; phase: number; at: number; cars: Car[] };
const view = () => inspectRailway()?.line2View as unknown as { trains: Train[] } | undefined;
const shot = window as Window & { __placeDone?: boolean };
const P = { x: 0, z: 0, ux: 0, uz: 1 };
let aim: ReturnType<typeof setInterval> | null = null;
const tick = setInterval(() => {
  const v = view();
  if (!railRead()?.ready() || !line2Trains(rw()) || !v) return;
  const line2 = v.trains.filter((t) => t.line === 1);
  const held = line2.find((t) => t.phase === 0 && t.at === -1 && t.track === 0);
  const leaving = line2.find((t) => t !== held && t.track === 1 && t.phase === 1);
  if (!held || !leaving) return;
  const line = layout.LINKS[1]!.line,
    hs = held.along / 100,
    ls = leaving.along / 100;
  if (!aim) {
    // Broadside from beyond the down track, 12 m up, over the turnout's start: the held train, the leaving one past
    // it, and the turnout ahead.
    layout.lineAt(line, hs + 4, P);
    const lat = 20,
      y = layout.railY(line, hs);
    const tx = P.x + layout.ORIGIN.x - P.uz * -2,
      tz = P.z + layout.ORIGIN.z + P.ux * -2;
    const ex = P.x + layout.ORIGIN.x - P.uz * lat,
      ez = P.z + layout.ORIGIN.z + P.ux * lat;
    aim = setInterval(() => window.__debugCam?.set([ex, y + 12, ez], [tx, y + 0.5, tz]), 16);
    console.log(`SIGNAL HOLD ${JSON.stringify({ slot: held.slot, at: hs, other: leaving.slot, otherAt: ls })}`);
  }
  // The leaving train runs at cruise (20 m/s) and the capture lands a second or two after the flag, even with --real
  // (a warped warm-up runs on further): flag it as it comes into the turnout, 45 m out, to catch it near the held one.
  if (ls < hs + 45) {
    const gap = Math.min(...held.cars.flatMap((p) => leaving.cars.map((q) => Math.hypot(p.x - q.x, p.z - q.z))));
    const xyz = (t: Train) => t.cars.map((c) => [+c.x.toFixed(1), +c.y.toFixed(1), +c.z.toFixed(1)]);
    console.log(
      `SIGNAL PASS ${JSON.stringify({ held: hs, leaving: ls, nearestCars: +gap.toFixed(2), heldCars: xyz(held), leavingCars: xyz(leaving) })}`,
    );
    shot.__placeDone = true;
    clearInterval(tick);
  }
}, 30);
export {};
