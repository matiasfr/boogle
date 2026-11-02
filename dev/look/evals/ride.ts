// Riding the ?proto=ride flatbed (src/proto/ride/index.ts): puts you on the deck, already moving, and hands the
// camera back to the game's follow camera. Pick a shot with the query (BOOGLE_QUERY):
//   proto=ride&ridetest=stand[&ridespeed=6]   stand still on a straight
//   proto=ride&ridetest=corner                 stand through the first corner
//   proto=ride&ridetest=jump&ridespeed=6       jump off sideways at speed, seen from a fixed camera beside the route
// window.__rideLog: where you are on the deck every 100 ms for 6 s ([ms, x and z in the deck's frame, height over
// the deck's centre, speed]).
// e.g. BOOGLE_QUERY='proto=ride&ridetest=stand&ridespeed=6' npm run look -- --eval dev/look/evals/ride.ts --warm 2 --seconds 2
const q = new URLSearchParams(location.search);
const test = q.get('ridetest') || 'stand';
type Pose = { x: number; y: number; z: number; yaw: number };
const ride = window.__ride as
  | {
      RIDE: { cruise: number };
      state: { s: number }; // null until placed
      body: { position: { x: number; y: number; z: number } };
      place: (s: number, speed: number, dir: number) => void;
      poseAt: (s: number) => Pose;
    }
  | undefined;
if (!ride) throw new Error('no flatbed: add proto=ride to the query');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { carry } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { teleport } = (await import(
  '/src/physics/physics.ts' as string
)) as typeof import('../../../src/physics/physics.ts');

const s0 = test === 'corner' ? 6 : 0.5;
ride.place(s0, ride.RIDE.cruise, 1);
const p = ride.poseAt(s0);
// Off the centre (left of it, towards the back), so the corners swing you round: deck top + body radius, a hair above.
const lx = -0.6,
  lz = -1;
const c = Math.cos(p.yaw),
  sn = Math.sin(p.yaw);
teleport(me.body!, p.x + lx * c + lz * sn, p.y + 0.15 + 0.47, p.z - lx * sn + lz * c);
const v = ride.RIDE.cruise;
me.body!.velocity.set(sn * v, 0, c * v);
carry.x = me.body!.velocity.x;
carry.z = me.body!.velocity.z;
me.yaw = p.yaw + Math.PI; // facing the way it goes
cam.yaw = p.yaw + Math.PI + 0.9; // a three-quarter view from behind and to the left
cam.pitch = -0.3;

if (test === 'jump') {
  // A fixed camera off the route's first straight, looking across it.
  const a = ride.poseAt(9);
  const sx = Math.cos(a.yaw),
    sz = -Math.sin(a.yaw); // the deck's right
  setTimeout(() => window.__debugCam!.set([a.x - sx * 14, a.y + 5, a.z - sz * 14], [a.x + sx * 2, a.y, a.z]), 400);
  setTimeout(() => {
    input.keys.add('KeyD'); // with the camera behind-left, right is off the deck's right side
    me.jumpQueued = 0.15;
    me.jumpHeld = true;
  }, 1300);
  setTimeout(() => {
    input.keys.delete('KeyD');
    me.jumpHeld = false;
  }, 1700);
} else setTimeout(() => window.__debugCam!.clear(), 400);

// A trace for the report: the player's offset on the deck (deck frame), sampled every 100 ms.
const log: number[][] = [];
const t0 = performance.now();
const iv = setInterval(() => {
  const b = ride.body.position,
    yaw = ride.state && ride.poseAt(ride.state.s).yaw;
  const rx = me.body!.position.x - b.x,
    rz = me.body!.position.z - b.z;
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw);
  log.push([
    Math.round(performance.now() - t0),
    +(rx * cy - rz * sy).toFixed(3),
    +(rx * sy + rz * cy).toFixed(3),
    +(me.body!.position.y - b.y).toFixed(3),
    +Math.hypot(me.body!.velocity.x, me.body!.velocity.z).toFixed(2),
  ]);
  if (log.length >= 60) clearInterval(iv);
}, 100);
(window as unknown as { __rideLog?: number[][] }).__rideLog = log;

export {}; // a module for the type checker; look.ts strips this line (an eval body, not imported)
