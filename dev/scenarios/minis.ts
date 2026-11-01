// Mini-game toys (?proto=minis, docs/game-design/minis.md), solo: a ball thrown into the topple stack knocks crates off
// and the count goes up; one hole of ball golf, teed off and finished with a lob into the bucket; a hop run down the
// mushroom line that overshoots and lands in the sand. A motion sheet of each. Serves DESIGN.md 1, 2 and 10.
import { TP } from './lib/world.mjs';

// The parts of the harness (dev/scenarios/run.mjs, dev/look/lib.mjs) this scenario uses.
type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  view: (v: { cam: number[]; look: number[] }, fov?: number) => Promise<void>;
  still: (label: string) => Promise<string>;
  motion: (label: string, o: { frames: number; seconds: number }) => Promise<{ sheet: string; score: number }>;
  down: (code: string) => Promise<void>;
  up: (code: string) => Promise<void>;
  key: (code: string, holdMs?: number) => Promise<void>;
  errors: string[];
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean; query?: string }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
  sleep: (ms: number) => Promise<void>;
};

const M = (f: string) => `(await import('/src/proto/minis/${f}.ts'))`;
const BALL = `const B = await import('/src/physics/ball.ts'); const I = await import('/src/player/inventory.ts');
  const T = await import('/src/adapters/terrain.ts');`;
// Grab the ball into your hands (as E does), then throw it from (x, y, z) with velocity (vx, vy, vz).
const THROW = (x: number, y: string, z: number, v: string) => `
  ${BALL}
  B.grabBall(); I.take('ball');
  await new Promise((r) => setTimeout(r, 300));
  B.throwBall({ x: ${x}, y: ${y}, z: ${z} }, ${v});`;

export default {
  about: 'solo: a ball knocks the topple stack, a golf hole goes in, a hop run fails in the sand',
  timeout: 240000,
  async run(t: Run) {
    const room = 'minis' + Math.random().toString(36).slice(2, 6);
    const g = await t.open({ name: 'solo', room, query: 'proto=minis' });
    await g.waitFor(`window.boogle?.me?.entered`, { timeout: 90000 });
    await g.eval(`document.querySelector('.first-run-close')?.click(); await ${M('index')}.loaded;`);
    await g.eval(`localStorage.clear();`);

    // ---- Topple: a hard throw at the middle of the stack from 6 m.
    await g.eval(TP(17.4, 28.2));
    await g.view({ cam: [12.5, 7.5, 27.5], look: [21, 2.6, 33] });
    await t.sleep(1200);
    const before = await g.still('topple-set');
    t.check('still: the stack, set', true, before);
    await g.eval(
      THROW(17.6, 'T.groundHeight(17.6, 28.6) + 1.3', 28.6, `{ x: (21 - 17.6) * 3.4, y: 2.5, z: (33 - 28.6) * 3.4 }`),
    );
    const topple = await g.motion('topple', { frames: 8, seconds: 2.8 });
    t.check('motion: the topple', true, topple.sheet);
    const fallen = (await g.eval(`return ${M('topple')}.toppleState();`)) as { fallen: number; shots: number };
    t.check('crates fell and the shot counted', fallen.fallen > 0 && fallen.shots === 1, JSON.stringify(fallen));
    const scored = await g.waitFor(
      `import('/src/proto/minis/topple.ts').then((m) => m.toppleState().mode !== 'live')`,
      {
        timeout: 15000,
      },
    );
    t.check('the round scores and the stack rebuilds', scored >= 0);
    await t.sleep(400);
    const rebuild = await g.motion('topple-rebuild', { frames: 6, seconds: 1.5 });
    t.check('motion: the rebuild', true, rebuild.sheet);
    const best = (await g.eval(`return ${M('topple')}.toppleState().best;`)) as number | null;
    t.check('a best is kept', best !== null && best >= 100, String(best));

    // ---- Golf: tee off, one long throw west, then a lob into the bucket from 3 m.
    await g.eval(`${TP(1.8, 18.4)} ${M('golf')}.teeOff();`);
    await g.view({ cam: [9, 5, 23], look: [-8, 3, 15] });
    await t.sleep(800);
    t.check('still: the tee, the flag past the palms', true, await g.still('golf-tee'));
    await g.eval(THROW(3.5, 'T.groundHeight(3.5, 18.8) + 1.3', 18.8, `{ x: -14, y: 9, z: -2.4 }`));
    await t.sleep(5000);
    const one = (await g.eval(`return ${M('golf')}.golfState();`)) as { strokes: number; mode: string };
    t.check('the first throw is stroke 1', one.strokes === 1 && one.mode === 'play', JSON.stringify(one));
    await g.eval(`
      const G = ${M('golf')};
      ${BALL}
      ${TP(-27, 17.6)}
      B.grabBall(); I.take('ball');
      await new Promise((r) => setTimeout(r, 300));
      const p = { x: -27.4, y: groundHeight(-27, 17.6) + 1.6, z: 17.5 };
      const cupY = groundHeight(G.CUP.x, G.CUP.z) + 0.6;
      const vy = 6, gr = 18, dy = p.y - cupY;
      const tt = (vy + Math.sqrt(vy * vy + 2 * gr * dy)) / gr;
      B.throwBall(p, { x: (G.CUP.x - p.x) / tt, y: vy, z: (G.CUP.z - p.z) / tt });`);
    await g.view({ cam: [-26, 8, 5.5], look: [-30, 5.4, 16.5] });
    const hole = await g.motion('golf-hole-in', { frames: 8, seconds: 2.4 });
    t.check('motion: the hole-in', true, hole.sheet);
    const done = (await g.eval(`return ${M('golf')}.golfState();`)) as { strokes: number; mode: string };
    t.check('the lob goes in on stroke 2', done.mode === 'holed' && done.strokes === 2, JSON.stringify(done));

    // ---- Hop: from the start crate, run west holding forward and jump; full walking speed overshoots.
    await g.eval(`${M('hop')}.toStart();`);
    await g.view({ cam: [-14, 9, 55], look: [-14, 2.5, 31] });
    await t.sleep(800);
    t.check('still: the hop line', true, await g.still('hop-line'));
    await g.down('KeyW');
    await t.sleep(250);
    await g.key('Space', 120);
    const hop = await g.motion('hop-fail', { frames: 10, seconds: 4.5 });
    await g.up('KeyW');
    t.check('motion: a hop run that fails', true, hop.sheet);
    const h = (await g.eval(`return ${M('hop')}.hopState();`)) as { mode: string; hops: number };
    t.check(
      'the run started on a mushroom and failed in the sand',
      h.mode === 'fail' && h.hops >= 1,
      JSON.stringify(h),
    );
    // Finishing: land on the deck mid-run.
    await g.eval(`${M('hop')}.toStart();`);
    await t.sleep(300);
    await g.eval(`
      const H = ${M('hop')};
      ${TP(-1.5, 31, 'groundHeight(-1.5, 31) + 4')}`);
    await g.waitFor(`import('/src/proto/minis/hop.ts').then((m) => m.hopState().mode === 'run')`, { timeout: 5000 });
    await g.eval(`${TP(-29.5, 31, 'groundHeight(-29.5, 31) + 3')}`);
    const fin = await g.waitFor(`import('/src/proto/minis/hop.ts').then((m) => m.hopState().mode === 'done')`, {
      timeout: 5000,
    });
    t.check('landing on the deck mid-run finishes with a time', fin >= 0);
    t.check('no page errors', !g.errors.length, g.errors.slice(0, 3).join(' | '));
  },
};
