// World inputs: retained classic registry fixture, production browser/Node registry, grid and railway catalog parity.
// The gifts layout was only read by the retired classic states and no longer feeds a production rule.
// Update the registry fixture only on purpose:
// `UPDATE_FIXTURE=1 npm run scenario -- world-inputs`, and say why in the commit. Serves "Determinism from day one".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { T } from './run.ts';
import { enterGame } from '../look/lib.ts';
import { createSync } from '../../src/world/sync.ts';
import { installRules } from '../../src/world/rules/index.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import type { Land } from '../../src/world/rules/types.ts';
import * as line from '../../src/sim/railway-line-layout.ts';
import { RAILWAY_SOURCES } from '../../src/sim/railway-layout.ts';
import { RAIL_LINES } from '../../src/sim/railway-lines.ts';
import { LINE2_FORGE, LINE2_BOILER, LINE2_STATIONS } from '../../src/sim/railway-line2-layout.ts';
import { SHED_TABLE, SHED_STALL, WORKS_BREAKER, WORKS_SEAMS, WORKS } from '../../src/sim/railway-works-layout.ts';
import { CART_ROAD } from '../../src/sim/railway-cart.ts';

const FIXTURE = fileURLToPath(new URL('../../test/fixtures/world-inputs.json', import.meta.url));
const LAND = fileURLToPath(new URL('../../src/world/home-land.json', import.meta.url));
// Runs in the page.
const READ = `
  const sync = await import('/src/world/sync.ts');
  const { land } = await import('/src/world/game-world.ts');
  return {
    n: land.n,
    states: Object.keys(sync.snapshot().data),
    ops: sync.registry().ops,
  };`;

export default {
  about: 'classic registry fixture and production line-one browser/Node registry and numeric catalog parity',
  timeout: 300000,
  async run(t: T) {
    // The classic transport retains roster/tune in Node; the production browser mirrors its server roster.
    const g = await t.open({ name: 'inputs', size: [192, 120] });
    const ready = await g.waitFor(`!!window.boogle?.sync`, { timeout: 90000 });
    if (!t.check('the game is up', ready >= 0, ready + ' ms')) return;
    const page = await g.eval(READ);
    const classic = createSync();
    installRules(classic, { n: page.n, layout: { trees: [], perches: [] } });
    const prefix = classic.registry();
    const got = {
      ...page,
      states: prefix.states,
      ops: prefix.ops,
    };
    const productionRegistry = createSync();
    installRules(
      productionRegistry,
      { n: page.n, layout: { trees: [], perches: [] } },
      () => createRailwayMirror().roster,
    );
    t.check(
      'the browser and Node register the retained production state and ops identically',
      JSON.stringify([page.states, page.ops]) ===
        JSON.stringify([productionRegistry.registry().states, productionRegistry.registry().ops]),
      `got ${JSON.stringify(page.states)}, Node ${JSON.stringify(productionRegistry.registry().states)}`,
    );
    const old = fs.existsSync(FIXTURE) ? JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) : null;

    if (process.env.UPDATE_FIXTURE === '1') {
      const prettier = await import('prettier');
      const write = async (file: string, data: unknown) => {
        const opts = (await prettier.resolveConfig(file)) ?? {};
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, await prettier.format(JSON.stringify(data), { ...opts, filepath: file }));
      };
      const about = 'Pinned by dev/scenarios/world-inputs.ts (UPDATE_FIXTURE=1).';
      await write(FIXTURE, { about, states: got.states, ops: got.ops ?? old?.ops ?? null });
      t.check('wrote the registry fixture', true, `${FIXTURE}; ${got.states.join(',')}`);
      return;
    }
    const land = fs.existsSync(LAND) ? JSON.parse(fs.readFileSync(LAND, 'utf8')) : null;
    if (!t.check('the land file exists', !!land, LAND)) return;
    if (!t.check('the fixture exists', !!old, FIXTURE)) return;

    const same = <V>(label: string, a: V, b: V, show: (v: V) => string = (v) => JSON.stringify(v)) =>
      t.check(label, JSON.stringify(a) === JSON.stringify(b), `got ${show(a)}, fixture ${show(b)}`);
    same('grid size', got.n, land.n);
    same('state key order', got.states, old.states);
    same('op order', got.ops, old.ops);

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
    const mirrored = createRailwayMirror();
    installRules(node, land as Land, () => mirrored.roster);
    // The railway is Server kind (replication R1a): a tab mirrors it and registers no railway op or state.
    t.check('production mirrors line one in the browser', actual.installed);
    same('production state and op registration order (classic only)', actual.registry, node.registry());
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
