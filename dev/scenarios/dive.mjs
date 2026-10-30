// The swim dive (src/features/feel.js, prototype flag `feel`): pad LT (the pile action, wrapped by feel.js) dives
// while swimming and you breach out when you let go; an LT pile hold carried from the shore into the water stops,
// while a Z (keyboard) pile hold keeps going as before. Waits on frames and state, not time, so a slow box only
// makes it slower.
const POS = `return window.boogle.me.body.position.y;`;
const HOLD = `return (await import('/src/world/terrain-edits.js')).shovel.hold;`;
const PILE = (down) => `(await import('/src/controls.js')).actionById('pile').${down ? 'down' : 'up'}();`;
const FRAMES = (n) => `for (let k = 0; k < ${n}; k++) await new Promise((r) => requestAnimationFrame(r));`;
const TP = (x, y, z) => `
  const { teleport } = await import('/src/physics.js');
  const b = window.boogle.me.body;
  teleport(b, ${x}, ${y}, ${z});
  b.velocity.set(0, 0, 0);`;
// Water 2.5-4 m deep at least 20 m from home, 1.2 m deep for 3 m around, and dry land (30 cm above the water)
// somewhere on the way back toward home.
const FIND = `
  const { groundHeight } = await import('/src/terrain.js');
  const { waterField } = await import('/src/water-field.js');
  const d = (x, z) => waterField.surfaceAt(x, z) - groundHeight(x, z);
  for (let r = 20; r < 90; r += 2)
    for (let k = 0; k < 32; k++) {
      const x = Math.cos(k * 0.196) * r, z = Math.sin(k * 0.196) * r;
      if (d(x, z) < 2.5 || d(x, z) > 4) continue;
      if ([[3, 0], [-3, 0], [0, 3], [0, -3]].some(([a, b]) => d(x + a, z + b) < 1.2)) continue;
      for (let s = r - 1; s > 2; s--) {
        const lx = Math.cos(k * 0.196) * s, lz = Math.sin(k * 0.196) * s;
        if (d(lx, lz) < -0.3) return { x, z, sy: waterField.surfaceAt(x, z), lx, lz, ly: groundHeight(lx, lz) + 0.6 };
      }
    }
  return null;`;

export default {
  about: 'pad LT dives while swimming and breaches; an LT pile hold stops in the water, Z keeps piling',
  timeout: 300000,
  async run(t) {
    const g = await t.open({ name: 'diver', hud: 'play' });
    await g.waitFor(`window.boogle.me.body && window.__proto?.on('feel')`);
    const at = await g.eval(FIND);
    t.check('found deep water with land behind it', !!at, JSON.stringify(at));
    if (!at) return;
    const { x, z, sy, lx, lz, ly } = at;
    const swim = async () => {
      await g.eval(TP(x, sy - 0.5, z));
      const ms = await g.waitFor(`window.boogle.me.swimming`, { timeout: 30000 });
      await g.eval(FRAMES(3)); // feel.js's per-frame guard has run
      return ms;
    };
    const land = () => g.eval(TP(lx, ly, lz) + FRAMES(3));

    // 1. LT while swimming dives, and letting go breaches out of the water.
    await swim();
    await g.eval(FRAMES(30)); // settle the bob
    const before = await g.eval(POS);
    await g.eval(PILE(true));
    const holdDown = await g.eval(HOLD);
    const sank = await g.waitFor(`window.boogle.me.body.position.y < ${before - 0.6}`, { timeout: 30000, step: 50 });
    await g.view({ cam: [x + 5, sy + 1, z + 5], look: [x, sy - 1, z] });
    const shot = await g.still('dive');
    await g.eval(`window.__debugCam.clear();`);
    t.check(
      'pad LT dives while swimming (no pile)',
      sank >= 0 && holdDown !== 'pile',
      `${sank} ms, hold ${holdDown}, ${shot}`,
    );
    await g.eval(PILE(false));
    const out = await g.waitFor(`window.boogle.me.body.position.y > ${sy}`, { timeout: 60000, step: 30 });
    t.check('letting go breaches out of the water', out >= 0, out + ' ms');

    // 2. LT held on the shore keeps piling there, but not once you are swimming.
    await land();
    await g.eval(PILE(true));
    const lt = await g.eval(HOLD);
    t.check('pad LT piles on land', lt === 'pile', String(lt));
    const sw = await swim();
    const wet = await g.eval(HOLD);
    t.check('an LT pile hold stops once you swim', sw >= 0 && wet !== 'pile', `swim ${sw} ms, hold ${wet}`);
    await g.eval(PILE(false));

    // 3. Z (the keyboard pile) carried into the water keeps piling, as before.
    await land();
    await g.down('KeyZ');
    await g.eval(FRAMES(2));
    const zLand = await g.eval(HOLD);
    const zs = await swim();
    const zWet = await g.eval(HOLD);
    await g.up('KeyZ');
    t.check(
      'a Z pile hold is untouched in the water',
      zs >= 0 && zLand === 'pile' && zWet === 'pile',
      `${zLand} -> ${zWet}`,
    );
  },
};
