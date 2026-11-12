// The pause view: a local overlay (the island keeps running, only this player's input is taken). H opens it on the
// controls, every control with keys is in the guide there; Resume is focused; held keys do nothing behind it; the room
// page shows the room and an invite button and renames you; Leave asks twice; it ends a talk and keeps one from opening; the controls tab follows the
// input; the phone's menu button clears the name tag and the connection pill.
// Pointer lock cannot be exercised headless, so Esc-from-the-lock and Resume re-locking need a real browser.
import type { T } from './run.ts';
const PAUSE = `const { openPause, closePause } = await import('/src/features/pause.ts');`;
const TALK = `const D = await import('/src/boogler/dialogue.ts');
  const open = () => D.showDialogue({ say: 'Hello', mood: 'smile', opts: ['Hi'] },
    () => {}, () => D.closeDialogue());`;
const isOpen = `document.querySelector('dialog.pause')?.open === true`;
// A real controller on this machine reaches the headless page: it turns body.gamepad on and its presses drive the view.
const NO_PAD = `navigator.getGamepads = () => []; dispatchEvent(new Event('gamepaddisconnected'));`;

export default {
  about: 'the pause view: H, focus, input held back, room page, Leave, over the talk box, pad tab, phone button',
  timeout: 420000,
  async run(t: T) {
    const room = 'sc' + Math.random().toString(36).slice(2, 8);
    const g = await t.open({ name: 'pauser', room, hud: true, size: [1280, 720] });
    await g.eval(NO_PAD);
    await g.wait(0.8);

    // 1. H opens it on the controls page; every keyed control is in it. H again closes.
    await g.key('KeyH');
    await g.wait(0.5);
    const kbm = await g.eval(`const { listControls } = await import('/src/player/controls.ts');
      const dlg = document.querySelector('dialog.pause');
      const shown = [...dlg.querySelectorAll('[data-id]')].map((e) => e.dataset.id);
      const want = listControls().filter((c) => c.keys?.length).map((c) => c.id);
      const r = dlg.querySelector('.pause-card').getBoundingClientRect();
      return { open: dlg.open, page: dlg.querySelector('.pause-card').dataset.page, tab: dlg.querySelector('[aria-selected=true]')?.dataset.tab,
        missing: want.filter((id) => !shown.includes(id)), n: shown.length,
        fits: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };`);
    const kbmShot = await g.still('controls');
    t.check(
      'H opens the pause view on the keyboard controls, with every keyed control',
      kbm.open && kbm.page === 'controls' && kbm.tab === 'kbm' && kbm.n > 10 && kbm.missing.length === 0 && kbm.fits,
      `${JSON.stringify(kbm)}; ${kbmShot}`,
    );
    await g.key('KeyH');
    await g.wait(0.3);
    t.check('H closes it again', !(await g.eval(`return ${isOpen};`)));

    // 2. Opened by openPause('options'): Resume is focused, held keys do nothing behind it, T does not honk.
    await g.eval(`${PAUSE} openPause('options');`);
    await g.wait(0.5);
    const focus = await g.eval(`return document.activeElement?.dataset.act ?? document.activeElement?.tagName;`);
    await g.eval(`const { net } = await import('/src/netplay/net.ts'); window.__sent = [];
      if (net.room) { const o = net.room.send.bind(net.room); net.room.send = (m, ...a) => (window.__sent.push(m), o(m, ...a)); }`);
    const p0 = await g.eval(`const p = window.boogle.me.body.position; return [p.x, p.z];`);
    await g.down('KeyW');
    await g.wait(0.5);
    const mid = await g.eval(`const { input } = await import('/src/player/input.ts'); return [...input.keys];`);
    await g.up('KeyW');
    await g.key('KeyT');
    await g.wait(0.2);
    const p1 = await g.eval(`const p = window.boogle.me.body.position; return [p.x, p.z];`);
    const sent = await g.eval(`return window.__sent.filter((m) => m?.t === 'honk').length;`);
    const mainShot = await g.still('main');
    t.check('Resume is focused when it opens', focus === 'resume', String(focus));
    t.check(
      'holding W behind it moves nothing and leaves input.keys empty',
      Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 0.05 && mid.length === 0,
      `${JSON.stringify({ p0, p1, mid })}; ${mainShot}`,
    );
    t.check('T does not honk behind it', sent === 0, `${sent} honks sent`);

    // 3. The room page.
    await g.eval(`document.querySelector('[data-act=room]').click();`);
    await g.wait(0.3);
    const rm = await g.eval(`const dlg = document.querySelector('dialog.pause');
      return { title: dlg.querySelector('.pause-title').textContent, copy: !!dlg.querySelector('[data-act=copy]'),
        people: [...dlg.querySelectorAll('.pause-name')].map((e) => e.textContent) };`);
    const roomShot = await g.still('room');
    t.check(
      'the room page shows the room name, who is here and Copy invite link',
      rm.title === room && rm.copy && rm.people.includes('pauser'),
      `${JSON.stringify(rm)}; ${roomShot}`,
    );
    // 3b. You: the Room page renames you, the You page (the start page) recolours you; both saved for next time.
    await g.page.fill('.pause-you-edit input', 'Renamed');
    await g.eval(`const { pauseNavigation } = await import('/src/player/pause-pages.ts'); pauseNavigation.open('you');`);
    await g.wait(0.3);
    await g.eval(`document.querySelector('.you-colour .pause-swatch[data-color="3"]').click();`);
    await g.wait(0.3);
    const you = await g.eval(`return { name: window.boogle.me.name, color: window.boogle.me.colorIdx,
      saved: [localStorage.getItem('boogle.name'), localStorage.getItem('boogle.color')] };`);
    t.check(
      'the Room page renames you and the You page recolours you, saved for next time',
      you.name === 'Renamed' && you.color === 3 && you.saved[0] === 'Renamed' && you.saved[1] === '3',
      JSON.stringify(you),
    );
    await g.eval(`const { pauseNavigation } = await import('/src/player/pause-pages.ts'); pauseNavigation.open('room');`);
    await g.wait(0.3);
    await g.page.fill('.pause-you-edit input', 'pauser');
    await g.eval(`document.activeElement?.blur(); document.querySelector('[data-act=back]').focus();`);
    await g.key('Escape');
    await g.wait(0.3);
    t.check(
      'Esc on a sub-page goes back to the main page',
      (await g.eval(`return document.querySelector('.pause-card').dataset.page;`)) === 'options',
    );

    // 4. Leave asks first (do not press twice: it reloads).
    await g.eval(`document.querySelector('[data-act=leave]').click();`);
    const leave = await g.eval(`return document.querySelector('[data-act=leave]').textContent;`);
    t.check('the first Leave press asks "Leave the island?"', leave === 'Leave the island?', leave);

    // 4b. Fullscreen: a real click toggles it. (The refused path, a gamepad press, can't be tested: page.evaluate is a
    // user gesture to Playwright.)
    const fsText = `return { text: document.querySelector('[data-act=fullscreen]')?.getAttribute('aria-label'), on: !!document.fullscreenElement };`;
    await g.page.click('[data-act=fullscreen]');
    await g.waitFor(`!!document.fullscreenElement`, { timeout: 3000 }).catch(() => -1);
    await g.wait(0.2);
    const fsOn = await g.eval(fsText);
    await g.page.click('[data-act=fullscreen]');
    await g.waitFor(`!document.fullscreenElement`, { timeout: 3000 }).catch(() => -1);
    await g.wait(0.2);
    const fsOff = await g.eval(fsText);
    t.check(
      'Fullscreen toggles the page in and out and the pause view stays open',
      fsOn.on &&
        fsOn.text === 'Exit fullscreen' &&
        !fsOff.on &&
        fsOff.text === 'Fullscreen' &&
        (await g.eval(`return ${isOpen};`)),
      JSON.stringify({ fsOn, fsOff }),
    );
    await g.eval(`document.querySelector('[data-act=resume]').click();`);
    await g.wait(0.3);
    t.check('Resume closes it', !(await g.eval(`return ${isOpen};`)));
    const keysAfter = await g.eval(`const { modalOpen } = await import('/src/player/modal.ts'); return modalOpen();`);
    t.check('and hands the input back', keysAfter === false);

    // 5. The talk box is not a modal: the pause view opens over it and ends the talk; it never opens over the pause view.
    await g.eval(`${TALK} open();`);
    await g.wait(0.3);
    await g.eval(`${PAUSE} openPause('options');`);
    await g.wait(0.3);
    t.check(
      'with the talk box open, openPause() opens the pause view and ends the talk',
      (await g.eval(`return ${isOpen};`)) && (await g.eval(`return document.querySelector('.bd').hidden;`)),
    );
    await g.eval(`${PAUSE} closePause();`);
    await g.eval(`${TALK} open();`);
    await g.wait(0.3);
    await g.key('KeyH');
    await g.wait(0.3);
    t.check(
      'and so does H',
      (await g.eval(`return ${isOpen};`)) && (await g.eval(`return document.querySelector('.bd').hidden;`)),
    );
    await g.eval(`${PAUSE} closePause();`);
    await g.eval(`${PAUSE} openPause('options');`);
    await g.wait(0.3);
    await g.eval(`${TALK} open();`);
    await g.wait(0.3);
    const noTalk = await g.eval(`const D = await import('/src/boogler/dialogue.ts');
      return { pause: ${isOpen}, talk: D.dialogue.open };`);
    t.check(
      'with the pause view open, the talk box does not open',
      noTalk.pause && !noTalk.talk,
      JSON.stringify(noTalk),
    );
    await g.eval(`${PAUSE} closePause();`);

    // 6. A gamepad in use: the controls tab defaults to Gamepad, the pad drives the view.
    await g.eval(`document.body.classList.add('gamepad');`);
    await g.eval(`const { actionById } = await import('/src/player/controls.ts'); actionById('pause').down();`);
    await g.wait(0.4);
    // The menu opens on You (the start page); RB on the pad goes on to Options.
    await g.eval(`const { padModal } = await import('/src/player/controls.ts'); padModal()('rb');`);
    await g.wait(0.3);
    await g.eval(`document.querySelector('[data-act=controls]').click();`);
    await g.wait(0.3);
    const pad = await g.eval(`const { listControls } = await import('/src/player/controls.ts');
      const dlg = document.querySelector('dialog.pause');
      const shown = [...dlg.querySelectorAll('[data-id]')].map((e) => e.dataset.id);
      return { tab: dlg.querySelector('[aria-selected=true]')?.dataset.tab, n: shown.length,
        pause: shown.includes('pause') };`);
    const padShot = await g.still('pad');
    t.check(
      'on a gamepad the controls tab defaults to Gamepad',
      pad.tab === 'pad' && pad.n > 10,
      `${JSON.stringify(pad)}; ${padShot}`,
    );
    const padNav = await g.eval(`const { padModal } = await import('/src/player/controls.ts');
      const press = padModal(); press('right'); const tab = document.querySelector('[aria-selected=true]').dataset.tab;
      press('b'); const page = document.querySelector('.pause-card').dataset.page;
      press('menu'); return { tab, page, open: document.querySelector('dialog.pause').open };`);
    t.check(
      'pad: right switches tab, B goes back, Menu resumes',
      padNav.tab === 'touch' && padNav.page === 'options' && !padNav.open,
      JSON.stringify(padNav),
    );
    await g.eval(`document.body.classList.remove('gamepad');`);

    // 6b. A pad left connected: a key or a mouse click hands back to keyboard and mouse, the next press to the pad.
    await g.eval(`const pad = { id: 'Test pad', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
      window.__pad = pad; navigator.getGamepads = () => [pad];
      dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pad }));`);
    const padOn = `document.body.classList.contains('gamepad')`;
    const press = (on: boolean) => g.eval(`window.__pad.buttons[2].pressed = ${on};`);
    const modes: Record<string, boolean> = { connected: await g.eval(`return ${padOn};`) };
    await g.key('KeyJ');
    await g.wait(0.2);
    modes.key = await g.eval(`return ${padOn};`);
    await press(true);
    await g.wait(0.3);
    modes.press = await g.eval(`return ${padOn};`);
    await g.key('KeyJ'); // iPadOS can send a key for a pad press: the press keeps the pad
    await g.wait(0.2);
    modes.keyDuringPress = await g.eval(`return ${padOn};`);
    await press(false);
    await g.wait(0.3);
    await g.page.mouse.click(640, 360);
    await g.wait(0.2);
    modes.click = await g.eval(`return ${padOn};`);
    await g.key('KeyH');
    await g.wait(0.4);
    const padLeft = await g.eval(`return document.querySelector('dialog.pause [aria-selected=true]')?.dataset.tab;`);
    t.check(
      'with a pad connected, a key or a mouse click switches to keyboard and H opens the Keyboard tab',
      modes.connected && !modes.key && modes.press && modes.keyDuringPress && !modes.click && padLeft === 'kbm',
      JSON.stringify({ ...modes, padLeft }),
    );

    await g.ctx.close(); // fewer live pages keeps the software renderer quick

    // 7. A phone: the menu button clears the name tag and the connection pill; both pages fit.
    const phone = await t.open({ name: 'phone', hud: true, touch: true, size: [390, 844] });
    await phone.eval(NO_PAD);
    await phone.wait(0.8);
    await phone.eval(`const I = await import('/src/player/inventory.ts'); I.take('frisbee');`);
    await phone.wait(0.5);
    const lay = await phone.eval(`
      const r = (s) => { const e = document.querySelector(s); if (!e || !e.isConnected) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
      const hit = (a, b) => !!a && !!b && !(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t);
      const btn = r('.menu-btn'), net = r('.net'), tl = r('.hud-tl');
      // the connection pill and the roster live in the pause view now (src/features/pause.ts), not on the HUD
      return { btn, net, tl, size: [btn.w, btn.h], pillOnHud: !!net,
        hitsPill: hit(btn, net), hitsTag: hit(btn, r('.held-name')), hitsTL: hit(btn, tl),
        inView: btn.l >= 0 && btn.r <= innerWidth && btn.t >= 0 };`);
    const phoneShot = await phone.still('hud');
    t.check(
      'on a phone the menu button is 44px, on screen, and clear of the name tag and roster (the pill lives in the pause view)',
      lay.size[0] >= 44 && lay.size[1] >= 44 && lay.inView && !lay.pillOnHud && !lay.hitsPill && !lay.hitsTag && !lay.hitsTL,
      `${JSON.stringify(lay)}; ${phoneShot}`,
    );
    await phone.eval(`document.querySelector('.menu-btn').click();`);
    await phone.wait(0.5);
    const ph = await phone.eval(`const c = document.querySelector('.pause-card').getBoundingClientRect();
      return { open: document.querySelector('dialog.pause').open, fits: c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight };`);
    const phoneMain = await phone.still('main');
    await phone.eval(`document.querySelector('.you-options').click();`); // You is the start page; Options is one tap on
    await phone.wait(0.3);
    await phone.eval(`document.querySelector('[data-act=controls]').click();`);
    await phone.wait(0.4);
    const pc = await phone.eval(`const c = document.querySelector('.pause-card').getBoundingClientRect();
      const g = document.querySelector('.pause-guide');
      return { box: [c.left, c.top, c.right, c.bottom].map(Math.round), tab: document.querySelector('[aria-selected=true]')?.dataset.tab, fits: c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight,
        scrolls: g.scrollHeight > g.clientHeight, back: !!document.querySelector('[data-act=back]') };`);
    const phoneCtl = await phone.still('controls');
    t.check(
      'the phone menu opens; main and controls pages fit the screen',
      ph.open && ph.fits && pc.tab === 'touch' && pc.fits && pc.back,
      `${JSON.stringify({ ph, pc })}; ${phoneMain}; ${phoneCtl}`,
    );
  },
};
