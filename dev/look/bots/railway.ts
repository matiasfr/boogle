// Production T1 through real inputs. Observation is typed/read-only; no legacy Place module or debug mutation loads.
import { makeBot } from '../bot.ts';
import { inspectRailway, type RailwayViewInspection } from '../../../src/entities/railway/state.ts';
import { me, cam } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import { carry } from '../../../src/physics/platforms.ts';
import { playMark } from '../../../src/proto/mark.ts';
import { RAILWAY_SUPPLY, RAILWAY_T1 as T1 } from '../../../src/sim/railway-layout.ts';
import { PLAYER_R } from '../../../src/constants.ts';
import { fallArrival } from '../../../src/fall/arrival.ts';
import { onRemotePresence, remotes } from '../../../src/netplay/net.ts';

export async function play({ stopBeforeReward = false } = {}) {
  const query = new URLSearchParams(location.search);
  const player = query.get('player');
  const coop = player === '1' || player === '2';
  const second = player === '2';
  const remoteProof = new Map<string, { x: number; z: number; hat: boolean }>();
  if (coop)
    onRemotePresence((remote, presence) => {
      if (remote.entered && Array.isArray(presence.p))
        remoteProof.set(remote.peer, {
          x: presence.p[0] as number,
          z: presence.p[2] as number,
          hat: presence.railwayCosmetic === 'hat',
        });
      else remoteProof.delete(remote.peer);
    });
  const bot = makeBot({
    recover: () => {
      throw new Error('Production T1 needed recovery; no relocation is permitted');
    },
  });
  const read = (): RailwayViewInspection => {
    const state = inspectRailway();
    if (!state) throw new Error('Production railway view is unavailable');
    return state;
  };
  const require = (ok: unknown, beat: string) => {
    bot.check(beat, ok);
    if (!ok) throw new Error(beat);
  };
  const until = async (fn: () => unknown, beat: string, ms = 90000) => require(await bot.until(fn, ms, beat), beat);
  const mark = (name: string) => {
    const state = read();
    document.documentElement.dataset.railwayBeat = name;
    playMark(name, { tick: state.tick, stock: state.stock, carry: state.carry, completion: state.completion });
    bot.note(name);
    console.log(`RAILWAY CHECKPOINT ${JSON.stringify({ beat: name, player: player ?? 'solo', ...state })}`);
  };
  const dismiss = async (name: string) => {
    await until(() => read().reward.showing, `${name} appears`);
    await bot.wait(1600); // Existing reveal minimum is 1.5 seconds; use the real dismissal key after it.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
    await until(() => !read().reward.showing, `${name} dismissed with Interact`);
  };
  const walk = async (x: number, z: number, radius = 1.8) =>
    require(await bot.walk(x, z, radius), `walked to ${x.toFixed(1)}, ${z.toFixed(1)} without recovery`);
  const face = (x: number, z: number) => {
    const p = me.body!.position;
    cam.yaw = me.yaw = Math.atan2(-(x - p.x), -(z - p.z));
  };
  const aboard = () => carry.on?.id === 'railway:T1:flatbed' || carry.on?.id === 'railway:T1:loco';
  try {
    await until(() => !!me.body && inspectRailway()?.ready, 'verified production room ready', 300000);
    await until(() => !fallArrival.active && me.coyote > 0 && !me.swimming, 'opening arrival lands dry', 300000);
    require(!('__place' in window), 'production does not install the mutable legacy Place surface');
    require(read().phase === 'asleep' &&
      read().carry === 0 &&
      read().counts.total === RAILWAY_SUPPLY, 'fresh production T1 starts with conserved finite sources');
    if (coop) await until(() => read().accounts.length === 2, 'both independent players joined the railway', 300000);
    const [{ PATH_SAMPLES }, layout] = await Promise.all([
      import('../../../src/proto/place/terrain.ts'),
      import('../../../src/proto/place/layout.ts'),
    ]);
    mark('T1 opening started');
    const path = PATH_SAMPLES[0]!;
    for (let index = 0; index < path.length; index += 3) {
      const point = path[index]!;
      await walk(point[0] + layout.ORIGIN.x, point[1]);
    }
    const machine = read().machine;
    if (coop) {
      await walk(machine.x, machine.z, 3);
      if (!second)
        await until(
          () =>
            [...remoteProof].some(
              ([peer, p]) => remotes.has(peer) && Math.hypot(p.x - machine.x, p.z - machine.z) <= 3.2,
            ),
          'friend completes the opening walk before wake',
          300000,
        );
    }
    if (!second)
      require(await bot.use(machine.x, machine.z, 'wake the machine', /^Wake it up$/), 'machine wake offered');
    await until(() => read().ready && read().phase === 'idle', 'verified wake readiness', 300000);
    mark('awake');
    await until(() => read().reward.multiReveals === 1, 'multi-axe reveals once after the accepted wake');
    await dismiss('multi-axe reveal');
    mark('T1 multi-axe dismissed');

    if (second)
      await until(
        () => read().stock === 16 && read().delivered === 16,
        'friend supplied the first sixteen logs',
        300000,
      );
    const loads = coop ? (second ? 1 : 2) : 3;
    const deliveredBefore = second ? 16 : 0;
    for (let load = 0; load < loads; load++) {
      let attempts = 0;
      while (read().carry < T1.carry) {
        require(++attempts <= 16, `load ${load + 1} found enough reachable finite logs`);
        const p = me.body!.position;
        const candidates = read()
          .trees.filter((tree) => !tree.cleared && tree.remaining > 0)
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
        let tree: RailwayViewInspection['trees'][number] | undefined;
        for (const candidate of candidates.slice(0, 16)) {
          const route = await bot.plan(candidate.x, candidate.z, 2.6);
          if (route.arrives && route.path.every((point) => point.y >= 3)) {
            tree = candidate;
            break;
          }
        }
        require(tree, `load ${load + 1} has a physically reachable source`);
        const chosen = tree!;
        await walk(chosen.x, chosen.z, 2.6);
        face(chosen.x, chosen.z);
        const before = read().carry;
        for (let swing = 0; swing < 100 && read().carry < T1.carry; swing++) {
          const target = interactTarget();
          if (!target?.click || target.verb !== 'Chop') break;
          bot.press();
          await bot.wait(380);
          if (read().trees.find((source) => source.id === chosen.id)?.remaining === 0) break;
        }
        await until(() => read().pending === 0, 'harvest requests reach terminal outcomes', 300000);
        require(read().carry > before, `source ${chosen.id} transferred accepted logs`);
      }
      require(read().carry === 8, `load ${load + 1} carries the unchanged eight logs`);
      mark(`T1 load ${load + 1} carried`);
      const station = read().station;
      await walk(station.x, station.z, 3);
      await until(() => read().carry === 0 && read().pending === 0, `load ${load + 1} automatically deposited`, 300000);
      require(read().delivered ===
        deliveredBefore + (load + 1) * 8, `load ${load + 1} has exact accepted delivery count`);
      mark(`T1 load ${load + 1} deposited`);
    }

    await until(() => ['deposit', 'feeding', 'laying'].includes(read().phase), 'funded T1 construction begins', 300000);
    mark('T1 funded');
    // A real boarding attempt; no fixture positioning, platform assignment or recovery teleport.
    const ride = query.get('ride') === '1';
    if (ride) {
      const machine = read().machine;
      await walk(machine.x, machine.z, 3);
      const end = performance.now() + 15000;
      while (!aboard() && performance.now() < end && read().phase !== 'done') {
        const target = read().machine;
        face(target.x, target.z);
        input.keys.add('KeyW');
        if (me.coyote > 0) pressJump();
        await bot.wait(120);
        releaseJump();
        if (aboard()) break;
        await bot.wait(80);
      }
      input.keys.delete('KeyW');
      require(aboard(), 'boarded the T1 layer with a real jump');
      mark('T1 layer boarded');
      let lostAt = 0;
      await until(
        () => {
          if (aboard()) lostAt = 0;
          else if (!lostAt) lostAt = performance.now();
          require(!lostAt || performance.now() - lostAt < 900, 'remained aboard the moving T1 layer');
          require(!me.swimming, 'T1 rider remained dry');
          return read().completion === 1;
        },
        'T1 completes with its rider aboard',
        300000,
      );
      mark('T1 layer ride completed');
    } else bot.note('T1 layer riding is a separate --query ride=1 proof; this run does not claim it');
    await until(() => read().completion === 1 && read().phase === 'done', 'T1 laid once', 300000);
    require(read().used === 24 &&
      read().allocation === 0 &&
      read().stock === 0, 'exactly 24 logs embodied in the finished T1 stretch');
    require(read().counts.total === RAILWAY_SUPPLY &&
      read().counts.completion === 1, 'all 3880 logs conserved with one completion');
    mark('T1 laid');

    const line = layout.LINKS[0]!;
    const point = { x: 0, z: 0, ux: 0, uz: 1 };
    const s = T1.toCm / 100 + 4;
    layout.lineAt(line.line, s, point);
    await walk(point.x + layout.ORIGIN.x, point.z, 0.8);
    await until(() => me.coyote > 0 && !me.swimming, 'standing on laid T1 track');
    require(Math.abs(me.body!.position.y - PLAYER_R - layout.railY(line.line, s)) <
      1, 'player stands at the new track surface');
    mark('T1 track stood on');

    const reward = read().reward;
    if (stopBeforeReward) {
      await walk(reward.x, reward.z, 2);
      mark('T1 unopened reward reached');
      return;
    }
    require(await bot.use(reward.x, reward.z, 'open the T1 cosmetic box', /^Open/), 'T1 box interaction offered');
    await until(() => read().reward.claimed && read().reward.owned, 'T1 claim and cosmetic stored together', 300000);
    await until(() => read().reward.revealCount === 1, 'T1 reward reveals once');
    require(read().reward.claims === 1 && !read().reward.error, 'one successful personal T1 claim');
    mark('T1 cosmetic claimed');
    await dismiss('conductor hat reveal');
    await bot.wait(400);
    require(read().counts.total === RAILWAY_SUPPLY &&
      read().completion === 1 &&
      read().reward.claims === 1, 'riding, standing and opening do not change conserved construction balances');
    if (coop)
      await until(
        () => [...remoteProof].some(([peer, p]) => remotes.has(peer) && p.hat),
        'friend claimed and dismissed their own conductor hat reveal',
        300000,
      ); // The existing cosmetic presence becomes hat only after that player's reveal is dismissed.
    mark('T1 production completed');
    document.documentElement.dataset.railwayProof = 'done';
    bot.finish('T1 real opening, chop, carry, automatic deposit, solid track and one personal claim');
  } catch (error) {
    document.documentElement.dataset.railwayProof = 'failed';
    input.keys.delete('KeyW');
    input.keys.delete('ShiftLeft');
    releaseJump();
    bot.never(`production T1 stopped: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`RAILWAY FAILURE ${JSON.stringify(inspectRailway())}`);
    throw error;
  }
}
