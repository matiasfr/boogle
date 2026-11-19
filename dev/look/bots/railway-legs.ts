// The greybox route's built legs through ordinary inputs (docs/plans/greybox-route.md and greybox-leg2.md, step 5),
// driven by RAIL_LEGS. Leg 1, the stack line: ride line 2 to the leg's first frame, then for each section take the kit
// off the rack, feed the frame, wait out the lay, ride on to the new railhead and step off onto its platform, until High
// Gorge is reached on foot. Leg 2: take the powered pick at the stair's head, open the incline's barrier, build the
// incline the same way riding `ns` trains to each head and on to Bell Rock's lower deck, take the crystal seeds, ride
// home the long way (`ns` to High Gorge, line 2 to the Village), walk to the West landing and build the bay cut, riding
// `bay` trains to Bell Rock's upper platform. Prompts are pressed by id (`railway-leg-take-logs`, `-take-rails`, `-feed`,
// `-pick`, `-gate`, `-seeds`). Each phase reads the rows first, so it resumes from `ring-joined`, `gorge-open`,
// `gorge-mid` and `gorge-reached` (a seed starts at the Village). Inspection observes; it never seeds a world or moves a
// player. A fall into the sea is a finding (no recovery).
import type { Bot } from '../bot.ts';
import { legDone, legRow, routeRow } from '../../../src/sim/railway-queries-route.ts';
import { account, aperture, rail, railAt, railPid, railRead, rw, trains } from '../rail-read.ts';
import { me } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import { RING_HALT, ringAt } from '../../../src/sim/railway-ring-layout.ts';
import { RING_CROSSING } from '../../../src/entities/ring-island/state.ts';
import { RAIL_HALTS, RAIL_TRAINS } from '../../../src/sim/railway-lines.ts';
import { ROW_PLATFORM, rowWorld } from '../../../src/entities/railway/row-path.ts';
import {
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  legFrame,
  legRack,
  rowHalt,
  type RouteLeg,
} from '../../../src/sim/railway-route.ts';
import { HALT, line2Rides } from './railway-ride.ts';

export type LegRoute = { bot: Bot; checkpoint: (name: string) => Promise<void> };
const cm = (p: { x: number; z: number }) => ({ x: p.x / 100, z: p.z / 100 });
/** Ring Island is line 2's stop 5 (halts-view.ts); a leg's heads follow from its `railheadHalt`. */
const ISLAND = 5;
const legOf = (id: string) => RAIL_LEGS.findIndex((l) => l.id === id);
const STACK = legOf('stack'),
  INCLINE = legOf('incline'),
  BAY = legOf('bay-cut');
const PICK = RAIL_GRANTS.findIndex((g) => g.id === 'pick'),
  SEEDS = RAIL_GRANTS.findIndex((g) => g.id === 'seeds');
/** A leg's first halt on its sim line (the stop before its first head). */
const fromStop = (L: RouteLeg) => L.railheadHalt - 1;
/** High Gorge on line 2: the stack line's last halt. */
const GORGE_STOP = RAIL_LEGS[STACK]!.railheadHalt + RAIL_LEGS[STACK]!.sections.length - 1;
/** Where a row line's request lever stands for a way out of `stop` (route-greybox's halts-view.ts rowSpot): at a head
 * on its outward platform at the stop, else 10 m short of the stop at the line's start and 8.5 m short at its end. */
function rowLever(line: number, stop: number) {
  const h = RAIL_HALTS.find((x) => x.line === line && x.stop === stop)!;
  const at = h.s / 100;
  const s = h.end?.kind === 'stub' ? at : stop === 0 ? at - 10 : at - 8.5;
  return rowWorld(line, s, ROW_PLATFORM, { x: 0, z: 0 });
}

