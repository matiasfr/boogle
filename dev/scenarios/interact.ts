// Interaction prompts: one button (E, pad X, the touch action button) acts on the one thing in front of you, marked
// with a glyph and a verb. Walking up to The Boogler with something in hand still says Talk; the gift is an answer in
// the talk, with its icon; you stand still while you talk and Esc leaves, and a chapter
// left halfway picks up where you stopped. Riding him puts the ball first, and a failed planting says why. The toss checks
// (a tossed item's Pick up prompt, E mid-throw, a frisbee behind a log bundle) wait for replication R3 (owner, 9
// November): the live game's server refuses gift.toss until then.
import { TP, INV, lowResOnCi } from './lib/world.ts';
import type { T } from './run.ts';

const FACE = (x: string, z: string) => `
  const { cam } = await import('/src/player/player.ts');
  const p = window.boogle.me.body.position;
  cam.yaw = Math.atan2(-(${x} - p.x), -(${z} - p.z)); cam.pitch = -0.25;`;
const text = (sel: string) => `(document.querySelector('${sel}')?.textContent ?? '')`;
const shown = (sel: string) =>
  `(() => { const e = document.querySelector('${sel}'); return !!e && !e.closest('[hidden]'); })()`;
// He wanders: step up beside him on every poll until `check` holds.
const beside = (check: string) => `(async () => {
  const bog = window.boogle.boogler.disp;
  ${TP('bog.x + 2', 'bog.z')} ${FACE('bog.x', 'bog.z')}
  await new Promise((r) => setTimeout(r, 150));
  return ${check};
})()`;
// On his back: climb on (again only once you've slid off or landed beside him: a headless tab steps slowly, so the drop
// onto him takes several polls) until he counts it as a ride, then put the ball in reach beside you.
const onBack = (check: string) => `(async () => {
  const { boogler, ACT } = await import('/src/boogler/boogler.ts');
  const { ball } = await import('/src/entities/ball/state.ts');
  const { teleport } = await import('/src/physics/engine.ts');
  const b = window.boogle.me.body, c = boogler.center, p = b.position;
  const dropping = Math.hypot(p.x - c.x, p.z - c.z) < 1 && p.y > c.y + 0.3;
  if (boogler.me.act !== ACT.RIDE && !dropping) teleport(b, c.x, c.y + 1.6, c.z), b.velocity.set(0, 0, 0);
  else if (!ball.held) {
    teleport(ball.body, p.x + 0.9, p.y + 0.3, p.z);
    ball.body.velocity.set(0, 0, 0);
    ball.pose.p.copy(ball.body.position);
  }
  await new Promise((r) => setTimeout(r, 150));
  return boogler.me.act === ACT.RIDE && ${check};
})()`;
const TAG_TALK = `${shown('.boogler-tag-prompt')} && ${text('.boogler-tag-prompt')}.includes('Talk')`;

