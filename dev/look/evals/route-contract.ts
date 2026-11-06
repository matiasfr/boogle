// Focused look fixture, not a full progression run. Existing dev bills run the real feed/lay completion.
// --query 'proto=place&route=v2&routeProbe=early|ready|pull|hook' --eval this-file
const q = new URLSearchParams(location.search);
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const hands = (await import('/src/player/hands.ts' as string)) as typeof import('../../../src/player/hands.ts');
const { job, captureShared, applyShared } = (await import(
  '/src/proto/place/job.ts' as string
)) as typeof import('../../../src/proto/place/job.ts');
const { L2, machine } = (await import(
  '/src/proto/place/lines.ts' as string
)) as typeof import('../../../src/proto/place/lines.ts');
const { snapRun, activeFrame } = (await import(
  '/src/proto/place/run.ts' as string
)) as typeof import('../../../src/proto/place/run.ts');
const { snapTech, techApi } = (await import(
  '/src/proto/place/tech.ts' as string
)) as typeof import('../../../src/proto/place/tech.ts');
const { coopWire } = (await import(
  '/src/proto/place/coop.ts' as string
)) as typeof import('../../../src/proto/place/coop.ts');
const { SERVICE_ROUTES, LEVER } = (await import(
  '/src/proto/place/tech-layout.ts' as string
)) as typeof import('../../../src/proto/place/tech-layout.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const THREE = await import('three/webgpu');
const place = window.__place as { skipLine2(): void; skipDelivery(): void };
const bot = makeBot();
const check = (ok: boolean, label: string) => {
  if (!ok) throw new Error(`ROUTE CONTRACT: ${label}`);
  console.log(`ROUTE PASS ${label}`);
};
const until = async (fn: () => boolean, label: string) => {
  check(await bot.until(fn, 90000, label), label);
};
const put = (x: number, y: number, z: number) => {
  teleport(me.body!, x, y + 0.8, z);
  me.body!.velocity.set(0, 0, 0);
};
// Actual machine meshes at accepted deployment; conservative world-axis boxes, not a swept train audit.
const machineClear = () => {
  scene.updateMatrixWorld(true);
  for (const car of [machine.loco, machine.flatbed]) {
    const machineBox = new THREE.Box3().setFromObject(car.mesh);
    for (const obj of scene.children.filter(
      (o) => o.visible && o.name.startsWith('route-v2-') && o.name !== 'route-v2-winch-drive',
    ))
      check(
        !machineBox.intersectsBox(new THREE.Box3().setFromObject(obj)),
        `Q${L2.stage} machine clear of ${obj.name}`,
      );
  }
};
place.skipLine2();
job.tech.jump = false;
const build = async (stage: number) => {
  while (L2.stage < stage) {
    const next = L2.stage + 1;
    place.skipDelivery();
    if (next === 3) {
      techApi.open('quarry');
      check(!job.gate.quarry && !techApi.route().quarry, 'paid Q3 is not completed Q3');
    }
    await until(() => L2.stage >= next, `accepted Q${next} completion`);
  }
  await bot.wait(200);
};
await build(2);
machineClear();
const before = captureShared();
put(1000 + LEVER.x, LEVER.y, LEVER.z);
await bot.wait(500);
job.tech.jump = job.tech.hook = job.tech.glide = true;
hands.interactDown();
hands.interactUp();
techApi.open('quarry');
coopWire.tech?.('quarry');
check(
  !job.gate.quarry && !techApi.route().drive && hands.interactTarget()?.id !== 'place-lever',
  'early ledge, all moves: lever and received gate event do nothing',
);
check(activeFrame()?.spec.id === 'Q3', 'early ledge cannot accept Q4 stock');
job.tech.jump = job.tech.hook = job.tech.glide = false;
if (q.get('routeProbe') !== 'early') {
  await build(3);
  machineClear();
  check(!job.gate.quarry && techApi.route().drive, 'Q3 engages drive but still requires the pull');
  const complete = captureShared();
  applyShared(before);
  snapRun();
  snapTech();
  check(!techApi.route().quarry && !techApi.route().drive, 'unfinished snapshot removes ramp and coupling');
  applyShared(complete);
  snapRun();
  snapTech();
  check(
    techApi.route().decks.every((d) => d.visible && d.solid) && !job.gate.quarry,
    'completed snapshot restores both walks and connected drive, gate still shut',
  );
  const kind = q.get('routeProbe') === 'hook' ? 'hook' : 'quarry';
  const points = SERVICE_ROUTES[kind];
  const foot = points[0]!;
  put(1000 + foot.x, foot.y, foot.z);
  await bot.wait(500);
  for (const p of points) check(await bot.straight(1000 + p.x, p.z, 0.35, 10000), `${kind}: walk ${p.x},${p.z}`);
  await bot.wait(300);
  check(!job.tech.jump && !me.swimming && me.coyote > 0, `${kind}: dry baseline walking arrival`);
  if (kind === 'quarry') {
    check(await bot.straight(1000 + LEVER.x, LEVER.z, 1, 5000), 'walk from ramp to lever');
    if (q.get('routeProbe') === 'pull') {
      await bot.use(1000 + LEVER.x, LEVER.z, 'quarry lever', /Pull/);
      check(job.gate.quarry, 'completed Q3 plus lever pull opens quarry');
      const pulled = captureShared();
      applyShared(pulled);
      snapRun();
      snapTech();
      check(job.gate.quarry && techApi.route().drive, 'pulled gate survives snapshot reconstruction');
    }
  }
}
console.log('ROUTE STATE ' + JSON.stringify({ stage: L2.stage, gate: job.gate.quarry, ...techApi.route() }));
export {};
