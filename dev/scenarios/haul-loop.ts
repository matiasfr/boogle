// The 0.1 haul loop with two players (docs/plans/0.1-groundwork.md): Bob shakes palms for logs, walks into the first
// work site's Track ring so his stack pours itself in, and starts the machine; Alice sees the logs on his back, the
// plaque and the machine laying track, and both worlds agree. Serves DESIGN.md 4 and 6.
import { roles, hashesAtOneTick, MET, TP } from './lib/world.mjs';

// The parts of the harness (dev/scenarios/run.mjs, dev/look/lib.mjs) this scenario uses.
type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  view: (v: { cam: number[]; look: number[] }) => Promise<void>;
  still: (label: string) => Promise<unknown>;
  errors: string[];
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

const R = `const { rules } = await import('/src/world/game-world.js'); const { identity } = await import('/src/player/identity.ts');`;

export default {
  about: 'shake, carry, pour, run: one section of the railway gets laid and both players see it',
  timeout: 300000,
  async run(t: Run) {
    const room = 'hl' + Math.random().toString(36).slice(2, 8);
    const A = await t.open({ name: 'Alice', room });
    const B = await t.open({ name: 'Bob', room, hud: true });
    t.check('the players see each other', (await B.waitFor(MET, { timeout: 30000 })) >= 0);
    const r = await roles(A, B);
    t.check('one host and one client', r.ok, r.modes.join());

    // Shake 15 palms: 4 logs each onto Bob's stack.
    const got = await B.eval(`${R}
      for (let id = 0; id < 15; id++) window.boogle.sync.submitEdit({ op: 'src.take', i: 0, j: 0, id });
      return identity.pid;`);
    const full = await B.waitFor(`(async () => { ${R} return rules.stacks.count(identity.pid) >= 60; })()`, {
      timeout: 30000,
    });
    t.check('shaking palms fills the stack', full >= 0, `pid ${got}, ${full} ms`);
    await B.eval(`${TP(13, 10)} window.boogle.me.yaw = Math.PI;`);
    await A.view({ cam: [19, 4, 12], look: [13, 2, 10] });
    const seen = await A.waitFor(
      `(async () => { ${R} const r = [...window.boogle.remotes.values()][0]; return !!r?.pid && rules.stacks.count(r.pid) >= 60; })()`,
      { timeout: 20000 },
    );
    t.check("Alice matches Bob's avatar to his stack", seen >= 0);
    await A.waitFor(
      `(() => { const p = [...window.boogle.remotes.values()][0]?.avatar?.position; return p && Math.hypot(p.x - 13, p.z - 10) < 1; })()`,
      { timeout: 15000 },
    );
    await A.still('A-sees-stack');

    // Walk into the Track ring of site 0 (8.6, 6): the stack pours itself in.
    await B.eval(TP(8.6, 6));
    const poured = await B.waitFor(`(async () => { ${R} return rules.sites.canRun(0); })()`, { timeout: 60000 });
    t.check('standing in the Track ring pours a whole section', poured >= 0, poured + ' ms');
    const pts = await A.eval(
      `${R} const r = [...window.boogle.remotes.values()][0]; return rules.sites.points(r.pid);`,
    );
    t.check("Bob's pours are on the plaque, as Alice sees it", pts === 100, String(pts));

    await B.eval(`window.boogle.sync.submitEdit({ op: 'site.run', i: 0, j: 0, s: 0 });`);
    const running = await A.waitFor(`(async () => { ${R} return rules.sites.sites.list[0].t0 >= 0; })()`, {
      timeout: 15000,
    });
    t.check("Bob's start reaches Alice", running >= 0);
    await A.view({ cam: [17, 5, 9], look: [10.5, 1, 1] });
    // The run lasts 500 ticks; two software-rendered tabs tick far slower than 10/s, so this checks it is laying
    // track (the end of a run is covered by test/sites.test.ts).
    const laying = await A.waitFor(
      `(async () => { ${R} const { world } = await import('/src/world/sync.js'); return rules.sites.run(0, world.tick).total >= 150; })()`,
      { timeout: 150000 },
    );
    t.check('the machine is laying track for Alice too', laying >= 0, laying + ' ms');
    await A.still('A-sees-machine');
    const errs = [...A.errors, ...B.errors];
    t.check('no page errors in either tab', !errs.length, errs.slice(0, 3).join(' | '));
    const h = await hashesAtOneTick(r.host, r.client);
    t.check('both tabs hash every state the same', h.same, h.detail);
  },
};
