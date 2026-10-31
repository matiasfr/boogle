// Interaction prompts: one button (E, pad B, the touch action button) acts on the one thing in front of you, marked
// with a glyph and a verb. Walking up to The Boogler with something in hand still says Talk; the gift is an answer in
// the talk, with its icon; you pet him from the talk box; the game keeps playing while you talk, so walking off ends
// it, and a chapter left halfway picks up where you stopped; C does nothing. A tossed item gets a floating Pick up prompt,
// E does nothing while you wind up a throw, a can behind you does not hide the palm you face, riding him puts the
// ball first, and a failed planting says why.
import { TP, INV, toss, TOSSED, TOSSED_ITEM } from './lib/world.mjs';

const FACE = (x, z) => `
  const { cam } = await import('/src/player/player.js');
  const p = window.boogle.me.body.position;
  cam.yaw = Math.atan2(-(${x} - p.x), -(${z} - p.z)); cam.pitch = -0.25;`;
const text = (sel) => `(document.querySelector('${sel}')?.textContent ?? '')`;
const shown = (sel) =>
  `(() => { const e = document.querySelector('${sel}'); return !!e && !e.closest('[hidden]'); })()`;
// He wanders: step up beside him on every poll until `check` holds.
const beside = (check) => `(async () => {
  const bog = window.boogle.boogler.disp;
  ${TP('bog.x + 2', 'bog.z')} ${FACE('bog.x', 'bog.z')}
  await new Promise((r) => setTimeout(r, 150));
  return ${check};
})()`;
// On his back: climb on (again only once you've slid off or landed beside him: a headless tab steps slowly, so the drop
// onto him takes several polls) until he counts it as a ride, then put the ball in reach beside you.
const onBack = (check) => `(async () => {
  const { boogler, ACT } = await import('/src/boogler/boogler.js');
  const { ball } = await import('/src/physics/ball.js');
  const { teleport } = await import('/src/physics/physics.js');
  const b = window.boogle.me.body, c = boogler.center, p = b.position;
  const dropping = Math.hypot(p.x - c.x, p.z - c.z) < 1 && p.y > c.y + 0.3;
  if (boogler.me.act !== ACT.RIDE && !dropping) teleport(b, c.x, c.y + 1.6, c.z), b.velocity.set(0, 0, 0);
  else if (!ball.held) {
    teleport(ball.body, p.x + 0.9, p.y + 0.3, p.z);
    ball.body.velocity.set(0, 0, 0);
    ball.disp.p.copy(ball.body.position);
  }
  await new Promise((r) => setTimeout(r, 150));
  return boogler.me.act === ACT.RIDE && ${check};
})()`;
const TAG_TALK = `${shown('.boogler-tag-prompt')} && ${text('.boogler-tag-prompt')}.includes('Talk')`;

