// The controls guide is generated from the control registry: no gaps in the registry, and the keyboard panel, the
// gamepad card and the touch list each show every control that has a binding for that input.
const LIST = `const { listControls, controlProblems } = await import('/src/controls.js');`;

export default {
  about: 'controlProblems() is empty; the help panel, pad card and touch list show every bound control',
  async run(t) {
    const g = await t.open({ name: 'guide', hud: true, size: [1280, 720] });
    await g.wait(0.6);

    const problems = await g.eval(`${LIST} return controlProblems();`);
    t.check('the control registry has no gaps', problems.length === 0, JSON.stringify(problems));

    const kbm = await g.eval(`${LIST}
      const shown = [...document.querySelectorAll('#help [data-id]')].map((e) => e.dataset.id);
      const want = listControls().filter((c) => c.keys?.length).map((c) => c.id);
      const box = document.getElementById('help').getBoundingClientRect();
      const bar = document.querySelector('.hotbar-slots').getBoundingClientRect();
      return { missing: want.filter((id) => !shown.includes(id)), n: shown.length,
        visible: box.height > 0, overlap: box.right > bar.left && box.bottom > bar.top && box.top < bar.bottom };`);
    const kbmShot = await g.still('help');
    t.check(
      'every control with keys is in the help panel',
      kbm.visible && kbm.n > 10 && kbm.missing.length === 0,
      `${JSON.stringify(kbm)}; ${kbmShot}`,
    );
    t.check('the help panel does not cover the hotbar', !kbm.overlap, JSON.stringify(kbm));

    await g.eval(`document.body.classList.add('gamepad');`);
    await g.eval(`
      const { actionById } = await import('/src/controls.js');
      actionById('pad-help').down();`);
    await g.wait(0.4);
    const pad = await g.eval(`${LIST}
      const card = document.querySelector('.pad-card');
      const shown = [...card.querySelectorAll('[data-id]')].map((e) => e.dataset.id);
      // a context row on the same button as an earlier row of its group (Toss is X, like Use) is left out
      const want = listControls().filter((c) => [c.pad].flat().filter(Boolean).length && c.id !== 'toss').map((c) => c.id);
      const r = card.getBoundingClientRect();
      return { missing: want.filter((id) => !shown.includes(id)), n: shown.length, hidden: card.hidden,
        fits: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };`);
    const padShot = await g.still('pad');
    t.check(
      'every control with a pad binding is on the gamepad card',
      !pad.hidden && pad.n > 10 && pad.missing.length === 0 && pad.fits,
      `${JSON.stringify(pad)}; ${padShot}`,
    );
    await g.eval(`document.body.classList.remove('gamepad');`);

    const phone = await t.open({ name: 'phone', hud: true, touch: true, size: [390, 844] });
    await phone.wait(0.6);
    const touch = await phone.eval(`${LIST}
      const { renderGuide } = await import('/src/guide.js');
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
