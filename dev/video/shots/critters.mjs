// Critters (924924d): run at the gulls and they burst off the sand, drop the ball on the fish school and it scatters,
// fireflies over the mushroom garden at night.
import { STAND } from './_stand.mjs';

const SKY = (frac, phase = null) => `window.boogle.sky.preview(${frac}, ${phase})`;
// Hold W and Shift with the movement direction pointed at (x, z), or let go.
const RUN = (x, z, on) => `
  const { input } = await import('/src/player/input.js');
  const { cam } = await import('/src/player/player.js');
  const p = window.boogle.me.body.position;
  cam.yaw = Math.atan2(-(${x} - p.x), -(${z} - p.z));
  for (const k of ['KeyW', 'ShiftLeft']) ${on} ? input.keys.add(k) : input.keys.delete(k);`;
// The gulls start strung along 30 m of beach: gather them around the first one so the flock fits the frame, and
// return the spot plus the direction (from it) with the flattest dry run-up.
const FLOCK = `
  const { groundHeight } = await import('/src/adapters/terrain.js');
  const G = window.__gulls, c = G[0];
  const dry = (x, z) => { const h = groundHeight(x, z); return h > 0.4 && h < 2.4; };
  G.forEach((g, k) => {
    for (let t = 0; t < 20; t++) {
      const a = k * 2.4 + t, r = 0.8 + (k % 3) * 0.7 + t * 0.1;
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      if (k && !dry(x, z)) continue;
      if (k) { g.x = x; g.z = z; }
      g.y = groundHeight(g.x, g.z); g.state = 'idle';
      break;
    }
  });
  let best = 0, bd = 1e9;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    let worst = 0;
    for (let r = 2; r <= 12; r += 2) worst = Math.max(worst, Math.abs(groundHeight(c.x + Math.cos(a) * r, c.z + Math.sin(a) * r) - c.y));
    if (worst < bd) (bd = worst), (best = a);
  }
  return [c.x, c.y, c.z, best];`;
// The critters place themselves with Math.random: seed it (mulberry32) so every take films the same flock and school.
const SEEDED = `(() => { let a = 20261029; Math.random = () => { a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })()`;
// Fish in deep water vanish into the blue: move the school to clear water 0.7-1.5 m deep near its home.
const SHALLOWS = `
  const { groundHeight } = await import('/src/adapters/terrain.js');
  const { waterField } = await import('/src/physics/water-field.js');
  const { P, home } = window.__fish;
  const depth = (x, z) => waterField.surfaceAt(x, z) - groundHeight(x, z);
  for (let r = 0; r < 40; r += 1.5)
    for (let k = 0; k < 24; k++) {
      const x = home.x + Math.cos(k * 0.26) * r, z = home.z + Math.sin(k * 0.26) * r;
      if (depth(x, z) < 0.7 || depth(x, z) > 1.5 || depth(x + 2, z) < 0.5 || depth(x - 2, z) < 0.5) continue;
      P.forEach((f, i) => { f.x = x + ((i % 6) - 2.5) * 0.45; f.z = z + (Math.floor(i / 6) - 2.5) * 0.45; });
      return [x, z];
    }
  return null;`;
const SCHOOL = `const { P } = window.__fish; const n = P.length;
  return [P.reduce((s, f) => s + f.x, 0) / n, P.reduce((s, f) => s + f.y, 0) / n, P.reduce((s, f) => s + f.z, 0) / n];`;

