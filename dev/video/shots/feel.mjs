// The controller feel pass (8768e65): hold dig while swimming to dive, let go and breach out of the water.
// The dive goes through the dig action (the pad path feel.js wraps): the Q key also reaches the shovel and digs the
// shore while you dive.
const POS = `const p = window.boogle.me.body.position; return [p.x, p.y, p.z];`;
const DIG = (down) =>
  `(await import('/src/controls.js')).listActions().find((a) => a.id === 'dig').${down ? 'down' : 'up'}()`;
// Water 2.5-4 m deep near home, at least 1.2 m deep for 3 m around (the shared water region hugs the coast).
const DEEP = `
  const { groundHeight } = await import('/src/terrain.js');
  const { waterField } = await import('/src/water-field.js');
  const d = (x, z) => waterField.surfaceAt(x, z) - groundHeight(x, z);
  for (let r = 20; r < 90; r += 2)
    for (let k = 0; k < 32; k++) {
      const x = Math.cos(k * 0.196) * r, z = Math.sin(k * 0.196) * r;
      if (d(x, z) < 2.5 || d(x, z) > 4) continue;
      if ([[3, 0], [-3, 0], [0, 3], [0, -3]].some(([a, b]) => d(x + a, z + b) < 1.2)) continue;
      return [x, waterField.surfaceAt(x, z), z];
    }
  return null;`;

export default {
  about: 'a dive underwater that breaches back out',
  async run(c) {
    const g = await c.open({ room: 'clipfeel', hud: false });
    await g.wait(3);
    const deep = await g.eval(DEEP);
    if (!deep) throw new Error('no deep water near home');
    const [dx, sy, dz] = deep;
    await g.eval(
      `const b = window.boogle.me.body; b.position.set(${dx}, ${sy + 0.5}, ${dz}); b.velocity.set(0, 0, 0);`,
    );
    await g.wait(2);
    // Side-on at the waterline, looking back toward the island.
    const a = Math.atan2(dz, dx);
    return [
      await g.record('feel-dive', {
        seconds: 5,
        each: async (t, k) => {
          if (k === 25) await g.eval(DIG(true));
          if (k === 55) await g.eval(DIG(false));
          const [x, , z] = await g.eval(POS);
          await g.view({
            cam: [x + Math.cos(a + 0.5) * 6, sy + 1.1, z + Math.sin(a + 0.5) * 6],
            look: [x, sy + 0.4, z],
          });
        },
      }),
    ];
  },
};
