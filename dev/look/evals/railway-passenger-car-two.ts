// Two players seated on the knifeboard (docs/plans/passenger-car-previz.md, Four), from `--rail-seed trains-on`: both walk
// onto line 2's village halt, board the standing train by a real jump, and sit; the still is each player's view of the
// pair on the bench. Short: a hang is not retried.
// npm run look -- --players 2 --rail-seed trains-on --query shot=play --eval dev/look/evals/railway-passenger-car-two.ts \
//   --until window.__placeDone --wall 240 --name passenger-car-two
// Add &seatQuiet=1 with --real: player 1 pauses presence through capture; player 2 proves 3 s of silence while seated.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { inspectRailway, railRead, rw, trains } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { pressJump, releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const { seatState, withSeatTargets } = (await import(
  '/src/entities/railway/seat.ts' as string
)) as typeof import('../../../src/entities/railway/seat.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { railwayCommands } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');

type Halt = { x: number; z: number; up: boolean; lever: { dir: number; on: boolean; x: number; z: number }[] };
type View = { halts: Halt[]; trains: { cars: { x: number; z: number; riding: boolean }[] }[] };
const view = () => inspectRailway()!.line2View as unknown as View;
// The ridden train's slot: whichever of line 2's two stops at the village toward Far Head (v26).
let slot = 1;
const standsUp = () => {
  const k = [1, 2].find((k) => {
    const r = trains(rw())[k]!;
    return r.phase === 0 && r.at === 0 && r.track === 0;
  });
  if (k !== undefined) slot = k;
  return k !== undefined;
};
const query = new URLSearchParams(location.search);
const player = query.get('player');
const confirmed = () => {
  const s = seatState();
  return !!s.sitting && s.occupants[s.sitting] === railRead()?.pid;
};
const shot = window as Window & { __placeDone?: boolean };
const bot = makeBot({
  recover: () => {
    throw new Error('passenger-car-two look asked for recovery');
  },
});
const check = (ok: unknown, beat: string) => {
  if (!ok) throw new Error(beat);
};
const until = async (fn: () => unknown, beat: string, ms = 600000) => check(await bot.until(fn, ms, beat), beat);
setTimeout(() => window.__debugCam?.clear(), 100);
background(
  (async () => {
    await until(() => railRead()?.ready() && me.body && me.coyote > 0, 'seed arrived', 300000);
    await until(() => view().halts[3]?.up && view().halts[2]?.up, 'line 2 halts stand', 60000);
    const village = view().halts[2]!;
    if (player === '1') {
      const handle = village.lever.find((h) => h.on && h.dir === 1);
      check(handle, 'the village has a handle toward Far Head');
      check(await bot.use(handle!.x, handle!.z, 'the lever', /^Request stop/), 'lever offered');
    }
    check(await bot.walk(village.x, village.z, player === '1' ? 0.5 : 1.2), 'walked onto the village platform');
    await until(standsUp, 'a train toward Far Head stands');
    const aboard = () => view().trains[slot]!.cars.some((car) => car.riding);
    const end = performance.now() + 20000;
    try {
      while (!aboard() && performance.now() < end) {
        const car = view().trains[slot]!.cars[1]!;
        const p = me.body!.position;
        cam.yaw = me.yaw = Math.atan2(-(car.x - p.x), -(car.z - p.z));
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
    check(aboard(), 'boarded line 2 by a real jump');
    await until(() => interactTarget()?.id === 'place-sit', 'Sit offered', 30000);
    bot.press();
    await until(() => seatState().sitting, 'seated', 10000);
    await until(confirmed, 'server confirms the chair', 10000);
    console.log(`SEATED ${player} ${seatState().sitting}`);
    await until(() => me.avatar && window.boogle.remotes.size > 0, 'sees the partner', 30000);
    await bot.wait(4000);
    await until(
      () =>
        Object.keys(seatState().occupants).filter((id) => id.startsWith(`railway:train${slot}-1-seat`)).length === 2,
      'both server rows name this bench',
      30000,
    );
    await until(
      () =>
        [...window.boogle.remotes.values()].some(
          (r) => r.avatar && performance.now() - (r.avatar.userData.seatedAt ?? -1e9) < 300,
        ),
      'the partner is drawn seated',
      30000,
    );
    if (player === '2' && query.has('seatContest')) {
      const session = railwayCommands()!;
      const own = seatState().sitting!;
      const other = Object.entries(seatState().occupants).find(([, pid]) => pid !== session.read.pid)!;
      let accepted = false;
      const off = session.onAccepted((e) => {
        if (e.op === 'seat.sit' && e.request === request) accepted = true;
      }, 'command');
      // Deliberately ask for the already held chair through the real command boundary. Its current sitter wins;
      // the requesting rider's existing reachable neighbour is the fallback. Host tests cover simultaneous presses.
      const request = session.act('seat.sit', { id: other[0], alt: [own] });
      try {
        check(request, 'contested seat command queued');
        await until(() => accepted, 'contested seat returns the free alternate', 10000);
        check(confirmed() && seatState().sitting === own, 'loser remains in the alternate chair');
        check(seatState().occupants[other[0]] === other[1], 'the first sitter is never displaced');
        console.log(
          `SEAT CONTEST wanted=${other[0]} alternate=${own} occupants=${JSON.stringify(seatState().occupants)}`,
        );
      } finally {
        off();
      }
    }
    if (player === '1' && query.has('seatRateReview')) {
      const session = railwayCommands()!;
      let rates = 0,
        accepted = 0;
      const off = [
        session.onRefused((e) => {
          if (e.op === 'seat.sit' && e.reason === 'rate') rates++;
        }, 'command'),
        session.onAccepted((e) => {
          if (e.op === 'seat.sit') accepted++;
        }, 'command'),
      ];
      try {
        withSeatTargets([]).find((t) => t.id === 'place-stand')!.run!();
        await until(() => withSeatTargets([]).some((t) => t.id === 'place-sit'), 'chair free for rapid re-sit', 10000);
        const sit = withSeatTargets([]).find((t) => t.id === 'place-sit')!.run!;
        // The same real chair target, in one frame: server sees sit/stand/sit inside its 400 ms bound.
        sit();
        withSeatTargets([]).find((t) => t.id === 'place-stand')!.run!();
        sit();
        check(seatState().sitting, 'rapid re-sit stays visibly seated on the press');
        await until(() => rates === 1, 'rate refusal heard', 10000);
        check(seatState().sitting, 'rate refusal never stands the player up');
        await until(() => accepted === 2 && confirmed(), 're-sit accepted in the server row after retry', 10000);
        check(seatState().sitting, 'retry preserves the seated pose');
        console.log(`SEAT RATE REVIEW rates=${rates} accepted=${accepted} sitting=${seatState().sitting}`);
      } finally {
        for (const stop of off) stop();
      }
    }
    const aim = () => {
      const a = me.avatar!.rotation.y + 0.9;
      const p = me.body!.position;
      window.__debugCam!.set([p.x - Math.sin(a) * 4.6, p.y + 1.3, p.z - Math.cos(a) * 4.6], [p.x, p.y - 0.4, p.z]);
    };
    aim();
    setInterval(aim, 16);
    await bot.wait(1500);
    if (query.has('seatQuiet')) {
      if (player === '1') {
        const { net } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
        net.lastSend = Infinity; // Only this test page's periodic presence; the socket and server row stay live.
        await bot.wait(3500);
        console.log('SEAT QUIET sender presence paused through capture');
      } else {
        const friend = [...window.boogle.remotes.values()][0]!;
        let last = friend.lastT;
        let quietSince = performance.now();
        await until(
          () => {
            if (friend.lastT !== last) {
              last = friend.lastT;
              quietSince = performance.now();
            }
            return performance.now() - quietSince >= 3100;
          },
          'partner presence is quiet for at least 3 s',
          15000,
        );
        const row = Object.entries(seatState().occupants).find(([, pid]) => pid === friend.pid);
        check(row && friend.avatar, 'quiet partner retains its server chair and avatar');
        const poseAge = performance.now() - friend.avatar!.userData.seatedAt!;
        check(poseAge < 200, 'quiet partner is still drawn seated');
        console.log(
          `SEAT QUIET watcher silence=${performance.now() - quietSince}ms poseAge=${poseAge}ms seat=${row![0]}`,
        );
      }
    }
    shot.__placeDone = true;
  })(),
  'passenger-car-two look',
);
export {};
