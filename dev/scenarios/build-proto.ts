// Construction you can watch (?proto=build, docs/game-design/haul.md): solo in a proto- room, the Pour button fills the
// first site's Helper ring ten logs at a time and the helper hut goes up as it fills: scaffold, then pieces dropping
// in, then the scaffold comes down. A motion sheet of one pour up close and one of the whole build. Serves DESIGN.md 7.
import { TP } from './lib/world.mjs';

// The parts of the harness (dev/scenarios/run.mjs, dev/look/lib.mjs) this scenario uses.
type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  view: (v: { cam: number[]; look: number[] }, fov?: number) => Promise<void>;
  still: (label: string) => Promise<string>;
  motion: (label: string, o: { frames: number; seconds: number }) => Promise<{ sheet: string; score: number }>;
  errors: string[];
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean; query?: string }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

const R = `const { rules } = await import('/src/world/game-world.ts');`;
const HUT_VIEW = { cam: [12, 4.3, 11], look: [17, 2.4, 5.8] }; // the Helper ring, the sign and the hut
const FILL = `(async () => { ${R} const x = rules.sites.sites.list[0]; return x.helpers ? 'built' : x.stock[1]; })()`;
const POUR = `document.querySelector('.build-proto button').click();`;

export default {
  about: 'solo: the Pour button fills the Helper ring and the hut goes up piece by piece, then the scaffold comes down',
  timeout: 240000,
  async run(t: Run) {
    const room = 'proto-build' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'solo', room, hud: true, query: 'proto=build' });
    const up = await g.waitFor(`!!document.querySelector('.build-proto button')`, { timeout: 90000 });
    t.check('the Pour button is up', up >= 0);
    await g.waitFor(`window.boogle?.me?.entered`, { timeout: 30000 });
    await g.eval(`document.querySelector('.first-run-close')?.click(); ${TP(8, 16)}`); // behind the camera
    await g.view(HUT_VIEW);
    await t.sleep(1500);
    t.check('the ring starts empty', (await g.eval(`return ${FILL};`)) === 0);

    // One pour up close: scaffold rises, the first pieces drop in.
    await g.eval(POUR);
    await g.waitFor(`${FILL}.then((n) => n >= 10)`, { timeout: 20000 });
    const one = await g.motion('first-pour', { frames: 8, seconds: 2.4 });
    t.check('motion: the first pour', true, one.sheet);

    // The rest, three more presses, all queued at once.
    await g.eval(POUR + POUR + POUR);
    const m = await g.motion('whole-build', { frames: 16, seconds: 14 });
    t.check('motion: the rest of the build', true, m.sheet);
    const built = await g.waitFor(`${FILL}.then((n) => n === 'built')`, { timeout: 30000 });
    t.check('four pours build the hut', built >= 0);
    await t.sleep(2500); // the scaffold comes down
    const after = await g.still('built');
    t.check('still: the built hut', true, after);
    t.check('no page errors', !g.errors.length, g.errors.slice(0, 3).join(' | '));
  },
};
