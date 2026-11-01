// The UI kit prototype (?proto=uisfx, docs/research/ui-patterns.md recs 1-4) beside today's HUD, at an iPad Pro 11"
// viewport: the interact prompt over a log bundle, the hotbar with a name tag, the haul chip, a hotbar note, and the
// work-site rings. Each leg writes stills (`plain-*`, `kit-*`) for a before/after; the kit leg also checks the haul
// chip ticks up to the confirmed count and the prompt answers a press. Serves DESIGN.md "Understandable at a glance".
import { TP, INV } from './lib/world.mjs';

type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  view: (v: { cam: number[]; look: number[] }, fov?: number) => Promise<void>;
  still: (label: string) => Promise<string>;
  wait: (s: number) => Promise<void>;
  close: () => Promise<void>;
  errors: string[];
};
type Run = {
  open: (o: { name: string; room: string; hud?: boolean | string; size?: number[]; query?: string }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
};

const R = `const { rules } = await import('/src/world/game-world.ts'); const { identity } = await import('/src/player/identity.ts');`;
// The log bundle nearest (13, 12), and its spot.
const BUNDLE = `${R}
  const { cellX, cellZ, groundHeight } = await import('/src/adapters/terrain.ts');
  const list = rules.sources.list().map((p, id) => { const x = cellX(p.i) + 0.9, z = cellZ(p.j) + 0.4; return { id, x, z, y: groundHeight(x, z), d: Math.hypot(x - 13, z - 12) }; });
  list.sort((a, b) => a.d - b.d);`;

export default {
  about: 'the UI kit prototype beside the plain HUD at iPad size: prompt, hotbar, haul chip, note, rings',
  timeout: 300000,
  async run(t: Run) {
    for (const kit of [false, true]) {
      const tag = kit ? 'kit' : 'plain';
      const room = 'ui' + Math.random().toString(36).slice(2, 8);
      const g = await t.open({ name: tag, room, hud: 'play', size: [1194, 834], query: kit ? 'proto=uisfx' : '' });
      await g.waitFor(`window.boogle.me.entered && !!window.boogle.me.body`, { timeout: 30000 });
      // Something in the hotbar, and logs on your back from bundles other than the one we stand at.
      const b = (await g.eval(`${BUNDLE}
        for (const s of list.slice(1, 4)) window.boogle.sync.submitEdit({ op: 'src.take', i: 0, j: 0, id: s.id });
        return list[0];`)) as { id: number; x: number; z: number; y: number };
      const got = await g.waitFor(`(async () => { ${R} return rules.stacks.count(identity.pid) >= 12; })()`, {
        timeout: 20000,
      });
      t.check(`${tag}: logs on your back`, got >= 0);
      await g.eval(`${TP(b.x - 1.2, b.z + 0.6)} window.boogle.me.yaw = 0;`);
      await g.view({ cam: [b.x - 3.4, b.y + 2.3, b.z + 3.6], look: [b.x - 0.4, b.y + 0.6, b.z] }, 55);
      await g.eval(`${INV} I.take('frisbee', 1, false); I.select(0);`);
      if (kit) {
        const ticked = await g.waitFor(
          `(async () => { ${R} return document.querySelector('.haul-n')?.textContent === String(rules.stacks.count(identity.pid)); })()`,
          { timeout: 5000 },
        );
        t.check('kit: the haul chip ticks up to the confirmed count', ticked >= 0);
      }
      await g.waitFor(`!document.querySelector('.prompt').hidden`, { timeout: 10000 });
      await g.wait(0.5);
      t.check(`${tag}: prompt, hotbar and haul chip`, true, await g.still(`${tag}-hud`));
      if (kit) {
        await g.eval(`${INV} H.interactDown(); H.interactUp();`);
        await g.wait(0.08);
        const pressed = await g.eval(`return !!document.querySelector('.prompt-chip.ui-press');`);
        t.check('kit: a press squashes the prompt', !!pressed);
      }
      await g.eval(`${INV} H.handsNote.text = 'Nothing to plant here'; H.handsNote.until = performance.now() + 8000;`);
      await g.wait(0.6);
      t.check(`${tag}: hotbar note`, true, await g.still(`${tag}-note`));
      // Site 0's rings (Track west, Helper east of (11, 6)), seen at a walking angle.
      await g.eval(`${TP(11, 12)}`);
      await g.view({ cam: [11, 7, 12.5], look: [11, 0, 6] }, 55);
      await g.wait(0.6);
      t.check(`${tag}: work-site rings`, true, await g.still(`${tag}-rings`));
      t.check(`${tag}: no page errors`, !g.errors.length, g.errors.slice(0, 2).join(' | '));
      await g.close();
    }
  },
};