export default {
  island: true, // the classic island by the court (run.ts)
  about: 'one Talk prompt by The Boogler, gifts in the talk, the ball first on his back, a reason when planting fails',
  timeout: 600000, // two software-rendered players in a row: the nightly runner was still going at 300 s
  async run(t: T) {
    const g = await t.open({ name: 'talker', hud: 'play' });
    await lowResOnCi(g);

    // Holding a frisbee next to The Boogler: the prompt in his tag says Talk.
    await g.eval(`${INV} I.take('frisbee');`);
    const talkMs = await g.waitFor(beside(TAG_TALK), { timeout: 20000 });
    await g.wait(0.4);
    const near = await g.still('near');
    t.check('holding a frisbee by The Boogler, his tag says E Talk', talkMs >= 0, `${talkMs} ms; ${near}`);

    // E talks; the frisbee is an answer with its icon.
    await g.key('KeyE');
    await g.waitFor(`!document.querySelector('.bd-opts')?.hidden`, { timeout: 15000 });
    await g.wait(0.4);
    const gift = await g.eval(`
      const b = [...document.querySelectorAll('.bd-opt')].find((b) => b.textContent.includes('a frisbee'));
      return { has: !!b, icon: !!b?.querySelector('img.bd-gift')?.src };`);
    const talk = await g.still('talk');
    t.check(
      'E opens the talk; the frisbee is an answer with its icon',
      gift.has && gift.icon,
      `${JSON.stringify(gift)}; ${talk}`,
    );

    await g.eval(`document.querySelector('.bd-close').click();`);
    await g.wait(0.2);
    t.check('the close button leaves the talk', await g.eval(`return document.querySelector('.bd').hidden;`));

    // You stand still while you talk (src/player/conversation.ts): the move keys do not walk you, Esc leaves.
    const BOX = `!document.querySelector('.bd').hidden`;
    const READY = `${BOX} && !document.querySelector('.bd-opts').hidden`; // his line is typed out, answers shown
    const SAY = `return document.querySelector('.bd-say').textContent;`;
    const openTalk = async () => {
      await g.waitFor(beside(TAG_TALK), { timeout: 20000 });
      await g.key('KeyE');
      await g.waitFor(READY, { timeout: 15000 });
    };
    const answer = async (n: number) => {
      await g.key(`Digit${n}`);
      await g.wait(0.2);
      await g.waitFor(READY, { timeout: 15000 });
    };
    await openTalk();
    const from = await g.eval(`const p = window.boogle.me.body.position; return [p.x, p.z];`);
    const dist = `(() => { const p = window.boogle.me.body.position; return Math.hypot(p.x - ${from[0]}, p.z - ${from[1]}); })()`;
    await g.down('KeyD');
    await g.wait(1.5);
    await g.up('KeyD');
    const held = await g.eval(`return { walked: ${dist}, open: !document.querySelector('.bd').hidden };`);
    t.check(
      'talking, the move keys do not walk you and the talk stays open',
      held.walked < 0.3 && held.open,
      JSON.stringify(held),
    );
    await g.key('Escape');
    await g.wait(0.2);

    // Leave halfway through a story chapter, and next time he picks it back up where you stopped.
    const ASK = `return [...document.querySelectorAll('.bd-opt')].findIndex((b) => b.textContent.includes('Where are you from?')) + 1;`;
    await openTalk();
    await answer(await g.eval(ASK));
    await answer(1);
    const stopped = await g.eval(SAY);
    await g.key('Escape');
    await g.wait(0.2);
    const left = await g.eval(`return document.querySelector('.bd').hidden;`);
    await openTalk();
    await answer(await g.eval(ASK));
    const resumed = await g.eval(SAY);
    const { RESUME } = await g.eval(`const { RESUME } = await import('/src/boogler/lines.ts'); return { RESUME };`);
    const resumeShot = await g.still('resume');
    t.check(
      'leaving mid-chapter (Esc) closes the talk, and asking again resumes where you stopped',
      left && resumed.endsWith(stopped) && RESUME.some((r: string) => resumed.startsWith(r)),
      `stopped at "${stopped.slice(0, 40)}...", resumed "${resumed.slice(0, 60)}..."; ${resumeShot}`,
    );
    await g.key('Escape');
    await g.wait(0.2);
    t.check('Escape leaves the talk', await g.eval(`return document.querySelector('.bd').hidden;`));

    // No toss checks until replication R3 (owner, 9 November, docs/decisions.md "Four more answers" (3)): the live
    // game's server refuses gift.toss and the live game offers no throw, so a tossed item to pick up (and its name tag
    // saying Throw), a wind-up at the stall and a dropped frisbee behind a log bundle come back with R3.

    // A bag of seeds where nothing can grow: the click says why. The search starts at the beach cell west of the court
    // where the tossed frisbee used to land (lib/world.ts, toss). Anything in hand turns you to the camera every frame
    // (src/entities/player/state.ts), so the camera faces the searched heading too, and the click comes in the same
    // eval as the search: pressed a few frames later, a slow browser had turned to ground that grows and planted
    // silently (Mac nightly 10 November, Edge on Windows 11 November).
    const spot = await g.eval(`${INV}
      const G = await import('/src/adapters/mushrooms.ts');
      const { CELL, HALF } = await import('/src/constants.ts');
      const { cam } = await import('/src/player/player.ts');
      const { me } = window.boogle;
      const bx = 230 * CELL - HALF, bz = HALF - 205 * CELL;
      I.take('seeds');
      for (let r = 0; r < 40; r += 2)
        for (let a = 0; a < 12; a++) {
          const x = bx + r * Math.cos(a / 1.9), z = bz + r * Math.sin(a / 1.9);
          ${TP('x', 'z')}
          cam.yaw = me.yaw = 0;
          if (!G.spotsAhead().length) {
            H.useDown();
            H.useUp();
            return { x, z };
          }
        }
      return null;`);
    if (spot) {
      // The HUD shows the note on its next frame; a loaded nightly can take longer than a fixed wait (10 November).
      await g.waitFor(shown('.notify.shown[data-kind="deny"]'), { timeout: 5000 });
      // The notification lane (src/ui/notify.ts) has said it since the UI that answers replaced the hands' own note.
      const note = await g.eval(
        `return { on: ${shown('.notify.shown[data-kind="deny"]')}, text: ${text('.notify-text')} };`,
      );
      const noteShot = await g.still('cant-grow');
      t.check(
        'a bag that cannot sprout says why',
        note.on && note.text.includes("Can't grow"),
        `${JSON.stringify(note)}; ${noteShot}`,
      );
    } else t.check('found ground where nothing can grow', false);

    // Before the pointer is captured, the hint is a mouse glyph and a verb.
    const look = await g.eval(`
      const { inputState } = await import('/src/player/input.ts');
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

    // A gamepad: the same prompt with the X button.
    await g.eval(`document.body.classList.add('gamepad');`);
    const padMs = await g.waitFor(
      beside(`${TAG_TALK} && !!document.querySelector('.boogler-tag-prompt .g-pad[data-b="x"]')`),
      {
        timeout: 20000,
      },
    );
    await g.wait(0.4);
    const padShot = await g.still('pad');
    t.check('on a gamepad his tag says X Talk', padMs >= 0, `${padMs} ms; ${padShot}`);

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
    await lowResOnCi(thumb);
    await thumb.eval(`${INV} I.take('frisbee');`);
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
