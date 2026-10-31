// The loading screen: it is up before the game has drawn anything, its bar only moves forward while the shaders
// build, and it is gone (and lets clicks through) once Jump in is enabled. Phone sizes keep the title and bar on screen.
export default {
  about: 'the loading screen shows, fills, and gets out of the way when the island is ready',
  timeout: 300000,
  async run(t) {
    const g = await t.open({ name: 'host', hud: true });
    const url = g.page.url();
    for (const [id, size] of [
      ['laptop', [1280, 720]],
      ['phone', [390, 844]],
    ]) {
      const p = await g.ctx.newPage();
      await p.setViewportSize({ width: size[0], height: size[1] });
      await p.goto(url);
      await p.waitForSelector('.splash-art.in', { timeout: 20000 }).catch(() => {});
      const seen = [];
      const sample = () =>
        p.evaluate(() => {
          const s = document.querySelector('.splash');
          if (!s) return null;
          const box = (q) => {
            const b = s.querySelector(q).getBoundingClientRect();
            return b.top >= 0 && b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight;
          };
          return { v: Number(s.getAttribute('aria-valuenow')), title: box('.splash-title'), bar: box('.splash-bar') };
        });
      const first = await sample();
      const shot = `${g.out}/${id}-loading.png`;
      await p.screenshot({ path: shot });
      t.check(
        `${id}: the loading screen is up first, title and bar on screen`,
        !!first && first.title && first.bar,
        `${JSON.stringify(first)}; ${shot}`,
      );
      for (let s = await sample(); s; s = await sample()) {
        seen.push(s.v);
        if (await p.$('#enter:not([disabled])')) break;
        await p.waitForTimeout(250);
      }
      t.check(
        `${id}: the bar only moves forward`,
        seen.every((v, i) => !i || v >= seen[i - 1]),
        seen.join(' '),
      );
      await p.waitForSelector('#enter:not([disabled])', { timeout: 180000 });
      const gone = await p
        .waitForFunction(() => document.querySelector('.splash')?.classList.contains('gone') ?? true, null, {
          timeout: 3000,
        })
        .then(
          () => true,
          () => false,
        );
      t.check(`${id}: once Jump in is ready the loading screen is fading out (and lets clicks through)`, gone);
      await p.close();
    }
  },
};
