// A real place (?proto=place, src/proto/place/): sets the world up at a beat of the run and frames it. Pick with the query:
//   BOOGLE_QUERY='proto=place&tod=0.07&shot=sign' npm run look -- --room proto-place --eval dev/look/evals/place.ts --size 1180x820 --hud
// shots: sign, wake, chop, stack, laying, layingm, trestle, crane, lit, line2, far, reload, reset. shot=fall stands on the finished trestle and on
// the machine and the train, and logs what holds you. shot=play runs the whole thing with real input (it needs a long
// --warm) and writes times per beat on the screen.
const q = new URLSearchParams(location.search);
const shot = q.get('shot') || 'sign';
type P3 = { x: number; y: number; z: number };
type StationRun = {
  x: number;
  z: number;
  y: number;
  spec: { s: number; to: number; logs: number; rails: number; label: string };
  have: { logs: number; rails: number };
  wants: (k: string) => number;
  full: () => boolean;
};
type LineRun = {
  stage: number;
  open: boolean;
  spec: { line: { len: number; xs: Float32Array; zs: Float32Array } };
  stations: StationRun[];
  train: {
    tr: {
      s: number;
      stop: number;
      cars: { body: { position: P3 } }[];
    };
    clock: { t: number };
  };
};
type Tree = { x: number; y: number; z: number; fall: number; index: number };
const place = window.__place as {
  lines: [LineRun, LineRun];
  machine: { flatbed: P3 & { body: { position: P3 } }; loco: P3 };
  run: { mode: string; head: number };
  s: { awake: boolean; people: number; wood: number; stone: number; turned: boolean };
  back: { logs: number; rails: number; room: () => number };
  forge: { crates: number; rails: number; lit: boolean };
  hub: { x: number; z: number; list: string[] };
  log: [string, number][];
  TREES: Tree[];
  TUNE: Record<string, number>;
  PATH_SAMPLES: [number, number, number][][];
  ORIGIN: { x: number; z: number };
  H: (x: number, z: number) => number;
  skipWalk: () => void;
  skipDelivery: () => void;
  skipForge: () => void;
  skipLine2: () => void;
  startOver: () => void;
  wake: () => void;
};
if (!place) throw new Error('no place: add proto=place to the query');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const hands = (await import('/src/player/hands.ts' as string)) as typeof import('../../../src/player/hands.ts');
const plat = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(100);
await wait(1500);
const body = me.body!;
const O = place.ORIGIN.x;
const [L1, L2] = place.lines;
if (q.get('fresh') !== '0' && shot !== 'reload') place.startOver();
await wait(300);
const yawTo = (fx: number, fz: number, tx: number, tz: number) => Math.atan2(-(tx - fx), -(tz - fz));
const putW = (x: number, y: number, z: number, yaw: number, pitch = -0.1) => {
  teleport(body, x, y, z);
  body.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = yaw;
  cam.pitch = pitch;
};
const put = (x: number, z: number, yaw: number, pitch = -0.1, up = 1.2) => putW(x, place.H(x, z) + up, z, yaw, pitch);
const press = () => {
  hands.interactDown();
  hands.interactUp();
};
const waitMode = async (m: string, ms = 60000) => {
  const t = performance.now();
  while (place.run.mode !== m && performance.now() - t < ms) await wait(60);
};
const nearestTree = (x: number, z: number) => {
  let best: Tree | null = null,
    bd = Infinity;
  for (const t of place.TREES) {
    if (t.fall >= 0) continue;
    const d = Math.hypot(t.x - x, t.z - z);
    if (d < bd) {
      bd = d;
      best = t;
    }
  }
  return best!;
};

