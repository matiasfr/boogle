// Existing look harness: --players 2 --query 'proto=place&coop=1&greatCarry=pair' --eval dev/look/evals/place-coop.ts
// --until window.__coopDone --warm 180. greatCarry=solo|pair|helper-leave|carrier-leave; &follower=1 swaps cargo owner.
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
    if (performance.now() > end) throw new Error(`GREAT timeout: ${label}`);
    await wait(50);
  }
};
const check = (label: string, ok: boolean, detail: unknown = '') => {
  if (!ok) throw new Error(`GREAT FAIL ${label}: ${JSON.stringify(detail)}`);
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
  hands.interactDown();
  hands.interactUp();
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
  while (!saved && place.lines[0].stage < 2) {
    const stage = place.lines[0].stage;
    if (authority) coop.skip('delivery', place.skipDelivery);
    await until(() => place.lines[0].stage > stage, 'earlier station laid');
    await barrier(`stage ${stage}`);
  }
  if (!saved) tree.back.logs = tree.back.rails = tree.back.stone = tree.back.incoming = 0;
  const st = place.lines[0].stations[2];
  if (authority && !saved) {
    st.have.logs = 40;
    st.drawStock(st.have);
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
  if (carrier) await press('Shoulder the trunk');
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
  if (mode === 'helper-leave' || mode === 'carrier-leave') {
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
