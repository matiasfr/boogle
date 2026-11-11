// Split-rock Works and the Roundhouse through ordinary inputs (docs/plans/split-rock-roundhouse.md, J5d): after the
// pier, take the breaker, open the stall and the throat, light the kiln, carry two footings home by hand (trains on
// request, at a lever and aboard), fit the cradle with rails, turn the table, then ride the footing wagon's train to
// the pier and set twelve footings in the sea.
// Inspection observes; it never seeds a world or moves a player.
import type { Bot } from '../bot.ts';
import { inspectRailwayLegacy, type RailwayLegacyInspection } from '../../../src/entities/railway/state.ts';
import { me, cam } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import {
  WORKS,
  WORKS_BREAKER,
  WORKS_SEAMS,
  WORKS_KILN,
  WORKS_RACK,
  SHED_STALL,
  SHED_TABLE,
  PIER_RACK,
  PIER_FRAME,
} from '../../../src/sim/railway-works-layout.ts';
import { STALL_SOCKETS } from '../../../src/entities/railway/works-shape.ts';

export type WorksRoute = {
  bot: Bot;
  checkpoint: (name: string) => Promise<void>;
  walkQuarry?: (from: number, to: number) => Promise<void>;
};
/** Where the segment starts: on from the pier (the full route), or an accepted `--rail-seed` stage. */
export type WorksFrom = 'pier' | 'works' | 'wagon';

type Trains = ReturnType<
  Awaited<ReturnType<typeof import('../../../src/entities/railway/train-view.ts').createRailwayTrains>>['inspect']
>;
type Halts = ReturnType<
  Awaited<ReturnType<typeof import('../../../src/entities/railway/halts-view.ts').createRailwayHalts>>['inspect']
>;
/** Line 2's halts in `view().halts`: Place's five, then the Pier halt. */
const HALT = { village2: 2, quarry: 3, pier: 5 } as const;
const cm = (p: { x: number; z: number }) => ({ x: p.x / 100, z: p.z / 100 });

