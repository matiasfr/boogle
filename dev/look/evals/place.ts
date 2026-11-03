// A real place (?proto=place, src/proto/place/): sets the world up at a beat of the run and frames it. Pick with the query:
//   BOOGLE_QUERY='proto=place&tod=0.07&shot=sign' npm run look -- --room proto-place --eval dev/look/evals/place.ts --size 1180x820 --hud
// shots: sign, wake, chop, stack, laying, target, layingm, trestle, crane, lit, line2, far, reload, reset. shot=fall stands on the finished trestle and on
// the machine and the train, and logs what holds you. shot=play runs the whole thing with real input (it needs a long
// --warm) and writes times per beat on the screen.
// Third round: arrive (&at=metres along the line), site, blocked, shelf, shelf2, ornaments, guys, guys2, crystal, cost; and,
// with `--action dev/look/evals/place-act.ts` to set them off on the motion sheet or the video, waking, pullout, crate,
// crystalgo. &look=off for the old look.
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
    clock: { t: number; running: boolean };
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
  give: (n: number) => void;
  setForge: (n: number) => void;
  snapCrystals: (l: number[]) => void;
  giftState: { got: string[]; crates: () => { x: number; y: number; z: number }[] };
  openCrate: (c: { x: number; z: number }) => void;
  crystals: { found: number[] };
  crystalAt: (k: number) => { x: number; y: number; z: number };
  folk: { count: () => number };
  RACK: { x: number; z: number };
  SHELF: { x: number; z: number; yaw: number };
};
const act = window as unknown as { __placeAct?: () => unknown };
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
} else if (shot === 'target') {
  // The look chase's fixed frame (.look/previz/visible-materials/shot-3.png): on the fresh track behind the machine, which
  // has just left station 2 for the gorge, the frame and feeder beside you. Staged and frozen so every capture matches: the
  // head stops at the same metre, and the frame gets some logs back, because the real run empties it before laying.
  // &moving=1 leaves it running, for video.
  const head = Number(q.get('head') ?? 110);
  place.wake();
  place.skipDelivery();
  await waitMode('idle');
  place.skipDelivery();
  await waitMode('laying');
  const line = L1.spec.line;
  if (q.get('moving') !== '1') {
    while (place.run.head > head) await wait(16);
    (place.run as { mode: string }).mode = 'frozen';
    (L1.stations[1] as unknown as { drawStock: (n: { logs: number; rails: number }) => void }).drawStock({
      logs: 11,
      rails: 0,
    });
  }
  const s = Number(q.get('at') ?? 122);
  const x = line.xs[s]! + O,
    z = line.zs[s]!;
  const f = place.machine.flatbed;
  putW(x, f.y + 1.2, z, Number(q.get('yaw') ?? 0.6) + yawTo(x, z, f.x, f.z), Number(q.get('pitch') ?? -0.2));
  (me.avatar?.userData as { mat: { color: { set: (c: string) => void } } }).mat.color.set('#9b6bff'); // the board's purple
  if (q.get('touch')) {
    // What an iPad draws: the 1024 shadow map (src/render/scene.ts) and 0.8x (src/features/adaptive-res.ts) of this page's 1x.
    const { sun, renderer } = (await import('/src/render/scene.ts' as string)) as {
      sun: { shadow: { mapSize: { setScalar: (n: number) => void }; map: { dispose: () => void } | null } };
      renderer: { setPixelRatio: (r: number) => void };
    };
    sun.shadow.mapSize.setScalar(1024);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
    renderer.setPixelRatio(0.8);
  }
  await wait(1500);
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
} else if (shot === 'waking') {
  // The machine waking, from where you'd stand to press it.
  const f = place.machine.flatbed;
  put(f.x - 5, f.z + 6, yawTo(f.x - 5, f.z + 6, f.x, f.z - 1), -0.12);
  act.__placeAct = () => place.wake();
} else if (shot === 'pullout') {
  // Stops a metre short of finishing line 1, then lets it finish: what the player sees as the line comes through.
  place.skipDelivery();
  await waitMode('idle');
  place.skipDelivery();
  await waitMode('idle');
  const st = L1.stations[2]!;
  place.skipDelivery();
  await waitMode('laying');
  while (place.run.head > 31.2) await wait(16);
  place.run.mode = 'frozen';
  await wait(1000);
  put(st.x + 2, st.z + 5, yawTo(st.x + 2, st.z + 5, place.machine.flatbed.x, place.machine.flatbed.z), -0.1);
  act.__placeAct = () => void (place.run.mode = 'laying');
} else if (shot === 'arrive') {
  // Riding the train in, facing the way it goes: the forge should be in front of you.
  place.skipForge();
  place.setForge(Number(q.get('crates') ?? 7));
  const tr = L1.train.tr;
  while (tr.stop !== 1) await wait(50);
  const c = tr.cars[1]!.body.position;
  putW(c.x, c.y + 1.4, c.z, 0);
  await wait(400);
  while (tr.stop === 1) await wait(50);
  const at = Number(q.get('at') ?? 42);
  while (tr.s > at) {
    const ln = L1.spec.line;
    const k = Math.max(0, Math.round(tr.s - 14));
    cam.yaw = me.yaw = yawTo(body.position.x, body.position.z, ln.xs[k]! + O, ln.zs[k]!);
    cam.pitch = -0.1;
    await wait(16);
  }
  L1.train.clock.running = false;
} else if (shot === 'platform') {
  // Standing on the platform, as the crates land.
  place.skipForge();
  place.setForge(Number(q.get('crates') ?? 7));
  const x = O - 73,
    z = -1.5;
  putW(x, 20.5, z, yawTo(x, z, O - 87, -3), -0.06);
} else if (shot === 'site') {
  // A town building on its poles.
  place.skipLine2();
  await wait(1500);
  place.s.wood = 6;
  put(O - 84, 14, yawTo(O - 84, 14, O - 92, 34), 0.02);
  await wait(Number(q.get('t') ?? 3500));
} else if (shot === 'blocked') {
  // Walks straight at a cottage, for real, and says where it stopped.
  const say = document.createElement('div');
  say.style.cssText =
    'position:fixed;left:8px;top:80px;z-index:9999;font:bold 15px monospace;color:#000;background:#fff;padding:6px;white-space:pre';
  document.body.append(say);
  const tx = O - 108,
    tz = -4;
  put(tx + 8, tz + 2, yawTo(tx + 8, tz + 2, tx, tz), -0.1);
  await wait(500);
  input.keys.add('KeyW');
  for (let k = 0; k < 60; k++) {
    cam.yaw = me.yaw = yawTo(body.position.x, body.position.z, tx, tz);
    await wait(50);
  }
  input.keys.delete('KeyW');
  const d = Math.hypot(body.position.x - tx, body.position.z - tz);
  say.textContent = `walked 3 s at the cottage: stopped ${d.toFixed(2)} m from its middle ${d > 2 ? '(blocked)' : '(WENT THROUGH)'}`;
  console.log(say.textContent);
} else if (shot === 'crate') {
  // The first stretch's crate, delivered; the action opens it.
  place.skipDelivery();
  await waitMode('idle');
  await wait(1000);
  const c = place.giftState.crates()[0]!;
  put(c.x + 5.5, c.z + 3.5, yawTo(c.x + 5.5, c.z + 3.5, c.x, c.z), -0.08);
  act.__placeAct = () => place.openCrate(c);
} else if (shot === 'shelf' || shot === 'shelf2') {
  const { x, z, yaw } = place.SHELF;
  if (shot === 'shelf2') {
    place.give(5);
    place.snapCrystals([0, 1, 2]);
  }
  const fx = x + Math.sin(yaw) * 4.6,
    fz = z + Math.cos(yaw) * 4.6;
  put(fx, fz, yawTo(fx, fz, x, z), -0.05);
} else if (shot === 'ornaments') {
  // The machine, or the train if it's open, with what you've been given.
  place.skipForge();
  place.give(Number(q.get('n') ?? 8));
  const tr = L1.train.tr;
  const stop = 0;
  while (tr.stop !== stop) await wait(50);
  L1.train.clock.running = false;
  const c = tr.cars[1]!.body.position;
  put(c.x - 6, c.z - 5, yawTo(c.x - 6, c.z - 5, c.x, c.z), -0.1);
} else if (shot === 'mounts') {
  // The empty mounts: what you see when you reach the machine.
  const f = place.machine.flatbed;
  const lo = place.machine.loco;
  put(lo.x - 4, lo.z + 4, yawTo(lo.x - 4, lo.z + 4, (f.x + lo.x) / 2, (f.z + lo.z) / 2), -0.12);
} else if (shot === 'guys') {
  // The village with some people in it, on the platform and round the forge.
  place.s.people = Number(q.get('people') ?? 28);
  place.skipForge();
  await wait(1000);
  put(O - 92, 10, yawTo(O - 92, 10, O - 78, -6), -0.1);
  await wait(6000);
} else if (shot === 'guys2') {
  // A station's helpers, and the camp's.
  place.skipDelivery();
  await waitMode('idle');
  await wait(600);
  const st = L1.stations[1]!;
  put(st.x + 6, st.z + 4, yawTo(st.x + 6, st.z + 4, st.x, st.z), -0.14);
} else if (shot === 'crystal' || shot === 'crystalgo') {
  const c = place.crystalAt(Number(q.get('k') ?? 0));
  put(c.x + 5.5, c.z + 2, yawTo(c.x + 5.5, c.z + 2, c.x, c.z), -0.1);
  act.__placeAct = () => {
    input.keys.add('KeyW');
    setTimeout(() => input.keys.delete('KeyW'), 1600);
  };
} else if (shot === 'cost') {
  // What a late frame costs, at what an iPad runs (src/render/scene.ts 1024 shadow map, 0.8x): counts on the screen.
  const say = document.createElement('div');
  say.style.cssText =
    'position:fixed;left:8px;top:80px;z-index:9999;font:bold 15px monospace;color:#000;background:#fff;padding:6px;white-space:pre';
  document.body.append(say);
  const { sun, renderer } = (await import('/src/render/scene.ts' as string)) as {
    sun: { shadow: { mapSize: { setScalar: (n: number) => void }; map: { dispose: () => void } | null } };
    renderer: {
      setPixelRatio: (r: number) => void;
      info: { frame: number; render: { drawCalls: number; triangles: number } };
    };
  };
  sun.shadow.mapSize.setScalar(1024);
  sun.shadow.map?.dispose();
  sun.shadow.map = null;
  renderer.setPixelRatio(0.8);
  const frame = () =>
    new Promise<{ drawCalls: number; triangles: number }>((res) => {
      const at = renderer.info.frame;
      const t = setInterval(() => renderer.info.frame > at && (clearInterval(t), res({ ...renderer.info.render })), 20);
    });
  const row = async (name: string) => {
    await wait(2500);
    await frame();
    const a = await frame();
    say.textContent += `${name}: ${a.drawCalls} draws, ${Math.round(a.triangles / 1000)}k tris, ${place.folk.count()} guys\n`;
    console.log('COST ' + name, a.drawCalls, a.triangles);
    if (q.get('breakdown')) {
      // What's in the scene by geometry: triangles if all of it were drawn, meshes (roughly draws), shadow casters.
      type M = {
        isMesh?: boolean;
        visible: boolean;
        count?: number;
        castShadow: boolean;
        frustumCulled: boolean;
        geometry?: { uuid: string; index: { count: number } | null; attributes: { position: { count: number } } };
        parent: M | null;
        children: M[];
        position: P3;
      };
      const { scene } = (await import('/src/render/scene.ts' as string)) as unknown as { scene: M };
      const rows = new Map<string, { tris: number; meshes: number; cast: number; each: number; n: number; at: P3 }>();
      const walk = (o: M) => {
        if (!o.visible) return;
        if (o.isMesh && o.geometry) {
          const each = (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
          const n = o.count ?? 1;
          const r = rows.get(o.geometry.uuid) ?? { tris: 0, meshes: 0, cast: 0, each, n: 0, at: o.position };
          r.tris += each * n;
          r.n += n;
          r.meshes++;
          if (o.castShadow) r.cast++;
          rows.set(o.geometry.uuid, r);
        }
        o.children.forEach(walk);
      };
      walk(scene);
      const all = [...rows.values()];
      const fmt = (r: (typeof all)[number]) =>
        `${Math.round(r.tris / 1000)}k tris ${r.meshes} meshes ${r.cast} cast, ${r.each} x ${r.n} near ${r.at.x.toFixed(0)},${r.at.z.toFixed(0)}`;
      console.log(`COST ${name}: ${all.reduce((n, r) => n + r.meshes, 0)} meshes in the scene`);
      for (const r of [...all].sort((p, u) => u.tris - p.tris).slice(0, 14)) console.log('COST  tris ' + fmt(r));
      for (const r of [...all].sort((p, u) => u.meshes - p.meshes).slice(0, 10)) console.log('COST  many ' + fmt(r));
      // And by what hangs off the scene: which groups are many meshes.
      const tops: string[] = [];
      for (const top of scene.children) {
        let meshes = 0,
          cast = 0,
          tris = 0;
        const count = (o: M) => {
          if (!o.visible) return;
          if (o.isMesh && o.geometry) {
            meshes++;
            if (o.castShadow) cast++;
            tris += ((o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3) * (o.count ?? 1);
          }
          o.children.forEach(count);
        };
        count(top);
        if (meshes)
          tops.push(
            `${String(meshes).padStart(3)} meshes ${String(cast).padStart(3)} cast ${String(Math.round(tris / 1000)).padStart(3)}k at ${top.position.x.toFixed(0)},${top.position.z.toFixed(0)} ${top.children.length} kids`,
          );
      }
      for (const t of tops.sort().reverse().slice(0, 24)) console.log('COST  top ' + t);
    }
  };
  await row('spawn, start of the run');
  place.give(8);
  place.s.people = 40;
  place.skipLine2();
  place.s.wood = 16;
  place.s.stone = 16;
  await wait(1000);
  put(O - 92, 16, yawTo(O - 92, 16, O - 84, 0), -0.06);
  await row('village, everything built or building');
  await wait(18000);
  await row('village, 20 s on');
  put(O - 72, 34, yawTo(O - 72, 34, O - 90, 50), -0.04);
  await row('stone street');
} else if (shot === 'ride') {
  // Walks to a spot on a deck with real input (W, then let go) and rides a whole trip standing still, logging how far you
  // drift in the deck's frame, whether you stay on it, and whether you end in the water. &line=0|1, &car=, &spots=lat:lon,...
  // (fractions of the deck's half width and half length), &trips=rounds of them. RIDE lines on the console and the screen.
  void (async () => {
    const say = document.createElement('div');
    say.style.cssText =
      'position:fixed;left:8px;top:80px;z-index:9999;font:bold 12px monospace;color:#000;background:#fff;padding:6px;white-space:pre';
    document.body.append(say);
    const note = (t: string) => {
      say.textContent += t + '\n';
      console.log('RIDE ' + t);
    };
    const k = Number(q.get('line') ?? 0);
    place.skipLine2();
    await wait(800);
    const L = place.lines[k]!;
    if (k === 1) {
      const l2 = L as unknown as { track: { snapTo: (u: number) => void }; train: { start: (f: boolean) => void } };
      l2.track.snapTo(1e6);
      l2.train.start(true);
    }
    const carK = Number(q.get('car') ?? 1);
    const tr = L.train.tr as unknown as {
      stop: number;
      s: number;
      cars: { platform: import('../../../src/physics/platforms.ts').Platform; body: { position: P3 } }[];
    };
    const p = tr.cars[carK]!.platform;
    const local = { x: 0, y: 0, z: 0, yaw: 0 };
    const here = () => plat.toPlatform(p, body.position, 0, local);
    const walkTo = async (lx: number, lz: number) => {
      for (let n = 0; n < 60; n++) {
        here();
        const dx = lx - local.x,
          dz = lz - local.z;
        if (Math.hypot(dx, dz) < 0.1) break;
        const py = plat.yawOf(p.body.quaternion);
        const c = Math.cos(py),
          s = Math.sin(py);
        // Deck frame to world: the heading W walks.
        const wx = dx * c + dz * s,
          wz = -dx * s + dz * c;
        cam.yaw = me.yaw = Math.atan2(-wx, -wz);
        input.keys.add('KeyW');
        await wait(16);
        input.keys.delete('KeyW');
        await wait(70);
      }
      input.keys.delete('KeyW');
    };
    const spots = (q.get('spots') ?? '0:0,0.9:0,-0.9:0,1:0,-1:0,0:0.9,0:-0.9')
      .split(',')
      .map((t) => t.split(':').map(Number));
    const trips = Number(q.get('trips') ?? 1);
    let trip = 0,
      lost = 0;
    // Line 2's train has just been started and is about to leave: wait for an arrival, with the whole dwell ahead.
    while (tr.stop !== -1) await wait(50);
    for (let round = 0; round < trips; round++)
      for (const [fx, fz] of spots) {
        while (tr.stop === -1) await wait(50);
        const stop = tr.stop;
        const c = tr.cars[carK]!.body.position;
        putW(c.x, c.y + 1.4, c.z, cam.yaw);
        await wait(350);
        const lx = fx! * p.hx,
          lz = fz! * p.hz;
        await walkTo(lx, lz);
        await wait(150);
        here();
        const x0 = local.x,
          z0 = local.z;
        let maxD = 0,
          off = -1,
          offAt = '';
        const t0 = performance.now();
        let sawMove = false;
        while (performance.now() - t0 < 60000) {
          here();
          maxD = Math.max(maxD, Math.hypot(local.x - x0, local.z - z0));
          if (tr.stop === -1) sawMove = true;
          if (off < 0 && !plat.carry.on) {
            off = (performance.now() - t0) / 1000;
            offAt = `s=${tr.s.toFixed(1)} v=${(tr as unknown as { v: number }).v.toFixed(1)} l=${local.x.toFixed(2)},${local.z.toFixed(2)}`;
          }
          if (sawMove && tr.stop !== -1) break;
          await wait(16);
        }
        await wait(300);
        const fell = off >= 0;
        if (fell) lost++;
        note(
          `#${trip++} line${k} car${carK} ${stop ? 'far>home' : 'home>far'} spot ${fx},${fz} at ${x0.toFixed(2)},${z0.toFixed(2)} drift ${maxD.toFixed(2)} ` +
            (fell ? `FELL t=${off.toFixed(1)} ${offAt}${me.swimming ? ' IN WATER' : ''}` : 'ok'),
        );
      }
    note(`DONE lost ${lost}/${trip}`);
    // Leaving on purpose still works: W off the side at a stop, then a jump off the other.
    for (const way of ['walk', 'jump'] as const) {
      while (tr.stop === -1) await wait(50);
      const c = tr.cars[carK]!.body.position;
      putW(c.x, c.y + 1.4, c.z, cam.yaw);
      await wait(350);
      const py = plat.yawOf(p.body.quaternion);
      cam.yaw = me.yaw = py + (way === 'walk' ? Math.PI / 2 : -Math.PI / 2);
      input.keys.add('KeyW');
      if (way === 'jump') {
        await wait(150);
        me.jumpQueued = 0.2;
      }
      await wait(900);
      input.keys.delete('KeyW');
      note(`${way} off: ${plat.carry.on === p ? 'STILL ON' : 'left the deck'}`);
      await wait(1000);
      while (tr.stop !== -1) await wait(50);
    }
    (window as unknown as { __rideDone: boolean }).__rideDone = true;
  })();
} else if (shot === 'layride') {
  // The same on the machine's flatbed through each stretch it lays, line 1 then the shunt and line 2. &spots as for `ride`.
  void (async () => {
    const note = (t: string) => console.log('RIDE ' + t);
    const p = (place.machine.flatbed as unknown as { platform: import('../../../src/physics/platforms.ts').Platform })
      .platform;
    const local = { x: 0, y: 0, z: 0, yaw: 0 };
    const here = () => plat.toPlatform(p, body.position, 0, local);
    const spots = (q.get('spots') ?? '-1:-0.8,1:-0.8,-1.1:-0.8,1.1:-0.8,0:-0.8,0:-1.08')
      .split(',')
      .map((t) => t.split(':').map(Number));
    let n = 0,
      lost = 0;
    place.wake();
    place.skipDelivery();
    await wait(300);
    const stand = async (fx: number, fz: number) => {
      const f = place.machine.flatbed.body.position;
      putW(f.x, f.y + 1.4, f.z, cam.yaw);
      await wait(350);
      for (let i = 0; i < 40; i++) {
        here();
        const dx = fx * p.hx - local.x,
          dz = fz * p.hz - local.z;
        if (Math.hypot(dx, dz) < 0.1) break;
        const py = plat.yawOf(p.body.quaternion),
          c = Math.cos(py),
          s = Math.sin(py);
        cam.yaw = me.yaw = Math.atan2(-(dx * c + dz * s), -(-dx * s + dz * c));
        input.keys.add('KeyW');
        await wait(16);
        input.keys.delete('KeyW');
        await wait(70);
      }
      await wait(120);
      here();
    };
    const watch = async (label: string, until: () => boolean, fx: number, fz: number) => {
      await stand(fx, fz);
      const x0 = local.x,
        z0 = local.z;
      let maxD = 0,
        off = '';
      const t0 = performance.now();
      while (!until() && performance.now() - t0 < 70000) {
        here();
        maxD = Math.max(maxD, Math.hypot(local.x - x0, local.z - z0));
        if (!off && !plat.carry.on)
          off = `FELL at ${((performance.now() - t0) / 1000).toFixed(1)} s l=${local.x.toFixed(2)},${local.z.toFixed(2)}`;
        await wait(16);
      }
      if (off) lost++;
      note(
        `#${n++} machine ${label} spot ${fx},${fz} at ${x0.toFixed(2)},${z0.toFixed(2)} drift ${maxD.toFixed(2)} ${off || 'ok'}${me.swimming ? ' IN WATER' : ''}`,
      );
    };
    const laid = () => place.run.mode !== 'laying' && place.run.mode !== 'feeding';
    const [a, b, c, d, e, f] = spots as [number[], number[], number[], number[], number[], number[]];
    await waitMode('laying');
    await watch('L1 stretch 1', laid, a![0]!, a![1]!);
    await waitMode('idle');
    place.skipDelivery();
    await waitMode('laying');
    await watch('L1 trestle', laid, b![0]!, b![1]!);
    await waitMode('idle');
    place.skipDelivery();
    await waitMode('laying');
    await watch(
      'L1 stretch 3 and run in',
      () => place.run.mode === 'waiting' || place.run.mode === 'turning',
      c![0]!,
      c![1]!,
    );
    place.lines[0]!.train.clock.running = false;
    place.skipLine2();
    await wait(800);
    place.skipDelivery();
    await waitMode('laying');
    await watch('L2 stretch 1', laid, d![0]!, d![1]!);
    await waitMode('idle');
    place.skipDelivery();
    await waitMode('laying');
    await watch('L2 stretch 2', laid, e![0]!, e![1]!);
    await waitMode('idle');
    place.skipDelivery();
    await waitMode('laying');
    await watch('L2 stretch 3', laid, f![0]!, f![1]!);
    note(`DONE lost ${lost}/${n}`);
    (window as unknown as { __rideDone: boolean }).__rideDone = true;
  })();
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
        await openCrate(); // the last stretch's, waiting by the frame
        await wait(1400);
        if (k === 2 && !st.full()) await alongLine(L1, 74, 118);
      }
      note(`station ${k + 1} full (${(now() - started).toFixed(1)} s chop and carry)`);
      await waitMode('laying');
      const lay0 = now();
      await waitMode(k < 2 ? 'idle' : 'running', 60000);
      note(`stretch ${k + 1} laid (${(now() - lay0).toFixed(1)} s)`);
    };
    // The crate the machine just handed down: walk into it, watch it.
    const openCrate = async () => {
      const c = place.giftState.crates()[0];
      if (!c) return;
      const n = place.giftState.got.length;
      await go(c.x, c.z, 1.2, 40000);
      while (place.giftState.got.length === n && place.giftState.crates().length) await wait(50);
      await wait(3300);
      note(`crate open: ${place.giftState.got.at(-1)}`);
    };
    const at = (n: number, lat: number): [number, number] => {
      const ln = L1.spec.line;
      const ux = ln.xs[n + 1]! - ln.xs[n]!,
        uz = ln.zs[n + 1]! - ln.zs[n]!;
      return [ln.xs[n]! + O - uz * lat, ln.zs[n]! + ux * lat];
    };
    const board = async (l: LineRun, stop: 0 | 1) => {
      const ln = l.spec.line;
      const tr = l.train.tr;
      const sAt = stop ? ln.len - place.TUNE.stopIn! : place.TUNE.stopIn!;
      // Line 1's village platform is on the forge's side of the track, its far one on the other.
      if (stop) await go(ln.xs[Math.round(sAt)]! + O + 2, ln.zs[Math.round(sAt)]! + 2.4, 2.5);
      else {
        // Up its side ramp and along it to where the train stops.
        await go(...at(24, -10.5), 1.5);
        await go(...at(24, -3), 1);
        await go(...at(Math.round(sAt), -2.9), 1.5);
      }
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
        // To the middle of the deck, as anyone would.
        for (
          let n = 0;
          n < 25 && plat.carry.on && Math.hypot(body.position.x - c.x, body.position.z - c.z) > 0.6;
          n++
        ) {
          cam.yaw = me.yaw = yawTo(body.position.x, body.position.z, c.x, c.z);
          await wait(40);
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
    const rest = async () => {
      await board(L1, 1);
      note(`home, forge ${place.forge.crates}/${place.TUNE.forgeCost}`);
      // Off the train at once, as anyone would: it leaves again in 5 s.
      const pos = (w: string) =>
        q.get('legs') &&
        note(
          `${w} ${body.position.x.toFixed(1)},${body.position.y.toFixed(1)},${body.position.z.toFixed(1)} carry ${plat.carry.on ? 'y' : 'n'}`,
        );
      pos('home');
      await go(...at(14, -3.4), 1, 4000);
      pos('platform');
      await go(place.RACK.x, place.RACK.z, 3.2);
      note('off the train, at the rack');
      const t2 = performance.now();
      while (!place.forge.lit && performance.now() - t2 < 120000) await wait(200);
      note(`forge lit ${place.forge.lit}`);
      await waitMode('idle', 20000);
      note('machine on line 2');
      await wait(1000);
    };
    note('start');
    if (q.get('from') === 'line2') {
      place.skipLine2();
      await wait(4500);
    } else if (q.get('from') === 'home') {
      // From the first ride home: for a quick look at the run's second half.
      place.skipForge();
      const tr = L1.train.tr;
      while (tr.stop !== 1) await wait(50);
      const c = tr.cars[1]!.body.position;
      putW(c.x, c.y + 1.4, c.z, 0);
      await wait(600);
      await rest();
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
      await waitMode('idle', 8000);
      note('woke (the show)');
      await deliverLine1(0);
      await deliverLine1(1);
      await deliverLine1(2);
      note('line 1 open');
      await wait(4000);
      await openCrate(); // by the platform
      // The first train comes in. Hop on at the village and ride it out and back with the next load.
      await board(L1, 0);
      await rest();
    }
    const carryOut = async (k: number) => {
      const st = L2.stations[k]!;
      const started = now();
      while (!st.full()) {
        const rack = place.RACK;
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
        await openCrate();
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
    await alongLine(L2, L2.stations[2]!.spec.s, L2.spec.line.len - 10);
    await openCrate();
    const t3 = performance.now();
    while (place.s.stone === 0 && performance.now() - t3 < 120000) await wait(200);
    note(`stone reached the village: ${place.s.stone}`);
    note(`WHOLE RUN ${now().toFixed(1)} s`);
    (window as unknown as { __placeDone: boolean }).__placeDone = true;
  })();
}
if (q.get('cam') !== 'fixed') setTimeout(() => window.__debugCam!.clear(), 300); // the follow camera: what you'd see
export {};
