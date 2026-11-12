// npm run look -- --rail-seed crossing-done --eval dev/look/evals/railway-q7-crate.ts --until window.__placeDone \
//   --wall 1800 --question "When Q7 is laid, does its crate appear on the pier, not rise from under it?"
// The moment Q7 completes: the track layer leaves the scene that frame (line2-view.ts `stowed`), so its station crate is
// not handed down from the stowed flatbed (crates-view.ts). One teleport onto the pier, then real inputs: Q7's kit unloads at the Pier by itself; the bot
// takes the depot's logs and the shelf's rails to Q7's frame until it lays, and every frame logs any crate in flight
// and its drawn height. Ends a second after completion, the camera on the pier's south deck. Logs `CRATE Q7 ...`.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { LINE2_STATIONS, Q7 } = (await import(
  '/src/sim/railway-line2-layout.ts' as string
)) as typeof import('../../../src/sim/railway-line2-layout.ts');

type Box = { station: string; visible: boolean; x: number; y: number; z: number; flight: number; drawnY: number };
type View = {
  frames: { x: number; z: number }[];
  depot: number[] | null;
  shelf?: { x: number; z: number } | null;
};
const w = window as Window & { __placeDone?: boolean };
const bot = makeBot({
  recover: () => {
    throw new Error('Q7 crate: forbidden recovery');
  },
});
const read = () => R.inspectRailway()!;
const view = () => read().line2View as unknown as View;
const boxes = () => (read() as unknown as { reward: { stationBoxes: { boxes: Box[] } } }).reward.stationBoxes.boxes;
const job = () => R.line2Station(Q7);
const check = (ok: unknown, beat: string) => {
  if (!ok) throw new Error(beat);
};
const until = async (fn: () => unknown, beat: string, ms = 600000) => check(await bot.until(fn, ms, beat), beat);
setTimeout(() => window.__debugCam!.clear(), 100);

background(
  (async () => {
    check(await R.railReady(300000), 'railway ready');
    await until(() => me.body && me.coyote > 0, 'landed');
    const [logs, rails] = LINE2_STATIONS[Q7]!.bill;
    await until(
      () => R.rail(R.rw()).depot === logs && R.rail(R.rw()).depotRails === rails,
      'Q7 kit unloaded at the Pier',
    );
    // The seed lands at the usual spawn: start on Q7's piled deck, by its depot rack (no walk across the island).
    const d = view().depot!;
    teleport(me.body!, d[0]!, d[1]! + 1.5, d[2]!);
    await until(() => me.coyote > 0, 'standing on the pier', 20000);
    const frame = view().frames[Q7]!;
    const deliver = async () => {
      check(await bot.walk(frame.x, frame.z, 2.4), 'walked to Q7 frame');
      await until(
        () => R.railBack().carry === 0 && R.railBack().rails === 0 && read().pending === 0,
        'unloaded',
        30000,
      );
    };
    for (let trip = 0; job().start < 0; trip++) {
      check(trip < 6, 'Q7 funded in bounded carries');
      if (job().stock < logs) {
        const depot = view().depot!;
        check(await bot.use(depot[0]!, depot[2]!, 'take Q7 depot logs', /^Pick up$/), 'Q7 depot offered');
        check(await bot.work(() => R.railBack().carry > 0, 30000, 380), 'Q7 logs taken');
        await deliver();
      }
      if (job().railStock < rails) {
        const shelf = view().shelf;
        check(shelf, 'Q7 shelf in view');
        check(await bot.use(shelf!.x, shelf!.z, 'take Q7 shelf rails', /^Take rails$/), 'Q7 shelf offered');
        check(await bot.work(() => R.railBack().rails > 0, 30000, 380), 'Q7 rails taken');
        await deliver();
      }
    }
    console.log(
      `CRATE Q7 FUNDED ${JSON.stringify({
        before: boxes()
          .filter((b) => b.visible)
          .map((b) => b.station),
      })}`,
    );
    const shown = new Set(
      boxes()
        .filter((b) => b.visible)
        .map((b) => b.station),
    );
    let lowest = Infinity,
      flew = false;
    const watch = () => {
      for (const b of boxes())
        if (b.flight < 1) {
          flew = true;
          lowest = Math.min(lowest, b.drawnY - b.y);
        }
      if (!w.__placeDone) requestAnimationFrame(watch);
    };
    watch();
    await until(() => job().completion === 1, 'Q7 laid', 900000);
    await bot.wait(1000);
    const fresh = boxes().filter((b) => b.visible && !shown.has(b.station));
    const b = fresh[0];
    console.log(
      `CRATE Q7 ${JSON.stringify({ fresh: fresh.map((x) => ({ station: x.station, at: [x.x, x.y, x.z], drawnY: x.drawnY })), flew, lowestBelowSpot: Number.isFinite(lowest) ? +lowest.toFixed(2) : null, machineY: read().machine.y })}`,
    );
    if (b) window.__debugCam!.set([b.x + 6, b.y + 4, b.z + 6], [b.x, b.y, b.z], 60);
    await bot.wait(300);
    w.__placeDone = true;
  })().catch((error: unknown) => {
    console.log(`CRATE Q7 FAIL ${error instanceof Error ? error.message : String(error)}`);
    w.__placeDone = true;
    throw error;
  }),
  'Q7 crate moment',
);
export {};
