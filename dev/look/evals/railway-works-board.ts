// npm run look -- --query proto=place --rail-seed works-open --eval dev/look/evals/railway-works-board.ts --warp-speed 5
// Real inputs from the fresh landing. The dock board chooses the destination and bill.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { line2Rides, HALT } = (await import(
  '/dev/look/bots/railway-ride.ts' as string
)) as typeof import('../bots/railway-ride.ts');
const { rowLever } = (await import(
  '/dev/look/bots/railway-legs.ts' as string
)) as typeof import('../bots/railway-legs.ts');
const { inspectRailway, railBack, railRead } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { RAIL_LINES } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const bot = makeBot();
const { ride, rideFrom, hopTo, check, until, face } = line2Rides(bot);
const read = () => inspectRailway()?.worksView?.dockBoard ?? [];
await until(() => me.entered && me.body && read().length, 'dock board stands', 60000);
await until(() => me.body && bot.dist(801, 10) < 6, 'fresh arrival stands on the dock', 60000);
const before = read();
console.log('WORKS BOARD ' + JSON.stringify(before));
const match = /Line (\d+) · (.+)$/.exec(before.at(-1)!);
if (!match) throw new Error('Dock board did not name a train');
const line = Number(match[1]) - 1;
const stops = RAIL_LINES[line]!.halts;
const destination = stops.findIndex((h) => h.name === match[2]);
check(destination >= 0, 'board names a served halt');
check(/logs 0\//.test(before[1]!), 'board asks for logs');
if (line === 1) {
  const { coverLifted } = (await import(
    '/src/boot/cover-hold.ts' as string
  )) as typeof import('../../../src/boot/cover-hold.ts');
  await until(() => coverLifted() && me.coyote > 0 && railRead()?.ready(), 'ready to walk from the dock', 90000);
  await bot.wait(800);
  const { SHORE_PATH } = (await import(
    '/src/place/shore-layout.ts' as string
  )) as typeof import('../../../src/place/shore-layout.ts');
  for (const [x, z] of SHORE_PATH.slice(1)) {
    if (!(await bot.straight(1000 + x, z, 1.2, 7000))) {
      console.log('DOCK PATH ' + JSON.stringify({ at: me.body?.position, to: [1000 + x, z] }));
      await hopTo(1000 + x, z, 'shore path ' + x + ',' + z, 15000, 1.5);
    }
  }
  await ride(HALT.village2, destination);
} else {
  const lever = rowLever(line, 0);
  const west = stops[0]!.platforms[0];
  await hopTo(west.x / 100, west.z / 100, 'hopped onto the West landing platform', 30000);
  await hopTo(lever.x, lever.z, 'walked to the West landing departure lever', 30000);
  const requested = () => interactTarget()?.verb === 'Stop requested';
  await rideFrom(
    {
      name: stops[0]!.name,
      stop: 0,
      stands: () => true,
      handle: () => ({ ...lever, over: requested() }),
      calling: requested,
      wait: lever,
    },
    destination,
    { line, askEach: true },
  );
  const platform = stops[destination]!.platforms[0];
  await hopTo(platform.x / 100, platform.z / 100, 'stepped onto the named platform');
}
const flag = scene.getObjectByName('railway:works-pennant');
if (!flag?.visible) throw new Error('No works pennant visible');
const { x, z } = flag.position;
check(await bot.walk(x, z, 3), 'walked to the pennant');
if (line === 1) {
  // Quarry's ordinary trees supply logs at the kiln.
  const trees = inspectRailway()!
    .trees.filter((t) => !t.cleared && t.remaining > 0 && ![28, 209, 232].includes(t.id))
    .sort((a, b) => bot.dist(a.x, a.z) - bot.dist(b.x, b.z));
  for (const tree of trees.slice(0, 12)) {
    const route = await bot.plan(tree.x, tree.z, 2.6);
    if (!route.arrives || route.path.some((p) => p.y < 3)) continue;
    if (!(await bot.walk(tree.x, tree.z, 2.6))) continue;
    face(tree.x, tree.z);
    await bot.wait(100);
    for (let i = 0; i < 24 && !railBack().carry && interactTarget()?.verb === 'Chop'; i++) {
      bot.press();
      await bot.wait(380);
    }
    if (railBack().carry) break;
  }
} else {
  const { RAIL_LEGS, legRack } = (await import(
    '/src/sim/railway-route.ts' as string
  )) as typeof import('../../../src/sim/railway-route.ts');
  const leg = RAIL_LEGS.find(
    (l) => l.line === line && destination >= l.railheadHalt && destination < l.railheadHalt + l.sections.length,
  )!;
  const rack = legRack(leg, destination - leg.railheadHalt + 1);
  check(await bot.walk(rack.x / 100, rack.z / 100, 1), 'walked to the platform rack');
  check(await bot.use(rack.x / 100, rack.z / 100, 'take a load of logs', /logs/i), 'took rack logs');
}
check(railBack().carry > 0, 'picked up a requested load');
check(await bot.walk(x, z, 2), 'returned to the works with logs');
check(await bot.use(x, z, 'feed one load', /Fill the kiln|Feed/i), 'fed the works by hand');
await until(
  () => read()[1] !== before[1] && !railBack().carry && railRead()!.pending() === 0,
  'the board counts the load',
  30000,
);
console.log('WORKS BOARD FED ' + JSON.stringify(read()));
export {};
