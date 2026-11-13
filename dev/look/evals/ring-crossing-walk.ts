// Ring Island's crossing on the live build (docs/plans/short-turn.md, section D, "What the walk must measure"): by
// held input (W toward a point, the plain Jump tapped; no glider, no hook), timed in server ticks (railAt()), from a seed
// with the stack line open past the island. Run with --real: warped, the page outruns the server's ticks. Staging
// teleports only; every measured move is the controller's. Prints `CROSS ...` lines, sets `window.__crossDone`.
// `cross=` picks the part:
//   walk      three tries each way (`crossfrom=east|west` for one, `crosstries=<n>`): aboard a train braking into one platform (seated on
//             the east, homeward one; standing on the west one, where Interact keeps offering the next request stop),
//             from its stand to standing on the far platform by the foot crossing at the platforms' south end
//             (docs/plans/ring-island-crossing.md: down the ramp, over the planks, up the far ramp; no jump), then
//             beside where a car stops and aboard the far train if it still stands, else the next one's boarding
//             alone (its lever pulled).
//   kerb      ten plain jumps from the bed up to each platform, from three spots
//   bed       standing between the rails as a train comes: a stopping up train, a passing up and a passing down one
//   round     ground heights round the halt, a drop off the yard's back edge, and the planner between the platforms
//             with the formation (u 395..492) avoided: any other way round
//   above | platform   a still from above the crossing or from the west platform beside where a car stops, looking
//             south at it, once both tracks' trains are in the halt (one standing); up to 9000 ticks of waiting
//             (`crosswait=<ticks>` for less), then whichever train stands next
//   door      a still at eye height from the east platform beside the standing down train's passenger car, looking
//             south along the train at the crossing (the first sight on stepping off)
//   npm run look -- --rail-seed stack-laid-4 --real --query cross=walk --eval dev/look/evals/ring-crossing-walk.ts \
//     --until window.__crossDone --wall 3500 --name cross-walk
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { pressJump, releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { seatState } = (await import(
  '/src/entities/railway/seat.ts' as string
)) as typeof import('../../../src/entities/railway/seat.ts');
const { inspectRailway, railReady, rw, railAt, trains } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const layout = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const { RAIL_LINES, LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { LINE_SLOTS } = (await import(
  '/src/sim/railway-trains.ts' as string
)) as typeof import('../../../src/sim/railway-trains.ts');
const { trainAlong } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { RING_CROSSING } = (await import(
  '/src/entities/ring-island/state.ts' as string
)) as typeof import('../../../src/entities/ring-island/state.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');

const page = window as unknown as { __crossDone?: boolean; __crossResult?: unknown };
const mode = new URLSearchParams(location.search).get('cross') ?? 'walk';
const say = (t: string) => console.log(`CROSS ${t}`);
const f2 = (n: number) => +n.toFixed(2);
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const frames = async (n: number) => {
  for (let k = 0; k < n; k++) await frame();
};
/** Waits `n` server ticks. */
const ticks = async (n: number) => {
  const end = railAt() + n;
  while (railAt() < end) await frame();
};
// (u, lat) metres of the ring's frame <-> world metres (ringAt's inverse).
const UNIT = Math.sqrt(1 + 0.0272 * 0.0272);
const ul = (x: number, z: number) => {
  const dx = x * 100 - layout.RING_ORIGIN.x,
    dz = z * 100 - layout.RING_ORIGIN.z;
  return { u: (0.0272 * dx - dz) / UNIT / 100, lat: (dx + 0.0272 * dz) / UNIT / 100 };
};
const at = (u: number, lat: number) => {
  const p = layout.ringAt(Math.round(u * 100), Math.round(lat * 100));
  return { x: p.x / 100, z: p.z / 100 };
};
const H = layout.RING_HALT;
const BED_Y = H.y / 100,
  PLAT_Y = H.up.y / 100;
const WEST = { lat0: H.upLat[0] / 100, lat1: H.upLat[1] / 100, mid: (H.upLat[0] + H.upLat[1]) / 200 };
const EAST = { lat0: H.downLat[0] / 100, lat1: H.downLat[1] / 100, mid: (H.downLat[0] + H.downLat[1]) / 200 };
const RING_STOP = RAIL_LINES[LINE2]!.halts.findIndex((h) => h.name === 'Ring Island');
const RING_S = layout.RING_END.s;
const TRAIN_LEN = 17.2;

background(
  (async () => {
    if (!(await railReady())) throw new Error('ring-crossing: the railway never became ready');
    while (!me.body || !me.entered) await frame();
    const b = me.body;
    const bot = makeBot({ recover: () => say('NEVER recovery asked') });
    const where = () => {
      const p = ul(b.position.x, b.position.z);
      return { u: f2(p.u), lat: f2(p.lat), y: f2(b.position.y - PLAYER_R) };
    };
    const onPlatform = (side: typeof WEST) => {
      const p = where();
      return me.coyote > 0 && p.y > PLAT_Y - 0.15 && p.lat >= side.lat0 - 0.1 && p.lat <= side.lat1 + 0.1;
    };
    const faceTo = (x: number, z: number) => {
      cam.yaw = me.yaw = Math.atan2(-(x - b.position.x), -(z - b.position.z));
    };
    const stage = async (u: number, lat: number, y: number) => {
      const p = at(u, lat);
      teleport(b, p.x, y + PLAYER_R + 0.3, p.z);
      b.velocity.set(0, 0, 0);
      input.keys.clear();
      releaseJump();
      await ticks(8);
    };
    let jumps = 0;
    const tapJump = async () => {
      jumps++;
      pressJump();
      await frames(6);
      releaseJump();
    };
    /** Holds W toward (u, lat) until within `tol` m (or `ms` server ticks); `jump(p)` says when to tap Jump. */
    async function go(u: number, lat: number, tol = 0.5, limit = 300, jump?: (p: ReturnType<typeof where>) => boolean) {
      const goal = at(u, lat);
      const end = railAt() + limit;
      input.keys.add('KeyW');
      try {
        while (railAt() < end) {
          if (Math.hypot(goal.x - b.position.x, goal.z - b.position.z) < tol) return true;
          faceTo(goal.x, goal.z);
          if (jump && me.coyote > 0 && jump(where())) await tapJump();
          await frame();
        }
        return false;
      } finally {
        input.keys.delete('KeyW');
      }
    }
    // ------------------------------------------------------------ the trains
    const slots = LINE_SLOTS[LINE2]!;
    type ViewTrain = {
      line: number;
      phase: number;
      at: number;
      track: number;
      cars: { x: number; y: number; z: number; riding: boolean }[];
    };
    const viewTrains = () =>
      ((inspectRailway()!.line2View as unknown as { trains: ViewTrain[] }).trains ?? []).filter(
        (t) => t.line === LINE2,
      );
    /** The train standing at Ring Island on `track` (0 up: the west platform; 1 down: the east), its view and extent. */
    const standing = (track: number) => {
      const t = viewTrains().find((t) => t.phase === 0 && t.at === RING_STOP && t.track === track);
      if (!t) return null;
      const us = t.cars.map((c) => ul(c.x, c.z).u);
      const lo = Math.min(...us),
        hi = Math.max(...us),
        pad = Math.max(0, (TRAIN_LEN - (hi - lo)) / 2);
      // The passenger car: the middle car of three, else the second.
      const car = t.cars[Math.min(1, t.cars.length - 1)]!;
      return { t, u0: lo - pad, u1: hi + pad, car, carU: ul(car.x, car.z).u, riding: t.cars.some((c) => c.riding) };
    };
    const aboard = () => viewTrains().some((t) => t.cars.some((c) => c.riding));
    /** Server ticks until each line 2 train running toward Ring Island gets there (rough: at cruise). */
    const etas = (track: number) =>
      slots
        .map((k) => trains(rw())[k]!)
        .filter((r) => r.phase === 1 && r.track === track)
        .map((r) => (RING_S - trainAlong(r, LINE2, railAt())) * (track ? -1 : 1))
        .filter((d) => d > 0)
        .map((d) => d / 200);
    const levers = () =>
      (
        inspectRailway()!.line2View as unknown as {
          ringLevers: { halt: number; dir: number; on: boolean; x: number; z: number }[];
        }
      ).ringLevers.filter((l) => l.halt === RING_STOP);
    async function pull(dir: number) {
      const l = levers().find((l) => l.dir === dir)!;
      const k = ul(l.x, l.z);
      await stage(k.u - 1.5, dir > 0 ? WEST.mid : EAST.mid, PLAT_Y);
      const ok = await bot.use(l.x, l.z, 'the Ring Island lever', /^Request stop/);
      say(`lever ${dir > 0 ? 'west (up)' : 'east (down)'} pulled ${ok} at ${railAt()}`);
      return ok;
    }
    /** Live line 2 trains are spaced so an up and a down train seldom stand here together (dwell 50 ticks): pulls
     * `track`'s lever for its next train due in 40..300 ticks, and the other side's lever too (that train stands
     * whenever it comes), then waits for `track`'s train to stand. */
    async function startStands(track: number, limit = 30000) {
      const end = railAt() + limit;
      while (railAt() < end) {
        const due = etas(track).find((e) => e > 40 && e < 300);
        if (due !== undefined) {
          say(
            `due ${track ? 'east (down)' : 'west (up)'} in ${due.toFixed(0)} ticks at ${railAt()}; ` +
              `other side due ${etas(1 - track).map((n) => n.toFixed(0))}`,
          );
          await pull(track ? -1 : 1);
          await pull(track ? 1 : -1);
          // Back once it is braking into the halt, 30 m out: the rider boards it then and sits as it comes in.
          const by = railAt() + 450;
          while (!approaching(track) && !standing(track) && railAt() < by) await ticks(1);
          if (approaching(track) || standing(track)) return true;
        }
        await ticks(2);
      }
      return false;
    }
    const approaching = (track: number) =>
      viewTrains().find(
        (t) =>
          t.phase === 1 &&
          t.track === track &&
          (t as unknown as { to: number }).to === RING_STOP &&
          Math.abs((t as unknown as { along: number }).along - RING_S) < 3000,
      );
    const trainState = () => ({ westTrain: !!standing(0), eastTrain: !!standing(1) });

    // ------------------------------------------------------------ cross=walk
    /** One crossing, starting aboard the train standing on `from`'s side (seated, for the east one). */
    async function crossing(fromTrack: number, seat: boolean) {
      const from = fromTrack === 1 ? EAST : WEST,
        to = fromTrack === 1 ? WEST : EAST,
        toTrack = 1 - fromTrack;
      const coming = approaching(fromTrack) ?? standing(fromTrack)?.t;
      if (!coming) return { ok: false, why: 'no train coming in or standing to start from' };
      const log: Record<string, unknown> = { boardAt: railAt() };
      // Staging: onto the passenger car's deck as it brakes in (or stands).
      const car0 = coming.cars[Math.min(1, coming.cars.length - 1)]!;
      teleport(b, car0.x, car0.y + 1.6, car0.z);
      b.velocity.set(0, 0, 0);
      await bot.until(() => aboard(), 4000);
      log.aboardAt = railAt();
      if (seat) {
        await bot.until(() => interactTarget()?.id === 'place-sit', 4000);
        // Interact offers the aboard request first while the train stands; Sit comes after (withSeatTargets).
        await bot.work(() => seatState().sitting, 5000, 300);
        // Interact can keep offering the aboard request (one stop ahead after another): then ride in standing.
        if (!seatState().sitting)
          log.couldNotSit = { target: interactTarget()?.id ?? null, verb: interactTarget()?.verb };
      }
      const sat = !!seatState().sitting;
      log.seatedAt = railAt();
      // The clock starts with the train standing at the platform and you in your seat.
      const byStand = railAt() + 300;
      while (!standing(fromTrack) && railAt() < byStand) await ticks(1);
      const st = standing(fromTrack);
      if (!st) return { ok: false, why: 'the train never stood', log };
      log.stoodAt = railAt();
      const t0 = railAt();
      log.start = { tick: t0, seated: !!seatState().sitting, ...trainState(), at: where() };
      if (sat) {
        await bot.until(() => interactTarget()?.id === 'place-stand', 4000);
        bot.press();
        await bot.until(() => !seatState().sitting, 4000);
        log.stood = railAt() - t0;
      }
      // Off the car onto our platform, beside it.
      const offLat = fromTrack === 1 ? from.lat0 + 1.0 : from.lat1 - 1.0;
      let ok = await go(st.carU, offLat, 0.5, 200, (p) => p.y < PLAT_Y - 0.2 && Math.abs(p.lat - offLat) < 1.6);
      log.off = { ticks: railAt() - t0, ok, ...trainState(), at: where() };
      if (!ok) return { ok, why: 'never got off the car', log, ticks: railAt() - t0 };
      // South along our platform, down its ramp to the landing, over the planks, up the far ramp: no jump asked.
      const X = RING_CROSSING,
        planksU = (X.u0 + X.u1) / 2,
        onLat = to.mid;
      const jumpsBefore = jumps;
      ok = await go(X.rampTop + 0.5, from.mid, 0.5, 300);
      log.rampTop = { ticks: railAt() - t0, ok, at: where() };
      ok = ok && (await go(planksU, from.mid, 0.4, 200));
      log.landing = { ticks: railAt() - t0, ok, at: where() };
      ok = ok && (await go(planksU, to.mid, 0.4, 300));
      log.across = { ticks: railAt() - t0, ok, at: where() };
      ok = ok && (await go(X.rampTop + 0.6, to.mid, 0.4, 200));
      log.up = { ticks: railAt() - t0, ok, jumps: jumps - jumpsBefore, onPlatform: onPlatform(to), at: where() };
      if (!ok || !onPlatform(to)) return { ok: false, why: 'never up on the far platform', log, ticks: railAt() - t0 };
      const tPlatform = railAt() - t0;
      // Along the far platform to where its train's car stands, and aboard by a jump if it still stands.
      const there = standing(toTrack);
      const carU = there?.carU ?? H.u0 / 200 + H.u1 / 200;
      ok = await go(carU, onLat, 0.6, 300);
      log.alongside = { ticks: railAt() - t0, ok, ...trainState(), at: where() };
      let tAboard: number | null = null;
      const now = standing(toTrack);
      if (now) {
        const endAt = railAt() + 200;
        input.keys.add('KeyW');
        while (!aboard() && railAt() < endAt && standing(toTrack)) {
          const c = standing(toTrack)!.car;
          faceTo(c.x, c.z);
          if (me.coyote > 0) await tapJump();
          await frames(4);
        }
        input.keys.delete('KeyW');
        if (aboard()) tAboard = railAt() - t0;
        log.aboard = { ticks: tAboard, ...trainState(), at: where() };
      }
      // Its train had gone (or never came): the boarding alone, from standing beside where its car stops, on the
      // next one (this platform's lever, walked to and pulled; back beside the car's spot).
      let boardTicks: number | null = null;
      if (tAboard === null) {
        const l = levers().find((l) => l.dir === (toTrack ? -1 : 1))!;
        await bot.use(l.x, l.z, 'the far lever', /^Request stop/);
        await go(carU, onLat, 0.6, 300);
        await bot.until(() => standing(toTrack), 1200000);
        const s0 = railAt();
        const endAt = railAt() + 200;
        input.keys.add('KeyW');
        while (!aboard() && railAt() < endAt && standing(toTrack)) {
          const c = standing(toTrack)!.car;
          faceTo(c.x, c.z);
          if (me.coyote > 0) await tapJump();
          await frames(4);
        }
        input.keys.delete('KeyW');
        if (aboard()) boardTicks = railAt() - s0;
        log.nextTrain = { stoodAt: s0, boardTicks, at: where() };
        // Off again before it leaves, so the next try starts here, not up the line.
        await go(carU, to.mid, 0.4, 60);
      }
      return {
        ok: true,
        crossingJumps: (log.up as { jumps: number }).jumps,
        platformTicks: tPlatform,
        aboardTicks: tAboard,
        boardTicks,
        farTrainStoodAtArrival: !!now,
        log,
      };
    }
    async function walkPart() {
      const res: Record<string, unknown>[] = [];
      for (const [fromTrack, seat] of [
        [1, true],
        [0, false],
      ] as const) {
        const only = new URLSearchParams(location.search).get('crossfrom');
        if (only && only !== (fromTrack === 1 ? 'east' : 'west')) continue;
        const tries = Number(new URLSearchParams(location.search).get('crosstries') ?? 3);
        for (let k = 0; k < tries; k++) {
          if (!(await startStands(fromTrack))) {
            say(`walk ${fromTrack} try ${k}: no train stood`);
            continue;
          }
          const r = await crossing(fromTrack, seat);
          say(`walk ${fromTrack === 1 ? 'east->west' : 'west->east'} try ${k} ${JSON.stringify(r)}`);
          res.push({ from: fromTrack === 1 ? 'east' : 'west', ...r });
        }
      }
      return res;
    }

    // ------------------------------------------------------------ cross=kerb
    async function kerbPart() {
      const res: Record<string, unknown>[] = [];
      const spots = [
        { name: 'close (0.6 m off the face)', off: 0.6 + PLAYER_R },
        { name: 'from between the rails (1.6 m off)', off: 1.6 },
        { name: 'from the far track (3.5 m off, walking in)', off: 3.5 },
      ];
      for (const side of ['west', 'east'] as const) {
        const face = side === 'west' ? WEST.lat1 : EAST.lat0,
          sign = side === 'west' ? -1 : 1, // toward the platform
          plat = side === 'west' ? WEST : EAST;
        for (let k = 0; k < 10; k++) {
          const spot = spots[k % 3]!;
          const u = 432 + k * 3.2;
          // Clear of trains: none within 120 m of the halt, either way.
          await bot.until(
            () =>
              !slots.some((s) => {
                const r = trains(rw())[s]!;
                return Math.abs(trainAlong(r, LINE2, railAt()) - RING_S) < 12000;
              }),
            600000,
          );
          await stage(u, face - sign * spot.off, BED_Y);
          await ticks(5);
          const start = where(),
            t0 = railAt(),
            j0 = jumps;
          const ok = await go(u, plat.mid, 0.5, 120, (p) => p.y < PLAT_Y - 0.3 && Math.abs(p.lat - face) < 0.95);
          const r = {
            side,
            spot: spot.name,
            u: f2(u),
            ok: ok && onPlatform(plat),
            ticks: railAt() - t0,
            jumps: jumps - j0,
            start,
            end: where(),
          };
          say(`kerb ${JSON.stringify(r)}`);
          res.push(r);
        }
      }
      return res;
    }

    // ------------------------------------------------------------ cross=bed
    async function bedPart() {
      const res: Record<string, unknown>[] = [];
      const cases = [
        { name: 'stopping up train, standing on the up track', track: 0, lat: -4, stop: true },
        { name: 'passing up train, standing on the up track', track: 0, lat: -4, stop: false },
        { name: 'passing down train, standing on the down track', track: 1, lat: 0, stop: false },
      ];
      for (const c of cases) {
        // Wait for a train of that track due in 30 to 80 ticks, pull the lever if it is to stop, stand in its way.
        await bot.until(() => etas(c.track).some((e) => e > 40 && e < 90), 1800000);
        if (c.stop) await pull(c.track ? -1 : 1);
        const u = 449;
        await stage(u, c.lat, BED_Y);
        const t0 = railAt();
        const trail: string[] = [];
        let minY = 99,
          maxY = -99,
          maxMove = 0;
        const start = where();
        // Watch until the train has stood or gone by, plus a little.
        const end = railAt() + 300;
        while (railAt() < end) {
          const p = where();
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
          maxMove = Math.max(maxMove, Math.hypot(p.u - start.u, p.lat - start.lat));
          if ((railAt() - t0) % 5 === 0)
            trail.push(
              `${railAt() - t0}:${p.u.toFixed(1)},${p.lat.toFixed(1)},${p.y.toFixed(1)}${aboard() ? 'R' : ''}`,
            );
          await ticks(1);
          if (c.stop ? standing(c.track) && railAt() - t0 > 60 : railAt() - t0 > 160) break;
        }
        const mid = where();
        const st = standing(c.track);
        const inside = st ? mid.u > st.u0 && mid.u < st.u1 && Math.abs(mid.lat - c.lat) < 1.4 : false;
        // Then try to get out: up the nearer platform's kerb by the plain jump.
        const plat = c.track === 0 ? WEST : EAST,
          face = c.track === 0 ? WEST.lat1 : EAST.lat0;
        const t1 = railAt();
        const out = await go(mid.u, plat.mid, 0.6, 300, (p) => p.y < PLAT_Y - 0.3 && Math.abs(p.lat - face) < 0.95);
        const r = {
          case: c.name,
          start,
          after: mid,
          aboard: aboard(),
          minY: f2(minY),
          maxY: f2(maxY),
          moved: f2(maxMove),
          trainStanding: !!st,
          insideTrainFootprint: inside,
          gotOut: out && onPlatform(plat),
          outTicks: railAt() - t1,
          outAt: where(),
          trail: trail.join(' '),
        };
        say(`bed ${JSON.stringify(r)}`);
        res.push(r);
        await ticks(60);
      }
      return res;
    }

    // ------------------------------------------------------------ cross=round
    async function roundPart() {
      const res: Record<string, unknown>[] = [];
      const avoid: { x: number; z: number; r: number }[] = [];
      for (let u = 395; u <= 492; u += 1.5) avoid.push({ ...at(u, -2), r: 4.1 });
      const rbot = makeBot({ avoid: () => avoid, recover: () => say('NEVER recovery asked (round)') });
      // The ground round the halt, top surface heights (first hit down from 40 m): east of the yard, the run-off end
      // past the buffers, west of the up platform, and the yard's edge itself.
      const { raycastClosest, rayHit } = (await import(
        '/src/physics/engine.ts' as string
      )) as typeof import('../../../src/physics/engine.ts');
      const hit = rayHit();
      const top = (u: number, lat: number) => {
        const q = at(u, lat);
        return raycastClosest({ x: q.x, y: 40, z: q.z }, { x: q.x, y: -20, z: q.z }, {}, hit)
          ? f2(hit.hitPointWorld.y)
          : null;
      };
      await stage(448, EAST.mid, PLAT_Y);
      await ticks(10);
      const probe: Record<string, unknown> = {};
      for (const lat of [5, 10, 15.5, 16.5, 18, 22])
        probe[`east u440/450/460 lat ${lat}`] = [440, 450, 460].map((u) => top(u, lat));
      for (const u of [420, 426, 470, 476, 484, 486, 490, 496])
        probe[`u ${u} lat -14..14`] = [-14, -11, -8, -5, -2, 1, 4, 7, 10, 14].map((lat) => top(u, lat));
      for (const lat of [-10, -12, -15, -19, -22])
        probe[`west u440/450/460 lat ${lat}`] = [440, 450, 460].map((u) => top(u, lat));
      say(`round ground ${JSON.stringify(probe)}`);
      res.push({ probe });
      // East to west by a drop off the yard's back edge (the yard holds the east platform's only other side), then the
      // planner on the ground, the formation still avoided.
      {
        await stage(448, EAST.mid, PLAT_Y);
        const t0 = railAt();
        await go(447, 10, 0.6, 100);
        const before = where().y;
        await go(447, 22, 0.6, 100);
        const dropped = { from: before, to: where().y, at: where(), ticks: railAt() - t0 };
        const goal = at(462, WEST.mid);
        const ok = await rbot.walk(goal.x, goal.z, 0.8, { limit: 240000 });
        const r = {
          case: 'east platform -> yard back edge drop -> planner to the west platform',
          dropped,
          ok,
          onWest: onPlatform(WEST),
          ticks: railAt() - t0,
          at: where(),
          lastNotes: rbot.lines.slice(-4),
        };
        say(`round drop ${JSON.stringify(r)}`);
        res.push(r);
      }
      for (const [fromSide, toSide] of [
        [EAST, WEST],
        [WEST, EAST],
      ] as const) {
        await stage(448, fromSide.mid, PLAT_Y);
        const goal = at(448, toSide.mid);
        const t0 = railAt();
        let top = -99,
          bottom = 99,
          bed = 0,
          metres = 0,
          last = { x: b.position.x, z: b.position.z };
        const trail: string[] = [];
        let going = true;
        void (async () => {
          while (going) {
            const p = where();
            top = Math.max(top, p.y);
            bottom = Math.min(bottom, p.y);
            if (p.lat > WEST.lat1 + 0.3 && p.lat < EAST.lat0 - 0.3 && p.u > 395 && p.u < 492 && p.y < PLAT_Y - 0.4)
              bed++;
            metres += Math.hypot(b.position.x - last.x, b.position.z - last.z);
            last = { x: b.position.x, z: b.position.z };
            if (Math.floor(metres / 5) > trail.length)
              trail.push(`${p.u.toFixed(0)},${p.lat.toFixed(0)},${p.y.toFixed(1)}`);
            await frames(3);
          }
        })();
        const ok = await rbot.walk(goal.x, goal.z, 0.8, { limit: 240000 });
        going = false;
        const r = {
          from: fromSide === EAST ? 'east' : 'west',
          ok,
          onPlatform: onPlatform(toSide),
          ticks: railAt() - t0,
          metres: f2(metres),
          lowest: f2(bottom),
          highest: f2(top),
          bedSamples: bed,
          at: where(),
          trail: trail.join(' '),
          lastNotes: rbot.lines.slice(-6),
        };
        say(`round ${JSON.stringify(r)}`);
        res.push(r);
      }
      return res;
    }

    // ------------------------------------------------------------ stills
    async function still(view: 'above' | 'platform' | 'door') {
      // Stand out of the frame, on the works yard behind the east platform, then wait for both tracks' trains in the
      // halt at once (both standing, or one standing and the other running through), pulling both levers as trains
      // come; at most 9000 ticks, then whatever stands. `door` waits for the down train alone.
      const inHalt = (track: number) =>
        viewTrains().find(
          (t) =>
            t.track === track &&
            t.cars.some((c) => {
              const q = ul(c.x, c.z);
              return q.u > H.u0 / 100 && q.u < H.u1 / 100 && q.lat > WEST.lat1 - 0.5 && q.lat < EAST.lat0 + 0.5;
            }),
        );
      let got = false;
      const giveUp = railAt() + Number(new URLSearchParams(location.search).get('crosswait') ?? 9000);
      for (;;) {
        if (view === 'door' ? standing(1) : (standing(0) && inHalt(1)) || (standing(1) && inHalt(0))) {
          got = true;
          break;
        }
        // Past the wait: whichever train stands next (the levers still pulled as trains come).
        if (view !== 'door' && railAt() > giveUp && (standing(0) || standing(1))) break;
        if (etas(0).some((e) => e > 40 && e < 60) || etas(1).some((e) => e > 40 && e < 60)) {
          await pull(1);
          await pull(-1);
        }
        if (
          Math.hypot(
            ...(() => {
              const q = where();
              return [q.u - 452, q.lat - 12];
            })(),
          ) > 1
        )
          await stage(452, 12, PLAT_Y);
        await ticks(1);
      }
      const a = standing(0),
        d = standing(1);
      const cars = viewTrains()
        .filter((t) => inHalt(t.track))
        .map((t) => ({ track: t.track, phase: t.phase, cars: t.cars.map((c) => f2(ul(c.x, c.z).u)) }));
      const planks = { ...at((RING_CROSSING.u0 + RING_CROSSING.u1) / 2, -2), y: RING_CROSSING.top };
      const c =
        view === 'above'
          ? { cam: { ...at(422, -2), y: 30 }, look: { ...at(438, -2), y: BED_Y } }
          : view === 'platform'
            ? { cam: { ...at(446, WEST.lat1 - 1), y: PLAT_Y + 1.6 }, look: planks }
            : { cam: { ...at(d?.carU ?? 448, EAST.mid), y: PLAT_Y + 1.6 }, look: planks };
      window.__debugCam!.set([c.cam.x, c.cam.y, c.cam.z], [c.look.x, c.look.y, c.look.z]);
      window.__debugCam!.set = () => {};
      // The bots' notes panel (dev/look/bot.ts) out of the still.
      for (const d of document.querySelectorAll<HTMLDivElement>('body > div'))
        if (d.style.position === 'fixed' && d.style.top === '90px') d.style.display = 'none';
      await ticks(10);
      const r = {
        view,
        bothInHalt: got,
        cars,
        west: a && [f2(a.u0), f2(a.u1)],
        east: d && [f2(d.u0), f2(d.u1)],
        ...trainState(),
      };
      say(`still ${JSON.stringify(r)}`);
      return r;
    }

    say(
      `start ${mode} tick ${railAt()} ringStop ${RING_STOP} west ${JSON.stringify(WEST)} east ${JSON.stringify(EAST)}`,
    );
    const result =
      mode === 'walk'
        ? await walkPart()
        : mode === 'kerb'
          ? await kerbPart()
          : mode === 'bed'
            ? await bedPart()
            : mode === 'round'
              ? await roundPart()
              : await still(mode === 'above' || mode === 'door' ? mode : 'platform');
    page.__crossResult = result;
    say(`result ${JSON.stringify(result)}`);
    say(`end tick ${railAt()}`);
    page.__crossDone = true;
  })(),
  'ring crossing walk',
);
export {};
