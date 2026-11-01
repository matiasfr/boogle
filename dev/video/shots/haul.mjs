// The haul loop (0.1 groundwork: 9a888a5 piles, be256d8 stack, f3baeb7 palms give logs, e625724 work sites,
// e0b3190 the machine): shake palms for logs, carry a wobbly stack and spill it with a jump, pour it into a work site
// (sleepers pile up, your name goes on the plaque), build a helper hut, start the machine and watch it lay track.
const ROOM = 'cliphaul';

const R = `const { rules } = await import('/src/world/game-world.ts');
  const { identity } = await import('/src/player/identity.ts');`;
// Put the player on the ground at (x, z), still, facing yaw.
const TP = (x, z, yaw) => `
  const { teleport } = await import('/src/physics/physics.ts');
  const { groundHeight } = await import('/src/adapters/terrain.ts');
  const b = window.boogle.me.body;
  teleport(b, ${x}, groundHeight(${x}, ${z}) + 0.6, ${z});
  b.velocity.set(0, 0, 0);
  ${yaw === undefined ? '' : `window.boogle.me.yaw = ${yaw};`}
  return groundHeight(${x}, ${z});`;
// The palm with logs nearest (x, z): its index and trunk position.
const PALM = (x, z) => `${R}
  const { trees } = await import('/src/render/props.ts');
  let best = null;
  rules.sources.list().forEach((_, t) => {
    if (!rules.sources.charges(t) || !trees[t]) return;
    const d = Math.hypot(trees[t].x - ${x}, trees[t].z - ${z});
    if (!best || d < best.d) best = { t, d, x: trees[t].x, z: trees[t].z };
  });
  return best;`;
// Fill this player's stack with logs straight from the far palms (no camera on them), up to n.
const FILL = (n) => `${R}
  const want = Math.ceil((${n} - rules.stacks.count(identity.pid)) / 4);
  let k = 0;
  for (let id = rules.sources.list().length - 1; id >= 0 && k < want; id--)
    if (rules.sources.charges(id)) { window.boogle.sync.submitEdit({ op: 'src.take', i: 0, j: 0, id }); k++; }
  return k;`;
const COUNT = `${R} return rules.stacks.count(identity.pid);`;
const ACT = `const a = (await import('/src/player/controls.ts')).actionById('interact'); a.down(); a.up();`;
const POS = `const p = window.boogle.me.body.position; return [p.x, p.y, p.z];`;

