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
// `--query deckcase=jump`: the friend jumps in place twice during the fast part of the turn; it fails unless they end
// on the deck or in the pit (a jump off a turning deck lands "into the shallow pit as before", place.md), never thrown
// past the kerb. `--query deckcase=pitend`: the friend waits in the pit beside the deck's end and steps under where
// the deck will stop while it turns; it fails unless, when the deck stops, they are moved out at their own height
// (agent-calls, 18 November), still in the pit, never lifted onto the kerb. `--query deckcase=walkoff`: the friend
// strafes off the deck's side during the fast part of the turn and lets go as it leaves the deck; the same bar as
// the jump, and the speed it leaves with is printed (a step, not the deck's 20 m/s).
// `--query deckcase=pitjump` (recheck 2): as pitend, but under the deck's middle (`pitalong`, default 0), and the
// friend hops (jump held `hop` ms, default 40) from the pit floor twice while the deck turns, when it has no boxes. It
// fails if the deck's 1 cm pose marker (a registered platform, collision or not) holds the friend up inside the deck's
// thickness, or if they end past the pit. In the garage moment the works copy's static box (garage-view.ts, at rest
// pose, kept through the turn) sits over the pit's middle and stops the hop, so the marker is out of reach there.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport, raycastClosest, rayHit } = (await import(
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

const { input } = (await import(
  '/src/player/input-state.ts' as string
)) as typeof import('../../../src/player/input-state.ts');
const { carry } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { pressJump, releaseJump, localJumpCount } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');

