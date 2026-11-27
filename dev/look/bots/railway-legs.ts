// The greybox route's built legs through ordinary inputs (docs/plans/greybox-route.md and greybox-leg2.md, step 5;
// greybox-leg3.md, step 7), driven by RAIL_LEGS. Leg 1, the stack line: ride line 2 to the leg's first frame, then for
// each section take the kit off the rack, feed the frame, wait out the lay, ride on to the new railhead and step off
// onto its platform, until High Gorge is reached on foot. Leg 2: take the powered pick at the stair's head, open the
// incline's barrier, build the incline the same way riding `ns` trains to each head and on to Bell Rock's lower deck,
// take the crystal seeds, ride home the long way (`ns` to High Gorge, line 2 to the Village), walk to the West landing
// and build the bay cut, riding `bay` trains to Bell Rock's upper platform. Leg 3: open the Canopy barrier on frame 1 there, build the three sections
// riding `bay` trains over the strait to each head and on to Canopy Town, take the glider cloth round the buffers and
// ride home on the same line to the West landing. Leg 4: walk round the root to the cave apron, open the plug,
// build the three sections to Port Quay and ride back to the West landing. Leg 5: return to Port Quay, build the
// White Wall to High Gorge, opening the deep span at frame six. Leg 6 transfers at Canopy, builds to Lantern Notch
// and then from Bell Rock to the Original Island, where the bot presses the meeting post and closes the card.
// Prompts are pressed by id (`railway-leg-take-logs`, `-take-rails`,
// `-feed`, `-pick`, `-gate`, `-seeds`, `-canopy`, `-cloth`). Each phase reads the rows first, so it resumes from
// `ring-joined`, `gorge-open`, `gorge-mid`, `gorge-reached`, `bay-mid`, `trade-ready`, `bay-reached` and `canopy-reached` (a seed starts
// at the Village). Garage step 4: with `railFit=quick|strong` the bot fits the bay line at the Roundhouse post
// (./railway-fit.ts) at Home before its next bay ride out; with none it never visits the post.
// Inspection observes; it never seeds a world or moves a player. A fall into the sea is a finding (no recovery).
import type { Bot } from '../bot.ts';
import { legDone, legRow, routeRow } from '../../../src/sim/railway-queries-route.ts';
import { account, aperture, inspectRailway, railAt, railPid, railRead, rw, trains } from '../rail-read.ts';
import { me } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import { RING_HALT, ringAt } from '../../../src/sim/railway-ring-layout.ts';
import { RING_CROSSING } from '../../../src/entities/ring-island/state.ts';
import { RAIL_HALTS } from '../../../src/sim/railway-lines.ts';
import { LINE_SLOTS } from '../../../src/sim/railway-trains.ts';
import { ROW_PLATFORM, rowWorld } from '../../../src/entities/railway/row-path.ts';
import bellLevel from '../../../content/built/levels/bell.json' with { type: 'json' };
import type { Leg2Analysis } from '../../../src/content/levels/leg2.ts';
import { compiled } from '../../../src/prefab/catalogue.ts';
import { loadLevelArtifact } from '../../../src/prefab/validate.ts';
import {
  RAIL_ARRIVAL,
  RAIL_GATES,
  RAIL_GRANTS,
  RAIL_LEGS,
  legFrame,
  legRack,
  rowHalt,
  rowSide,
  type RouteLeg,
} from '../../../src/sim/railway-route.ts';
import { HALT, line2Rides } from './railway-ride.ts';
import type { Fit } from './railway-fit.ts';

export type LegRoute = { bot: Bot; checkpoint: (name: string) => Promise<void> };
const cm = (p: { x: number; z: number }) => ({ x: p.x / 100, z: p.z / 100 });
/** Ring Island is line 2's stop 5 (halts-view.ts); a leg's heads follow from its `railheadHalt`. */
const ISLAND = 5;
const legOf = (id: string) => RAIL_LEGS.findIndex((l) => l.id === id);
const STACK = legOf('stack'),
  INCLINE = legOf('incline'),
  BAY = legOf('bay-cut'),
  CANOPY = legOf('bell-canopy'),
  CAVE = legOf('cave');