if (shot === 'reload') {
  // A save mid-run, then the page again: everything should stand where it was. The still shows it.
  place.skipLine2();
  setTimeout(() => location.reload(), 2500);
} else if (shot === 'reset') {
  place.skipLine2();
  await wait(2500);
  (document.querySelector('.place-proto button') as HTMLButtonElement).click();
  await wait(1500);
} else if (shot === 'wake') {
  const f = place.machine.flatbed;
  put(f.x - 3, f.z + 5, yawTo(f.x - 3, f.z + 5, f.x, f.z), -0.14);
} else if (shot === 'chop') {
  place.wake();
  const st = L1.stations[0]!;
  const t = nearestTree(st.x, st.z);
  const dx = (st.x - t.x) / Math.hypot(st.x - t.x, st.z - t.z),
    dz = (st.z - t.z) / Math.hypot(st.x - t.x, st.z - t.z);
  put(t.x + dx * 2.4, t.z + dz * 2.4, yawTo(t.x + dx * 2.4, t.z + dz * 2.4, t.x, t.z), -0.1);
  await wait(400);
} else if (shot === 'stack') {
  place.wake();
  const st = L1.stations[0]!;
  place.back.logs = 12;
  await wait(100);
  const x = st.x + 7,
    z = st.z + 4;
  put(x, z, yawTo(x, z, st.x, st.z), -0.2);
  await wait(600);
  input.keys.add('KeyW');
  for (let k = 0; k < 40 && place.back.logs > 3; k++) await wait(100);
  input.keys.delete('KeyW');
} else if (shot === 'laying') {
  place.wake();
  place.skipDelivery();
  await waitMode('laying');
  await wait(4200);
  // On the fresh track, a step behind the machine, looking along it.
  const f = place.machine.flatbed;
  const line = L1.spec.line;
  const s = Math.round(place.run.head + 9);
  const x = line.xs[s]! + O,
    z = line.zs[s]!;
  putW(x, f.y + 1.2, z, yawTo(x, z, f.x, f.z), -0.14);
} else if (shot === 'layingm') {
  // Riding the machine over the gorge: what drops ahead of it, and does the deck carry you.
  place.wake();
  place.skipDelivery();
  await waitMode('idle');
  place.skipDelivery();
  await waitMode('laying');
  const f = place.machine.flatbed;
  const lo = place.machine.loco;
  putW(f.x + (lo.x - f.x) * 0.22, f.y + 1.2, f.z + (lo.z - f.z) * 0.22, yawTo(lo.x, lo.z, f.x, f.z), -0.26);
} else if (shot === 'trestle') {
  place.wake();
  place.skipDelivery();
  await waitMode('idle');
  place.skipDelivery();
  await waitMode('idle');
  const line = L1.spec.line;
  const s = 96;
  const x = line.xs[s]! + O,
    z = line.zs[s]!;
  place.back.logs = 12;
  const u = Math.min(1, Math.max(0, (s - 50) / (118 - 50)));
  putW(x, 18.3 + 12 * u * u * (3 - 2 * u) + 1, z, yawTo(x, z, line.xs[60]! + O, line.zs[60]!), -0.1);
} else if (shot === 'crane') {
  place.skipForge();
  await wait(200);
  put(O - 72, -6, yawTo(O - 72, -6, O - 83, -8), -0.08);
  await wait(23000);
} else if (shot === 'lit') {
  place.skipLine2();
  await wait(5000);
  put(O - 92, 6, yawTo(O - 92, 6, O - 86, -10), -0.03);
} else if (shot === 'line2') {
  place.skipLine2();
  await wait(4500);
  const st = L2.stations[0]!;
  place.back.logs = 4;
  place.back.rails = 2;
  put(st.x + 7, st.z - 3, yawTo(st.x + 7, st.z - 3, st.x, st.z), -0.14);
} else if (shot === 'far') {
  place.wake();
  put(O + 40, -196, yawTo(O + 40, -196, O + 330, -1120), 0.02);
} else if (shot === 'fall') {
  // Each drops from a little above and is asked where it stands a while later. Printed on screen and to the console.
  const say = document.createElement('div');
  say.style.cssText =
    'position:fixed;left:8px;top:80px;z-index:9999;font:bold 15px monospace;color:#000;background:#fff;padding:6px;white-space:pre';
  document.body.append(say);
  const note = (s: string) => {
    say.textContent += s + '\n';
    console.log(s);
  };
  place.skipForge();
  await wait(1200);
  const line = L1.spec.line;
  let fails = 0;
  for (const s of [114, 104, 96, 88, 80, 70, 62, 54, 44]) {
    const x = line.xs[s]! + O,
      z = line.zs[s]!;
    const yRail = place.H(x, z);
    const expect = 18.3 + 12 * (t2(s) as number);
    putW(x, expect + 1.5, z, 0);
    await wait(900);
    const dy = body.position.y - expect;
    note(`track s=${s} ground ${yRail.toFixed(1)} rail ${expect.toFixed(1)} stands +${dy.toFixed(2)}`);
    if (dy < 0) fails++;
  }
  // Walk a stretch of the deck for real, end to end.
  {
    const a = 112,
      b = 72;
    putW(line.xs[a]! + O, 18.3 + 12 * t2(a) + 1.2, line.zs[a]!, 0);
    await wait(300);
    input.keys.add('KeyW');
    for (let n = a; n >= b; n -= 2) {
      const tx = line.xs[n]! + O,
        tz = line.zs[n]!;
      while (Math.hypot(body.position.x - tx, body.position.z - tz) > 1.6) {
        cam.yaw = me.yaw = yawTo(body.position.x, body.position.z, tx, tz);
        await wait(30);
      }
    }
    input.keys.delete('KeyW');
    const dy = body.position.y - (18.3 + 12 * t2(b));
    note(`walked deck ${a} to ${b}: ends +${dy.toFixed(2)} ${dy < -0.2 ? 'FELL' : 'ok'}`);
    if (dy < -0.2) fails++;
  }
  // The machine and the train: land on them and read the carry.
  const t = L1.train.tr;
  const c = t.cars[1]!.body.position;
  putW(c.x, c.y + 1.5, c.z, 0);
  await wait(900);
  note(`on the train: carry ${plat.carry.on ? 'yes' : 'NO'} y+${(body.position.y - c.y).toFixed(2)}`);
  if (!plat.carry.on) fails++;
  const f = place.machine.flatbed;
  const lo = place.machine.loco;
  for (const [what, x, y, z] of [
    ['machine deck rear', f.x + (lo.x - f.x) * 0.25, f.y, f.z + (lo.z - f.z) * 0.25],
    ['machine loco', lo.x, lo.y, lo.z],
  ] as const) {
    putW(x, y + 1.6, z, 0);
    await wait(900);
    note(`on ${what}: carry ${plat.carry.on ? 'yes' : 'NO'} y+${(body.position.y - y).toFixed(2)}`);
    if (!plat.carry.on) fails++;
  }
  note(fails ? `FAILS ${fails}` : 'ALL SOLID');
  function t2(s: number) {
    const u = Math.min(1, Math.max(0, (s - 50) / (118 - 50)));
    return u * u * (3 - 2 * u);
  }
} else if (shot === 'play') {
  // The whole run, as a first-time player would, with real input: walk, wake, chop, carry, ride, take rails, line 2.
  // Not awaited: `--warm` is how long it gets, and the still at the end shows the log.
  void (async () => {
    const say = document.createElement('div');
    say.style.cssText =
      'position:fixed;left:8px;top:90px;z-index:9999;font:bold 13px monospace;color:#000;background:#fff;padding:6px;white-space:pre';
    document.body.append(say);
    const t0 = performance.now();
    const stamp: string[] = [];
    const now = () => (performance.now() - t0) / 1000;
    let last = 0;
    const note = (s: string) => {
      const n = now();
      stamp.push(`${n.toFixed(1)} (+${(n - last).toFixed(1)}) ${s}`);
      last = n;
      say.textContent = stamp.join('\n');
      console.log('PLAY ' + stamp[stamp.length - 1]);
    };
    const near = (x: number, z: number, r: number) => Math.hypot(body.position.x - x, body.position.z - z) < r;
    // In world metres.
    const go = async (x: number, z: number, r = 1.2, limit = 90000) => {
      input.keys.add('KeyW');
      let was = { x: body.position.x, z: body.position.z, at: performance.now() };
      const start = performance.now();
      while (!near(x, z, r) && performance.now() - start < limit) {
        cam.yaw = me.yaw = yawTo(body.position.x, body.position.z, x, z);
        await wait(40);
        if (me.swimming) {
          note('in the river: back up the path');
          press();
          await wait(1000);
        }
        // Up against something: hop, as a player would.
        if (performance.now() - was.at > 600) {
          if (Math.hypot(body.position.x - was.x, body.position.z - was.z) < 0.5) me.jumpQueued = 0.2;
          was = { x: body.position.x, z: body.position.z, at: performance.now() };
        }
      }
      input.keys.delete('KeyW');
    };
    // Walks the built track from one point to another: the only way over a gorge with a load.
    const alongLine = async (l: LineRun, from: number, to: number) => {
      const ln = l.spec.line;
      const step = from < to ? 4 : -4;
      for (let n = from; step > 0 ? n <= to : n >= to; n += step) await go(ln.xs[n]! + O, ln.zs[n]!, 1.8, 20000);
    };
    const chopFill = async (need: number) => {
      // Chops until the back holds what's asked, walking to the nearest tree each time.
      while (place.back.logs < need && place.back.room() > 0) {
        const t = nearestTree(body.position.x, body.position.z);
        await go(t.x, t.z, 2.4);
        while (t.fall < 0 && place.back.room() > 0 && place.back.logs < need) {
          press();
          await wait(320);
        }
        await wait(100);
      }
    };
    const deliverLine1 = async (k: number) => {
      const st = L1.stations[k]!;
      const started = now();
      while (!st.full()) {
        await chopFill(Math.min(place.TUNE.carry!, st.wants('logs')));
        if (k === 2) await alongLine(L1, 118, 74); // the machine stands on the track from 70 on
        await go(st.x, st.z, 3);
        await wait(1400);
        if (k === 2 && !st.full()) await alongLine(L1, 74, 118);
      }
      note(`station ${k + 1} full (${(now() - started).toFixed(1)} s chop and carry)`);
      await waitMode('laying');
      const lay0 = now();
      await waitMode(k < 2 ? 'idle' : 'running', 60000);
      note(`stretch ${k + 1} laid (${(now() - lay0).toFixed(1)} s)`);
    };
    const board = async (l: LineRun, stop: 0 | 1) => {
      const ln = l.spec.line;
      const tr = l.train.tr;
      const sAt = stop ? ln.len - place.TUNE.stopIn! : place.TUNE.stopIn!;
      await go(ln.xs[Math.round(sAt)]! + O + 2, ln.zs[Math.round(sAt)]! + 2.4, 2.5);
      for (;;) {
        while (tr.stop !== stop) await wait(50);
        const c = tr.cars[1]!.body.position;
        while (!plat.carry.on && tr.stop === stop) {
          cam.yaw = me.yaw = yawTo(body.position.x, body.position.z, c.x, c.z);
          input.keys.add('KeyW');
          if (Math.hypot(body.position.x - c.x, body.position.z - c.z) < 2.3) me.jumpQueued = 0.2;
          await wait(40);
          if (Math.hypot(body.position.x - c.x, body.position.z - c.z) < 0.5) input.keys.delete('KeyW');
        }
        input.keys.delete('KeyW');
        if (plat.carry.on) break;
        note('missed the train');
      }
      note(`boarded at ${stop ? 'far end' : 'village'}`);
      while (tr.stop === stop) await wait(40);
      const left = now();
      while (tr.stop !== (stop ? 0 : 1)) await wait(40);
      note(`ride ${(now() - left).toFixed(1)} s`);
    };
    note('start');
    if (q.get('from') === 'line2') {
      place.skipLine2();
      await wait(4500);
    } else {
      const path = place.PATH_SAMPLES[0]!;
      for (let n = 0; n < path.length; n += 3) await go(path[n]![0] + O, path[n]![1], 1.8);
      const f = place.machine.flatbed;
      await go(f.x, f.z, 5);
      note('at the machine');
      await wait(500); // reading the prompt
      press();
      await wait(300);
      if (!place.s.awake) note('WAKE FAILED');
      note('woke');
      await deliverLine1(0);
      await deliverLine1(1);
      await deliverLine1(2);
      note('line 1 open');
      await wait(4000);
      // The first train comes in. Hop on at the village and ride it out and back with the next load.
      await board(L1, 0);
      await board(L1, 1);
      note(`home, forge ${place.forge.crates}/${place.TUNE.forgeCost}`);
      // Off the train at once, as anyone would: it leaves again in 5 s.
      await go(O - 85.5, -5, 3.2);
      note('off the train, at the rack');
      const t2 = performance.now();
      while (!place.forge.lit && performance.now() - t2 < 120000) await wait(200);
      note(`forge lit ${place.forge.lit}`);
      await waitMode('idle', 20000);
      note('machine on line 2');
      await wait(1000);
    }
    const carryOut = async (k: number) => {
      const st = L2.stations[k]!;
      const started = now();
      while (!st.full()) {
        const rack = { x: O - 85.5, z: -5 };
        if (st.wants('rails') - place.back.rails > 0 && place.back.room() > 0) {
          await go(rack.x, rack.z, 3.2);
          while (place.forge.rails <= 0) await wait(200);
          press();
          await wait(700);
          if (q.get('legs')) note(`rack, back ${place.back.rails} rails`);
        }
        if (st.wants('logs') - place.back.logs > 0 && place.back.room() > 0) {
          await go(place.hub.x, place.hub.z, 3.4);
          while (!place.hub.list.length && place.back.logs < st.wants('logs')) await wait(200);
          press();
          await wait(700);
          if (q.get('legs')) note(`heap, back ${place.back.logs} logs, ${place.hub.list.length} crates`);
        }
        await alongLine(L2, 12, Math.max(12, st.spec.s - 12));
        await go(st.x, st.z, 3);
        if (q.get('legs')) note(`at the frame, wants ${st.wants('rails')}, ${st.wants('logs')}`);
        await wait(1500);
        if (!st.full()) await alongLine(L2, Math.max(12, st.spec.s - 12), 12);
      }
      note(`line 2 station ${k + 1} full (${(now() - started).toFixed(1)} s)`);
      await waitMode('laying');
      const lay0 = now();
      await waitMode(k < 2 ? 'idle' : 'done', 60000);
      note(`line 2 stretch ${k + 1} laid (${(now() - lay0).toFixed(1)} s)`);
    };
    await carryOut(0);
    await carryOut(1);
    await carryOut(2);
    note('line 2 open');
    const t3 = performance.now();
    while (place.s.stone === 0 && performance.now() - t3 < 120000) await wait(200);
    note(`stone reached the village: ${place.s.stone}`);
    note(`WHOLE RUN ${now().toFixed(1)} s`);
    (window as unknown as { __placeDone: boolean }).__placeDone = true;
  })();
}
if (q.get('cam') !== 'fixed') setTimeout(() => window.__debugCam!.clear(), 300); // the follow camera: what you'd see
export {};
