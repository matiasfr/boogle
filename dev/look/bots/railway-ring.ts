// Ring Island's part of the route through ordinary inputs (docs/plans/ring-island-build1.md, R5), from an accepted
// `--rail-seed gap-footed` or `leaf-raised` (the fourteen bent footings set, the leaf raised on its pawl, the
// counterweight's four footings on the railhead rack): ride line 2 from the Village to the Railhead, run off its end and
// glide the gap to the brace platform, knock out the pawl, hook back to the railhead's pad, hang the four weights, wait
// for the leaf to land, strike the rivet (the Meet), then ride from the Railhead to the island halt and step off.
// Inspection observes; it never seeds a world or moves a player. A fall into the sea is a finding (no recovery).
import type { Bot } from '../bot.ts';
import { aperture, inspectRailway, rail, railAt, railBack, ringOpen, rw } from '../rail-read.ts';
import { me, cam } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import {
  RING_BRACE,
  RING_BRACE_PLATFORM,
  RING_HALT,
  RING_HEAD,
  RING_RIVET,
  ringAt,
} from '../../../src/sim/railway-ring-layout.ts';
import { glideAcross, hookTo } from './railway.ts';
import { HALT, line2Rides } from './railway-ride.ts';

export type RingRoute = { bot: Bot; checkpoint: (name: string) => Promise<void> };
const cm = (p: { x: number; z: number }) => ({ x: p.x / 100, z: p.z / 100 });
/** Ring Island is line 2's stop 5 and the Railhead its stop 4 (halts-view.ts). */
const STOP = { railhead: 4, island: 5 } as const;

