// The village-to-post walk at today's Roundhouse table (docs/plans/garage-install-moment.md, G2's reach proof): from
// the forge's door to the garage's lever post, on the bot's own planner over the real colliders, so the works copy's
// two boxes on the deck are walked round like anything else. Prints the walk in game seconds, the metres walked, the
// highest the player rose over the start (a jump or a climb shows here) and whether the copy was solid.
//   npm run look -- --rail-seed steel-home --eval dev/look/evals/garage-walk.ts --until window.__walkDone   (copy solid)
//   npm run look -- --rail-seed stall-done --eval dev/look/evals/garage-walk.ts --until window.__walkDone   (deck empty)
// `--query via=nose` walks round the engine's nose instead of the planner's own route; `--real` for the seconds.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { inspectRailway, railReady } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { X, Z } = (await import(
  '/src/place/opening-plans.ts' as string
)) as typeof import('../../../src/place/opening-plans.ts');
const { GARAGE_GEO, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');
const { SHED_TABLE } = (await import(
  '/src/sim/railway-works-layout.ts' as string
)) as typeof import('../../../src/sim/railway-works-layout.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
background(
  (async () => {
    if (!(await railReady())) throw new Error('garage-walk: the railway never became ready');
    while (!me.body || !me.entered) await wait(100);
    const centre = { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100 };
    const post = polarAt(centre, GARAGE_GEO.a.post);
    // Where a player stands to use the post: 0.6 m south of it, inside the prompt's reach.
    const goal = polarAt(centre, { bearing: 98, r: 5.4 });
    // Outside the forge's door (railway-forge-walk.ts's "out the door").
    teleport(me.body, X - 2.9, 19.5, Z + 8);
    await wait(2500);
    const here = () => ({ x: me.body!.position.x, y: me.body!.position.y, z: me.body!.position.z });
    const start = here();
    let metres = 0,
      top = start.y,
      last = start,
      going = true;
    /** One sample a metre walked: east and south of the table's centre, and the rise over the start. */
    const trail: string[] = [];
    void (async () => {
      while (going) {
        const p = me.body!.position;
        metres += Math.hypot(p.x - last.x, p.z - last.z);
        top = Math.max(top, p.y);
        if (Math.floor(metres) > trail.length)
          trail.push(`${(p.x - centre.x).toFixed(1)},${(p.z - centre.z).toFixed(1)},${(p.y - start.y).toFixed(2)}`);
        last = here();
        await wait(50);
      }
    })();
    const t0 = performance.now();
    // `&via=nose` goes round the engine's nose first (off the deck's rim on line 1's track bed): the route with no jump.
    const bot = makeBot();
    const round = polarAt(centre, { bearing: 45, r: 5.5 });
    if (new URLSearchParams(location.search).get('via') === 'nose')
      await bot.walk(round.x, round.z, 0.5, { limit: 90000 });
    const ok = await bot.walk(goal.x, goal.z, 0.6, { limit: 90000 });
    const seconds = (performance.now() - t0) / 1000;
    going = false;
    const p = me.body.position;
    const view = inspectRailway()?.worksView?.garageView;
    console.log(
      `GARAGE walk ${ok ? 'ok' : 'FAILED'}: ${seconds.toFixed(1)} s, ${metres.toFixed(1)} m walked, ` +
        `${Math.hypot(start.x - goal.x, start.z - goal.z).toFixed(1)} m straight, rose ${(top - start.y).toFixed(2)} m, ` +
        `ended ${Math.hypot(p.x - post.x, p.z - post.z).toFixed(2)} m from the post and ` +
        `${Math.hypot(p.x - centre.x, p.z - centre.z).toFixed(2)} m from the centre; copy ${JSON.stringify(view?.copy ?? null)}`,
    );
    console.log(`GARAGE trail ${trail.join(' ')}`);
    (window as Window & { __walkDone?: boolean }).__walkDone = true;
  })(),
  'garage walk',
);
export {};
