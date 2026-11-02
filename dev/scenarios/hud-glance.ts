// The HUD in use, at desktop size and on an iPad (touch, landscape): the interact prompt over a log bundle, the hotbar
// with a name tag, the haul chip, a hotbar note in the notification lane plus the update notice, the work-site rings,
// and the plaque mid-flip after a credited pour. Checks the haul chip ticks up to the confirmed count, a press squashes
// the prompt, and a run of pours flips the plaque at most once a second. Each leg writes stills (`desk-*`, `ipad-*`).
// Serves DESIGN.md "Understandable at a glance".
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
  open: (o: {
    name: string;
    room: string;
    hud?: boolean | string;
    size?: number[];
    touch?: boolean;
    query?: string;
  }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
};

const R = `const { rules } = await import('/src/world/game-world.ts'); const { identity } = await import('/src/player/identity.ts');`;
// The log bundle nearest (13, 12), and its spot.
const BUNDLE = `${R}
  const { cellX, cellZ, groundHeight } = await import('/src/adapters/terrain.ts');
  const list = rules.sources.list().map((p, id) => { const x = cellX(p.i) + 0.9, z = cellZ(p.j) + 0.4; return { id, x, z, y: groundHeight(x, z), d: Math.hypot(x - 13, z - 12) }; });
  list.sort((a, b) => a.d - b.d);`;

export default {
  about: 'the HUD at desktop and iPad size: prompt, hotbar, haul chip, notification lane, plaque flip',
  timeout: 300000,
  async run(t: Run) {
    for (const tag of ['desk', 'ipad']) {
      const ipad = tag === 'ipad';
      const room = 'ui' + Math.random().toString(36).slice(2, 8);
      const g = await t.open({
        name: tag,
        room,
        hud: 'play',
        size: ipad ? [1194, 834] : [1440, 900],
        touch: ipad,
        query: process.env.HUD_QUERY ?? '',
      });
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
      {
        const ticked = await g.waitFor(
          `(async () => { ${R} return document.querySelector('.haul-n')?.textContent === String(rules.stacks.count(identity.pid)); })()`,
          { timeout: 5000 },
        );
        t.check(`${tag}: the haul chip ticks up to the confirmed count`, ticked >= 0);
      }
      await g.waitFor(`!document.querySelector('.prompt').hidden`, { timeout: 10000 });
      await g.wait(0.5);
      t.check(`${tag}: prompt, hotbar and haul chip`, true, await g.still(`${tag}-hud`));
      await g.eval(`${INV} H.interactDown(); H.interactUp();`);
      await g.wait(0.08);
      const pressed = await g.eval(`return !!document.querySelector('.prompt-chip.ui-press');`);
      t.check(`${tag}: a press squashes the prompt`, !!pressed);
      await g.eval(`${INV} H.handsNote.text = 'Nothing to plant here'; H.handsNote.until = performance.now() + 8000;`);
      await g.wait(0.6);
      t.check(`${tag}: hotbar note`, true, await g.still(`${tag}-note`));
      // Site 0's rings (Track west, Helper east of (11, 6)), seen at a walking angle.
      await g.eval(`${TP(11, 12)}`);
      await g.view({ cam: [11, 7, 12.5], look: [11, 0, 6] }, 55);
      await g.wait(0.6);
      t.check(`${tag}: work-site rings`, true, await g.still(`${tag}-rings`));
      {
        await g.eval(`const { notify } = await import('/src/ui/notify.ts');
          notify('Boogle was updated – reload to stay in sync with friends', { kind: 'news', ttl: 0, key: 'update', action: { label: 'Reload', run() {} } });`);
        // it waits under the note until that has had its time
        await g.waitFor(`document.querySelector('.notify.shown')?.textContent.includes('updated')`, { timeout: 12000 });
        await g.wait(0.5);
        t.check(`${tag}: update notice in the lane`, true, await g.still(`${tag}-update`));
      }
      // Site 0's plaque (beside the Helper ring, at (13.6, 3.6)), then a pour credited on it: its row turns over (slowed
      // down here so the still catches it mid-flip).
      await g.eval(`${TP(12.5, 9.5)}`);
      const py = (await g.eval(
        `const { groundHeight } = await import('/src/adapters/terrain.ts'); return groundHeight(13.6, 3.6);`,
      )) as number;
      await g.view({ cam: [18, py + 2.8, 8.5], look: [13.6, py + 1.8, 3.6] }, 50);
      await g.eval(`const w = await import('/src/features/work-sites.ts'); w.flapFeel.ms = 2400;`);
      await g.eval(`window.boogle.sync.submitEdit({ op: 'site.stock', i: 0, j: 0, s: 0, ring: 1, n: 10 });`);
      const flipping = await g.waitFor(
        `(async () => { const w = await import('/src/features/work-sites.ts'); return w.flapping(0); })()`,
        { timeout: 5000 },
      );
      t.check(`${tag}: a credited pour flips the plaque`, flipping >= 0);
      await g.wait(1.6);
      t.check(`${tag}: plaque mid-flip`, true, await g.still(`${tag}-plaque-flip`));
      await g.wait(2.6);
      // A run of pours (one every 300 ms, like standing in the ring) flips the plaque at most once in FLIP_GAP_MS.
      await g.eval(
        `${BUNDLE} for (const s of list.slice(4, 8)) window.boogle.sync.submitEdit({ op: 'src.take', i: 0, j: 0, id: s.id });`,
      );
      await g.wait(1.5);
      const flips = await g.eval(`const w = await import('/src/features/work-sites.ts'); w.flapFeel.ms = 320;
        let n = 0, was = false;
        for (let k = 0; k < 8; k++) {
          window.boogle.sync.submitEdit({ op: 'site.stock', i: 0, j: 0, s: 0, ring: 1, n: 1 });
          for (let f = 0; f < 6; f++) { await new Promise((r) => setTimeout(r, 50)); const on = w.flapping(0); if (on && !was) n++; was = on; }
        }
        return n;`);
      t.check(
        `${tag}: a run of pours flips the plaque only now and then`,
        (flips as number) >= 1 && (flips as number) <= 3,
        `${flips} flips in 2.4 s`,
      );
      t.check(`${tag}: plaque after a pour`, true, await g.still(`${tag}-plaque`));
      t.check(`${tag}: no page errors`, !g.errors.length, g.errors.slice(0, 2).join(' | '));
      await g.close();
    }
  },
};