export default {
  about: 'gulls scatter from a running player, fish scatter from the ball, fireflies at night',
  async run(c) {
    const g = await c.open({ room: 'clipcritters', hud: false, init: SEEDED });
    await g.eval(SKY(0.32));
    await g.wait(3);
    const out = [];

    // Gulls: the player starts 11 m off the flock and sprints through it. The camera stands to the side, low, and
    // tilts up as they take off.
    const [fx, fy, fz, away] = await g.eval(FLOCK);
    const sx = fx + Math.cos(away) * 11,
      sz = fz + Math.sin(away) * 11;
    await g.eval(STAND(sx, sz));
    await g.wait(0.5);
    await g.eval(FLOCK);
    const side = away + 1.25;
    out.push(
      await g.record('critters-gulls', {
        seconds: 6.5,
        each: async (t, k) => {
          if (k === 24) await g.eval(RUN(fx, fz, true));
          if (k === 75) await g.eval(RUN(0, 0, false));
          const up = c.ease.inOut(Math.min(1, Math.max(0, (t - 1.2) / 2.5)));
          await g.view({
            cam: [fx + Math.cos(side) * 7, fy + 1 + up * 0.8, fz + Math.sin(side) * 7],
            look: [fx + Math.cos(away) * 2, fy + 0.6 + up * 2.4, fz + Math.sin(away) * 2],
          });
        },
      }),
    );

    // Fish: the school in clear shallow water seen from close above, then the ball drops into the middle of it.
    const spot = await g.eval(SHALLOWS);
    if (!spot) throw new Error('no clear shallows near the fish');
    await g.eval(STAND(spot[0] + 14, spot[1] - 14));
    await g.eval(SHALLOWS);
    await g.wait(1);
    let cx, cy, cz;
    out.push(
      await g.record('critters-fish', {
        seconds: 5.5,
        each: async (t, k) => {
          if (k <= 40) [cx, cy, cz] = await g.eval(SCHOOL); // follow the school until the drop, then hold still
          if (k === 40)
            await g.eval(`
              const { ball, claimBall, setBallMode } = await import('/src/physics/ball.js');
              const { teleport } = await import('/src/physics/physics.js');
              if (!ball.mine) claimBall(false);
              setBallMode('sim');
              teleport(ball.body, ${cx}, 3, ${cz});
              ball.body.velocity.set(0, -6, 0);`);
          // Close and low: deeper or farther, the water swallows the fish.
          await g.view({ cam: [cx - 2.2, cy + 3, cz + 2.2], look: [cx, cy, cz] });
        },
      }),
    );

    // Fireflies: a full-moon night over the mushroom garden, a crane down from above so the dark soil is the backdrop.
    const garden = await g.eval(`
      const { PATCH } = await import('/src/sim/mushrooms.ts');
      const { CELL, HALF } = await import('/src/constants.js');
      const { groundHeight } = await import('/src/adapters/terrain.js');
      const x = (PATCH.i0 + PATCH.w / 2) * CELL - HALF, z = HALF - (PATCH.j0 + PATCH.h / 2) * CELL;
      return [x, groundHeight(x, z), z];`);
    const [gx, , gz] = garden;
    await g.eval(STAND(gx + 16, gz - 16));
    await g.eval(SKY(0.8, 0.5));
    await g.wait(6);
    // They're spread thin: read their positions off the point cloud and film the firefly with the most company.
    const [hx, hy, hz] = await g.eval(`
      const { scene } = window.boogle;
      let pts = null;
      scene.traverse((o) => { if (o.isPoints && o.material.blending === 2 && o.geometry.attributes.color) pts = o; });
      const a = pts.geometry.attributes.position.array, n = a.length / 3;
      let best = 0, bn = -1;
      for (let i = 0; i < n; i++) {
        let m = 0;
        for (let j = 0; j < n; j++) if (Math.hypot(a[i * 3] - a[j * 3], a[i * 3 + 2] - a[j * 3 + 2]) < 4) m++;
        if (m > bn) (bn = m), (best = i);
      }
      return [a[best * 3], a[best * 3 + 1], a[best * 3 + 2]];`);
    out.push(
      await g.record('critters-fireflies', {
        seconds: 7,
        each: async (t) => {
          // Low and looking slightly up, so they glow against the night sky and the dark trees, not the soil.
          const a = 0.8 + t * 0.06;
          await g.view({ cam: [hx + Math.cos(a) * 4, hy - 0.4, hz + Math.sin(a) * 4], look: [hx, hy + 0.4, hz] });
        },
      }),
    );
    return out;
  },
};
