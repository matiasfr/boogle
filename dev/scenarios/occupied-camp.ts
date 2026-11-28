import type { Scenario } from './run.ts';

export default {
  about: 'a returning player can reclaim footing while a friend stands on their saved Camp spot',
  sourceImports: true,
  timeout: 150000,
  async run(t) {
    const room = 'occupied-camp-' + Math.random().toString(36).slice(2, 8);
    const first = await t.open({ room, name: 'First', size: [480, 320] });
    const friend = await t.open({ room, name: 'Friend', size: [480, 320] });
    const pose = 'const p = window.boogle.me.body.position; return [p.x, p.y, p.z]';
    const saved = await first.eval(pose);
    // Occupy the saved point after the old page leaves and before the new world boots.
    await first.page.route(
      '**/src/boot/index.ts*',
      async (route) => {
        await friend.eval(`const {teleport} = await import('/src/physics/engine.ts');
      teleport(window.boogle.me.body, ...${JSON.stringify(saved)});`);
        await friend.wait(1);
        await route.continue();
      },
      { times: 1 },
    );
    await first.page.reload();
    await first.page.waitForFunction(() => document.body.classList.contains('playing'));
    await first.eval(`const {returnSettle} = await import('/src/place/return-settle.ts');
      window.__pendingReturn = () => returnSettle.pending();`);
    const ready = await first.waitFor(
      '!window.__pendingReturn() && window.boogle.me.coyote > 0 && window.boogle.remotes.size > 0',
    );
    const a = (await first.eval(pose)) as number[];
    const b = (await friend.eval(pose)) as number[];
    const stoodStill = Math.hypot(b[0]! - saved[0], b[2]! - saved[2]) < 0.5;
    const clear = Math.hypot(b[0]! - a[0]!, b[2]! - a[2]!) >= 0.89;
    t.check(
      'return settles beside the stationary friend',
      ready >= 0 && stoodStill && clear,
      JSON.stringify({ saved, returning: a, resident: b, ready }),
    );
  },
} satisfies Scenario;
