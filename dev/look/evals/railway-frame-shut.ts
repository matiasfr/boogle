// command: npm run look -- --rail-seed q3-stocked --query 'shut=q3' --eval dev/look/evals/railway-frame-shut.ts --until window.__shutPrepared --name shut-q3-open ; add --query 'shut=q3&shutAction=1' --action dev/look/evals/railway-frame-shut.ts --video --seconds 8 for the last piece in real time ; T1 from fresh spawn: --query 'shut=t1&railStop=T1%20layer%20boarded' --until window.__shutPrepared
// A funded frame shuts its intake (docs/brainstorms/finished-deposits.md, decisions-rail 2026-11-17): the frame from
// its walk-up side at player height, before and as the last accepted piece goes in. Real interactions only: the
// railway bot from fresh spawn for T1; for Q3, rack pickups and the frame's automatic unload, as railway-gated-fill.ts.
// shutAction=1 leaves the last carried rails for --action (this file again): unload, watch the gate shut while it feeds.
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { LINE2_STATIONS } = (await import(
  '/src/sim/railway-line2-layout.ts' as string
)) as typeof import('../../../src/sim/railway-line2-layout.ts');
const { cartCycleTicks } = (await import(
  '/src/sim/railway-cart.ts' as string
)) as typeof import('../../../src/sim/railway-cart.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const query = new URLSearchParams(location.search);
const shot = window as Window & { __shutPrepared?: boolean; __shutDone?: boolean; __railStop?: string };
const side = Number(query.get('shutSide') ?? 1);
/** The camera at a loaded player's eye a few metres out on the frame's walk-up side, looking at the board. */
// &shutTurn=<deg> swings the camera round the frame from the walk-up side, &shutD=<m> and &shutH=<m> set its distance
// and height (defaults: a loaded player's eye 6 m out, a little to one side).
// The pause dialog can open when the page loses focus mid-capture: hide it, as railway-forge-inside.ts does.
const captureStyle = document.createElement('style');
captureStyle.textContent = 'dialog.pause, dialog.pause::backdrop { visibility: hidden !important; }';
document.head.append(captureStyle);
function frameCam(f: { x: number; y: number; z: number }, toward: { x: number; z: number }) {
  const d = Number(query.get('shutD') ?? 6.5),
    h = Number(query.get('shutH') ?? 2.4),
    turn = (Number(query.get('shutTurn') ?? 22 * side) * Math.PI) / 180;
  const out = {
    x: toward.x * Math.cos(turn) - toward.z * Math.sin(turn),
    z: toward.x * Math.sin(turn) + toward.z * Math.cos(turn),
  };
  const camera: [number, number, number] = [f.x + out.x * d, f.y + h, f.z + out.z * d];
  const aim: [number, number, number] = [f.x, f.y + 0.7, f.z];
  window.__debugCam!.set(camera, aim, 50);
  setTimeout(() => window.__debugCam!.set(camera, aim, 50), 100);
}
if (query.get('shut') === 't1') {
  const { play } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
  const { LINKS } = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
  const { frameBesideLine } = (await import(
    '/src/place/spatial-station.ts' as string
  )) as typeof import('../../../src/place/spatial-station.ts');
  const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
  background(play(), 'railway bot to the stop');
  background(
    (async () => {
      while (!shot.__railStop) await wait(100);
      const line = LINKS[0]!;
      const at = frameBesideLine(line.stations[0]!, line.line, line.dir);
      // The walk-up side is away from the track (stations.ts `away`): +lx in world space.
      frameCam({ x: at.x, y: at.y ?? H(at.x, at.z), z: at.z }, { x: at.lx, z: at.lz });
      await wait(1200);
      console.log(`SHUT t1 ${JSON.stringify({ stop: shot.__railStop, job: R.inspectRailway()?.station })}`);
      shot.__shutPrepared = true;
    })(),
    'frame T1',
  );
} else if (query.get('shut') === 'q7') {
  // Q7's retained frame on the pier deck, once laid (--rail-seed deck-laid): stowed in place, not feedable.
  await R.railReady();
  const { Q7 } = (await import(
    '/src/sim/railway-line2-layout.ts' as string
  )) as typeof import('../../../src/sim/railway-line2-layout.ts');
  const wait2 = async () => {
    for (let i = 0; i < 600 && !R.inspectRailway()?.line2View.frames[Q7]; i++) await wait(100);
  };
  await wait2();
  const f = R.inspectRailway()!.line2View.frames[Q7];
  if (!f || !R.q7Laid(R.rw())) throw new Error('Requires a seed with Q7 laid and its frame built');
  frameCam(f, { x: Number(query.get('shutX') ?? 1), z: Number(query.get('shutZ') ?? 0) });
  await wait(1500);
  console.log(`SHUT q7 ${JSON.stringify({ f, cam: window.__debugCam ? 'set' : 'none' })}`);
  shot.__shutPrepared = true;
} else {
  // Q3 by default; &shut=q4 fills Q4 behind the closed quarry gate (--rail-seed q3-done) and stops there, full.
  const k = query.get('shut') === 'q4' ? 3 : 2;
  const spec = LINE2_STATIONS[k]!;
  const bot = makeBot({
    recover: () => {
      throw new Error('Shut fixture must not recover');
    },
  });
  const read = () => R.inspectRailway()!;
  const job = () => R.line2Station(k);
  const pending = () => R.railRead()!.pending();
  const until = async (fn: () => unknown, label: string, ms = 180000) => {
    if (!(await bot.until(fn, ms, label))) throw new Error(label);
  };
  await until(() => R.railRead()?.ready() && me.body, 'seed ready');
  if (R.line2Active(R.rw()) !== k) throw new Error(`Requires the Q${k + 1} active seed`);
  const frame = read().line2View.frames[k]!;
  const depot = read().line2View.depot!;
  // The walk-up side is away from the track: frameBesideLine's +l (stations.ts `away`).
  const { LINKS } = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
  const { frameBesideLine } = (await import(
    '/src/place/spatial-station.ts' as string
  )) as typeof import('../../../src/place/spatial-station.ts');
  const quarry = LINKS[1]!;
  const beside = frameBesideLine(quarry.stations[k]!, quarry.line, quarry.dir);
  const out = { x: beside.lx, z: beside.lz };
  const move = (p: { x: number; y: number; z: number }, ox = 0.8, oz = 0.8) => {
    teleport(me.body!, p.x + ox, p.y + 0.85, p.z + oz);
    me.body!.velocity.set(0, 0, 0);
    cam.yaw = me.yaw = Math.atan2(-ox, -oz) + Math.PI;
    cam.pitch = -0.1;
  };
  const take = async (kind: 0 | 2) => {
    const deadline = R.railAt() + cartCycleTicks(k) + 300;
    // Logs come on the cart to the rack; rails from the shelf where the stretch has one, else the forge's rack.
    const has = () =>
      kind === 0 ? R.rail(R.rw()).depot > 0 : spec.shelf ? R.rail(R.rw()).depotRails > 0 : R.forge(R.rw()).rack > 0;
    if (!(await bot.until(() => has() || R.railAt() > deadline, 3_600_000)) || !has()) throw new Error('stock');
    const at =
      kind === 0
        ? { x: depot[0]!, y: depot[1]!, z: depot[2]! }
        : spec.shelf
          ? read().line2View.shelf!
          : read().line2View.forgeRack;
    move(at);
    const id = kind === 0 ? 'railway-depot-logs' : spec.shelf ? 'railway-depot-rails' : 'railway-forge-rails';
    await until(() => interactTarget()?.id === id, `${id} offered`, 3000);
    const before = kind === 0 ? R.railBack().carry : R.railBack().rails;
    // As the railway bot does: a first press can precede the host's settled position, so repeat ordinary input.
    const got = () => (kind === 0 ? R.railBack().carry : R.railBack().rails) > before;
    if (!(await bot.work(got, 5000, 380))) throw new Error(`${id} carried`);
    await until(() => pending() === 0, 'pickup confirmed', 3000);
  };
  const unload = async () => {
    move(frame, out.x * 2.6, out.z * 2.6);
    // A full back of rails can be more than the bill still wants: the rest stays on the back.
    const done = () =>
      job().start >= 0 ||
      ((R.railBack().carry === 0 || job().stock >= spec.bill[0]) &&
        (R.railBack().rails === 0 || job().railStock >= spec.bill[1]));
    await until(() => done() && pending() === 0, 'unload', 10000);
    console.log(
      `SHUT q3 unloaded ${JSON.stringify({ stock: job().stock, rails: job().railStock, start: job().start })}`,
    );
  };
  if (!shot.__shutPrepared) {
    for (const kind of [0, 2] as const) {
      const bill = spec.bill[kind === 0 ? 0 : 1];
      for (let trip = 0; job().start < 0 && (kind === 0 ? job().stock : job().railStock) < bill; trip++) {
        if (trip > 6) throw new Error('Too many fixture trips');
        await take(kind);
        if (kind === 2 && query.get('shutAction') === '1' && job().railStock + R.railBack().rails >= bill) break;
        await unload();
      }
    }
    // Stand back on the walk-up side, still carrying the last rails if they are left for the action.
    move(frame, out.x * 5.5, out.z * 5.5);
    frameCam(frame, out);
    await wait(800);
    console.log(`SHUT q3 prepared ${JSON.stringify({ job: job(), carry: R.railBack().carry })}`);
    shot.__shutPrepared = true;
  } else {
    background(
      (async () => {
        await wait(600);
        // Walk the last rails in: the unload, then whatever the confirmed world says.
        move(frame, out.x * 2.6, out.z * 2.6);
        frameCam(frame, out);
        const t0 = performance.now();
        let shownFull = -1,
          funded = -1;
        await until(
          () => {
            const now = performance.now() - t0;
            if (shownFull < 0 && job().railStock >= spec.bill[1]) shownFull = now;
            if (funded < 0 && job().start >= 0) funded = now;
            return funded >= 0 && pending() === 0;
          },
          'last piece funds Q3',
          10000,
        );
        console.log(`SHUT q3 shown full at ${shownFull.toFixed(0)} ms, funded (accepted) at ${funded.toFixed(0)} ms`);
        await wait(2500);
        move(frame, out.x * 5.5, out.z * 5.5);
        frameCam(frame, out);
        shot.__shutDone = true;
      })(),
      'last piece into Q3',
    );
  }
  frameCam(frame, out);
}
export {};
