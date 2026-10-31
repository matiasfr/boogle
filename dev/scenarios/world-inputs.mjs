// World inputs: the static facts every peer builds the shared world from, pinned in test/fixtures/world-inputs.json.
// It checks, in the running game: the grid size, the state key order (snapshot, load and hash order), the op order
// (once sync has registry()) and the gifts layout (trees, perches), which Node tests run the rules on
// (test/helpers/land.mjs). The ground's heights are not an input: no rule reads them.
// A change in any of them means peers on different builds disagree, so update the fixture only on purpose:
// `UPDATE_FIXTURE=1 npm run scenario -- world-inputs`, and say why in the commit. Serves "Determinism from day one".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURE = fileURLToPath(new URL('../../test/fixtures/world-inputs.json', import.meta.url));
// Runs in the page.
const READ = `
  const sync = await import('/src/world/sync.ts');
  const { land } = await import('/src/world/game-world.ts');
  const g = window.boogle.gifts;
  const pick = (o) => JSON.parse(JSON.stringify(o));
  return {
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
      const data = {
        about: 'Pinned by dev/scenarios/world-inputs.mjs (UPDATE_FIXTURE=1).',
        n: got.n,
        states: got.states,
        ops: got.ops ?? old?.ops ?? null, // needs sync registry(); kept from the old fixture until then
        layout: got.layout,
      };
      const prettier = await import('prettier');
      const opts = (await prettier.resolveConfig(FIXTURE)) ?? {};
      fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
      fs.writeFileSync(FIXTURE, await prettier.format(JSON.stringify(data), { ...opts, filepath: FIXTURE }));
      t.check('wrote the fixture', true, `${FIXTURE}; ${got.states.join(',')}; ${counts(got.layout)}`);
      return;
    }
    if (!t.check('the fixture exists', !!old, FIXTURE)) return;

    const same = (label, a, b, show = (v) => JSON.stringify(v)) =>
      t.check(label, JSON.stringify(a) === JSON.stringify(b), `got ${show(a)}, fixture ${show(b)}`);
    same('grid size', got.n, old.n);
    same('state key order', got.states, old.states);
    if (got.ops) same('op order', got.ops, old.ops);
    else console.log('  SKIP  op order (sync has no registry() yet)');
    same('gifts layout', got.layout, old.layout, counts);
  },
};
