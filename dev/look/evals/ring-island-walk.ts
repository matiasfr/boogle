// Ring Island's near view (src/entities/ring-island/; docs/plans/ring-island-build1.md, step 2b), by real input: from
// the island's south shore up the slope and the west platform's ramp onto the island halt, back down and along the path
// to the summit lookout, grounded and never swimming; then a real reload there (the saved pose must come back on the
// island); then Get unstuck from the brace platform's edge, from the island halt, and from the sea beside the shore, each
// landing dry on our side (before v27: the Pier halt's deck, call 31). Staging teleports only; every measured move is the
// controller's. Prints `RINGWALK ...` lines and writes `window.__ringIslandResult`; the run ends on the halt still.
//   npm run look -- --rail-seed crossing-done --eval dev/look/evals/ring-island-walk.ts \
//     --until "window.__ringIslandDone ?? (import('/dev/look/evals/ring-island-walk.ts'), false)"
// The reload half runs only through --until (look re-imports this file in the reloaded page). Stills alone:
//   ringview=halt   the island halt's west platform toward the shard and the ring
//   ringview=pier   the pier head toward the island's shore (the foam lip and shallows of the coast's second region)
//   ringview=perf   diagnostic counts at the pier view: draws with the near view and without, its CPU rows, the coast
//   npm run look -- --rail-seed crossing-done --query ringview=pier --eval dev/look/evals/ring-island-walk.ts
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { inspectRailway, getRailwayUnstuck } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const ring = (await import(
  '/src/entities/ring-island/state.ts' as string
)) as typeof import('../../../src/entities/ring-island/state.ts');
const layout = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');

type Done = { __ringIslandDone?: boolean; __ringIslandResult?: Record<string, unknown> };
const page = window as unknown as Window & Done;
const KEY = 'ring-island-walk';
const query = new URLSearchParams(location.search);
const view = query.get('ringview');
const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
const reloaded = nav?.type === 'reload' && sessionStorage.getItem(KEY) !== null;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const say = (text: string) => console.log(`RINGWALK ${text}`);
const f2 = (n: number) => +n.toFixed(2);
const until = async (fn: () => unknown, label: string, ms = 60000) => {
  const end = performance.now() + ms;
  while (!fn()) {
    if (performance.now() > end) throw new Error(`ring-island-walk: ${label}`);
    await wait(50);
  }
};
/** World metres of (u, lat) metres. */
const at = (u: number, lat: number) => {
  const p = layout.ringAt(Math.round(u * 100), Math.round(lat * 100));
  return { x: p.x / 100, z: p.z / 100 };
};
const CENTRE = { x: 1330, z: -1120 };
const VIEWS = {
  halt: { cam: { ...at(432, -8.6), y: 8.9 + 2.2 }, look: { x: 1338, y: 70, z: -1120 } },
  pier: { cam: { ...at(-2, 6), y: 30 }, look: { ...at(440, -20), y: 3 } },
};
// The first document runs this once from --eval and again from --until's import: only one of them acts.
const first = !reloaded && !view && !(page as unknown as { __ringWalkStarted?: boolean }).__ringWalkStarted;
(page as unknown as { __ringWalkStarted?: boolean }).__ringWalkStarted = true;

