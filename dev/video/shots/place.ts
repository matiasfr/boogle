// A real place (?proto=place, src/proto/place/; ec7fb2f, ba717dd, a3ad0b9), behind its flag: the sign at spawn, waking the
// stranded track layer, chopping timber, stocking a station, the machine laying those logs as track and trestle, the
// train's crates craned into the forge, and the lit forge pouring rails. Recorded through the card's look variant
// (&v=look&look=all). Staging goes through window.__place, the same handle as dev/look/evals/place-job.ts.
import type { ClipGame, Shot } from '../clip.ts';

// Page helpers: the place, the player, and putting the player somewhere on its land.
const PRE = `const P = window.__place;
  const { me, cam } = await import('/src/player/player.ts');
  const { teleport } = await import('/src/physics/engine.ts');
  const hands = await import('/src/player/hands.ts');
  const O = P.ORIGIN.x;
  const [L1, L2] = P.lines;
  const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
  const putW = (x, y, z, yaw, pitch = -0.1) => {
    teleport(me.body, x, y, z); me.body.velocity.set(0, 0, 0); cam.yaw = me.yaw = yaw; cam.pitch = pitch;
  };
  const put = (x, z, yaw, pitch = -0.1, up = 1.2) => putW(x, P.H(x, z) + up, z, yaw, pitch);`;
const PRESS = `const h = await import('/src/player/hands.ts'); h.interactDown(); h.interactUp();`;
// The prototype's own panel stays out of the footage, and its objective line, where a reel's caption goes (the
// caption says it); the numbers and the log count stay in.
const CLEAN = `const s = document.createElement('style');
  s.textContent = '.place-proto, .place-objective { display: none !important }';
  document.head.append(s);`;
const FOLLOW = `window.__debugCam?.clear();`;

// Polls page state in page time, so it works before and after the clock is paused.
async function until(g: ClipGame, expr: string, seconds = 60) {
  for (let t = 0; t < seconds; t += 0.25) {
    if (await g.eval(`${PRE} return !!(${expr});`)) return true;
    await g.wait(0.25);
  }
  console.log(`  (timed out waiting for ${expr})`);
  return false;
}

