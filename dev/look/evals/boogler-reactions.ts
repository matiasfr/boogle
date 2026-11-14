// Two-player seed hearts or a mid-walk ride through puff/launch. Production inputs; teleports only stage proximity.
// look --players 2 --real --query 'reactionLook=seed&railLag=80' --eval dev/look/evals/boogler-reactions.ts
// --action dev/look/evals/boogler-reactions-action.ts --video --curves --seconds 7 --warm 0 --hud
const { boogler } = (await import(
  '/src/boogler/boogler.ts' as string
)) as typeof import('../../../src/boogler/boogler.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { groundHeight } = (await import(
  '/src/island/terrain.ts' as string
)) as typeof import('../../../src/island/terrain.ts');
const { railwayMirror } = (await import(
  '/src/world/game-world.ts' as string
)) as typeof import('../../../src/world/game-world.ts');
const { railwayCommands } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { remotes } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const { take, heldId } = (await import(
  '/src/player/inventory.ts' as string
)) as typeof import('../../../src/player/inventory.ts');
const { entityKinds } = (await import(
  '/src/entity/entity.ts' as string
)) as typeof import('../../../src/entity/entity.ts');
const { onFrame, frameCtx } = (await import('/src/loop.ts' as string)) as typeof import('../../../src/loop.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const wait = async (fn: () => unknown, label: string) => {
  for (let i = 0; i < 200 && !fn(); i++) await sleep(100);
  if (!fn()) throw new Error(label);
};
const query = new URLSearchParams(location.search);
const player = query.get('player') ?? '1';
const mode = query.get('reactionLook') ?? 'seed';
await wait(() => me.body && railwayCommands()?.read.ready() && remotes.size, 'two players ready');
const session = railwayCommands()!;
const place = (dx: number, height = 0.7) => {
  const p = boogler.disp;
  teleport(me.body!, p.x + dx, groundHeight(p.x, p.z) + height, p.z);
  me.body!.velocity.set(0, 0, 0);
};
place(player === '1' ? 2 : -5);
const fx = entityKinds().find((k) => k.kind === 'boogler-fx')!.entities[0]!.mesh!;
const hearts = fx.children.filter((c) => c.type === 'Sprite');
const orb = fx.children[64]!;
const epoch = () => performance.timeOrigin + performance.now();
const log = (kind: string, value: unknown) =>
  console.log('REACTION ' + JSON.stringify({ player, kind, at: epoch(), value }));
const act = session.act.bind(session);
session.act = (op, fields) => {
  if (op.startsWith('boogler.'))
    log('press', {
      op,
      fields,
      frame: frameCtx.now,
      seededHearts: hearts.filter((h) => h.position.lengthSq() > 0).length,
    });
  return act(op, fields);
};
session.onRefused((e) => {
  if (e.op.startsWith('boogler.')) throw new Error(`reaction refused: ${JSON.stringify(e)}`);
}, 'command');
railwayMirror!.boogler.onReact((e) => log('received', { ...e, tick: session.read.tickNow() }));
let recording = false;
let lastHearts = 0,
  lastOrb = false,
  launched = false;
const samples: object[] = [];
onFrame(
  () => {
    const p = boogler.disp,
      y = groundHeight(p.x, p.z);
    window.__debugCam?.set([p.x + 5, y + 4, p.z + 7], [p.x, y + 1, p.z]);
    if (!recording) return;
    const visible = hearts.filter((h) => h.visible).length;
    if (visible !== lastHearts || orb.visible !== lastOrb)
      log('draw', { hearts: visible, orb: orb.visible, frame: frameCtx.now, tick: session.read.tickNow() });
    lastHearts = visible;
    lastOrb = orb.visible;
    if (player === '1' && !launched && me.body!.velocity.y > 8) {
      launched = true;
      log('launch', { frame: frameCtx.now, tick: session.read.tickNow() });
    }
    samples.push({
      at: epoch(),
      x: p.x,
      z: p.z,
      act: boogler.me.act,
      mode: railwayMirror!.boogler.leg()?.mode,
      rider: { ...me.body!.position },
      hearts: visible,
      orb: orb.visible,
    });
  },
  { phase: 'late', order: 99, name: 'reaction evidence' },
);
let button: HTMLButtonElement | undefined;
if (mode === 'seed' && player === '1') {
  take('seeds');
  await wait(() => interactTarget()?.id === 'boogler', 'Talk offered');
  interactTarget()!.run!();
  await wait(() => {
    button = [...document.querySelectorAll<HTMLButtonElement>('.bd-opt')].find((b) =>
      b.textContent?.includes('mushroom seed'),
    );
    return button && !button.parentElement!.hidden;
  }, 'seed present choice');
} else await sleep(1500); // let the compensated room clock settle before measuring
(window as Window & { __booglerReactionAction?: () => void }).__booglerReactionAction = () => {
  recording = true;
  if (player === '1') {
    if (mode === 'seed') {
      button!.click();
      if (heldId() === 'seeds') throw new Error('seed was not given');
      if (hearts.filter((h) => h.position.lengthSq() > 0).length !== 3)
        throw new Error('hearts not predicted in press');
    } else {
      if (!boogler.disp.walking) throw new Error('ride must start mid-walk');
      place(0, 1.4);
    }
  }
  background(
    (async () => {
      await sleep(6900);
      log('samples', samples);
      if (mode === 'ride' && player === '1' && !launched) throw new Error('ride did not launch');
      if (mode === 'seed' && !samples.some((s) => (s as { hearts: number }).hearts > 0))
        throw new Error('no hearts drawn');
      recording = false;
    })(),
    'reaction proof',
  );
};
export {};
