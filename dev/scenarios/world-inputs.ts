// World inputs: the static facts every peer builds the shared world from. The land (grid size and gifts layout) is
// pinned in src/world/home-land.json, which the server and Node tests run the rules on; the state and op order in test/fixtures/world-inputs.json.
// It checks, in the running game: the grid size, the state key order (snapshot, load and hash order), the op order
// (once sync has registry()) and the gifts layout (trees, perches), which Node tests run the rules on
// (test/helpers/land.ts). The ground's heights are not an input: no rule reads them.
// A change in any of them means peers on different builds disagree, so update the fixture only on purpose:
// `UPDATE_FIXTURE=1 npm run scenario -- world-inputs`, and say why in the commit. Serves "Determinism from day one".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { T } from './run.ts';
import { enterGame } from '../look/lib.ts';
import { createSync } from '../../src/world/sync.ts';
import { installRules } from '../../src/world/rules/index.ts';
import type { Land } from '../../src/world/rules/types.ts';
import * as line from '../../src/sim/railway-line-layout.ts';
import { RAILWAY_SOURCES } from '../../src/sim/railway-layout.ts';

const FIXTURE = fileURLToPath(new URL('../../test/fixtures/world-inputs.json', import.meta.url));
const LAND = fileURLToPath(new URL('../../src/world/home-land.json', import.meta.url));
// Runs in the page.
const READ = `
  const sync = await import('/src/world/sync.ts');
  const { land } = await import('/src/world/game-world.ts');
  const pick = (o) => JSON.parse(JSON.stringify(o));
  return {
    n: land.n,
    states: Object.keys(sync.snapshot().data),
    ops: sync.registry().ops,
    layout: { trees: pick(land.layout.trees), perches: pick(land.layout.perches) },
  };`;

const counts = (l: { trees?: unknown[]; perches?: unknown[] } | null) =>
  l ? `${l.trees?.length} trees / ${l.perches?.length} perches` : '-';

export default {
  about: 'classic registry fixture and production line-one browser/Node registry and numeric catalog parity',
  timeout: 300000,
  async run(t: T) {
    // The current game installs the classic registry (src/world/game-world.ts); the railway is mirrored, not
    // registered. The fixture pins the classic registry, which Node tests run the rules on.
    const g = await t.open({ name: 'inputs', size: [192, 120] });
    const ready = await g.waitFor(`window.boogle?.land?.layout?.trees?.length > 0`, { timeout: 90000 });
    if (!t.check('the game is up with the gifts layout', ready >= 0, ready + ' ms')) return;
    const page = await g.eval(READ);
    const classic = createSync();
    installRules(classic, { n: page.n, layout: { trees: [], perches: [] } });
    const prefix = classic.registry();
    const got = {
      ...page,
      states: page.states.slice(0, prefix.states.length),
      ops: page.ops?.slice(0, prefix.ops.length),
    };
    t.check(
      'the browser registers the classic registry first, as Node does',
      JSON.stringify([got.states, got.ops]) === JSON.stringify([prefix.states, prefix.ops]),
      `got ${JSON.stringify(got.states)}, Node ${JSON.stringify(prefix.states)}`,
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
      await write(LAND, { about, n: got.n, layout: got.layout });
      await write(FIXTURE, { about, states: got.states, ops: got.ops ?? old?.ops ?? null });
      t.check('wrote the land and the fixture', true, `${LAND}; ${got.states.join(',')}; ${counts(got.layout)}`);
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
    same('gifts layout', got.layout, land.layout, counts);

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
    const productionReady = await g.waitFor(
      `(await import('/src/entities/railway/state.ts')).inspectRailway()?.ready === true`,
      { timeout: 90000 },
    );
    console.log(
      'production diagnostics',
      await g.eval(`
      const { worldStatus, world } = await import('/src/world/sync.ts');
      const { inspectRailway } = await import('/src/entities/railway/state.ts');
      const r = inspectRailway();
      return { world: worldStatus(), tick: world.tick, railway: r && {
        ready: r.ready, status: r.status, connected: r.connected, epoch: r.epoch,
        accountEpoch: r.accounts.find(a => a.pid === r.pid)?.epoch,
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
      return {
        registry: sync.registry(),
        installed: !!railwayMirror?.confirmed(),
        catalog: {
          version: line.LINE1_CATALOG, stations: line.LINE1_STATIONS, rocks: line.LINE1_ROCKS,
          greatTree: line.LINE1_GREAT_TREE, axe: line.LINE1_AXE_STAND, jump: line.LINE1_JUMP_DEVICE,
          hardwoods: line.LINE1_HARDWOODS, initial: line.LINE1_INITIAL, sources: RAILWAY_SOURCES,
          panels: line.linePanels(),
        },
      };`);
    const node = createSync();
    installRules(node, land as Land);
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
    });
  },
};
