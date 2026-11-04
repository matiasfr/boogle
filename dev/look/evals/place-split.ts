// Q5, real inputs and fixed bills. Solo starts at the forge. Both two-player modes start with one at the forge
// and one at the frame: identical positions, empty backs, empty frontier rack. --players 1 for solo, 2 otherwise.
// --query 'proto=place&coop=1&mode=split' --eval this-file --until window.__splitDone --warm 420
const q = new URLSearchParams(location.search);
const mode = q.get('mode') ?? 'solo';
if (!['solo', 'walk', 'split'].includes(mode)) throw new Error('mode must be solo, walk or split');
const who = q.get('player') ?? '1';
// oxlint-disable-next-line typescript/no-explicit-any
const place = window.__place as any;
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { pressJump, releaseJump } = await import('/src/entities/player/state.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { carry } = await import('/src/physics/platforms.ts' as string);
const { cart, cartHere, cartPlatform, automaticRails } = await import('/src/proto/place/depot.ts' as string);
const { TX, TZ } = await import('/src/proto/place/lines.ts' as string);
const hands = await import('/src/player/hands.ts' as string);
const { net } = await import('/src/netplay/net.ts' as string);
const bot = makeBot();
const { wait } = bot;
let done = false;
const require = async (fn: () => unknown, ms: number, what: string) => {
  if (!(await bot.until(fn, ms, what))) throw new Error(`SPLIT ${mode} failed: ${what}`);
};
const put = (x: number, z: number) => {
  teleport(me.body!, x, place.H(x, z) + 0.8, z);
  me.body!.velocity.set(0, 0, 0);
};
const marks = new Set<string>();
net.room.onMessage((m: { t: string; k: string; ack?: boolean }) => {
  if (m.t !== 'splitProbe') return;
  marks.add(m.k);
  if (!m.ack) net.room.send({ t: 'splitProbe', k: m.k, ack: true });
});
const barrier = async (k: string) => {
  if (mode === 'solo') return;
  net.room.send({ t: 'splitProbe', k });
  const retry = setInterval(() => net.room.send({ t: 'splitProbe', k }), 200);
  try {
    await require(() => marks.has(k), 20000, k);
  } finally {
    clearInterval(retry);
  }
};
void (async () => {
  if (mode !== 'solo') await require(() => place.coop.debug().peers.length, 15000, 'partner arrived');
  await barrier('ready');
  await wait(1500);
  const started = performance.now();
  if (who === '1') place.coop.skip('q5', place.skipQ5);
  await require(() => place.activeFrame()?.spec.id === 'Q5' && place.rack.on, 10000, 'Q5 active');
  const st = place.activeFrame();
  const b = place.back;
  const porter = mode === 'split' && who === '2';
  const atForge = mode === 'solo' || (mode === 'walk' ? who === '1' : porter);
  put(atForge ? place.RACK.x + 1 : st.x + 2, atForge ? place.RACK.z + 2 : st.z + 2);
  await wait(600);
  await barrier('positioned');
  console.log(`SPLIT setup ${mode} player ${who} forge ${atForge} bill ${st.need('logs')}/${st.need('rails')}`);
  if (q.has('trace'))
    setInterval(
      () =>
        console.log(
          `SPLIT state ${who} ${JSON.stringify({ cart, rack: [place.rack.logs, place.rack.rails], forge: place.forge.rails })}`,
        ),
      1000,
    );
  const timer = setInterval(() => {
    if (done || (!st.full() && place.run.mode !== 'feeding')) return;
    done = true;
    clearInterval(timer);
    input.keys.clear();
    input.sprint = false;
    const seconds = (performance.now() - started) / 1000;
    console.log(`SPLIT ${mode} ${seconds.toFixed(2)} player ${who}`);
    Object.assign(window, { __splitDone: true });
  }, 20);
  setInterval(() => window.__debugCam?.set([st.x + 8, st.y + 24, st.z + 8], [st.x, st.y + 1, st.z]), 100);
  const travel = async (x: number, z: number, r = 2.8) => {
    if (!done && !(await bot.walk(x, z, r))) throw new Error(`SPLIT ${mode} couldn't reach ${x},${z}`);
  };
  const fetchRails = async () => {
    await travel(place.RACK.x, place.RACK.z, 3.2);
    if (done || st.wants('rails') <= 0) return;
    await require(() => place.forge.rails > 0, 20000, 'forge rails ready');
    await require(() => hands.interactTarget()?.verb === 'Take rails', 3000, 'Take rails offered');
    bot.press();
    await require(() => b.incoming === 0, 4000, 'rails landed on back');
    bot.note(`rails on back ${b.rails}`);
  };
  const deposit = async () => {
    await travel(st.x, st.z, 2.8);
    await require(() => done || !['rails', 'logs'].some((g) => b[g] > 0 && st.wants(g) > 0), 12000, 'back deposited');
    await wait(500);
  };
  // Keep the fixture's useful starting position: take available rails before leaving the forge.
  if (atForge && !porter) await fetchRails();
  if (porter) {
    await bot.use(TX + 2, TZ + 1, 'call the cart', /Whistle for the cart/);
    await require(() => cart.leg === 'forge', 90000, 'cart reached forge');
    if (cart.rails < 16) {
      await require(() => hands.interactTarget()?.verb === 'Load the cart', 3000, 'Load offered');
      bot.press();
    }
    bot.note(`loaded cart ${cart.rails}`);
    await fetchRails();
    // Board the moving cargo with real jump input. No pose teleport after the starting fixture.
    pressJump();
    const jumped = performance.now();
    let second = false;
    const until = performance.now() + 10000;
    while (carry.on !== cartPlatform && performance.now() < until) {
      const p = cartHere(),
        b = me.body!.position;
      const dx = p.x - b.x - me.body!.velocity.x * 0.18;
      const dz = p.z - b.z - me.body!.velocity.z * 0.18;
      cam.yaw = Math.atan2(-dx, -dz);
      input.stickY = -Math.min(1, Math.hypot(dx, dz) / 1.2);
      if (!second && performance.now() - jumped > 330) {
        releaseJump();
        pressJump();
        second = true;
      }
      if (second && (Math.hypot(p.x - b.x, p.z - b.z) < 0.5 || performance.now() - jumped > 1200)) releaseJump();
      if (q.has('traceBoard'))
        console.log(
          `SPLIT board ${JSON.stringify({ p: me.body!.position, v: me.body!.velocity, cart: p, top: cartPlatform.body.position.y + cartPlatform.top, leg: cart.leg, second })}`,
        );
      await wait(20);
    }
    releaseJump();
    input.keys.clear();
    input.stickY = 0;
    await require(() => carry.on === cartPlatform, 1000, 'boarded cargo');
    bot.note(`riding with ${b.rails} rails on back`);
    let rideSamples = 0;
    let lostRide = 0;
    let maxRelativeVy = 0;
    let maxSpeed = 0;
    const rideProbe = setInterval(() => {
      rideSamples++;
      if (carry.on !== cartPlatform) lostRide++;
      maxRelativeVy = Math.max(maxRelativeVy, Math.abs(me.body!.velocity.y - carry.y));
      maxSpeed = Math.max(maxSpeed, cart.speed);
    }, 20);
    await require(() => cart.leg === 'drop', 100000, 'cart reached frontier');
    clearInterval(rideProbe);
    console.log(`SPLIT ride ${JSON.stringify({ rideSamples, lostRide, maxRelativeVy, maxSpeed })}`);
    if (lostRide) throw new Error('SPLIT rider left cargo before frontier');
    // The route planner deliberately rejects a step down from the tall cargo. Jump off with real input first.
    pressJump();
    const leaving = performance.now();
    const landed = () => {
      const body = me.body!;
      return (
        carry.on !== cartPlatform &&
        body.position.y - place.H(body.position.x, body.position.z) < 1.3 &&
        Math.abs(body.velocity.y) < 1
      );
    };
    while (performance.now() - leaving < 5000) {
      const p = me.body!.position;
      cam.yaw = Math.atan2(p.x - st.x, p.z - st.z);
      input.stickY = -1;
      if (performance.now() - leaving > 250) {
        releaseJump();
        if (landed()) break;
      }
      await wait(20);
    }
    releaseJump();
    input.stickY = 0;
    await require(landed, 1000, 'jumped off cargo onto ground');
    bot.note('off the cart onto ground');
    await deposit();
  }
  let turns = 0;
  while (!done && turns++ < 100) {
    if ((b.rails > 0 && st.wants('rails') > 0) || (b.logs > 0 && st.wants('logs') > 0)) {
      await deposit();
      continue;
    }
    // With service earned, choose its short final carry instead of leaving for an empty frontier rack.
    const frontier = mode === 'split' || automaticRails();
    if (!frontier && st.wants('rails') > 0 && b.room() > 0 && place.rack.rails === 0) {
      await fetchRails();
      continue;
    }
    const railNeed = Math.max(0, st.wants('rails') - b.rails);
    const logNeed = Math.max(0, st.wants('logs') - b.logs);
    if (b.room() > 0 && ((place.rack.rails > 0 && railNeed > 0) || logNeed > 0)) {
      await travel(place.rack.x, place.rack.z, 2.6);
      await require(() =>
        done ||
        (railNeed > 0 && place.rack.rails >= Math.min(railNeed, b.room(), 16)) ||
        (logNeed > 0 && place.rack.logs >= Math.min(logNeed, b.room())), 180000, 'frontier rack load');
      if (done) break;
      bot.press();
      await require(() => b.incoming === 0, 4000, 'rack load on back');
    } else await wait(150);
  }
  await require(() => done, 10000, 'Q5 full');
})();
export {};
