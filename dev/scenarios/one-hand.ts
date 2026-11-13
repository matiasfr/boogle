// One thing in your hands: a new player starts empty-handed; something new knocks the beach ball out of your hand; The
// Boogler takes what you hold; a bag of seeds sprouts mushrooms. On a phone the live game offers no throw,
// and the name tag clears the HUD. Classic shared gifts were retired in server-owned-state step 5.
import { TP, INV, lowResOnCi } from './lib/world.ts';
import type { T } from './run.ts';

const AIM = (yaw: number | string, pitch: number | string = 0) =>
  `const { cam } = await import('/src/player/player.ts'); cam.yaw = ${yaw}; cam.pitch = ${pitch}; window.boogle.me.yaw = ${yaw};`;
// Page-side helpers for the touch checks: shown(sel) (laid out, so hidden ancestors count), rect(sel), the main
// button's label, and whether it throws. when(cond) wraps them into an expression for waitFor.
const DOM = `
  const shown = (s) => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; };
  const rect = (s) => document.querySelector(s).getBoundingClientRect();
  const label = () => document.getElementById('btn-grab').textContent;
  const throws = () => document.body.classList.contains('main-throws');`;
const when = (cond: string) => `(() => { ${DOM} return ${cond}; })()`;
// The touch HUD stays clear: the name tag overlaps none of the brand and roster, the net pill, or a touch button on screen.
const LAYOUT = `${DOM}
  const bar = rect('.held-name');
  const hits = (r) => !(bar.right <= r.left || r.right <= bar.left || bar.bottom <= r.top || r.bottom <= bar.top);
  const others = ['.hud-tl', '.hud-tr', '.stick', ...[...document.querySelectorAll('#touch .tbtn')].map((b) =>
    '.' + [...b.classList].join('.'))].filter(shown);
  const hit = others.filter((s) => hits(rect(s)));
  return { bar: [bar.left, bar.top, bar.right, bar.bottom].map(Math.round), checked: others.length, hit };`;

