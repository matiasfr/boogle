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
const { CARRY, carry, toPlatform, fromPlatform, yawOf } = await import('/src/physics/platforms.ts' as string);
const { teleport, onPreStep, forEachContact } = await import('/src/physics/engine.ts' as string);
const { PLAYER_R } = await import('/src/constants.ts' as string);
const { watchLanding, landingEvidence } = await import('/dev/look/bots/place-landing.ts' as string);
const { makeBot } = await import('/dev/look/bot.ts' as string);
const { pressJump, releaseJump } = await import('/src/entities/player/state.ts' as string);
const { renderer } = await import('/src/render/scene.ts' as string);
const { gettingItem, press: putAwayGot } = await import('/src/proto/place/got.ts' as string);
const hands = await import('/src/player/hands.ts' as string);
const { input } = await import('/src/player/input.ts' as string);
const { onFrame } = await import('/src/loop.ts' as string);
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
const beats = new Set<string>();
net.room.onMessage((message: { t: string; beat?: string }) => {
  if (message.t === 'contactProbeStart') started = true;
  if (message.t === 'seatWorkshopProbe' && message.beat?.startsWith('contact:')) beats.add(message.beat);
});
const barrier = async (name: string) => {
  const beat = `contact:${name}`;
  const timer = setInterval(() => net.room.send({ t: 'seatWorkshopProbe', beat }), 100);
  try {
    await until(() => beats.has(beat), beat);
    await wait(300);
  } finally {
    clearInterval(timer);
  }
};
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
    let phase = 'ride';
    let peakRemoteOffset = 0;
    let remoteOrigin: { x: number; z: number } | null = null;
    const initialSeat = seatState().sitting;
    const start = performance.now();
    const visual: { t: number; phase: string; on: boolean; weight: number; x: number; y: number; z: number }[] = [];
    let recording = true;
    const carryPose = () => {
      const local = { x: 0, y: 0, z: 0, yaw: 0 };
      toPlatform(car.platform, me.body.position, me.yaw, local);
      return {
        on: carry.on?.id ?? null,
        local,
        gap: local.y - PLAYER_R - (car.platform.topAt?.(local.x, local.z) ?? car.platform.top),
        bodyVy: me.body.velocity.y,
        carryY: carry.y,
        deckVy: car.body.velocity.y,
        jump: me.jumpQueued,
      };
    };
    let beforeSeat = carryPose(),
      afterSeat = beforeSeat,
      beforeCarry = beforeSeat;
    const carryLosses: unknown[] = [];
    let sharpVerticalChanges = 0;
    onPreStep(
      () => {
        if (!recording) return;
        beforeSeat = carryPose();
        if (
          phase === 'ride' &&
          seatState().sitting &&
          beforeSeat.on === car.platform.id &&
          beforeSeat.deckVy - beforeSeat.carryY > CARRY.leaveVy
        )
          sharpVerticalChanges++;
      },
      { order: 20 },
    );
    onPreStep(
      () => {
        if (recording) afterSeat = carryPose();
      },
      { order: 22 },
    );
    onPreStep(
      () => {
        if (recording) beforeCarry = carryPose();
      },
      { order: 39.5 },
    );
    onPreStep(
      () => {
        if (
          !recording ||
          phase !== 'ride' ||
          !seatState().sitting ||
          beforeCarry.on !== car.platform.id ||
          carry.on === car.platform ||
          carryLosses.length >= 20
        )
          return;
        const previousContacts: number[][] = [];
        forEachContact(me.body, (x: number, y: number, z: number) => {
          if (previousContacts.length < 8) previousContacts.push([x, y, z]);
        });
        carryLosses.push({
          t: performance.now() - start,
          beforeSeat,
          afterSeat,
          beforeCarry,
          afterCarry: carryPose(),
          seat: seatState(),
          previousContacts,
        });
      },
      { order: 41 },
    );
    if (q.has('transitions'))
      onFrame(
        () => {
          const remote = [...remotes.values()][0];
          if (!recording || !remote?.avatar || visual.length >= 6000) return;
          const p = car.mesh.worldToLocal(remote.avatar.position.clone());
          visual.push({
            t: performance.now() - start,
            phase,
            on: !!remote.ride?.on,
            weight: remote.ride?.w ?? 0,
            x: p.x,
            y: p.y,
            z: p.z,
          });
        },
        { phase: 'late' },
      );
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
        if (phase === 'ride')
          peakRemoteOffset = Math.max(peakRemoteOffset, Math.hypot(point.x - remoteOrigin.x, point.z - remoteOrigin.z));
      }
      const seat = seatState();
      if (
        phase === 'ride' &&
        q.get('probe') === 'seats' &&
        (seat.sitting !== initialSeat || carry.on !== car.platform || me.swimming)
      )
        failures++;
      samples.push({
        t: performance.now() - start,
        phase,
        seat: seat.sitting,
        release: seat.lastRelease,
        carry: carry.on?.id,
        local,
        drawn,
        ride: remote?.ride
          ? {
              on: remote.ride.on,
              leaving: remote.ride.leaving,
              weight: remote.ride.w,
              bodyOn: remote.ride.bodyOn,
              ageMs: performance.now() - remote.ride.lastSeen,
              worldGap: remote.ride.world.distanceTo(remote.target),
            }
          : null,
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
      } else {
        await wait(seconds * 1000);
        if (q.has('transitions')) {
          const mark = async (name: string) => {
            await barrier(name);
            phase = name;
            console.log(`CONTACT ${who} ${name} at ${performance.now() - start}`);
          };
          const press = () => {
            hands.interactDown();
            hands.interactUp();
          };
          await mark('departure');
          if (who === '2') {
            press(); // Stand, then really jump sideways off the moving deck.
            cam.yaw = yawOf(car.body.quaternion) + Math.PI;
            input.keys.add('KeyD');
            pressJump();
            await wait(800);
            input.keys.delete('KeyD');
            releaseJump();
          } else await wait(800);
          await wait(1200);
          if (who === '1' && [...remotes.values()][0]?.ride?.on)
            throw new Error('Partner still drawn riding after departure');
          if (who === '2' && carry.on === car.platform) throw new Error('Did not leave the deck');
          await mark('arrival');
          if (who === '2') {
            // A staged return, not a claim that the player can jump back from this location.
            const at = { x: 0, y: 0, z: 0, yaw: 0 };
            fromPlatform(car.platform, { x: 0.65, y: car.platform.top + 0.48, z: -0.8, yaw: 0 }, false, at);
            teleport(me.body, at.x, at.y, at.z);
            // Stage the deck's momentum too; do not bring the earlier jump's carry into the return teleport.
            carry.on = null;
            carry.x = car.body.velocity.x;
            carry.y = car.body.velocity.y;
            carry.z = car.body.velocity.z;
            me.body.velocity.set(carry.x, carry.y, carry.z);
            await until(() => hands.interactTarget()?.id === 'place-sit', 'return Sit');
            press();
            await until(() => !!seatState().sitting, 'return seat');
          }
          await barrier('returned');
          await wait(1800);
          if (who === '1' && ![...remotes.values()][0]?.ride?.on) throw new Error('Partner did not reattach');
          const presence = room.presence.bind(room);
          try {
            await mark('stale');
            if (who === '2') room.presence = () => Promise.resolve();
            await wait(2000);
            if (who === '1' && [...remotes.values()][0]?.ride?.on) throw new Error('Stale riding did not expire');
            room.presence = presence;
            await mark('fresh');
            await wait(1800);
            if (who === '1' && ![...remotes.values()][0]?.ride?.on) throw new Error('Fresh riding did not reattach');
            await mark('unknown');
            if (who === '2')
              room.presence = (pr: Record<string, unknown>) =>
                presence({
                  ...pr,
                  riding: Array.isArray(pr.riding) ? ['contact-unknown-platform', ...pr.riding.slice(1)] : pr.riding,
                });
            await wait(1600);
            if (who === '1' && [...remotes.values()][0]?.ride?.on) throw new Error('Unknown platform stayed attached');
            room.presence = presence;
            await mark('known');
            await wait(1800);
            if (who === '1' && ![...remotes.values()][0]?.ride?.on) throw new Error('Known platform did not reattach');
          } finally {
            room.presence = presence;
          }
          console.log(`CONTACT ${who} transitions passed`);
        }
      }
    } finally {
      clearInterval(busy);
      recording = false;
      clearInterval(sampler);
      clearInterval(cards);
      room.send = send;
      console.log(
        `CONTACT ${who} result ${JSON.stringify({ delay, load, delayed, failures, peakRemoteOffset, sharpVerticalChanges, carryLosses, samples })}`,
      );
      if (visual.length) console.log(`CONTACT ${who} visual ${JSON.stringify(visual)}`);
    }
    if (failures) throw new Error(`Lost seated contact in ${failures} samples`);
    if (carryLosses.length) throw new Error(`Lost seated carry in ${carryLosses.length} fixed steps`);
    if (q.get('probe') === 'seats' && peakRemoteOffset > 0.5)
      throw new Error(`Partner moved ${peakRemoteOffset.toFixed(3)} m relative to its chair`);
    Object.assign(window, { __contactDone: true });
  })(),
  'co-op contact probe',
);
export {};