export default {
  about: 'the place prototype: sign, wake, chop, stock a station, laying track and trestle, the crane and the forge',
  query: 'proto=place&tod=0.07&v=look&look=all',
  async run(c) {
    const out = [];
    const open = async (room: string) => {
      const g = await c.open({ room: 'proto-place-' + room, name: 'Pip', hud: 'play' });
      await g.eval(CLEAN);
      await until(g, 'P && me.body');
      await g.wait(2);
      await g.eval(`${PRE} P.startOver();`);
      await g.wait(1);
      return g;
    };

    // 1. The sign at spawn: what to do, the path, the half-built forge and the stub. Stand, then set off.
    {
      const g = await open('sign');
      await g.eval(FOLLOW);
      await g.wait(2);
      out.push(
        await g.record('place-sign', {
          seconds: 8,
          each: async (t, k) => {
            if (k === 75) await g.down('KeyW');
            if (k === 230) await g.up('KeyW');
          },
        }),
      );
      // Past it all: the dark island with the broken ring, across the sea from the ridge.
      const fy = (await g.eval(`${PRE} put(O + 40, -196, yawTo(O + 40, -196, O + 330, -1120), 0.02);
        return P.H(O + 40, -196);`)) as number;
      await g.wait(2);
      // Out ahead of the player and the ridge's pines, a slow push toward the far island.
      const [ux, uz] = [290 / Math.hypot(290, 924), -924 / Math.hypot(290, 924)];
      out.push(
        await g.record('place-far', {
          seconds: 7,
          each: async (t) => {
            const d = 6 + (t / 7) * 10;
            await g.view({ cam: [1040 + ux * d, fy + 5, -196 + uz * d], look: [1330, fy + 6, -1120] });
          },
        }),
      );
      await g.close();
    }

    // 2. Chop: the machine awake, three strokes fell a tree and its logs arc to your back. Filmed side-on.
    {
      const g = await open('chop');
      // The tree nearest station 1, standing between it and the station.
      const [tx, tz, px, pz, gy] = (await g.eval(`${PRE}
        P.wake();
        const st = L1.stations[0];
        let t = null, bd = Infinity;
        for (const tr of P.TREES) {
          if (tr.fall >= 0) continue;
          const d = Math.hypot(tr.x - st.x, tr.z - st.z);
          if (d < bd) { bd = d; t = tr; }
        }
        const dl = Math.hypot(st.x - t.x, st.z - t.z), dx = (st.x - t.x) / dl, dz = (st.z - t.z) / dl;
        const x = t.x + dx * 2.4, z = t.z + dz * 2.4;
        put(x, z, yawTo(x, z, t.x, t.z), -0.1);
        return [t.x, t.z, x, z, P.H(x, z)];`)) as number[];
      await g.wait(1.5);
      const dl = Math.hypot(tx! - px!, tz! - pz!);
      const [sx, sz] = [(tz! - pz!) / dl, -(tx! - px!) / dl]; // side-on to the swing
      const mx = (tx! + px!) / 2 + (px! - tx!) * 0.15,
        mz = (tz! + pz!) / 2 + (pz! - tz!) * 0.15;
      out.push(
        await g.record('place-chop', {
          seconds: 7,
          each: async (t, k) => {
            if (k === 20 || k === 50 || k === 80 || k === 130 || k === 160) await g.eval(PRESS);
            const d = 6.5 - t * 0.12;
            await g.view({
              cam: [mx + sx * d + (px! - tx!) * 0.35, gy! + 2.3, mz + sz * d + (pz! - tz!) * 0.35],
              look: [mx, gy! + 1.6, mz],
            });
          },
        }),
      );
      await g.eval(FOLLOW);
      // A full back walked up to station 1's frame: the logs land in it one by one.
      await g.eval(`${PRE} const st = L1.stations[0]; P.back.logs = 12;
        const x = st.x + 7, z = st.z + 4; put(x, z, yawTo(x, z, st.x, st.z), -0.2);`);
      await g.wait(1);
      out.push(
        await g.record('place-stack', {
          seconds: 7,
          each: async (t, k) => {
            if (k === 15) await g.down('KeyW');
            if (k === 45) await g.up('KeyW');
          },
        }),
      );
      await g.close();
    }

    // 3. Laying: station 2 full, the machine takes its logs and lays across the gorge, bents first, then deck and rails.
    {
      const g = await open('lay');
      await g.eval(`${PRE} P.wake(); P.skipDelivery();`);
      await until(g, `P.run.mode === 'idle'`, 90);
      await g.eval(`${PRE} P.skipDelivery();`);
      await until(g, `P.run.mode === 'laying'`, 60);
      // Riding the machine's deck (the card's "you can ride it"), so the sun's shadows follow it too.
      await g.eval(`${PRE} const f = P.machine.flatbed, lo = P.machine.loco;
        putW(f.x + (lo.x - f.x) * 0.22, f.y + 1.2, f.z + (lo.z - f.z) * 0.22, yawTo(lo.x, lo.z, f.x, f.z), -0.2);`);
      const SIDE = `${PRE} const f = P.machine.flatbed, lo = P.machine.loco;
        return [f.x, f.y, f.z, lo.x, lo.z];`;
      out.push(
        await g.record('place-trestle', {
          seconds: 14,
          each: async (t) => {
            const [fx, fy, fz, lx, lz] = (await g.eval(SIDE)) as number[];
            const dl = Math.hypot(lx! - fx!, lz! - fz!) || 1;
            const ux = (lx! - fx!) / dl,
              uz = (lz! - fz!) / dl;
            const d = 22 - t * 0.3;
            await g.view({
              cam: [fx! - uz * d + ux * 6, fy! + 7, fz! + ux * d + uz * 6],
              look: [fx! + ux * 6, fy! - 3, fz! + uz * 6],
            });
          },
        }),
      );
      await g.close();
    }

    // 4. The first train's crates craned straight into the forge, piece by piece; then the lit forge pours rails.
    {
      const g = await open('forge');
      await g.eval(`${PRE} P.skipForge();`);
      await g.wait(0.5);
      await g.eval(`${PRE} put(O - 72, -6, yawTo(O - 72, -6, O - 83, -8), -0.08);`);
      await g.eval(FOLLOW);
      await until(g, `P.forge.crates > 0 || P.dock.list.length > 0`, 60);
      await g.wait(1);
      out.push(await g.record('place-crane', { seconds: 14 }));
      // The next train's crates finish it: wait until the last one is on the hook, then watch it light and pour rails.
      await until(g, `P.forge.crates >= P.TUNE.forgeCost - 1`, 240);
      const O = 1000;
      // From the north, between the heap's board and the crane: the forge's mouth and the rack in front of it.
      await g.view({ cam: [O - 82, 24, 6], look: [O - 85.5, 20, -9] });
      out.push(
        await g.record('place-lit', {
          seconds: 16,
          each: async (t) => {
            const a = t / 16;
            await g.view({ cam: [O - 82, 24 - a, 6 - a * 2], look: [O - 85.5, 20, -9] });
          },
        }),
      );
      console.log('  forge', await g.eval(`${PRE} return JSON.stringify(P.forge);`));
      await g.close();
    }
    return out;
  },
} satisfies Shot;
