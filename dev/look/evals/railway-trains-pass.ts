// Line 2's two trains passing each other mid-line, each on its own track (docs/plans/generic-lines.md, "What players
// see"; v26), from `--rail-seed trains-on`: the camera stands off the line's left side, high where they will meet and the
// still is taken as they pass. Logs where along the line they met and whether the ground under it is sea.
// npm run look -- --rail-seed trains-on --eval dev/look/evals/railway-trains-pass.ts --until window.__placeDone --real \
//   --name trains-pass
const { inspectRailwayLegacy } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const layout = (await import(
  '/src/place/layout.ts' as string
)) as typeof import('../../../src/place/layout.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { SEA } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');

type Car = { x: number; y: number; z: number };
type Train = { slot: number; line: number; along: number; track: number; cars: Car[] };
const view = () => inspectRailwayLegacy()?.line2View as unknown as { trains: Train[] } | undefined;
const shot = window as Window & { __placeDone?: boolean };
const P = { x: 0, z: 0, ux: 0, uz: 1 };
let aim: ReturnType<typeof setInterval> | null = null;
const tick = setInterval(() => {
  const s = inspectRailwayLegacy();
  const v = view();
  if (!s?.ready || !s.line2.trains || !v) return;
  const [a, b] = v.trains.filter((t) => t.line === 1);
  if (!a || !b || a.track === b.track) return;
  const gap = Math.abs(a.along - b.along) / 100;
  const up = a.track === 0 ? a : b,
    down = a.track === 0 ? b : a;
  // Meeting: the up train still behind the down one along the line, and closing.
  const meet = (up.along + down.along) / 200;
  if (!aim && up.along < down.along && gap < 140) {
    const line = layout.LINKS[1]!.line;
    layout.lineAt(line, meet, P);
    const cx = P.x + layout.ORIGIN.x,
      cz = P.z + layout.ORIGIN.z,
      y = layout.railY(line, meet);
    // 26 m off the up (left) side and 13 m over the rails, looking down at the meeting point over the trees.
    const lat = -26;
    const ex = cx - P.uz * lat,
      ez = cz + P.ux * lat;
    aim = setInterval(() => window.__debugCam?.set([ex, y + 13, ez], [cx, y + 1, cz]), 16);
    console.log(
      `TRAINS MEET ${JSON.stringify({ meet: +meet.toFixed(1), ground: +H(cx, cz).toFixed(1), sea: SEA, overSea: H(cx, cz) < SEA, railY: +y.toFixed(1) })}`,
    );
  }
  // They close at 40 m/s and the capture lands about two seconds after the flag even with --real (a warped warm-up
  // runs on further), so flag them 80 m apart and still closing to catch them alongside.
  if (aim && up.along < down.along && gap < 80) {
    console.log(`TRAINS PASS ${JSON.stringify({ gap: +gap.toFixed(1), up: up.along / 100, down: down.along / 100 })}`);
    shot.__placeDone = true;
    clearInterval(tick);
  }
}, 30);
export {};
