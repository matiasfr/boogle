// Broker look fixture, not a new harness. Stages Q5, then uses real cart ticks and Interact.
// &whistle=gap|waiting|loading|forge|recall|unloading|pair|leave|legacy; --until window.__whistleDone --warm 240.
const q = new URLSearchParams(location.search);
const mode = q.get('whistle') ?? 'gap';
const who = q.get('player') ?? '1';
// oxlint-disable-next-line typescript/no-explicit-any
const place = window.__place as any;
const depot = (await import(
  '/src/proto/place/depot.ts' as string
)) as typeof import('../../../src/proto/place/depot.ts');
const { coop } = (await import(
  '/src/proto/place/coop.ts' as string
)) as typeof import('../../../src/proto/place/coop.ts');
const { net } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { TX, TZ } = (await import(
  '/src/proto/place/lines.ts' as string
)) as typeof import('../../../src/proto/place/lines.ts');
const { captureShared, applyShared } = (await import(
  '/src/proto/place/job.ts' as string
)) as typeof import('../../../src/proto/place/job.ts');
const hands = (await import('/src/player/hands.ts' as string)) as typeof import('../../../src/player/hands.ts');
const { dropGot } = (await import(
  '/src/proto/place/got.ts' as string
)) as typeof import('../../../src/proto/place/got.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { cart, rack } = depot;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const until = async (fn: () => boolean, what: string, ms = 150000) => {
  const end = performance.now() + ms;
  while (!fn()) {
    if (performance.now() > end) throw new Error(`WHISTLE ${who} timeout: ${what}`);
    await wait(25);
  }
};
const check = (what: string, ok: boolean) => {
  if (!ok) throw new Error(`WHISTLE ${who} FAIL ${what}`);
  console.log(`WHISTLE ${who} PASS ${what}`);
};
const put = (x: number, z: number, targetX: number, targetZ: number) => {
  teleport(me.body!, x, place.H(x, z) + 0.9, z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(x - targetX, z - targetZ);
  window.__debugCam?.clear();
};
const atForge = () => put(TX - (who === '2' ? 2 : 4.1), TZ + (who === '2' ? 4.4 : 4.1), TX - 2.8, TZ + 2.8);
const atRack = () => put(rack.x - 4.2, rack.z + 4, rack.x, rack.z);
const paired = mode === 'pair' || mode === 'leave' || mode === 'legacy';
let recallSnapshot = false;
const marks = new Set<string>();
net.room?.onMessage((raw) => {
  const m = raw as { t?: unknown; phase?: unknown; k?: unknown; force?: unknown };
  if (m.t === 'whistleProbe' && typeof m.phase === 'string') marks.add(m.phase);
  if (m.k === 'snap' && m.force === true) recallSnapshot = true;
});
const barrier = async (phase: string) => {
  const send = () => net.room!.send({ t: 'whistleProbe', phase });
  send();
  const timer = setInterval(send, 100);
  try {
    await until(() => marks.has(phase), phase);
    await wait(300);
  } finally {
    clearInterval(timer);
  }
};
const setup = () => {
  place.skipQ5();
  cart.recallQueued = cart.auto = cart.manual = cart.boost = false;
  place.forge.rails = mode === 'waiting' ? 0 : 40;
};
coop.skips({ whistle: setup });
await until(() => !!me.body, 'player');
// A normal follow camera at phone dimensions; no fixed debug view or audio-dependent cue.
setTimeout(() => window.__debugCam?.clear(), 700);
background(
  (async () => {
    if (paired) {
      await until(() => coop.debug().peers.length === 1, 'partner');
      await barrier('ready');
    }
    if (who === '1') coop.skip('whistle', setup);
    await until(() => place.activeFrame()?.spec.id === 'Q5' && rack.on, 'Q5');
    await wait(1200);
    if (mode === 'forge') {
      atForge();
      await wait(400);
      check('forge handle prompt', hands.interactTarget()?.verb === 'Call cart to forge');
    } else if (mode === 'waiting') {
      const dry = setInterval(() => {
        place.forge.rails = 0;
        place.forge.pour = -1000;
      }, 20);
      await until(() => cart.leg === 'forge' && cart.auto, 'forge wait');
      check('distinct forge waiting', depot.deliveryStatus() === 'waiting');
      atRack();
      // Keep the intentionally dry forge through the capture.
      setTimeout(() => clearInterval(dry), 120000);
    } else if (mode === 'loading') {
      await until(() => cart.leg === 'load', 'loading');
      atRack();
    } else if (mode === 'gap') {
      await until(() => rack.rails === 16 && rack.logs === 24, 'first shipment');
      atRack();
      // Consume the first shipment as Q5's remaining eight-rail bill, then wait for the real second cart.
      const st = place.activeFrame();
      st.have.logs = st.need('logs');
      st.have.rails = 16;
      depot.rackTake(24, 16);
      check('empty rack stays active', depot.deliveryStatus() !== 'done' && rack.rails === 0);
      await until(() => cart.leg === 'out' && cart.rails === 8, 'second shipment');
      check('zero debt is still travelling', depot.railsOwed() === 0 && depot.deliveryStatus() === 'travelling');
    } else {
      await until(() => cart.leg === 'out' && cart.rails === 16 && !cart.called, 'loaded delivery');
      atForge();
      dropGot();
      await wait(300);
      console.log(
        `WHISTLE ${who} approach ${JSON.stringify({ p: me.body!.position, target: hands.interactTarget()?.id, cart })}`,
      );
      await until(() => hands.interactTarget()?.verb === 'Call cart to forge', 'call prompt after approach', 5000);
      const target = hands.interactTarget();
      check('loaded call offered', target?.verb === 'Call cart to forge');
      if (paired) {
        await barrier('call');
        // Both already chose the offered action: a peer's first receipt must not cancel the second request.
        target?.run?.();
      } else {
        hands.interactDown();
        hands.interactUp();
      }
      check('instant acknowledgement', cart.recallQueued || coop.recallPending());
      await until(() => cart.recallQueued, 'accepted recall');
      check('delivery not reversed', cart.leg === 'out' && cart.rails === 16);
      check('queued recall saved', (captureShared().depot as { recallQueued: boolean }).recallQueued);
      if (mode === 'recall') {
        Object.assign(window, { __whistleDone: true });
        return;
      }
      if (mode === 'leave') {
        await barrier('accepted');
        const leaving = !coop.follower();
        if (leaving) {
          net.room!.pause(20000);
          await wait(23000);
        } else {
          await until(() => coop.debug().peers.length === 0, 'authority removed');
          check('survivor keeps queued delivery', !coop.follower() && cart.recallQueued && cart.rails === 16);
        }
      }
      if (mode === 'legacy') {
        await barrier('accepted');
        recallSnapshot = false;
        if (coop.follower()) {
          // Model an older participant appearing after acceptance: withdraw its additive capability.
          const presence = net.room!.presence.bind(net.room);
          net.room!.presence = (patch) => presence({ ...(patch as Record<string, unknown>), placeCartRecall: null });
        } else {
          await until(() => !coop.recallSupported(), 'late legacy capability');
        }
      }
      atRack();
      await until(() => depot.deliveryStatus() === 'unloading', 'unloading');
      check('recall remains queued while unloading', cart.recallQueued);
      if (mode === 'unloading') {
        Object.assign(window, { __whistleDone: true });
        return;
      }
      await until(() => cart.rails === 0, 'cargo in flight');
      if (!coop.follower()) applyShared(captureShared()); // settle a saved in-flight unload once
      await until(() => cart.called && !cart.recallQueued, 'return after unload');
      check('one full mixed delivery before recall', rack.rails === 16 && rack.logs === 24);
      if (mode === 'legacy' && coop.follower()) check('late legacy return uses atomic snapshot', recallSnapshot);
      await until(() => cart.leg === 'forge', 'recall reaches forge');
      check('no duplicated delivery', rack.rails === 16 && rack.logs === 24);
      atForge();
    }
    console.log(
      `WHISTLE ${who} ${mode}: ${JSON.stringify({ status: depot.deliveryStatus(), cart, rack: [rack.logs, rack.rails] })}`,
    );
    Object.assign(window, { __whistleDone: true });
  })(),
  'cart whistle evidence',
);
export {};
