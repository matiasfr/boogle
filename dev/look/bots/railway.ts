// Production line 1 through ordinary inputs. Inspection observes; it never seeds a world or moves a player.
import { makeBot } from '../bot.ts';
import { inspectRailway, type RailwayViewInspection } from '../../../src/entities/railway/state.ts';
import { me, cam } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import { carry } from '../../../src/physics/platforms.ts';
import { playMark } from '../../../src/proto/mark.ts';
import { LINE1_STATIONS, LINE1_GREAT_TREE, LINE1_INITIAL } from '../../../src/sim/railway-line-layout.ts';
import { PLAYER_R } from '../../../src/constants.ts';
import { fallArrival } from '../../../src/fall/arrival.ts';
import { onRemotePresence, remotes } from '../../../src/netplay/net.ts';

export async function play({ stopBeforeReward = false } = {}) {
  const query = new URLSearchParams(location.search);
  const player = query.get('player');
  const coop = player === '1' || player === '2';
  const second = player === '2';
  const peers = new Map<
    string,
    { pid: string | null; x: number; y: number; z: number; seenAt: number; beamHelp: string | null }
  >();
  const offPresence = coop
    ? onRemotePresence((remote, presence) => {
        if (remote.entered && Array.isArray(presence.p))
          peers.set(remote.peer, {
            pid: remote.pid ?? null,
            x: presence.p[0] as number,
            y: presence.p[1] as number,
            z: presence.p[2] as number,
            seenAt: performance.now(),
            beamHelp: typeof presence.railwayBeamHelp === 'string' ? presence.railwayBeamHelp : null,
          });
        else peers.delete(remote.peer);
      })
    : () => {};
  const bot = makeBot({
    recover: () => {
      throw new Error('Production route needed recovery; no relocation is permitted');
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
  const until = async (fn: () => unknown, beat: string, ms = 300000) => require(await bot.until(fn, ms, beat), beat);
  const job = (station: number) => read().stations[station]!;
  const mark = (name: string) => {
    const state = read();
    document.documentElement.dataset.railwayBeat = name;
    playMark(name, { tick: state.tick, stock: state.stock, carry: state.carry, completion: state.completion });
    bot.note(name);
    console.log(
      `RAILWAY CHECKPOINT ${JSON.stringify({
        beat: name,
        player: player ?? 'solo',
        pid: state.pid,
        tick: state.tick,
        hash: state.hash,
        phase: state.phase,
        ready: state.ready,
        activeStation: state.activeStation,
        stations: state.stations,
        carry: state.carry,
        stoneCarry: state.stoneCarry,
        completion: state.completion,
        stock: state.stock,
        allocation: state.allocation,
        used: state.used,
        delivered: state.delivered,
        pending: state.pending,
        accounts: state.accounts,
        counts: state.counts,
        panelCount: state.panelCount,
        panelStock: state.panelStock,
        axe: state.axe,
        jump: state.jump,
        beam: state.beam,
        rocks: state.rocks,
        head: state.head,
        targetHead: state.targetHead,
        machine: state.machine,
        station: state.station,
        position: me.body?.position,
        swimming: me.swimming,
        grounded: me.coyote > 0,
        aboard: carry.on?.id ?? null,
        reward: state.reward,
        pathOpen: state.pathOpen,
        beamHelpPeers: [...peers.values()].filter((p) => p.beamHelp && performance.now() - p.seenAt < 1500),
        workedSources: state.trees
          .filter((tree) => tree.work > 0)
          .map(({ id, remaining, work, growth }) => ({ id, remaining, work, growth })),
      })}`,
    );
  };
  // A targeted still replays real inputs to this beat. Pose checkpoints cannot restore shared progress.
  const checkpoint = async (name: string) => {
    mark(name);
    if (query.get('railStop') !== name) return;
    input.keys.clear();
    releaseJump();
    (window as Window & { __railStop?: string }).__railStop = name;
    await new Promise<void>(() => {});
  };
  const dismiss = async (name: string) => {
    await until(() => read().reward.showing, `${name} appears`);
    await bot.wait(1600);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
    await until(() => !read().reward.showing, `${name} dismissed with Interact`);
  };
  const settled = async () => {
    // Peer bumps need a landing wait. A sleeping solo body can have an expired coyote timer while supported.
    if (!coop) return;
    await until(
      () => !!me.body && !fallArrival.active && me.coyote > 0 && !me.swimming && Math.abs(me.body.velocity.y) < 0.5,
      'landed dry and settled before route planning',
      10000,
    );
  };
  const walk = async (x: number, z: number, radius = 1.8) => {
    await settled();
    require(await bot.walk(x, z, radius), `walked to ${x.toFixed(1)}, ${z.toFixed(1)} without recovery`);
  };
  const face = (x: number, z: number) => {
    const p = me.body!.position;
    cam.yaw = me.yaw = Math.atan2(-(x - p.x), -(z - p.z));
  };
  const ride = async (station: number) => {
    if (query.get('ride') !== '1') return;
    const name = LINE1_STATIONS[station]!.id;
    await walk(read().machine.x, read().machine.z, 3);
    const aboard = () => carry.on?.id === 'railway:T1:flatbed' || carry.on?.id === 'railway:T1:loco';
    const end = performance.now() + 15000;
    while (!aboard() && performance.now() < end && !job(station).completion) {
      face(read().machine.x, read().machine.z);
      input.keys.add('KeyW');
      if (me.coyote > 0) pressJump();
      await bot.wait(120);
      releaseJump();
      await bot.wait(80);
    }
    input.keys.delete('KeyW');
    require(aboard(), `boarded ${name} layer by real jump`);
    mark(`${name} layer boarded`);
    let stayedAboard = true;
    await until(() => {
      stayedAboard &&= aboard() && !me.swimming;
      return job(station).completion;
    }, `${name} completes while riding`);
    require(stayedAboard, `${name} rider stayed aboard throughout laying`);
    require(aboard() && !me.swimming, `${name} rider remains aboard and dry`);
    mark(`${name} layer ride completed`);
  };
  const panels = (committed: number, stock: number) => {
    require(read().panelCount === committed &&
      read().panelStock === stock, `${committed} accepted whole panels leave ${stock} stock panels`);
  };
  const logs = async (station: number, loads: number) => {
    for (let load = 0; load < loads; load++) {
      let attempts = 0;
      while (read().carry < 8) {
        await settled();
        require(++attempts <= 20, `${LINE1_STATIONS[station]!.id} found enough reachable logs`);
        const p = me.body!.position;
        const candidates = read()
          .trees.filter(
            (tree) => !tree.cleared && tree.remaining > 0 && tree.id !== 28 && tree.id !== 209 && tree.id !== 232,
          )
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
        let chosen: RailwayViewInspection['trees'][number] | undefined;
        for (const candidate of candidates.slice(0, 20)) {
          const route = await bot.plan(candidate.x, candidate.z, 2.6);
          if (route.arrives && route.path.every((point) => point.y >= 3)) {
            chosen = candidate;
            break;
          }
        }
        require(chosen, 'a physically reachable ordinary source exists');
        await walk(chosen!.x, chosen!.z, 2.6);
        face(chosen!.x, chosen!.z);
        const before = read().carry;
        for (let swing = 0; swing < 100 && read().carry < 8; swing++) {
          const target = interactTarget();
          if (!target?.click || target.verb !== 'Chop') break;
          bot.press();
          await bot.wait(380);
          if (read().trees.find((source) => source.id === chosen!.id)?.remaining === 0) break;
        }
        await until(() => read().pending === 0, 'harvest requests settle');
        require(read().carry > before, `source ${chosen!.id} transferred accepted logs`);
      }
      require(read().carry === 8 && read().stoneCarry === 0, 'eight-piece log back');
      mark(`${LINE1_STATIONS[station]!.id} load ${load + 1} carried`);
      const frame = read().station;
      await walk(frame.x, frame.z, 3);
      await until(() => read().carry === 0 && read().pending === 0, 'automatic log deposit settles');
      mark(`${LINE1_STATIONS[station]!.id} load ${load + 1} deposited`);
    }
  };
  const box = async (station: 0 | 1) => {
    const id = station === 0 ? 'T1' : 'T2';
    const reward = read().reward.boxes.find((row) => row.station === id)!;
    require(reward, `${id} has its authored personal box`);
    if (stopBeforeReward && station === 0) {
      await walk(reward.x, reward.z, 2);
      mark('T1 unopened reward reached');
      return;
    }
    require(await bot.use(reward.x, reward.z, `open the ${id} cosmetic box`, /^Open/), `${id} box offered`);
    await until(
      () => read().reward.boxes.some((row) => row.station === id && row.claimed && row.owned),
      `${id} ownership stored`,
    );
    mark(`${id} cosmetic claimed`);
    await dismiss(`${id} cosmetic reveal`);
    require(!read().reward.error, 'profile write succeeded');
  };
  try {
    await until(() => !!me.body && inspectRailway()?.ready, 'verified production room ready');
    await until(() => !fallArrival.active && me.coyote > 0 && !me.swimming, 'opening arrival lands dry');
    require(!('__place' in window), 'production installs no mutable legacy Place surface');
    require(read().phase === 'asleep' && read().carry === 0, 'fresh production route starts asleep and empty');
    if (coop) await until(() => read().accounts.length === 2, 'both independent players joined');
    if (second) {
      const spawn = { x: me.body!.position.x, z: me.body!.position.z };
      await until(
        () =>
          [...peers].some(
            ([peer, p]) =>
              remotes.has(peer) &&
              performance.now() - p.seenAt < 2000 &&
              Math.hypot(p.x - spawn.x, p.z - spawn.z) >= 8 &&
              Math.hypot(p.x - me.body!.position.x, p.z - me.body!.position.z) >= 8,
          ),
        'leader clears the shared spawn before follower departs',
        30000,
      );
      // The shared arrival can lift a stationary peer. Start planning only after that peer lands again.
      await until(
        () => !fallArrival.active && me.coyote > 0 && !me.swimming && Math.abs(me.body!.velocity.y) < 0.5,
        'follower lands dry after leader departure',
        10000,
      );
    }
    const [{ PATH_SAMPLES }, layout] = await Promise.all([
      import('../../../src/proto/place/terrain.ts'),
      import('../../../src/proto/place/layout.ts'),
    ]);
    const line = layout.LINKS[0]!;
    const railAt = (s: number) => layout.lineAt(line.line, s, { x: 0, z: 0, ux: 0, uz: 1 });
    const walkTrack = async (from: number, to: number) => {
      const direction = Math.sign(to - from);
      for (let s = from; direction * (to - s) >= 0; s += direction * 3) {
        const point = railAt(s);
        require(await bot.straight(point.x + layout.ORIGIN.x, point.z, 0.5, 12000), `walked rail at ${s.toFixed(0)} m`);
        await until(() => me.coyote > 0 && !me.swimming, 'track supports the walker', 5000);
        require(Math.abs(me.body!.position.y - PLAYER_R - layout.railY(line.line, s)) <
          1, 'walker remains at track height');
      }
      const end = railAt(to);
      require(await bot.straight(end.x + layout.ORIGIN.x, end.z, 0.5, 12000), 'reached track endpoint');
    };
    mark('T1 opening started');
    for (let i = 0; i < PATH_SAMPLES[0]!.length; i += 3) {
      const point = PATH_SAMPLES[0]![i]!;
      await walk(point[0] + layout.ORIGIN.x, point[1]);
    }
    const machine = read().machine;
    await walk(machine.x, machine.z, 3);
    if (coop && !second)
      await until(
        () => [...peers].some(([peer, p]) => remotes.has(peer) && Math.hypot(p.x - machine.x, p.z - machine.z) <= 3.2),
        'friend completes opening walk',
      );
    if (!second) require(await bot.use(machine.x, machine.z, 'wake the machine', /^Wake it up$/), 'wake offered');
    await until(() => read().phase === 'idle', 'accepted wake ready');
    mark('awake');
    await dismiss('multi-axe reveal');
    mark('T1 multi-axe dismissed');
    if (second) await until(() => job(0).delivered === 16, 'friend supplied sixteen logs');
    await logs(0, coop ? (second ? 1 : 2) : 3);
    await until(() => job(0).start >= 0, 'funded T1 begins');
    mark('T1 funded');
    await ride(0);
    await until(() => job(0).completion === 1, 'T1 laid once');
    panels(3, 9);
    require(job(0).used === 24 && job(0).allocation === 0, 'T1 contains exactly 24 logs');
    mark('T1 laid');
    const track = railAt(154);
    await walk(track.x + layout.ORIGIN.x, track.z, 0.8);
    await until(() => me.coyote > 0 && !me.swimming, 'standing on laid T1');
    mark('T1 track stood on');
    await box(0);
    if (stopBeforeReward) return;
    mark('T1 production completed');
    if (read().stations.length === 1 || query.get('t1Only') === '1') {
      document.documentElement.dataset.railwayProof = 'done';
      bot.finish('T1 real inputs and personal claim');
      return;
    }
    await until(() => read().activeStation === 1, 'T2 opens after T1');
    require(!read().axe, 'proper axe remains locked at T2');
    if (!second) await logs(1, 4);
    if (!coop || second) {
      const rock = read().rocks.find((r) => r.remaining >= 8)!;
      require(rock, 'stone source available');
      await walk(rock.x / 100, rock.z / 100, 2.6);
      face(rock.x / 100, rock.z / 100);
      await until(() => interactTarget()?.id === `railway-rock${rock.id}`, 'the chosen rock is targeted', 5000);
      require(await bot.work(() => read().stoneCarry === 8, 30000), 'four productive rock strokes fill stone back');
      await until(() => read().pending === 0, 'stone requests settle');
      mark('T2 stone carried');
      await walk(read().station.x, read().station.z, 3);
      await until(() => read().stoneCarry === 0 && read().pending === 0, 'stone automatically deposited');
      mark('T2 stone deposited');
    }
    await until(() => job(1).start >= 0, 'T2 exact mixed bill funded');
    mark('T2 funded');
    await ride(1);
    await until(() => job(1).completion === 1, 'T2 laid once');
    panels(6, 6);
    require(job(1).used === 32 && job(1).stoneUsed === 8, 'T2 embodies 32 logs and 8 stone');
    await checkpoint('T2 laid');
    await box(1);
    await until(() => read().activeStation === 2, 'T3 opens after T2');
    require(!read().axe, 'proper axe not granted by T2 completion');
    if (second) await until(() => job(2).delivered === 24, 'friend supplies the first 24 T3 logs');
    await logs(2, coop ? (second ? 2 : 3) : 5);
    await until(() => job(2).stock === 40, 'T3 has 40 accepted logs');
    require(job(2).start < 0, 'logs alone do not feed T3');
    if (!second) require(!read().axe, 'forty logs reveal the chest without granting the axe');
    await checkpoint('T3 axe available');
    if (!second) {
      const chest = read().reward.axeChest;
      await walk(chest.x, chest.z);
      require(await bot.use(chest.x, chest.z, 'open proper axe chest', /^Open/), 'proper axe chest offered');
      // A single press can be rejected before the host receives the settled Owner position.
      // Repeat ordinary input for a bounded window; acceptance remains the required beat.
      require(await bot.work(() => read().axe, 5000, 380), 'shared proper axe accepted after bounded retries');
    }
    await until(() => read().axe, 'shared proper axe accepted');
    await dismiss('proper axe reveal');
    mark('T3 proper axe earned');
    if (!second) {
      const tree = LINE1_GREAT_TREE;
      await walk(tree.x / 100, tree.z / 100, 2.6);
      face(tree.x / 100, tree.z / 100);
      await until(() => interactTarget()?.id === 'place-tree28', 'the great tree is targeted', 5000);
      require(await bot.work(
        () => read().beam?.state === 'available',
        30000,
      ), 'great tree yields unique beam after twelve proper strokes');
      await until(() => read().pending === 0, 'great tree requests settle');
      mark('T3 beam available');
      const beam = read().beam!;
      require(read().carry === 0 && read().stoneCarry === 0, 'empty back before unique beam claim');
      require(await bot.use(beam.x / 100, beam.z / 100, 'pick up unique beam', /^Pick up/), 'beam pickup offered');
      await until(
        () => read().beam?.state === 'held' && read().beam?.holder === read().pid,
        'unique beam held by carrier',
      );
      await checkpoint('T3 beam carried');
      if (coop) {
        const holder = read().pid;
        const revision = read().beam!.revision;
        const helperNear = () =>
          [...peers.values()].some(
            (p) =>
              p.beamHelp === holder &&
              performance.now() - p.seenAt < 1500 &&
              Math.hypot(p.x - me.body!.position.x, p.z - me.body!.position.z) <= 3.5,
          );
        await until(helperNear, 'friend activates Help carry beside the sole beam holder', 30000);
        mark('T3 beam helper joined');
        const start = { ...me.body!.position };
        const route = await bot.plan(read().station.x, read().station.z, 3);
        require(route.arrives, 'a real helped-beam route reaches T3');
        let last = { x: start.x, z: start.z };
        let shown = false;
        for (const point of route.path) {
          if (job(2).start >= 0) break;
          if (Math.hypot(point.x - last.x, point.z - last.z) < 2) continue;
          await until(helperNear, 'helper stays near before the next short beam leg', 10000);
          require(read().beam?.holder === holder &&
            read().beam?.revision === revision, 'help never claims a second beam');
          await walk(point.x, point.z, 0.7);
          last = point;
          if (!shown && Math.hypot(me.body!.position.x - tree.x / 100, me.body!.position.z - tree.z / 100) >= 9) {
            await until(helperNear, 'helper remains beside the carried beam after moving', 10000);
            require(Math.hypot(me.body!.position.x - start.x, me.body!.position.z - start.z) >=
              5, 'helped beam moves at least five metres');
            shown = true;
            await checkpoint('T3 helped beam carried');
          }
        }
        require(shown, 'helped beam carry was observed before delivery');
        await walk(read().station.x, read().station.z, 3);
      } else await walk(read().station.x, read().station.z, 3);
      await until(() => job(2).start >= 0, 'beam deposited and T3 funded');
    } else {
      await until(() => read().beam?.state === 'held', 'friend picks up the sole beam');
      const holder = read().beam!.holder;
      const carrier = () => [...peers.values()].find((p) => p.pid === holder && performance.now() - p.seenAt < 1500);
      await until(carrier, 'carrier has a fresh real position');
      const initial = carrier()!;
      await walk(initial.x, initial.z, 2.5);
      face(initial.x, initial.z);
      require(await bot.use(initial.x, initial.z, 'help carry the beam', /^Help carry$/), 'Help carry offered');
      await until(() => interactTarget()?.id === 'railway-beam-help-release', 'helper grip activated', 5000);
      mark('T3 beam helper joined');
      let shown = false;
      let stoppedAt = performance.now();
      let lastCarrier = { x: initial.x, z: initial.z };
      const deadline = performance.now() + 120000;
      while (job(2).start < 0 && performance.now() < deadline) {
        const p = carrier();
        require(p && !me.swimming, 'helper follows a fresh dry carrier');
        if (Math.hypot(p!.x - lastCarrier.x, p!.z - lastCarrier.z) > 0.1) {
          stoppedAt = performance.now();
          lastCarrier = { x: p!.x, z: p!.z };
        }
        face(p!.x, p!.z);
        if (Math.hypot(p!.x - me.body!.position.x, p!.z - me.body!.position.z) > 2.1) input.keys.add('KeyW');
        else input.keys.delete('KeyW');
        if (interactTarget()?.id === 'railway-beam-help') bot.press();
        // In a targeted photo the carrier freezes after finishing its short leg. Keep following until that
        // stop is observed, rather than freezing as soon as its moving presence first crosses the threshold.
        const photoReady =
          query.get('railStop') !== 'T3 helped beam carried' ||
          (performance.now() - stoppedAt >= 250 &&
            Math.hypot(p!.x - me.body!.position.x, p!.z - me.body!.position.z) <= 2.5);
        if (!shown && photoReady && Math.hypot(p!.x - LINE1_GREAT_TREE.x / 100, p!.z - LINE1_GREAT_TREE.z / 100) >= 9) {
          require(interactTarget()?.id === 'railway-beam-help-release', 'helper grip remains active after moving');
          require(read().beam?.holder === holder &&
            read().carry === 0 &&
            read().stoneCarry === 0, 'helper has an empty back and no second beam claim');
          shown = true;
          await checkpoint('T3 helped beam carried');
        }
        await bot.wait(40);
      }
      input.keys.delete('KeyW');
      require(shown, 'helper moved with the held beam');
      await until(() => job(2).start >= 0, 'friend delivered unique beam');
    }
    await checkpoint('T3 funded');
    await ride(2);
    await until(() => job(2).completion === 1, 'T3 laid once');
    panels(12, 0);
    require(read().beam?.state === 'used' && job(2).used === 40, 'single beam and 40 logs embodied');
    require(read().reward.claims === 2, 'only T1 and T2 personal boxes earned');
    const counts = read().counts;
    require(counts.total === LINE1_INITIAL[0] + counts.produced, 'counted logs conserve initial supply and renewal');
    require(counts.stone &&
      counts.stone.total ===
        LINE1_INITIAL[1] + counts.stone.produced, 'counted stone conserves initial supply and renewal');
    await checkpoint('T3 laid');
    require(!read().jump, 'walk home does not need optional jump');
    const access = railAt(116);
    await walk(access.x + layout.ORIGIN.x, access.z, 0.8);
    await walkTrack(116, 191);
    mark('path camp reached');
    await walkTrack(191, 30);
    mark('path joined village stub');
    // The moving machine is not in the ground planner's static obstacle map. Walk its clear grass side explicitly.
    const join = railAt(30);
    const village = railAt(14);
    const bypass = [
      { x: join.x + layout.ORIGIN.x, z: join.z },
      { x: join.x + layout.ORIGIN.x - join.uz * 4, z: join.z + join.ux * 4 },
      { x: village.x + layout.ORIGIN.x - village.uz * 4, z: village.z + village.ux * 4 },
      { x: village.x + layout.ORIGIN.x, z: village.z },
    ];
    const walkBypass = async (points: typeof bypass) => {
      for (const point of points) {
        require(await bot.straight(point.x, point.z, 0.5, 12000), 'walked a clear waypoint beside the parked machine');
        await until(() => me.coyote > 0 && !me.swimming, 'parked-machine bypass remains dry and supported', 5000);
      }
    };
    await walkBypass(bypass.slice(1));
    await checkpoint('path walked home');
    require(!read().jump, 'walk home completed before jump discovery');
    await walkBypass([...bypass].reverse().slice(1));
    require(Math.abs(me.body!.position.y - PLAYER_R - layout.railY(line.line, 30)) <
      1, 'village stub rejoins the new deck');
    mark('path returned to village join');
    await walkTrack(30, 191);
    mark('path walked back');
    // The completed path reaches the first pillar's authored lip without spending the optional ability.
    await walkTrack(191, 92);
    const { PILLARS } = await import('../../../src/proto/place/tech-layout.ts');
    const pillar = PILLARS[0]!;
    require(pillar.lipTo, 'first pillar has its walkable approach');
    const approach = { x: pillar.x - pillar.lipTo!.x, z: pillar.z - pillar.lipTo!.z };
    const length = Math.hypot(approach.x, approach.z);
    const forward = { x: approach.x / length, z: approach.z / length };
    const slot = (side: number) => ({
      x: pillar.x + layout.ORIGIN.x + forward.x * 0.65 - forward.z * side * 1.35,
      z: pillar.z + forward.z * 0.65 + forward.x * side * 1.35,
    });
    const ownSlot = slot(second ? -1 : 1);
    const friendSlot = slot(second ? 1 : -1);
    const friendAt = (point: { x: number; z: number }) =>
      [...peers].some(
        ([peer, p]) =>
          remotes.has(peer) &&
          Math.hypot(p.x - point.x, p.z - point.z) < 0.8 &&
          Math.abs(p.y - PLAYER_R - pillar.top) < 0.5,
      );
    // Clear the single-width entry before the second player crosses it.
    if (second) await until(() => friendAt(friendSlot), 'friend clears the first-pillar entry lip');
    require(await bot.straight(
      pillar.lipTo!.x + layout.ORIGIN.x,
      pillar.lipTo!.z,
      0.4,
      6000,
    ), 'walked from completed rail to first-pillar lip');
    require(await bot.straight(ownSlot.x, ownSlot.z, 0.4, 6000), 'walked the lip onto the first pillar');
    await until(() => me.coyote > 0 && !me.swimming, 'first pillar supports the player');
    if (!second) require(!read().jump, 'first pillar reached before optional jump discovery');
    mark('first pillar reached');
    if (coop && !second)
      await until(() => friendAt(friendSlot), 'friend reaches the first pillar before shared discovery');
    if (!second) {
      const device = read().reward.jumpDevice;
      require(await bot.use(device.x, device.z, 'take the first jump device', /^Take it$/), 'jump device offered');
    }
    await until(() => read().jump, 'shared optional jump accepted');
    await dismiss('optional jump reveal');
    mark('optional jump discovered');
    require(await bot.straight(ownSlot.x, ownSlot.z, 0.4, 6000), 'stood clear of the device for the jump');
    await until(() => me.coyote > 0 && me.body!.velocity.y <= 0, 'grounded before jump demonstration');
    const jumpsBefore = read().reward.tools.jumps;
    pressJump();
    await until(() => me.coyote <= 0 && me.body!.velocity.y > 0, 'ordinary first jump leaves the pillar', 3000);
    releaseJump();
    await bot.wait(180);
    pressJump();
    await until(() => read().reward.tools.jumps === jumpsBefore + 1, 'second press uses the optional air jump', 3000);
    releaseJump();
    await until(
      () => me.coyote > 0 && me.body!.velocity.y <= 0 && !me.swimming,
      'air jump lands dry on first pillar',
      6000,
    );
    require(Math.abs(me.body!.position.y - PLAYER_R - pillar.top) < 1, 'air jump returns to the same pillar');
    const { registry } = await import('../../../src/world/sync.ts');
    require(!registry().ops.some((op) =>
      /^rail\.(hook|glide|train)/.test(op),
    ), 'no later railway ability is installed');
    await checkpoint('optional jump used');
    document.documentElement.dataset.railwayProof = 'done';
    bot.finish('T1/T2/T3, proper axe, unique beam, both path walks and first optional jump');
  } catch (error) {
    document.documentElement.dataset.railwayProof = 'failed';
    bot.never(`production line1 stopped: ${error instanceof Error ? error.message : String(error)}`);
    console.log(
      `RAILWAY FAILURE ${JSON.stringify({
        ...inspectRailway(),
        player: {
          position: me.body?.position,
          velocity: me.body?.velocity,
          coyote: me.coyote,
          swimming: me.swimming,
          aboard: carry.on?.id ?? null,
        },
      })}`,
    );
    throw error;
  } finally {
    input.keys.delete('KeyW');
    input.keys.delete('ShiftLeft');
    releaseJump();
    if (typeof offPresence === 'function') offPresence();
  }
}
