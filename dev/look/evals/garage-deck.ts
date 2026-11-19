// A friend on the table's deck through someone else's install (docs/plans/garage-install-moment.md, the checkpoint's
// deck case). Runs on both pages of a two-player look:
//   npm run look -- --players 2 --real --rail-seed steel-home --hud --eval dev/look/evals/garage-deck.ts \
//     --until window.__deckDone --seconds 14 --frames 28 --video --name deck
// Player 1 (the look's still, sheet and video) is the friend: stood on the deck's free end, clear of the works copy,
// facing the table. Player 2 opens the garage at the post and, 4 s after both are ready, holds Install. The friend's
// page samples its own body every frame from the moment's start to its end and prints what happened to it: how far it
// went round the table with the deck (carried means about a full turn), how far it dropped, whether it ever stood
// inside the copy's boxes, and whether it saw the moment (phase `moment`, not `mine`). It fails (a console error)
// unless the friend was carried round with the deck, never dropped into the pit and ends on the deck's top.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { garageRow, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');
const { LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { inspectRailway, line, railReady, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');

const second = new URLSearchParams(location.search).get('player') === '2';
const who = second ? 'installer' : 'friend';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (text: string) => console.log(`DECK ${who}: ${text}`);
const done = window as Window & { __deckDone?: boolean };
const { geo, table: centre, y: groundY } = garageRow();
const boiler = () => line(rw(), LINE2).boiler;
const works = () =>
  inspectRailway()?.worksView as
    { table?: { yaw: number }; garageView?: { deckYaw: number | null; copy?: { solid: number } } } | undefined;
const round = (v: number) => Math.round(v * 100) / 100;
const pos = () => me.body!.position;
const bearing = () => Math.atan2(pos().x - centre.x, pos().z - centre.z);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

if (!(await railReady(30_000))) throw new Error('garage-deck: the railway never became ready');
while (!me.body || !me.entered) await wait(100);
if (second) {
  const p = polarAt(centre, { bearing: geo.post.bearing + 6, r: geo.post.r - 0.2 });
  teleport(me.body!, p.x, groundY + 0.7, p.z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(p.x - centre.x, p.z - centre.z);
  await wait(14000);
  window.__debugCam?.clear();
  triggerAction('interact', 'down');
  triggerAction('interact', 'up');
  for (let k = 0; k < 80 && !garage.api?.isOpen(); k++) await wait(100);
  const s = garage.api?.snap();
  if (!s?.open || s.sel !== 'long' || !s.canInstall) throw new Error('garage-deck: the garage did not open ready');
  await wait(900);
  say('garage open on the Longer boiler; holding in 4 s');
  done.__deckDone = true;
  background(
    (async () => {
      await wait(4000);
      triggerAction('interact', 'down');
      for (let k = 0; k < 150 && boiler() < 2; k++) await wait(50);
      triggerAction('interact', 'up');
      say(`held; Line.boiler ${boiler()}`);
    })(),
    'deck installer',
  );
} else {
  // The deck's free end: along the deck's axis from the table's centre, past the copy, on the side away from the post.
  const yaw = works()?.table?.yaw ?? 0;
  const r = Number(new URLSearchParams(location.search).get('deckr') ?? 6.6);
  let best = 1;
  for (const end of [1, -1]) {
    const x = centre.x + Math.sin(yaw) * r * end,
      z = centre.z + Math.cos(yaw) * r * end;
    const post = polarAt(centre, geo.post);
    if (Math.hypot(x - post.x, z - post.z) > 6) best = end;
  }
  const x = centre.x + Math.sin(yaw) * r * best,
    z = centre.z + Math.cos(yaw) * r * best;
  teleport(me.body!, x, groundY + 1.2, z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(x - centre.x, z - centre.z);
  await wait(14000);
  window.__debugCam?.clear();
  const start = {
    at: [round(pos().x), round(pos().y), round(pos().z)],
    r: round(Math.hypot(pos().x - centre.x, pos().z - centre.z)),
  };
  say(
    `on the deck: table yaw ${round(yaw)}, ${JSON.stringify(start)}, ground ${round(groundY)}, copy solids ${works()?.garageView?.copy?.solid}`,
  );
  done.__deckDone = true;
  background(
    (async () => {
      for (let k = 0; k < 2400 && garage.api!.snap().phase !== 'moment'; k++) await wait(10);
      const seen = garage.api!.snap();
      const y0 = pos().y;
      let turned = 0,
        last = bearing(),
        lowest = y0,
        deckTurned = 0,
        lastDeck = works()?.garageView?.deckYaw ?? works()?.table?.yaw ?? 0,
        maxStep = 0,
        prev = { x: pos().x, z: pos().z };
      const marks: string[] = [];
      const t0 = performance.now();
      let fellAt = -1;
      while (garage.api!.snap().phase === 'moment' && performance.now() - t0 < 15000) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const b = bearing();
        turned += wrap(b - last);
        last = b;
        const d = works()?.garageView?.deckYaw ?? works()?.table?.yaw ?? 0;
        deckTurned += wrap(d - lastDeck);
        lastDeck = d;
        lowest = Math.min(lowest, pos().y);
        if (fellAt < 0 && pos().y < y0 - 0.3) fellAt = Math.round(performance.now() - t0);
        maxStep = Math.max(maxStep, Math.hypot(pos().x - prev.x, pos().z - prev.z));
        prev = { x: pos().x, z: pos().z };
        const ms = Math.round(performance.now() - t0);
        if (marks.length < 40 && ms > marks.length * 500)
          marks.push(
            `${ms}:${round(pos().y)}/${Math.round((turned * 180) / Math.PI)}°/deck ${Math.round((deckTurned * 180) / Math.PI)}°`,
          );
      }
      const end = {
        at: [round(pos().x), round(pos().y), round(pos().z)],
        r: round(Math.hypot(pos().x - centre.x, pos().z - centre.z)),
      };
      say(`saw the moment: phase ${seen.phase}, mine ${seen.mine}, garage open ${seen.open}`);
      say(
        `through the moment (${Math.round(performance.now() - t0)} ms): the deck turned ${Math.round((deckTurned * 180) / Math.PI)}°, the friend went ${Math.round((turned * 180) / Math.PI)}° round; dropped ${round(y0 - lowest)} m (fell past 0.3 m at ${fellAt} ms); largest frame step ${round(maxStep)} m`,
      );
      say(`samples ${marks.join(' ')}`);
      say(`after: ${JSON.stringify(end)}, Line.boiler ${boiler()}, copy solids ${works()?.garageView?.copy?.solid}`);
      // Carried (the deck's yaw, within 20°), never dropped into the pit, and still on the deck's top a second after
      // the deck's boxes came back (not inside them).
      await wait(1000);
      const settled = round(y0 - pos().y);
      say(`a second later: ${settled} m under where they stood`);
      const deg = (a: number) => Math.round((a * 180) / Math.PI);
      const fails = [
        Math.abs(deg(deckTurned)) < 300 && `the deck turned only ${deg(deckTurned)}°`,
        Math.abs(deg(turned - deckTurned)) > 20 && `carried ${deg(turned)}° on a ${deg(deckTurned)}° turn`,
        y0 - lowest > 0.3 && `dropped ${round(y0 - lowest)} m`,
        Math.abs(settled) > 0.15 && `ended ${settled} m under the deck's top`,
      ].filter(Boolean);
      if (fails.length) throw new Error(`garage-deck: ${fails.join('; ')}`);
      say('PASS: carried round on the deck, never dropped');
    })(),
    'deck friend',
  );
}
export {};
