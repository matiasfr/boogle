// The greybox era swap (?proto=era, docs/plans/find-the-fun.md step 4), solo in a proto- room: the shortcut lays the
// route, the platform offers Start opening day, the bell counts down, and the island swaps from era-1 to era-2
// blocks. Stills from the court before and after, and a motion sheet of the countdown into the swap. Serves DESIGN.md 7.
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

const R = `const { rules } = await import('/src/world/game-world.ts'); const { world } = await import('/src/world/sync.ts');`;
const COURT_VIEW = { cam: [12, 9, 36], look: [12, 1, 8] }; // the court in front, the route and the town hall behind
const ERA = `(async () => { ${R} return rules.opening.era(world.tick); })()`;

export default {
  about: 'solo: lay the route with the shortcut, start opening day at the platform, and the island swaps eras',
  timeout: 240000,
  async run(t: Run) {
    const room = 'proto-era' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'solo', room, hud: true, query: 'proto=era' });
    const up = await g.waitFor(`!!document.querySelector('.era-proto button')`, { timeout: 90000 });
    t.check('the proto shortcut button is up', up >= 0);
    await g.waitFor(`window.boogle?.me?.entered`, { timeout: 30000 });
    // Out of the picture: the first-run card, and the player (behind the camera).
    const away = TP(12, 38);
    await g.eval(`document.querySelector('.first-run-close')?.click(); ${away}`);
    await g.view(COURT_VIEW);
    await t.sleep(1500);
    t.check('the island starts in era 1', (await g.eval(`${R} return rules.opening.era(world.tick);`)) === 1);
    const before = await g.still('court-era1');
    t.check('still: the court before', true, before);

    await g.eval(`document.querySelector('.era-proto button').click();`);
    const laid = await g.waitFor(`(async () => { ${R} return rules.opening.ready(); })()`, { timeout: 20000 });
    t.check('the shortcut lays the whole route in a proto- room', laid >= 0, laid + ' ms');

    await g.eval(TP(6, -44)); // the platform at the far end of the route
    const verb = await g.waitFor(
      `(async () => { const H = await import('/src/player/hands.ts'); return H.interactTarget()?.verb === 'Start opening day'; })()`,
      { timeout: 10000 },
    );
    t.check('the platform offers Start opening day', verb >= 0);
    await g.eval(`const H = await import('/src/player/hands.ts'); H.interactTarget().run();`);
    const started = await g.waitFor(`(async () => { ${R} return rules.opening.opening.t0 >= 0; })()`, {
      timeout: 10000,
    });
    t.check('opening day starts', started >= 0);
    await g.eval(away);
    await g.view(COURT_VIEW);
    const counting = await g.waitFor(`!document.querySelector('.era-count').hidden`, { timeout: 5000 });
    t.check('the countdown shows', counting >= 0);
    // The last few seconds of the bell into the swap.
    await g.waitFor(`(async () => { ${R} const o = rules.opening.opening; return world.tick >= o.t0 + 70; })()`, {
      timeout: 30000,
    });
    const m = await g.motion('countdown-swap', { frames: 12, seconds: 6 });
    t.check('motion: countdown into the swap', true, m.sheet);
    const swapped = await g.waitFor(`${ERA}.then((e) => e === 2)`, { timeout: 30000 });
    t.check('the era turns over after the bell', swapped >= 0);
    await t.sleep(3000); // the ripple and the "Opening day!" card play out
    const after = await g.still('court-era2');
    t.check('still: the court after', true, after);
    t.check('no page errors', !g.errors.length, g.errors.slice(0, 3).join(' | '));
  },
};
