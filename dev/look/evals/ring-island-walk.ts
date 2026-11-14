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
//   ringview=step   an eye stepping off a standing train's tail door onto the west platform, toward the footbridge
//   ringview=ramp   an eye at the top of the west platform's ramp, where the summit path starts, toward the footbridge
//   ringview=bridge the summit path's footbridge from the halt-side rim, along the deck
//   ringview=deck   standing on the deck 5 m from the halt-side end, looking along it
//   ringview=cut    the bridge from track level in the cutting (use --rail-seed stack-laid-1 for the laid line)
//   ringview=rim    from 15 m uphill of the cutting's south rim, looking back down at the edge and the bridge
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
const { getRailwayUnstuck } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const ring = (await import(
  '/src/entities/ring-island/state.ts' as string
)) as typeof import('../../../src/entities/ring-island/state.ts');
const layout = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const { summitBridge, summitPath } = (await import(
  '/src/entities/ring-island/path.ts' as string
)) as typeof import('../../../src/entities/ring-island/path.ts');
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
  // Arrival eyes 1.7 m over the west platform (8.9 m), looking at the footbridge's middle.
  step: { cam: { ...at(438, -6.6), y: 10.6 }, look: { x: 1392.9, y: 15.8, z: -884.3 } },
  ramp: { cam: { ...at(464, -9.1), y: 10.6 }, look: { x: 1392.9, y: 15.8, z: -884.3 } },
  pier: { cam: { ...at(-2, 6), y: 30 }, look: { ...at(440, -20), y: 3 } },
  bridge: { cam: { x: 1374, y: 17.5, z: -872 }, look: { x: 1404.7, y: 17, z: -892 } },
  cut: { cam: { x: 1411, y: 10.6, z: -852 }, look: { x: 1392.9, y: 14, z: -884.3 } },
};
type View = { cam: { x: number; y: number; z: number }; look: { x: number; y: number; z: number } };
// The first document runs this once from --eval and again from --until's import: only one of them acts.
const first = !reloaded && !view && !(page as unknown as { __ringWalkStarted?: boolean }).__ringWalkStarted;
(page as unknown as { __ringWalkStarted?: boolean }).__ringWalkStarted = true;

