// One leg of the greybox route through ordinary inputs (docs/plans/greybox-route.md, step 5), driven by RAIL_LEGS: ride
// line 2 to the leg's first frame, then for each section take the kit off the rack, feed the frame, wait out the lay,
// ride on to the new railhead and step off onto its platform, until the leg's last halt is reached on foot. Prompts are
// pressed by id (`railway-leg-take-logs`, `railway-leg-take-rails`, `railway-leg-feed`). Each phase reads the rows
// first, so it resumes from `ring-joined`, `gorge-open` and `gorge-mid`. Inspection observes; it never seeds a world or
// moves a player. A fall into the sea is a finding (no recovery). Leg 1 is the only leg built (legBuilt).
import type { Bot } from '../bot.ts';
import { legRow } from '../../../src/sim/railway-queries-route.ts';
import { account, aperture, rail, railAt, railPid, railRead, rw, trains } from '../rail-read.ts';
import { me } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { RING_HALT } from '../../../src/sim/railway-ring-layout.ts';
import { RAIL_LEGS, legFrame, legRack, rowHalt } from '../../../src/sim/railway-route.ts';
import { HALT, line2Rides } from './railway-ride.ts';

export type LegRoute = { bot: Bot; checkpoint: (name: string) => Promise<void>; leg?: number };
const cm = (p: { x: number; z: number }) => ({ x: p.x / 100, z: p.z / 100 });
/** Ring Island is line 2's stop 5 (halts-view.ts); a leg's heads follow from its `railheadHalt`. */
const ISLAND = 5;

export async function legRoute({ bot, checkpoint, leg = 0 }: LegRoute) {
  const L = RAIL_LEGS[leg]!;
  const n = L.sections.length;
  const { ride, rideFrom, hopTo, view, until, check, face } = line2Rides(bot);
  const row = () => legRow(rw(), leg);
  const laid = () => row().laid;
  const island = cm(RING_HALT.down);
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

  check(aperture(rw()).joined >= 0 && legRow(rw(), leg).laid <= n, 'the seed has the ring joined, the leg open');
  check(!me.swimming, 'standing on dry ground at the start');

  for (let k = laid(); k < n; k = laid()) {
    const sec = L.sections[k]!,
      frame = legFrame(L, k),
      rack = legRack(L, k);

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
    // The frame stands on the west platform at the island; from the east platform the walk is over the tracks.
    check(await bot.walk(frame.x / 100, frame.z / 100, 3), `walked to section ${k + 1}'s frame`);
    await checkpoint(`section ${k + 1} frame reached`);

    // 2. Feed the frame the section's bill: a back of a kind at a time, from the rack.
    for (let guard = 0; row().start < 0 && laid() === k; guard++) {
      check(guard < 40, `section ${k + 1} fed in 40 trips`);
      const needL = sec.logs - row().logs,
        needR = sec.rails - row().rails;
      if (needL <= 0 && needR <= 0) break;
      const a = account(rw(), railPid())!;
      if ((a.carry > 0 && needL > 0) || (a.rails > 0 && needR > 0)) {
        await press(
          'railway-leg-feed',
          frame,
          `feed section ${k + 1}'s frame (${row().logs}/${sec.logs} logs, ${row().rails}/${sec.rails} rails)`,
        );
      } else if (needL > 0) {
        await untilTicks(() => rail(rw()).depot > 0, `logs on section ${k + 1}'s rack`, 6000);
        await press('railway-leg-take-logs', rack, `take logs for section ${k + 1}`);
      } else {
        await untilTicks(() => rail(rw()).depotRails > 0, `rails on section ${k + 1}'s rack`, 6000);
        await press('railway-leg-take-rails', rack, `take rails for section ${k + 1}`);
      }
    }

    // 3. The lay clock runs out (300 ticks) and the section is laid.
    await untilTicks(() => laid() > k, `section ${k + 1} laid`, 1500);
    await checkpoint(`section ${k + 1} laid`);

    // 4. On to the new railhead (or the leg's last halt): the first stop is the leg's `railheadHalt` + laid - 1.
    const stop = L.railheadHalt + laid() - 1;
    const last = laid() >= n;
    const here = k === 0 ? ISLAND : L.railheadHalt + k - 1;
    const lever = () => ringLevers().find((l) => l.halt === here && l.dir === 1 && l.on);
    const stands = () => ringLevers().some((l) => l.halt === here && l.stands) || here !== ISLAND;
    // The island has an outward lever on its west platform; a stack head has none (the lay asks for the train).
    const ready = k === 0 ? lever() : undefined;
    const dest = last ? cm(rowHalt('ring', L.destRowHalt)) : cm(legFrame(L, laid()));
    // While waiting for the train, say where line 2's trains are every 20 s of page time (a stall's evidence).
    const watch = setInterval(
      () =>
        console.log(
          `RAILWAY WAIT ${JSON.stringify({
            tick: railAt(),
            want: here,
            trains: trains(rw())
              .filter((t) => t.phase !== 2)
              .map((t) => [t.phase, t.at, t.to, t.track, t.depart, t.req]),
          })}`,
        ),
      20000,
    );
    await rideFrom(
      {
        name: k === 0 ? 'Ring Island' : `Stack head ${k}`,
        stop: here,
        stands,
        handle: () => (k === 0 ? lever() : undefined),
        calling: () => !!lever()?.over,
        wait: cm(legFrame(L, k)),
      },
      stop,
      { asked: k > 0 && !ready, askEach: true },
    );
    clearInterval(watch);
    await hopTo(
      dest.x,
      dest.z,
      last ? 'stepped off onto the Gorge platform' : `stepped off onto head ${laid()}'s platform`,
    );
    await until(() => me.coyote > 0 && !me.swimming, 'standing on the new platform', 10000);
  }
  await checkpoint('gorge reached');
}
