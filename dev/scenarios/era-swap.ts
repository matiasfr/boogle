// The greybox era swap (?proto=era, docs/plans/find-the-fun.md step 4), solo in a proto- room: the shortcut lays the
// route, the platform offers Start opening day, the gathering call runs (signal smoke, the ring) until the player
// reaches the platform, the bell counts down, and the island swaps from era-1 to era-2 (blocks, sky and fog), with a
// before/after postcard. Stills from the court before, during the call and after, the ring at the platform, and a
// motion sheet of call -> bell -> swap. Serves DESIGN.md 7.
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
    // Start it from away from the platform (as if a friend rang it), so the call runs until we get there.
    await g.eval(
      `${away} const S = await import('/src/world/sync.ts'); S.submitEdit({ op: 'open.start', i: 0, j: 0 });`,
    );
    const started = await g.waitFor(`(async () => { ${R} return rules.opening.opening.t0 >= 0; })()`, {
      timeout: 10000,
    });
    t.check('opening day starts', started >= 0);
    const call = await g.waitFor(`!document.querySelector('.era-call').hidden`, { timeout: 5000 });
    t.check('the gathering call shows', call >= 0);
    t.check(
      'it is the call, not the bell, while nobody is at the platform',
      (await g.eval(`${R} return rules.opening.bell(world.tick).name;`)) === 'call',
    );
    await g.view({ cam: [6, 22, -18], look: [6, 14, -46] }); // above the route, the platform ahead
    await t.sleep(2500);
    t.check('still: the ring and smoke at the platform', true, await g.still('platform-call'));
    await g.view({ cam: [12, 4, 36], look: [9, 12, -40] }); // from the court, looking up at the sky over the route
    await t.sleep(1500);
    t.check('still: the call seen from the court', true, await g.still('court-call'));
    await g.view(COURT_VIEW);
    // Walk in (teleport) a few seconds into the sheet: everyone is here, so the call ends and the bell starts.
    await g.eval(`setTimeout(async () => { ${TP(6, -44)} }, 3000);`);
    const m = await g.motion('call-bell-swap', { frames: 16, seconds: 18 });
    t.check('motion: call into bell into swap', true, m.sheet);
    const here = await g.eval(`${R} const o = rules.opening.opening; return o.here >= 0 && o.here < o.t0 + 450;`);
    t.check('everyone at the platform ends the call early', here === true);
    const swapped = await g.waitFor(`${ERA}.then((e) => e === 2)`, { timeout: 30000 });
    t.check('the era turns over after the bell', swapped >= 0);
    const card = await g.waitFor(`!document.querySelector('.era-postcard').hidden`, { timeout: 10000 });
    t.check('the before/after postcard comes up', card >= 0);
    await t.sleep(800);
    t.check('still: the postcard', true, await g.still('court-postcard'));
    await g.eval(`document.querySelector('.era-postcard').click();`);
    await t.sleep(1000);
    const after = await g.still('court-era2');
    t.check('still: the court after', true, after);
    // Heritage: the era-1 hut that stays (front) and the first site's helper hut (behind) amid era 2.
    await g.view({ cam: [33, 5, 33], look: [19, 2, 8] });
    await t.sleep(1200);
    t.check('still: what stayed from era 1', true, await g.still('heritage'));
    t.check('no page errors', !g.errors.length, g.errors.slice(0, 3).join(' | '));
  },
};