export default {
  island: true, // the classic island by the court (run.ts)
  about: 'hold and give what you pick up; plant anywhere; the phone HUD offers no throw',
  timeout: 800000, // two software-rendered players in a row; the nightly runner took over 450 s, with checks timing out
  async run(t: T) {
    const g = await t.open({ name: 'holder', hud: 'play' });
    await lowResOnCi(g);
    const consoleErrors: string[] = [];
    g.page.on('console', (m) => m.type() === 'error' && m.text().includes('[world]') && consoleErrors.push(m.text()));
    const start = await g.eval(`${INV} return I.heldId();`);
    t.check('a new player starts empty-handed', start === null, JSON.stringify(start));
    t.check(
      'the digit keys that changed slots do nothing',
      await g.eval(`${INV}
        I.take('seeds');
        dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2' }));
        dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit2' }));
        const kept = I.heldId() === 'seeds';
        I.emptyHand();
        return kept;`),
    );

    // The ball: grab it, it is in your hand; pick up something else and it flies off, out of your hands and your claim.
    const ball = await g.eval(`${INV}
      const { ball } = await import('/src/entities/ball/state.ts');
      const { teleport } = await import('/src/physics/engine.ts');
      const { boogler } = await import('/src/boogler/boogler.ts');
      const { groundHeight } = await import('/src/island/terrain.ts');
      const p = window.boogle.me.body.position;
      if (!ball.mine) return { err: 'not mine' };
      // The Boogler wanders: if he is close, E would pick Talk over the ball. Step 8 m away from him first.
      const c = boogler.center, dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
      if (d < 6) {
        const x = c.x + (dx / (d || 1)) * 8, z = c.z + (dz / (d || 1)) * 8;
        teleport(window.boogle.me.body, x, groundHeight(x, z) + 0.6, z);
      }
      teleport(ball.body, p.x + 0.6, p.y + 0.5, p.z - 0.6); ball.pose.p.set(p.x + 0.6, p.y + 0.5, p.z - 0.6);
      H.interactDown(); H.interactUp();
      const inHand = I.heldId() === 'ball' && ball.mine && ball.held;
      I.take('frisbee');
      const gone = !ball.held && I.heldId() === 'frisbee';
      I.emptyHand();
      return { inHand, gone };`);
    t.check(
      'the ball is in your hand, and something new knocks it out',
      ball.inHand && ball.gone,
      JSON.stringify(ball),
    );

    // The Boogler takes a frisbee from your hand.
    const bog = await g.eval(`return { x: window.boogle.boogler.disp.x, z: window.boogle.boogler.disp.z };`);
    await g.eval(TP(bog.x + 1.5, bog.z));
    await g.wait(0.3);
    // Answers only show once his line has finished typing; wait for them, then for his reply.
    const talk = await g.eval(`${INV}
      const play = await import('/src/boogler/play.ts');
      const { closeDialogue } = await import('/src/boogler/dialogue.ts');
      const nap = () => new Promise((r) => setTimeout(r, 100));
      const pick = async (text) => {
        for (let k = 0; k < 100; k++) {
          const b = [...document.querySelectorAll('.bd button')].find((b) => b.textContent.includes(text));
          if (b && !b.parentElement.hidden) return b.click(), true;
          await nap();
        }
        return false;
      };
      const says = async (text) => {
        for (let k = 0; k < 100 && !document.querySelector('.bd')?.textContent.includes(text); k++) await nap();
        return document.querySelector('.bd')?.textContent.includes(text);
      };
      I.take('frisbee');
      play.booglerTalk();
      const offeredFrisbee = await pick('a frisbee');
      await says('monopoly');
      return { offeredFrisbee, frisbeeGone: I.heldId() !== 'frisbee' };`);
    t.check(
      'The Boogler takes the frisbee from your hand',
      talk.offeredFrisbee && talk.frisbeeGone,
      JSON.stringify(talk),
    );
    await g.eval(`(await import('/src/boogler/dialogue.ts')).closeDialogue();`);

    // A bag of seeds: using it sprouts mushrooms ahead of you, spends the bag, and they end up solid.
    await g.eval(`${INV} I.take('seeds'); ${TP(-30, 30)} ${AIM(0)}`);
    await g.wait(0.4);
    const sprouted = await g.eval(`${INV}
      const M = await import('/src/adapters/mushrooms.ts');
      const spots = M.spotsAhead();
      H.useDown(); H.useUp();
      return { spots: spots.length / 2, kept: I.heldId() === 'seeds' };`);
    t.check('a bag sprouts mushrooms and is spent', sprouted.spots > 0 && !sprouted.kept, JSON.stringify(sprouted));

    t.check('no failed edits ([world] console errors)', !consoleErrors.length, consoleErrors.join(' | '));

    // ------------------------------------------------------------ on a phone, portrait
    const thumb = await t.open({ name: 'thumb', hud: true, touch: true, size: [390, 844] });
    await lowResOnCi(thumb);
    const one = await thumb.waitFor(
      when(`!!document.querySelector('.held') && !document.querySelector('.held-name').textContent`),
    );
    t.check('on touch a new player has an empty name tag', one >= 0, `${one} ms`);

    await thumb.eval(`${INV} ${TP(14, 24)}`);
    await thumb.eval(`${INV} I.take('frisbee');`);
    // The live game offers no throw until replication R3 (owner, 9 November): no Throw on the main button, no Toss.
    const frisbee = await thumb.waitFor(when(`label() !== 'Throw' && !throws() && !shown('.tbtn.toss')`));
    const away = await thumb.eval(`${INV} return H.interactTarget()?.id ?? null;`);
    t.check(
      'holding a frisbee in the live game: no Throw on the main button, and no Toss',
      frisbee >= 0,
      `${frisbee} ms; in reach: ${away}`,
    );

    await thumb.wait(0.4);
    const portrait = await thumb.eval(LAYOUT);
    const portraitShot = await thumb.still('touch-portrait');
    t.check(
      'portrait: the name tag clears the brand, roster, net pill and buttons',
      portrait.checked >= 4 && !portrait.hit.length,
      `${JSON.stringify(portrait)}; ${portraitShot}`,
    );

    // ------------------------------------------------------------ landscape
    await thumb.page.setViewportSize({ width: 844, height: 390 });
    await thumb.wait(0.6);
    const landscape = await thumb.eval(LAYOUT);
    const landscapeShot = await thumb.still('touch-landscape');
    t.check(
      'landscape: the name tag clears the brand, roster, net pill and buttons',
      landscape.checked >= 4 && !landscape.hit.length,
      `${JSON.stringify(landscape)}; ${landscapeShot}`,
    );
  },
};