export async function splitRockToCrossing({ bot, checkpoint }: WorksRoute, from: WorksFrom = 'pier') {
  const read = () => inspectRailwayLegacy()!;
  const l2 = () => read().line2;
  const works = () => read().works;
  const shed = () => read().shed;
  const view = () => read().line2View as RailwayLegacyInspection['line2View'] & Trains & Halts;
  const check = (ok: unknown, beat: string) => {
    if (!ok) throw new Error(beat);
  };
  // The page races about 10x faster than the authority: these are page-time budgets, not schedules.
  const until = async (fn: () => unknown, beat: string, ms = 2400000) => check(await bot.until(fn, ms, beat), beat);
  const walk = async (x: number, z: number, radius = 1) =>
    check(await bot.walk(x, z, radius), `Works walked to ${x.toFixed(1)}, ${z.toFixed(1)} without recovery`);
  const use = async (p: { x: number; z: number }, verb: RegExp, beat: string) => {
    if (await bot.use(p.x, p.z, beat, verb)) return;
    const at = me.body!.position,
      s = read() as ReturnType<typeof read> & { worksView?: unknown };
    console.log(
      `WORKS USE MISSED ${JSON.stringify({ beat, at, yaw: cam.yaw, carry: s.carry, works: s.works.breaker, view: s.worksView })}`,
    );
    check(false, `${beat} offered`);
  };
  const settle = (beat: string) => until(() => read().pending === 0, `${beat} settles`, 30000);
  const face = (x: number, z: number) => {
    const p = me.body!.position;
    cam.yaw = me.yaw = Math.atan2(-(x - p.x), -(z - p.z));
  };

  /** Request a line-2 train at `haltId` by its lever, the handle the way to `destination`, board it by a real jump,
   * ask for a middle `destination` aboard ("Request stop: <halt>"), ride there and step off onto its halt. */
  const ride = async (haltId: number, destination: number) => {
    const halt = view().halts[haltId]!;
    await until(() => view().halts[haltId]!.up, `${halt.name} halt stands`);
    const dir = destination > halt.stop ? 1 : -1;
    const handle = view().halts[haltId]!.lever.find((h) => h.on && h.dir === dir);
    check(handle, `${halt.name} has a handle toward stop ${destination}`);
    if (!handle!.over) await use(handle!, /^Request stop/, `request a train at ${halt.name}`);
    await until(() => view().halts[haltId]!.calling, `${halt.name} signal drops for the request`);
    await walk(halt.x, halt.z, 0.5);
    // Whichever of line 2's trains stops for the lever is the ride (v26).
    const standing = () =>
      view()
        .trains.filter((t) => t.line === 1)
        .find((t) => {
          const r = read().trains[t.slot]!;
          return r.phase === 0 && r.at === halt.stop && (r.track ? -1 : 1) === dir;
        })?.slot;
    await until(() => standing() !== undefined, `a train toward stop ${destination} stands at ${halt.name}`);
    const slot = standing()!;
    const row = () => read().trains[slot]!;
    const train = () => view().trains.find((t) => t.slot === slot)!;
    // Its cars, the wagon's too while coupled (train-view.ts inspect).
    const aboard = () => train().cars.some((car) => car.riding);
    const end = performance.now() + 20000;
    try {
      while (!aboard() && performance.now() < end) {
        const car = train().cars[1]!;
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
    check(aboard(), `boarded line 2 at ${halt.name} by a real jump`);
    const to = view().halts.find((h) => h.line === 1 && h.stop === destination)!;
    if (to.lever.filter((h) => h.on).length === 2) {
      // A middle halt stops only on request: ask aboard.
      await until(
        () => interactTarget()?.id === 'railway-request-aboard',
        `"Request stop: ${to.name}" offered aboard`,
        20000,
      );
      check(interactTarget()?.verb === `Request stop: ${to.name}`, `the prompt names ${to.name}`);
      if (interactTarget()?.run) bot.press();
      await until(() => row().to === destination || row().at === destination, `the train will stop at ${to.name}`);
    }
    let ran = false;
    let sample: Promise<void> | undefined;
    await until(() => {
      check(aboard() && !me.swimming, 'rider stays aboard the line-2 train');
      const r = row();
      ran ||= r.phase === 1;
      // `railPerf`: one real-frame sample aboard a moving train (with the wagon once it is coupled).
      if (r.phase === 1 && !sample && new URLSearchParams(location.search).has('railPerf'))
        sample = (async () => {
          // Needs `prof=1` (hardware timing). The counts are read just after a game frame, when renderer.info
          // still holds that frame's scene pass (as dev/look/perf.ts does).
          const { hardwareTiming } = await import('../../../src/debug/prof-overlay.ts');
          const { renderer } = await import('../../../src/render/scene.ts');
          const timing = await hardwareTiming(3);
          await new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)));
          const calls = renderer.info.render.drawCalls,
            tris = renderer.info.render.triangles;
          const gpu = timing.gpu.render.stats;
          console.log(`RAILWAY MOVING PERF ${JSON.stringify({ wagon: r.wagon, calls, tris, gpu, cpu: timing.cpu })}`);
        })();
      return ran && r.phase === 0 && r.at === destination;
    }, `line 2 arrives at stop ${destination} with its rider`);
    await sample;
    const arrivalId = view().halts.findIndex((h) => h.line === 1 && h.stop === destination);
    const arrival = view().halts[arrivalId]!;
    // Come in going up at a middle halt, the train stands at the up platform: step off onto it, then walk to today's
    // side over the plank crossing (generic-lines, finding 5), never across the running tracks.
    const up = view().upPlatforms.find((u) => u.pair === arrivalId);
    if (up && row().track === 0) {
      check(await bot.straight(up.x, up.z, 0.5, 12000), `stepped off onto the ${arrival.name} up platform`);
      await until(() => !aboard() && me.coyote > 0, 'off the train, on the up platform', 10000);
      for (const [i, p] of up.path.entries())
        check(await bot.straight(p.x, p.z, 0.5, 12000), `${arrival.name} plank crossing, step ${i + 1}`);
    }
    check(await bot.straight(arrival.x, arrival.z, 0.5, 12000), `stepped across to the ${arrival.name} halt`);
    await until(() => !aboard() && me.coyote > 0, 'stepped off the train onto the halt', 10000);
  };

  /** Fill the back with logs from the nearest reachable ordinary trees (the route's own chop loop). */
  const fillLogs = async (max: number) => {
    for (let attempts = 0; read().carry < max; attempts++) {
      check(attempts < 24, 'found enough reachable logs for the kiln');
      const p = me.body!.position;
      const candidates = read()
        .trees.filter((t) => !t.cleared && t.remaining > 0 && t.id !== 28 && t.id !== 209 && t.id !== 232)
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
      let chosen: RailwayLegacyInspection['trees'][number] | undefined;
      for (const candidate of candidates.slice(0, 20)) {
        const route = await bot.plan(candidate.x, candidate.z, 2.6);
        if (route.arrives && route.path.every((point) => point.y >= 3)) {
          chosen = candidate;
          break;
        }
      }
      check(chosen, 'a reachable ordinary tree exists for the kiln logs');
      await walk(chosen!.x, chosen!.z, 2.6);
      face(chosen!.x, chosen!.z);
      for (let swing = 0; swing < 60 && read().carry < max; swing++) {
        const target = interactTarget();
        if (!target?.click || target.verb !== 'Chop') break;
        bot.press();
        await bot.wait(380);
        if (read().trees.find((t) => t.id === chosen!.id)?.remaining === 0) break;
      }
      await settle('kiln log harvest');
    }
  };

  const seam = (id: number) => cm(WORKS_SEAMS[id]!);
  const kiln = cm(WORKS_KILN),
    worksRack = cm(WORKS_RACK),
    stall = cm(SHED_STALL),
    table = cm(SHED_TABLE),
    pierRack = cm(PIER_RACK),
    pierFrame = cm(PIER_FRAME);

  if (from === 'pier') await ride(HALT.pier, 0);
  if (from !== 'wagon') {
    // 1. The breaker on the boiler's old pedestal.
    await use(cm(WORKS_BREAKER), /^Take the breaker$/, 'take the breaker');
    await until(() => works().breaker === 2, 'breaker taken', 30000);
    await checkpoint('breaker');
    // 2. The stall slab, 15 m from the pedestal: the harmless first strike.
    await use(seam(0), /^Strike the seam$/, 'strike the stall slab');
    await until(() => works().seams & 1, 'stall slab struck', 30000);
    await checkpoint('stall open');
    // 3. Sixteen logs, then line 2 to the quarry and the throat.
    await fillLogs(Math.min(read().carryMax, WORKS.kilnLogs));
    check(read().carry === WORKS.kilnLogs, 'a back of sixteen logs for the kiln');
    await ride(HALT.village2, 1);
    await use(seam(1), /^Strike the seam$/, 'strike the throat');
    await until(() => works().seams & 2, 'throat struck', 30000);
    await checkpoint('throat open');
    // 4. The logs into the kiln through the cut; the bowl's two rocks; the stone into the kiln.
    await use(kiln, /^Fill the kiln$/, 'fill the kiln with logs');
    await until(() => works().kiln.logs === WORKS.kilnLogs && read().carry === 0, 'kiln holds its logs', 30000);
    await settle('kiln logs');
    for (const [k, rock] of works().rocks.entries()) {
      const at = cm(rock);
      await use(at, /^Chop$/, `mine bowl rock ${k}`);
      check(
        await bot.work(() => works().rocks[k]!.remaining === 0 || read().stoneCarry >= WORKS.kilnStone, 60000),
        `bowl rock ${k} gives its stone`,
      );
      await settle(`bowl rock ${k}`);
    }
    check(read().stoneCarry === WORKS.kilnStone, 'a back of sixteen stone from the bowl');
    await use(kiln, /^Fill the kiln$/, 'fill the kiln with stone');
    await until(() => works().kiln.lit >= 0, 'kiln lit', 30000);
    await checkpoint('kiln lit');
    // 5. The first cast comes down the roller road.
    await walk(worksRack.x, worksRack.z, 2.5);
    await until(() => works().rack >= 1, 'first footing on the Works rack', 600000);
    await checkpoint('first footing');
    // 6. The stall's two footings home by hand (the cradle takes rails only, works-late-game step 2a).
    for (let trip = 0; trip < WORKS.stall + WORKS.cradle; trip++) {
      if (trip > 0) await ride(HALT.village2, 1);
      await until(() => works().rack >= 1, `a footing waits on the Works rack (trip ${trip + 1})`, 600000);
      await use(worksRack, /^Shoulder a footing$/, `shoulder footing ${trip + 1}`);
      await until(() => read().foot === 1, `footing ${trip + 1} on the back`, 30000);
      await ride(HALT.quarry, 0);
      const site = trip < WORKS.stall ? 0 : 1;
      // The set is offered within the stall's reach of its centre, and a socket sits near that edge: come at the
      // socket from the stall's side, 1.5 m in, so arriving from the halt never stops just outside the reach.
      const socket = STALL_SOCKETS[Math.min(trip, STALL_SOCKETS.length - 1)]!,
        inward = Math.hypot(stall.x - socket.x, stall.z - socket.z) || 1;
      const to =
        site === 0
          ? {
              x: socket.x + ((stall.x - socket.x) / inward) * 1.5,
              z: socket.z + ((stall.z - socket.z) / inward) * 1.5,
            }
          : stall;
      await use(to, /^Set the footing$/, `set footing ${trip + 1}`);
      await until(() => read().foot === 0, `footing ${trip + 1} set`, 30000);
      await settle(`footing ${trip + 1}`);
      bot.note(`hand trip ${trip + 1} home (${site ? 'cradle' : 'stall'})`);
      if (trip === WORKS.stall - 1) {
        await until(() => shed().stall === WORKS.stall, 'stall stands on two footings', 30000);
        await checkpoint('stall built');
      }
    }
    // Eight rails from the forge rack fit the cradle.
    const rack = view().forgeRack;
    await until(() => l2().forge.rack >= WORKS.cradleRails, 'the forge rack holds eight rails', 600000);
    await use(rack, /^Take rails$/, 'take rails for the cradle');
    await until(() => read().railsCarry >= WORKS.cradleRails, 'eight rails on the back', 30000);
    await settle('cradle rails');
    await use(stall, /^Fit the cradle$/, 'fit the cradle');
    await until(() => shed().fitted >= 0, 'cradle fitted', 30000);
    // The pier's footings need an empty back: the forge rack gives only what the cradle takes.
    await until(() => read().pending === 0, 'cradle fit settles', 30000);
    check(
      !read().carry && !read().stoneCarry && !read().railsCarry && !read().foot,
      `an empty back after the cradle (rails ${read().railsCarry})`,
    );
    await checkpoint('cradle fitted');
    // 7. Turn the table; the shunter pushes the wagon out and line 2 couples it at the village.
    await use(table, /^Turn the table$/, 'turn the table');
    await until(() => shed().table === 1 && shed().ready >= 0, 'table turned for line 2', 30000);
    await checkpoint('table turned');
    await until(() => read().trains.some((r) => r.wagon), 'line 2 couples the footing wagon');
    await checkpoint('wagon coupled');
  }
  // 8. Ride the wagon's train to the pier; set twelve footings from the pier rack into the sea.
  await ride(HALT.village2, 3);
  await until(() => works().pierRack >= 1, 'the wagon unloads at the pier rack');
  await checkpoint('footings at the pier');
  // The pier rack stands on the Pier halt's deck (west of the rails) and the jib on the pier head's east apron; the
  // track between them is the way, short of Q6's parked machine. `lat` < 0 is the halt's side.
  const { LINKS, ORIGIN, lineAt } = await import('../../../src/place/layout.ts');
  const beside = (along: number, lat: number) => {
    const p = lineAt(LINKS[1]!.line, along, { x: 0, z: 0, ux: 0, uz: 1 });
    return { x: p.x - p.uz * lat + ORIGIN.x, z: p.z + p.ux * lat + ORIGIN.z };
  };
  // A train standing at the pier fills the track there (s 721-736): cross only while it is away.
  const trackClear = () => until(() => read().trains.every((r) => r.phase === 1 || r.at !== 3), 'no train at the pier');
  const step = async (along: number, lat: number, beat: string) => {
    if (Math.abs(lat) < 1.9) await trackClear();
    const p = beside(along, lat);
    check(await bot.straight(p.x, p.z, 0.5, 12000), beat);
    await until(() => me.coyote > 0 && !me.swimming, `${beat}: supported`, 5000);
  };
  await step(731, 0, 'down off the Pier halt onto the track');
  for (let n = 0; works().pierSet < WORKS.pier; n++) {
    check(n < WORKS.pier + 2, 'the pier takes twelve in bounded sets');
    await step(732.5, -1.2, 'beside the pier rack');
    await until(() => works().pierRack >= 1, `a footing on the pier rack (set ${n + 1})`);
    await use(pierRack, /^Shoulder a footing$/, `shoulder pier footing ${n + 1}`);
    await until(() => read().foot === 1, `pier footing ${n + 1} on the back`, 30000);
    await step(731.5, 0, 'back onto the track');
    await step(731.5, 3, 'onto the pier-head apron');
    await step(741, 3.4, 'along the apron to the jib');
    const before = works().pierSet;
    await use(pierFrame, /^Set the footing$/, `set pier footing ${n + 1}`);
    await until(() => works().pierSet > before && read().foot === 0, `pier footing ${n + 1} set`, 30000);
    await settle(`pier footing ${n + 1}`);
    await step(731.5, 3, 'back along the apron');
    await step(731.5, 0, 'back onto the track');
  }
  await until(() => works().crossing >= 0, 'twelve footed: the crossing stands', 30000);
  // The finale (whistle and two rockets at the last bent) plays on this page once the last bent stands, within 10 s.
  const finale = () => (read() as { crossingView?: { shows: number } }).crossingView?.shows ?? 0;
  await until(() => finale() >= 1, 'the crossing finale plays', 120000);
  await checkpoint('crossing footed');
}
