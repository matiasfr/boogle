// Two players exploring: --query 'proto=place&coop=1' --players 2 --real --eval dev/look/evals/place-coop.ts
// --until window.__placeExplore?.done --warm 90. The place-exploring scenario also opens a fresh third profile.
// Add &railway=1 for the original railway observation below, or &deposits=1 for the conservation check.
// Does the new job stay together: a wake, a deposit from the follower, a chest opened by the follower (the rung is everyone's),
// a skip to trains, and a train called from a platform. Each says what it sees; read the COOP lines side by side.
const q = new URLSearchParams(location.search);
const who = q.get('player');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const place = window.__place as any;
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (ready: () => boolean, what: string, ms = 10000) => {
  const end = performance.now() + ms;
  while (!ready()) {
    if (performance.now() >= end) throw new Error(`COOP ${who} timed out: ${what}`);
    await wait(100);
  }
};
const say = (what: string) => {
  const st = place.stationOf(place.lines[0]);
  const t = place.lines[1].train.tr;
  console.log(
    `COOP ${who} ${what}: authority ${place.coop.debug().amAuthority}, others ${window.boogle.remotes.size}, awake ${place.job.awake}, mode ${place.run.mode}, T ${st?.have.logs ?? '-'}, rung ${JSON.stringify(place.job.rung)}, chest ${place.job.chest}, $${place.job.score.money}, felled ${place.TREES.filter((x: { fall: number }) => x.fall >= 0).length}, train2 s ${t.s.toFixed(1)} target ${t.target} stop ${t.stop}`,
  );
};
const put = (x: number, z: number, up = 1.4) => {
  teleport(me.body!, x, place.H(x, z) + up, z);
  me.body!.velocity.set(0, 0, 0);
};
if (q.has('deposits')) {
  const { net } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
  const { cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
  const st = place.stationOf(place.lines[0]);
  const started = performance.now();
  let go = false;
  let otherBack = 0;
  const trace = (m: Record<string, unknown>) =>
    console.log(`COOP wire ${who} ${Math.round(performance.now() - started)} ${JSON.stringify(m)}`);
  net.room!.onMessage((raw) => {
    const m = raw as Record<string, unknown>;
    if (m.t === 'coopProbe' && m.k === 'ready' && who === '1') go = true;
    if (m.t === 'coopProbe' && m.k === 'go' && who === '2') go = true;
    if (m.t === 'coopProbe' && m.k === 'back') otherBack = Number(m.n);
    if (q.has('trace') && m.t === 'placeCoop' && ['dep', 'stock', 'no'].includes(String(m.k))) trace(m);
  });
  void (async () => {
    while (!me.body || !net.room || place.coop.debug().peers.length < 1) await wait(100);
    put(st.x + 10, st.z + 5);
    cam.yaw = 0.5;
    place.back.logs = 0;
    if (who === '1') place.wake();
    await wait(5000);
    console.log(`COOP baseline ${who} back ${place.back.logs} frame ${st.have.logs} coming ${st.coming.logs}`);
    if (place.back.logs || st.have.logs || st.coming.logs)
      throw new Error('Conservation check needs an empty baseline');
    if (who === '2') net.room!.send({ t: 'coopProbe', k: 'ready' });
    while (!go) await wait(50);
    if (who === '1') {
      await wait(1500);
      net.room!.send({ t: 'coopProbe', k: 'go' });
      const until = performance.now() + 5000;
      while (performance.now() < until) {
        /* stalled authority */
      }
    } else {
      place.back.logs = 8;
      put(st.x + 2.5, st.z + 1);
      await wait(1500);
      put(st.x + 10, st.z + 5); // refunds cannot be deposited again before measurement
    }
    await wait(10000);
    net.room!.send({ t: 'coopProbe', k: 'back', n: place.back.logs });
    await wait(5000);
    const total = place.back.logs + otherBack + st.have.logs;
    console.log(
      `COOP conserved ${total} player ${who} back ${place.back.logs} other ${otherBack} frame ${st.have.logs} coming ${st.coming.logs}`,
    );
    if (total !== 8 || st.coming.logs !== 0) throw new Error(`Expected 8 settled logs, got ${total}`);
    put(st.x + 5, st.z + 5);
    Object.assign(window, { __coopDone: true });
  })();
} else if (!q.has('railway')) {
  const { explore } = await import('/dev/look/evals/place-exploring.ts' as string);
  void explore(who);
} else {
  while (!me.body) await wait(100);
  if (who === '2') {
    const { snapGifts } = (await import(
      '/src/proto/place/gifts.ts' as string
    )) as typeof import('../../../src/proto/place/gifts.ts');
    snapGifts(['hat', 'scarf', 'overalls'], 0, [], { hat: 'hat', accessory: 'scarf', outfit: 'overalls' });
    put(903, 14);
  } else put(900, 14);
  console.log(`COOP clothing view ground ${place.H(903, 14)}`);
  await wait(4000);
  await (async () => {
    say('start');
    if (who === '1') place.wake();
    await wait(5000);
    say('after the wake');
    if (who === '2') {
      const st = place.stationOf(place.lines[0]);
      place.back.logs = 8;
      put(st.x + 2.5, st.z + 1);
    }
    await wait(12000); // the tabs start some seconds apart
    await until(() => place.stationOf(place.lines[0])?.have.logs === 8, 'follower deposit reached this page');
    say('after the follower deposited 8');
    await wait(2000); // keep the observed deposit visible before the authority advances the shared job
    if (who === '1') place.skipPath();
    await wait(3000);
    await until(
      () => place.run.mode === 'waiting' && (place.job.chest === 'axe' || place.job.rung.axe === 1),
      'first path and chest arrived',
    );
    say('after a skip to the first path');
    if (who === '2') {
      const c = place.giftState.crates()[0];
      if (c) {
        put(c.x + 2, c.z);
        place.openCrate(c);
      } else throw new Error(`COOP ${who} NO CHEST HERE`);
    }
    await wait(4000);
    await until(() => place.job.rung.axe === 1, 'follower chest upgrade arrived');
    say('after the follower opened the chest');
    if (who === '1') place.skipTrains();
    await wait(4000);
    await until(
      () =>
        place.job.rung.trains &&
        place.run.mode === 'idle' &&
        place.lines.every((l: { train: { clockRunning: () => boolean } }) => l.train.clockRunning()),
      'trains started on this page',
    );
    say('after a skip to trains');
    if (who === '2') {
      const h = place.halts[3];
      teleport(me.body!, h.x, h.y + 1.2, h.z);
      me.body!.velocity.set(0, 0, 0);
    }
    await wait(5000);
    say('after the follower stood on the quarry platform');
    await wait(4000);
    say('a bit later');
    const minutes = Number(q.get('coopMinutes') ?? 0);
    if (!Number.isFinite(minutes) || minutes < 0) throw new Error('coopMinutes must be finite and nonnegative');
    for (let elapsed = 0; elapsed < minutes * 60; elapsed += 30) {
      await wait(30000);
      say(`trains +${elapsed + 30}s`);
    }
  })();
}
export {};
