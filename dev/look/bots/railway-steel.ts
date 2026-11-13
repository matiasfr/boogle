// Ring Island build 2's part of the route through ordinary inputs (docs/plans/ring-island-build2.md, R5), from the ring
// joined to the longer boiler: ride out to the island (the kit train has put the logs and rails in the yard), take the
// logs and feed the works, take the rails and feed them, ride home when steel is on the rack (or wait for it at the
// Village), then open the garage at the Roundhouse table's lever post and hold its Install until Line.boiler is 1
// (docs/plans/garage-install-moment.md, G3). Prompts are pressed by their
// ids (`railway-steel-take-logs`, `railway-steel-take-rails`, `railway-steel-feed`, `railway-garage`). Each phase
// reads the rows first, so the bot also resumes from `steel-kit`, `steel-lit` and `steel-home` seeds. Inspection
// observes; it never seeds a world or moves a player. A fall into the sea is a finding (no recovery).
import type { Bot } from '../bot.ts';
import { account, aperture, line, railAt, railPid, railRead, rw, shed, steel } from '../rail-read.ts';
import { me } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { triggerAction } from '../../../src/player/controls.ts';
import { RING_HALT, STEEL, ringAt } from '../../../src/sim/railway-ring-layout.ts';
import { LINE2 } from '../../../src/sim/railway-lines.ts';
import { POST } from '../../../src/entities/railway/boiler-install-view.ts';
import { garage } from '../../../src/entities/railway/garage-state.ts';
import { HALT, line2Rides } from './railway-ride.ts';

export type SteelRoute = { bot: Bot; checkpoint: (name: string) => Promise<void> };
const cm = (p: { x: number; z: number }) => ({ x: p.x / 100, z: p.z / 100 });
/** Ring Island is line 2's stop 5, the Village its stop 0. */
const STOP = { village: 0, island: 5 } as const;
/** Where the hold is made from: 1.3 m west of the post, inside its 2.6 m and the table's reach. */
const POST_STAND = { x: POST.x - 1.3, z: POST.z - 0.1 };
const TICKS = 1500; // bounds below are in server ticks, never page time

