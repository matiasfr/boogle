// World inputs: the static facts every peer builds the shared world from. The land (grid size, gifts layout and the
// plant mask: where a seed may grow, run-length encoded) is pinned in src/world/home-land.json, which the server and
// Node tests run the rules on; the state and op order in test/fixtures/world-inputs.json.
// It checks, in the running game: the grid size, the state key order (snapshot, load and hash order), the op order
// (once sync has registry()) and the gifts layout (trees, perches), which Node tests run the rules on
// (test/helpers/land.mjs). The ground's heights are not an input: no rule reads them.
// A change in any of them means peers on different builds disagree, so update the fixture only on purpose:
// `UPDATE_FIXTURE=1 npm run scenario -- world-inputs`, and say why in the commit. Serves "Determinism from day one".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURE = fileURLToPath(new URL('../../test/fixtures/world-inputs.json', import.meta.url));
const LAND = fileURLToPath(new URL('../../src/world/home-land.json', import.meta.url));
// Runs in the page.
const READ = `
  const sync = await import('/src/world/sync.ts');
  const { land } = await import('/src/world/game-world.ts');
  const g = window.boogle.gifts;
  const { canPlantAt, garden } = await import('/src/adapters/mushroom-garden.js');
  const pick = (o) => JSON.parse(JSON.stringify(o));
  // Plant mask over cell g = i * n + j: run lengths, alternating, starting with unplantable. Caps count as cover, so it
  // needs an empty garden.
  const n = land.n, plant = [];
  let run = 0, on = false;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const ok = canPlantAt(i, j);
      if (ok === on) run++;
      else (plant.push(run), (run = 1), (on = ok));
    }
  plant.push(run);
  return {
    plots: garden.plots.length,
    plant,
    n: land.n,
    states: Object.keys(sync.snapshot().data),
    ops: typeof sync.registry === 'function' ? sync.registry().ops : null,
    layout: { trees: pick(g.trees), perches: pick(g.perches) },
  };`;

const counts = (l) => (l ? `${l.trees?.length} trees / ${l.perches?.length} perches` : '-');

export default {
  about: 'the world inputs (grid size, state and op order, gifts layout) match the fixture',
  timeout: 180000,
  async run(t) {
    const g = await t.open({ name: 'inputs', size: [192, 120] });
    const ready = await g.waitFor(`window.boogle?.gifts?.trees?.length > 0`, { timeout: 90000 });
    if (!t.check('the game is up with the gifts layout', ready >= 0, ready + ' ms')) return;
    const got = await g.eval(READ);
    const old = fs.existsSync(FIXTURE) ? JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) : null;

    if (process.env.UPDATE_FIXTURE === '1') {
      if (!t.check('the plant mask needs an empty garden', got.plots === 0, `${got.plots} plots`)) return;
      const prettier = await import('prettier');
      const write = async (file, data) => {
        const opts = (await prettier.resolveConfig(file)) ?? {};
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, await prettier.format(JSON.stringify(data), { ...opts, filepath: file }));
      };
      const about = 'Pinned by dev/scenarios/world-inputs.mjs (UPDATE_FIXTURE=1).';
      await write(LAND, { about, n: got.n, layout: got.layout, plant: got.plant });
      await write(FIXTURE, { about, states: got.states, ops: got.ops ?? old?.ops ?? null });
      t.check('wrote the land and the fixture', true, `${LAND}; ${got.states.join(',')}; ${counts(got.layout)}`);
      return;
    }
    const land = fs.existsSync(LAND) ? JSON.parse(fs.readFileSync(LAND, 'utf8')) : null;
    if (!t.check('the land file exists', !!land, LAND)) return;
    if (!t.check('the fixture exists', !!old, FIXTURE)) return;

    const same = (label, a, b, show = (v) => JSON.stringify(v)) =>
      t.check(label, JSON.stringify(a) === JSON.stringify(b), `got ${show(a)}, fixture ${show(b)}`);
    same('grid size', got.n, land.n);
    same('state key order', got.states, old.states);
    if (got.ops) same('op order', got.ops, old.ops);
    else console.log('  SKIP  op order (sync has no registry() yet)');
    same('gifts layout', got.layout, land.layout, counts);
    const cells = (rle) => rle.filter((_, k) => k % 2).reduce((a, b) => a + b, 0);
    if (got.plots === 0) same('plant mask', got.plant, land.plant, (r) => `${cells(r)} plantable cells`);
    else console.log(`  SKIP  plant mask (${got.plots} plots in the garden cover cells)`);
  },
};