export default {
  about:
    'shake logs off a palm, carry and spill a wobbly stack, pour it into a work site, build a hut, run the machine',
  async run(c) {
    const g = await c.open({ name: 'Pip', room: ROOM, hud: 'play' });
    await g.wait(4);
    const out = [];

    // 1. Shake: beside a palm with logs, shake it twice; logs fly from its foot onto your back.
    const palm = await g.eval(PALM(14, 8));
    if (!palm) throw new Error('no palm with logs');
    const px = palm.x + 1.3,
      pz = palm.z + 0.5;
    // Face the palm (forward is (-sin yaw, -cos yaw)); the camera stands off to the side and a little behind, so the
    // stack on your back and the bundle at the palm's foot are both in view.
    const dx = palm.x - px,
      dz = palm.z - pz,
      dl = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dx, -dz);
    const y0 = await g.eval(TP(px, pz, yaw));
    const [sx, sz] = [dz / dl, -dx / dl]; // perpendicular to the facing
    const mx = (px + palm.x) / 2,
      mz = (pz + palm.z) / 2;
    out.push(
      await g.record('haul-shake', {
        seconds: 6,
        each: async (t, k) => {
          if (k < 20 && k % 4 === 0) await g.eval(TP(px, pz, yaw));
          if (k === 30) await g.eval(ACT); // E on the bundle: the first 4 logs
          // the bundle's second charge
          if (k === 95) await g.eval(`window.boogle.sync.submitEdit({ op: 'src.take', i: 0, j: 0, id: ${palm.t} });`);
          const d = 5 - t * 0.15,
            back = 1.6 - t * 0.1;
          await g.view({
            cam: [mx + sx * d - (dx / dl) * back, y0 + 1.9, mz + sz * d - (dz / dl) * back],
            look: [mx, y0 + 0.9, mz],
          });
        },
      }),
    );

    // 2. Carry and spill: a tall stack sways as you walk; a jump knocks the top pieces into a pile behind you.
    await g.eval(FILL(40));
    await g.wait(3);
    console.log('haul-carry stack', await g.eval(COUNT));
    const cx = 18,
      cz = 14;
    await g.eval(TP(cx, cz, Math.PI / 2));
    // W walks along the camera's heading: point it at -x
    await g.eval(`const { cam } = await import('/src/player/player.ts'); cam.yaw = Math.PI / 2; cam.pitch = -0.2;`);
    out.push(
      await g.record('haul-carry', {
        seconds: 7,
        each: async (t, k) => {
          if (k === 6) await g.down('KeyW');
          if (k === 95) await g.down('Space');
          if (k === 99) await g.up('Space');
          if (k === 170) await g.up('KeyW');
          const [x, y, z] = await g.eval(POS);
          // side-on, a little ahead of the player, so the sway and the spill behind both read
          // wide enough for the whole 40-piece stack
          await g.view({ cam: [x - 1.8, y + 2.4, z + 8.5], look: [x - 0.6, y + 1.5, z] });
        },
      }),
    );

    // 3. Pour: stand in site 1's Track ring (8.6, 6) with a full stack; sleepers pile up and the plaque names you.
    await g.eval(TP(4, 12));
    await g.eval(FILL(60));
    await g.wait(2.5);
    // At the ring's left edge, so the sleepers piling up in its centre aren't behind you.
    const ty = await g.eval(TP(7.3, 6.3, 0));
    out.push(
      await g.record('haul-pour', {
        seconds: 10,
        each: async (t) => {
          // From the front, the Track ring low in frame and the plaque (11, 4.8) to the right.
          const a = -0.1 + t * 0.015;
          await g.view({
            cam: [9.8 + Math.sin(a) * 6.5, ty + 2.6, 6 + Math.cos(a) * 6.5],
            look: [9.6, ty + 0.9, 5.6],
          });
        },
      }),
    );

    // 4. Helper hut: refill and stand in the Helper ring (13.4, 6); a full ring builds the hut.
    await g.eval(TP(4, 12));
    await g.eval(FILL(40));
    await g.wait(2.5);
    const hy = await g.eval(TP(13.4, 6, 0));
    out.push(
      await g.record('haul-hut', {
        seconds: 7.5,
        each: async (t) => {
          const a = 0.25 + t * 0.02;
          await g.view({
            cam: [14.3 + Math.sin(a) * 6.5, hy + 2.6, 6.5 + Math.cos(a) * 6.5],
            look: [14.3, hy + 0.7, 6],
          });
        },
      }),
    );

    // 5. The machine: start it from the Track ring and follow it laying the section toward (10, -12). The run is
    // 50 s; the reel speeds it up.
    const my = await g.eval(TP(8.2, 7.4, 0));
    await g.wait(0.5);
    out.push(
      await g.record('haul-machine', {
        seconds: 52,
        each: async (t, k) => {
          // the Interact button's own op (E may pick The Boogler's Talk instead when he wanders by)
          if (k === 15) await g.eval(`window.boogle.sync.submitEdit({ op: 'site.run', i: 0, j: 0, s: 0 });`);
          if (k === 60) await g.eval(TP(15, 4)); // out of frame, keeping shadows near
          // Follow the machine down the line, from high on its side so the rails behind it read.
          const u = Math.min(1, Math.max(0, (t - 3) / 45));
          const lz = 6 - 18 * u,
            lx = 11 - 1 * u;
          await g.view({ cam: [lx + 8, my + 6.5, lz + 4], look: [lx, my + 0.4, lz + 1.5] });
        },
      }),
    );
    return out;
  },
};
