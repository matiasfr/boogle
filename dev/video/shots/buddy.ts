// The Buddy (2dc9b43, 6a8976d): the default character, plump and soft-jointed, with a blink and a jump. It runs at the
// camera (W, with the player camera turned the run's way), jumps twice, then stands for a slow arc round its face.
import type { Shot } from '../clip.ts';
import lighthouse from '../../../src/pois/lighthouse/site.ts';

const POS = `const p = window.boogle.me.body.interpolatedPosition ?? window.boogle.me.body.position; return [p.x, p.y, p.z];`;

export default {
  about: 'the Buddy runs at the camera and jumps, then a close arc round its face',
  async run(c) {
    const g = await c.open({ room: 'clipbuddy', hud: false });
    await g.wait(3);
    const p0: number[] = await g.eval(POS);
    // Run inland, toward the lighthouse.
    let dx = lighthouse.x - p0[0]!,
      dz = lighthouse.z - p0[2]!;
    const n = Math.hypot(dx, dz);
    dx /= n;
    dz /= n;
    // Movement follows the player camera's yaw, not the debug camera: face the run's way, then W.
    const yaw = Math.atan2(-dx, -dz);
    await g.eval(
      `const { cam } = await import('/src/player/player.ts'); cam.yaw = ${yaw}; window.boogle.me.yaw = ${yaw};`,
    );
    await g.wait(0.5);
    const out = [];
    let cam: number[] | null = null;
    out.push(
      await g.record('buddy-run', {
        // Short: past about 2 s the run reaches the seed stand.
        seconds: 2.8,
        each: async (t, k) => {
          if (k === 6) await g.down('KeyW');
          if (k === 28) await g.key('Space');
          if (k === 48) await g.up('KeyW');
          const p: number[] = await g.eval(POS);
          // Ahead of it and a little to one side, at its height, looking back at it.
          const want = [p[0]! + dx * 4.5 - dz * 1.6, p[1]! + 0.9, p[2]! + dz * 4.5 + dx * 1.6];
          cam = cam ? cam.map((v, i) => v + (want[i]! - v) * 0.2) : want;
          await g.view({ cam, look: [p[0]!, p[1]! + 0.3, p[2]!] });
        },
      }),
    );
    const p: number[] = await g.eval(POS);
    out.push(
      await g.record('buddy-face', {
        seconds: 5,
        each: async (t) => {
          const a = Math.atan2(dz, dx) + 0.6 - t * 0.28; // swinging away from the stand
          await g.view({
            cam: [p[0]! + Math.cos(a) * 2.6, p[1]! + 0.7, p[2]! + Math.sin(a) * 2.6],
            look: [p[0]!, p[1]! + 0.4, p[2]!],
          });
        },
      }),
    );
    return out;
  },
} satisfies Shot;
