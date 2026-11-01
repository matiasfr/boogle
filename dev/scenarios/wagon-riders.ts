// A rider on another tab stays on the wagon's deck (src/netplay/net.ts, "riding a shared platform"): Bob stands on the
// last car (`wagon:car2`) from a stop, through the departure, a corner at the next station and the stop there; Alice
// watches. Her copy of Bob is drawn in the car's frame, so his offset on the deck she draws barely moves, while his
// world presence (what was drawn before) trails the deck by the interpolation delay. Serves DESIGN.md 4 and 10.
// Two rendering tabs: runs on a Mac (`npm run scenario -- wagon-riders`) or nightly, never in PR CI.
import { MET } from './lib/world.mjs';

type Game = {
  eval: (body: string) => Promise<unknown>;
  waitFor: (expr: string, opts?: { timeout?: number }) => Promise<number>;
  view: (v: { cam: number[]; look: number[] }, fov?: number) => Promise<void>;
  motion: (label: string, o: { frames: number; seconds: number }) => Promise<{ sheet: string; score: number }>;
  still: (label: string) => Promise<string>;
};
type Run = {
  open: (o: { name: string; room: string; query?: string; hud?: boolean }) => Promise<Game>;
  check: (label: string, ok: boolean, detail?: string) => void;
};

const CAR = 2;
const SECONDS = 24;
// Bob on the car, a little off its centre, facing along it (feet sphere just above the deck).
const BOARD = `
  const { me } = await import('/src/player/player.ts');
  const { teleport } = await import('/src/physics/physics.ts');
  const { PLAYER_R } = await import('/src/constants.ts');
  const { yawOf } = await import('/src/physics/platforms.ts');
  const c = window.__wagon.cars[${CAR}], b = c.body, yaw = yawOf(b.quaternion);
  const lx = 0.4, lz = -0.5, co = Math.cos(yaw), s = Math.sin(yaw);
  teleport(me.body, b.position.x + lx * co + lz * s, b.position.y + c.hy + PLAYER_R + 0.02, b.position.z - lx * s + lz * co);
  me.body.velocity.set(0, 0, 0);
  me.yaw = yaw + Math.PI;
  return [b.position.x, b.position.z];`;
// On Alice's tab, every 100 ms: Bob's drawn avatar and his world presence, both in the frame of the car as drawn.
const SAMPLE = `
  const { INTERP_MS } = await import('/src/constants.ts');
  const c = window.__wagon.cars[${CAR}];
  const r = [...window.boogle.remotes.values()][0];
  window.__riders = [];
  const local = (x, z) => {
    const m = c.mesh.position, yaw = c.mesh.rotation.y, co = Math.cos(yaw), s = Math.sin(yaw);
    const rx = x - m.x, rz = z - m.z;
    return [rx * co - rz * s, rx * s + rz * co];
  };
  const t0 = performance.now();
  const iv = setInterval(() => {
    if (!r?.avatar) return;
    const sm = r.snaps.sample(performance.now() - INTERP_MS);
    const p = sm ? [sm.a.p[0] + (sm.b.p[0] - sm.a.p[0]) * sm.u, sm.a.p[2] + (sm.b.p[2] - sm.a.p[2]) * sm.u] : null;
    const w = window.__wagon.state;
    window.__riders.push({
      t: performance.now() - t0,
      drawn: local(r.avatar.position.x, r.avatar.position.z),
      presence: p && local(p[0], p[1]),
      on: !!r.ride?.on,
      speed: w ? Math.abs(w.speed) : 0,
      x: c.mesh.position.x, z: c.mesh.position.z, yaw: c.mesh.rotation.y,
    });
  }, 100);
  setTimeout(() => clearInterval(iv), ${SECONDS * 1000});
  return true;`;

type Sample = {
  t: number;
  drawn: number[];
  presence: number[] | null;
  on: boolean;
  speed: number;
  x: number;
  z: number;
  yaw: number;
};
// The largest distance of any offset from the mean offset (m).
function wander(offs: number[][]) {
  if (!offs.length) return NaN;
  const mx = offs.reduce((a, o) => a + o[0], 0) / offs.length,
    mz = offs.reduce((a, o) => a + o[1], 0) / offs.length;
  return Math.max(...offs.map((o) => Math.hypot(o[0] - mx, o[1] - mz)));
}

