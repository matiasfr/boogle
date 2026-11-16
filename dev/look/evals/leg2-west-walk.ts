// npm run look -- --eval dev/look/evals/leg2-west-walk.ts --warm 180 --until 'window.__westWalk' \
//   --cam 800,40,52 --look 820,8,10 --name west-walk
// The West landing's way between the commons and the platform, walked by the body (docs/plans/greybox-leg2-massing.md,
// step 5 and its design review's change 1): by real input, at walk speed, with no jump. Three walks: the cliff alone
// in one straight line (east from the shelf), then down the shore path from the commons to platform A, then back up.
// Staging teleports only. Prints `WESTWALK ...` lines and sets `window.__westWalk`; a failed route throws.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { SHORE_PATH } = (await import(
  '/src/place/shore-layout.ts' as string
)) as typeof import('../../../src/place/shore-layout.ts');
const { ORIGIN } = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { default: west } = (await import('/content/built/levels/west.json' as string)) as {
  default: typeof import('../../../content/built/levels/west.json');
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const f1 = (n: number) => +n.toFixed(1);
const b = me.body!;
const validation: typeof import('../../../src/prefab/validate.ts') = await import('/src/prefab/validate.ts' as string);
const { default: prefabs } = (await import('/content/built/prefabs.json' as string)) as {
  default: typeof import('../../../content/built/prefabs.json');
};
const records: unknown = prefabs;
validation.validateArtifact(records);
const M = (
  validation.loadLevelArtifact(west, records.prefabs)
    .analysis as unknown as import('../../../src/content/levels/leg2.ts').Leg2Analysis['west']
).marks;
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
  // The cliff alone: one straight line east from the shelf, north of the shore path.
  await stage(M.cliffFoot, 5);
  results.push(await walk('the cliff alone, one line up', [M.cliffTop], 10000));
  // Reach the shore climb along the west edge of the commons, clear of the Round's house blocks.
  const path = [
    ...SHORE_PATH.slice(1, 4).map(([x, z]) => ({ x: x + ORIGIN.x, z: z + ORIGIN.z })),
    { x: 838, z: 32 },
    { x: 838, z: 0 },
  ];
  await stage(M.commons, 19.5);
  results.push(
    await walk('down: the commons to platform A', [...path.toReversed(), M.rampFoot, M.rampHead, M.platformA], 60000),
  );
  results.push(await walk('up: platform A to the commons', [M.rampHead, M.rampFoot, ...path, M.commons], 60000));
  if (results.slice(1).some((r) => !r.ok))
    throw new Error('WESTWALK: shore path route failed; do not restore the stair');
  (window as unknown as { __westWalk?: unknown }).__westWalk = results;
  console.log(`WESTWALK done ${JSON.stringify(results.map((r) => `${r.walk}: ${r.ok ? 'ok' : 'FAILED'}`))}`);
}
void run();
export {};
