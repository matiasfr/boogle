// npm run look -- --rail-seed stack-pick --eval dev/look/evals/stack-at.ts --query 'stackat=833.5,19,15' \
//   --action dev/look/evals/leg2-west-walk.ts --seconds 110 --frames 12 --cam 800,40,52 --look 820,8,10 --name west-walk
// The West landing's way between the commons and the platform, walked by the body (docs/plans/greybox-leg2-massing.md,
// step 5 and its design review's change 1): by real input, at walk speed, with no jump. Three walks: the cliff alone
// in one straight line (east from the shelf, away from the stair), then down the grey stair from the commons to
// platform A, then back up. Staging teleports only. Prints `WESTWALK ...` lines and sets `window.__westWalk`.
// Started and left running, so as an --action the motion sheet samples the walk.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { LEG2 } = (await import(
  '/src/entities/route-greybox/leg2-layout.ts' as string
)) as typeof import('../../../src/entities/route-greybox/leg2-layout.ts');

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const f1 = (n: number) => +n.toFixed(1);
const b = me.body!;
const M = LEG2.west.marks;
type XZ = { x: number; z: number };

async function stage(p: XZ, y: number) {
  input.keys.clear();
  teleport(b, p.x, y, p.z);
  b.velocity.set(0, 0, 0);
  await wait(1200);
}
/** Walks through `points` holding forward only. Returns where it ended and how long it took. */
async function walk(name: string, points: readonly XZ[], ms: number) {
  const t0 = performance.now();
  let reached = 0,
    top = b.position.y,
    low = b.position.y;
  input.keys.add('KeyW');
  try {
    for (const p of points) {
      for (;;) {
        const dx = p.x - b.position.x,
          dz = p.z - b.position.z;
        top = Math.max(top, b.position.y);
        low = Math.min(low, b.position.y);
        if (Math.hypot(dx, dz) < 1.2) break;
        if (performance.now() - t0 > ms) throw new Error('timeout');
        cam.yaw = me.yaw = Math.atan2(-dx, -dz);
        await wait(16);
      }
      reached++;
    }
  } catch {
    // Reported below: it stopped short.
  } finally {
    input.keys.delete('KeyW');
  }
  const out = {
    walk: name,
    ok: reached === points.length,
    reached: `${reached}/${points.length}`,
    seconds: f1((performance.now() - t0) / 1000),
    end: { x: f1(b.position.x), y: f1(b.position.y), z: f1(b.position.z) },
    highest: f1(top),
    lowest: f1(low),
  };
  console.log(`WESTWALK ${JSON.stringify(out)}`);
  return out;
}

async function run() {
  const results = [];
  // The cliff alone: one straight line east from the shelf, 15 m north of the stair.
  await stage(M.cliffFoot, 5);
  results.push(await walk('the cliff alone, one line up', [M.cliffTop], 10000));
  await stage(M.stairTop, 19.5);
  results.push(
    await walk(
      'down: the commons to platform A',
      [M.stairFoot, M.stairTurn, M.rampFoot, M.rampHead, M.platformA],
      60000,
    ),
  );
  results.push(
    await walk('up: platform A to the commons', [M.rampHead, M.rampFoot, M.stairTurn, M.stairFoot, M.stairTop], 60000),
  );
  (window as unknown as { __westWalk?: unknown }).__westWalk = results;
  console.log(`WESTWALK done ${JSON.stringify(results.map((r) => `${r.walk}: ${r.ok ? 'ok' : 'FAILED'}`))}`);
}
void run();
export {};