if (view || reloaded || first) {
  await until(() => me.body && inspectRailway()?.ready, 'body and railway ready');
  const g = await ring.islandGround();
  const b = me.body!;
  const faceTo = (dx: number, dz: number) => {
    cam.yaw = me.yaw = Math.atan2(-dx, -dz);
  };
  const stage = async (x: number, y: number, z: number) => {
    teleport(b, x, y + PLAYER_R + 0.3, z);
    b.velocity.set(0, 0, 0);
    input.keys.clear();
    releaseJump();
    await wait(800);
  };
  const where = () => ({ x: f2(b.position.x), y: f2(b.position.y), z: f2(b.position.z) });
  const setView = (name: keyof typeof VIEWS) => {
    const v = VIEWS[name];
    window.__debugCam!.set([v.cam.x, v.cam.y, v.cam.z], [v.look.x, v.look.y, v.look.z]);
    window.__debugCam!.set = () => {}; // look places its own camera after the eval; this one is the capture
  };
  const result: Record<string, unknown> = reloaded ? JSON.parse(sessionStorage.getItem(KEY) ?? '{}') : {};
  page.__ringIslandResult = result;

  if (view === 'perf') {
    // Diagnostic counts at the pier head view: draw calls with the near view mounted, then with its meshes hidden for a
    // moment (the difference is what it adds), its walkers' CPU rows, and the coast's packed texture and bake.
    const { renderer } = (await import(
      '/src/render/scene.ts' as string
    )) as typeof import('../../../src/render/scene.ts');
    const { prof } = (await import('/src/loop.ts' as string)) as typeof import('../../../src/loop.ts');
    const { waterRuntime } = (await import(
      '/src/render/water-render.ts' as string
    )) as typeof import('../../../src/render/water-render.ts');
    const { entityKinds } = (await import(
      '/src/entity/entity.ts' as string
    )) as typeof import('../../../src/entity/entity.ts');
    const h = ring.ringUnstuckHome;
    await stage(h.x, h.y, h.z);
    await until(() => ring.ringIslandNear.mounted, 'near view mounted');
    setView('pier');
    const calls = async () => {
      let sum = 0;
      for (let k = 0; k < 20; k++) {
        await new Promise((r) => requestAnimationFrame(r));
        sum += renderer.info.render.drawCalls;
      }
      return f2(sum / 20);
    };
    await wait(3000);
    const near = entityKinds().find((k) => k.kind === 'ring-island-near')?.entities[0];
    const withNear = await calls();
    near!.mesh!.visible = false;
    const without = await calls();
    near!.mesh!.visible = true;
    await wait(2000);
    const rows = prof.table(400).filter((r) => r.name.startsWith('ring-island'));
    const coast = (waterRuntime.inspect() as { coast?: unknown }).coast;
    say(
      `perf ${JSON.stringify({ size: [innerWidth, innerHeight], withNear, without, added: f2(withNear - without), rows, coast })}`,
    );
  } else if (view === 'halt' || view === 'pier') {
    const v = VIEWS[view];
    // At the pier you stand on the halt's deck behind the camera (crossing-done's landing), out of the frame.
    const h = ring.ringUnstuckHome;
    if (view === 'pier') await stage(h.x, h.y, h.z);
    else await stage(v.cam.x, v.cam.y - 1.7, v.cam.z);
    await until(() => ring.ringIslandNear.mounted, 'near view mounted');
    setView(view);
    say(`view ${view} ${JSON.stringify({ mounted: ring.ringIslandNear.mounted })}`);
  } else if (first) {
    // ---------------------------------------------------------------- the walk
    let swam = 0,
      air = 0,
      longestAir = 0,
      travelled = 0;
    const watch = setInterval(() => {
      if (me.swimming) swam++;
      if (me.coyote > 0) air = 0;
      else longestAir = Math.max(longestAir, (air += 0.05));
    }, 50);
    async function walkTo(x: number, z: number, tol: number, ms: number) {
      input.keys.add('KeyW');
      const end = performance.now() + ms;
      try {
        let lx = b.position.x,
          lz = b.position.z;
        while (performance.now() < end) {
          travelled += Math.hypot(b.position.x - lx, b.position.z - lz);
          lx = b.position.x;
          lz = b.position.z;
          const dx = x - b.position.x,
            dz = z - b.position.z;
          if (Math.hypot(dx, dz) < tol) return true;
          faceTo(dx, dz);
          await wait(16);
        }
        return false;
      } finally {
        input.keys.delete('KeyW');
      }
    }
    const shore = at(440, -40);
    await stage(shore.x, g.islandH(shore.x, shore.z), shore.z);
    await until(() => ring.ringIslandNear.mounted, 'near view mounted', 30000);
    await wait(1500); // the colliders' first step
    swam = 0;
    const start = performance.now();
    const legs: { name: string; to: { x: number; z: number }; tol?: number }[] = [
      { name: 'slope', to: at(462, -24) },
      { name: 'ramp foot', to: at(464, -19.2), tol: 1 },
      { name: 'ramp top', to: at(464, -9.6), tol: 0.8 },
      { name: 'west platform', to: at(458, -7.6), tol: 1 },
    ];
    const pathFoot = at(464, -19.6);
    const way = [
      { x: pathFoot.x, z: pathFoot.z },
      { x: pathFoot.x - 18, z: pathFoot.z - 8 },
      { x: 1380, z: -870 },
      { x: 1395, z: -930 },
      { x: 1360, z: -975 },
      { x: 1372, z: -1035 },
      { x: 1345, z: -1075 },
      { x: CENTRE.x + (4 / Math.hypot(4, 6)) * 12, z: CENTRE.z + (6 / Math.hypot(4, 6)) * 12 },
      { x: CENTRE.x + 1.5, z: CENTRE.z + 2 },
    ];
    const log: Record<string, unknown>[] = [];
    let ok = true;
    for (const leg of legs) {
      const hit = await walkTo(leg.to.x, leg.to.z, leg.tol ?? 1.5, 25000);
      log.push({ leg: leg.name, ok: hit, at: where(), swimming: me.swimming });
      if (!hit) {
        ok = false;
        break;
      }
    }
    const onHalt = ok && b.position.y > 8.9 && b.position.y < 10;
    result.halt = { ok, onHalt, at: where(), s: f2((performance.now() - start) / 1000) };
    say(`halt ${JSON.stringify(result.halt)}`);
    if (ok) {
      for (const [k, p] of [at(464, -8.6), ...way].entries()) {
        const hit = await walkTo(p.x, p.z, k === way.length ? 1 : 1.6, 60000);
        log.push({ leg: `path ${k}`, ok: hit, at: where(), swimming: me.swimming });
        if (!hit) {
          ok = false;
          break;
        }
      }
    }
    await wait(1200);
    clearInterval(watch);
    const onLookout = ok && Math.hypot(b.position.x - CENTRE.x, b.position.z - CENTRE.z) < 6 && b.position.y > 66.2;
    result.walk = {
      ok,
      onLookout,
      swamFrames: swam,
      longestAirS: f2(longestAir),
      metres: f2(travelled),
      s: f2((performance.now() - start) / 1000),
      at: where(),
      log,
    };
    say(`walk ${JSON.stringify(result.walk)}`);
    // ---------------------------------------------------------------- reload beside the lookout
    // Saved poses stand on ground, never on a deck (Place's pose policy sweeps for a roof), so step off the lookout's
    // deck onto the summit's slope beside it, across from its ramp, and stand there.
    const side = { x: CENTRE.x - (6 / Math.hypot(4, 6)) * 9, z: CENTRE.z + (4 / Math.hypot(4, 6)) * 9 };
    const besideOk = await walkTo(side.x, side.z, 0.8, 15000);
    await wait(1500);
    result.beside = {
      ok: besideOk,
      at: where(),
      ground: f2(g.islandH(b.position.x, b.position.z)),
      standing: me.coyote > 0,
    };
    say(`beside ${JSON.stringify(result.beside)}`);
    dispatchEvent(new Event('pagehide')); // the arrival saves the pose on pagehide, as on a real unload
    const stored = Object.keys(localStorage).find((k) => k.startsWith('boogle.railway-pose.v0:'));
    result.saved = stored ? JSON.parse(localStorage.getItem(stored)!) : null;
    result.before = where();
    say(`saved ${JSON.stringify(result.saved)}`);
    sessionStorage.setItem(KEY, JSON.stringify(result));
    setTimeout(() => location.reload(), 300); // after this eval returns, so look's evaluation isn't torn down under it
  } else {
    // ---------------------------------------------------------------- after the reload: the pose, then Get unstuck
    sessionStorage.removeItem(KEY);
    const before = result.before as { x: number; y: number; z: number } | undefined;
    const restored = await until(
      () => before && Math.hypot(b.position.x - before.x, b.position.z - before.z) < 3 && me.coyote > 0,
      'restored',
      30000,
    ).then(
      () => true,
      () => false,
    );
    result.reload = {
      restored,
      at: where(),
      onIsland: g.onIsland(b.position.x, b.position.z),
      mounted: ring.ringIslandNear.mounted,
    };
    say(`reload ${JSON.stringify(result.reload)}`);
    const home = ring.ringUnstuckHome;
    const unstuck = async (name: string, x: number, y: number, z: number) => {
      await stage(x, y, z);
      getRailwayUnstuck();
      await wait(1500);
      const p = where();
      const r = {
        from: { x: f2(x), y: f2(y), z: f2(z) },
        at: p,
        home: Math.hypot(p.x - home.x, p.z - home.z) < 2.5 && Math.abs(p.y - PLAYER_R - home.y) < 1.2,
        dry: !me.swimming,
        standing: me.coyote > 0,
      };
      say(`unstuck ${name} ${JSON.stringify(r)}`);
      return r;
    };
    const edge = at(layout.RING_BRACE_PLATFORM.u1 / 100 - 0.6, layout.RING_BRACE_PLATFORM.lat1 / 100 - 0.6);
    const halt = at(448, -7.6);
    const sea = at(410, -35);
    result.unstuck = {
      braceEdge: await unstuck('braceEdge', edge.x, 8.0, edge.z),
      islandHalt: await unstuck('islandHalt', halt.x, 8.9, halt.z),
      sea: await unstuck('sea', sea.x, 0, sea.z),
    };
    say(`sea ground ${f2(g.islandH(sea.x, sea.z))}`);
    const v = VIEWS.halt;
    await stage(v.cam.x, v.cam.y - 1.7, v.cam.z);
    await until(() => ring.ringIslandNear.mounted, 'near view mounted');
    setView('halt');
    say(`result ${JSON.stringify(result)}`);
    page.__ringIslandDone = true;
  }
}
export {};
