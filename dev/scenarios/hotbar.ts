// The hotbar: a new player starts empty-handed; pick something up and it is in your hand; throw it and it lands for
// everyone; the beach ball rides on your back while you hold something else; The Boogler takes what you hold; seeds go
// in anywhere and a growing mushroom shoves you aside; the frisbee on the lighthouse deck glides far. On a phone: only
// filled slots show (none to start), Toss shows only for a throwable thing the main button would not throw, and the
// bar clears the HUD.
import { TP, INV, toss, TOSSED, TOSSED_ITEM } from './lib/world.ts';
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
// The touch HUD stays clear: the bar overlaps none of the brand and roster, the net pill, or a touch button on screen.
const LAYOUT = `${DOM}
  const bar = rect('.hotbar');
  const hits = (r) => !(bar.right <= r.left || r.right <= bar.left || bar.bottom <= r.top || r.bottom <= bar.top);
  const others = ['.hud-tl', '.hud-tr', '.stick', ...[...document.querySelectorAll('#touch .tbtn')].map((b) =>
    '.' + [...b.classList].join('.'))].filter(shown);
  const hit = others.filter((s) => hits(rect(s)));
  return { bar: [bar.left, bar.top, bar.right, bar.bottom].map(Math.round), checked: others.length, hit };`;

