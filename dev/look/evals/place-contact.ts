// Bounded co-op contact probes through the existing broker/look runner, not a route pass.
// --players 2 --query 'proto=place&coop=1&probe=seats&delay=450&load=120'
// --eval dev/look/evals/place-contact.ts --until window.__contactDone --warm 150 --curves --video
// probe=ground stages the completed path, then walks into the earlier outage's position and idles.
const q = new URLSearchParams(location.search);
const who = q.get('player');
const { background } = await import('/src/async.ts' as string);
const { me, cam } = await import('/src/player/player.ts' as string);
const { net, remotes } = await import('/src/netplay/net.ts' as string);
const { COOP_IDENTITY } = await import('/src/proto/place/coop-identity.ts' as string);
const { lines } = await import('/src/proto/place/lines.ts' as string);
const { seatState } = await import('/src/proto/place/seat.ts' as string);
const { carry, toPlatform } = await import('/src/physics/platforms.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { watchLanding, landingEvidence } = await import('/dev/look/bots/place-landing.ts' as string);
const { makeBot } = await import('/dev/look/bot.ts' as string);
const { pressJump, releaseJump } = await import('/src/entities/player/state.ts' as string);
const { renderer } = await import('/src/render/scene.ts' as string);
const { gettingItem, press: putAwayGot } = await import('/src/proto/place/got.ts' as string);
// oxlint-disable-next-line typescript/no-explicit-any
const place = window.__place as any;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (fn: () => boolean, label: string) => {
  const end = performance.now() + 60000;
  while (!fn()) {
    if (performance.now() > end) throw new Error(`CONTACT ${who}: ${label}`);
    await wait(50);
  }
};
const delay = Math.min(1500, Math.max(0, Number(q.get('delay') ?? 0)));
const load = Math.min(250, Math.max(0, Number(q.get('load') ?? 0)));
const seconds = Math.min(90, Math.max(15, Number(q.get('hold') ?? 45)));
const warp = (window as unknown as { __warp?: { read(): { wall: number } } }).__warp;
const wallNow = () => (warp ? warp.read().wall * 1000 : performance.now());
let started = !q.has('capture');
net.room.onMessage((message: { t: string }) => {
  if (message.t === 'contactProbeStart') started = true;
});
Object.assign(window, {
  __startContact: () => {
    started = true;
    net.room.send({ t: 'contactProbeStart' });
  },
});
watchLanding();
if (q.get('probe') === 'seats') await import('/dev/look/evals/place-seats-workshop.ts' as string);
background(
  (async () => {
    await until(() => net.state === 'live' && remotes.size > 0, 'partner');
    if (q.get('probe') === 'seats') {
      await until(() => !!(window as unknown as { __seatWorkshopDone?: boolean }).__seatWorkshopDone, 'seat fixture');
    } else {
      await wait(1800);
      if (who === '1') place.coop.skip('path', place.skipPath);
      await until(() => place.lines[0].open, 'path shared');
      await wait(1800);
    }
    Object.assign(window, { __contactReady: true });
    await until(() => started, 'capture started');
    // Delay immutable authority snapshots, maintaining their order; all other room traffic stays live.
    const room = net.room;
    // Staging the path earns upgrades. Dismiss their cards as the full route bot does before walking.
    const cards = setInterval(() => {
      if (gettingItem()) putAwayGot();
    }, 250);
    const send = room.send.bind(room);
    let delayed = 0;
    room.send = (message: Record<string, unknown>) => {
      if (delay && message.t === COOP_IDENTITY && message.k === 'snap') {
        const copy = structuredClone(message);
        delayed++;
        setTimeout(() => send(copy), delay);
      } else send(message);
    };
    const busy = setInterval(() => {
      if (who !== '2' || !load) return;
      const end = wallNow() + load;
      while (wallNow() < end) {
        /* Controlled page stall, never a performance benchmark. */
      }
    }, 700);
    const car = lines[0].train.tr.cars[1];
    const samples: unknown[] = [];
    let failures = 0;
    let peakRemoteOffset = 0;
    let remoteOrigin: { x: number; z: number } | null = null;
    const initialSeat = seatState().sitting;
    const start = performance.now();
    const sampler = setInterval(() => {
      const local = { x: 0, y: 0, z: 0, yaw: 0 };
      toPlatform(car.platform, me.body.position, me.yaw, local);
      const remote = [...remotes.values()][0];
      const avatar = remote?.avatar;
      let drawn: { x: number; y: number; z: number } | null = null;
      if (avatar) {
        const point = car.mesh.worldToLocal(avatar.position.clone());
        drawn = { x: point.x, y: point.y, z: point.z };
        remoteOrigin ??= { x: point.x, z: point.z };
        peakRemoteOffset = Math.max(peakRemoteOffset, Math.hypot(point.x - remoteOrigin.x, point.z - remoteOrigin.z));
      }
      const seat = seatState();
      if (q.get('probe') === 'seats' && (seat.sitting !== initialSeat || carry.on !== car.platform || me.swimming))
        failures++;
      samples.push({
        t: performance.now() - start,
        seat: seat.sitting,
        release: seat.lastRelease,
        carry: carry.on?.id,
        local,
        drawn,
        ride: remote?.ride ? { on: remote.ride.on, leaving: remote.ride.leaving, weight: remote.ride.w } : null,
        coyote: me.coyote,
        trains: lines.map((l: { train: { tr: { s: number; v: number; target: number } } }) => ({
          s: l.train.tr.s,
          v: l.train.tr.v,
          target: l.train.tr.target,
        })),
        draws: renderer.info.render.drawCalls,
      });
    }, 100);
    try {
      if (q.get('probe') === 'ground') {
        // Begin a short distance away; retain the approach rather than repeatedly resetting the failed pose.
        const x = 976.9396362304688,
          z = -92.01862335205078;
        teleport(me.body, x + (who === '1' ? -3 : 3), place.H(x, z) + 1, z);
        me.body.velocity.set(0, 0, 0);
        cam.yaw = 0;
        const bot = makeBot();
        if (!(await bot.walk(x, z + (who === '1' ? -1 : 0), 0.12, { limit: 15000 })))
          throw new Error('Ground approach failed');
        window.__debugCam?.set([x + 9, place.H(x, z) + 6, z + 10], [x, place.H(x, z) + 1, z]);
        await wait(seconds * 1000);
        const before = landingEvidence();
        const y = me.body.position.y;
        let rise = 0;
        pressJump();
        for (let i = 0; i < 15; i++) {
          await wait(60);
          rise = Math.max(rise, me.body.position.y - y);
        }
        releaseJump();
        console.log(`CONTACT ${who} ground ${JSON.stringify({ before, rise })}`);
        if (before.coyote <= 0 || rise < 0.5) throw new Error('Ground idle/jump failed');
      } else await wait(seconds * 1000);
    } finally {
      clearInterval(busy);
      clearInterval(sampler);
      clearInterval(cards);
      room.send = send;
      console.log(
        `CONTACT ${who} result ${JSON.stringify({ delay, load, delayed, failures, peakRemoteOffset, samples })}`,
      );
    }
    if (failures) throw new Error(`Lost seated contact in ${failures} samples`);
    if (q.get('probe') === 'seats' && peakRemoteOffset > 0.5)
      throw new Error(`Partner moved ${peakRemoteOffset.toFixed(3)} m relative to its chair`);
    Object.assign(window, { __contactDone: true });
  })(),
  'co-op contact probe',
);
export {};
