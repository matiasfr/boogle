// Short A3 movement witness: real bot inputs from the fares-running landing, no teleports or recovery.
// npm run look -- --rail-seed fares-running --eval dev/look/evals/town-a3-hall.ts --until window.__placeDone --warm 240 --name a3-hall --wall 180
const { makeBot, hideBotNotes } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { axisPoint, HALL, ISLAND_C, TILL } = (await import(
  '/src/place/home-station.ts' as string
)) as typeof import('../../../src/place/home-station.ts');
const { ORIGIN } = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const { JUMPS } = (await import(
  '/src/world/railway-jump.ts' as string
)) as typeof import('../../../src/world/railway-jump.ts');
const { WORKS_BREAKER } = (await import(
  '/src/sim/railway-works-layout.ts' as string
)) as typeof import('../../../src/sim/railway-works-layout.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');
const { prefabs } = (await import(
  '/src/content/prefabs/railway-till.ts' as string
)) as typeof import('../../../src/content/prefabs/railway-till.ts');
const collider = prefabs.find((p) => p.key === 'railway.till')!.colliders[0]!;
if (collider.shape !== 'box') throw new Error('A3 witness expects the authored counter box');
const cos = Math.cos(TILL.yaw),
  sin = Math.sin(TILL.yaw);
const clearance = (x: number, z: number) => {
  const dx = x - ORIGIN.x - TILL.x,
    dz = z - TILL.z;
  const lx = cos * dx - sin * dz - collider.at[0],
    lz = sin * dx + cos * dz - collider.at[2];
  return (
    Math.hypot(Math.max(0, Math.abs(lx) - collider.half[0]), Math.max(0, Math.abs(lz) - collider.half[2])) - PLAYER_R
  );
};
const landings = JUMPS.filter((j) => j.land)
  .map((j) => ({ stage: j.stage, clearance: clearance(j.land!.x, j.land!.z) }))
  .sort((a, b) => a.clearance - b.clearance);
if (landings.some((j) => j.clearance <= 0)) throw new Error('A3 till overlaps a jump-in landing');
console.log(`PLAY A3 JUMP CLEARANCE ${JSON.stringify(landings.filter((j) => j.clearance < 40))}`);
const bot = makeBot({
  recover: () => {
    throw new Error('A3 hall walk requested forbidden recovery');
  },
});
const axis = (a: number, c: number) => {
  const p = axisPoint(a, c);
  return { x: p.x + ORIGIN.x, z: p.z };
};
const doorA = (HALL.goodsDoor.a0 + HALL.goodsDoor.a1) / 2;
const waypoints = [
  { name: 'hall centre', ...axis(-9.5, ISLAND_C) },
  { name: 'beside the till', ...axis(-11.4, ISLAND_C - 4.6) },
  { name: 'goods door inside', ...axis(doorA, ISLAND_C - 4.6) },
  { name: 'goods door outside', ...axis(doorA, ISLAND_C - HALL.w / 2 - 1) },
  { name: 'breaker', x: WORKS_BREAKER.x / 100, z: WORKS_BREAKER.z / 100 },
];
setTimeout(() => window.__debugCam?.clear(), 100);
background(
  (async () => {
    if (!(await railReady(60000)) || !(await bot.until(() => me.body && me.coyote > 0, 60000, 'A3 landed')))
      throw new Error('A3 hall seed not ready');
    let minimum = Infinity;
    const sample = setInterval(() => {
      const p = me.body!.position;
      minimum = Math.min(minimum, clearance(p.x, p.z));
    }, 40);
    try {
      for (const p of waypoints) {
        if (!(await bot.walk(p.x, p.z, 0.65, { limit: 45000 }))) throw new Error(`A3 could not reach ${p.name}`);
        console.log(
          `PLAY A3 WALK ${JSON.stringify({ waypoint: p.name, at: me.body!.position, minimumClearance: minimum })}`,
        );
      }
      if (minimum < -0.02) throw new Error('A3 walk entered the till collider');
      hideBotNotes();
      const eye = axis(0, ISLAND_C + 1),
        aim = axis(-9.5, ISLAND_C - 3);
      window.__debugCam?.set([eye.x, 23, eye.z], [aim.x, 19.4, aim.z], 65);
      bot.finish(`A3 hall to breaker, no recovery; minimum capsule clearance ${minimum.toFixed(3)} m`);
    } finally {
      clearInterval(sample);
    }
  })(),
  'A3 hall movement proof',
);
export {};
