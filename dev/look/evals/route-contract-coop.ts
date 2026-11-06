// Existing two-player look: the empty follower disconnects through Q1-Q3, then inherits and operates the built route.
// --players 2 --query 'proto=place&route=v2&coop=1' --eval a wrapper importing this module
const { coop } = (await import(
  '/src/proto/place/coop.ts' as string
)) as typeof import('../../../src/proto/place/coop.ts');
const { job } = (await import('/src/proto/place/job.ts' as string)) as typeof import('../../../src/proto/place/job.ts');
const { L2 } = (await import(
  '/src/proto/place/lines.ts' as string
)) as typeof import('../../../src/proto/place/lines.ts');
const { techApi } = (await import(
  '/src/proto/place/tech.ts' as string
)) as typeof import('../../../src/proto/place/tech.ts');
const { net } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { SERVICE_ROUTES, LEVER } = (await import(
  '/src/proto/place/tech-layout.ts' as string
)) as typeof import('../../../src/proto/place/tech-layout.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const place = window.__place as { skipLine2(): void; skipDelivery(): void };
const bot = makeBot();
const check = (ok: boolean, label: string) => {
  if (!ok) throw new Error('ROUTE COOP: ' + label);
  console.log('ROUTE COOP PASS ' + label);
};
const until = async (fn: () => boolean, label: string) => check(await bot.until(fn, 180000, label), label);
await until(() => coop.debug().peers.length === 1, 'initial peer');
await bot.wait(2500);
const builder = coop.debug().amAuthority;
if (builder) {
  await until(() => coop.debug().peers.length === 0, 'empty follower departed before construction');
  place.skipLine2();
  job.tech.jump = false;
  while (L2.stage < 3) {
    const next = L2.stage + 1;
    place.skipDelivery();
    await until(() => L2.stage >= next, `accepted Q${next}`);
  }
  check(!job.gate.quarry, 'builder leaves gate shut');
  await until(() => coop.debug().peers.length === 1, 'absent peer returned');
  await until(() => job.gate.quarry, 'returning nonbuilder operates quarry gate');
} else {
  check(L2.stage === 0, 'depart with no completed jobs');
  net.room!.pause(90000);
  await bot.wait(91000);
  await until(() => L2.stage === 3 && techApi.route().drive, 'late snapshot supplies completed Q3 and drive');
  check(
    !job.gate.quarry && !job.tech.jump && techApi.route().decks.every((d) => d.visible && d.solid),
    'late peer gets both walking connectors, no extra jump, gate still shut',
  );
  const foot = SERVICE_ROUTES.quarry[0]!;
  teleport(me.body!, 1000 + foot.x, foot.y + 0.8, foot.z);
  me.body!.velocity.set(0, 0, 0);
  await bot.wait(500);
  for (const p of SERVICE_ROUTES.quarry)
    check(await bot.straight(1000 + p.x, p.z, 0.35, 10000), 'late peer walks the service ramp');
  check(await bot.straight(1000 + LEVER.x, LEVER.z, 1, 5000), 'late peer reaches lever');
  await bot.use(1000 + LEVER.x, LEVER.z, 'quarry lever', /Pull/);
  await until(() => job.gate.quarry, 'late peer gate result');
}
check(
  L2.stage === 3 && job.gate.quarry && techApi.route().drive && techApi.route().decks.every((d) => d.solid),
  'peers agree on Q3, gate, coupling and both colliders',
);
console.log(
  'ROUTE COOP STATE ' + JSON.stringify({ builder, stage: L2.stage, gate: job.gate.quarry, ...techApi.route() }),
);
export {};
