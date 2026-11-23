// npm run look -- --real --rail-seed q3-done --query flight=1 --eval dev/look/evals/halt-yard.ts --action dev/look/evals/halt-yard-flight.ts --video --seconds 10 --name yard-flights
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { haltYardStock } = (await import(
  '/src/sim/railway-queries-yard.ts' as string
)) as typeof import('../../../src/sim/railway-queries-yard.ts');
const action = (window as Window & { __yardAction?: () => Promise<void> }).__yardAction;
if (!action) throw new Error('The yard setup did not prepare a transfer');
background(
  (async () => {
    await action();
    const { haltFrame } = (await import(
      '/src/prefab/halt-deck.ts' as string
    )) as typeof import('../../../src/prefab/halt-deck.ts');
    const f = haltFrame(3, false);
    const along = Math.sign((f.c.x - 1076.7) * Math.sin(f.yaw) + (f.c.z - 51.4) * Math.cos(f.yaw));
    teleport(me.body!, 1076.7 + along * Math.sin(f.yaw) * 1.4, 25.4, 51.4 + along * Math.cos(f.yaw) * 1.4);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const target = interactTarget();
    if (target?.id !== 'halt-yard-2-0' || target.verb !== 'Pick up') throw new Error('Cradle did not re-arm');
    target.run?.();
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (R.railRead()!.pending() || R.railBack().carry !== 10 || haltYardStock(R.rw(), 2, 2) !== 4)
      throw new Error('Pickup did not settle');
    console.log('YARD pickup', JSON.stringify(R.railBack()));
  })(),
  'halt yard transfer',
);
export {};
