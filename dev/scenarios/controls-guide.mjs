// The controls guide is generated from the control registry: no gaps in the registry, and the pause view's keyboard and
// gamepad tabs and the touch list each show every control that has a binding for that input; the gamepad diagram has a
// callout per slot for each pad brand and with no pad, at iPad size.
const LIST = `const { listControls, controlProblems } = await import('/src/player/controls.ts');`;

export default {
  about:
    'controlProblems() is empty; the pause view keyboard and gamepad tabs and the touch list show every bound control; the pad diagram per brand',
  async run(t) {
    const g = await t.open({ name: 'guide', hud: true, size: [1280, 720] });
    await g.wait(0.6);

    const problems = await g.eval(`${LIST} return controlProblems();`);
    t.check('the control registry has no gaps', problems.length === 0, JSON.stringify(problems));

    // The guide lives in the pause view (src/features/pause.ts): the keyboard tab, then the gamepad tab.
    const SHOWN = `${LIST}
      const { openPause, closePause } = await import('/src/features/pause.ts');`;
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
    // The Gamepad tab opens on the drawn controller; "Show as a list" gives the list, with every pad control.
    await g.eval(`${SHOWN} closePause(); document.body.classList.add('gamepad'); openPause('controls');
      document.querySelector('[data-act=pad-view]').click();`);
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
      'every control with a pad binding is in the gamepad list',
      pad.tab === 'pad' && pad.n > 10 && pad.missing.length === 0 && pad.fits,
      `${JSON.stringify(pad)}; ${padShot}`,
    );
    await g.eval(`${SHOWN} closePause(); document.body.classList.remove('gamepad');`);

    // The diagram at iPad size (1194x834), for each brand and with no pad: a callout per slot and stick, every
    // context-free pad control in it, free slots dimmed, every leader line drawn, no horizontal scroll.
    await g.page.setViewportSize({ width: 1194, height: 834 });
    const DIAGRAM = `${LIST}
      const dlg = document.querySelector('dialog.pause');
      const d = dlg.querySelector('.pad-diagram');
      const calls = [...d.querySelectorAll('.pd-call')];
      const ids = calls.map((e) => e.dataset.id).filter(Boolean);
      const want = listControls().filter((c) => [c.pad].flat().filter(Boolean).length && !c.context).map((c) => c.id);
      const free = calls.filter((e) => e.classList.contains('pd-free')).map((e) => e.dataset.slot);
      const r = dlg.querySelector('.pause-card').getBoundingClientRect();
      const guide = dlg.querySelector('.pause-guide');
      const tiny = calls.filter((e) => parseFloat(getComputedStyle(e.querySelector('.pd-label')).fontSize) < 15).length;
      return { context: d.dataset.context, brand: d.dataset.brand, calls: calls.length, missing: want.filter((id) => !ids.includes(id)),
        free, lines: d.querySelectorAll('.pd-line').length, hot: d.querySelectorAll('.pd-hot').length, tiny,
        hscroll: guide.scrollWidth > guide.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth,
        fits: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };`;
    for (const brand of ['xbox', 'ps', 'nintendo', '']) {
      await g.eval(`${SHOWN} closePause();
        if (${JSON.stringify(brand)}) { document.body.dataset.pad = ${JSON.stringify(brand)}; document.body.classList.add('gamepad'); }
        else { delete document.body.dataset.pad; document.body.classList.remove('gamepad'); }
        openPause('controls'); document.querySelector('[data-tab=pad]').click();
        if (document.querySelector('[data-act=pad-view]').textContent !== 'Show as a list') document.querySelector('[data-act=pad-view]').click();`);
      await g.wait(0.5);
      const dg = await g.eval(DIAGRAM);
      const shot = await g.still(`diagram-${brand || 'none'}`);
      t.check(
        `the ${brand || 'no-pad'} diagram has a callout and a line per control, every pad control, free slots dimmed`,
        dg.calls === 18 &&
          dg.lines === 18 &&
          dg.missing.length === 0 &&
          dg.free.length >= 1 &&
          dg.hot === 0 &&
          dg.brand === (brand || 'generic') &&
          !dg.hscroll &&
          dg.fits &&
          dg.tiny === 0,
        `${JSON.stringify(dg)}; ${shot}`,
      );
    }
    // Talking: the talk buttons are marked; LB / RB on the pad cycle the situations.
    await g.eval(`${SHOWN} closePause(); document.body.dataset.pad = 'xbox'; document.body.classList.add('gamepad'); openPause('controls');
      const { padModal } = await import('/src/player/controls.ts'); const press = padModal();
      press('rb'); if (document.querySelector('.pad-diagram').dataset.context !== 'talking') press('rb');`);
    await g.wait(0.4);
    const talk = await g.eval(`${DIAGRAM}`);
    const hot = await g.eval(
      `return [...document.querySelectorAll('.pd-hot')].map((e) => e.dataset.slot + ':' + e.textContent);`,
    );
    const talkShot = await g.still('diagram-talking');
    t.check(
      'RB cycles to the Talking set: confirm, X, back, the stick and the D-pad are marked',
      talk.context === 'talking' && talk.hot === 6 && talk.calls === 18 && !talk.hscroll,
      `${JSON.stringify({ talk, hot })}; ${talkShot}`,
    );
    await g.eval(`${SHOWN} closePause(); document.body.classList.remove('gamepad'); delete document.body.dataset.pad;`);
    await g.page.setViewportSize({ width: 1280, height: 720 });

    await g.ctx.close();

    // With the soapbox (?proto=soapbox) there is a Driving set: steer on the left stick, drift on A.
    const car = await t.open({ name: 'driver', hud: true, size: [1194, 834], query: 'proto=soapbox' });
    await car.waitFor(`!!(await import('/src/player/controls.ts')).controlById('soapbox-steer')`, { timeout: 20000 });
    await car.eval(`${SHOWN} document.body.dataset.pad = 'ps'; document.body.classList.add('gamepad'); openPause('controls');
      document.querySelector('[data-ctx=driving]')?.click();`);
    await car.wait(0.5);
    const drive = await car.eval(DIAGRAM);
    const driveHot = await car.eval(`return [...document.querySelectorAll('.pd-hot')].map((e) => e.dataset.id);`);
    const driveShot = await car.still('diagram-driving');
    t.check(
      'with the soapbox, the Driving set marks steer and drift',
      drive.context === 'driving' &&
        driveHot.includes('soapbox-steer') &&
        driveHot.includes('soapbox-drift') &&
        !drive.hscroll,
      `${JSON.stringify({ drive, driveHot })}; ${driveShot}`,
    );
    await car.ctx.close();

    const phone = await t.open({ name: 'phone', hud: true, touch: true, size: [390, 844] });
    await phone.wait(0.6);
    const touch = await phone.eval(`${LIST}
      const { renderGuide } = await import('/src/player/guide.ts');
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
  },
};