export default {
  about: "a rider on another tab stays on the wagon's deck through a stop and a corner",
  timeout: 300000,
  async run(t: Run) {
    const room = 'wr' + Math.random().toString(36).slice(2, 8);
    const query = 'proto=wagon&laid=3';
    const A = await t.open({ name: 'Alice', room, query });
    const B = await t.open({ name: 'Bob', room, query });
    t.check('the players see each other', (await A.waitFor(MET, { timeout: 30000 })) >= 0);

    // Board at a stop the last car leaves past a corner: the first site, or the first station on the way out.
    const STOP = `(() => { const w = window.__wagon.state; return w && (w.stop === 0 || (w.stop === 1 && w.dir === 1)); })()`;
    const atStop = await B.waitFor(STOP, { timeout: 120000 });
    t.check('the wagon reaches a stop', atStop >= 0, `${atStop} ms`);
    await B.eval(BOARD);
    const on = await B.waitFor(
      `import('/src/physics/platforms.ts').then((m) => m.carry.on?.id === 'wagon:car${CAR}')`,
      { timeout: 5000 },
    );
    t.check('Bob stands on the car', on >= 0);
    const heard = await A.waitFor(`[...window.boogle.remotes.values()][0]?.ride?.on === true`, { timeout: 5000 });
    t.check('Alice draws Bob on her copy of the car', heard >= 0, `${heard} ms`);

    // A fixed camera beside the first station, which the car leaves from or arrives at.
    const site = (await A.eval(
      `const { groundHeight } = await import('/src/adapters/terrain.ts'); return groundHeight(10, -12);`,
    )) as number;
    await A.view({ cam: [21, site + 7, -6], look: [10, site + 1, -9] }, 55);
    await A.eval(SAMPLE);
    const sheet = await A.motion('wagon-riders', { frames: 12, seconds: SECONDS - 1 });
    await A.waitFor(`window.__riders.length >= ${SECONDS * 10 - 15}`, { timeout: 10000 });
    const log = (await A.eval(`return window.__riders;`)) as Sample[];
    const bob = (await B.eval(`return (await import('/src/physics/platforms.ts')).carry.on?.id ?? null;`)) as
      string | null;

    const riding = log.filter((s) => s.on);
    const moved = log.length ? Math.hypot(log.at(-1)!.x - log[0].x, log.at(-1)!.z - log[0].z) : 0;
    const turned = log.length ? Math.max(...log.map((s) => s.yaw)) - Math.min(...log.map((s) => s.yaw)) : 0;
    const stopped = log.some((s, k) => k > 0 && s.speed < 0.05 && log[k - 1].speed >= 0.05);
    const left = log.some((s, k) => k > 0 && s.speed >= 0.05 && log[k - 1].speed < 0.05);
    t.check(
      'the car moved, cornered and stopped',
      moved > 8 && turned > 0.02 && (stopped || left),
      `${moved.toFixed(1)} m, ${((turned * 180) / Math.PI).toFixed(1)}°, stop ${stopped}, start ${left}`,
    );
    t.check('Bob is still on the car at the end', bob === `wagon:car${CAR}`, String(bob));
    t.check(
      'Alice draws him riding the whole time',
      riding.length >= log.length * 0.95,
      `${riding.length}/${log.length}`,
    );
    const drawn = wander(riding.map((s) => s.drawn)),
      presence = wander(log.filter((s) => s.presence && s.speed > 0.5).map((s) => s.presence!));
    t.check(
      'his drawn place on the deck holds still (world presence alone would not)',
      drawn < 0.12,
      `drawn wanders ${drawn.toFixed(3)} m; presence (moving) wanders ${presence.toFixed(3)} m; ${sheet.sheet}`,
    );

    // Bob jumps off sideways while it runs: Alice blends him from the deck back to his world presence, no pop.
    const moving = await B.waitFor(`Math.abs(window.__wagon.state?.speed ?? 0) > 2`, { timeout: 60000 });
    t.check('the wagon runs again', moving >= 0, `${moving} ms`);
    await A.eval(`
      const r = [...window.boogle.remotes.values()][0];
      window.__leave = [];
      const t0 = performance.now();
      const f = () => {
        if (r.avatar) window.__leave.push([performance.now() - t0, r.avatar.position.x, r.avatar.position.z, r.ride ? r.ride.w : -1]);
        if (performance.now() - t0 < 2500) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
      return true;`);
    await B.eval(`
      const { me, cam } = await import('/src/player/player.ts');
      const { input } = await import('/src/player/input.ts');
      const { yawOf } = await import('/src/physics/platforms.ts');
      window.__debugCam.clear();
      cam.yaw = yawOf(window.__wagon.cars[${CAR}].body.quaternion) + Math.PI; // looking along it: D steps off a side
      input.keys.add('KeyD');
      me.jumpQueued = 0.15;
      me.jumpHeld = true;
      setTimeout(() => { input.keys.delete('KeyD'); me.jumpHeld = false; }, 1500);
      return true;`);
    await A.waitFor(`window.__leave.length && window.__leave.at(-1)[0] >= 2400`, { timeout: 8000 });
    const trail = (await A.eval(`return window.__leave;`)) as number[][];
    const steps = trail
      .slice(1)
      .map((s, k) => Math.hypot(s[1] - trail[k][1], s[2] - trail[k][2]) / Math.max(1, s[0] - trail[k][0]));
    const fastest = Math.max(...steps) * 1000; // m/s between two frames
    const off = await A.waitFor(`![...window.boogle.remotes.values()][0].ride`, { timeout: 3000 });
    t.check('Bob leaves the deck in her view', off >= 0, `${off} ms`);
    t.check(
      'and slides off it without a pop',
      fastest < 12,
      `fastest frame-to-frame ${fastest.toFixed(1)} m/s over ${trail.length} frames`,
    );
  },
};