export async function ringIslandRoute({ bot, checkpoint }: RingRoute) {
  const { ride, hopTo, view, until, check } = line2Rides(bot);
  const ap = () => aperture(rw());
  const head = () => RING_HEAD[ringOpen(rw()).head]!;
  const foot = () => railBack().foot;
  const leaf = () => (inspectRailway()?.worksView as { leafView?: { deg: number; moving: boolean } } | null)?.leafView;
  /** Use a site on the railhead platform. As the platform slides out a bent the player is left on the walkway, 0.9 m
   * below it with no way up the planner knows: hop up onto it first, as a person would. */
  const use = async (p: { x: number; z: number; y?: number }, verb: RegExp, beat: string) => {
    const x = p.x / 100,
      z = p.z / 100;
    if (p.y !== undefined && me.body!.position.y < p.y / 100 - 0.5) {
      await hopTo(x, z, `onto the platform for ${beat}`, 15000, 1.5, p.y / 100 - 0.5);
    }
    check(await bot.use(x, z, beat, verb), `${beat} offered`);
  };
  check(ap().cw === 0 && ap().brace === 1 && ap().joined < 0, 'the seed is before the weights, the leaf raised');
  check(rail(rw()).glide, 'the room has taken the glider (the ring seeds carry it)');

  // 1. Line 2 from the Village to the Railhead, the end of the line; step off onto its platform.
  const rode = await ride(HALT.village2, STOP.railhead);
  const platform = cm(head().platform);
  await hopTo(platform.x, platform.z, 'stepped off the train onto the railhead platform');
  await until(() => !rode.aboard() && me.coyote > 0 && !me.swimming, 'standing on the railhead platform', 10000);
  await checkpoint('railhead reached');

  // 1b. From `deck-laid`: the fourteen bent footings, each from the railhead rack to its jib; the railhead moves out a
  // bent for each pair. The wagon brings six a load, about 70 s apart: wait on the server's ticks, never on page time
  // (a solo look warps the page about 12x and not the server).
  const TICKS_PER_LOAD = 3000;
  const untilTicks = async (fn: () => unknown, beat: string, ticks = TICKS_PER_LOAD) => {
    const end = railAt() + ticks;
    while (!fn() && railAt() < end) await bot.wait(100);
    check(fn(), beat);
  };
  const bents = ap().set < 14;
  let idle = 0;
  while (ap().set < 14) {
    const n = ap().set;
    const waited = railAt();
    await untilTicks(() => ap().rack >= 1, `a footing on the railhead rack (bent ${n + 1})`);
    idle += railAt() - waited;
    await untilTicks(() => ringOpen(rw()).head === Math.floor(n / 2), `the railhead stands at bent ${n}`, 200);
    await bot.wait(4500); // the kit slides out about 3.8 s after the bent stands, at 7 m/s: no prompt while it moves
    const slide = () =>
      (view() as unknown as { ringLevers: RingLever[] }).ringLevers.find(
        (l) => l.halt === STOP.railhead && l.dir === -1,
      );
    await until(
      () => !slide() || Math.abs(slide()!.u - slide()!.goal) < 0.05,
      `the railhead slid out to bent ${n}`,
      60000,
    );
    await bot.wait(2500);
    await use(head().rack, /Shoulder a footing/, `shoulder bent footing ${n + 1}`);
    await untilTicks(() => foot() === 1, `bent footing ${n + 1} on the back`, 300);
    await use(head().jib, /Set the footing/, `set bent footing ${n + 1}`);
    await untilTicks(() => ap().set === n + 1 && foot() === 0, `bent footing ${n + 1} set`, 300);
  }
  if (bents) {
    bot.note(`BENTS idle at the rack ${(idle / 10).toFixed(0)} s of server time over 14 footings`);
    await checkpoint('gap footed');
  }

  // 2. The gap: a sprint along the platform, a jump at its end, the glide to the brace platform.
  const mid = RING_BRACE_PLATFORM.lat0 / 2 + RING_BRACE_PLATFORM.lat1 / 2;
  const landing = cm(ringAt((RING_BRACE_PLATFORM.u0 + RING_BRACE_PLATFORM.u1) / 2, mid));
  const lane = 400;
  const runFrom = cm(ringAt(head().u - 1400, lane));
  // A platform that has slid out leaves the player on the walkway below it: hop up first (as `use` does at the rack).
  if (me.body!.position.y < head().platform.y / 100 - 0.5)
    await hopTo(runFrom.x, runFrom.z, 'onto the railhead platform', 15000, 1, head().platform.y / 100 - 0.5);
  check(await bot.walk(runFrom.x, runFrom.z, 1), 'walked to the run-up');
  const a = ringAt(head().u - 1000, lane),
    b = ringAt(head().u, lane);
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const ahead = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
  // Metres past the platform's end (negative short of it).
  const past = () => ((me.body!.position.x * 100 - b.x) * ahead.x + (me.body!.position.z * 100 - b.z) * ahead.z) / 100;
  const face = () => {
    const p = me.body!.position;
    cam.yaw = me.yaw = Math.atan2(-(landing.x - p.x), -(landing.z - p.z));
    cam.pitch = -0.2;
  };
  let flight: Awaited<ReturnType<typeof glideAcross>>;
  face();
  input.keys.add('KeyW');
  input.keys.add('ShiftLeft');
  try {
    while (past() < -0.9) {
      face();
      await bot.wait(30);
    }
    pressJump();
    await bot.wait(120);
    releaseJump();
    await until(() => me.coyote <= 0, 'left the railhead platform', 3000);
    await until(() => me.body!.velocity.y < -0.5, 'past the apex, falling', 3000);
    flight = await glideAcross(bot, landing, { releaseWithin: 5, pitch: -0.3, budgetMs: 40000 });
  } finally {
    input.keys.delete('KeyW');
    input.keys.delete('ShiftLeft');
    releaseJump();
  }
  await bot.wait(400);
  const at = me.body!.position;
  bot.note(
    `GAP GLIDE ${JSON.stringify({ samples: flight.samples.length, landed: [at.x, at.y, at.z].map((n) => +n.toFixed(1)) })}`,
  );
  check(!me.swimming, 'the glide lands dry on the brace platform (not the sea)');
  check(Math.hypot(at.x - landing.x, at.z - landing.z) < 8, 'landed on the brace platform');
  await checkpoint('gap glided');

  // 3. The pawl, at the gold strut.
  await use(RING_BRACE, /Knock out the pawl/, 'knock out the pawl');
  await until(() => ap().brace === 2, 'the leaf braced', 30000);
  await checkpoint('leaf braced');

  // 4. Back to the railhead's gold pad by the hook ring on the sea pile.
  await hookTo(bot, 'island');
  await checkpoint('hooked back');

  // 5. Four counterweight footings, rack to jib; the fourth brings the leaf down.
  for (let n = 1; n <= 4; n++) {
    await until(() => ap().rack >= 1, `a footing on the railhead rack (${n})`, 600000);
    await use(head().rack, /Shoulder a footing/, `shoulder counterweight ${n}`);
    await until(() => foot() === 1, `counterweight ${n} on the back`, 30000);
    await use(head().jib, /Hang the weight/, `hang the weight ${n}`);
    await until(() => ap().cw === n || ap().brace === 0, `weight ${n} hung`, 30000);
  }
  await until(() => ap().brace === 0, 'the leaf comes down', 30000);
  await until(() => leaf()?.deg === 0 && !leaf()?.moving, 'the leaf has landed', 30000);
  await checkpoint('counterweight hung');

  // 6. The rivet over the joint.
  await use(RING_RIVET, /Strike the rivet/, 'strike the rivet');
  await until(() => ap().joined >= 0, 'the ring joined', 30000);
  await bot.wait(6500); // the Meet's shot plays on this page
  await checkpoint('ring joined');

  // 7. Outward from the Railhead to the island halt; step off onto its platform.
  await rideToIsland(bot, line2Rides(bot));
  await checkpoint('ring ridden');
}
/** Outward from the Railhead (stop 4) to the island halt, from a rider standing on the Railhead's platform or the
 * joint's west one; steps off onto the island halt's platform. Shared with the steel bot (railway-steel.ts). */
