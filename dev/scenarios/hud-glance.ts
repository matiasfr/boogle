// The HUD in use on the railway, at desktop size and on an iPad (touch, landscape): the interact prompt over a tree
// (Chop) and over a log pile (Pick up), the held thing's name tag, the carry tag (src/features/haul-stack.ts, the
// railway's slots in place of the classic haul chip), a hands note in the notification lane plus the update notice.
// Checks a press squashes the prompt and the carry tag fills to the host-confirmed count on your back. Each leg writes
// stills (`desk-*`, `ipad-*`). Serves DESIGN.md "Understandable at a glance".
//
// Each leg jumps into a fresh private room seeded at `awake` (the real `?from=` jump-in, as `arrival` does), so the
// axe is in hand and the trees by Home take a chop. Ported from the classic island on 11 November: the classic legs'
// work-site rings and the plaque flips have no railway surface yet, so they went with the port.
import { INV } from './lib/world.ts';
import type { T } from './run.ts';

// In the page: `r` is the view's inspection (session scalars, the scene's trees and reward); the world's facts are rows
// and queries: `carry()` is this player's back (the account row), `phase()` the machine's.
const READ = `const { inspectRailway, railAt, railPid, railRead, railPhase, account, rw } = await import('/dev/look/rail-read.ts');
  const r = inspectRailway();
  const carry = () => (railRead() ? (account(rw(), railPid())?.carry ?? 0) : -1);
  const phase = () => (railRead() ? railPhase(rw(), railAt()) : null);`;
const shown = (sel: string) =>
  `(() => { const e = document.querySelector('${sel}'); return !!e && !e.closest('[hidden]'); })()`;
const PROMPT = `(document.querySelector('.prompt:not([hidden]) .prompt-chip')?.textContent ?? '')`;
// The carry tag's filled log slots, its label, and the confirmed logs on your back (no action of yours pending).
const CARRY = `(async () => { ${READ}
  return { slots: document.querySelectorAll('.carry-slot[data-material="logs"]').length,
    label: document.querySelector('.carry-tag')?.getAttribute('aria-label') ?? '',
    seen: Number(document.querySelector('.carry-tag')?.style.opacity || 0),
    carry: carry(), pending: r?.pending ?? -1 }; })()`;
const CONFIRMED = (n: string) =>
  `(async () => { const c = await ${CARRY}; return c.pending === 0 && c.carry ${n} && c.slots === c.carry && c.seen > 0; })()`;

