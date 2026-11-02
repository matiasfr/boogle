// The long crossing (?proto=crossing, src/proto/crossing/): puts you on the train already running, at a point on the
// line, and logs how well you stay on the deck. Follow camera unless a shot says otherwise. Pick with the query:
//   BOOGLE_QUERY='proto=crossing[&v=express|vast]&crosstest=ride&crossat=0.5'   riding, at that fraction of the line
//   crosstest=spawn       standing beside the train at the home station, about to leave
//   crosstest=walk        on the walkway at crossat, looking along it
//   crosstest=back        on the far stop, looking back
//   crosstest=jump        jumps sideways off the train at crossat and watches the skid from the side
//   crosstest=play        real input from the spawn: walks onto a flatbed and rides to the far stop
//   crosstest=sprint      on the walkway at crossat, sprinting along it (past the map's soft wall at crossat=0.15)
//   crosstest=swim        in the sea at crossat, swimming away from the line
// window.__crossLog after a few seconds: [{ x, z, y spread on the deck in mm, frames, onDeck frames, speed }].
// e.g. BOOGLE_QUERY='proto=crossing&v=express&crosstest=ride&crossat=0.5' npm run look -- --eval dev/look/evals/crossing.ts
const q = new URLSearchParams(location.search);
const test = q.get('crosstest') || 'ride';
const frac = Number(q.get('crossat') || 0.5);
type Pt = { x: number; z: number; ux: number; uz: number };
const cross = window.__crossing as {
  LENGTH: number;
  STOP_B: number;
  train: { s: number; v: number; stop: number };
  clock: { t: number; running: boolean };
  cars: {
    platform: unknown;
    body: { position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } };
    yaw: number;
    spec: { top: number };
    hy: number;
  }[];
  seekS: (s: number) => void;
  setSpeed: (x: number, z: number) => void;
  lineAt: (s: number, out: Pt) => Pt;
  railY: (s: number) => number;
};
if (!cross) throw new Error('no crossing: add proto=crossing to the query');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const plat = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { teleport } = (await import(
  '/src/physics/physics.ts' as string
)) as typeof import('../../../src/physics/physics.ts');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(100);
await wait(800); // the prototype bar has placed you
const body = me.body!;
const P: Pt = { x: 0, z: 0, ux: 0, uz: 1 };
const SPAWN = 3.142;
if (test === 'spawn' || test === 'play') {
  cam.yaw = me.yaw = SPAWN;
  cam.pitch = -0.12;
} else if (test === 'swim') {
  cross.lineAt(frac * cross.LENGTH, P);
  teleport(body, P.x + 40, 0.1, P.z);
  body.velocity.set(0, 0, 0);
  cross.setSpeed(0, 0);
  cam.yaw = me.yaw = -Math.PI / 2; // looking east, away from the line
  cam.pitch = -0.1;
  input.keys.add('KeyW');
} else if (test === 'walk' || test === 'back' || test === 'sprint') {
  const s = test === 'back' ? cross.STOP_B + 16 : frac * cross.LENGTH;
  cross.lineAt(s, P);
  const l = test === 'back' ? 12 : 2.1;
  teleport(body, P.x - P.uz * l, cross.railY(s) + 0.7 + 0.47 + 0.2, P.z + P.ux * l);
  body.velocity.set(0, 0, 0);
  cross.setSpeed(0, 0);
  cam.yaw = me.yaw = test === 'back' ? Math.atan2(P.ux, P.uz) : Math.atan2(P.ux, P.uz) + Math.PI;
  cam.pitch = -0.1;
  if (test === 'sprint') {
    input.keys.add('KeyW');
    input.keys.add('ShiftLeft');
  }
} else {
  cross.seekS(frac * cross.LENGTH);
  await wait(200);
  const car = cross.cars[2]!;
  const p = car.body.position;
  teleport(body, p.x, p.y + car.hy + 0.47 + 0.05, p.z);
  body.velocity.set(car.body.velocity.x, car.body.velocity.y, car.body.velocity.z);
  plat.carry.x = car.body.velocity.x;
  plat.carry.z = car.body.velocity.z;
  cross.setSpeed(car.body.velocity.x, car.body.velocity.z);
  cam.yaw = me.yaw = car.yaw + Math.PI;
  cam.pitch = -0.12;
}
setTimeout(() => window.__debugCam!.clear(), 300);

if (test === 'play') input.keys.add('KeyA'); // the flatbed is on your left, level with the platform
if (test === 'play') setTimeout(() => input.keys.delete('KeyA'), 700);
// crosskey=KeyD jumps toward the walkway (a slide along it), KeyA (default) over the far edge into the sea.
const jumpKey = q.get('crosskey') || 'KeyA';
if (test === 'jump') {
  setTimeout(() => {
    input.keys.add(jumpKey);
    me.jumpQueued = 0.15;
    me.jumpHeld = true;
  }, 1200);
  setTimeout(() => {
    input.keys.delete(jumpKey);
    me.jumpHeld = false;
  }, 2200);
}

// A log of the play-through, for reading after: [seconds, s, speed, on the train?, x, y, z].
const trip: number[][] = [];
const t0 = performance.now();
const iv = setInterval(() => {
  const p = body.position;
  const on = cross.cars.some((c) => c.platform === plat.carry.on) ? 1 : 0;
  trip.push([
    +((performance.now() - t0) / 1000).toFixed(1),
    Math.round(cross.train.s),
    +Math.hypot(body.velocity.x, body.velocity.z).toFixed(1),
    on,
    Math.round(p.x),
    +p.y.toFixed(1),
    Math.round(p.z),
    me.swimming ? 1 : 0,
  ]);
}, 2000);
(window as unknown as { __crossTrip?: unknown; __crossStop?: unknown }).__crossTrip = trip;
(window as unknown as { __crossTrip?: unknown; __crossStop?: unknown }).__crossStop = () => clearInterval(iv);

// How steady you stay on the deck (frame by frame, in the deck's frame).
const car = cross.cars[2]!;
const log: Record<string, number>[] = [];
let n = 0,
  on = 0;
const xs: number[] = [],
  ys: number[] = [],
  zs: number[] = [];
const local = { x: 0, y: 0, z: 0, yaw: 0 };
const sample = () => {
  n++;
  const c = plat.carry.on;
  if (c === car.platform) {
    on++;
    plat.toPlatform(c as never, body.position, 0, local);
    xs.push(local.x);
    ys.push(local.y);
    zs.push(local.z);
  }
  if (n < 240) requestAnimationFrame(sample);
  else {
    const spread = (v: number[]) => (v.length ? Math.round((Math.max(...v) - Math.min(...v)) * 1000) : -1);
    log.push({
      xMm: spread(xs),
      yMm: spread(ys),
      zMm: spread(zs),
      frames: n,
      onDeck: on,
      speed: Math.hypot(car.body.velocity.x, car.body.velocity.z),
    });
  }
};
requestAnimationFrame(sample);
(window as unknown as { __crossLog?: unknown }).__crossLog = log;

export {}; // a module for the type checker; look.ts strips this line (an eval body, not imported)
