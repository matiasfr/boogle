// Focused broker fixture: --players 2 --query 'proto=place&coop=1&probe=seats|workshop'
// --eval dev/look/evals/place-seats-workshop.ts --until 'window.__seatWorkshopDone'
// Stages completion, then uses actual movement/Interact/Jump. Not a whole-run or discovery test.
const q = new URLSearchParams(location.search);
const who = q.get('player') ?? '1';
const { me, cam } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { fromPlatform, toPlatform, carry } = await import('/src/physics/platforms.ts' as string);
const { net, remotes } = await import('/src/netplay/net.ts' as string);
const { lines } = await import('/src/proto/place/lines.ts' as string);
const { forge, snapForge, crateIn, HAND_LOGS } = await import('/src/proto/place/forge.ts' as string);
const { TUNE, FORGE, ORIGIN } = await import('/src/proto/place/layout.ts' as string);
const { H } = await import('/src/proto/place/land.ts' as string);
const { seatState, seated } = await import('/src/proto/place/seat.ts' as string);
const hands = await import('/src/player/hands.ts' as string);
const { pressJump, releaseJump } = await import('/src/entities/player/state.ts' as string);
const { input } = await import('/src/player/input.ts' as string);
const { dropGot, gettingItem } = await import('/src/proto/place/got.ts' as string);
const { background } = await import('/src/async.ts' as string);
// oxlint-disable-next-line typescript/no-explicit-any
const place = window.__place as any;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => boolean, what: string, ms = 20000) => {
  const end = performance.now() + ms;
  while (!fn()) {
    if (performance.now() > end) throw new Error(`SEATS ${who}: ${what}`);
    await wait(60);
  }
};
const put = (x: number, y: number, z: number) => {
  teleport(me.body, x, y, z);
  me.body.velocity.set(0, 0, 0);
};
const press = () => {
  hands.interactDown();
  hands.interactUp();
};
const marks = new Set<string>();
net.room.onMessage((m: { t: string; beat?: string }) => {
  if (m.t === 'seatWorkshopProbe' && m.beat) marks.add(m.beat);
});
const barrier = async (beat: string) => {
  if (q.get('coop') !== '1') return;
  const timer = setInterval(() => net.room.send({ t: 'seatWorkshopProbe', beat }), 100);
  try {
    await until(() => marks.has(beat), beat);
    await wait(300);
  } finally {
    clearInterval(timer);
  }
};
await until(() => !!me.body && (q.get('coop') !== '1' || remotes.size > 0), 'arrival');
await wait(1800);
if (who === '1') {
  if (q.get('coop') === '1') place.coop.skip('trains', place.skipTrains);
  else place.skipTrains();
}
await until(() => place.job.rung.trains, 'trains staged');
await wait(1800);
background(
  (async () => {
    if (q.get('probe') === 'seats') {
      const car = lines[0].train.tr.cars[1];
      const p = { x: 0, y: 0, z: 0, yaw: 0 };
      const cameraTimer = setInterval(() => {
        const b = car.body.position;
        window.__debugCam?.set([b.x + 6, b.y + 4, b.z + 6], [b.x, b.y + 1, b.z]);
      }, 50);
      fromPlatform(car.platform, { x: 0.65, y: car.platform.top + 0.48, z: -0.8, yaw: 0 }, false, p);
      put(p.x, p.y, p.z);
      await until(() => carry.on === car.platform && hands.interactTarget()?.id === 'place-sit', 'Sit offered');
      const target = hands.interactTarget();
      await barrier('same-seat-request');
      // Retain the offered target on both peers, then invoke both requests before refreshing either prompt.
      target.run();
      await until(() => !!seatState().sitting, 'seat granted');
      await barrier('both-seated');
      await wait(1200);
      const state = seatState();
      if (q.get('coop') === '1' && Object.keys(state.grants).length !== 2)
        throw new Error('Expected two unique grants');
      const l = { x: 0, y: 0, z: 0, yaw: 0 };
      toPlatform(car.platform, me.body.position, me.yaw, l);
      console.log(`SEATS ${who} contention ${JSON.stringify(state)} local ${JSON.stringify(l)}`);
      if (Math.abs(l.x + 0.1) > 0.25 || Math.abs(Math.abs(l.z) - 0.8) > 0.2)
        throw new Error('Not held at authored anchor');
      await wait(3000);
      if (carry.on !== car.platform || !seatState().sitting) throw new Error('Detached from moving seat');
      if (who === '1') {
        pressJump();
        await wait(80);
        releaseJump();
      } else press();
      await until(() => !seated(), 'stand');
      await wait(400);
      toPlatform(car.platform, me.body.position, me.yaw, l);
      if (carry.on !== car.platform || Math.abs(l.x - 0.65) > 0.25) throw new Error('Unsafe seat exit');
      console.log(`SEATS ${who} ${who === '1' ? 'Jump' : 'Interact'} exit ${JSON.stringify(l)}`);
      await barrier('exited');
      await until(() => hands.interactTarget()?.id === 'place-sit', 'Sit again');
      press();
      await until(() => !!seatState().sitting, 'seated again');
      await barrier('recapture');
      // Keep framing the moving chairs through the captured real-time interval.
      setTimeout(() => clearInterval(cameraTimer), 60000);
    } else {
      const complete = () => {
        forge.logs = HAND_LOGS;
        forge.crates = TUNE.roofCrates - 1;
        snapForge();
      };
      if (q.get('coop') !== '1') complete();
      else if (place.coop.debug().amAuthority) place.coop.skip('trains', complete);
      await until(() => forge.crates === TUNE.roofCrates - 1, 'unfinished forge shared');
      await wait(800);
      dropGot(); // The fixture skipped unlocks; their presentation queue is outside this doorway check.
      const x = FORGE.x + ORIGIN.x,
        z = FORGE.z + ORIGIN.z,
        y = H(x, z);
      const lane = who === '1' ? -3.55 : -2.25;
      put(x + lane, y + 0.6, z + 6.4);
      cam.yaw = 0;
      cam.pitch = -0.4;
      input.keys.add('KeyW');
      await wait(700);
      input.keys.delete('KeyW');
      if (me.body.position.z < z + FORGE.d / 2 + 0.3) throw new Error('Unfinished forge allowed entry');
      console.log(`WORKSHOP ${who} unfinished doorway blocked at ${me.body.position.z}`);
      await barrier('unfinished-checked');
      if (q.get('coop') !== '1') crateIn();
      else if (place.coop.debug().amAuthority) place.coop.skip('trains', crateIn);
      await until(() => forge.crates >= TUNE.roofCrates, 'last crate shared');
      await wait(1500);
      const walk = async (dx: number, dz: number) => {
        const end = performance.now() + 15000;
        try {
          while (Math.hypot(me.body.position.x - x - dx, me.body.position.z - z - dz) > 0.25) {
            if (performance.now() > end)
              throw new Error(
                `Workshop walk failed ${dx},${dz}: ${JSON.stringify({ position: me.body.position, reward: gettingItem(), crates: forge.crates })}`,
              );
            cam.yaw = me.yaw = Math.atan2(me.body.position.x - x - dx, me.body.position.z - z - dz);
            input.keys.add('KeyW');
            await wait(30);
          }
        } finally {
          input.keys.delete('KeyW');
        }
        console.log(`WORKSHOP ${who} walked ${dx},${dz} at ${JSON.stringify(me.body.position)}`);
      };
      await barrier('door-ready');
      await walk(lane, 1);
      await barrier('inside');
      if (who === '2') await walk(lane, 6.4);
      await barrier('opposite-sides');
      await walk(lane, who === '1' ? 6.4 : 1);
      await barrier('passed');
      await walk(lane, 1);
      if (me.body.position.y < y + 0.85 || me.swimming) throw new Error('Workshop floor is unsafe');
      if (who === '1') {
        await walk(2.7, 1.4);
        await until(() => hands.interactTarget()?.id === 'place-sit', 'workshop Sit');
        press();
        await until(() => !!seatState().sitting, 'workshop seated');
        console.log(`WORKSHOP seat ${JSON.stringify(seatState())}`);
      }
      await barrier('workshop-done');
      // Cutaways follow the gameplay camera; align it with the diagnostic overview before freezing that view.
      cam.yaw = -0.65;
      cam.pitch = -0.6;
      window.__debugCam?.set([x - 9, y + 10, z + 12], [x, y + 1.2, z]);
      await wait(800);
    }
    Object.assign(window, { __seatWorkshopDone: true });
  })(),
  'seat/workshop capture',
);
export {};
