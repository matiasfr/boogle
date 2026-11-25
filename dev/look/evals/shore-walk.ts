// command: npm run look -- --action dev/look/evals/shore-walk.ts --name shore-walk --cam 785,9,30 --look 806,2,42
// clip:    npm run look -- --action dev/look/evals/shore-walk.ts --query shoreClip=1 --video --seconds 16 --name shore-clip --cam 788,9,-2 --look 812,6,18
// The shore after the cliff kit (docs/plans/cliff-kit-everywhere.md, step 1), with the real controller: held W, the
// camera turned toward each waypoint every frame (staging teleports only to start each check).
// - The bluff's walkable end, both ways: from the sand at its foot (z 36.5) up the graded end to its top at z 47 and
//   back down, each leg arriving within 1 m, with no fall (a drop faster than 7 m/s) and no stall (no metre of
//   progress in 3 s).
// - The shore climb from the landing to its top and back, past the faces beside it, arriving the same way.
// - Idle stance: stood still 5 s on the landing, on the graded end and on the shore climb, Buddy creeps under 0.05 m
//   (src/place/cove-stop.ts holds an idle player on static ground).
// Prints SHORE WALK {...}; the clip (shoreClip=1) walks from the landing up the climb for the camera instead.
// World x is Place x + 1000.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/terrain.ts' as string)) as typeof import('../../../src/place/terrain.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const b = me.body!;
async function stand(x: number, z: number) {
  teleport(b, x, H(x, z) + 1.2, z);
  b.velocity.set(0, 0, 0);
  await wait(3000); // landed and settled
}
/** Walks to each point with W held, steering the camera; the first leg that fails ends it. */
async function walk(points: [number, number][]) {
  let fastestFall = 0;
  input.keys.add('KeyW');
  try {
    for (const [tx, tz] of points) {
      let best = Infinity,
        bestAt = performance.now();
      const deadline = performance.now() + 15000;
      for (;;) {
        const dx = tx - b.position.x,
          dz = tz - b.position.z,
          d = Math.hypot(dx, dz);
        if (d < 1) break;
        if (d < best - 1) {
          best = d;
          bestAt = performance.now();
        }
        if (performance.now() - bestAt > 3000 || performance.now() > deadline)
          return { arrived: false, at: [b.position.x, b.position.y, b.position.z], to: [tx, tz], fastestFall };
        cam.yaw = Math.atan2(-dx, -dz);
        fastestFall = Math.min(fastestFall, b.velocity.y);
        await wait(16);
      }
    }
    return { arrived: true, fastestFall, fell: fastestFall < -7 };
  } finally {
    input.keys.delete('KeyW');
  }
}

if (new URLSearchParams(location.search).get('shoreClip') === '1') {
  // The clip: from the landing's inland end up the climb, past the shore climb's wall.
  await stand(805, 10);
  void walk([
    [813, 10],
    [818, 17],
    [823, 28],
    [835, 32],
  ]);
} else {
  const result: Record<string, unknown> = {};
  await stand(802, 36.5);
  result.up = await walk([
    [805, 40],
    [806, 47],
  ]);
  result.down = await walk([
    [805, 40],
    [802, 36.5],
  ]);
  // The landing up the shore climb, past the dressed wall beside it, and back down.
  await stand(805, 10);
  result.climb = await walk([
    [813, 10],
    [818, 17],
    [823, 28],
    [835, 32],
  ]);
  result.climbDown = await walk([
    [823, 28],
    [818, 17],
    [813, 10],
    [805, 10],
  ]);
  for (const [name, x, z] of [
    ['landing', 801, 10],
    ['graded end', 805, 41],
    ['bluff top', 806, 47],
    ['shore climb', 816, 20],
  ] as const) {
    await stand(x, z);
    const from = [b.position.x, b.position.z];
    await wait(5000);
    result[`idle ${name}`] = {
      creep: +Math.hypot(b.position.x - from[0]!, b.position.z - from[1]!).toFixed(4),
      y: +b.position.y.toFixed(2),
    };
  }
  console.log('SHORE WALK ' + JSON.stringify(result));
}
export {};
