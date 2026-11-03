// Two players exploring: --query 'proto=place&coop=1' --players 2 --real --eval dev/look/evals/place-coop.ts
// --until window.__placeExplore?.done --warm 90. The place-exploring scenario also opens a fresh third profile.
// Add &railway=1 for the original railway observation below.
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
if (!q.has('railway')) {
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
  void (async () => {
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
    say('after the follower deposited 8');
    if (who === '1') place.skipPath();
    await wait(3000);
    say('after a skip to the first path');
    if (who === '2') {
      const c = place.giftState.crates()[0];
      if (c) {
        put(c.x + 2, c.z);
        place.openCrate(c);
      } else say('NO CHEST HERE');
    }
    await wait(4000);
    say('after the follower opened the chest');
    if (who === '1') place.skipTrains();
    await wait(4000);
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
  })();
}
export {};