const PICK = RAIL_GRANTS.findIndex((g) => g.id === 'pick'),
  SEEDS = RAIL_GRANTS.findIndex((g) => g.id === 'seeds'),
  CLOTH = RAIL_GRANTS.findIndex((g) => g.id === 'cloth');
const ORDINAL = ['one', 'two', 'three', 'four', 'five', 'six'];
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
  const { ride, rideFrom, hopTo, view, until, check, face, requestPrompt } = line2Rides(bot);
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
      at = () => legRow(rw(), slot);
    // Leg 3's frame and rack stand 4.8 m right of the track, where a standing car's deck reaches the line between
    // them: approach each 1.5 m further out (a rider was carried off from Canopy head 2 into the strait, 24 November).
    // The frame is the rack's outward neighbour, so right of rack-to-frame is away from the track.
    // At Wall head four, also use the platform's centre to approach the fifth section's rack.
    const site = { frame: legFrame(leg, k), rack: legRack(leg, k) },
      dx = site.frame.x - site.rack.x,
      dz = site.frame.z - site.rack.z,
      out = slot === CANOPY || (leg.id === 'wall' && k === 4) ? 150 / Math.hypot(dx, dz) : 0,
      away = <P extends { x: number; z: number }>(p: P) => ({ ...p, x: p.x - dz * out, z: p.z + dx * out }),
      frame = away(site.frame),
      rack = away(site.rack);
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
        await untilTicks(() => at().rackLogs > 0, `logs on ${what}'s rack`, 6000);
        await press('railway-leg-take-logs', rack, `take logs for ${what}`);
      } else {
        await untilTicks(() => at().rackRails > 0, `rails on ${what}'s rack`, 6000);
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
            trains: LINE_SLOTS[line]!.map((slot) => trains(rw())[slot]!)
              .filter((t) => t.phase !== 2)
              .map((t) => [t.phase, t.at, t.to, t.track, t.depart, t.req]),
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
    await checkpoint(`section ${ORDINAL[k]} frame reached`);

    // 2. Feed the frame the section's bill from the rack; 3. the lay clock runs out and the section is laid.
    await feedSection(STACK, k, `section ${k + 1}`);
    await checkpoint(`section ${ORDINAL[k]} laid`);

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
  const incline = RAIL_LEGS[INCLINE]!;
  const inclineGate = incline.sections[0]!.gate!;
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
  // platform. The stair's four switchback flights walk about three times the straight distance, past bot.walk's default
  // budget (a second of page time a straight metre): the climb and the way down to the barrier get four minutes each.
  const stairWalk = async (p: { x: number; z: number }, beat: string) =>
    check(await bot.walk(p.x / 100, p.z / 100, 3, { limit: 240000 }), beat);
  if (!granted(PICK)) {
    await stairWalk(RAIL_GRANTS[PICK]!.at, 'climbed the stair to the powered pick');
    await press('railway-leg-pick', RAIL_GRANTS[PICK]!.at, 'take the powered pick');
    check(granted(PICK), 'the room holds the powered pick');
    await checkpoint('pick taken');
  }
  if (!(route().gates & (1 << inclineGate))) {
    await stairWalk(RAIL_GATES[inclineGate]!.at, "walked down to the incline's barrier");
    await press('railway-leg-gate', RAIL_GATES[inclineGate]!.at, "open the incline's barrier");
    check(route().gates & (1 << inclineGate), "the incline's barrier is open");
    await checkpoint('barrier opened');
  }

  /** Build leg `slot` (a row line of its own) from where its open section's frame is reached: feed each section, ride
   * the train its lay asks for to the new head (stepping off at the next frame), and at the last lay ride on to its
   * destination halt and step off there. */
  const buildRowLeg = async (slot: number, name: string, beforeFeed?: (section: number) => Promise<void>) => {
    const leg = RAIL_LEGS[slot]!,
      m = leg.sections.length,
      at = () => legRow(rw(), slot).laid;
    for (let k = at(); k < m; k = at()) {
      const frame = legFrame(leg, k);
      check(near(frame, 40), `standing by ${name} section ${k + 1}'s frame`);
      check(await bot.walk(frame.x / 100, frame.z / 100, 3), `walked to ${name} section ${k + 1}'s frame`);
      // The section in words: the playthrough's stall check counts a beat as new only with its digits ignored.
      await checkpoint(`${name} section ${ORDINAL[k]} frame reached`);
      await beforeFeed?.(k);
      await feedSection(slot, k, `${name} section ${k + 1}`);
      await checkpoint(`${name} section ${ORDINAL[k]} laid`);
      const last = at() >= m;
      const stop = leg.railheadHalt + at() - 1;
      await rowRide(leg.line, leg.railheadHalt + k - 1, stop, name);
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
  const rowRide = async (line: number, from: number, to: number, name: string, askEach = true) => {
    const dir = to > from ? 1 : -1;
    const destination = RAIL_HALTS.find((h) => h.line === line && h.stop === to)!;
    const standing = () =>
      LINE_SLOTS[line]!.find((slot) => {
        const r = trains(rw())[slot]!;
        return r.phase === 0 && r.at === from && (r.track ? -1 : 1) === dir;
      }) ?? -1;
    /** A train of the line going our way that already carries the rider (stepped onto on the way to the lever). */
    const carrying = () => {
      const t = view().trains.find((v) => LINE_SLOTS[line]!.includes(v.slot) && v.cars.some((car) => car.riding));
      return t && (trains(rw())[t.slot]!.track ? -1 : 1) === dir ? t.slot : -1;
    };
    const lever = rowLever(line, from);
    const watch = watchTrains(line, from);
    try {
      const walked = await bot.walk(lever.x, lever.z, 1.2);
      // Carried off by a train our way while walking to the lever: that is the ride (the hold below still applies).
      let slot = carrying();
      if (slot < 0) {
        check(walked, `walked to ${name}'s lever at stop ${from}`);
        // The train a lay asks for may already be coming. Pull the lever whenever it is free to pull; while it shows
        // the stop requested ("Stop requested", blocked), a train is on its way: wait for it.
        const waitEnd = performance.now() + 2400000;
        while (standing() < 0 && performance.now() < waitEnd) {
          const t = interactTarget();
          if (t && /^Request stop/.test(t.verb) && t.run && !t.blocked) bot.press();
          await bot.until(() => standing() >= 0, 20000);
        }
        check(standing() >= 0, `a ${name} train toward stop ${to} stands at stop ${from}`);
        slot = standing();
      }
      const train = () => view().trains.find((t) => t.slot === slot)!;
      const aboard = () => train().cars.some((car) => car.riding);
      const end = performance.now() + 20000;
      // Aboard once the car carries the rider for 0.8 s with the stick let go: a jump's first touch of the car reads
      // `riding` for a frame and can bounce off it (Bell Rock's curved platform, greybox leg 3's first run).
      let since: number | undefined,
        held = false;
      try {
        // A hold begun before the deadline may finish after it; a first touch at or past it never counts.
        while (performance.now() < end || since !== undefined) {
          if (aboard()) {
            input.keys.delete('KeyW');
            since ??= performance.now();
            if ((held = performance.now() - since >= 800)) break;
            await bot.wait(80);
            continue;
          }
          since = undefined;
          const cars = train().cars,
            car = cars[1] ?? cars[0]!;
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
      check(held, `boarded a ${name} train at stop ${from} by a real jump, carried 0.8 s`);
      const asked = new Set<string>();
      let ran = false;
      await until(() => {
        check(aboard() && !me.swimming, `rider stays aboard the ${name} train`);
        const t = requestPrompt();
        if (t?.run && !t.blocked && !asked.has(t.verb) && (askEach || t.verb === `Request stop: ${destination.name}`)) {
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
  const bell = rowHalt(incline.row, incline.destRowHalt);
  const bayLeg = RAIL_LEGS[BAY]!;
  const westLanding = legFrame(bayLeg, 0);
  /** Off the car to `at` (cm), standing there dry. */
  const stepOff = async (at: { x: number; z: number }, beat: string) => {
    await hopTo(at.x / 100, at.z / 100, beat);
    await until(() => me.coyote > 0 && !me.swimming, `${beat}: standing`, 10000);
  };
  const rideGorgeHome = async () => {
    const gorgeLever = () => ringLevers().find((l) => l.halt === GORGE_STOP && l.dir === -1 && l.on);
    const watch = watchTrains(L.line, GORGE_STOP);
    try {
      await rideFrom(
        {
          name: 'High Gorge',
          stop: GORGE_STOP,
          stands: () => ringLevers().some((l) => l.halt === GORGE_STOP && l.stands),
          handle: () => gorgeLever(),
          before: async (handle) => check(await bot.walk(handle.x, handle.z, 0.6), "walked to High Gorge's lever"),
          calling: () => !!gorgeLever()?.over,
          // The halt's reach point is on the tracks. The kit rack stands on the south platform beside the homeward train.
          wait: cm(legRack(incline, 0)),
        },
        view().halts[HALT.village2]!.stop,
      );
    } finally {
      clearInterval(watch);
    }
  };
  const wallSlot = legOf('wall');
  const wall = RAIL_LEGS[wallSlot]!;
  const finishRoute = async () => {
    const wallEnd = wall.railheadHalt + wall.sections.length - 1;
    check(near(gorge, 80), 'standing at High Gorge for the Wall line');
    if (/[?&]railStop=wall(?:%20|\+)home(?:&|$)/.test(globalThis.location?.search ?? '')) {
      await rideGorgeHome();
      await checkpoint('wall home');
      return;
    }
    const notchSlot = legOf('notch-tunnel');
    const notch = RAIL_LEGS[notchSlot]!;
    const canopyHalt = RAIL_HALTS.find((h) => h.line === wall.line && h.name === 'Canopy Town')!;
    await rowRide(wall.line, wallEnd, canopyHalt.stop, 'White Wall', false);
    const transfer = rowWorld(wall.line, canopyHalt.s / 100, -ROW_PLATFORM, { x: 0, z: 0 });
    await stepOff({ x: transfer.x * 100, z: transfer.z * 100 }, 'stepped off at the Wall line’s Canopy halt');
    await checkpoint('Canopy transfer');
    const openGate = async (leg: RouteLeg, prompt: string, beat: string) => {
      const gate = leg.sections[0]!.gate!;
      if (!(route().gates & (1 << gate))) await press(prompt, RAIL_GATES[gate]!.at, beat);
      check(route().gates & (1 << gate), beat);
      await checkpoint(beat);
    };
    await openGate(notch, 'railway-leg-notch', 'Notch barrier open');
    await buildRowLeg(notchSlot, 'Notch');
    await checkpoint('Notch reached');
    const lantern = RAIL_GRANTS.findIndex((g) => g.id === 'lantern');
    await press('railway-leg-lantern', RAIL_GRANTS[lantern]!.at, 'take the lantern');
    check(granted(lantern), 'the room holds the lantern');
    await checkpoint('lantern taken');

    const bayEnd = RAIL_LEGS[BAY]!.railheadHalt + RAIL_LEGS[BAY]!.sections.length - 1;
    await rowRide(notch.line, notch.railheadHalt, bayEnd, 'bay line', false);
    const bellStop = RAIL_HALTS.find((h) => h.line === notch.line && h.stop === bayEnd)!;
    const bellUpper = rowWorld(notch.line, bellStop.s / 100, -ROW_PLATFORM, { x: 0, z: 0 });
    await stepOff({ x: bellUpper.x * 100, z: bellUpper.z * 100 }, 'stepped off at Bell Rock’s upper platform');
    const { marks } = loadLevelArtifact(bellLevel, compiled.prefabs).analysis as Leg2Analysis['bell'];
    for (const point of [marks.rampHead, marks.rampFoot, marks.lowerWest, marks.lowerEast])
      check(await bot.walk(point.x, point.z, 0.8), 'walked from the upper platform to Bell Rock’s lower east deck');
    await checkpoint('Bell Rock lower deck reached');
    const causewaySlot = legOf('causeway');
    await openGate(RAIL_LEGS[causewaySlot]!, 'railway-leg-causeway', 'causeway barrier open');
    await buildRowLeg(causewaySlot, 'causeway');
    await untilTicks(() => route().reached >= 0, 'a train has stood at the Original Island', 1500);
    await press('railway-leg-arrive', RAIL_ARRIVAL, 'press the meeting post');
    check(route().arrived >= 0, 'the room is marked arrived');
    const card = () => document.querySelector('.ending-card');
    await until(card, 'ending card appeared', 10000);
    await checkpoint('meeting post pressed');
    const close = card()!.querySelector<HTMLButtonElement>('button');
    check(close?.textContent === 'Close', 'the ending card offers Close');
    await bot.wait(1600);
    close!.click();
    await until(() => !card(), 'ending card closed', 10000);
    await checkpoint('ending card closed');
  };
  if (legDone(rw(), wallSlot)) {
    await finishRoute();
    return;
  }
  const barrier = wall.sections[5]!.gate!;
  const openDeepSpan = async () => {
    check(
      await bot.until(
        () => inspectRailway()?.worksView?.legView?.objective === "Open the deep span's barrier (placeholder)",
        10000,
        'Deep span objective',
      ),
      'head five points to the barrier',
    );
    await press('railway-leg-deep-span', RAIL_GATES[barrier]!.at, 'open the deep span');
    check(routeRow(rw()).gates & (1 << barrier), 'deep span opened at frame six');
    await checkpoint('deep span open');
  };
  // The deep-span jump seed places the player between the last rack and frame.
  if (legRow(rw(), wallSlot).laid === 5 && !(route().gates & (1 << barrier))) {
    if (!near(legFrame(wall, 5), 40)) {
      check(await bot.walk(westLanding.x / 100, westLanding.z / 100, 3), 'walked to the cave line');
      await rowRide(wall.line, 0, wall.railheadHalt + 4, 'White Wall');
      await stepOff(legFrame(wall, 5), 'stepped off at the deep span frame');
    }
    await openDeepSpan();
    return;
  }
  const cave = RAIL_LEGS[CAVE]!;
  const caveRoot = rowWorld(cave.line, 0, 0, { x: 0, z: 0 });
  const walkCaveRoot = async () =>
    check(await bot.walk(caveRoot.x, caveRoot.z, 1), 'walked round the West landing root to the cave apron');
  const startWall = async () => {
    await rowRide(wall.line, 0, fromStop(wall), 'cave');
    // Land beside the halt, clear of the rack between the train and the first frame.
    await stepOff(rowSide(wall.row, wall.fromCm, (ROW_PLATFORM + 1) * 100, 0, 0), 'stepped off at Port Quay');
    await buildRowLeg(wallSlot, 'White Wall', async (k) => {
      if (wall.sections[k]!.gate === barrier && !(route().gates & (1 << barrier))) await openDeepSpan();
    });
    check(
      await bot.until(
        () => inspectRailway()?.worksView?.legView?.objective === 'Open the Notch barrier at Canopy Town (placeholder)',
        10000,
        'Notch barrier objective',
      ),
      'The completed Wall points to the Notch barrier at Canopy Town',
    );
    await checkpoint('wall reached');
    await finishRoute();
  };
  // A port-reached save starts in the Village with the cave leg already laid.
  if (legDone(rw(), CAVE) && legDone(rw(), CANOPY) && granted(CLOTH)) {
    await walkCaveRoot();
    await startWall();
    return;
  }
  /** From the Village (where a seed starts): walk to the West landing and ride a bay train out to stop `to`. */
  const rideOut = async (to: number, at: { x: number; z: number }, beat: string) => {
    check(await bot.walk(westLanding.x / 100, westLanding.z / 100, 3), 'walked from the Village to the West landing');
    await rowRide(bayLeg.line, 0, to, 'bay line');
    await stepOff(at, beat);
  };
  /** Garage step 4's choice, when the page's `railFit=quick|strong` asks for one: at Home, before the next bay ride
   * out. The fit's module loads only then (it reaches the garage screen's imports), and the query is read by pattern:
   * test/loop-graph.test.ts runs this route in a bare context with no location or URLSearchParams. */
  const fit = /[?&]railFit=([^&]*)/.exec(globalThis.location?.search ?? '')?.[1] ?? null;
  check(fit === null || fit === 'quick' || fit === 'strong', `railFit=${fit}: quick or strong`);
  const choose = async () => {
    if (!fit) return;
    const { fitAtPost } = await import('./railway-fit.ts');
    if (await fitAtPost({ bot, until, check, face, untilTicks }, bayLeg.line, fit as Fit))
      await checkpoint(`bay line fitted ${fit}`);
  };
  /** The bay line's trains for the log: [slot, phase, at, boiler] each, parked ones left out. */
  const logFleet = (beat: string) =>
    fit &&
    console.log(
      `RAILWAY FLEET ${JSON.stringify({
        beat,
        tick: railAt(),
        fit,
        bay: LINE_SLOTS[bayLeg.line]!.map((slot) => [slot, trains(rw())[slot]!] as const)
          .filter(([, t]) => t.phase !== 2)
          .map(([slot, t]) => [slot, t.phase, t.at, t.boiler]),
      })}`,
    );
  const bayWasLaid = legDone(rw(), BAY);
  if (!bayWasLaid && legRow(rw(), BAY).laid > 0 && !near(bell, 80)) {
    // A seed mid bay cut (`bay-mid`, `trade-ready`) starts at the Village: the seeds are taken and the cut's first
    // section laid. Make the choice if one is asked, then ride a bay train out to the open section's head.
    await checkpoint('bell reached');
    await choose();
    const k = legRow(rw(), BAY).laid;
    await rideOut(bayLeg.railheadHalt + k - 1, legFrame(bayLeg, k), `stepped off at bay cut head ${k}`);
    logFleet('rode out after the fit');
    await buildRowLeg(BAY, 'bay cut');
  } else if (!legDone(rw(), BAY)) {
    await checkpoint('bell reached');
    if (!granted(SEEDS)) {
      await press('railway-leg-seeds', RAIL_GRANTS[SEEDS]!.at, 'take the crystal seeds');
      check(granted(SEEDS), 'the room holds the crystal seeds');
      await checkpoint('seeds taken');
    }
    // Home the long way: an `ns` train back to High Gorge, line 2 to the Village, the walk to the West landing.
    check(near(bell, 80), "on Bell Rock's lower deck for the ride home");
    await rowRide(incline.line, incline.railheadHalt + incline.sections.length - 1, fromStop(incline), 'incline');
    const nsGorge = rowHalt('ns', 0);
    await hopTo(nsGorge.x / 100, nsGorge.z / 100, "stepped off at the incline's High Gorge platform");
    await until(() => me.coyote > 0 && !me.swimming, 'standing at High Gorge again', 10000);
    await rideGorgeHome();
    await checkpoint('village reached');
    check(
      await bot.walk(westLanding.x / 100, westLanding.z / 100, 3),
      "walked from the Village to the West landing's frame",
    );
    await buildRowLeg(BAY, 'bay cut');
  }
  await checkpoint('bay reached');

  const caveFirst = /[?&]railOrder=cave(?:&|$)/.test(globalThis.location?.search ?? '');
  const caveGate = cave.sections[0]!.gate!;
  const caveStart = fromStop(cave);
  const caveEnd = cave.railheadHalt + cave.sections.length - 1;
  const buildCave = async () => {
    await walkCaveRoot();
    if (!(route().gates & (1 << caveGate))) {
      await press('railway-leg-plug', RAIL_GATES[caveGate]!.at, 'open the sea-cave plug');
      check(route().gates & (1 << caveGate), 'the sea-cave plug is open');
      await checkpoint('plug opened');
    }
    await buildRowLeg(CAVE, 'cave');
    const nextObjective = legDone(rw(), CANOPY)
      ? 'Build the line along the White Wall to High Gorge (placeholder)'
      : 'Ride to Bell Rock and build the line to Canopy Town (placeholder)';
    check(
      await bot.until(() => inspectRailway()?.worksView?.legView?.objective === nextObjective, 10000),
      `Port Quay points to ${legDone(rw(), CANOPY) ? 'the White Wall' : 'Canopy Town'}`,
    );
    await checkpoint('port reached');
    await rowRide(cave.line, caveEnd, caveStart, 'cave');
    const home = rowLever(cave.line, caveStart);
    await stepOff({ x: home.x * 100, z: home.z * 100 }, 'stepped off the cave train at the West landing');
    await checkpoint('port home');
  };
  if (caveFirst && !legDone(rw(), CAVE)) {
    if (!bayWasLaid) {
      await rowRide(bayLeg.line, bayLeg.railheadHalt + bayLeg.sections.length - 1, 0, 'bay line');
      await stepOff(westLanding, 'stepped off at the West landing');
    }
    await buildCave();
  }

  // ---------------------------------------------------------------- leg 3: Bell Rock to Canopy Town, and home
  const canopy = RAIL_LEGS[CANOPY]!;
  const canopyGate = canopy.sections[0]!.gate!;
  const canopyEnd = canopy.railheadHalt + canopy.sections.length - 1;
  if (!legDone(rw(), CANOPY)) {
    // Section 1's frame is Bell Rock's (frame 1 on the outward upper platform, the barrier on it); a later one stands
    // on the head the last lay made.
    const k = legRow(rw(), CANOPY).laid,
      frame = legFrame(canopy, k);
    // From a seed at the Village (`bay-reached` on), the choice is made at Home first.
    if (!near(frame, 40)) {
      await choose();
      await rideOut(
        canopy.railheadHalt + k - 1,
        frame,
        k === 0
          ? "stepped off at Bell Rock's upper platform by Canopy's first frame"
          : `stepped off at Canopy head ${k}`,
      );
    }
    if (!(route().gates & (1 << canopyGate))) {
      await press('railway-leg-canopy', RAIL_GATES[canopyGate]!.at, 'open the Canopy barrier');
      check(route().gates & (1 << canopyGate), 'the Canopy barrier is open');
      await checkpoint('canopy barrier opened');
    }
    await buildRowLeg(CANOPY, 'canopy');
  }
  await checkpoint('canopy reached');
  // The cloth post on the homeward deck round the buffers.
  if (!granted(CLOTH)) {
    const cloth = RAIL_GRANTS[CLOTH]!.at;
    if (!near(cloth, 60)) {
      const lever = rowLever(canopy.line, canopyEnd); // metres; stepOff takes cm
      await rideOut(canopyEnd, { x: lever.x * 100, z: lever.z * 100 }, 'stepped off at Canopy Town');
    }
    await press('railway-leg-cloth', cloth, 'take the glider cloth');
    check(granted(CLOTH), 'the room holds the glider cloth');
    await checkpoint('cloth taken');
  }
  // Home on the same line: a bay train from Canopy Town to the West landing (the Notch barrier stays shut: leg 6). The
  // walk from the cloth post to the lever runs along the train's platform: wait on the deck while a train stands at
  // Canopy or is bound there, so none leaves beside the rider (a run on 24 November was carried off and tumbled).
  const atOrBound = () =>
    LINE_SLOTS[canopy.line]!.some((slot) => {
      const r = trains(rw())[slot]!;
      return r.phase === 0 ? r.at === canopyEnd : r.to === canopyEnd;
    });
  check(await bot.until(() => !atOrBound(), 600000), "Canopy's platform cleared before the homeward walk");
  await rowRide(canopy.line, canopyEnd, 0, 'bay line');
  await stepOff(westLanding, 'stepped off at the West landing');
  const caveDone = legDone(rw(), CAVE);
  const plugOpen = !!(route().gates & (1 << caveGate));
  const nextObjective = caveDone
    ? 'Build the line along the White Wall to High Gorge (placeholder)'
    : plugOpen
      ? 'Build the cave line to Port Quay'
      : 'Open the sea-cave plug at the West landing';
  check(
    await bot.until(() => inspectRailway()?.worksView?.legView?.objective === nextObjective, 10000),
    `the cloth points to the next objective: ${nextObjective}`,
  );
  logFleet('home from Canopy Town');
  await checkpoint('canopy home');

  // ---------------------------------------------------------------- leg 4: West landing to Port Quay, and home
  if (caveDone) await walkCaveRoot();
  else await buildCave();
  await startWall();
}