export async function steelRoute({ bot, checkpoint }: SteelRoute) {
  const tools = line2Rides(bot);
  const { ride, rideFrom, hopTo, view, until, check, face } = tools;
  const st = () => steel(rw());
  const home = () => shed(rw()).steel;
  const boiler = () => line(rw(), LINE2).boiler;
  const island = cm(RING_HALT.down);
  const nearIsland = () => !!me.body && Math.hypot(me.body.position.x - island.x, me.body.position.z - island.z) < 40;
  const untilTicks = async (fn: () => unknown, beat: string, ticks = TICKS) => {
    const end = railAt() + ticks;
    while (!fn() && railAt() < end) await bot.wait(100);
    check(fn(), beat);
  };
  /** Walk to within 3 m of (x, z), then forward until the game offers prompt `id`, ready; press it as a tap, and wait
   * for the server to have confirmed it (nothing pending). */
  const press = async (id: string, at: { x: number; z: number }, beat: string) => {
    check(await bot.walk(at.x, at.z, 3), `walked to ${beat}`);
    const offered = () => {
      const t = interactTarget();
      return t?.id === id && t.run && !t.blocked ? t : null;
    };
    const end = performance.now() + 6000;
    input.keys.add('KeyW');
    while (!offered() && performance.now() < end && bot.dist(at.x, at.z) > 0.6) {
      face(at.x, at.z);
      await bot.wait(40);
    }
    input.keys.delete('KeyW');
    const t = offered();
    check(
      t,
      `${id} offered for ${beat}; the game offers ${interactTarget()?.id ?? 'nothing'}${interactTarget()?.blocked ? ` blocked "${interactTarget()!.blocked}"` : ''}, ${bot.dist(at.x, at.z).toFixed(1)} m off`,
    );
    bot.press();
    await untilTicks(() => railRead()!.pending() === 0, `${beat} confirmed by the server`, 300);
    await bot.wait(300);
  };
  const yardLogs = cm(ringAt(44475, 830)),
    yardRails = cm(ringAt(44660, 830)),
    door = cm(ringAt(45200, 540));

  check(aperture(rw()).joined >= 0, 'the seed has the ring joined (the island is open)');
  check(!me.swimming, 'standing on dry ground at the start');

  // 1. Out to the island: with the ring joined, line 2 runs end to end to the island halt, so one ride from the Village
  // passes the Railhead (no stop there unless asked); step off onto the island halt's platform.
  if (st().lit < 0 && !nearIsland()) {
    const rode = await ride(HALT.village2, STOP.island);
    await hopTo(island.x, island.z, 'stepped across to the island halt');
    await until(() => !rode.aboard() && me.coyote > 0 && !me.swimming, 'standing on the island halt', 10000);
    await checkpoint('island reached');
  }

  // 2. The kit is in the yard (the kit train's errand); take and feed, logs then rails, until the works is lit.
  if (st().lit < 0) {
    await untilTicks(
      () => st().yardLogs + st().logs >= STEEL.logs && st().yardRails + st().rails >= STEEL.rails,
      'the whole kit at the island yard',
      6000,
    );
    for (const kind of ['logs', 'rails'] as const)
      for (let n = 0; n < 8 && (kind === 'logs' ? st().yardLogs : st().yardRails) > 0 && st().lit < 0; n++) {
        await press(`railway-steel-take-${kind}`, kind === 'logs' ? yardLogs : yardRails, `take ${kind} (${n + 1})`);
        const a = account(rw(), railPid())!;
        check((kind === 'logs' ? a.carry : a.rails) > 0, `${kind} on the back after the take`);
        await press('railway-steel-feed', door, `feed the works the ${kind} (${n + 1})`);
      }
    await untilTicks(() => st().lit >= 0, 'the works lit', 600);
    await checkpoint('steel works lit');
  }

  // 3. The first steel on its rack; home by the next train (or wait for it at the Village).
  if (home() < 1) {
    if (nearIsland()) {
      await untilTicks(() => st().rack >= 1, 'the first steel on the rack', 3000);
      // The island's homeward lever (halts-view.ts, u 457), as a rider asks for the train home.
      const levers = () =>
        (
          view() as unknown as {
            ringLevers: { halt: number; dir: number; on: boolean; over: boolean; x: number; z: number }[];
          }
        ).ringLevers;
      const homeward = () => levers().find((l) => l.halt === STOP.island && l.dir === -1 && l.on);
      await rideFrom(
        {
          name: 'Ring Island',
          stop: STOP.island,
          stands: () => !!homeward(),
          handle: (dir) => {
            const l = levers().find((x) => x.halt === STOP.island && x.dir === dir && x.on);
            return l && { over: l.over, x: l.x, z: l.z };
          },
          calling: () => !!homeward()?.over,
          wait: { x: homeward()!.x, z: homeward()!.z },
        },
        STOP.village,
      );
    }
    await untilTicks(() => home() >= 1, 'the first steel home in the bay', 12000);
    await checkpoint('steel home');
  }

  // 4. The Install: Interact at the garage's post opens it on the Longer boiler; the same button held is the install.
  if (boiler() < 1) {
    check(await bot.walk(POST_STAND.x, POST_STAND.z, 0.8), 'walked to the garage post');
    face(POST.x, POST.z);
    await until(() => interactTarget()?.id === 'railway-garage', 'the garage is offered at the post', 20000);
    const t = interactTarget()!;
    check(t.run && !t.blocked, `the garage opens, not blocked "${t.blocked ?? ''}"`);
    bot.press();
    await until(() => garage.api?.snap().open, 'the garage opened', 8000);
    const opened = garage.api!.snap();
    check(opened.sel === 'long' && opened.canInstall, `it opened on the Longer boiler, ready (${opened.sel})`);
    await bot.wait(700); // the camera's glide
    // Held through the interact action itself: down now, up once the server has fitted it.
    triggerAction('interact', 'down');
    try {
      await untilTicks(() => boiler() >= 1, 'Line.boiler is 1 after the hold', 600);
    } finally {
      triggerAction('interact', 'up');
    }
    // The moment is the installer's own: it runs to its end (about 4 s), then Back is theirs again.
    await until(() => garage.api?.snap().phase === 'idle', 'the install moment ran to its end', 15000);
    garage.api!.close();
    await checkpoint('boiler installed');
  }
}
