// A greybox solid going on with a player standing in it (greybox leg 3, step 6's review: route-greybox/clear.ts).
// `&clear=lay` (with --rail-seed canopy-open): feeds Canopy's first section through the real commands (take at Bell
// Rock's rack, feed frame 1), then stands Buddy on Bell Rock's rock under leg 3's descent (bay s 1300, where the
// slab's underside is under head height) and waits out the lay. `&clear=mount` (--rail-seed canopy-reached): frees
// Canopy's area (Buddy 900 m away), puts Buddy inside the outward platform's box, and lets the area mount again. Each
// prints `CLEAR` lines with Buddy's position before and after and ends the warm-up (window.__placeDone).
//   npm run look -- --rail-seed canopy-open --eval dev/look/evals/leg3-clear.ts --query 'clear=lay' \
//     --until window.__placeDone --cam -110,22,-805 --look -125,14,-830 --name l3-clear-lay
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { railwayCommands } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { RAIL_LEGS, ROW_LINE, legFrame, legRack } = (await import(
  '/src/sim/railway-route.ts' as string
)) as typeof import('../../../src/sim/railway-route.ts');
const { legRow } = (await import(
  '/src/sim/railway-queries-route.ts' as string
)) as typeof import('../../../src/sim/railway-queries-route.ts');
const { rowWorld, rowY } = (await import(
  '/src/entities/railway/row-path.ts' as string
)) as typeof import('../../../src/entities/railway/row-path.ts');
const { routeAreas } = (await import(
  '/src/entities/route-greybox/state.ts' as string
)) as typeof import('../../../src/entities/route-greybox/state.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

const w = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (ok: () => boolean, what: string, ms = 120000) => {
  const end = performance.now() + ms;
  while (!ok()) {
    if (performance.now() > end) throw new Error(`leg3-clear timed out: ${what}`);
    await wait(50);
  }
};
const mode = new URLSearchParams(location.search).get('clear');
const at = () => {
  const p = me.body!.position;
  return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)];
};
const put = (x: number, y: number, z: number) => {
  teleport(me.body!, x, y, z);
  me.body!.velocity.set(0, 0, 0);
};
const k = RAIL_LEGS.findIndex((l) => l.id === 'bell-canopy'),
  leg = RAIL_LEGS[k]!;

background(
  (async () => {
    await until(() => !!me.body && me.entered && !!R.railRead()?.ready() && !!railwayCommands(), 'the railway');
    const commands = railwayCommands()!;
    const settle = () => until(() => R.railRead()!.pending() === 0, 'commands accepted', 10000);
    if (mode === 'lay') {
      const rack = legRack(leg, 0),
        frame = legFrame(leg, 0),
        sec = leg.sections[0]!;
      for (let trip = 0; legRow(R.rw(), k).start < 0; trip++) {
        if (trip > 40) throw new Error(`leg3-clear: not fed after 40 trips ${JSON.stringify(legRow(R.rw(), k))}`);
        put(rack.x / 100, rack.y / 100 + 0.6, rack.z / 100);
        await wait(300);
        if (R.rail(R.rw()).depot > 0) commands.depotTake();
        await settle();
        if (R.rail(R.rw()).depotRails > 0) commands.depotRailTake();
        await settle();
        put(frame.x / 100, frame.y / 100 + 0.6, frame.z / 100);
        await wait(300);
        commands.feedLeg(k);
        await settle();
        const row = legRow(R.rw(), k);
        console.log(
          `CLEAR fed ${row.logs}/${sec.logs} logs, ${row.rails}/${sec.rails} rails, laying ${row.start >= 0}`,
        );
      }
      const p = rowWorld(ROW_LINE.bay, 1300, 0, { x: 0, z: 0 });
      put(p.x, 14.6, p.z);
      await wait(1500);
      console.log(`CLEAR standing ${JSON.stringify({ at: at(), rail: +rowY(ROW_LINE.bay, 1300).toFixed(2) })}`);
      await until(() => legRow(R.rw(), k).laid >= 1, 'the first section laid', 90000);
      await wait(1500);
      console.log(`CLEAR after the lay ${JSON.stringify({ at: at(), laid: legRow(R.rw(), k).laid })}`);
    } else if (mode === 'mount') {
      const canopy = routeAreas.get('canopy')!;
      put(-1060, 40, -1200);
      await until(() => !canopy.mounted, 'Canopy freed', 60000);
      // Inside the outward platform's box (n -10, lat +5.8 from the stop; its top 13.9 m, solid down to 11.5 m).
      put(-1077.73, 12.9, -327.59);
      console.log(`CLEAR inside ${JSON.stringify({ at: at(), mounted: canopy.mounted })}`);
      await until(() => canopy.mounted, 'Canopy mounted', 60000);
      await wait(1500);
      console.log(`CLEAR after the mount ${JSON.stringify({ at: at(), mounted: canopy.mounted })}`);
    } else throw new Error('leg3-clear: ?clear=lay or ?clear=mount');
    w.__placeDone = true;
  })(),
  'leg 3 clearance look',
);
export {};
