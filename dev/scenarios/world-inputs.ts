// World inputs: no client-owned shared state, and browser/Node grid and railway catalog parity.
// The gifts layout was only read by the retired classic states and no longer feeds a production rule.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { T } from './run.ts';
import { enterGame } from '../look/lib.ts';
import { createSync } from '../../src/world/sync.ts';
import * as line from '../../src/sim/railway-line-layout.ts';
import { RAILWAY_SOURCES } from '../../src/sim/railway-layout.ts';
import { RAIL_LINES } from '../../src/sim/railway-lines.ts';
import { LINE2_FORGE, LINE2_BOILER, LINE2_STATIONS } from '../../src/sim/railway-line2-layout.ts';
import { SHED_TABLE, SHED_STALL, WORKS_BREAKER, WORKS_SEAMS, WORKS } from '../../src/sim/railway-works-layout.ts';
import { CART_ROAD } from '../../src/sim/railway-cart.ts';
import type { BooglerLandBake } from '../../src/world/boogler-land.ts';

const LAND = fileURLToPath(new URL('../../src/world/home-land.json', import.meta.url));
const BOOGLER_LAND = fileURLToPath(new URL('../../src/world/boogler-land.json', import.meta.url));
let pendingBake: BooglerLandBake | undefined;
// The runner closes its pages and finalizes health before exiting. Never replace a source fixture during a run
// or after a failed check. The broker-safe command is node dev/bake-boogler-land.ts.
process.once('exit', (code) => {
  if (code === 0 && pendingBake) fs.writeFileSync(BOOGLER_LAND, JSON.stringify(pendingBake, null, 2) + '\n');
});
// Runs in the page.
const READ = `
  const sync = await import('/src/world/sync.ts');
  const { land } = await import('/src/world/game-world.ts');
  return {
    n: land.n,
    states: Object.keys(sync.snapshot().data),
  };`;

