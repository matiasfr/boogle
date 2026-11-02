// Construction you can watch (docs/game-design/haul.md, "Building"): solo, logs poured into the first site's Helper
// ring with the usual ops (src.take, site.stock) and the helper hut goes up as it fills: scaffold, then pieces landing,
// then the scaffold comes down. Then the finished hut from the spawn and the court, and fresh joins (desktop and iPad
// size) that must see it standing at once, with no replay. Motion sheets and stills to read. Serves DESIGN.md 7 and 9.
import { TP } from './lib/world.mjs';

// The parts of the harness (dev/scenarios/run.mjs, dev/look/lib.mjs) this scenario uses.
type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  view: (v: { cam: number[]; look: number[] }, fov?: number) => Promise<void>;
  still: (label: string) => Promise<string>;
  motion: (
    label: string,
    o: { frames: number; seconds: number; region?: number[] },
  ) => Promise<{ sheet: string; score: number }>;
  errors: string[];
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean; size?: number[] }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

const R = `const { rules } = await import('/src/world/game-world.ts');`;
const HUT = [17, 1.4, 6]; // the hut's middle (the first site's Helper ring + RING_R + 1.9 along x)
const HUT_VIEW = { cam: [12, 4.3, 11], look: [17, 2.4, 5.8] }; // the Helper ring, the sign and the hut
const SPAWN_VIEW = { cam: [14, 3.6, 31.5], look: [15.5, 1.5, 10] }; // about the camera a player arrives with
const COURT_VIEW = { cam: [18, 2.8, 22], look: HUT }; // from the court's east side
const FILL = `(async () => { ${R} const x = rules.sites.sites.list[0]; return x.helpers ? 'built' : x.stock[1]; })()`;
// Pours logs into the open site's Helper ring until it holds `upto` (taking them from the bundles as needed).
const pourTo = (upto: number) => `
  ${R}
  const { submitEdit } = await import('/src/world/sync.ts');
  const { identity } = await import('/src/player/identity.ts');
  const { materialOf } = await import('/src/sim/materials.ts');
  const { ROUTE, HELPER } = await import('/src/sim/route.ts');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let n = 0; n < 200; n++) {
    const s = rules.sites.sites.open, x = rules.sites.sites.list[s];
    if (x.helpers || x.stock[HELPER] >= ${upto}) return x.stock[HELPER];
    const k = materialOf(ROUTE[s].age);
    const mine = rules.stacks.kind(identity.pid) === k ? rules.stacks.count(identity.pid) : 0;
    if (mine > 0) submitEdit({ op: 'site.stock', i: 0, j: 0, s, ring: HELPER, n: Math.min(mine, ${upto} - x.stock[HELPER]) });
    else {
      const id = rules.sources.list().findIndex((_, i) => rules.sources.charges(i) > 0);
      const c = rules.sources.list()[id];
      submitEdit({ op: 'src.take', i: c.i, j: c.j, id });
    }
    await sleep(250);
  }
  return -1;`;

export default {
  about:
    'solo: logs fill the Helper ring and the hut goes up piece by piece; a fresh join sees the finished hut at once',
  timeout: 300000,
  async run(t: Run) {
    const room = 'hutbuild' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'solo', room, hud: true });
    await g.waitFor(`window.boogle?.me?.entered`, { timeout: 90000 });
    await g.eval(`document.querySelector('.first-run-close')?.click(); ${TP(8, 16)}`); // behind the camera
    await g.view(HUT_VIEW);
    await t.sleep(1500);
    t.check('the ring starts empty', (await g.eval(`return ${FILL};`)) === 0);

    // One pour up close: scaffold rises, the first pieces drop in.
    void g.eval(pourTo(10));
    await g.waitFor(`${FILL}.then((n) => n >= 10)`, { timeout: 30000 });
    const one = await g.motion('first-pour', { frames: 12, seconds: 3.6 });
    t.check('motion: the first pour', true, one.sheet);
    await g.view(SPAWN_VIEW);
    t.check('still: scaffold and ghost from the spawn', true, await g.still('first-pour-from-spawn'));
    await g.view(HUT_VIEW);

    // The rest, poured quickly: the pieces keep their own beat after the ring is full.
    void g.eval(pourTo(1000));
    const m = await g.motion('whole-build', { frames: 20, seconds: 19 }); // through the scaffold falling
    t.check('motion: the rest of the build', true, m.sheet);
    const built = await g.waitFor(`${FILL}.then((n) => n === 'built')`, { timeout: 30000 });
    t.check('the full ring builds the hut', built >= 0);
    await t.sleep(4000); // the loose poles go
    t.check('still: the built hut', true, await g.still('built'));
    await g.view(SPAWN_VIEW);
    t.check('still: from the spawn', true, await g.still('from-spawn'));
    await g.view(COURT_VIEW);
    t.check('still: from the court', true, await g.still('from-court'));
    t.check('no page errors', !g.errors.length, g.errors.slice(0, 3).join(' | '));

    // Fresh joins to a finished hut, desktop and iPad: it stands at once, nothing drops in.
    for (const [name, size, tp] of [
      ['join-desktop', [1280, 800], [6, 19]],
      ['join-ipad', [1194, 834], [4, 15]],
    ] as const) {
      const j = await t.open({ name, room, hud: true, size: [...size] });
      await j.waitFor(`window.boogle?.me?.entered && ${FILL}.then((n) => n === 'built')`, { timeout: 90000 });
      await j.eval(`document.querySelector('.first-run-close')?.click();`);
      t.check(`still: ${name} arriving (the player's own camera)`, true, await j.still(`${name}-arrive`));
      await j.eval(TP(tp[0], tp[1])); // out of the hut view, apart from the others
      await j.view(HUT_VIEW);
      await t.sleep(800);
      const sheet = await j.motion(`${name}-settle`, { frames: 6, seconds: 1.5, region: [0.3, 0.1, 0.6, 0.7] });
      t.check(`${name}: the hut stands still on join`, sheet.score < 6, `${sheet.score.toFixed(2)} ${sheet.sheet}`);
      t.check(`still: ${name}`, true, await j.still(name));
      await j.view(SPAWN_VIEW);
      t.check(`still: ${name} from the spawn`, true, await j.still(`${name}-spawn`));
      t.check(`${name}: no page errors`, !j.errors.length, j.errors.slice(0, 3).join(' | '));
    }
  },
};
