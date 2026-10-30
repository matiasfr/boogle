// The controls guide is generated from the control registry: no gaps in the registry, and the pause view's keyboard and
// gamepad tabs and the touch list each show every control that has a binding for that input.
const LIST = `const { listControls, controlProblems } = await import('/src/player/controls.js');`;

export default {
  about:
    'controlProblems() is empty; the pause view keyboard and gamepad tabs and the touch list show every bound control',
  async run(t) {
    const g = await t.open({ name: 'guide', hud: true, size: [1280, 720] });
    await g.wait(0.6);

    const problems = await g.eval(`${LIST} return controlProblems();`);
    t.check('the control registry has no gaps', problems.length === 0, JSON.stringify(problems));

    // The guide lives in the pause view (src/features/pause.js): the keyboard tab, then the gamepad tab.
    const SHOWN = `${LIST}
      const { openPause } = await import('/src/features/pause.js');
      const { closePause } = await import('/src/features/pause.js');`;
    const kbm = await g.eval(`${SHOWN} openPause('controls');
      const dlg = document.querySelector('dialog.pause');
      const shown = [...dlg.querySelectorAll('[data-id]')].map((e) => e.dataset.id);
      const want = listControls().filter((c) => c.keys?.length).map((c) => c.id);
      return { missing: want.filter((id) => !shown.includes(id)), n: shown.length, tab: dlg.querySelector('[aria-selected=true]').dataset.tab };`);
    const kbmShot = await g.still('keyboard');
    t.check(
      'every control with keys is in the keyboard tab',
      kbm.tab === 'kbm' && kbm.n > 10 && kbm.missing.length === 0,
      `${JSON.stringify(kbm)}; ${kbmShot}`,
    );
    await g.eval(`${SHOWN} closePause(); document.body.classList.add('gamepad'); openPause('controls');`);
    await g.wait(0.4);
    const pad = await g.eval(`${LIST}
      const dlg = document.querySelector('dialog.pause');
      const shown = [...dlg.querySelectorAll('[data-id]')].map((e) => e.dataset.id);
      // a context row on the same button as an earlier row of its group (Toss is X, like Use) is left out
      const want = listControls().filter((c) => [c.pad].flat().filter(Boolean).length && c.id !== 'toss').map((c) => c.id);
      const r = dlg.querySelector('.pause-card').getBoundingClientRect();
      return { missing: want.filter((id) => !shown.includes(id)), n: shown.length, tab: dlg.querySelector('[aria-selected=true]').dataset.tab,
        fits: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };`);
    const padShot = await g.still('pad');
    t.check(
      'every control with a pad binding is in the gamepad tab',
      pad.tab === 'pad' && pad.n > 10 && pad.missing.length === 0 && pad.fits,
      `${JSON.stringify(pad)}; ${padShot}`,
    );
    await g.eval(`${SHOWN} closePause(); document.body.classList.remove('gamepad');`);

    const phone = await t.open({ name: 'phone', hud: true, touch: true, size: [390, 844] });
    await phone.wait(0.6);
    const touch = await phone.eval(`${LIST}
      const { renderGuide } = await import('/src/player/guide.js');
      const el = renderGuide('touch');
      el.style.cssText = 'position:fixed;left:12px;top:90px;z-index:99;background:#fff;padding:12px;border-radius:14px;width:300px';
      document.body.append(el);
      const shown = [...el.querySelectorAll('[data-id]')].map((e) => e.dataset.id);
      const want = listControls().filter((c) => c.touch).map((c) => c.id);
      return { missing: want.filter((id) => !shown.includes(id)), n: shown.length,
        pills: el.querySelectorAll('.g-touch').length };`);
    const touchShot = await phone.still('touch');
    t.check(
      'every control with a touch label renders as a pill',
      touch.n > 5 && touch.missing.length === 0 && touch.pills === touch.n,
      `${JSON.stringify(touch)}; ${touchShot}`,
    );
    t.check('no page errors', !g.errors.length && !phone.errors.length, [...g.errors, ...phone.errors].join(' | '));
  },
};