export default {
  about: 'empty client shared-state registry and production browser/Node numeric catalog parity',
  timeout: 300000,
  async run(t: T) {
    // All shared state arrives through the server replica; the browser registers none.
    const g = await t.open({ name: 'inputs', size: [192, 120] });
    const ready = await g.waitFor(`!!window.boogle?.sync`, { timeout: 90000 });
    if (!t.check('the game is up', ready >= 0, ready + ' ms')) return;
    const page = await g.eval(READ);
    t.check('the browser registers no shared state', page.states.length === 0, JSON.stringify(page.states));
    const land = fs.existsSync(LAND) ? JSON.parse(fs.readFileSync(LAND, 'utf8')) : null;
    if (!t.check('the land file exists', !!land, LAND)) return;

    const same = <V>(label: string, a: V, b: V, show: (v: V) => string = (v) => JSON.stringify(v)) =>
      t.check(label, JSON.stringify(a) === JSON.stringify(b), `got ${show(a)}, fixture ${show(b)}`);
    same('grid size', page.n, land.n);

    const boogler: BooglerLandBake = await g.eval(`
      const { readBooglerLand } = await import('/dev/boogler-land-input.ts');
      return readBooglerLand();
    `);
    if (process.env.UPDATE_FIXTURE === '1') pendingBake = boogler;
    const pinned =
      pendingBake ?? (fs.existsSync(BOOGLER_LAND) ? JSON.parse(fs.readFileSync(BOOGLER_LAND, 'utf8')) : null);
    t.check(
      'Boogler land matches the initialized island',
      JSON.stringify(boogler) === JSON.stringify(pinned),
      'height grid, prop and stall discs, keep-outs, mainland; re-bake: node dev/bake-boogler-land.ts',
    );

    // Reuse the one rendering page in a fresh room: PR scenarios deliberately prohibit a second GPU player.
    const production = new URL(g.page.url());
    production.searchParams.delete('proto');
    production.searchParams.set('room', `${production.searchParams.get('room') ?? 'inputs'}-line`);
    // Optional fault injection for snapshot-retry starvation on software WebGPU; not a performance measurement.
    const sparseFrames = process.env.WORLD_INPUTS_SPARSE_FRAMES === '1';
    if (sparseFrames)
      await g.page.addInitScript(() => {
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (fn) => raf(() => window.setTimeout(() => fn(performance.now()), 10000));
      });
    await g.page.goto(production.href, { waitUntil: 'domcontentloaded' });
    await enterGame(g.page, 90000);
    const productionReady = await g.waitFor(`(await import('/dev/look/rail-read.ts')).railRead()?.ready() === true`, {
      timeout: 90000,
    });
    console.log(
      'production diagnostics',
      await g.eval(`
      const { worldStatus, world } = await import('/src/world/sync.ts');
      const { account, railRead } = await import('/dev/look/rail-read.ts');
      const r = railRead();
      return { world: worldStatus(), tick: world.tick, railway: r && {
        ready: r.ready(), status: r.status(), connected: r.debug().connected, epoch: r.debug().epoch,
        accountEpoch: account(r.world(), r.pid)?.epoch,
      }};
    `),
    );
    if (!t.check('production line-one room is verified', productionReady >= 0)) return;
    if (sparseFrames) await g.still('production-sparse-ready');
    const actual = await g.eval(`
      const sync = await import('/src/world/sync.ts');
      const { railwayMirror } = await import('/src/world/game-world.ts');
      const line = await import('/src/sim/railway-line-layout.ts');
      const { RAILWAY_SOURCES } = await import('/src/sim/railway-layout.ts');
      const { RAIL_LINES } = await import('/src/sim/railway-lines.ts');
      const { LINE2_FORGE, LINE2_BOILER, LINE2_STATIONS } = await import('/src/sim/railway-line2-layout.ts');
      const { SHED_TABLE, SHED_STALL, WORKS_BREAKER, WORKS_SEAMS, WORKS } = await import('/src/sim/railway-works-layout.ts');
      const { CART_ROAD } = await import('/src/sim/railway-cart.ts');
      return {
        registry: sync.registry(),
        installed: !!railwayMirror?.confirmed(),
        catalog: {
          version: line.LINE1_CATALOG, stations: line.LINE1_STATIONS, rocks: line.LINE1_ROCKS,
          greatTree: line.LINE1_GREAT_TREE, axe: line.LINE1_AXE_STAND, jump: line.LINE1_JUMP_DEVICE,
          hardwoods: line.LINE1_HARDWOODS, initial: line.LINE1_INITIAL, sources: RAILWAY_SOURCES,
          panels: line.linePanels(),
          home: {
            lines: RAIL_LINES.slice(0, 2).map(l => ({ path: l.path, halt: l.halts[0] })),
            forge: LINE2_FORGE, boiler: LINE2_BOILER, q1: LINE2_STATIONS[0],
            table: SHED_TABLE, stall: SHED_STALL, breaker: WORKS_BREAKER, seam: WORKS_SEAMS[0],
            cartForgeCm: CART_ROAD.forgeCm, rollTicks: WORKS.rollTicks,
          },
        },
      };`);
    const node = createSync();
    // The railway is Server kind (replication R1a): a tab mirrors it and registers no railway op or state.
    t.check('production mirrors line one in the browser', actual.installed);
    same('production has an empty client shared-state registry', actual.registry, node.registry());
    same('production numeric source and line catalog', actual.catalog, {
      version: line.LINE1_CATALOG,
      stations: line.LINE1_STATIONS,
      rocks: line.LINE1_ROCKS,
      greatTree: line.LINE1_GREAT_TREE,
      axe: line.LINE1_AXE_STAND,
      jump: line.LINE1_JUMP_DEVICE,
      hardwoods: line.LINE1_HARDWOODS,
      initial: line.LINE1_INITIAL,
      sources: RAILWAY_SOURCES,
      panels: line.linePanels(),
      home: {
        lines: RAIL_LINES.slice(0, 2).map((l) => ({ path: l.path, halt: l.halts[0] })),
        forge: LINE2_FORGE,
        boiler: LINE2_BOILER,
        q1: LINE2_STATIONS[0],
        table: SHED_TABLE,
        stall: SHED_STALL,
        breaker: WORKS_BREAKER,
        seam: WORKS_SEAMS[0],
        cartForgeCm: CART_ROAD.forgeCm,
        rollTicks: WORKS.rollTicks,
      },
    });
  },
};
