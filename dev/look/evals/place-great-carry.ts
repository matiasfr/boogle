// Existing look harness: --players 2 --query 'proto=place&coop=1&greatCarry=pair' --eval dev/look/evals/place-coop.ts
// --until window.__coopDone --warm 180. greatCarry=solo|pair|drop|retry|gate|helper-leave|carrier-leave.
// &follower=1 swaps cargo owner (required for retry); &gateStop=1 frames the unavailable tree at Station 1.
const q = new URLSearchParams(location.search);
const mode = q.get('greatCarry') ?? 'pair';
const saved = q.has('saved');
const { COOP_IDENTITY, currentCoopPeer } = (await import(
  '/src/proto/place/coop-identity.ts' as string
)) as typeof import('../../../src/proto/place/coop-identity.ts');
// oxlint-disable-next-line typescript/no-explicit-any
const place = window.__place as any;
const { net, remotes } = (await import(
  '/src/netplay/net.ts' as string
)) as typeof import('../../../src/netplay/net.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input, inputState } = (await import(
  '/src/player/input-state.ts' as string
)) as typeof import('../../../src/player/input-state.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const tree = (await import('/src/proto/place/chop.ts' as string)) as typeof import('../../../src/proto/place/chop.ts');
const { greatCarry } = (await import(
  '/src/proto/place/great-carry.ts' as string
)) as typeof import('../../../src/proto/place/great-carry.ts');
const { coop } = (await import(
  '/src/proto/place/coop.ts' as string
)) as typeof import('../../../src/proto/place/coop.ts');
const { captureShared } = (await import(
  '/src/proto/place/job.ts' as string
)) as typeof import('../../../src/proto/place/job.ts');
const hands = (await import('/src/player/hands.ts' as string)) as typeof import('../../../src/player/hands.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const got = (await import('/src/proto/place/got.ts' as string)) as typeof import('../../../src/proto/place/got.ts');
const { heldId } = (await import(
  '/src/player/inventory.ts' as string
)) as typeof import('../../../src/player/inventory.ts');
const { pair } = (await import(
  '/src/proto/place/pair.ts' as string
)) as typeof import('../../../src/proto/place/pair.ts');
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const until = async (fn: () => boolean, label: string, ms = 30000) => {
  const end = performance.now() + ms;
  while (!fn()) {
    if (performance.now() > end)
      throw new Error(
        `GREAT timeout: ${label} ${JSON.stringify({ p: me.body?.position, prompt: hands.interactTarget()?.verb, target: hands.interactTarget()?.id, reward: got.gettingItem(), held: heldId(), inputHeld: inputState.held, back: tree.back.big, mode: place.run.mode, stage: place.lines[0].stage, greatReady: tree.chopHooks.greatReady(), work: tree.greatTree.work })}`,
      );
    await wait(50);
  }
};
const check = (label: string, ok: boolean, detail: unknown = '') => {
  if (!ok)
    throw new Error(
      `GREAT FAIL ${label}: ${JSON.stringify({ detail, p: me.body?.position, reward: got.gettingItem(), inputHeld: inputState.held, target: hands.interactTarget()?.id })}`,
    );
  console.log(`GREAT PASS ${label}: ${JSON.stringify(detail)}`);
};
const messages = new Set<string>(),
  entered = new Set<string>(),
  ack = new Set<string>();
let carryAction = () => {};
const send = (phase: string, answer = false) => net.room!.send({ t: 'greatProbe', phase, ack: answer });
net.room!.onMessage((raw) => {
  const m = raw as { t?: unknown; phase?: unknown; ack?: unknown };
  if (m.t !== 'greatProbe' || typeof m.phase !== 'string') return;
  if (m.ack) {
    ack.add(m.phase);
    return;
  }
  if (m.phase === 'action') carryAction();
  messages.add(m.phase);
  if (entered.has(m.phase)) send(m.phase, true);
});
const barrier = async (phase: string) => {
  entered.add(phase);
  if (messages.has(phase)) send(phase, true);
  send(phase);
  const timer = setInterval(() => send(phase), 200);
  try {
    await until(() => messages.has(phase) && ack.has(phase), phase, 120000);
  } finally {
    clearInterval(timer);
  }
};
const stop = () => {
  input.stickX = input.stickY = 0;
  input.keys.clear();
};
const put = async (x: number, z: number) => {
  await until(() => !got.gettingItem(), 'reward dismissed before positioning');
  stop();
  if (saved) check('walk to beam position', await makeBot().walk(x, z, 0.5, { limit: 120000 }));
  else {
    teleport(me.body!, x, place.H(x, z) + 0.9, z);
    me.body!.velocity.set(0, 0, 0);
  }
  cam.yaw = me.yaw = Math.PI;
};
const press = async (verb: string) => {
  await until(() => hands.interactTarget()?.verb === verb, `${verb} offered`);
  if (hands.interactTarget()?.click) {
    hands.useDown();
    hands.useUp();
  } else {
    hands.interactDown();
    hands.interactUp();
  }
  await wait(250);
};
async function run() {
  // Stage skips can award the follower a shared multi-axe. Put it away through the same dismissal as the full bot.
  const dismiss = setInterval(() => {
    if (got.gettingItem()) got.press();
  }, 250);
  await until(() => !!me.body && coop.debug().peers.length > 0, 'joined');
  await barrier('ready');
  await wait(2000);
  const authority = coop.debug().amAuthority;
  const carrier = q.has('follower') ? !authority : authority;
  // The broker restores only player 1. Player 2 walks the authored opening path,
  // whose switchbacks the general pathfinder cannot shortcut across the cliff.
  if (saved && q.get('player') === '2') {
    const path = place.PATH_SAMPLES[0] as number[][];
    for (let n = 0; n < path.length; n += 3)
      check('walk opening path', await makeBot().walk(path[n]![0]! + place.ORIGIN.x, path[n]![1]!, 1.8));
  }
  await barrier('opening path');
  if (!saved) {
    if (authority) place.wake();
    await until(() => place.job.awake && place.run.mode === 'idle', 'Station 1 active');
    await put(tree.greatTree.x + (authority ? -1.3 : 1.3), tree.greatTree.z + 1.5);
    await wait(700);
    check(
      'great-tree prompt checked in reach with hands free',
      !got.gettingItem() &&
        !inputState.held &&
        Math.hypot(me.body!.position.x - tree.greatTree.x, me.body!.position.z - tree.greatTree.z) < 4.6,
    );
    check('Station 1 offers a rebound attempt', hands.interactTarget()?.id === 'place-great');
    await press('Chop');
    await wait(500);
    tree.chopHooks.harvest!(tree.greatTree, 0, 0, 0); // bypass UI: authority must still reject the stroke
    await until(() => !coop.debug().harvestPending, 'early harvest request settled');
    check(
      'early great-tree strokes change no shared work',
      tree.greatTree.work === 0 && tree.greatTree.revision === 0 && tree.greatTree.fall < 0,
    );
    await barrier('early chopping refused');
    if (q.has('gateStop')) {
      const t = tree.greatTree;
      window.__debugCam!.set([t.x - 16, t.y + 12, t.z + 18], [t.x, t.y + 5, t.z]);
      clearInterval(dismiss);
      Object.assign(window, { __coopDone: true });
      return;
    }
    if (mode !== 'gate') {
      // Historical already-felled rooms stay valid despite the new felling gate.
      if (authority) {
        tree.applyTreeHarvest(tree.greatTree, {
          work: 12,
          issued: 0,
          ceiling: 0,
          revision: 1,
          fell: true,
          fallYaw: 0,
          collapsed: false,
        });
        net.room!.send({
          t: COOP_IDENTITY,
          k: 'snap',
          snap: { gen: coop.debug().gen, shared: captureShared() },
          force: true,
        });
      }
      await until(() => tree.trunkDown(), 'legacy felled tree loaded during Station 1');
      const early = tree.trunkAt();
      await put(early.x + (authority ? -2.5 : 2.5), early.z);
      await wait(700);
      check('Station 1 has no trunk prompt', hands.interactTarget()?.verb !== 'Shoulder the trunk');
      const { save, restore } = (await import(
        '/src/proto/place/job.ts' as string
      )) as typeof import('../../../src/proto/place/job.ts');
      const { bigCargo } = (await import(
        '/src/proto/place/big-cargo.ts' as string
      )) as typeof import('../../../src/proto/place/big-cargo.ts');
      const { triggerAction } = (await import(
        '/src/player/controls.ts' as string
      )) as typeof import('../../../src/player/controls.ts');
      // Two old saves have each adopted their personal shoulder at revision zero.
      save();
      const key = Object.keys(localStorage).find((k) => k.startsWith('boogle-place-coop-v2:'))!;
      const old = JSON.parse(localStorage.getItem(key)!);
      old.shared.bigCargoV1.beam = { revision: 0, holder: net.myPeer, ground: null };
      old.shared.felled.trunk = true;
      old.personal.back = { logs: 0, rails: 0, stone: 0, big: 'beam' };
      localStorage.setItem(key, JSON.stringify(old));
      check('legacy adopted shoulder loads', restore() && tree.back.big === 'beam');
      await barrier('legacy shoulders loaded');
      if (authority)
        net.room!.send({
          t: COOP_IDENTITY,
          k: 'snap',
          snap: { gen: coop.debug().gen, shared: captureShared() },
          force: true,
        });
      await until(() => authority || tree.back.big === null, 'legacy duplicate shoulder cleared');
      check(
        'one authoritative legacy shoulder at revision zero',
        bigCargo.beam.revision === 0 && (authority ? tree.back.big === 'beam' : tree.back.big === null),
      );
      await barrier('legacy shoulder reconciled');
      if (authority) {
        teleport(me.body!, place.ORIGIN.x + 1000, 5, 1000);
        triggerAction('place-drop', 'down');
        await put(early.x - 2.5, early.z);
      }
      await until(() => tree.back.big === null && tree.trunkDown(), 'early legacy Drop frees both backs');
      check('legacy room can carry logs again', tree.back.room() > 0);
      await barrier('legacy room recovered');
      tree.back.logs = 2;
      coop.big('beam');
      await until(() => !coop.bigBusy(), 'early request rejected');
      check(
        'authority rejects early pickup without spending logs',
        tree.back.big === null && tree.back.logs === 2 && tree.trunkDown(),
      );
      await barrier('early pickup refused');
      tree.back.logs = 0;
      if (mode === 'retry') {
        if (!authority) {
          const room = net.room!,
            original = room.send.bind(room);
          let disconnected = false,
            reconnected = false;
          const attempts: string[] = [];
          room.onConnection((connected) => {
            if (!connected) disconnected = true;
            else if (disconnected) reconnected = true;
          });
          room.send = (raw) => {
            const m = raw as { t?: string; k?: string };
            if (m.t === COOP_IDENTITY && m.k === 'bigMove') {
              attempts.push(JSON.stringify(raw));
              if (attempts.length === 1) room.pause(800); // lost before delivery, shorter than peer removal
              return;
            }
            original(raw);
          };
          try {
            tree.back.logs = 2;
            check('lost request starts pending', coop.big('beam') && !!coop.debug().bigPending);
            await until(() => reconnected, 'short same-authority reconnect');
            await wait(2500); // blackhole retries as well: ordinary delivery must not wait for an answer
            check(
              'timeout retries the identical revisioned request',
              attempts.length >= 2 && attempts.every((m) => m === attempts[0]),
            );
            check(
              'same authority and pending revision survive short reconnect',
              !coop.debug().amAuthority && !!coop.debug().bigPending,
            );
            const station = place.lines[0].stations[0];
            await put(station.x, station.z);
            await until(
              () => tree.back.logs === 0 && station.have.logs >= 2,
              'ordinary logs unload while cargo replies are unavailable',
            );
            check(
              'ordinary delivery cannot be locked by pending cargo',
              !!coop.debug().bigPending && station.have.logs >= 2,
            );
          } finally {
            room.send = original;
          }
          await until(() => !coop.debug().bigPending && !coop.bigBusy(), 'abandoned request settled after retry');
          check('rejected retry conserves the legacy trunk', tree.trunkDown() && tree.back.big === null);
        }
        await barrier('cargo reconnect regression');
        check('short reconnect retains original authority', coop.debug().amAuthority === authority);
      }
    }
  }
  while (!saved && place.lines[0].stage < 2) {
    const stage = place.lines[0].stage;
    if (authority) coop.skip('delivery', place.skipDelivery);
    await until(() => place.lines[0].stage > stage, 'earlier station laid');
    await barrier(`stage ${stage}`);
    if (place.lines[0].stage === 1) {
      await wait(400);
      check('Station 2 has no trunk prompt', hands.interactTarget()?.verb !== 'Shoulder the trunk');
      if (mode === 'gate') {
        await press('Chop');
        await wait(500);
        check(
          'Station 2 great-tree attempts rebound without work',
          tree.greatTree.work === 0 && tree.greatTree.fall < 0,
        );
      }
    }
  }
  if (!saved) tree.back.logs = tree.back.rails = tree.back.stone = tree.back.incoming = 0;
  const st = place.lines[0].stations[2];
  if (authority && !saved) {
    // Keep the legacy-save assertions above, then earn a fresh beam through the current safe fall path.
    tree.resetTrees();
    st.have.logs = 40;
    st.drawStock(st.have);
    net.room!.send({
      t: COOP_IDENTITY,
      k: 'snap',
      snap: { gen: coop.debug().gen, shared: captureShared() },
      force: true,
    });
  }
  if (!saved) {
    await until(() => place.run.mode === 'idle' && place.lines[0].stage === 2, 'Station 3 active');
    await until(() => place.job.chest === 'axe', 'forty logs earn the axe chest');
    check(
      'Station 3 still rejects felling without the earned axe',
      !place.job.rung.axe && tree.harvestTree(tree.greatTree, 0, 0, 0).outcome === 'rebound',
    );
    await barrier('axe remains required');
    if (authority) {
      const chest = place.giftState.crates().find((c: { content: string }) => c.content === 'axe');
      if (!chest) throw new Error('Earned Station 3 axe chest missing');
      await put(chest.x + 2.4, chest.z);
      await press('Open the chest');
    }
    await until(() => place.job.rung.axe > 0 && !got.gettingItem(), 'proper axe shared and dismissed');
    await barrier('proper axe earned');
    await put(tree.greatTree.x + (authority ? -1.3 : 1.3), tree.greatTree.z + 1.5);
    await until(() => hands.interactTarget()?.id === 'place-great', 'Station 3 great-tree Chop appears');
    await barrier('chop together');
    while (tree.greatTree.fall < 0) {
      if (hands.interactTarget()?.id === 'place-great') {
        await press('Chop');
      }
      await wait(400);
    }
    await until(() => tree.trunkDown(), 'both peers see felled tree');
    check(
      'two-player chopping accepts exactly twelve strokes',
      tree.greatTree.work === 12 && tree.greatTree.revision === 12,
    );
    await barrier('great tree felled together');
  }
  if (saved && authority && !tree.trunkDown()) {
    await put(tree.greatTree.x, tree.greatTree.z + 3.5);
    while (tree.greatTree.fall < 0) await press('Chop');
  }
  await until(() => tree.trunkDown() && st.have.logs === 40, 'T3 and fallen trunk shared', 120000);
  await wait(2000);
  await until(() => !got.gettingItem(), 'staged rewards dismissed');
  const start = tree.trunkAt();
  await put(start.x + (carrier ? 2.5 : 15), start.z);
  await wait(700);
  await barrier('at source');
  if (carrier && mode === 'retry') {
    check('retry fixture uses the follower carrier', !authority);
    const { bigCargo } = (await import(
      '/src/proto/place/big-cargo.ts' as string
    )) as typeof import('../../../src/proto/place/big-cargo.ts');
    const room = net.room!,
      original = room.send.bind(room),
      revision = bigCargo.beam.revision;
    let attempts = 0;
    room.send = (raw) => {
      const m = raw as { t?: string; k?: string };
      if (m.t === COOP_IDENTITY && m.k === 'bigMove') {
        attempts++;
        if (attempts === 1) {
          room.pause(800);
          return;
        }
        original(raw); // deliver the retry twice: only one can spend its revision
      }
      original(raw);
    };
    try {
      await press('Shoulder the trunk');
      await until(() => tree.back.big === 'beam' && !coop.debug().bigPending, 'legal lost pickup retried and accepted');
      await wait(500);
      check(
        'legal retry picks up exactly once',
        attempts >= 2 && bigCargo.beam.revision === revision + 1 && tree.back.beam === 1,
      );
    } finally {
      room.send = original;
    }
  } else if (carrier) await press('Shoulder the trunk');
  await until(() => tree.trunkTaken(), 'pickup shared');
  // The fallen trunk is solid until pickup. Start the actual segment only after it has gone on both tabs.
  await put(start.x + (!carrier && mode === 'solo' ? 15 : 0), start.z - (carrier ? 0 : 3.4));
  await wait(700);
  await barrier('clear source');
  cam.yaw = me.yaw = Math.PI;
  console.log(
    `GREAT READY ${carrier ? 'carrier' : 'helper'} ${JSON.stringify({
      p: me.body!.position,
      yaw: me.yaw,
      prompt: hands.interactTarget()?.verb,
      back: {
        big: tree.back.big,
        logs: tree.back.logs,
        rails: tree.back.rails,
        stone: tree.back.stone,
        incoming: tree.back.incoming,
      },
      held: heldId(),
      heldInput: inputState.held,
      optionalGrip: pair.grip(),
      reward: got.gettingItem(),
      others: [...remotes.values()].map((r) => ({
        peer: r.peer,
        visible: r.visible,
        entered: r.entered,
        pose: r.snaps.sample(performance.now())?.b,
      })),
    })}`,
  );
  if (!carrier && mode !== 'solo') await press('Help carry');
  check(
    'shared capability accepts current publication and excludes retired builds',
    currentCoopPeer({ [COOP_IDENTITY]: 0 }) &&
      !currentCoopPeer({ placeCoopTrees1: 0 }) &&
      !currentCoopPeer({ [COOP_IDENTITY]: -1 }) &&
      !currentCoopPeer({ [COOP_IDENTITY]: 0.5 }),
  );
  if (mode !== 'solo') await until(() => (carrier ? greatCarry.assisted() : !!greatCarry.helping()), 'assistance');
  await barrier('grip');
  const frame = () => {
    const p = me.body!.position;
    window.__debugCam!.set([start.x - 18, p.y + 14, start.z + 8], [start.x, p.y + 0.6, start.z + 9]);
  };
  frame();
  if (mode === 'gate') {
    if (!carrier) await press('Let go');
    await until(() => !greatCarry.helping() && !greatCarry.assisted(), 'release before delivery');
    if (carrier) check('walk newly felled trunk to Station 3', await makeBot().walk(st.x, st.z, 3, { limit: 60000 }));
    await until(() => place.lines[0].open, 'accepted newly felled beam opens crossing', 60000);
    check('newly felled beam consumed once', tree.back.big === null && tree.trunkTaken());
    window.__debugCam!.set([st.x - 12, place.H(st.x, st.z) + 9, st.z - 14], [st.x, place.H(st.x, st.z) + 1, st.z]);
    await barrier('gate delivery complete');
  } else if (mode === 'drop' || mode === 'retry') {
    const { bigCargo, cargoGround } = (await import(
      '/src/proto/place/big-cargo.ts' as string
    )) as typeof import('../../../src/proto/place/big-cargo.ts');
    const { sweepSphere } = (await import(
      '/src/physics/engine.ts' as string
    )) as typeof import('../../../src/physics/engine.ts');
    const { triggerAction } = (await import(
      '/src/player/controls.ts' as string
    )) as typeof import('../../../src/player/controls.ts');
    const { save, restore } = (await import(
      '/src/proto/place/job.ts' as string
    )) as typeof import('../../../src/proto/place/job.ts');
    let spot: { x: number; z: number } | null = null;
    for (let dz = 0; dz <= 35 && !spot; dz += 2) {
      for (let dx = -12; dx <= 12 && !spot; dx += 2) {
        const p = { x: start.x + dx, y: place.H(start.x + dx, start.z + dz), z: start.z + dz, yaw: Math.PI };
        if (Math.hypot(p.x - st.x, p.z - st.z) < 14) continue;
        if (
          cargoGround(
            'beam',
            p,
            place.H,
            (x, y, z) =>
              sweepSphere({ x: p.x, y: p.y + 1.1, z: p.z }, { x, y, z }, 0.7, { mask: 0xfffe, thin: 'skip' }) < 0,
          )
        )
          spot = p;
      }
    }
    check('reachable dry test spot', !!spot);
    await put(spot!.x, spot!.z - (carrier ? 0 : 3.4));
    await wait(800);
    await barrier('drop position');
    if (!carrier && !greatCarry.helping()) await press('Help carry');
    await until(() => (carrier ? greatCarry.assisted() : !!greatCarry.helping()), 'drop assistance');
    await barrier('drop grip');
    if (carrier) {
      document.body.classList.add('touch');
      check('touch Drop stays visible with beam', document.body.classList.contains('place-has-load'));
      const button = document.querySelector('.place-drop-btn')!;
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
      button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    }
    await until(() => !!bigCargo.beam.ground && tree.back.big === null, 'ground beam on both peers');
    await until(() => !greatCarry.helping() && !greatCarry.assisted(), 'drop releases helper');
    const ground = { ...bigCargo.beam.ground! };
    check(
      'dropped beam uses existing shoulder prompt',
      tree.trunkDown() &&
        tree.trunkAt().distanceTo(new (await import('three/webgpu')).Vector3(ground.x, ground.y + 1.4, ground.z)) <
          0.01,
    );
    save();
    check('save restores ground pose', restore() && JSON.stringify(bigCargo.beam.ground) === JSON.stringify(ground));
    await barrier('ground saved');
    await wait(1500);
    check('reachable dropped beam survives periodic recovery', !!bigCargo.beam.ground);
    if (authority) bigCargo.beam.ground = { ...ground, x: place.ORIGIN.x + 1000, z: 1000 };
    await until(() => bigCargo.beam.ground === null, 'displaced beam returned on both peers');
    check(
      'unreachable ground beam returns once to pickup',
      tree.trunkDown() && tree.trunkAt().distanceTo(start) < 0.01,
    );
    await barrier('displaced beam recovered');
    if (!authority) coop.big('beam');
    await until(() => bigCargo.beam.holder !== null && !coop.bigBusy(), 'follower claim accepted');
    if (!authority) tree.putDownBig(); // lost local receipt/reservation across an election
    await barrier('lost receipt');
    if (authority)
      net.room!.send({
        t: COOP_IDENTITY,
        k: 'snap',
        snap: { gen: coop.debug().gen, shared: captureShared() },
        force: true,
      });
    await until(() => authority || tree.back.big === 'beam', 'accepted snapshot restores shoulder without reservation');
    await barrier('receipt reconciled');
    if (!authority) triggerAction('place-drop', 'down');
    await until(() => !bigCargo.beam.holder, 'reconciled claim dropped');
    await barrier('claim returned');
    // Both contenders request the same revision; only the accepted owner loses their old back load.
    tree.back.logs = 2;
    coop.big('beam');
    await until(() => bigCargo.beam.holder !== null && !coop.bigBusy(), 'race settled');
    await wait(400);
    const won = bigCargo.beam.holder === net.myPeer;
    check(
      'race has exactly one shoulder',
      won ? tree.back.big === 'beam' && tree.back.logs === 0 : tree.back.big === null && tree.back.logs === 2,
    );
    await barrier('race checked');
    tree.back.logs = 0;
    if (won) {
      teleport(me.body!, place.ORIGIN.x + 1000, 5, 1000);
      triggerAction('place-drop', 'down');
    }
    await until(() => tree.trunkDown() && bigCargo.beam.holder === null, 'unsafe drop returned');
    check(
      'unsafe drop returns original pickup',
      bigCargo.beam.ground === null && tree.trunkAt().distanceTo(start) < 0.01,
    );
    await barrier('returned');
    // Repeat with the boiler under the same owner and save path.
    if (authority) {
      place.job.boiler = 1;
      net.room!.send({
        t: COOP_IDENTITY,
        k: 'snap',
        snap: { gen: coop.debug().gen, shared: captureShared() },
        force: true,
      });
    }
    await until(() => place.job.boiler === 1, 'boiler shared');
    await put(spot!.x, spot!.z - (carrier ? 0 : 6));
    await wait(500);
    await barrier('boiler ready');
    if (carrier) {
      const source = place.boilerAt();
      await put(source.x + 1.5, source.z);
      await press('Shoulder the boiler');
      await put(spot!.x, spot!.z);
      await wait(500);
    }
    await until(() => bigCargo.boiler.holder !== null, 'boiler accepted');
    await barrier('boiler held');
    if (carrier) triggerAction('place-drop', 'down');
    await until(() => !!bigCargo.boiler.ground && !tree.back.big, 'boiler dropped');
    const b = { ...bigCargo.boiler.ground! };
    save();
    check('boiler ground survives restore', restore() && JSON.stringify(bigCargo.boiler.ground) === JSON.stringify(b));
    await barrier('boiler ground saved');
    await wait(1500);
    check('reachable dropped boiler survives periodic recovery', !!bigCargo.boiler.ground);
    if (authority) place.job.boiler = 2; // the ground prop disappeared without an accepted holder
    await until(
      () => bigCargo.boiler.ground === null && place.job.boiler === 1,
      'missing boiler returned on both peers',
    );
    await barrier('missing boiler recovered');
    if (!carrier) {
      const source = place.boilerAt();
      await put(source.x + 1.5, source.z);
      await press('Shoulder the boiler');
    }
    await until(() => bigCargo.boiler.holder !== null, 'partner reclaimed boiler');
    check('partner owns one boiler', carrier ? tree.back.big === null : tree.back.big === 'boiler');
    await barrier('boiler reclaimed');
    if (!carrier) net.room!.pause(10000);
    else {
      await until(() => coop.debug().peers.length === 0, 'boiler holder departed');
      await until(() => place.job.boiler === 1 && bigCargo.boiler.holder === null, 'boiler returns to source');
      check('departed boiler returns original pickup', bigCargo.boiler.ground === null);
      const source = place.boilerAt();
      await put(source.x + 1.5, source.z);
      await press('Shoulder the boiler');
    }
    await until(() => coop.debug().peers.length > 0, 'boiler holder rejoined', 40000);
    await barrier('boiler rejoined');
    await wait(1500);
    check('boiler rejoin has one surviving shoulder', carrier ? tree.back.big === 'boiler' : tree.back.big === null);
    if (carrier) {
      await put(spot!.x - 3, spot!.z - 4);
      await wait(500);
      triggerAction('place-drop', 'down');
    }
    await until(() => !bigCargo.boiler.holder, 'final boiler drop');
    check('recovered boiler can be put down nearby', bigCargo.boiler.ground !== null);
    // Put the beam down once more for a framed still of both reachable cargo objects.
    await put(start.x + 2.5, start.z);
    if (carrier) await press('Shoulder the trunk');
    await until(() => tree.trunkTaken(), 'final beam claimed');
    await put(spot!.x, spot!.z - (carrier ? 0 : 7));
    await wait(500);
    await barrier('final beam');
    if (carrier) triggerAction('place-drop', 'down');
    await until(() => !!bigCargo.beam.ground, 'final ground beam');
    window.__debugCam!.set(
      [spot!.x - 12, place.H(spot!.x, spot!.z) + 10, spot!.z - 14],
      [spot!.x, place.H(spot!.x, spot!.z) + 0.8, spot!.z + 2],
    );
    check('all drops leave both shoulders empty', tree.back.big === null);
    await barrier('drop done');
  } else if (mode === 'helper-leave' || mode === 'carrier-leave') {
    const leaving = mode === 'carrier-leave' ? carrier : !carrier;
    await barrier('departure');
    if (leaving) net.room!.pause(10000);
    else {
      await until(() => coop.debug().peers.length === 0, 'actual peer removal');
      check('helper grip clears on departure', greatCarry.helping() === null);
      if (carrier)
        check(
          'helper departure preserves cargo',
          tree.back.big === 'beam' && tree.trunkTaken() && !greatCarry.assisted(),
        );
      else {
        await until(() => tree.trunkDown(), 'carrier departure returns beam');
        check('returned beam is at source', tree.trunkAt().distanceTo(start) < 0.01);
        await put(start.x + 2.5, start.z);
        await wait(400);
        await press('Shoulder the trunk');
        await wait(300);
        check(
          'returned pickup stays near source',
          Math.hypot(me.body!.position.x - start.x, me.body!.position.z - start.z) < 5,
        );
      }
    }
    await until(() => coop.debug().peers.length > 0, 'reconnected', 40000);
    await barrier('rejoined');
    await wait(1500);
    if (leaving)
      check(
        'no stale grip or duplicated shoulder after return',
        !greatCarry.helping() && (mode !== 'carrier-leave' || tree.back.big === null),
      );
    if (!leaving) {
      check('survivor owns exactly one beam', tree.back.big === 'beam' && tree.back.beam === 1);
      const bot = makeBot();
      check('surviving owner walks beam to station', await bot.walk(st.x, st.z, 3, { limit: 60000 }));
      await until(() => tree.back.big === null, 'survivor deposits');
      await until(() => place.lines[0].open, 'accepted beam completes Station 3', 60000);
      check('accepted delivery opens the crossing', place.lines[0].open);
      send('delivered');
    } else await until(() => messages.has('delivered'), 'survivor delivered', 80000);
    check('delivered trunk stays consumed', tree.trunkTaken());
    await barrier('done');
  } else {
    // Same 15 m segment, real movement inputs. The helper's analogue stick matches the owner's 5 m/s.
    const z = me.body!.position.z;
    await barrier('walk');
    const started = performance.now();
    let lostAssist = false;
    const sampling = setInterval(() => {
      const held = carrier ? greatCarry.assisted() : !!greatCarry.helping();
      if (mode !== 'solo' && !held) lostAssist = true;
      console.log(
        `GREAT SAMPLE ${carrier ? 'carrier' : 'helper'} z=${me.body!.position.z.toFixed(2)} speed=${Math.hypot(me.body!.velocity.x, me.body!.velocity.z).toFixed(2)} grip=${held}`,
      );
    }, 500);
    if (carrier || mode !== 'solo') {
      input.keys.add('ShiftLeft');
      input.stickY = carrier ? -1 : -5 / 5.6;
    }
    if (carrier) {
      await until(() => me.body!.position.z >= z + 15, 'fifteen metres walked');
      const seconds = (performance.now() - started) / 1000;
      const speed = Math.hypot(me.body!.velocity.x, me.body!.velocity.z);
      check('Shift does not sprint with beam', !me.sprint && speed < (mode === 'solo' ? 2.35 : 5.15), speed);
      check(
        'assisted carry keeps its faster speed',
        mode === 'solo' || (!lostAssist && greatCarry.assisted() && speed > 4.8),
        { lostAssist, speed },
      );
      check('carry remains owned once', tree.back.big === 'beam');
      console.log(`GREAT TIMING ${mode} 15m ${seconds.toFixed(3)}s speed ${speed.toFixed(3)}m/s`);
      send('walked');
    } else await until(() => messages.has('walked'), 'owner walked');
    clearInterval(sampling);
    stop();
    await barrier('walked-stop');
    await wait(400);
    if (mode !== 'solo') {
      if (!carrier) await press('Let go');
      await until(() => !greatCarry.assisted() && !greatCarry.helping(), 'release');
      await barrier('released');
      if (!carrier) await press('Help carry');
      await until(() => (carrier ? greatCarry.assisted() : !!greatCarry.helping()), 'rejoined grip');
      await barrier('regripped');
      if (!carrier) await put(me.body!.position.x + 10, me.body!.position.z);
      await until(() => !greatCarry.assisted() && !greatCarry.helping(), 'separation releases');
      await barrier('apart');
      // Saved runs walk back too; the old staged fixture retains its diagnostic positioning.
      await put(start.x, start.z - (carrier ? 0 : 3.4));
      await wait(800);
      await barrier('capture position');
      if (!carrier) await press('Help carry');
      await until(() => (carrier ? greatCarry.assisted() : !!greatCarry.helping()), 'capture grip');
      frame();
      carryAction = () => {
        input.stickY = carrier ? -1 : -5 / 5.6;
        setTimeout(stop, 5000);
      };
      Object.assign(window, {
        __placeAct: () => {
          send('action');
          carryAction();
        },
      });
    }
  }
  Object.assign(window, { __coopDone: true });
  clearInterval(dismiss);
  console.log(`GREAT DONE ${mode} ${carrier ? 'carrier' : 'helper'} ${authority ? 'authority' : 'follower'}`);
}
void run();
export {};
