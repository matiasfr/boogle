// The Boogler friendship (ea29f9f): talk and give a present, ride him until he launches you.
import type { ClipGame, Shot } from '../clip.ts';
const ROOM = 'clipboog';
const seed = () => {
  localStorage.setItem('boogle.boogler', JSON.stringify({ pts: 18, pets: [], gifts: [], learned: [] }));
  localStorage.setItem(
    'boogle.hotbar',
    JSON.stringify([
      { id: 'seeds', n: 3 },
      { id: 'frisbee', n: 1 },
    ]),
  );
};
// Page code: put the player `d` metres from The Boogler at angle `a` (radians), or on his back with d = 0.
const STAND = (d: number, a: number) => `
  const { groundHeight } = await import('/src/island/terrain.ts');
  const { boogler } = window.boogle, b = window.boogle.me.body, p = boogler.disp;
  const x = p.x + Math.cos(${a}) * ${d}, z = p.z + Math.sin(${a}) * ${d};
  b.position.set(x, ${d} ? groundHeight(x, z) + 1 : boogler.center.y + 1.6, z);
  b.velocity.set(0, 0, 0);`;
// The camera `d` metres from The Boogler at angle `a`, `h` up, looking at him.
const AT = `const c = window.boogle.boogler.center; return [c.x, c.y, c.z];`;
const MID = `const c = window.boogle.boogler.center, p = window.boogle.me.body.position;
  return [(c.x + p.x) / 2, (c.y + p.y) / 2, (c.z + p.z) / 2, Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z)];`;
const RIDE_A = -1.2; // the side the ride is filmed from (keeps the palms out of the way)
const orbit =
  (g: ClipGame, a: number, d: number, h: number, lookUp = 0.3) =>
  async () => {
    const [x, y, z] = await g.eval(AT);
    await g.view({ cam: [x + Math.cos(a) * d, y + h, z + Math.sin(a) * d], look: [x, y + lookUp, z] });
  };
const pick = (g: ClipGame, re: RegExp) =>
  g.eval(
    `const b = [...document.querySelectorAll('.bd-opt')].find((b) => ${re}.test(b.textContent)); b?.click(); return !!b;`,
  );

export default {
  about: 'talk to The Boogler and give a present, walk off mid-talk, ride him and get launched',
  async run(c) {
    const g = await c.open({ room: ROOM, hud: 'play', init: `(${seed})('${ROOM}')` });
    await g.wait(3);
    const out = [];
    const a0 = 0;
    // His comically tall top hat (613629e, 104edef): a slow low orbit, the player out of frame.
    await g.eval(STAND(9, a0 + Math.PI));
    out.push(
      await g.record('boogler-hat', {
        seconds: 5,
        each: async (t) => {
          await orbit(g, a0 + 0.6 + t * 0.18, 4.6, 0.6, 0.9)();
        },
      }),
    );
    // Close the box, or the talk clip's booglerTalk() finds it open and does nothing.
    await g.eval(`document.querySelector('.bd-close')?.click()`);
    await g.wait(0.3);
    // Talk and give a present (he likes seeds).
    await g.eval(STAND(2, a0));
    out.push(
      await g.record('boogler-talk', {
        seconds: 7,
        each: async (t, k) => {
          if (k === 6) await g.eval(`(await import('/src/boogler/play.ts')).booglerTalk()`);
          if (k === 50) await pick(g, /brought/);
          if (k === 80) await pick(g, /seed/);
          if (k === 190) await pick(g, /.*/);
          // Side-on two-shot, The Boogler high in frame so the dialogue box (bottom centre) doesn't cover him.
          await orbit(g, a0 + 1.9 - t * 0.04, 5, 1.6, -0.2)();
        },
      }),
    );
    await g.key('Escape');
    await g.wait(1);
    // Walk off mid-story (adc2396): the game keeps playing while you talk, and stepping away ends it with his farewell.
    await g.eval(STAND(2, a0));
    await g.eval(`const { cam } = await import('/src/player/player.ts');
      cam.yaw = Math.atan2(Math.cos(${a0}), Math.sin(${a0})); cam.pitch = -0.2;`); // facing him: S walks away
    out.push(
      await g.record('boogler-walkoff', {
        seconds: 7.5,
        each: async (t, k) => {
          if (k === 6) await g.eval(`(await import('/src/boogler/play.ts')).booglerTalk()`);
          if (k === 60) await pick(g, /Where are you from/);
          if (k === 135) await g.down('KeyS');
          if (k === 190) await g.up('KeyS');
          // Wide side-on, so the walk away and his farewell bubble both read.
          const [x, y, z] = await g.eval(AT);
          const a = a0 + 1.9 - t * 0.03,
            d = 6 + Math.min(1, Math.max(0, t - 4.5)) * 2.5;
          await g.view({
            cam: [x + Math.cos(a) * d, y + 1.8, z + Math.sin(a) * d],
            look: [x + Math.cos(a0) * 1.8, y - 0.1, z + Math.sin(a0) * 1.8],
          });
        },
      }),
    );
    await g.eval(`document.querySelector('.bd-close')?.click()`);
    await g.wait(0.5);
    // Ride: stand on his back until he puffs up and launches us. The camera hugs the pair and widens as we fly.
    out.push(
      await g.record('boogler-ride', {
        seconds: 10,
        each: async (t, k) => {
          if (k < 6) await g.eval(STAND(0, 0));
          // Frame the rider and The Boogler together: close while he grumbles, wider once the rider flies.
          const [x, y, z, gap] = await g.eval(MID);
          const a = a0 + RIDE_A + t * 0.05,
            d = 5.5 + gap * 0.9;
          await g.view({
            cam: [x + Math.cos(a) * d, y + 1.2 + gap * 0.3, z + Math.sin(a) * d],
            look: [x, y + 0.3 - gap * 0.12, z],
          });
        },
      }),
    );
    return out;
  },
} satisfies Shot;
