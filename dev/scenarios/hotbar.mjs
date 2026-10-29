// The hotbar: pick something up and it is in your hand; throw it and it lands for everyone; the beach ball rides on your
// back while you hold something else; The Boogler takes what you hold but not your shovel; seeds go in anywhere and a
// growing mushroom shoves you aside; the frisbee on the lighthouse deck glides far.
const TP = (x, z, y) => `
  const { teleport } = await import('/src/physics.js');
  const { groundHeight } = await import('/src/terrain.js');
  const b = window.boogle.me.body;
  teleport(b, ${x}, ${y ?? `groundHeight(${x}, ${z}) + 0.6`}, ${z});
  b.velocity.set(0, 0, 0);`;
const INV = `const I = await import('/src/inventory.js'); const H = await import('/src/hands.js');`;
const AIM = (yaw, pitch = 0) =>
  `const { cam } = await import('/src/player.js'); cam.yaw = ${yaw}; cam.pitch = ${pitch}; window.boogle.me.yaw = ${yaw};`;

export default {
  about: 'hold, throw and give what you pick up; plant anywhere; frisbee off the lighthouse',
  async run(t) {
    const g = await t.open({ name: 'holder', hud: 'play' });
    const consoleErrors = [];
    g.page.on('console', (m) => m.type() === 'error' && m.text().includes('[world]') && consoleErrors.push(m.text()));
    const start = await g.eval(`${INV} return { slots: I.inv.slots, sel: I.inv.sel };`);
    t.check('a new player starts with a shovel in slot 1', start.slots[0]?.id === 'shovel', JSON.stringify(start));

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
      const { ball } = await import('/src/ball.js');
      const { teleport } = await import('/src/physics.js');
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
      const play = await import('/src/boogler-play.js');
      const { closeDialogue } = await import('/src/boogler-dialogue.js');
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
    await g.eval(`(await import('/src/boogler-dialogue.js')).closeDialogue();`);

    // Seeds go in off the dirt patch: find open grass near home, plant, water, then stand where it grows.
    const spot = await g.eval(`${INV}
      const { CELL, HALF, GRID_RES } = await import('/src/constants.js');
      const G = await import('/src/mushroom-garden.js');
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
      const { garden } = await import('/src/mushroom-garden.js');
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
  },
};