export default {
  about: 'hold, throw and give what you pick up; plant anywhere; frisbee off the lighthouse; the phone hotbar',
  timeout: 600000, // two software-rendered players in a row on a busy machine; the nightly runner took ~450 s
  async run(t: T) {
    const g = await t.open({ name: 'holder', hud: 'play' });
    const consoleErrors: string[] = [];
    g.page.on('console', (m) => m.type() === 'error' && m.text().includes('[world]') && consoleErrors.push(m.text()));
    const start = await g.eval(`${INV} return { slots: I.inv.slots, sel: I.inv.sel };`);
    t.check(
      'a new player starts empty-handed',
      start.slots.every((s: unknown) => !s) && start.sel === -1,
      JSON.stringify(start),
    );

    // A tossed item: walk up, grab it, and it is in your hand.
    await g.eval(`${toss(2, 5)};`); // a frisbee
    await g.waitFor(TOSSED, { timeout: 30000 });
    const item = await g.eval(TOSSED_ITEM);
    await g.eval(TP(item.x + 0.6, item.z));
    await g.wait(0.5);
    await g.eval(`${INV} H.interactDown(); H.interactUp();`);
    const held = await g.waitFor(
      `(async () => { ${INV} const { GIFTS } = await import('/src/sim/gift-catalog.ts'); return I.heldId() === GIFTS[${item.kind}].id; })()`,
    );
    await g.view({ cam: [item.x + 3.5, 2.2, item.z + 3.5], look: [item.x + 0.6, 0.6, item.z] });
    const s1 = await g.still('in-hand');
    t.check('the picked-up thing is in your hand', held >= 0, s1);

    // Throw it from just inland of spawn towards the island's middle: it flies and lands as a shared item.
    // Aim follows the camera, so give it a moment to catch up before letting go.
    await g.eval(`window.__debugCam.clear(); ${TP(14, 24)} ${AIM(0.49, -0.05)}`);
    await g.wait(0.4);
    await g.eval(`${INV} H.useDown();`);
    await g.wait(1.5); // a full charge: a short one can land in the pit by the court
    await g.eval(`${INV} H.useUp();`);
    const landed = await g.waitFor(`window.boogle.gifts.items.some((it) => it.src === 0 && it.kind === ${item.kind})`);
    const far = await g.eval(`
      const { CELL, HALF } = await import('/src/constants.ts');
      const it = window.boogle.gifts.items.find((it) => it.src === 0 && it.kind === ${item.kind});
      const p = window.boogle.me.body.position;
      return it ? Math.hypot(it.i * CELL - HALF - p.x, HALF - it.j * CELL - p.z) : -1;`);
    t.check('a thrown thing lands as a shared item, metres away', landed >= 0 && far > 4, `${far.toFixed(1)} m`);

    // The ball: grab it, put it on your back by switching to a frisbee, take it back out.
    const ball = await g.eval(`${INV}
      const { ball } = await import('/src/physics/ball.ts');
      const { teleport } = await import('/src/physics/physics.ts');
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
      teleport(ball.body, p.x + 0.6, p.y + 0.5, p.z - 0.6); ball.disp.p.set(p.x + 0.6, p.y + 0.5, p.z - 0.6);
      H.interactDown(); H.interactUp();
      const inHand = I.heldId() === 'ball' && window.boogle.me.holding;
      I.take('frisbee');
      const onBack = ball.held && !window.boogle.me.holding && I.has('ball');
      I.select(I.slotOf('ball'));
      I.drop('frisbee');
      return { inHand, onBack, back: window.boogle.me.holding };`);
    t.check(
      'the ball takes a slot, rides on your back, and comes back to hand',
      ball.inHand && ball.onBack && ball.back,
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
      return { offeredFrisbee, frisbeeGone: !I.has('frisbee') };`);
    t.check(
      'The Boogler takes the frisbee from your hand',
      talk.offeredFrisbee && talk.frisbeeGone,
      JSON.stringify(talk),
    );
    await g.eval(`(await import('/src/boogler/dialogue.ts')).closeDialogue();`);

    // Seeds go in off the dirt patch: find open grass near home, plant, water, then stand where it grows.
    const spot = await g.eval(`${INV}
      const { CELL, HALF, GRID_RES } = await import('/src/constants.ts');
      const G = await import('/src/adapters/mushroom-garden.ts');
      const { PATCH } = await import('/src/sim/mushrooms.ts');
      for (let r = 6; r < 60; r += 2)
        for (let a = 0; a < 24; a++) {
          const i = Math.round(PATCH.i0 - r * Math.cos(a / 3.8)), j = Math.round(PATCH.j0 - r * Math.sin(a / 3.8));
          if (i >= PATCH.i0 - 4 && i < PATCH.i0 + PATCH.w + 4 && j >= PATCH.j0 - 4 && j < PATCH.j0 + PATCH.h + 4) continue;
          if (G.plantOk(i, j)) return { i, j, x: i * CELL - HALF, z: HALF - j * CELL };
        }
      return null;`);
    t.check('found open ground away from the dirt patch', !!spot, JSON.stringify(spot));
    if (!spot) return;
    await g.eval(`${INV} I.take('seeds', 5); ${TP(spot.x, `${spot.z} + 0.9`)} ${AIM(0)}`);
    await g.wait(0.4);
    await g.eval(`${INV} H.useDown(); H.useUp();`);
    const hasPlot = await g.waitFor(`(async () => {
      const { garden } = await import('/src/adapters/mushroom-garden.ts');
      return garden.plots.some((p) => p.i === ${spot.i} && p.j === ${spot.j}); })()`);
    t.check('a seed goes in off the dirt patch', hasPlot >= 0, `cell ${spot.i},${spot.j}`);
    await g.eval(`${INV} I.take('can'); H.useDown(); H.useUp();`);
    // Stand on the seed as soon as it starts growing, before it has a collider: later, on a fast machine, the cap is
    // already above your feet and you land on top and ride it up instead (that is intended, but not this check).
    await g.waitFor(`(async () => {
      const { garden } = await import('/src/adapters/mushroom-garden.ts');
      return garden.plots.some((p) => p.i === ${spot.i} && p.j === ${spot.j} && p.g > 0); })()`);
    await g.eval(TP(spot.x + 0.3, spot.z));
    const before = await g.eval(
      `const p = window.boogle.me.body.position; return Math.hypot(p.x - ${spot.x}, p.z - ${spot.z});`,
    );
    await g.view({ cam: [spot.x + 7, 3.5, spot.z + 7], look: [spot.x, 0.8, spot.z] });
    const grow = await g.motion('growing', { frames: 8, seconds: 6 });
    const after = await g.eval(
      `const p = window.boogle.me.body.position; return { d: Math.hypot(p.x - ${spot.x}, p.z - ${spot.z}), y: p.y };`,
    );
    t.check(
      'a growing mushroom shoves you out from under it',
      after.d > before + 1,
      `${before.toFixed(2)} -> ${after.d.toFixed(2)} m; ${grow.sheet}`,
    );
    const solid = await g.eval(`
      const { forEachStatic } = await import('/src/physics/engine.ts');
      const near = [];
      forEachStatic(-1, (b, shapes) => Math.hypot(b.position.x - ${spot.x}, b.position.z - ${spot.z}) < 0.1 && near.push(shapes.length));
      return near;`);
    t.check(
      'the growing mushroom has a collider',
      solid.some((n: number) => n === 2),
      JSON.stringify(solid),
    );

    // The frisbee waits on the lighthouse deck; throw it off and it glides far.
    const { FRISBEE } = await g.eval(
      `const L = await import('/src/pois/lighthouse/index.ts'); return { FRISBEE: L.FRISBEE_SPOT };`,
    );
    await g.eval(`window.__debugCam.clear();`);
    await g.eval(TP(FRISBEE.x, FRISBEE.z, FRISBEE.y + 0.8));
    await g.wait(0.6);
    const perched = await g.eval(`return window.boogle.gifts.items.some((it) => it.src === 1);`);
    await g.view({
      cam: [FRISBEE.x + 4, FRISBEE.y + 2.5, FRISBEE.z + 4],
      look: [FRISBEE.x, FRISBEE.y + 0.5, FRISBEE.z],
    });
    const deck = await g.still('deck');
    t.check('the frisbee waits on the lighthouse deck', perched, deck);
    await g.eval(`${INV} H.interactDown(); H.interactUp();`);
    const got = await g.waitFor(`(async () => { ${INV} return I.heldId() === 'frisbee'; })()`);
    t.check('you can pick the frisbee up', got >= 0);
    await g.eval(`window.__debugCam.clear();`);
    await g.eval(AIM(3.0, 0.12));
    await g.wait(0.4);
    // Half a charge: a full one glides about 85 m, past the beach into the sea in this direction.
    await g.eval(`${INV} H.useDown();`);
    await g.wait(0.45);
    await g.eval(`${INV} H.useUp();`);
    await g.view({
      cam: [FRISBEE.x + 30, FRISBEE.y + 6, FRISBEE.z + 34],
      look: [FRISBEE.x + 10, FRISBEE.y - 4, FRISBEE.z + 12],
    });
    const flight = await g.motion('frisbee', { frames: 8, seconds: 3 });
    const fris = await g.waitFor(
      `(async () => { const { giftIndex } = await import('/src/sim/gift-catalog.ts');
        return window.boogle.gifts.items.some((it) => it.src === 0 && it.kind === giftIndex('frisbee')); })()`,
      { timeout: 20000 },
    );
    const dist = await g.eval(`
      const { CELL, HALF } = await import('/src/constants.ts');
      const { giftIndex } = await import('/src/sim/gift-catalog.ts');
      const it = window.boogle.gifts.items.find((it) => it.src === 0 && it.kind === giftIndex('frisbee'));
      return it ? Math.hypot(it.i * CELL - HALF - 6, HALF - it.j * CELL + 58) : -1;`);
    t.check(
      'the frisbee glides far from the lighthouse',
      fris >= 0 && dist > 20,
      `${dist?.toFixed?.(1)} m; ${flight.sheet}`,
    );
    t.check('no failed edits ([world] console errors)', !consoleErrors.length, consoleErrors.join(' | '));

    // ------------------------------------------------------------ on a phone, portrait
    const thumb = await t.open({ name: 'thumb', hud: true, touch: true, size: [390, 844] });
    const one = await thumb.waitFor(
      when(
        `!!document.querySelector('.hotbar') &&
          [...document.querySelectorAll('.hotbar-slot')].filter((b) => b.getClientRects().length).length === 0`,
      ),
    );
    t.check('on touch a new player sees no slots, not five', one >= 0, `${one} ms`);

    await thumb.eval(`${INV} ${TP(14, 24)}`);
    await thumb.eval(`${INV} I.take('frisbee');`);
    const frisbee = await thumb.waitFor(when(`label() === 'Throw' && throws() && !shown('.tbtn.toss')`));
    const away = await thumb.eval(`${INV} return H.interactTarget()?.id ?? null;`);
    t.check(
      'holding a frisbee: the main button throws and Toss hides',
      frisbee >= 0,
      `${frisbee} ms; in reach: ${away}`,
    );

    await thumb.wait(0.4);
    const portrait = await thumb.eval(LAYOUT);
    const portraitShot = await thumb.still('touch-portrait');
    t.check(
      'portrait: the hotbar clears the brand, roster, net pill and buttons',
      portrait.checked >= 4 && !portrait.hit.length,
      `${JSON.stringify(portrait)}; ${portraitShot}`,
    );

    // ------------------------------------------------------------ landscape
    await thumb.page.setViewportSize({ width: 844, height: 390 });
    await thumb.wait(0.6);
    const landscape = await thumb.eval(LAYOUT);
    const landscapeShot = await thumb.still('touch-landscape');
    t.check(
      'landscape: the hotbar clears the brand, roster, net pill and buttons',
      landscape.checked >= 4 && !landscape.hit.length,
      `${JSON.stringify(landscape)}; ${landscapeShot}`,
    );
  },
};