const query = new URLSearchParams(location.search);
// `deckview=installer` swaps the roles, so page 1 (the look's still, sheet and video) is the installer's.
const second = (query.get('player') === '2') !== (query.get('deckview') === 'installer');
const deckcase = query.get('deckcase') ?? 'ride';
const PIT_RIM = 8.15; // m from the table's centre: the pit's wall (src/place/terrain.ts, tableR + 0.15)
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
  // The friend as this page draws them, against this page's drawn deck: from the garage opening (its camera pose
  // turns the deck here only) through the moment. Off the deck's side means the avatar's centre further across than
  // the deck's half width plus a body radius; the lag is the avatar's bearing behind the deck's axis.
  if (deckcase === 'ride')
    background(
      (async () => {
        const { remotes } = (await import(
          '/src/netplay/net.ts' as string
        )) as typeof import('../../../src/netplay/net.ts');
        const friend = () => [...remotes.values()].find((r) => r.entered)?.avatar;
        let frames = 0,
          off = 0,
          lag = 0,
          widest = 0;
        const t0 = performance.now();
        let seen = false;
        while (performance.now() - t0 < 16000) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const phase = garage.api?.snap().phase;
          if (phase === 'moment') seen = true;
          else if (seen) break;
          const a = friend(),
            d = works()?.garageView?.deckYaw ?? works()?.table?.yaw;
          if (!a || d === undefined || Math.hypot(a.position.x - centre.x, a.position.z - centre.z) < 2) continue;
          const dx = a.position.x - centre.x,
            dz = a.position.z - centre.z;
          const across = Math.abs(dx * Math.cos(d) - dz * Math.sin(d));
          frames++;
          if (across > 1.6 + 0.45) off++;
          widest = Math.max(widest, across);
          const behind = Math.abs(wrap(Math.atan2(dx, dz) - d));
          lag = Math.max(lag, Math.min(behind, Math.PI - behind));
        }
        const deg = Math.round((lag * 180) / Math.PI);
        say(
          `the friend as drawn here: off the deck's side in ${off} of ${frames} frames, furthest ${round(widest)} m across, at most ${deg}° off its axis`,
        );
        if (frames && (off > frames * 0.05 || deg > 15))
          throw new Error(
            `garage-deck installer: the friend is drawn off this page's deck (${off}/${frames} frames, ${deg}°)`,
          );
        say('PASS: the friend drawn on this page deck');
      })(),
      'deck installer view',
    );
} else {
  // The deck's free end: along the deck's axis from the table's centre, past the copy, on the side away from the post.
  const yaw = works()?.table?.yaw ?? 0;
  const r = Number(query.get('deckr') ?? 6.6);
  let best = 1;
  for (const end of [1, -1]) {
    const x = centre.x + Math.sin(yaw) * r * end,
      z = centre.z + Math.cos(yaw) * r * end;
    const post = polarAt(centre, geo.post);
    if (Math.hypot(x - post.x, z - post.z) > 6) best = end;
  }
  // pitend: in the pit 2.7 m off the deck's side, 7.3 m along it (where the pit floor rises to its wall); `pitalong=3`
  // puts them 3 m along instead, mid-deck on the level floor; `pitalong=0` under the deck's middle (one query:
  // `--query "deckcase=pitend&pitalong=0"`).
  const inPit = deckcase === 'pitend' || deckcase === 'pitjump';
  const pitAlong = Number(query.get('pitalong') ?? (deckcase === 'pitjump' ? 0 : 7.3));
  const hop = Number(query.get('hop') ?? 40);
  const across = inPit ? 2.7 : 0,
    along = inPit ? pitAlong * best : r * best;
  const x = centre.x + Math.cos(yaw) * across + Math.sin(yaw) * along,
    z = centre.z - Math.sin(yaw) * across + Math.cos(yaw) * along;
  teleport(me.body!, x, groundY + (inPit ? 0.2 : 1.2), z);
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
      let fellAt = -1,
        jumps = 0,
        stepped = false,
        widest = 0, // m: the furthest the friend got from the table's centre
        offAt = -1, // ms: walkoff, when the deck stopped carrying them
        offSpeed = 0, // m/s: the fastest they moved over the 0.5 s after
        lastMs = 0,
        under: { x: number; y: number; z: number } | null = null, // pitend: where they stood under the deck
        markerMs = 0, // pitjump: ms the 1 cm pose marker (hx 0.005) carried the friend
        markerUp = 0, // pitjump: how far over the pit floor (under) the marker held them, m
        peak = -Infinity, // pitjump: the friend's highest y
        frameMs = 0;
      const trace: string[] = [];
      while (garage.api!.snap().phase === 'moment' && performance.now() - t0 < 15000) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        // The show-off turn runs about 2.5 s to 5 s after the moment starts; act in its fast part.
        const since = performance.now() - t0;
        if (deckcase === 'jump' && jumps < 2 && since > 2600 + jumps * 900) {
          pressJump();
          setTimeout(releaseJump, 120);
          jumps++;
        }
        // walkoff: strafe (camera-relative, the friend faces out along the deck) off its side, letting go once they
        // are 0.3 m under its top (off it); then the speed they leave with (a throw, or a step).
        if (deckcase === 'walkoff' && !stepped && since > 2800) {
          stepped = true;
          input.keys.add('KeyD');
        }
        if (deckcase === 'walkoff' && stepped && offAt < 0 && pos().y < y0 - 0.3) {
          input.keys.delete('KeyD');
          offAt = since;
        }
        if (offAt >= 0 && since - offAt < 500 && since > lastMs)
          offSpeed = Math.max(offSpeed, (Math.hypot(pos().x - prev.x, pos().z - prev.z) * 1000) / (since - lastMs));
        lastMs = since;
        if (deckcase === 'pitjump' && under && jumps < 2 && since > 3500 + jumps * 900) {
          say(
            `hop ${jumps + 1} (accepted so far ${localJumpCount()}): coyote ${round(me.coyote)}, swimming ${me.swimming}, down ${me.down}, vy ${round(me.body!.velocity.y)}, y ${round(pos().y)}`,
          );
          pressJump();
          setTimeout(releaseJump, hop);
          jumps++;
        }
        if (deckcase === 'pitjump' && jumps > 0 && trace.length < 12)
          trace.push(`${round(pos().y)}/${round(me.body!.velocity.y)}`);
        if (deckcase === 'pitjump' && jumps === 1 && trace.length === 1) {
          const hit = rayHit(),
            from = { x: pos().x, y: pos().y + 0.5, z: pos().z };
          const ok = raycastClosest(from, { x: from.x, y: from.y + 3, z: from.z }, {}, hit);
          say(
            `ray up from the friend's head: ${ok ? `hit at +${round(hit.distance)} m, normal y ${round(hit.hitNormalWorld.y)}` : 'nothing'}`,
          );
          for (const [dx, h] of [
            [0, 25],
            [0, 18.2],
            [2.5, 25],
          ] as const) {
            const down = rayHit(),
              f = { x: pos().x + dx, y: h, z: pos().z };
            const got = raycastClosest(f, { x: f.x, y: f.y - 10, z: f.z }, {}, down);
            say(
              `ray down at +${dx} m from y ${h}: ${got ? `top at y ${round(down.hitPointWorld.y)}` : 'nothing'}; friend y ${round(pos().y)}, table yaw ${round(works()?.table?.yaw ?? NaN)}, deckYaw ${round(works()?.garageView?.deckYaw ?? NaN)}`,
            );
          }
        }
        if (deckcase === 'pitjump') {
          peak = Math.max(peak, pos().y);
          if (carry.on && carry.on.hx < 0.01) {
            markerMs += since - frameMs;
            if (under) markerUp = Math.max(markerUp, round(pos().y - under.y));
          }
        }
        frameMs = since;
        if (inPit && !stepped && since > 3200) {
          // Under the deck's rest footprint (the turn is a full one), keeping the friend's own height.
          stepped = true;
          const dx = pos().x - centre.x,
            dz = pos().z - centre.z;
          const l = dx * Math.sin(yaw) + dz * Math.cos(yaw);
          teleport(me.body!, centre.x + Math.sin(yaw) * l, pos().y, centre.z + Math.cos(yaw) * l);
          me.body!.velocity.set(0, 0, 0);
          under = { x: pos().x, y: pos().y, z: pos().z };
        }
        widest = Math.max(widest, Math.hypot(pos().x - centre.x, pos().z - centre.z));
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
            `${ms}:${round(pos().y)}/r${round(Math.hypot(pos().x - centre.x, pos().z - centre.z))}/${Math.round((turned * 180) / Math.PI)}°/deck ${Math.round((deckTurned * 180) / Math.PI)}°`,
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
      const rNow = Math.hypot(pos().x - centre.x, pos().z - centre.z);
      if (under)
        say(
          `pitend: moved ${round(Math.hypot(pos().x - under.x, pos().z - under.z))} m from under the deck, ${round(pos().y - under.y)} m up`,
        );
      if (deckcase === 'pitjump')
        say(
          `pitjump: ${jumps} hops of ${hop} ms, ${localJumpCount()} accepted; peak ${under ? round(peak - under.y) : '?'} m over the pit floor; the marker held them ${Math.round(markerMs)} ms, up to ${markerUp} m over the floor; carry now ${carry.on ? `hx ${carry.on.hx}` : 'none'}`,
        );
      if (deckcase === 'pitjump') say(`frames after the first hop (y/vy): ${trace.join(' ')}`);
      if (deckcase === 'walkoff') say(`off the deck at ${Math.round(offAt)} ms; then at most ${round(offSpeed)} m/s`);
      say(`furthest from the table's centre ${round(widest)} m; now ${round(rNow)} m (the pit's wall at ${PIT_RIM})`);
      if (deckcase !== 'ride') {
        const caseFails =
          deckcase === 'jump' || deckcase === 'walkoff'
            ? [
                widest > PIT_RIM &&
                  `leaving the turning deck (${deckcase}) threw the friend ${round(widest)} m out, past the pit`,
                rNow > PIT_RIM && `ended ${round(rNow)} m out, outside the pit`,
                deckcase === 'walkoff' && offAt < 0 && 'never stepped off the deck',
              ]
            : [
                !under && 'never stood under the deck',
                // Review (recheck 2): the marker is mask 0 but still a registered platform (platforms.ts stands()).
                deckcase === 'pitjump' &&
                  markerMs > 100 &&
                  `the deck's pose marker held the friend ${markerUp} m up, inside the turning deck, for ${Math.round(markerMs)} ms`,
                // Review (recheck): `pitalong=0` stands them under the deck's middle, where the marker car sits; it
                // must not shove them while the deck turns (main leaves them at r 0; this branch threw them 11 m).
                widest > PIT_RIM && `thrown ${round(widest)} m from the centre while the deck turned, past the pit`,
                deckcase === 'pitend' &&
                  under &&
                  pos().y - under.y > 0.1 &&
                  `lifted ${round(pos().y - under.y)} m when the deck stopped`,
                rNow > PIT_RIM && `moved ${round(rNow)} m out, past the pit's wall onto the kerb`,
              ];
        const failed = caseFails.filter(Boolean);
        if (failed.length) throw new Error(`garage-deck ${deckcase}: ${failed.join('; ')}`);
        say(`PASS: ${deckcase}`);
        return;
      }
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
