// Mushrooms as a one-press toy (e3daf5d): a bag of seeds in hand, one press sprouts five big mushrooms in a zig-zag
// ahead, and you bounce along them.
import type { Shot } from '../clip.ts';

const INV = `const I = await import('/src/player/inventory.ts'); const H = await import('/src/player/hands.ts');`;
// Where you stand and which way you face: yaw 0 faces -z (forward is (-sin yaw, -cos yaw)).
const AIM = (yaw: number) =>
  `const { cam } = await import('/src/player/player.ts'); cam.yaw = ${yaw}; cam.pitch = -0.15; window.boogle.me.yaw = ${yaw};`;
const POS = `const p = window.boogle.me.body.position; return [p.x, p.y, p.z];`;

export default {
  about: 'take a bag of seeds, sprout five mushrooms with one press, bounce along them',
  async run(c) {
    const g = await c.open({ room: 'clipmush', hud: 'play' });
    await g.wait(3);
    const yaw = 2.4;
    await g.eval(`window.__debugCam?.clear(); ${AIM(yaw)} ${INV} I.take('seeds');`);
    await g.wait(1.5);
    const p0: number[] = await g.eval(POS);
    const fx = -Math.sin(yaw),
      fz = -Math.cos(yaw);
    // Side-on and a little behind, wide enough for the whole zig-zag (16 m ahead).
    const mid = [p0[0]! + fx * 8, p0[1]! + 1.5, p0[2]! + fz * 8];
    const cam = [mid[0]! + fz * 11 - fx * 5, mid[1]! + 4, mid[2]! - fx * 11 - fz * 5];
    // Movement follows the camera on screen, so the hop onto the first mushroom (4.5 m ahead) is placed: drop onto it
    // from a few metres up, drifting forward, and let it fling you.
    const first = [p0[0]! + fx * 4.5, p0[1]! + 4, p0[2]! + fz * 4.5];
    const DROP = `const { teleport } = await import('/src/physics/engine.ts'); const b = window.boogle.me.body;
      teleport(b, ${first[0]}, ${first[1]}, ${first[2]}); b.velocity.set(${fx * 1.2}, -2, ${fz * 1.2});`;
    let lookY = mid[1]!;
    return [
      await g.record('mushrooms-sprout', {
        seconds: 8,
        each: async (t, k) => {
          // A beat of the empty beach first, so the sprout isn't lost in a crossfade.
          if (k === 45) await g.eval(`${INV} H.useDown();`);
          if (k === 49) await g.eval(`${INV} H.useUp();`);
          if (k === 95) await g.eval(DROP);
          const p: number[] = await g.eval(POS);
          lookY += (Math.max(mid[1]!, p[1]! * 0.85 + mid[1]! * 0.15) - lookY) * 0.12;
          await g.view({ cam: [cam[0]!, cam[1]! + (lookY - mid[1]!) * 0.5, cam[2]!], look: [mid[0]!, lookY, mid[2]!] });
        },
      }),
    ];
  },
} satisfies Shot;
