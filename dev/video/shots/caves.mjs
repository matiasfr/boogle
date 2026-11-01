// The caves (b0b3daf): walk in at the south mouth, the old mine, the ball floating on the underground pond, the wine
// cellar. Places come from the cave network, so the shot follows it when it moves.
import { NODES, MOUTHS, POND } from '../../../src/pois/caves/network.js';

const READY = `(async () => (await import('/src/pois/caves/index.js')).cavesReady())()`;
// Put the player at (x, y, z), still (y is the floor: inside the caves groundHeight is the hill above).
const AT = (x, y, z) => `
  const { teleport } = await import('/src/physics/physics.ts');
  const b = window.boogle.me.body;
  teleport(b, ${x}, ${y} + 1, ${z}); b.velocity.set(0, 0, 0);`;
// Walk towards (x, z) with the play camera behind: aim the camera that way, the move key does the rest.
const AIM = (x, z) => `
  const { cam } = await import('/src/player/player.ts');
  const p = window.boogle.me.body.position;
  const yaw = Math.atan2(-(${x} - p.x), -(${z} - p.z));
  let d = yaw - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
  cam.yaw += d * 0.12; cam.pitch = -0.12;
  return Math.hypot(${x} - p.x, ${z} - p.z);`;
const ring = (c, a, d, h) => [c[0] + Math.cos(a) * d, c[1] + h, c[2] + Math.sin(a) * d];

export default {
  about: 'walk into the caves, the old mine, the ball on the underground pond, the wine cellar',
  async run(c) {
    const g = await c.open({ room: 'clipcaves', hud: false });
    await g.waitFor(READY, { timeout: 90000 });
    const out = [];
    const south = MOUTHS.find((m) => m.id === 'south');
    const hub = NODES.hub;

    // Walk in: from the trench outside the south mouth, through the tunnel, into the hub, on the play camera.
    const route = [
      [south.x + south.ox * 1, south.z + south.oz * 1],
      [south.x - south.ox * 4, south.z - south.oz * 4],
      [hub.x + 2, hub.z + 2],
      [hub.x, hub.z],
    ];
    const sx = south.x + south.ox * 9,
      sz = south.z + south.oz * 9;
    await g.eval(`window.__debugCam?.clear();
      const { teleport } = await import('/src/physics/physics.ts');
      const { groundHeight } = await import('/src/adapters/terrain.js');
      const b = window.boogle.me.body; teleport(b, ${sx}, groundHeight(${sx}, ${sz}) + 0.6, ${sz}); b.velocity.set(0, 0, 0);
      const { cam } = await import('/src/player/player.ts'); cam.yaw = Math.atan2(${south.ox}, ${south.oz}); cam.pitch = -0.12;`);
    await g.wait(1.5);
    let w = 0,
      walking = false;
    out.push(
      await g.record('caves-walk-in', {
        seconds: 8,
        each: async (t) => {
          if (t > 0.6 && !walking && w < route.length) (await g.down('KeyW'), (walking = true));
          if (!walking) return;
          const d = await g.eval(AIM(...route[w]));
          if (d < 1.2 && ++w >= route.length) (await g.up('KeyW'), (walking = false));
        },
      }),
    );
    if (walking) await g.up('KeyW');

    // The old mine: rails, the minecart, ore veins and timber supports, the camera drifting round the chamber.
    // From beside the lantern, past the minecart towards the sign and the daylight of the east mouth.
    const mn = NODES.mine;
    await g.eval(AT(mn.x + 0.5, mn.y, mn.z + 4.9)); // behind the camera
    await g.wait(0.5);
    out.push(
      await g.record('caves-mine', {
        seconds: 6,
        each: c.move(
          { cam: [mn.x - 1, mn.y + 2.4, mn.z + 4], look: [mn.x + 1, mn.y + 0.8, mn.z - 2] },
          { cam: [mn.x + 2, mn.y + 2.0, mn.z + 3.6], look: [mn.x + 3, mn.y + 1, mn.z - 2.5] },
          6,
        ),
      }),
    );

    // The pond: the ball dropped onto the water bobs and floats, crystals and glowing mushrooms round it.
    await g.eval(AT(hub.x, hub.y, hub.z)); // out of frame
    await g.eval(`const { ball, claimBall } = await import('/src/physics/ball.ts');
      const { teleport } = await import('/src/physics/physics.ts');
      claimBall(false);
      teleport(ball.body, ${POND.x - 0.6}, ${POND.level + 3}, ${POND.z + 0.4}); ball.body.velocity.set(0, 0, 0);
      ball.disp.p.copy(ball.body.position);`);
    const pond = [POND.x, POND.level + 0.4, POND.z];
    out.push(
      await g.record('caves-pond', {
        seconds: 6,
        each: (t) => g.view({ cam: ring(pond, 0.6 + t * 0.06, 6.2, 2.6 - t * 0.15), look: pond }, 72),
      }),
    );

    // The wine cellar: barrel racks, the bottle shelf, the cask and the candlelit table, a slow push down the vault.
    const cel = NODES.cellar;
    await g.eval(AT(hub.x, hub.y, hub.z));
    await g.wait(0.5);
    out.push(
      await g.record('caves-cellar', {
        seconds: 6,
        each: c.move(
          { cam: [cel.x + 2.2, cel.y + 2.0, cel.z + 1.7], look: [cel.x - 2.5, cel.y + 0.8, cel.z - 1] },
          { cam: [cel.x + 1.2, cel.y + 1.7, cel.z + 1.4], look: [cel.x - 4, cel.y + 0.9, cel.z - 1.6] },
          6,
        ),
      }),
    );
    return out;
  },
};