export async function legRoute({ bot, checkpoint }: LegRoute) {
  const L = RAIL_LEGS[STACK]!;
  const n = L.sections.length;
  const { ride, rideFrom, hopTo, view, until, check, face } = line2Rides(bot);
  const row = () => legRow(rw(), STACK);
  const laid = () => row().laid;
  const island = cm(RING_HALT.down);
  const islandWest = cm(RING_HALT.up);
  const nearerEast = () => bot.dist(island.x, island.z) < bot.dist(islandWest.x, islandWest.z);
  const crossIsland = async (toWest: boolean) => {
    const east = (RING_HALT.downLat[0] + RING_HALT.downLat[1]) / 200,
      west = (RING_HALT.offsetLat[0] + RING_HALT.offsetLat[1]) / 200,
      from = toWest ? east : west,
      to = toWest ? west : east,
      planks = (RING_CROSSING.u0 + RING_CROSSING.u1) / 2;
    for (const [u, lat] of [
      [RING_CROSSING.rampTop + 0.5, from],
      [planks, from],
      [planks, to],
      [RING_CROSSING.rampTop + 0.5, to],
    ] as const) {
      const p = cm(ringAt(u * 100, lat * 100));
      check(
        await bot.walk(p.x, p.z, 0.5),
        `Ring Island foot crossing toward the ${toWest ? 'west frame' : 'outward platform'}`,
      );
    }
  };
  const near = (p: { x: number; z: number }, r: number) =>
    !!me.body && Math.hypot(me.body.position.x - p.x / 100, me.body.position.z - p.z / 100) < r;
  const untilTicks = async (fn: () => unknown, beat: string, ticks: number) => {
    const end = railAt() + ticks;
    while (!fn() && railAt() < end) await bot.wait(100);
    check(fn(), beat);
  };
  /** Walk to within 3 m of `at`, then forward until the game offers prompt `id`, ready; press it and wait for the
   * server to have confirmed it (nothing pending). */
  const press = async (id: string, at: { x: number; z: number }, beat: string) => {
    const x = at.x / 100,
      z = at.z / 100;
    check(await bot.walk(x, z, 3), `walked to ${beat}`);
    const offered = () => {
      const t = interactTarget();
      return t?.id === id && t.run && !t.blocked ? t : null;
    };
    const end = performance.now() + 6000;
    input.keys.add('KeyW');
    while (!offered() && performance.now() < end && bot.dist(x, z) > 0.6) {
      face(x, z);
      await bot.wait(40);
    }
    input.keys.delete('KeyW');
    // The rack's two prompts stand 0.6 m either side of its middle along the track, and the nearer is offered: step
    // about a metre each way (a person would shuffle) until the wanted one is.
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0.6, 0.6],
      [-0.6, -0.6],
    ] as const) {
      if (offered()) break;
      await bot.walk(x + dx, z + dz, 0.3);
    }
    check(
      offered(),
      `${id} offered for ${beat}; the game offers ${interactTarget()?.id ?? 'nothing'}${interactTarget()?.blocked ? ` blocked "${interactTarget()!.blocked}"` : ''}, ${bot.dist(x, z).toFixed(1)} m off`,
    );
    bot.press();
    await untilTicks(() => railRead()!.pending() === 0, `${beat} confirmed by the server`, 300);
    await bot.wait(300);
  };
  const ringLevers = () =>
    (
      view() as unknown as {
        ringLevers: { halt: number; dir: number; on: boolean; stands: boolean; over: boolean; x: number; z: number }[];
      }
    ).ringLevers;

  /** Feed section k of leg `slot` its bill at its frame, a back of a kind at a time off its rack, then wait out the lay
   * clock (300 ticks). The caller stands at the frame. */
  const feedSection = async (slot: number, k: number, what: string) => {
    const leg = RAIL_LEGS[slot]!,
      sec = leg.sections[k]!,
      frame = legFrame(leg, k),
      rack = legRack(leg, k),
      at = () => legRow(rw(), slot);
    for (let guard = 0; at().start < 0 && at().laid === k; guard++) {
      check(guard < 40, `${what} fed in 40 trips`);
      const needL = sec.logs - at().logs,
        needR = sec.rails - at().rails;
      if (needL <= 0 && needR <= 0) break;
      const a = account(rw(), railPid())!;
      if ((a.carry > 0 && needL > 0) || (a.rails > 0 && needR > 0)) {
        await press(
          'railway-leg-feed',
          frame,
          `feed ${what}'s frame (${at().logs}/${sec.logs} logs, ${at().rails}/${sec.rails} rails)`,
        );
      } else if (needL > 0) {
        await untilTicks(() => rail(rw()).depot > 0, `logs on ${what}'s rack`, 6000);
        await press('railway-leg-take-logs', rack, `take logs for ${what}`);
      } else {
        await untilTicks(() => rail(rw()).depotRails > 0, `rails on ${what}'s rack`, 6000);
        await press('railway-leg-take-rails', rack, `take rails for ${what}`);
      }
    }
    await untilTicks(() => at().laid > k, `${what} laid`, 1500);
  };
  /** While waiting for a train, say where `line`'s trains are every 20 s of page time (a stall's evidence). */
  const watchTrains = (line: number, want: number) =>
    setInterval(
      () =>
        console.log(
          `RAILWAY WAIT ${JSON.stringify({
            tick: railAt(),
            line,
            want,
            trains: trains(rw())
              .map((t, slot) => ({ t, slot }))
              .filter(({ t, slot }) => t.phase !== 2 && RAIL_TRAINS[slot]!.line === line)
              .map(({ t }) => [t.phase, t.at, t.to, t.track, t.depart, t.req]),
          })}`,
        ),
      20000,
    );

  check(aperture(rw()).joined >= 0 && laid() <= n, 'the seed has the ring joined, the leg open');
  check(!me.swimming, 'standing on dry ground at the start');

  // ---------------------------------------------------------------- leg 1: the stack line to High Gorge
  for (let k = laid(); k < n; k = laid()) {
    const frame = legFrame(L, k);

    // 1. To section k's frame. Section 0's is Ring Island's west platform, reached from the Village by a requested
    // train; a later one stands on the head the last lay made, reached from the old head by the train the lay asked for.
    if (!near(frame, 25)) {
      // From the Village (a seed that resumes mid-leg starts there): the island, or the head the last lay made.
      await ride(HALT.village2, k === 0 ? ISLAND : L.railheadHalt + k - 1, { askEach: true });
      await hopTo(
        k === 0 ? island.x : frame.x / 100,
        k === 0 ? island.z : frame.z / 100,
        `stepped off at section ${k + 1}'s halt`,
      );
      await until(() => me.coyote > 0 && !me.swimming, `standing at section ${k + 1}'s halt`, 10000);
    }
    // Outward arrivals now stand east. Reach the west-side frame by the south foot crossing, never over live rails.
    if (k === 0 && nearerEast()) await crossIsland(true);
    check(await bot.walk(frame.x / 100, frame.z / 100, 3), `walked to section ${k + 1}'s frame`);
    await checkpoint(`section ${k + 1} frame reached`);

    // 2. Feed the frame the section's bill from the rack; 3. the lay clock runs out and the section is laid.
    await feedSection(STACK, k, `section ${k + 1}`);
    await checkpoint(`section ${k + 1} laid`);

    // 4. On to the new railhead (or the leg's last halt): the first stop is the leg's `railheadHalt` + laid - 1.
    const stop = L.railheadHalt + laid() - 1;
    const last = laid() >= n;
    const here = k === 0 ? ISLAND : L.railheadHalt + k - 1;
    const lever = () => ringLevers().find((l) => l.halt === here && l.dir === 1 && l.on);
    const stands = () => ringLevers().some((l) => l.halt === here && l.stands) || here !== ISLAND;
    // Every still-open old head now has an outward lever; recover if the lay's train has already left.
    const dest = last ? cm(rowHalt('ring', L.destRowHalt)) : cm(legFrame(L, laid()));
    const watch = watchTrains(L.line, here);
    await rideFrom(
      {
        name: k === 0 ? 'Ring Island' : `Stack head ${k}`,
        stop: here,
        stands,
        handle: () => lever(),
        before: async (handle) => {
          if (k === 0 && !nearerEast()) await crossIsland(false);
          check(await bot.walk(handle.x, handle.z, 0.6), 'walked onto the outward lever platform');
        },
        calling: () => !!lever()?.over,
        wait: k === 0 ? island : cm(legFrame(L, k)),
      },
      stop,
      { askEach: true },
    );
    clearInterval(watch);
    await hopTo(
      dest.x,
      dest.z,
      last ? 'stepped off onto the Gorge platform' : `stepped off onto head ${laid()}'s platform`,
    );
    await until(() => me.coyote > 0 && !me.swimming, 'standing on the new platform', 10000);
  }

  // ---------------------------------------------------------------- leg 2: the incline, the seeds and the bay cut
  const route = () => routeRow(rw());
  const granted = (id: number) => !!(route().grants & (1 << id));
  const inclineGate = RAIL_LEGS[INCLINE]!.sections[0]!.gate!;
  const gorge = rowHalt('ring', L.destRowHalt);
  // A seed that starts past the stack line (`gorge-reached`) stands at the Village: line 2 to its end, High Gorge.
  if (!legDone(rw(), BAY) && !legDone(rw(), INCLINE) && !near(gorge, 80)) {
    const watch = watchTrains(L.line, GORGE_STOP);
    await ride(HALT.village2, GORGE_STOP, { askEach: true });
    clearInterval(watch);
    await hopTo(gorge.x / 100, gorge.z / 100, 'stepped off onto the Gorge platform');
    await until(() => me.coyote > 0 && !me.swimming, 'standing at High Gorge', 10000);
  }
  await checkpoint('gorge reached');

  // The powered pick on the north rim, up the stair; the barrier on the incline's first frame, behind the south
  // platform.
  if (!granted(PICK)) {
    await press('railway-leg-pick', RAIL_GRANTS[PICK]!.at, 'take the powered pick');
    check(granted(PICK), 'the room holds the powered pick');
    await checkpoint('pick taken');
  }
  if (!(route().gates & (1 << inclineGate))) {
    await press('railway-leg-gate', RAIL_GATES[inclineGate]!.at, "open the incline's barrier");
    check(route().gates & (1 << inclineGate), "the incline's barrier is open");
    await checkpoint('barrier opened');
  }

  /** Build leg `slot` (a row line of its own) from where its open section's frame is reached: feed each section, ride
   * the train its lay asks for to the new head (stepping off at the next frame), and at the last lay ride on to its
   * destination halt and step off there. */
  const buildRowLeg = async (slot: number, name: string) => {
    const leg = RAIL_LEGS[slot]!,
      m = leg.sections.length,
      at = () => legRow(rw(), slot).laid;
    for (let k = at(); k < m; k = at()) {
      const frame = legFrame(leg, k);
      check(near(frame, 40), `standing by ${name} section ${k + 1}'s frame`);
      check(await bot.walk(frame.x / 100, frame.z / 100, 3), `walked to ${name} section ${k + 1}'s frame`);
      await checkpoint(`${name} section ${k + 1} frame reached`);
      await feedSection(slot, k, `${name} section ${k + 1}`);
      await checkpoint(`${name} section ${k + 1} laid`);
      const last = at() >= m;
      const stop = leg.railheadHalt + at() - 1;
      await rowRide(leg.line, k === 0 ? fromStop(leg) : leg.railheadHalt + k - 1, stop, name);
      // Off the car onto the platform: the next frame at a head, the outward platform at the lever's spot at the end
      // (the catalog halt's point is on the track, where the car stands).
      const frameNext = legFrame(leg, at()),
        dest = last ? rowLever(leg.line, stop) : { x: frameNext.x / 100, z: frameNext.z / 100 };
      await hopTo(dest.x, dest.z, last ? `stepped off onto ${name}'s end platform` : `stepped off at ${name} head`);
      await until(() => me.coyote > 0 && !me.swimming, `standing on ${name}'s new platform`, 10000);
    }
  };
  /** Ride a row line's train from stop `from` to stop `to`: wait at the departure's lever for a train standing that
   * way (the lay's ask brings one; pull the lever when none comes), board it by a real jump, ask each stop it offers
   * aboard, and ride until it stands at `to`. The caller steps off. */
  const rowRide = async (line: number, from: number, to: number, name: string) => {
    const dir = to > from ? 1 : -1;
    const standing = () =>
      trains(rw()).findIndex(
        (r, slot) => RAIL_TRAINS[slot]!.line === line && r.phase === 0 && r.at === from && (r.track ? -1 : 1) === dir,
      );
    const lever = rowLever(line, from);
    const watch = watchTrains(line, from);
    try {
      check(await bot.walk(lever.x, lever.z, 1.2), `walked to ${name}'s lever at stop ${from}`);
      // The train a lay asks for may already be coming. Pull the lever whenever it is free to pull; while it shows the
      // stop requested ("Stop requested", blocked), a train is on its way: wait for it.
      const waitEnd = performance.now() + 2400000;
      while (standing() < 0 && performance.now() < waitEnd) {
        const t = interactTarget();
        if (t && /^Request stop/.test(t.verb) && t.run && !t.blocked) bot.press();
        await bot.until(() => standing() >= 0, 20000);
      }
      check(standing() >= 0, `a ${name} train toward stop ${to} stands at stop ${from}`);
      const slot = standing();
      const train = () => view().trains.find((t) => t.slot === slot)!;
      const aboard = () => train().cars.some((car) => car.riding);
      const end = performance.now() + 20000;
      try {
        while (!aboard() && performance.now() < end) {
          const car = train().cars[1] ?? train().cars[0]!;
          face(car.x, car.z);
          input.keys.add('KeyW');
          if (me.coyote > 0) pressJump();
          await bot.wait(120);
          releaseJump();
          await bot.wait(80);
        }
      } finally {
        input.keys.delete('KeyW');
        releaseJump();
      }
      check(aboard(), `boarded a ${name} train at stop ${from} by a real jump`);
      const asked = new Set<string>();
      let ran = false;
      await until(() => {
        check(aboard() && !me.swimming, `rider stays aboard the ${name} train`);
        const t = interactTarget();
        if (t?.id === 'railway-request-aboard' && t.run && !t.blocked && !asked.has(t.verb)) {
          asked.add(t.verb);
          bot.press();
        }
        const r = trains(rw())[slot]!;
        ran ||= r.phase === 1;
        return ran && r.phase === 0 && r.at === to;
      }, `the ${name} train arrives at stop ${to} with its rider`);
    } finally {
      clearInterval(watch);
    }
  };

  // The incline: section 1's frame and rack are High Gorge's; its heads and Bell Rock's lower deck by `ns` trains.
  if (!legDone(rw(), INCLINE)) await buildRowLeg(INCLINE, 'incline');
  const bell = rowHalt('ns', RAIL_LEGS[INCLINE]!.destRowHalt);
  if (!legDone(rw(), BAY)) {
    await checkpoint('bell reached');
    if (!granted(SEEDS)) {
      await press('railway-leg-seeds', RAIL_GRANTS[SEEDS]!.at, 'take the crystal seeds');
      check(granted(SEEDS), 'the room holds the crystal seeds');
      await checkpoint('seeds taken');
    }
    // Home the long way: an `ns` train back to High Gorge, line 2 to the Village, the walk to the West landing.
    const ns = RAIL_LEGS[INCLINE]!;
    check(near(bell, 80), "on Bell Rock's lower deck for the ride home");
    await rowRide(ns.line, ns.railheadHalt + ns.sections.length - 1, fromStop(ns), 'incline');
    const nsGorge = rowHalt('ns', 0);
    await hopTo(nsGorge.x / 100, nsGorge.z / 100, "stepped off at the incline's High Gorge platform");
    await until(() => me.coyote > 0 && !me.swimming, 'standing at High Gorge again', 10000);
    const gorgeLever = () => ringLevers().find((l) => l.halt === GORGE_STOP && l.dir === -1 && l.on);
    const watch = watchTrains(L.line, GORGE_STOP);
    await rideFrom(
      {
        name: 'High Gorge',
        stop: GORGE_STOP,
        stands: () => ringLevers().some((l) => l.halt === GORGE_STOP && l.stands),
        handle: () => gorgeLever(),
        before: async (handle) => check(await bot.walk(handle.x, handle.z, 0.6), "walked to High Gorge's lever"),
        calling: () => !!gorgeLever()?.over,
        wait: cm(gorge),
      },
      view().halts[HALT.village2]!.stop,
    );
    clearInterval(watch);
    await checkpoint('village reached');
    const west = legFrame(RAIL_LEGS[BAY]!, 0);
    check(await bot.walk(west.x / 100, west.z / 100, 3), "walked from the Village to the West landing's frame");
    await buildRowLeg(BAY, 'bay cut');
  }
  await checkpoint('bay reached');
}
