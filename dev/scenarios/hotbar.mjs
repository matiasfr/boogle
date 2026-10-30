// The hotbar: pick something up and it is in your hand; throw it and it lands for everyone, but never the shovel; the
// beach ball rides on your back while you hold something else; The Boogler takes what you hold but not your shovel;
// seeds go in anywhere and a growing mushroom shoves you aside; the frisbee on the lighthouse deck glides far. On a
// phone: only filled slots show, the main button digs with the shovel (even next to the ball), Toss shows only for a
// throwable thing the main button would not throw, a lost shovel comes back from Pile, and the bar clears the HUD.
const TP = (x, z, y) => `
  const { teleport } = await import('/src/physics/physics.js');
  const { groundHeight } = await import('/src/adapters/terrain.js');
  const b = window.boogle.me.body;
  teleport(b, ${x}, ${y ?? `groundHeight(${x}, ${z}) + 0.6`}, ${z});
  b.velocity.set(0, 0, 0);`;
const INV = `const I = await import('/src/player/inventory.js'); const H = await import('/src/player/hands.js');`;
const AIM = (yaw, pitch = 0) =>
  `const { cam } = await import('/src/player/player.js'); cam.yaw = ${yaw}; cam.pitch = ${pitch}; window.boogle.me.yaw = ${yaw};`;
// Page-side helpers for the touch checks: shown(sel) (laid out, so hidden ancestors count), rect(sel), the main
// button's label, and whether it throws. when(cond) wraps them into an expression for waitFor.
const DOM = `
  const shown = (s) => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; };
  const rect = (s) => document.querySelector(s).getBoundingClientRect();
  const label = () => document.getElementById('btn-grab').textContent;
  const throws = () => document.body.classList.contains('main-throws');`;
const when = (cond) => `(() => { ${DOM} return ${cond}; })()`;
// The touch HUD stays clear: the bar overlaps none of the brand and roster, the net pill, or a touch button on screen.
const LAYOUT = `${DOM}
  const bar = rect('.hotbar');
  const hits = (r) => !(bar.right <= r.left || r.right <= bar.left || bar.bottom <= r.top || r.bottom <= bar.top);
  const others = ['.hud-tl', '.hud-tr', '.stick', ...[...document.querySelectorAll('#touch .tbtn')].map((b) =>
    '.' + [...b.classList].join('.'))].filter(shown);
  const hit = others.filter((s) => hits(rect(s)));
  return { bar: [bar.left, bar.top, bar.right, bar.bottom].map(Math.round), checked: others.length, hit };`;
const press = (sel, type) =>
  `document.querySelector('${sel}').dispatchEvent(new PointerEvent('${type}', { bubbles: true }));`;

