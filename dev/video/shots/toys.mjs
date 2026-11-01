// The hotbar and the one interact button (89ce0dd, b22fa8b): walk up to a can, its Pick up prompt, into the hand and
// the hotbar, thrown; the frisbee on the lighthouse deck, picked up and glided off the hill.
const INV = `const I = await import('/src/player/inventory.ts'); const H = await import('/src/player/hands.ts');`;
const TP = (x, z, y) => `
  const { teleport } = await import('/src/physics/physics.ts');
  const { groundHeight } = await import('/src/adapters/terrain.ts');
  const b = window.boogle.me.body;
  teleport(b, ${x}, ${y ?? `groundHeight(${x}, ${z}) + 0.6`}, ${z});
  b.velocity.set(0, 0, 0);`;
const AIM = (yaw, pitch) =>
  `const { cam } = await import('/src/player/player.ts'); cam.yaw = ${yaw}; cam.pitch = ${pitch}; window.boogle.me.yaw = ${yaw};`;
// A can tossed onto the beach west of the court (the same cell the scenarios use).
const TOSS = `window.boogle.sync.submitEdit({ op: 'gift.toss', i: 230, j: 205, k: 1, y: -1, n: 5, l: [0, 100, 0, 0, 0, 0] })`;
const TOSSED = `window.boogle.gifts.items.some((it) => it.src === 0 && it.i === 230 && it.j === 205)`;
const ITEM = `const { CELL, HALF } = await import('/src/constants.ts');
  const it = window.boogle.gifts.items.find((it) => it.src === 0 && it.i === 230 && it.j === 205);
  return { x: it.i * CELL - HALF, z: HALF - it.j * CELL };`;
const press = (g, fn) => g.eval(`${INV} H.${fn}();`);

export default {
  about: 'pick up a can (prompt, hotbar) and throw it; glide the frisbee off the lighthouse deck',
  async run(c) {
    const g = await c.open({ room: 'cliptoys', hud: 'play' });
    await g.wait(3);
    const out = [];

    // The can: stand a few steps off, facing it; walk up (the prompt appears), E, then throw it inland.
    await g.eval(TOSS);
    await g.waitFor(TOSSED, { timeout: 30000 });
    await g.wait(1.5);
    const it = await g.eval(ITEM);
    const sx = it.x + 3.2,
      sz = it.z + 1.2;
    const yaw = Math.atan2(-(it.x - sx), -(it.z - sz));
    await g.eval(`window.__debugCam?.clear(); ${TP(sx, sz)} ${AIM(yaw, -0.3)}`);
    await g.wait(1);
    out.push(
      await g.record('toys-can', {
        seconds: 7,
        each: async (t, k) => {
          if (k === 6) await g.down('KeyW');
          if (k === 30) await g.up('KeyW');
          if (k === 66) (await press(g, 'interactDown'), await press(g, 'interactUp'));
          if (k === 110) await g.eval(AIM(yaw + 0.3, 0.1)); // up the hill, so the arc stays in view
          if (k === 125) await press(g, 'useDown');
          if (k === 160) await press(g, 'useUp');
        },
      }),
    );

    // The frisbee: it waits on the lighthouse deck; pick it up and glide it off the hill.
    const F = await g.eval(`return (await import('/src/pois/lighthouse/index.js')).FRISBEE_SPOT;`);
    // Facing +z (yaw 3.0), off the deck and down the hill: half a charge glides it well past the beach path.
    await g.eval(`${TP(F.x, F.z, F.y + 0.8)} ${AIM(3.0, -0.35)}`);
    await g.wait(1.2);
    // The thrown frisbee is the newest thing in the scene (src/adapters/gifts.ts startFlight); follow it till it lands.
    const GRAB = `const { scene } = await import('/src/render/scene.ts'); window.__fris = scene.children.at(-1);`;
    const POS = `const m = window.__fris; return m?.parent ? [m.position.x, m.position.y, m.position.z] : null;`;
    let cam = null,
      at = null;
    out.push(
      await g.record('toys-frisbee', {
        seconds: 7,
        each: async (t, k) => {
          if (k === 20) (await press(g, 'interactDown'), await press(g, 'interactUp'));
          if (k === 45) await g.eval(AIM(3.0, 0.12));
          if (k === 55) await press(g, 'useDown');
          if (k === 69) (await press(g, 'useUp'), await g.eval(GRAB));
          if (k < 70) return;
          // Chase from behind and above, easing after it; hold where it lands.
          const p = (await g.eval(POS)) ?? at;
          if (!p) return;
          at = p;
          const want = [p[0] + 2.6, p[1] + 2.2, p[2] - 4.2];
          cam = cam ? cam.map((v, i) => v + (want[i] - v) * 0.2) : [F.x + 1.5, F.y + 2.6, F.z - 3];
          await g.view({ cam, look: p });
        },
      }),
    );
    return out;
  },
};