export default {
  about:
    'the HUD at desktop and iPad size on the railway: prompt, press squash, name tag, carry tag, notification lane',
  timeout: 420000,
  async run(t: T) {
    for (const tag of ['desk', 'ipad']) {
      const ipad = tag === 'ipad';
      const g = await t.open({
        name: tag,
        hud: 'play',
        size: ipad ? [1194, 834] : [1440, 900],
        touch: ipad,
        query: process.env.HUD_QUERY ?? '',
      });
      // In through the lobby once (so the name is saved), then the real jump-in, as `arrival` does: a fresh private room
      // seeded at `awake`, entered straight away. The page is new, so the HUD trim and the splash go again.
      const jump = new URL(g.page.url());
      jump.searchParams.delete('room');
      jump.searchParams.set('from', 'awake');
      await g.page.goto(jump.href);
      await g.page.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 180000 });
      await g.page.addStyleTag({
        content: '.hud-tl, .hud-tr, .reticle, .touch:not(body), .lobby, .splash { display: none !important }',
      });
      const ready = await g.waitFor(
        `(async () => { ${READ} return window.boogle.me.entered && !!window.boogle.me.body && !!r?.ready && phase() === 'idle' && !r.reward.showing; })()`,
        { timeout: 60000 },
      );
      t.check(`${tag}: in a room seeded awake`, ready >= 0, `${ready} ms`);

      // The nearest ordinary tree, and a spot 2 m from it on our side, facing it.
      const tree = (await g.eval(`${READ}
        const p = window.boogle.me.body.position;
        const list = r.trees.filter((s) => !s.cleared && s.remaining > 2 && ![28, 209, 232].includes(s.id))
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
        const s = list[0];
        if (!s) return null;
        const d = Math.hypot(p.x - s.x, p.z - s.z) || 1;
        return { id: s.id, x: s.x, y: s.y, z: s.z, sx: s.x + ((p.x - s.x) / d) * 2, sz: s.z + ((p.z - s.z) / d) * 2 };`)) as {
        id: number;
        x: number;
        y: number;
        z: number;
        sx: number;
        sz: number;
      } | null;
      if (!tree) {
        t.check(`${tag}: a tree to chop by Home`, false);
        await g.close();
        continue;
      }
      const STAND = `
        const { teleport } = await import('/src/physics/engine.ts');
        const { cam } = await import('/src/player/player.ts');
        const b = window.boogle.me.body;
        teleport(b, ${tree.sx}, ${tree.y} + 1.2, ${tree.sz});
        b.velocity.set(0, 0, 0);
        cam.yaw = window.boogle.me.yaw = Math.atan2(-(${tree.x} - ${tree.sx}), -(${tree.z} - ${tree.sz})); cam.pitch = -0.2;`;
      await g.eval(STAND);
      await g.view(
        {
          cam: [tree.sx + (tree.sx - tree.x) * 1.6 + 1.5, tree.y + 2.6, tree.sz + (tree.sz - tree.z) * 1.6 + 1.5],
          look: [tree.x, tree.y + 1.2, tree.z],
        },
        55,
      );
      const chopMs = await g.waitFor(`${PROMPT}.includes('Chop')`, { timeout: 15000 });
      await g.wait(0.4);
      t.check(`${tag}: by a tree the prompt says Chop`, chopMs >= 0, `${chopMs} ms; ${await g.still(`${tag}-chop`)}`);

      // E chops (the axe is the empty hand's click target); the first press squashes the sticker.
      await g.eval(`${INV} H.interactDown(); H.interactUp();`);
      await g.wait(0.08);
      const pressed = await g.eval(`return !!document.querySelector('.prompt-chip.ui-press');`);
      t.check(`${tag}: a press squashes the prompt`, !!pressed);
      // Chop on at a person's pace until three logs are on your back.
      const chopped = await g.eval(`${INV} ${READ}
        for (let k = 0; k < 80 && carry() < 3; k++) {
          if (inspectRailway().pending === 0) { H.interactDown(); H.interactUp(); }
          await new Promise((res) => setTimeout(res, 380));
        }
        return carry();`);
      const filled = await g.waitFor(CONFIRMED('>= 3'), { timeout: 15000 });
      const after = await g.eval(`return ${CARRY};`);
      t.check(
        `${tag}: the carry tag fills to the confirmed logs on your back`,
        filled >= 0,
        `${chopped} chopped; ${JSON.stringify(after)}; ${await g.still(`${tag}-carry`)}`,
      );

      // One log down in front of you (a tap of Drop), a frisbee in hand: the pile's Pick up is the prompt, beside the
      // name tag. Picking it up puts it back on your back, and the carry tag shows the confirmed count again.
      const before = (after as { carry: number }).carry;
      await g.eval(`const { triggerAction } = await import('/src/player/controls.ts');
        triggerAction('place-drop', 'down'); triggerAction('place-drop', 'up');`);
      const dropped = await g.waitFor(CONFIRMED(`=== ${before - 1}`), { timeout: 15000 });
      t.check(
        `${tag}: a tap of Drop puts one log down`,
        dropped >= 0,
        JSON.stringify(await g.eval(`return ${CARRY};`)),
      );
      await g.eval(`${INV} I.take('frisbee');`);
      const pickMs = await g.waitFor(`${PROMPT}.includes('Pick up') && ${shown('.held-name.shown')}`, {
        timeout: 10000,
      });
      await g.wait(0.4);
      t.check(
        `${tag}: by the pile the prompt says Pick up, with the frisbee's name tag`,
        pickMs >= 0,
        `${pickMs} ms; ${JSON.stringify(await g.eval(`return { prompt: ${PROMPT}, held: document.querySelector('.held-name')?.textContent };`))}; ${await g.still(`${tag}-hud`)}`,
      );
      await g.eval(`${INV} H.interactDown(); H.interactUp();`);
      await g.wait(0.08);
      t.check(
        `${tag}: a press on Pick up squashes the prompt`,
        !!(await g.eval(`return !!document.querySelector('.prompt-chip.ui-press');`)),
      );
      const back = await g.waitFor(CONFIRMED(`=== ${before}`), { timeout: 15000 });
      await g.wait(0.3);
      t.check(
        `${tag}: picked up, the carry tag shows the confirmed count again`,
        back >= 0,
        `${JSON.stringify(await g.eval(`return ${CARRY};`))}; ${await g.still(`${tag}-pickup`)}`,
      );

      // A jump room's own line (src/features/jump-in.ts) takes the lane once, a few seconds in: let it have its turn
      // first, or it shows in place of the update notice below.
      await g.waitFor(`Object.keys(localStorage).some((k) => k.startsWith('boogle.jump.seen.v1:'))`, {
        timeout: 20000,
      });
      await g.waitFor(`!document.querySelector('.notify.shown')?.textContent.includes('test room')`, {
        timeout: 15000,
      });
      await g.eval(`${INV} H.handsNote.text = 'Nothing to plant here'; H.handsNote.until = performance.now() + 8000;`);
      await g.wait(0.6);
      const noteShot = await g.still(`${tag}-note`);
      const note = await g.eval(`return document.querySelector('.notify.shown')?.textContent ?? '';`);
      t.check(`${tag}: hands note in the lane`, String(note).includes('Nothing to plant'), `${note}; ${noteShot}`);
      {
        await g.eval(`const { notify } = await import('/src/ui/notify.ts');
          notify('Boogle was updated – reload to stay in sync with friends', { kind: 'news', ttl: 0, key: 'update', action: { label: 'Reload', run() {} } });`);
        // it waits under the note until that has had its time
        await g.waitFor(`document.querySelector('.notify.shown')?.textContent.includes('updated')`, { timeout: 12000 });
        await g.wait(0.5);
        const still = await g.still(`${tag}-update`);
        const lane = await g.eval(`return document.querySelector('.notify.shown')?.textContent ?? '';`);
        t.check(`${tag}: update notice in the lane`, String(lane).includes('updated'), `${lane}; ${still}`);
      }
      t.check(`${tag}: no page errors`, !g.errors.length, g.errors.slice(0, 2).join(' | '));
      await g.close();
    }
  },
};
