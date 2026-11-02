// A real place (?proto=place, src/proto/place/): sets the world up at a beat of the run and frames it. Pick with the query:
//   BOOGLE_QUERY='proto=place&tod=0.07&shot=first' npm run look -- --room proto-place --eval dev/look/evals/place.ts
// shots: first, bridge, climb, back, stake, trestle, ride, cargo, town, second. shot=time&path=0|1&sprint=0|1 walks a
// route with real input and writes the seconds on the screen, for the still.
const q = new URLSearchParams(location.search);
const shot = q.get('shot') || 'first';
type Sample = [number, number, number];
const place = window.__place as {
  links: {
    k: number;
    state: number;
    funded: number;
    built: number;
    spec: { line: unknown; ring: { x: number; z: number }; stake: { x: number; z: number } };
    flag: { position: { x: number; z: number } };
    trains: {
      clock: { t: number };
      trains: {
        s: number;
        v: number;
        stop: number;
        cars: { body: { position: { x: number; y: number; z: number } } }[];
      }[];
    };
    pile: { list: string[] };
  }[];
  s: { wood: number; stone: number };
  TUNE: { segments: number; stopIn: number };
  PATH_SAMPLES: Sample[][];
  ORIGIN: { x: number; z: number };
  H: (x: number, z: number) => number;
  plant: (l: unknown) => void;
  open: (l: unknown) => void;
  skipHaul: () => void;
  give: (kind: string, n: number) => void;
};
if (!place) throw new Error('no place: add proto=place to the query');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(100);
await wait(1500);
const body = me.body!;
const O = place.ORIGIN.x;
const put = (x: number, z: number, yaw: number, pitch = -0.08, up = 1.2) => {
  const wx = x + O;
  teleport(body, wx, place.H(wx, z) + up, z);
  body.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = yaw;
  cam.pitch = pitch;
};
const yawTo = (fx: number, fz: number, tx: number, tz: number) => Math.atan2(-(tx - fx), -(tz - fz));
const [north, east] = place.links as [(typeof place.links)[number], (typeof place.links)[number]];
const openNorth = () => {
  place.plant(north);
  for (let k = 0; k < place.TUNE.segments; k++) place.skipHaul();
  north.built = 0;
  place.open(north);
};
if (shot === 'bridge') put(-58, -75.5, yawTo(-58, -75.5, -41.5, -88), -0.02);
else if (shot === 'climb') put(-61, -130, yawTo(-61, -130, -61, -147), 0.02);
else if (shot === 'back') put(-20, -160, yawTo(-20, -160, -105, 15), -0.04);
else if (shot === 'stake') {
  const { x, z } = north.spec.stake;
  put(x + 3, z + 5, yawTo(x + 3, z + 5, -80, 0), -0.1);
  place.plant(north);
} else if (shot === 'trestle') {
  place.plant(north);
  place.skipHaul();
  north.built = 95;
  put(-60, -119, yawTo(-60, -119, -38, -60), -0.02);
  place.skipHaul();
} else if (shot === 'ride' || shot === 'cargo') {
  openNorth();
  await wait(500);
  const tr = north.trains.trains[0]!;
  // A flatbed: over the gorge, or standing at the village with the load.
  north.trains.clock.t = shot === 'ride' ? 11 : 1;
  await wait(400);
  const c = tr.cars[1]!.body.position;
  teleport(body, c.x, c.y + 2, c.z);
  body.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = shot === 'ride' ? yawTo(c.x - O, c.z, 8, 10) : yawTo(c.x - O, c.z, -105, 15);
  cam.pitch = -0.1;
} else if (shot === 'town') {
  openNorth();
  place.give('wood', 7);
  await wait(5000);
  put(-14, -128, yawTo(-14, -128, -100, 10), -0.05);
} else if (shot === 'second') {
  openNorth();
  place.give('wood', 7);
  const { x, z } = east.spec.stake;
  put(x + 2, z + 2, yawTo(x + 2, z + 2, -66, 13), -0.06);
  place.plant(east);
} else if (shot === 'play') {
  // The whole run with scripted input: walk, stake, haul, ride home, ride back, then the second link. On-screen log.
  // Not awaited: `--warm` is how long it gets, and the still at the end shows the log.
  void (async () => {
    const hands = (await import('/src/player/hands.ts' as string)) as typeof import('../../../src/player/hands.ts');
    const say = document.createElement('div');
    say.style.cssText =
      'position:fixed;left:8px;top:8px;z-index:9999;font:bold 15px monospace;color:#000;background:#fff;padding:6px;white-space:pre';
    document.body.append(say);
    const t0 = performance.now();
    const stamp: string[] = [];
    const now = () => (performance.now() - t0) / 1000;
    const note = (s: string) => {
      stamp.push(`${now().toFixed(1)} ${s}`);
      say.textContent = stamp.join('\n');
    };
    const press = () => {
      hands.interactDown();
      hands.interactUp();
    };
    const near = (x: number, z: number, r: number) => Math.hypot(body.position.x - (x + O), body.position.z - z) < r;
    const go = async (x: number, z: number, r = 1.2) => {
      input.keys.add('KeyW');
      let was = { x: body.position.x, z: body.position.z, at: performance.now() };
      while (!near(x, z, r)) {
        cam.yaw = me.yaw = yawTo(body.position.x, body.position.z, x + O, z);
        await wait(40);
        if (me.swimming) {
          note('in the river: back up the path');
          press();
          await wait(1000);
        }
        // Up against something (a platform's side, say): hop, as a player would.
        if (performance.now() - was.at > 600) {
          if (Math.hypot(body.position.x - was.x, body.position.z - was.z) < 0.5) me.jumpQueued = 0.2;
          was = { x: body.position.x, z: body.position.z, at: performance.now() };
        }
      }
      input.keys.delete('KeyW');
    };
    const walkPath = async (k: number) => {
      const path = place.PATH_SAMPLES[k]!;
      for (let n = 0; n < path.length; n += 3) await go(path[n]![0], path[n]![1], 1.6);
    };
    const haul = async (l: (typeof place.links)[number], depot: boolean) => {
      const start = now();
      let last = start;
      let bundle = 0;
      while (l.state === 1 && l.funded < place.TUNE.segments) {
        if (depot) {
          const d = (l.spec as unknown as { depot: { x: number; z: number } }).depot;
          await go(d.x, d.z, 3);
          while ((l as unknown as { depot: { list: unknown[] } }).depot.list.length < 3) await wait(100);
          press();
        } else {
          const list = (l.spec as unknown as { bundles: { x: number; z: number }[] }).bundles;
          const b = list[bundle % list.length]!;
          await go(b.x, b.z, 2);
          press();
          if (++takes % 3 === 0) bundle++; // a bundle holds three loads
        }
        await wait(300);
        const before = l.funded;
        await go(l.spec.ring.x, l.spec.ring.z, 1.5);
        await wait(600);
        if (l.funded > before) {
          note(`segment ${l.funded}: ${(now() - last).toFixed(1)} s of hauling`);
          last = now();
        }
      }
    };
    let takes = 0;
    const board = async (l: (typeof place.links)[number], stop: 0 | 1) => {
      const line = l.spec.line as { len: number; xs: Float32Array; zs: Float32Array };
      const sAt = stop ? line.len - place.TUNE.stopIn : place.TUNE.stopIn;
      const px = line.xs[Math.round(sAt)]!,
        pz = line.zs[Math.round(sAt)]!;
      // up the ramp: its foot, then the platform's outer end
      const n = line.xs.length - 1;
      const foot = stop
        ? [line.xs[n]! + (line.xs[n]! - line.xs[n - 1]!) * 5, line.zs[n]! + (line.zs[n]! - line.zs[n - 1]!) * 5]
        : [line.xs[0]! + (line.xs[0]! - line.xs[1]!) * 5, line.zs[0]! + (line.zs[0]! - line.zs[1]!) * 5];
      await go(foot[0]!, foot[1]!, 1.5);
      const end = stop ? line.len - 1 : 1;
      await go(line.xs[Math.round(end)]!, line.zs[Math.round(end)]!, 1.5);
      await go(px, pz, 1);
      note(`on platform ${stop ? 'camp' : 'village'}`);
      let tr = l.trains.trains.find((q) => q.stop === stop);
      for (;;) {
        while (!tr) {
          await wait(50);
          tr = l.trains.trains.find((q) => q.stop === stop);
        }
        const c = tr.cars[1]!.body.position;
        // The step across, while it stands; missing it means the next one, back where you waited.
        while (!plat.carry.on && tr.stop === stop) {
          cam.yaw = me.yaw = yawTo(body.position.x, body.position.z, c.x, c.z);
          input.keys.add('KeyW');
          await wait(40);
          if (Math.hypot(body.position.x - c.x, body.position.z - c.z) < 0.7) input.keys.delete('KeyW');
        }
        input.keys.delete('KeyW');
        if (plat.carry.on) break;
        note('missed it');
        tr = undefined;
      }
      note('boarded');
      const on = tr;
      while (on.stop !== -1) await wait(40);
      const left = now();
      note('left');
      while ((on.stop as number) !== (stop ? 0 : 1)) await wait(40);
      note(`arrived: ${(now() - left).toFixed(1)} s riding`);
      await wait(300);
      const back = stop ? place.TUNE.stopIn : line.len - place.TUNE.stopIn;
      while (plat.carry.on) {
        await go(line.xs[Math.round(back)]!, line.zs[Math.round(back)]!, 0.8);
      }
    };
    const plat = (await import(
      '/src/physics/platforms.ts' as string
    )) as typeof import('../../../src/physics/platforms.ts');
    note('start');
    if (q.get('skip') === '1') {
      // The first walk and haul, already timed: from the camp with the link open.
      put(north.spec.stake.x, north.spec.stake.z, 0);
      openNorth();
    } else {
      await walkPath(0);
      await go(north.spec.stake.x, north.spec.stake.z, 2);
      const walked = now();
      note(`at the stake: ${walked.toFixed(1)} s walking`);
      press();
      await wait(300);
      await haul(north, false);
      while (north.state !== 2) await wait(50);
      note(`link 1 open: ${(now() - walked).toFixed(1)} s after the stake`);
    }
    await board(north, 1);
    note(`town steps wood ${place.s.wood}`);
    await wait(6000);
    // Door to door, village to camp, by train: from the fire, with whatever wait you get.
    await go(-100, 13, 2);
    const d0 = now();
    note('door to door from the fire');
    await board(north, 0);
    note(`door to door: ${(now() - d0).toFixed(1)} s`);
    await board(north, 1);
    await go(-105, 15, 3);
    const w2 = now();
    await walkPath(1);
    await go(east.spec.stake.x, east.spec.stake.z, 2);
    note(`second stake: ${(now() - w2).toFixed(1)} s walking`);
    press();
    const h2 = now();
    await wait(300);
    await haul(east, true);
    while (east.state !== 2) await wait(50);
    note(`link 2 open: ${(now() - h2).toFixed(1)} s after the stake`);
    note(`WHOLE RUN ${now().toFixed(1)} s`);
  })();
} else if (shot === 'reset') {
  openNorth();
  place.give('wood', 7);
  await wait(4000);
  (document.querySelector('.place-proto button') as HTMLButtonElement).click();
} else if (shot === 'time') {
  const path = place.PATH_SAMPLES[Number(q.get('path') || 0)]!;
  if (q.get('sprint') === '1') input.keys.add('ShiftLeft');
  input.keys.add('KeyW');
  const t0 = performance.now();
  let n = 0;
  const say = document.createElement('div');
  say.style.cssText =
    'position:fixed;left:8px;top:8px;z-index:9999;font:bold 28px monospace;color:#000;background:#fff;padding:6px';
  document.body.append(say);
  const steer = setInterval(() => {
    const p = body.position;
    while (n < path.length - 1 && Math.hypot(path[n]![0] + O - p.x, path[n]![1] - p.z) < 3) n += 2;
    const t = path[Math.min(n, path.length - 1)]!;
    cam.yaw = me.yaw = yawTo(p.x, p.z, t[0] + O, t[1]);
    say.textContent = `${((performance.now() - t0) / 1000).toFixed(1)} s, sample ${n}/${path.length}, y ${p.y.toFixed(1)}`;
    if (n >= path.length - 1) {
      clearInterval(steer);
      input.keys.delete('KeyW');
      (window as unknown as { __placeTime: number }).__placeTime = (performance.now() - t0) / 1000;
      console.log(
        `place walk ${(performance.now() - t0) / 1000} s, sprint ${input.sprint}, at ${p.x - O} ${p.y} ${p.z}`,
      );
    }
  }, 50);
}
if (q.get('cam') !== 'fixed') setTimeout(() => window.__debugCam!.clear(), 300); // the follow camera: what you'd see
export {};