export async function rideToIsland(bot: Bot, { rideFrom, hopTo, view, until }: ReturnType<typeof line2Rides>) {
  const levers = () => (view() as unknown as { ringLevers: RingLever[] }).ringLevers;
  const outward = () => levers().find((l) => l.halt === STOP.railhead && l.dir === 1 && l.on);
  const levers0 = () => `RING LEVERS ${JSON.stringify({ at: me.body!.position, levers: levers() })}`;
  const train = await rideFrom(
    {
      name: 'Railhead',
      stop: STOP.railhead,
      stands: () => !!outward(),
      handle: (dir) => {
        const l = levers().find((x) => x.halt === STOP.railhead && x.dir === dir && x.on);
        return l && { over: l.over, x: l.x, z: l.z };
      },
      calling: () => !!outward()?.over,
      before: async (lever) => {
        // The outbound lever stands on the joint's west platform, 0.9 m above the deck the bot walked onto: hop up to it.
        await bot.walk(lever.x, lever.z, 3);
        const p = me.body!.position,
          d = Math.hypot(lever.x - p.x, lever.z - p.z) || 1;
        await hopTo(
          lever.x + ((lever.x - p.x) / d) * 0.9,
          lever.z + ((lever.z - p.z) / d) * 0.9,
          'onto the outbound platform',
          15000,
          0.5,
        );
      },
      wait: { x: outward()!.x, z: outward()!.z },
    },
    STOP.island,
  ).catch((error: unknown) => {
    console.log(levers0());
    throw error;
  });
  const island = cm(RING_HALT.down);
  await hopTo(island.x, island.z, 'stepped across to the island halt');
  await until(() => !train.aboard() && me.coyote > 0 && !me.swimming, 'standing on the island halt', 10000);
}
type RingLever = {
  halt: number;
  dir: number;
  on: boolean;
  over: boolean;
  x: number;
  z: number;
  u: number;
  goal: number;
};
