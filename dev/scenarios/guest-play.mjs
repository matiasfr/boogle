// Playing as the guest with real files: the engine and the ROM are given through the dialog's file picker, the dino
// becomes the engine's model, you become the guest, walk and jump, talk to switch back, and after a reload this
// browser still has both files. Needs files nobody ships, so it is skipped unless GUEST_ROM names your ROM; the engine
// is GUEST_ENGINE or native/guest/out/engine.wasm (native/guest/README.md). Neither file goes over the network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TP } from './lib/world.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROM = process.env.GUEST_ROM;
const ENGINE = process.env.GUEST_ENGINE || path.join(root, 'native/guest/out/engine.wasm');

const MODS = `
  const { dino } = await import('/src/guest/dino.ts');
  const { guest } = await import('/src/guest/state.ts');`;
const goToDino = `(async () => {
  ${MODS}
  ${TP('dino.pos.x + 1.4', 'dino.pos.z')}
  const { cam } = await import('/src/player/player.ts');
  cam.yaw = Math.atan2(1.4, 0); cam.pitch = -0.2;
  await new Promise((r) => setTimeout(r, 150));
  const { interactTarget } = await import('/src/player/hands.ts');
  return interactTarget()?.id === 'dino';
})()`;
const isGuest = `(async () => { ${MODS} return guest.active && !!guest.pose; })()`;
const realDino = `(async () => { ${MODS} return !!dino.real; })()`;
const pos = `const p = window.boogle.me.body.position; return { x: p.x, y: p.y, z: p.z };`;

async function give(g, file) {
  const [chooser] = await Promise.all([g.page.waitForEvent('filechooser'), g.page.click('.files-pick')]);
  await chooser.setFiles(file);
}

export default {
  about: 'with your own engine and ROM: become the guest, move, switch back, files kept after a reload',
  timeout: 180000,
  async run(t) {
    if (!ROM || !fs.existsSync(ROM) || !fs.existsSync(ENGINE)) {
      t.check('skipped: set GUEST_ROM (and build or place the engine) to run this', true);
      return;
    }
    const g = await t.open({ name: 'guest', hud: 'play' });
    const fetched = [];
    g.page.on('request', (r) => /\.(wasm|z64|n64|v64)$/.test(r.url()) && fetched.push(r.url()));

    t.check('beside the dino', (await g.waitFor(goToDino, { timeout: 20000 })) >= 0);
    await g.key('KeyE');
    await g.waitFor(`!!document.querySelector('dialog.files-dlg')?.open`, { timeout: 5000 });

    await give(g, ENGINE);
    const engineMs = await g.waitFor(`document.querySelector('.files-needs li')?.classList.contains('done')`, {
      timeout: 10000,
    });
    t.check(
      'the engine is taken and ticked off',
      engineMs >= 0,
      await g.eval(`return document.querySelector('.files-note')?.textContent;`),
    );

    await give(g, ROM);
    const guestMs = await g.waitFor(isGuest, { timeout: 30000 });
    await g.wait(0.6);
    t.check(
      'with the ROM too, the dialog closes and you are the guest',
      guestMs >= 0,
      `${guestMs} ms; ${await g.still('guest')}`,
    );
    t.check('the dino is the engine model', await g.eval(`return ${realDino};`), await g.still('dino'));

    const a = await g.eval(pos);
    await g.key('KeyW', 1500);
    const b = await g.eval(pos);
    const moved = Math.hypot(b.x - a.x, b.z - a.z);
    t.check('holding W runs', moved > 2, `${moved.toFixed(2)} m`);

    const y0 = (await g.eval(pos)).y;
    let top = y0;
    await g.key('Space', 200);
    for (let k = 0; k < 8; k++) {
      top = Math.max(top, (await g.eval(pos)).y);
      await g.wait(0.05);
    }
    t.check(
      'Space jumps',
      top - y0 > 0.5,
      `${(top - y0).toFixed(2)} m up; ${(await g.motion('jump', { seconds: 1.5 })).sheet}`,
    );

    await g.waitFor(goToDino, { timeout: 20000 });
    await g.key('KeyE');
    const backMs = await g.waitFor(`(async () => { ${MODS} return !guest.active; })()`, { timeout: 5000 });
    t.check('talking again switches back', backMs >= 0, await g.still('back'));

    await g.page.reload();
    await g.page.waitForSelector('#enter:not([disabled])', { timeout: 60000 });
    await g.page.click('#enter');
    const keptMs = await g.waitFor(realDino, { timeout: 30000 });
    t.check('after a reload this browser still has both files', keptMs >= 0, `${keptMs} ms`);

    t.check('neither file was fetched', fetched.length === 0, fetched.join(', '));
    t.check('no page errors', g.errors.length === 0, g.errors.join(' | '));
  },
};
