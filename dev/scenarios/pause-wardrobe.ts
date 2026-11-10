// Pause's You page (src/entities/wardrobe/menu.ts): it opens first, even before you own anything; keys, a pad and
// touch taps step the rows and cross to Options and back; the camera swing waits (seated, swimming, a reveal, an alt-tab);
// the partner's page sees each change; the world's prompts are hidden behind the menu; a notch's inset leaves nothing to scroll.
// The pad is a fake Gamepad object the page's own poller reads (as dev/scenarios/pause.ts does); the seated and swimming
// states are the flags the swing reads (inputState.seated, me.swimming), not a train or the sea.
import type { T } from './run.ts';

const W = `const { wardrobe, partnerWearing } = await import('/src/entities/wardrobe/state.ts');`;
const GRANT = (ids: string) =>
  `{ ${W} for (const id of ${JSON.stringify(ids.split(','))}) if (id) wardrobe().grant(id, { wear: false }); }`;
const OWN = 'strawhat,beanie,scarf,glasses,raincoat,critter';
const PAGE = `document.querySelector('.pause-card')?.dataset.page`;
const IS_OPEN = `document.querySelector('dialog.pause')?.open === true`;
const OPEN = `const { openPause } = await import('/src/features/pause.ts'); openPause();`;
const MIRROR = `const { inspectMirror } = await import('/src/entities/wardrobe/mirror.ts'); const m = inspectMirror();`;
const NAMES = `[...document.querySelectorAll('.you-val .you-name')].map((e) => e.textContent)`;
const FOCUS = `document.activeElement?.closest?.('.you-row')?.dataset.slot ?? document.activeElement?.dataset?.act ?? document.activeElement?.className`;

// Polls page code (a function body ending in a return) for up to five seconds.
async function until(g: Awaited<ReturnType<T['open']>>, code: string) {
  for (let k = 0; k < 50; k++) {
    if (await g.eval(code)) return true;
    await g.wait(0.1);
  }
  return false;
}

