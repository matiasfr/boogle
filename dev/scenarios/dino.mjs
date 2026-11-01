// The dino by the wine cellar, without the files the guest needs: he has a Talk prompt, nothing is fetched until you talk
// to him, talking fetches the hosted engine once (stubbed here as gone, so CI never reaches the host) and opens the
// files dialog with the engine and the ROM unticked, a wrong engine and a wrong ROM are each refused with a reason,
// and Esc closes it.
import { TP } from './lib/world.mjs';

const DINO = `(await import('/src/guest/dino.js')).dino`;
const near = `(async () => {
  const dino = ${DINO};
  ${TP('dino.pos.x + 1.4', 'dino.pos.z')}
  const { cam } = await import('/src/player/player.ts');
  cam.yaw = Math.atan2(1.4, 0); cam.pitch = -0.2;
  await new Promise((r) => setTimeout(r, 150));
  const { interactTarget } = await import('/src/player/hands.ts');
  return interactTarget()?.id === 'dino';
})()`;
const dlgOpen = `!!document.querySelector('dialog.files-dlg')?.open`;
const note = `document.querySelector('.files-note')?.textContent ?? ''`;
// Drops a made-up file on the page, as a player dragging it in would.
const drop = (name, bytes) => `
  const dt = new DataTransfer();
  dt.items.add(new File([new Uint8Array(${JSON.stringify(bytes)})], '${name}'));
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));`;

export default {
  about: 'the dino talks, fetches the hosted engine only when asked, falls back to asking for it, refuses wrong files',
  async run(t) {
    const g = await t.open({ name: 'visitor', hud: 'play' });
    const wasm = [];
    g.page.on('request', (r) => new URL(r.url()).pathname.endsWith('.wasm') && wasm.push(r.url()));
    await g.page.route('https://dl.dropboxusercontent.com/**', (r) => r.fulfill({ status: 404, body: '' }));

    const ms = await g.waitFor(near, { timeout: 20000 });
    await g.wait(0.4);
    t.check('beside the dino, E would talk to him', ms >= 0, `${ms} ms; ${await g.still('near')}`);

    t.check('no engine is fetched before talking to him', wasm.length === 0, wasm.join(', '));
    await g.key('KeyE');
    const opened = await g.waitFor(dlgOpen, { timeout: 5000 });
    const items = await g.eval(
      `return [...document.querySelectorAll('.files-needs li')].map((li) => [li.textContent, li.classList.contains('done')]);`,
    );
    t.check(
      'with the hosted engine gone, talking opens the files dialog with the engine and the ROM unticked',
      opened >= 0 && items.length === 2 && items.every(([, done]) => !done),
      JSON.stringify(items),
    );

    await g.eval(drop('engine.wasm', [0, 0x61, 0x73, 0x6d, 1, 0, 0, 0])); // a valid, empty module
    const noEngine = await g.waitFor(`(${note}).includes('engine')`, { timeout: 5000 });
    t.check('an engine without the entry points is refused', noEngine >= 0, await g.eval(`return ${note};`));

    await g.eval(drop('game.z64', [0x80, 0x37, 0x12, 0x40, 0, 0, 0, 0]));
    const noRom = await g.waitFor(`(${note}).includes('ROM')`, { timeout: 5000 });
    t.check(
      'a ROM that is not the one is refused',
      noRom >= 0,
      `${await g.eval(`return ${note};`)}; ${await g.still('dialog')}`,
    );

    await g.key('Escape');
    const closed = await g.waitFor(`!(${dlgOpen})`, { timeout: 5000 });
    t.check('Esc closes the dialog', closed >= 0);

    t.check('talking fetched the hosted engine once', wasm.length === 1, wasm.join(', '));
    t.check('no page errors', g.errors.length === 0, g.errors.join(' | '));
  },
};
