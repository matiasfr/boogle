// Riding line 2 by ordinary inputs, shared by the Split-rock Works bot (railway-works.ts: Village, Quarry, Pier) and the
// Ring Island bot (railway-ring.ts: Village to the Railhead, the Railhead to the island). Inspection observes; it never
// seeds a world or moves a player.
import type { Bot } from '../bot.ts';
import { inspectRailway, rw, trains as trainRows } from '../rail-read.ts';
import { me, cam } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';

type Scene = NonNullable<ReturnType<typeof inspectRailway>>;
type Trains = ReturnType<
  Awaited<ReturnType<typeof import('../../../src/entities/railway/train-view.ts').createRailwayTrains>>['inspect']
>;
type Halts = ReturnType<
  Awaited<ReturnType<typeof import('../../../src/entities/railway/halts-view.ts').createRailwayHalts>>['inspect']
>;

/** Line 2's halts in `view().halts`: Place's five, then the Pier halt. */
export const HALT = { village2: 2, quarry: 3, pier: 5 } as const;

export function line2Rides(bot: Bot) {
  const scene = () => inspectRailway()!;
  const trains = () => trainRows(rw());
  const view = () => scene().line2View as Scene['line2View'] & Trains & Halts;
  const check = (ok: unknown, beat: string) => {
    if (!ok) throw new Error(beat);
  };
  // The page races about 10x faster than the authority: these are page-time budgets, not schedules.
  const until = async (fn: () => unknown, beat: string, ms = 2400000) => check(await bot.until(fn, ms, beat), beat);
  const face = (x: number, z: number) => {
    const p = me.body!.position;
    cam.yaw = me.yaw = Math.atan2(-(x - p.x), -(z - p.z));
  };

  /** Request a line-2 train at `haltId` by its lever, the handle the way to `destination`, board it by a real jump,
   * ask for a middle `destination` aboard ("Request stop: <halt>"), ride there. The Pier and the Works' halts are in
   * `view().halts`: step off onto them. The Railhead and Ring Island are not (their platforms are the ring's own): the
   * ride ends with the train standing there and the rider aboard, and the caller steps off. */
  const ride = (haltId: number, destination: number, opts?: { askEach?: boolean }) => {
    const halt = () => view().halts[haltId]!;
    return rideFrom(
      {
        name: halt().name,
        stop: halt().stop,
        stands: () => halt().up,
        handle: (dir) => halt().lever.find((h) => h.on && h.dir === dir),
        calling: () => halt().calling,
        wait: halt(),
      },
      destination,
      opts,
    );
  };
  /** A departure: a halt's name and stop, when it stands, the lever handle for a way, whether its signal is down for a
   * request, and the spot to wait at. Line 2's `halts` rows fit it; so do the Railhead's and the island's `ringLevers`. */
  type Departure = {
    name: string;
    stop: number;
    stands: () => boolean;
    handle: (dir: 1 | -1) => { over: boolean; x: number; z: number } | undefined;
    /** Before the lever press: a platform above the walk (the Railhead's outbound one) is climbed onto first. */
    before?: (lever: { x: number; z: number }) => Promise<void>;
    calling: () => boolean;
    wait: { x: number; z: number };
  };
  /** `askEach`: the destination is not a Place halt (the stack line's), so
   * ask for each next stop the train offers aboard ("Request stop: ...") until it stands at the destination. */
  const rideFrom = async (halt: Departure, destination: number, opts: { askEach?: boolean } = {}) => {
    await until(halt.stands, `${halt.name} halt stands`);
    const dir: 1 | -1 = destination > halt.stop ? 1 : -1;
    const standing = () =>
      view()
        .trains.filter((t) => t.line === 1)
        .find((t) => {
          const r = trains()[t.slot]!;
          return r.phase === 0 && r.at === halt.stop && (r.track ? -1 : 1) === dir;
        })?.slot;
    const request = async () => {
      const handle = halt.handle(dir);
      check(handle, `${halt.name} has a handle toward stop ${destination}`);
      if (!handle!.over) await halt.before?.(handle!);
      if (!handle!.over && !(await bot.use(handle!.x, handle!.z, `request a train at ${halt.name}`, /^Request stop/)))
        check(false, `request a train at ${halt.name} offered`);
      await until(() => halt.calling() || standing() !== undefined, `${halt.name} signal drops or train stands`);
    };
    if (standing() === undefined) await request();
    check(await bot.walk(halt.wait.x, halt.wait.z, 0.5), `walked to ${halt.name}'s platform edge`);
    // Whichever of line 2's trains stops for the lever is the ride (v26).
    // The first train can leave during the walk to the edge. Re-read the signal and use the real lever again.
    const waitEnd = performance.now() + 2400000;
    while (standing() === undefined && performance.now() < waitEnd) {
      if (!halt.calling()) {
        await request();
        check(await bot.walk(halt.wait.x, halt.wait.z, 0.5), `returned to ${halt.name}'s platform edge`);
      }
      await bot.wait(100);
    }
    check(standing() !== undefined, `a train toward stop ${destination} stands at ${halt.name}`);
    const slot = standing()!;
    const row = () => trains()[slot]!;
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
    const to = view().halts.find((h) => h.line === 1 && h.stop === destination);
    if (to && to.lever.filter((h) => h.on).length === 2) {
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
    const asked = new Set<string>();
    await until(() => {
      check(aboard() && !me.swimming, 'rider stays aboard the line-2 train');
      const ask = interactTarget();
      if (opts.askEach && ask?.id === 'railway-request-aboard' && ask.run && !ask.blocked && !asked.has(ask.verb)) {
        asked.add(ask.verb);
        bot.press();
      }
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
    if (!to) return { slot, row, train, aboard };
    // Come in going up at a middle halt, the train stands at the up platform: step off onto it, then walk to today's
    // side over the plank crossing (generic-lines, finding 5), never across the running tracks.
    const arrivalId = view().halts.findIndex((h) => h.line === 1 && h.stop === destination);
    const arrival = view().halts[arrivalId]!;
    const up = view().upPlatforms.find((u) => u.pair === arrivalId);
    if (up && row().track === 0) {
      check(await bot.straight(up.x, up.z, 0.5, 12000), `stepped off onto the ${arrival.name} up platform`);
      await until(() => !aboard() && me.coyote > 0, 'off the train, on the up platform', 10000);
      for (const [i, p] of up.path.entries())
        check(await bot.straight(p.x, p.z, 0.5, 12000), `${arrival.name} plank crossing, step ${i + 1}`);
    }
    check(await bot.straight(arrival.x, arrival.z, 0.5, 12000), `stepped across to the ${arrival.name} halt`);
    await until(() => !aboard() && me.coyote > 0, 'stepped off the train onto the halt', 10000);
    return { slot, row, train, aboard };
  };
  /** Off a car over its side rail onto a platform at (x, z): W at it with a jump on each landing, as boarding does. */
  const hopTo = async (x: number, z: number, beat: string, ms = 15000, r = 1.5, minY = -Infinity) => {
    const there = () =>
      Math.hypot(me.body!.position.x - x, me.body!.position.z - z) <= r && me.body!.position.y >= minY;
    const end = performance.now() + ms;
    try {
      while (!there() && performance.now() < end) {
        face(x, z);
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
    check(there(), beat);
  };
  return { ride, rideFrom, hopTo, view, until, check, face };
}