if (view || reloaded || first) {
  if (!(await railReady())) throw new Error('ring-island-walk: the railway never became ready');
  await until(() => me.body, 'body ready');
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
  const setView = (name: keyof typeof VIEWS | View) => {
    const v = typeof name === 'string' ? VIEWS[name] : name;
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
    // As dev/look/perf.ts reads them: renderer.info right after a completed game frame (three resets it at each start).
    const frames = () =>
      (window as unknown as { boogle: { prof: { last: { frames: number } } } }).boogle.prof.last.frames;
    const calls = async () => {
      const seen: number[] = [];
      for (let k = 0; k < 10; k++) {
        const at = frames();
        await until(() => frames() > at, 'a completed frame', 30000);
        seen.push(renderer.info.render.drawCalls);
      }
      return { min: Math.min(...seen), max: Math.max(...seen) };
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
      `perf ${JSON.stringify({ size: [innerWidth, innerHeight], withNear, without, added: withNear.max - without.min, rows, coast })}`,
    );
  } else if (view === 'handout' || view === 'handin') {
    // The handover: walk out along line 2's track toward the pier, by real keys, and stop just outside (about 512 m from
    // the hinge) or just inside (about 492 m) the near view's 500 m mount distance. The still is a narrow lens from
    // just behind you onto the leaf: the far leaf outside, the near leaf inside, never both.
    const { RAIL_LINES } = (await import(
      '/src/sim/railway-lines.ts' as string
    )) as typeof import('../../../src/sim/railway-lines.ts');
    const { raycastClosest, rayHit } = (await import(
      '/src/physics/engine.ts' as string
    )) as typeof import('../../../src/physics/engine.ts');
    const { entityKinds } = (await import(
      '/src/entity/entity.ts' as string
    )) as typeof import('../../../src/entity/entity.ts');
    const path = RAIL_LINES[1]!.path;
    const point = (k: number) => ({ x: path[k * 2]! / 100, z: path[k * 2 + 1]! / 100 });
    const hit = rayHit();
    const top = (p: { x: number; z: number }) =>
      raycastClosest({ x: p.x, y: 80, z: p.z }, { x: p.x, y: -20, z: p.z }, {}, hit) ? hit.hitPointWorld.y : 30;
    const hingeAt = at(layout.RING_GAP.hinge / 100, layout.RING_FORMATION.mid / 100);
    const toHinge = () => Math.hypot(b.position.x - hingeAt.x, b.position.z - hingeAt.z);
    const startP = point(44);
    await stage(startP.x, top(startP), startP.z);
    const stop = view === 'handout' ? 512 : 492;
    input.keys.add('KeyW');
    let k = 45;
    const end = performance.now() + 30000;
    while (toHinge() > stop && performance.now() < end) {
      const p = point(k);
      if (Math.hypot(p.x - b.position.x, p.z - b.position.z) < 2) k++;
      faceTo(p.x - b.position.x, p.z - b.position.z);
      await wait(16);
    }
    input.keys.delete('KeyW');
    await wait(1500);
    const ux = (hingeAt.x - b.position.x) / toHinge(),
      uz = (hingeAt.z - b.position.z) / toHinge();
    const eye = [b.position.x - ux * 3, b.position.y + 1.6, b.position.z - uz * 3];
    window.__debugCam!.set(eye, [hingeAt.x, 22, hingeAt.z], 7);
    window.__debugCam!.set = () => {};
    await wait(1500);
    const far = entityKinds()
      .find((e) => e.kind === 'ring-island-far')
      ?.entities[0]?.describe?.();
    say(
      `${view} ${JSON.stringify({ toHinge: f2(toHinge()), at: where(), nearMounted: ring.ringIslandNear.mounted, far })}`,
    );
  } else if (view === 'halt' || view === 'step' || view === 'ramp' || view === 'pier') {
    const v = VIEWS[view];
    // At the pier you stand on the halt's deck behind the camera (crossing-done's landing), out of the frame.
    const h = ring.ringUnstuckHome;
    if (view === 'pier') await stage(h.x, h.y, h.z);
    else await stage(v.cam.x, v.cam.y - 1.7, v.cam.z);
    await until(() => ring.ringIslandNear.mounted, 'near view mounted');
    setView(view);
    say(`view ${view} ${JSON.stringify({ mounted: ring.ringIslandNear.mounted })}`);
  } else if (view === 'bridge' || view === 'cut' || view === 'deck' || view === 'rim') {
    // The footbridge (docs/plans/ring-summit-path.md). You stand at the path's foot, out of every frame, so the near
    // view is mounted; `deck` and `rim` are computed from the bridge's own ends at eye height.
    const { a, b: far, middle } = summitBridge(g),
      span = Math.hypot(far.x - a.x, far.z - a.z),
      ux = (far.x - a.x) / span,
      uz = (far.z - a.z) / span;
    const rimAt = { x: far.x + ux * 12, z: far.z + uz * 12 }; // b stands 3 m behind the south rim
    const v: View =
      view === 'deck'
        ? {
            cam: { x: a.x + ux * 5, y: a.y + ((far.y - a.y) * 5) / span + 1.7, z: a.z + uz * 5 },
            look: { x: far.x, y: far.y + 1.2, z: far.z },
          }
        : view === 'rim'
          ? {
              cam: { ...rimAt, y: g.islandH(rimAt.x, rimAt.z) + 1.7 },
              look: { x: middle.x, y: a.y, z: middle.z },
            }
          : VIEWS[view];
    const foot = at(464, -19.6);
    await stage(foot.x, g.islandH(foot.x, foot.z), foot.z);
    await until(() => ring.ringIslandNear.mounted, 'near view mounted');
    setView(v);
    say(`view ${view} ${JSON.stringify({ mounted: ring.ringIslandNear.mounted, cam: v.cam, look: v.look })}`);
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
    // The view's own waypoints (src/entities/ring-island/path.ts), so the witness cannot drift from the drawn path;
    // the last two, the lookout ramp's foot and the deck, are this eval's.
    const bridge = summitBridge(g);
    const way = [
      ...summitPath(g, CENTRE)
        .way.slice(0, -1)
        .map(([x, z]) => ({ x, z })),
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
        // Arrived at the bridge's far end: was it the deck that carried you there?
        if (p.x === bridge.b.x && p.z === bridge.b.z)
          log.push({
            bridge: {
              onDeck: hit && me.coyote > 0 && Math.abs(b.position.y - PLAYER_R - bridge.b.y) < 0.4,
              y: f2(b.position.y),
            },
          });
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
    const stored = Object.keys(localStorage).find((k) => k.startsWith('boogle.railway-pose.'));
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