export default {
  about: 'hold, throw and give what you pick up; plant anywhere; frisbee off the lighthouse; the phone hotbar',
  timeout: 300000, // two software-rendered players in a row on a busy machine
  async run(t) {
    const g = await t.open({ name: 'holder', hud: 'play' });
    const consoleErrors = [];
    g.page.on('console', (m) => m.type() === 'error' && m.text().includes('[world]') && consoleErrors.push(m.text()));
    const start = await g.eval(`${INV} return { slots: I.inv.slots, sel: I.inv.sel };`);
    t.check('a new player starts with a shovel in slot 1', start.slots[0]?.id === 'shovel', JSON.stringify(start));

    // The shovel is a key item: a wind-up on a mango (click, useDown) that switches to the shovel (key 1) and lets go
    // throws nothing, and the Toss path refuses it outright.
    await g.eval(`${INV} ${TP(14, 24)} I.take('mango');`);
    await g.wait(0.4);
    const wound = await g.eval(`${INV} H.useDown(); return window.boogle.me.charging;`);
    await g.key('Digit1');
    await g.wait(0.2);
    await g.eval(`${INV} H.useUp();`);
    await g.wait(1.5);
    const kept = await g.eval(`${INV}
      const { giftIndex } = await import('/src/sim/gift-catalog.js');
      const toss = H.throwDown();
      const flying = window.boogle.gifts.items.some((it) => it.src === 2 && it.kind === giftIndex('shovel'));
      const r = { wound: ${wound}, held: I.heldId(), shovel: I.has('shovel'), mango: I.has('mango'), toss, flying,
        charging: window.boogle.me.charging, canThrow: H.canThrow() };
      I.drop('mango');
      return r;`);
    t.check(
      'trying to throw the shovel leaves it in the hotbar',
      kept.wound && kept.held === 'shovel' && kept.shovel && kept.mango && !kept.toss && !kept.flying && !kept.charging,
      JSON.stringify(kept),
    );

    // A shore item: walk up, grab it, and it is in your hand.
    await g.waitFor(`window.boogle.gifts.items.some((it) => it.src === 0)`, { timeout: 30000 });
    const item = await g.eval(`
      const { CELL, HALF } = await import('/src/constants.js');
      const it = window.boogle.gifts.items.find((it) => it.src === 0);
      return { id: it.id, kind: it.kind, x: it.i * CELL - HALF, z: HALF - it.j * CELL };`);
    await g.eval(TP(item.x + 0.6, item.z));
    await g.wait(0.5);
    await g.eval(`${INV} H.interactDown(); H.interactUp();`);
    const held = await g.waitFor(
      `(async () => { ${INV} const { GIFTS } = await import('/src/sim/gift-catalog.js'); return I.heldId() === GIFTS[${item.kind}].id; })()`,
    );
    await g.view({ cam: [item.x + 3.5, 2.2, item.z + 3.5], look: [item.x + 0.6, 0.6, item.z] });
    const s1 = await g.still('in-hand');
    t.check('the picked-up thing is in your hand', held >= 0, s1);

    // Throw it from just inland of spawn towards the island's middle: it flies and lands as a shared item.
    // Aim follows the camera, so give it a moment to catch up before letting go.
    await g.eval(`window.__debugCam.clear(); ${TP(14, 24)} ${AIM(0.49, -0.05)}`);
    await g.wait(0.4);
    await g.eval(`${INV} H.useDown();`);
    await g.wait(0.7);
    await g.eval(`${INV} H.useUp();`);
    const landed = await g.waitFor(`window.boogle.gifts.items.some((it) => it.src === 2 && it.kind === ${item.kind})`);
    const far = await g.eval(`
      const { CELL, HALF } = await import('/src/constants.js');
      const it = window.boogle.gifts.items.find((it) => it.src === 2 && it.kind === ${item.kind});
      const p = window.boogle.me.body.position;
      return it ? Math.hypot(it.i * CELL - HALF - p.x, HALF - it.j * CELL - p.z) : -1;`);
    t.check('a thrown thing lands as a shared item, metres away', landed >= 0 && far > 4, `${far.toFixed(1)} m`);

    // The ball: grab it, put it on your back by switching to the shovel, take it back out.
    const ball = await g.eval(`${INV}
      const { ball } = await import('/src/physics/ball.js');
      const { teleport } = await import('/src/physics/physics.js');
      const p = window.boogle.me.body.position;
      if (!ball.mine) return { err: 'not mine' };
      teleport(ball.body, p.x + 0.6, p.y + 0.5, p.z - 0.6); ball.disp.p.set(p.x + 0.6, p.y + 0.5, p.z - 0.6);
      H.interactDown(); H.interactUp();
      const inHand = I.heldId() === 'ball' && window.boogle.me.holding;
      I.select(I.slotOf('shovel'));
      const onBack = ball.held && !window.boogle.me.holding && I.has('ball');
      I.select(I.slotOf('ball'));
      return { inHand, onBack, back: window.boogle.me.holding };`);
    t.check(
      'the ball takes a slot, rides on your back, and comes back to hand',
      ball.inHand && ball.onBack && ball.back,
      JSON.stringify(ball),
    );

    // The Boogler: with the shovel he refuses, with a mango he takes it.
    const bog = await g.eval(`return { x: window.boogle.boogler.disp.x, z: window.boogle.boogler.disp.z };`);
    await g.eval(TP(bog.x + 1.5, bog.z));
    await g.wait(0.3);
    // Answers only show once his line has finished typing; wait for them, then for his reply.
    const talk = await g.eval(`${INV}
      const play = await import('/src/boogler/play.js');
      const { closeDialogue } = await import('/src/boogler/dialogue.js');
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
      I.select(I.slotOf('shovel'));
      play.booglerTalk();
      const offeredShovel = await pick('a shovel');
      const refused = await says('Keep it');
      const keptShovel = I.has('shovel');
      closeDialogue();
      I.take('mango');
      play.booglerTalk();
      const offeredMango = await pick('a mango');
      await says('monopoly');
      return { offeredShovel, refused, keptShovel, offeredMango, mangoGone: !I.has('mango') };`);
    t.check(
      'The Boogler refuses the shovel and takes the mango from your hand',
      talk.offeredShovel && talk.refused && talk.keptShovel && talk.offeredMango && talk.mangoGone,
      JSON.stringify(talk),
    );
    await g.eval(`(await import('/src/boogler/dialogue.js')).closeDialogue();`);

    // Seeds go in off the dirt patch: find open grass near home, plant, water, then stand where it grows.
    const spot = await g.eval(`${INV}
      const { CELL, HALF, GRID_RES } = await import('/src/constants.js');
      const G = await import('/src/adapters/mushroom-garden.js');
      const { PATCH } = await import('/src/sim/mushrooms.js');
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
      const { garden } = await import('/src/adapters/mushroom-garden.js');
      return garden.plots.some((p) => p.i === ${spot.i} && p.j === ${spot.j}); })()`);
    t.check('a seed goes in off the dirt patch', hasPlot >= 0, `cell ${spot.i},${spot.j}`);
    await g.eval(`${INV} I.take('can'); H.useDown(); H.useUp();`);
    await g.wait(1.5);
    // Stand on the seed while it grows.
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
      const { world } = window.boogle;
      const near = world.bodies.filter((b) => b.mass === 0 && Math.hypot(b.position.x - ${spot.x}, b.position.z - ${spot.z}) < 0.1);
      return near.map((b) => b.shapes.length);`);
    t.check(
      'the growing mushroom has a collider',
      solid.some((n) => n === 2),
      JSON.stringify(solid),
    );

    // The frisbee waits on the lighthouse deck; throw it off and it glides far.
    const { FRISBEE } = await g.eval(
      `const L = await import('/src/pois/lighthouse/index.js'); return { FRISBEE: L.FRISBEE_SPOT };`,
    );
    await g.eval(`window.__debugCam.clear();`);
    await g.eval(TP(FRISBEE.x, FRISBEE.z, FRISBEE.y + 0.8));
    await g.wait(0.6);
    const perched = await g.eval(`return window.boogle.gifts.items.some((it) => it.src === 3);`);
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
      `(async () => { const { giftIndex } = await import('/src/sim/gift-catalog.js');
        return window.boogle.gifts.items.some((it) => it.src === 2 && it.kind === giftIndex('frisbee')); })()`,
      { timeout: 20000 },
    );
    const dist = await g.eval(`
      const { CELL, HALF } = await import('/src/constants.js');
      const { giftIndex } = await import('/src/sim/gift-catalog.js');
      const it = window.boogle.gifts.items.find((it) => it.src === 2 && it.kind === giftIndex('frisbee'));
      return it ? Math.hypot(it.i * CELL - HALF - 6, HALF - it.j * CELL + 58) : -1;`);
    t.check(
      'the frisbee glides far from the lighthouse',
      fris >= 0 && dist > 20,
      `${dist?.toFixed?.(1)} m; ${flight.sheet}`,
    );
    t.check(
      'no page errors or failed edits',
      !g.errors.length && !consoleErrors.length,
      [...g.errors, ...consoleErrors].join(' | '),
    );

    // ------------------------------------------------------------ on a phone, portrait
    const thumb = await t.open({ name: 'thumb', hud: true, touch: true, size: [390, 844] });
    const one = await thumb.waitFor(
      when(
        `shown('.hotbar') &&
          [...document.querySelectorAll('.hotbar-slot')].filter((b) => b.getClientRects().length).length === 1`,
      ),
    );
    t.check('on touch a new player sees one slot (the shovel), not eight', one >= 0, `${one} ms`);

    await thumb.eval(`${INV} ${TP(14, 24)} I.select(I.slotOf('shovel'));`);
    const dig = await thumb.waitFor(
      when(`label() === 'Dig' && shown('.tbtn.pile') && shown('.tbtn.flat') && !shown('.tbtn.toss') && !throws()`),
    );
    const tossShovel = await thumb.eval(
      `${INV} return { toss: H.throwDown(), held: I.heldId(), charging: window.boogle.me.charging };`,
    );
    t.check(
      'holding the shovel: Dig, Pile and Flatten, no Toss, and it cannot be thrown',
      dig >= 0 && !tossShovel.toss && tossShovel.held === 'shovel' && !tossShovel.charging,
      `${dig} ms; ${JSON.stringify(tossShovel)}`,
    );

    await thumb.eval(`${INV} I.take('mango');`);
    const mango = await thumb.waitFor(when(`label() === 'Throw' && throws() && !shown('.tbtn.toss')`));
    const away = await thumb.eval(`${INV} return H.interactTarget()?.id ?? null;`);
    t.check('holding a mango: the main button throws and Toss hides', mango >= 0, `${mango} ms; in reach: ${away}`);

    await thumb.wait(0.4);
    const portrait = await thumb.eval(LAYOUT);
    const portraitShot = await thumb.still('touch-portrait');
    t.check(
      'portrait: the hotbar clears the brand, roster, net pill and buttons',
      portrait.checked >= 4 && !portrait.hit.length,
      `${JSON.stringify(portrait)}; ${portraitShot}`,
    );

    // An old save that lost the shovel: Pile shows, and a tap hands a new one back.
    await thumb.eval(`${INV} I.select(I.slotOf('shovel')); I.useOne();`);
    const lost = await thumb.waitFor(when(`document.body.classList.contains('no-shovel') && shown('.tbtn.pile')`));
    await thumb.eval(`${press('.tbtn.pile', 'pointerdown')} ${press('.tbtn.pile', 'pointerup')}`);
    const back = await thumb.waitFor(
      `(async () => { ${INV} return I.heldId() === 'shovel' && !document.body.classList.contains('no-shovel'); })()`,
    );
    t.check('without a shovel, Pile shows and gives it back', lost >= 0 && back >= 0, `${lost} ms, ${back} ms`);

    // Next to the ball with the shovel out, the main button still digs (the ball would be the interact pick). Stand in
    // the middle of a patch of diggable sand, looking down at your feet.
    const beach = await thumb.eval(`
      const { CELL, HALF } = await import('/src/constants.js');
      const { mask, n } = window.boogle.sync.terrain;
      const sandy = (i, j) => {
        for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) if (!mask[(i + a) * n + j + b]) return false;
        return true;
      };
      for (let r = 0; r < 80; r++) for (let di = -r; di <= r; di++) for (const dj of [-r, r]) {
        const i = 190 + di, j = 186 + dj;
        if (sandy(i, j)) return { i, j, x: i * CELL - HALF, z: HALF - j * CELL };
      }
      return null;`);
    if (!t.check('found a patch of diggable sand for the phone', !!beach, JSON.stringify(beach))) return;
    await thumb.eval(`${TP(beach.x, beach.z)} ${AIM(0, -0.9)}`);
    const aimed = await thumb.waitFor(`(async () => {
      const { shovel } = await import('/src/world/terrain-edits.js');
      return !!shovel.target && document.querySelector('.shovel-reason')?.hidden !== false; })()`);
    const near = await thumb.eval(`${INV}
      const { ball } = await import('/src/physics/ball.js');
      const { teleport } = await import('/src/physics/physics.js');
      const p = window.boogle.me.body.position;
      if (ball.mine) {
        teleport(ball.body, p.x + 0.8, p.y + 0.3, p.z + 0.4);
        ball.disp.p.copy(ball.body.position);
      }
      return { mine: ball.mine, pick: H.interactTarget()?.id ?? null, touch: H.touchTarget()?.id ?? null };`);
    const digLabel = await thumb.waitFor(when(`label() === 'Dig' && !shown('.prompt')`));
    const sum = `(() => { let t = 0; for (const d of window.boogle.sync.terrain.delta) t += d; return t; })()`;
    const sandBefore = await thumb.eval(`return ${sum};`);
    await thumb.eval(press('#btn-grab', 'pointerdown'));
    await thumb.wait(1);
    await thumb.eval(press('#btn-grab', 'pointerup'));
    const lowered = await thumb.waitFor(`${sum} < ${sandBefore}`, { timeout: 5000 });
    const digShot = await thumb.still('touch-dig-by-ball');
    const sandAfter = await thumb.eval(`return ${sum};`);
    t.check(
      'next to the ball, the shovel button says Dig and digs',
      near.pick === 'ball' && !near.touch && digLabel >= 0 && lowered >= 0,
      `${JSON.stringify(near)}; aimed ${aimed} ms, label ${digLabel} ms; sand ${sandBefore}->${sandAfter}; ${digShot}`,
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
    t.check('no page errors on touch', !thumb.errors.length, thumb.errors.join(' | '));
  },
};
