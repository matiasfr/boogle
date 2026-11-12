// Ring Island build 2's part of the route through ordinary inputs (docs/plans/ring-island-build2.md, R5), from the ring
// joined to the longer boiler: ride out to the island (the kit train has put the logs and rails in the yard), take the
// logs and feed the works, take the rails and feed them, ride home when steel is on the rack (or wait for it at the
// Village), then hold the Install at the Roundhouse table's post until Line.boiler is 1. Prompts are pressed by their
// ids (`railway-steel-take-logs`, `railway-steel-take-rails`, `railway-steel-feed`, `railway-install`). Each phase
// reads the rows first, so the bot also resumes from `steel-kit`, `steel-lit` and `steel-home` seeds. Inspection
// observes; it never seeds a world or moves a player. A fall into the sea is a finding (no recovery).
import type { Bot } from '../bot.ts';
import {
  account,
  aperture,
  line,
  railAt,
  railPid,
  railRead,
  rw,
  shed,
  steel,
} from '../rail-read.ts';
import { me } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { triggerAction } from '../../../src/player/controls.ts';
import { RING_HALT, STEEL, ringAt } from '../../../src/sim/railway-ring-layout.ts';
import { PLAYER_R } from '../../../src/constants.ts';
import { CARRY, carry } from '../../../src/physics/platforms.ts';
import { LINE2 } from '../../../src/sim/railway-lines.ts';
import { HALT, line2Rides } from './railway-ride.ts';

export type SteelRoute = { bot: Bot; checkpoint: (name: string) => Promise<void> };
const cm = (p: { x: number; z: number }) => ({ x: p.x / 100, z: p.z / 100 });
/** Ring Island is line 2's stop 5, the Village its stop 0. */
const STOP = { village: 0, island: 5 } as const;
/** The install's post (boiler-install-view.ts POST: the table's centre plus 5.2 m east, 0.2 m south). */
const POST = { x: 923.2, z: 12.2 };
/** Where the hold is made from: 1.3 m west of the post, inside its 2.6 m and the table's reach. */
const POST_STAND = { x: 921.9, z: 12.1 };
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
      const sample = carryProbe(bot);
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
      ).finally(sample);
    }
    await untilTicks(() => home() >= 1, 'the first steel home in the bay', 12000);
    await checkpoint('steel home');
  }

  // 4. The Install: a hold at the table's post.
  if (boiler() < 1) {
    check(await bot.walk(POST_STAND.x, POST_STAND.z, 0.8), 'walked to the install post');
    face(POST.x, POST.z);
    await until(() => interactTarget()?.id === 'railway-install', '"Install the longer boiler" offered', 20000);
    const t = interactTarget()!;
    check(t.run && !t.blocked, `the install is ready, not blocked "${t.blocked ?? ''}"`);
    // Held through the interact action itself (the garage's hold is the same press): down now, up once it is done.
    triggerAction('interact', 'down');
    try {
      await untilTicks(() => boiler() >= 1, 'Line.boiler is 1 after the hold', 600);
    } finally {
      triggerAction('interact', 'up');
    }
    await checkpoint('boiler installed');
  }
}

/** The carry terms (src/physics/platforms.ts deckUnder) every frame, kept for the last 8, and written out when the deck
 * lets go of the rider: lx and lz against the deck's half sizes plus the edge, the feet gap against above and below, and
 * the body's vertical speed minus the carry's against leaveVy. The first term out of bounds is the cause. */
function carryProbe(bot: Bot) {
  type Rec = Record<string, number | string | null>;
  const last: Rec[] = [];
  let on = false,
    live = true,
    wasId = '';
  const frame = () => {
    if (!live) return;
    const b = me.body!,
      p = carry.on;
    if (p) {
      const q = p.body.position,
        yaw = Math.atan2(
          2 * (p.body.quaternion.w * p.body.quaternion.y + p.body.quaternion.x * p.body.quaternion.z),
          1 - 2 * (p.body.quaternion.y ** 2 + p.body.quaternion.x ** 2),
        );
      const rx = b.position.x - q.x,
        rz = b.position.z - q.z,
        c = Math.cos(yaw),
        s = Math.sin(yaw);
      const lx = rx * c - rz * s,
        lz = rx * s + rz * c;
      const feet = b.position.y - PLAYER_R - q.y;
      const top = p.topAt?.(lx, lz, feet) ?? p.top;
      last.push({
        id: p.id ?? '',
        z: +b.position.z.toFixed(1),
        lx: +lx.toFixed(2),
        lxMax: +(p.hx + CARRY.edge).toFixed(2),
        lz: +lz.toFixed(2),
        lzMax: +(p.hz + CARRY.edge).toFixed(2),
        gapRaw: +(feet - top).toFixed(3),
        vyRel: +(b.velocity.y - carry.y).toFixed(3),
        vy: +b.velocity.y.toFixed(3),
        carryY: +carry.y.toFixed(3),
      });
      if (last.length > 8) last.shift();
      on = true;
      wasId = p.id ?? '';
    } else if (on) {
      on = false;
      bot.note(
        `carry let go of ${wasId}: ${JSON.stringify({ limits: { above: CARRY.above, below: CARRY.below, leaveVy: CARRY.leaveVy }, last, vyNow: +b.velocity.y.toFixed(3), z: +b.position.z.toFixed(1), coyote: me.coyote })}`,
      );
    }
  };
  const timer = setInterval(frame, 40);
  return () => {
    live = false;
    clearInterval(timer);
    bot.note(`carry probe ended: ${JSON.stringify({ on, last: last.slice(-6) })}`);
  };
}
