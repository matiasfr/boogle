// Tree evidence through the existing look broker. &trees=checks|decorative|hardwood1|hardwood2|rebound|bite|full|dense.
// Fixtures select a location/tool/bag; every productive contact uses the real chop path.
const q = new URLSearchParams(location.search);
const mode = q.get('trees') ?? 'checks';
const trees = (await import('/src/proto/place/chop.ts' as string)) as typeof import('../../../src/proto/place/chop.ts');
const state = (await import('/src/proto/place/job.ts' as string)) as typeof import('../../../src/proto/place/job.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const physics = (await import('/src/physics/engine.ts' as string)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import(
  '/src/place/terrain.ts' as string
)) as typeof import('../../../src/place/terrain.ts');
const { safeTreeFall, treeFallClear } = (await import(
  '/src/place/tree-catalog.ts' as string
)) as typeof import('../../../src/place/tree-catalog.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const { TREES, back, chop, resetTrees, greatTree } = trees;
const { job, save, restore } = state;
while (!me.body) await wait(50);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const place = window.__place as any;
place.day.hold = true;
place.day.u = 0.26;
job.awake = job.rung.multi = true;
const check = (what: string, ok: boolean, detail: unknown = '') => {
  if (!ok) throw new Error(`TREES FAIL ${what}: ${JSON.stringify(detail)}`);
  console.log(`TREES PASS ${what}: ${JSON.stringify(detail)}`);
};
const empty = () => {
  back.logs = back.rails = back.stone = back.incoming = back.beam = 0;
  back.big = null;
};
const put = (t: (typeof TREES)[number]) => {
  const x = t.x + 2.3;
  const z = t.z + 0.7;
  physics.teleport(me.body!, x, H(x, z) + 1.2, z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(x - t.x, z - t.z);
};
const frame = (t: (typeof TREES)[number], wide = false) => {
  const size = wide ? 1.6 : 1;
  setTimeout(
    () =>
      window.__debugCam!.set(
        [t.x + 11 * size, t.y + 6 * size, t.z + (t.hardwood ? 13 : -13) * size],
        [t.x, t.y + 3, t.z],
        48,
      ),
    600,
  );
};
const swing = async (t: (typeof TREES)[number]) => {
  check('swing starts', chop(t));
  await wait(420);
};
const hardwoods = TREES.filter((t) => t.hardwood);
const ordinary = TREES.filter((t) => t.index >= 29 && !t.hardwood);
check(
  'catalog keeps 388 ordinary, two hardwoods and great ID 28',
  TREES.length === 391 &&
    hardwoods.length === 2 &&
    TREES.filter((t) => !t.hardwood && !t.great).length === 388 &&
    greatTree.index === 28,
  { total: TREES.length, hardwood: hardwoods.map((t) => ({ id: t.index, x: t.x, z: t.z })) },
);

if (mode === 'checks') {
  let compact = 0;
  for (const t of TREES) {
    const fall = safeTreeFall(t.x, t.z, t.size, 0, t.great);
    if (fall.collapsed) compact++;
    else if (!treeFallClear(t.x, t.z, t.size, fall.yaw, t.great)) throw new Error(`Unsafe tree fall ${t.index}`);
  }
  check('every long fall clears protected paths, rails, buildings and spawn', true, {
    long: TREES.length - compact,
    compact,
  });
  for (let k = 0; k < 32; k++) {
    const fall = safeTreeFall(greatTree.x, greatTree.z, greatTree.size, (k * Math.PI) / 16, true);
    check('great beam has a safe long fall from every approach', !fall.collapsed, k);
  }
  resetTrees();
  empty();
  job.rung.axe = 0;
  job.rung.pack = 0;
  const t = ordinary[0]!;
  put(t);
  let total = 0;
  for (let k = 0; k < 5; k++) {
    await swing(t);
    total += back.logs;
    empty();
  }
  check('decorative starter yields exactly ten and fells', total === 10 && t.fall >= 0, { total, fall: t.fall });

  const good = ordinary[1]!;
  put(good);
  job.rung.axe = 1;
  await swing(good);
  await swing(good);
  check('eight-slot bag receives five then three', back.logs === 8, back.logs);
  const beforeFull = JSON.stringify(state.captureShared());
  await swing(good);
  check('full bag changes no shared progress or yield', JSON.stringify(state.captureShared()) === beforeFull);
  total = back.logs;
  empty();
  for (let k = 0; k < 8 && good.fall < 0; k++) {
    await swing(good);
    total += back.logs;
    empty();
  }
  check('clipped proper-axe yield is conserved at fifteen', total === 15 && good.fall >= 0, { total, fall: good.fall });

  const mixed = ordinary[2]!;
  put(mixed);
  job.rung.axe = 0;
  await swing(mixed);
  total = back.logs;
  empty();
  job.rung.axe = 1;
  for (let k = 0; k < 10 && mixed.fall < 0; k++) {
    await swing(mixed);
    total += back.logs;
    empty();
  }
  check('mid-tree upgrade raises ceiling without replenishing issued logs', total === 15, total);

  const hard = hardwoods[0]!;
  put(hard);
  job.rung.axe = 0;
  const beforeRebound = JSON.stringify(state.captureShared());
  await swing(hard);
  await swing(hard);
  check(
    'repeated hardwood rebound changes no shared progress',
    JSON.stringify(state.captureShared()) === beforeRebound && back.logs === 0,
  );
  job.rung.axe = 1;
  job.rung.pack = 1;
  for (let k = 0; k < 3; k++) await swing(hard);
  check('hardwood gives fifteen useful logs in three proper swings', back.logs === 15 && hard.fall >= 0, {
    logs: back.logs,
    fall: hard.fall,
  });
  empty();

  const partial = ordinary[3]!;
  put(partial);
  check('save-flight swing starts', chop(partial));
  await wait(100); // after contact, before the first presentation flight can land
  save();
  const accepted = back.logs;
  await wait(400);
  resetTrees();
  empty();
  check('save restores', restore());
  check('accepted in-flight wood survives reload exactly once', back.logs === accepted && accepted === 5, {
    accepted,
    restored: back.logs,
  });
  check('felled decorative and hardwood trees restore', t.fall >= 0 && good.fall >= 0 && hard.fall >= 0);
  total = back.logs;
  empty();
  for (let k = 0; k < 8 && partial.fall < 0; k++) {
    await swing(partial);
    total += back.logs;
    empty();
  }
  check('partial progress restores without duplicate yield', total === 15, total);
  job.rung.axe = 0;
  put(greatTree);
  for (let k = 0; k < 12; k++) await swing(greatTree);
  check('great tree fells with the first axe in twelve strokes', greatTree.fall >= 0 && back.logs === 0);
  // Stand inside the accepted future log before it becomes solid; settlement must free the capsule.
  const safety = TREES[227]!;
  const safe = safeTreeFall(safety.x, safety.z, safety.size, 0);
  check('player safety fixture has a long fall', !safe.collapsed);
  trees.applyTreeHarvest(safety, {
    work: 15,
    issued: 15,
    ceiling: 15,
    revision: 1,
    fell: true,
    fallYaw: safe.yaw,
    collapsed: false,
  });
  const px = safety.x + Math.sin(safe.yaw) * 2;
  const pz = safety.z + Math.cos(safe.yaw) * 2;
  physics.teleport(me.body!, px, safety.y + 1.1, pz);
  me.body!.velocity.set(0, 0, 0);
  await wait(1000);
  const p = me.body!.position;
  const along = (p.x - safety.x) * Math.sin(safe.yaw) + (p.z - safety.z) * Math.cos(safe.yaw);
  const across = (p.x - safety.x) * Math.cos(safe.yaw) - (p.z - safety.z) * Math.sin(safe.yaw);
  check(
    'settled log leaves the player outside its solid footprint',
    along < -0.8 || along > 5 * safety.size + 1 || Math.abs(across) >= 0.3 * safety.size + 0.65 || p.y > safety.y + 2,
    { along, across, y: p.y, ground: safety.y },
  );
  frame(t);
  Object.assign(window, { __treeDone: true });
} else {
  empty();
  job.rung.pack = 1;
  job.rung.axe = mode === 'bite' || mode === 'dense' ? 1 : 0;
  const target =
    mode === 'hardwood2'
      ? hardwoods[1]!
      : ['hardwood1', 'rebound', 'bite'].includes(mode)
        ? hardwoods[0]!
        : TREES[227]!; // open edge of the southern forest: the stump is visible from the village side
  put(target);
  if (mode === 'full') back.logs = 16;
  if (mode === 'dense') {
    for (const t of TREES.filter((t) => !t.great)) {
      const safe = safeTreeFall(t.x, t.z, t.size, 0);
      trees.applyTreeHarvest(t, {
        work: 15,
        issued: 15,
        ceiling: 15,
        revision: t.revision + 1,
        fell: true,
        fallYaw: safe.yaw,
        collapsed: safe.collapsed,
      });
    }
    await wait(2000);
    physics.teleport(me.body!, 903, H(903, 14) + 1.2, 14);
    me.body!.velocity.set(0, 0, 0);
    cam.yaw = me.yaw = -0.25;
    setTimeout(() => window.__debugCam!.clear(), 600);
    check('all 390 non-great trees settle in dense fixture', TREES.filter((t) => t.fall >= 0.75).length === 390);
  } else if (mode === 'decorative') {
    for (let k = 0; k < 5; k++) await swing(target);
    await wait(1800);
    check('decorative stump and fallen trunk', target.fall >= 0, { id: target.index, logs: back.logs });
  } else if (['rebound', 'bite', 'full'].includes(mode)) {
    Object.assign(window, {
      __placeAct: async () => {
        for (let k = 0; k < (mode === 'bite' ? 1 : 5); k++) {
          await swing(target);
          await wait(180);
        }
      },
    });
  }
  if (mode !== 'dense') frame(target, mode.startsWith('hardwood'));
  let bodies = 0;
  let shapes = 0;
  physics.forEachStatic(-1, (_body, parts) => {
    bodies++;
    shapes += parts.length;
  });
  console.log(`TREES VIEW ${mode}: ${JSON.stringify({ id: target.index, x: target.x, z: target.z, bodies, shapes })}`);
  Object.assign(window, { __treeDone: true });
}
export {};