export default {
  about:
    "Pause's You page: opens first even when empty; keys, pad and touch; the swing's holds; partner sees it; no prompts; a notch",
  timeout: 600000,
  async run(t: T) {
    const room = 'sw' + Math.random().toString(36).slice(2, 8);

    // 1. A new player owning nothing: Pause opens on You with every row at Nothing and no pips; Options is one press away.
    const a = await t.open({ name: 'dresser', room, hud: true, size: [1280, 720] });
    await a.eval(`navigator.getGamepads = () => []; dispatchEvent(new Event('gamepaddisconnected'));`);
    await a.wait(1);
    await a.eval(OPEN);
    await a.wait(0.8);
    const empty =
      await a.eval(`return { page: ${PAGE}, names: ${NAMES}, pips: [...document.querySelectorAll('.you-pips')].filter((e) => !e.hidden).length,
      options: !!document.querySelector('[data-act=options]'), focus: ${FOCUS} };`);
    const emptyShot = await a.still('empty-you');
    t.check(
      'owning nothing: Pause opens on You, every row reads Nothing, no pip row shows, Resume is focused',
      empty.page === 'you' &&
        empty.names.length === 4 &&
        empty.names.every((n: string) => n === 'Nothing') &&
        empty.pips === 0 &&
        empty.options &&
        empty.focus === 'resume',
      `${JSON.stringify(empty)}; ${emptyShot}`,
    );
    await a.key('Escape'); // Esc on You: Options; Esc there: back to You
    await a.wait(0.3);
    const opt = await a.eval(`return ${PAGE};`);
    await a.key('Escape');
    await a.wait(0.3);
    const back = await a.eval(`return ${PAGE};`);
    t.check(
      'Esc opens Options from You and goes back to You from there',
      opt === 'options' && back === 'you',
      `${opt} then ${back}`,
    );
    await a.eval(`document.querySelector('[data-act=resume]').click();`);

    // 2. Keys, with something to wear: Down to Hat, Right steps it, the worn hat and the row follow, a partner-bound change.
    await a.eval(`${GRANT(OWN)} ${W} wardrobe().wearOwned('beanie');`);
    await a.eval(OPEN);
    await a.wait(0.5);
    await a.key('ArrowDown');
    await a.key('ArrowRight');
    await a.wait(0.4);
    const keys = await a.eval(`${W} return { hat: wardrobe().current('hat'), names: ${NAMES}, focus: ${FOCUS} };`);
    t.check(
      'keyboard: Down then Right steps the hat from the beanie to the straw hat',
      keys.hat === 'strawhat' && keys.names[0] === 'A straw hat' && keys.focus === 'hat',
      JSON.stringify(keys),
    );
    await a.key('ArrowLeft');
    await a.key('ArrowLeft');
    await a.key('ArrowLeft'); // beanie, then Nothing, then wraps to the straw hat
    await a.wait(0.2);
    const wrap = await a.eval(`${W} return wardrobe().current('hat');`);
    t.check('keyboard: Left steps back through Nothing and wraps', wrap === 'strawhat', String(wrap));
    const pips = await a.eval(
      `return [...document.querySelectorAll('.you-row[data-slot=hat] .you-pip')].map((e) => e.className);`,
    );
    t.check(
      'pips show Nothing and what is owned only (two hats owned: three pips), the current one marked',
      pips.length === 3 &&
        pips.filter((c: string) => c.includes('worn')).length === 1 &&
        !pips.some((c: string) => c.includes('off')),
      JSON.stringify(pips),
    );
    const prompt = await a.eval(`return document.querySelector('.prompt')?.hidden !== false;`);
    t.check('no world prompt draws while Pause is open', prompt, String(prompt));

    // 3. The swing: on foot it comes in and Buddy turns; seated or swimming, it does not and the page still works.
    await a.wait(1.2);
    const swung = await a.eval(`${MIRROR} return m;`);
    t.check('on foot the swing is in and Buddy has turned', swung.weight > 0.9 && swung.turned, JSON.stringify(swung));
    await a.eval(`document.querySelector('[data-act=resume]').click();`);
    await a.eval(`const { inputState } = await import('/src/player/input-state.ts'); inputState.seated = true;`);
    await a.eval(OPEN);
    await a.wait(1.2);
    await a.key('ArrowDown');
    await a.key('ArrowRight');
    await a.wait(0.4);
    const seated = await a.eval(`${MIRROR} ${W} return { ...m, page: ${PAGE}, hat: wardrobe().current('hat') };`);
    t.check(
      'seated: no swing, no turn, and Right still changes the hat',
      seated.weight === 0 && !seated.turned && seated.page === 'you' && seated.hat !== 'strawhat',
      JSON.stringify(seated),
    );
    await a.eval(`const { inputState } = await import('/src/player/input-state.ts'); inputState.seated = false;`);
    await a.wait(1.2);
    const unseated = await a.eval(`${MIRROR} return m;`);
    t.check('standing up with the page open lets the swing start', unseated.weight > 0.9, JSON.stringify(unseated));
    await a.eval(`document.querySelector('[data-act=resume]').click();`);
    // Swimming for real: into the sea, well off the island, then back.
    await a.eval(`const { me } = await import('/src/player/player.ts'); const { groundHeight } = await import('/src/island/terrain.ts');
      const { teleport } = await import('/src/physics/engine.ts'); const { SEA } = await import('/src/constants.ts');
      const p = me.body.position; window.__land = [p.x, p.y, p.z];
      for (let r = 70; r < 600; r += 10) for (let k = 0; k < 24; k++) {
        const x = Math.cos((k / 24) * Math.PI * 2) * r, z = Math.sin((k / 24) * Math.PI * 2) * r;
        if (groundHeight(x, z) < SEA - 6) { teleport(me.body, x, SEA + 0.5, z); r = 1e9; break; }
      }`);
    await a.wait(2);
    await a.eval(OPEN);
    await a.wait(1.5);
    const swum = await a.eval(`const { me } = await import('/src/player/player.ts'); return me.swimming;`);
    const swim = await a.eval(`${MIRROR} return m;`);
    t.check(
      'swimming (in the sea): no swing, and the page is up',
      swum && swim.weight === 0 && !swim.turned,
      JSON.stringify({ swum, swim }),
    );
    await a.eval(`document.querySelector('[data-act=resume]').click();`);
    await a.eval(`const { me } = await import('/src/player/player.ts'); const { teleport } = await import('/src/physics/engine.ts');
      teleport(me.body, window.__land[0], window.__land[1] + 0.5, window.__land[2]);`);
    await a.wait(2);

    // 4. A reveal: while its card is up the swing lets go, and starts again when the card is put away.
    await a.eval(OPEN);
    await a.wait(1.2);
    const before = await a.eval(`${MIRROR} return m;`);
    await a.eval(`const { scene } = await import('/src/render/scene.ts'); let found = null;
      scene.traverse((o) => { if (!found && o.isMesh && o.geometry && o.material) found = o; });
      const { railwayYouGot } = await import('/src/entities/railway/state.ts');
      window.__got = railwayYouGot({ key: 'test-pw', name: 'A test thing', model: found.clone() });`);
    await a.wait(1.5);
    const during = await a.eval(`${MIRROR} return { ...m, got: window.__got };`);
    await a.eval(`document.querySelector('[data-act=resume]').click();`);
    await a.wait(1.5); // the card has been up long enough to dismiss
    await a.key('KeyE'); // put the card away (its capture listener takes E)
    await a.wait(1);
    await a.key('KeyE');
    await a.wait(1.5);
    await a.eval(OPEN);
    await a.wait(1.4);
    const after = await a.eval(`${MIRROR} return m;`);
    t.check(
      'a reward reveal holds the camera: the swing lets go while it is up and comes back after',
      before.weight > 0.9 && during.held && during.weight < 0.05 && after.weight > 0.9,
      JSON.stringify({ before, during, after }),
    );
    await a.eval(`document.querySelector('[data-act=resume]').click();`);

    // 5. Alt-tab: the window blurs, then Pause opens: no swing until the first change.
    await a.eval(`dispatchEvent(new Event('blur'));`);
    await a.eval(OPEN);
    await a.wait(1.2);
    const blurred = await a.eval(`${MIRROR} return m;`);
    await a.key('ArrowDown');
    await a.key('ArrowRight');
    await a.wait(1.2);
    const changed = await a.eval(`${MIRROR} return m;`);
    t.check(
      'opened by a blur: no swing until the first change, then it comes in',
      blurred.weight === 0 && !blurred.armed && changed.armed && changed.weight > 0.9,
      JSON.stringify({ blurred, changed }),
    );
    await a.eval(`document.querySelector('[data-act=resume]').click();`);
    await a.wait(0.3);

    // 6. A pad: a fake controller read by the page's own poller. Focus starts on Hat; down and right move and step; RB to
    // Options, B back, B closes, Menu opens again.
    await a.eval(`const pad = { id: 'Test pad', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
      window.__pad = pad; navigator.getGamepads = () => [pad];
      dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pad }));`);
    const tap = async (button: number) => {
      await a.eval(`window.__pad.buttons[${button}].pressed = true;`);
      await a.wait(0.25);
      await a.eval(`window.__pad.buttons[${button}].pressed = false;`);
      await a.wait(0.3);
    };
    await tap(8); // View: any press makes it a pad session
    await tap(9); // Menu opens Pause
    const padOpen = await a.eval(
      `return { open: ${IS_OPEN}, page: ${PAGE}, focus: ${FOCUS}, glyph: !!document.querySelector('.you-options .you-glyph') };`,
    );
    await tap(13); // down: Accessory
    const padDown = await a.eval(`return ${FOCUS};`);
    const accBefore = await a.eval(`${W} return wardrobe().current('accessory');`);
    await tap(15); // right
    const accAfter = await a.eval(`${W} return wardrobe().current('accessory');`);
    await tap(0); // A steps to the next
    const accA = await a.eval(`${W} return wardrobe().current('accessory');`);
    await tap(14); // left
    const accLeft = await a.eval(`${W} return wardrobe().current('accessory');`);
    await tap(5); // RB
    const padRb = await a.eval(`return ${PAGE};`);
    await tap(1); // B on Options: back to You
    const padB1 = await a.eval(`return { page: ${PAGE}, open: ${IS_OPEN} };`);
    await tap(1); // B on You closes
    const padB2 = await a.eval(`return ${IS_OPEN};`);
    t.check(
      'pad: Menu opens on You with the first row focused and the RB glyph on Options; d-pad moves rows',
      padOpen.open && padOpen.page === 'you' && padOpen.focus === 'hat' && padOpen.glyph && padDown === 'accessory',
      JSON.stringify({ padOpen, padDown }),
    );
    t.check(
      'pad: right and A step the focused slot, left steps back',
      accAfter !== accBefore && accA !== accAfter && accLeft === accAfter,
      JSON.stringify({ accBefore, accAfter, accA, accLeft }),
    );
    t.check(
      'pad: RB opens Options, B returns to You, B closes',
      padRb === 'options' && padB1.page === 'you' && padB1.open && !padB2,
      JSON.stringify({ padRb, padB1, padB2 }),
    );
    await tap(9); // Menu opens, Menu closes
    const menuOpen = await a.eval(`return ${IS_OPEN};`);
    await tap(9);
    const menuShut = await a.eval(`return ${IS_OPEN};`);
    t.check('pad: Menu opens Pause and closes it', menuOpen && !menuShut, `${menuOpen} ${menuShut}`);
    await a.eval(
      `navigator.getGamepads = () => []; document.body.classList.remove('gamepad'); dispatchEvent(new Event('gamepaddisconnected'));`,
    );

    // 7. Two players: the partner's page sees each change the first makes in the menu.
    const b = await t.open({ name: 'watcher', room, hud: true, size: [1280, 720] });
    await b.wait(1.5);
    await a.eval(`${W} wardrobe().takeOff('hat');`);
    await a.eval(OPEN);
    await a.wait(0.3);
    await a.key('ArrowDown');
    await a.key('ArrowRight'); // Nothing -> the first hat in catalog order
    const want = await a.eval(`${W} return wardrobe().current('hat');`);
    const seen = await until(
      b,
      `const { partnerWearing } = await import('/src/entities/wardrobe/state.ts'); const { remotes } = await import('/src/netplay/net.ts');
       return [...remotes.keys()].map((p) => partnerWearing(p)?.hat ?? null)[0] === ${JSON.stringify(want)};`,
    );
    t.check("two players: the partner's page sees the hat the menu just put on", !!want && seen, `hat ${want}`);
    await a.key('ArrowDown');
    await a.key('ArrowDown');
    await a.key('ArrowRight'); // Outfit
    const outfit = await a.eval(`${W} return wardrobe().current('outfit');`);
    const seenOutfit = await until(
      b,
      `const { partnerWearing } = await import('/src/entities/wardrobe/state.ts'); const { remotes } = await import('/src/netplay/net.ts');
       return [...remotes.keys()].map((p) => partnerWearing(p)?.outfit ?? null)[0] === ${JSON.stringify(outfit)};`,
    );
    t.check('two players: and the outfit', !!outfit && seenOutfit, `outfit ${outfit}`);
    await a.eval(`document.querySelector('[data-act=resume]').click();`);

    // 8. Touch, phone portrait: taps on the arrows, the value and the swatches; targets; fits.
    const p = await t.open({ name: 'phoner', room: room + 'p', hud: true, touch: true, size: [390, 844] });
    await p.eval(`navigator.getGamepads = () => [];`);
    await p.wait(1);
    await p.eval(GRANT(OWN));
    await p.page.tap('.menu-btn');
    await p.wait(0.8);
    const tp =
      await p.eval(`const box = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), t: Math.round(b.top), b: Math.round(b.bottom) }; };
      const card = box('.pause-card'); const body = document.querySelector('.pause-body');
      return { page: ${PAGE}, focus: ${FOCUS}, step: box('.you-step'), val: box('.you-val'), sw: box('.you-colour .pause-swatch'), res: box('[data-act=resume]'),
        opt: box('[data-act=options]'), card, scroll: body.scrollHeight - body.clientHeight, vh: innerHeight };`);
    const phoneShot = await p.still('phone-you');
    t.check(
      'touch: the menu button opens You with the first row focused; arrows, rows and Resume/Options are at least 44 px tall; no scroll; above the foot of the screen',
      tp.page === 'you' &&
        tp.focus === 'hat' &&
        tp.step.h >= 44 &&
        tp.step.w >= 44 &&
        tp.val.h >= 44 &&
        tp.sw.h >= 44 &&
        tp.sw.w >= 36 &&
        tp.res.h >= 44 &&
        tp.opt.h >= 44 &&
        tp.scroll <= 0 &&
        tp.card.b <= tp.vh,
      `${JSON.stringify(tp)}; ${phoneShot}`,
    );
    const h0 = await p.eval(`${W} return wardrobe().current('hat');`);
    await p.page.tap('.you-row[data-slot=hat] .you-step:last-child');
    const h1 = await p.eval(`${W} return wardrobe().current('hat');`);
    await p.page.tap('.you-row[data-slot=hat] .you-val');
    const h2 = await p.eval(`${W} return wardrobe().current('hat');`);
    await p.page.tap('.you-row[data-slot=hat] .you-step:nth-of-type(1)');
    const h3 = await p.eval(`${W} return wardrobe().current('hat');`);
    const c0 = await p.eval(`return window.boogle.me.colorIdx;`);
    const pick = (c0 + 1) % 8;
    await p.page.tap(`.you-colour .pause-swatch[data-color="${pick}"]`);
    const c1 = await p.eval(`return window.boogle.me.colorIdx;`);
    t.check(
      'touch: tapping the next arrow, the value and the previous arrow changes the hat; tapping a swatch changes the colour',
      h1 !== h0 && h2 !== h1 && h3 === h1 && c1 === pick,
      JSON.stringify({ h0, h1, h2, h3, c0, c1 }),
    );
    await p.page.tap('.you-options');
    await p.wait(0.3);
    const touchOpt = await p.eval(`return ${PAGE};`);
    await p.page.tap('[data-act=back]');
    await p.wait(0.3);
    const touchBack = await p.eval(`return ${PAGE};`);
    t.check(
      'touch: Options opens by tap and Back returns to You',
      touchOpt === 'options' && touchBack === 'you',
      `${touchOpt} ${touchBack}`,
    );
    await p.ctx.close();

    // 9. Phone landscape with a notch's insets: nothing scrolls, the card stays inside the safe area.
    const l = await t.open({ name: 'lander', room: room + 'l', hud: true, touch: true, size: [844, 390] });
    await l.wait(1);
    await l.eval(GRANT(OWN));
    await l.eval(
      `const s = document.createElement('style'); s.textContent = 'dialog.pause[open] { padding: 8px 47px 21px 47px !important; }'; document.head.append(s);`,
    );
    await l.page.tap('.menu-btn');
    await l.wait(0.8);
    const land =
      await l.eval(`const c = document.querySelector('.pause-card').getBoundingClientRect(); const body = document.querySelector('.pause-body');
      return { page: ${PAGE}, top: Math.round(c.top), bottom: Math.round(c.bottom), left: Math.round(c.left), right: Math.round(c.right), scroll: body.scrollHeight - body.clientHeight,
        prompt: document.querySelector('.prompt')?.hidden !== false };`);
    const landShot = await l.still('landscape-you');
    t.check(
      'landscape with a 21 px bottom and 47 px side inset: no scroll, the card inside the safe area, no prompt behind it',
      land.page === 'you' &&
        land.scroll <= 0 &&
        land.bottom <= 390 - 21 &&
        land.top >= 8 &&
        land.right <= 844 - 47 &&
        land.prompt,
      `${JSON.stringify(land)}; ${landShot}`,
    );
  },
};
