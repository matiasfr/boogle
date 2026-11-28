// npm run look -- --real --players 2 --rail-seed q3-done --eval dev/look/evals/halt-yard.ts --warm 0 --name yard-pair
// --query pointer=t1|q4|q5|q6|forge, n=40, yard=village or player=2 (the observer).
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { haltYardStock } = (await import(
  '/src/sim/railway-queries-yard.ts' as string
)) as typeof import('../../../src/sim/railway-queries-yard.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { railwayCommands } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { H } = (await import('/src/place/terrain.ts' as string)) as typeof import('../../../src/place/terrain.ts');
const { HALT_YARDS } = (await import(
  '/src/sim/railway-yard-layout.ts' as string
)) as typeof import('../../../src/sim/railway-yard-layout.ts');
const q = new URLSearchParams(location.search);
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(fn: () => unknown, label: string) {
  const end = performance.now() + 30000;
  while (!fn()) {
    if (performance.now() > end) throw new Error(label + ' ' + JSON.stringify(R.railBack()));
    await wait(40);
  }
}
if (!(await R.railReady())) throw new Error('Yard room did not mount');
const adapter = railwayCommands()!;
const view = R.inspectRailway()!.line2View;
const pointer = q.get('pointer');
const yard =
  pointer === 't1'
    ? 1
    : pointer === 'forge' || q.get('yard') === 'village'
      ? 0
      : pointer === 'q5' || pointer === 'q6'
        ? 3
        : 2;
const spec = HALT_YARDS[yard]!,
  x = spec.x / 100,
  z = spec.z / 100,
  y = H(x, z);
async function move(px: number, pz: number) {
  teleport(me.body!, px, H(px, pz) + 0.85, pz);
  me.body!.velocity.set(0, 0, 0);
  await wait(420);
}
const stock = (kind: number) => haltYardStock(R.rw(), yard, kind);
const settled = () => adapter.read.pending() === 0;
const ready = window as Window & { __yardAction?: () => Promise<void> };
if (q.has('recover')) {
  // q3-yard-recovery is q3-done with two aged piles. Move clear of both so the host can drain them.
  await move(1020, -130);
  await until(() => haltYardStock(R.rw(), 0, 0) === 4 && haltYardStock(R.rw(), 2, 0) === 6, 'both host recoveries');
  console.log(
    'YARD recovered',
    JSON.stringify({ village: haltYardStock(R.rw(), 0, 0), quarry: haltYardStock(R.rw(), 2, 0) }),
  );
  const aim = () =>
    window.__debugCam!.set(yard === 0 ? [x - 4, y + 2, z - 5] : [x - 3, y + 2.5, z - 4], [x, y + 0.6, z], 53);
  aim();
  setInterval(aim, 50);
} else if (pointer) {
  const depot = view.depot;
  const eye =
    pointer === 'forge'
      ? view.forgeFrame
      : pointer === 't1'
        ? { x: 995.62, z: -141.89 }
        : pointer === 'q6' && depot
          ? { x: depot[0]!, z: depot[2]! }
          : view.frames[pointer === 'q4' ? 3 : 4]!;
  const distance = Math.hypot(x - eye.x, z - eye.z);
  const px = eye.x + (1.5 * (x - eye.x)) / distance,
    pz = eye.z + (1.5 * (z - eye.z)) / distance;
  await move(px, pz);
  const aim = () => window.__debugCam!.set([px, H(px, pz) + 1.65, pz], [x, y + 0.65, z], 65);
  aim();
  setInterval(aim, 50);
  console.log('YARD sightline', pointer, JSON.stringify({ px, pz, x, z, distance }));
} else {
  const aim = () => window.__debugCam!.set([x - 4, y + 3, z - 5], [x, y + 0.7, z], 52);
  await move(x - 1.5, z - 1.5);
  aim();
  setInterval(aim, 50);
  if (q.get('player') !== '2') {
    const goal = Number(q.get('n') ?? 10);
    const confirm = async (fn: () => boolean, label: string) => {
      if (!fn()) throw new Error(label + ' refused on press');
      await until(settled, label);
      await wait(160);
    };
    async function trim(kind: 0 | 2, want: number) {
      const amount = () => (kind === 0 ? R.railBack().carry : R.railBack().rails);
      while (amount() > want) {
        const before = amount(),
          p = me.body!.position;
        await confirm(
          () =>
            adapter.drop(
              Math.round(p.x * 100),
              Math.round(H(p.x, p.z) * 100),
              Math.round(p.z * 100),
              Math.min(8, before - want),
              kind,
            ),
          'trim load',
        );
        if (amount() >= before) throw new Error('trim was refused by host');
      }
    }
    if (!R.rail(R.rw()).pack) {
      const { LINE2_PACK } = (await import(
        '/src/sim/railway-line2-layout.ts' as string
      )) as typeof import('../../../src/sim/railway-line2-layout.ts');
      await move(LINE2_PACK.x / 100, LINE2_PACK.z / 100);
      await confirm(() => adapter.openPack(), 'pack pickup');
      await until(() => R.inspectRailway()!.reward.showing, 'pack reveal');
      await wait(1800);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
      await until(() => !R.inspectRailway()!.reward.showing, 'pack reveal dismissed');
    }
    async function prepare() {
      const need = Math.min(goal - stock(0), R.capacityOf(R.rw(), 0));
      const depot = view.depot;
      if (depot && need === R.capacityOf(R.rw(), 0) && R.rail(R.rw()).depot > 0) {
        await move(depot[0]!, depot[2]!);
        await confirm(() => adapter.depotTake(), 'depot timber');
      }
      while (R.railBack().carry < need) {
        const t = R.inspectRailway()!.trees.find((t) => t.remaining > 0 && !t.cleared);
        if (!t) throw new Error('No remaining timber');
        await move(t.x + 1, t.z);
        await confirm(() => adapter.chop(t.id, 0, false), 'chop');
        await wait(650);
      }
      await trim(0, need);
      if (!stock(2) && !R.railBack().rails) {
        await move(view.forgeRack.x, view.forgeRack.z);
        await confirm(() => adapter.forgeTake(), 'forge take');
        await trim(2, 4);
        if (R.railBack().rails !== 4) throw new Error('Expected four rails');
      }
      await move(x - 1.5, z - 1.5);
      aim();
      if (!q.has('setdown')) {
        const logPrompt = () =>
          interactTarget()?.note === R.railBack().carry + ' logs' && interactTarget()?.verb === 'Leave it here';
        for (const [dx, dz] of [
          [1.5, 0],
          [-1.5, 0],
          [0, 1.5],
          [0, -1.5],
        ] as const) {
          if (logPrompt()) break;
          await move(x + dx, z + dz);
        }
        await until(logPrompt, 'log bin deposit prompt');
      }
    }
    async function press() {
      const before = stock(0),
        load = R.railBack();
      if (q.has('setdown')) {
        const { setDown } = (await import(
          '/src/entities/railway/back-down.ts' as string
        )) as typeof import('../../../src/entities/railway/back-down.ts');
        if (!setDown(adapter)) throw new Error('Set-down refused inside the yard');
      } else interactTarget()!.run?.();
      await until(
        () =>
          settled() && stock(0) === before + load.carry && R.railBack().rails === (q.has('setdown') ? 0 : load.rails),
        'deposit confirmed',
      );
      console.log('YARD landed', JSON.stringify({ yard, logs: stock(0), rails: stock(2), back: R.railBack() }));
      await wait(850);
    }
    await prepare();
    ready.__yardAction = async () => {
      await press();
      while (stock(0) < goal) {
        await prepare();
        await press();
      }
    };
    if (!q.has('flight')) await ready.__yardAction();
  } else {
    await until(() => stock(0) === 10 && stock(2) === (q.has('setdown') ? 4 : 0), 'second tab stock');
    console.log('YARD peer', JSON.stringify({ logs: stock(0), rails: stock(2) }));
  }
}
export {};