export default {
  about: 'one Talk prompt by The Boogler, gifts and pets in the talk, Pick up over items, a reason when planting fails',
  timeout: 300000, // the nightly runner's software WebGPU took ~140 s; the default is 120 s
  async run(t) {
    const g = await t.open({ name: 'talker', hud: 'play' });

    // Holding a mango next to The Boogler: the prompt in his tag says Talk.
    await g.eval(`${INV} I.take('mango');`);
    const talkMs = await g.waitFor(beside(TAG_TALK), { timeout: 20000 });
    await g.wait(0.4);
    const near = await g.still('near');
    t.check('holding a mango by The Boogler, his tag says E Talk', talkMs >= 0, `${talkMs} ms; ${near}`);

    await g.key('KeyC');
    await g.wait(0.3);
    t.check('C no longer opens anything', await g.eval(`return document.querySelector('.bd')?.hidden ?? true;`));

    // E talks; the mango is an answer with its icon.
    await g.key('KeyE');
    await g.waitFor(`!document.querySelector('.bd-opts')?.hidden`, { timeout: 15000 });
    await g.wait(0.4);
    const gift = await g.eval(`
      const b = [...document.querySelectorAll('.bd-opt')].find((b) => b.textContent.includes('a mango'));
      return { has: !!b, icon: !!b?.querySelector('img.bd-gift')?.src };`);
    const talk = await g.still('talk');
    t.check(
      'E opens the talk; the mango is an answer with its icon',
      gift.has && gift.icon,
      `${JSON.stringify(gift)}; ${talk}`,
    );

    // Pet him from the talk box: he answers in a bubble over the card and scores a pet.
    const PETS = `(await (async () => {
      const { getRoomId } = await import('/src/netplay/net.js');
      return JSON.parse(localStorage.getItem('boogle.boogler.' + getRoomId()) ?? 'null')?.pets?.length ?? 0; })())`;
    const before = await g.eval(`return ${PETS};`);
    await g.eval(`document.querySelector('.bd-face').click();`);
    await g.wait(0.25);
    const pet = await g.eval(`
      return { pop: !document.querySelector('.bd-pop').hidden, line: ${text('.bd-pop-text')}, pets: ${PETS} };`);
    const petShot = await g.still('pet');
    t.check(
      'petting the portrait answers in a bubble and counts as a pet',
      pet.pop && pet.line && pet.pets === before + 1,
      `${JSON.stringify(pet)} (before ${before}); ${petShot}`,
    );

    await g.eval(`document.querySelector('.bd-close').click();`);
    await g.wait(0.2);
    t.check('the close button leaves the talk', await g.eval(`return document.querySelector('.bd').hidden;`));

    // The game keeps playing while you talk: the move keys walk you, and walking off ends the talk.
    const BOX = `!document.querySelector('.bd').hidden`;
    const READY = `${BOX} && !document.querySelector('.bd-opts').hidden`; // his line is typed out, answers shown
    const SAY = `return document.querySelector('.bd-say').textContent;`;
    const openTalk = async () => {
      await g.waitFor(beside(TAG_TALK), { timeout: 20000 });
      await g.key('KeyE');
      await g.waitFor(READY, { timeout: 15000 });
    };
    const answer = async (n) => {
      await g.key(`Digit${n}`);
      await g.wait(0.2);
      await g.waitFor(READY, { timeout: 15000 });
    };
    await openTalk();
    const from = await g.eval(`const p = window.boogle.me.body.position; return [p.x, p.z];`);
    // Facing him, so S walks away. Hold it until the talk closes (or 20 s), then check how far you went: a fixed hold
    // covers too few frames on a slow software-rendered runner, and a fixed distance may stop inside his talk range.
    const dist = `(() => { const p = window.boogle.me.body.position; return Math.hypot(p.x - ${from[0]}, p.z - ${from[1]}); })()`;
    await g.down('KeyS');
    const closedMs = await g.waitFor(`document.querySelector('.bd').hidden`, { timeout: 20000 });
    await g.up('KeyS');
    const walked = await g.eval(`return ${dist};`);
    t.check(
      'walking while talking moves you, and walking off ends the talk',
      walked > 1 && closedMs >= 0,
      `walked ${walked.toFixed(1)} m; closed after ${closedMs} ms`,
    );

    // Leave halfway through a story chapter, and next time he picks it back up where you stopped.
    const ASK = `return [...document.querySelectorAll('.bd-opt')].findIndex((b) => b.textContent.includes('Where are you from?')) + 1;`;
    await openTalk();
    await answer(await g.eval(ASK));
    await answer(1);
    const stopped = await g.eval(SAY);
    await g.key('KeyE');
    await g.wait(0.2);
    const left = await g.eval(`return document.querySelector('.bd').hidden;`);
    await openTalk();
    await answer(await g.eval(ASK));
    const resumed = await g.eval(SAY);
    const { RESUME } = await g.eval(`const { RESUME } = await import('/src/boogler/lines.js'); return { RESUME };`);
    const resumeShot = await g.still('resume');
    t.check(
      'leaving mid-chapter (E) closes the talk, and asking again resumes where you stopped',
      left && resumed.endsWith(stopped) && RESUME.some((r) => resumed.startsWith(r)),
      `stopped at "${stopped.slice(0, 40)}...", resumed "${resumed.slice(0, 60)}..."; ${resumeShot}`,
    );
    await g.key('Escape');
    await g.wait(0.2);
    t.check('Escape leaves the talk', await g.eval(`return document.querySelector('.bd').hidden;`));

    // A tossed mango, empty hands: a floating Pick up prompt over it, and E picks it up.
    await g.eval(`${toss(1, 5)};`); // a mango
    await g.waitFor(TOSSED, { timeout: 30000 });
    const item = await g.eval(TOSSED_ITEM);
    await g.eval(`${INV} I.select(-1); ${TP(item.x + 1.2, item.z + 1.2)} ${FACE(item.x, item.z)}`);
    const pickMs = await g.waitFor(`${shown('.prompt')} && ${text('.prompt')}.includes('Pick up')`);
    await g.wait(0.4);
    const itemShot = await g.still('item');
    t.check('a Pick up prompt floats over the tossed item', pickMs >= 0, `${pickMs} ms; ${itemShot}`);
    await g.key('KeyE');
    const got = await g.waitFor(
      `(async () => { ${INV} const { GIFTS } = await import('/src/sim/gift-catalog.js'); return I.heldId() === GIFTS[${item.kind}].id; })()`,
    );
    await g.wait(0.3);
    const tag = await g.eval(`return ${text('.hotbar-name')};`);
    const tagShot = await g.still('held');
    t.check(
      'E picks it up, and the hotbar names it with Throw',
      got >= 0 && tag.includes('Throw'),
      `"${tag}"; ${tagShot}`,
    );

    // Winding up a throw at the stall: E takes nothing, and letting go of E does not throw (pad X then B alike).
    const wind = await g.eval(`${INV}
      const { STALL } = await import('/src/adapters/mushroom-garden.js');
      const { me } = window.boogle;
      I.take('mango');
      ${TP('STALL.x + Math.sin(STALL.yaw) * 1.6', 'STALL.z + Math.cos(STALL.yaw) * 1.6')}
      await new Promise((r) => setTimeout(r, 300));
      const at = H.interactTarget()?.id ?? '';
      H.useDown();
      H.interactDown(); H.interactUp();
      const out = { at, charging: me.charging, held: I.heldId(), can: I.has('can') };
      me.charging = false;
      return out;`);
    t.check(
      'mid-throw at the stall, E neither takes nor throws',
      wind.at.startsWith('stall-') && wind.charging && wind.held === 'mango' && !wind.can,
      JSON.stringify(wind),
    );

    // A watering can behind you does not hide the ripe palm you face: drop a can on open ground past a ripe palm, stand
    // between them facing the palm, and the prompt says Shake while the can is still in reach.
    const palm = await g.eval(`${INV}
      const G = await import('/src/adapters/gifts.js');
      const { trees } = await import('/src/render/props.js');
      const { groundHeight } = await import('/src/adapters/terrain.js');
      const { teleport } = await import('/src/physics/physics.js');
      const { camera } = await import('/src/render/scene.js');
      const { cam } = await import('/src/player/player.js');
      const { giftIndex } = await import('/src/sim/gift-catalog.js');
      const { CELL, HALF, SEA } = await import('/src/constants.js');
      const b = window.boogle.me.body, can = giftIndex('can');
      const items = () => window.boogle.gifts.items; // a new array whenever things expire
      const nap = (ms) => new Promise((r) => setTimeout(r, ms));
      const land = (x, z) => groundHeight(x, z) > SEA + 0.4;
      I.select(-1);
      for (let k = 0; k < trees.length; k++) {
        const P = trees[k];
        teleport(b, P.x + 1.2, groundHeight(P.x + 1.2, P.z) + 0.6, P.z);
        if (!G.giftTargets().some((t) => t.id === 'palm' + k)) continue;
        for (let a = 0; a < 8; a++) {
          const ux = Math.cos((a * Math.PI) / 4), uz = Math.sin((a * Math.PI) / 4);
          const bx = P.x + ux * 2.5, bz = P.z + uz * 2.5;
          if (!land(bx, bz) || !land(P.x + ux * 1.4, P.z + uz * 1.4)) continue;
          const had = new Set(items().map((it) => it.id));
          const from = camera.position.clone().set(bx, groundHeight(bx, bz) + 0.6, bz);
          if (!G.throwItem(can, from, from.clone().set(0, -0.5, 0))) continue;
          let it = null;
          for (let n = 0; n < 150 && !it; n++, await nap(100)) it = items().find((x) => !had.has(x.id) && x.kind === can);
          if (!it) continue;
          await nap(600); // its flight comes down
          const sx = it.i * CELL - HALF, sz = HALF - it.j * CELL;
          const gap = Math.hypot(P.x - sx, P.z - sz), wx = (P.x - sx) / gap, wz = (P.z - sz) / gap;
          const ahead = Math.min(1.8, gap - 0.8), x = P.x - wx * ahead, z = P.z - wz * ahead;
          teleport(b, x, groundHeight(x, z) + 0.6, z);
          b.velocity.set(0, 0, 0);
          cam.yaw = Math.atan2(-wx, -wz);
          cam.pitch = -0.2;
          await nap(300);
          return { palm: 'palm' + k, item: 'item' + it.id, behind: gap - ahead, ahead, ids: G.giftTargets().map((t) => t.id) };
        }
      }
      return null;`);
    const shakeMs = palm
      ? await g.waitFor(`${shown('.prompt')} && ${text('.prompt')}.includes('Shake')`, { timeout: 10000 })
      : -1;
    const shakeShot = await g.still('shake');
    t.check(
      'a can behind you does not hide the ripe palm ahead: the prompt says Shake',
      shakeMs >= 0 && palm.ids.includes(palm.item) && palm.ids.includes(palm.palm),
      `${shakeMs} ms; ${JSON.stringify(palm)}; ${shakeShot}`,
    );

    // Seeds on ground they cannot go in: the click says why.
    const spot = await g.eval(`${INV}
      const G = await import('/src/adapters/mushroom-garden.js');
      const { me } = window.boogle;
      I.take('seeds', 3);
      for (let r = 0; r < 40; r += 2)
        for (let a = 0; a < 12; a++) {
          const x = ${item.x} + r * Math.cos(a / 1.9), z = ${item.z} + r * Math.sin(a / 1.9);
          ${TP('x', 'z')}
          me.yaw = 0;
          if (G.plantTarget()?.text) return { x, z };
        }
      return null;`);
    if (spot) {
      await g.eval(`${INV} H.useDown(); H.useUp();`);
      await g.wait(0.3);
      const note = await g.eval(`return { on: ${shown('.hotbar-note.shown')}, text: ${text('.hotbar-note')} };`);
      const noteShot = await g.still('cant-plant');
      t.check(
        'a failed planting says why',
        note.on && note.text.includes("Can't plant"),
        `${JSON.stringify(note)}; ${noteShot}`,
      );
    } else t.check('found ground where seeds cannot go', false);

    // Before the pointer is captured, the hint is a mouse glyph and a verb.
    const look = await g.eval(`
      const { inputState } = await import('/src/player/input.js');
      const was = { ...inputState };
      Object.assign(inputState, { locked: false, lockFailed: false });
      await new Promise((r) => setTimeout(r, 400));
      const h = document.getElementById('hint');
      const out = { shown: !h.hidden, mouse: !!h.querySelector('.g-mouse'), text: h.textContent.trim() };
      Object.assign(inputState, was);
      return out;`);
    t.check(
      'the look-around hint is a mouse glyph and a verb',
      look.shown && look.mouse && look.text === 'Look around',
      JSON.stringify(look),
    );

    // A gamepad: the same prompt with the B button.
    await g.eval(`document.body.classList.add('gamepad');`);
    const padMs = await g.waitFor(
      beside(`${TAG_TALK} && !!document.querySelector('.boogler-tag-prompt .g-pad[data-b="b"]')`),
      {
        timeout: 20000,
      },
    );
    await g.wait(0.4);
    const padShot = await g.still('pad');
    t.check('on a gamepad his tag says B Talk', padMs >= 0, `${padMs} ms; ${padShot}`);

    // Riding him, he is not something to talk to: the ball beside you gets the prompt, and his tag has none.
    const rideMs = await g.waitFor(
      onBack(`${shown('.prompt')} && ${text('.prompt')}.includes('Grab') && !${shown('.boogler-tag-prompt')}`),
      { timeout: 20000 },
    );
    const rideShot = await g.still('riding');
    await g.eval(`${TP('window.boogle.boogler.disp.x + 4', 'window.boogle.boogler.disp.z')}`);
    t.check('riding him, the ball gets the prompt, not Talk', rideMs >= 0, `${rideMs} ms; ${rideShot}`);

    // Touch: the action button says Talk, and the prompt has no glyph.
    const thumb = await t.open({ name: 'thumb', hud: true, touch: true, size: [844, 390] });
    await thumb.eval(`${INV} I.take('mango');`);
    const tapMs = await thumb.waitFor(
      beside(
        `${TAG_TALK} && document.getElementById('btn-grab').textContent === 'Talk' && !document.querySelector('.boogler-tag-prompt .g')`,
      ),
      { timeout: 20000 },
    );
    await thumb.wait(0.4);
    const touchShot = await thumb.still('touch');
    t.check('on touch the action button says Talk', tapMs >= 0, `${tapMs} ms; ${touchShot}`);
    await thumb.eval(
      `document.getElementById('btn-grab').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));`,
    );
    const tapTalk = await thumb.waitFor(`!document.querySelector('.bd')?.hidden && !!document.querySelector('.bd')`);
    await thumb.wait(0.6);
    const touchTalk = await thumb.still('touch-talk');
    t.check('tapping it opens the talk', tapTalk >= 0, touchTalk);
    t.check(
      'while you talk the main button says Leave, so a tap walks away instead of throwing',
      await thumb.eval(`return document.getElementById('btn-grab').textContent === 'Leave';`),
    );
  },
};
