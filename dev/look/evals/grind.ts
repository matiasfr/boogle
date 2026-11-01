// Film the movement prototypes: grinding the laid rails (src/proto/grind/, ?proto=wagon&grind=1) and the double jump
// and glide (src/proto/moves/, &jump2=1&glide=1). An eval body imports this and calls run():
//   echo "await (await import('/dev/look/evals/grind.ts')).run()" > /tmp/e.js
//   BOOGLE_QUERY='proto=wagon&grind=1&laid=3&jump2=1&glide=1&gt=board' \
//     npm run look -- --eval /tmp/e.js --warm 0.2 --seconds 3 --frames 12
// gt= (the shot):
//   board    you drop onto the rail from the side at 8 m/s, at d= m along the line (default 14), heading away from the
//            first site; the game's camera follows
//   reverse  board, then pull back (S) after rt ms (default 1200)
//   end      board 8 m before the railhead heading for it: fly off into the tumble (a fixed camera beside the end)
//   bonk     board heading back toward the first site, where the wagon stands (or wp=2 and d=26: toward the wagon
//            standing at the third site, heading away from the first)
//   jump2    on the court (x=, z=), run, jump, a second jump at the apex, then hold it to glide down (a fixed camera)
//   full     board at the first site (d=0.4) heading out, ride the whole line (hopping the track machine standing on
//            it) and fly off the far railhead into the tumble; the wagon is parked out of the way (wp= is ignored)
// side=1 (or -1, the other side) puts a fixed camera 9 m beside the rail, 6 m on (ahead=), instead of the follow camera.
import { me, cam } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { teleport } from '../../../src/physics/physics.ts';
import { onPreStep } from '../../../src/physics/engine.ts';
import { groundHeight } from '../../../src/adapters/terrain.ts';
import { ROUTE } from '../../../src/sim/route.ts';

type DebugCam = { set(cam: number[], look: number[]): void; clear(): void };
type Wagon = { seekPhase(p: number): void; pace: { cruise: number; accel: number } };
const win = window as unknown as { __debugCam: DebugCam; __wagon?: Wagon; __grind?: unknown };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => unknown, ms = 8000) => {
  for (const t0 = performance.now(); !fn() && performance.now() - t0 < ms;) await sleep(50);
  return fn();
};

// The line as the wagon measures it: the point d m along, and its direction.
function lineAt(d: number) {
  for (const r of ROUTE) {
    const len = Math.round(Math.hypot(r.to[0] - r.x, r.to[1] - r.z) * 100) / 100;
    const ux = (r.to[0] - r.x) / len,
      uz = (r.to[1] - r.z) / len;
    if (d <= len || r === ROUTE[ROUTE.length - 1]) return { x: r.x + ux * d, z: r.z + uz * d, ux, uz };
    d -= len;
  }
  throw new Error('no route');
}
const lineLength = (laid: number) =>
  ROUTE.slice(0, laid).reduce((t, r) => t + Math.round(Math.hypot(r.to[0] - r.x, r.to[1] - r.z) * 100) / 100, 0);

function press(ms: number) {
  me.jumpQueued = 0.15;
  me.jumpHeld = true;
  setTimeout(() => (me.jumpHeld = false), ms);
}
// Drop in from 1.2 m over the rail at d, 0.5 m to its side, moving `dir` along it at `speed` with a slight inward angle.
function drop(d: number, dir: number, speed = 8) {
  const t = lineAt(d);
  const sx = -t.uz,
    sz = t.ux; // sideways
  const x = t.x + sx * 0.5,
    z = t.z + sz * 0.5;
  teleport(me.body!, x, groundHeight(x, z) + 0.2 + 0.45 + 1.2, z);
  // Held for a few steps, so the shot starts at that speed whatever the controller does with no stick.
  let steps = 6;
  onPreStep(() => {
    if (steps-- > 0) me.body!.velocity.set(t.ux * dir * speed - sx * 0.8, -1, t.uz * dir * speed - sz * 0.8);
  });
  me.yaw = Math.atan2(-t.ux * dir, -t.uz * dir);
  cam.yaw = me.yaw;
  cam.pitch = -0.25;
  return t;
}
function sideCam(d: number, off = 7, up = 2.5, at = 0) {
  const t = lineAt(d);
  const x = t.x - t.uz * off + t.ux * at,
    z = t.z + t.ux * off + t.uz * at;
  const y = groundHeight(t.x, t.z);
  setTimeout(() => win.__debugCam.set([x, y + up, z], [t.x, y + 0.8, t.z]), 300);
}

export async function run() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('gt') || 'board';
  const num = (k: string, v: number) => (q.has(k) ? Number(q.get(k)) : v);
  const style = document.createElement('style');
  style.textContent = '.first-run, .wagon-proto { display: none !important }';
  document.head.append(style);
  if (!(await until(() => me.body && win.__wagon))) throw new Error('no wagon: add proto=wagon');
  // The wagon standing at stop wp= (default 0, the first site) for a few seconds.
  const { wagonAt, wagonCycle } = await import('../../../src/sim/wagon.ts');
  const laid = num('laid', 3),
    pace = win.__wagon!.pace;
  let ph = 0;
  while (ph < wagonCycle(laid, pace) && wagonAt(laid, ph, 0, pace)!.stop !== num('wp', 0)) ph++;
  // The full line has no room for the wagon anywhere on it: park it (its clock before the line was laid).
  win.__wagon!.seekPhase(shot === 'full' ? -1e9 : ph + 5);
  await sleep(400);
  if (shot === 'jump2') {
    // On the flat court (x=, z=), running toward -z, filmed from the east.
    const x = num('x', 12),
      z = num('z', 27),
      y = groundHeight(x, z);
    teleport(me.body!, x, y + 0.5, z);
    me.body!.velocity.set(0, 0, 0);
    me.yaw = cam.yaw = 0;
    setTimeout(() => win.__debugCam.set([x + 13, y + 2.5, z - 8], [x, y + 1.5, z - 8]), 300);
    // Run from the start, jump after jt= ms (default 900, once the film has started), and again at the top, held.
    input.keys.add('KeyW');
    void (async () => {
      await sleep(num('jt', 900));
      press(150);
      await until(() => me.body!.velocity.y > 2, 1000); // off the ground
      await until(() => me.body!.velocity.y < num('at', 0.3), 2000); // at the top
      press(2200); // the second jump, held: the glide
      setTimeout(() => input.keys.delete('KeyW'), 2600);
    })();
    return 'jump2';
  }
  if (!win.__grind) throw new Error('no grind: add grind=1');
  const L = lineLength(laid);
  const d = shot === 'end' ? L - num('before', 8) : num('d', shot === 'full' ? 0.4 : 14);
  const dir = shot === 'bonk' && !q.has('wp') ? -1 : 1;
  if (shot === 'end') sideCam(L, 9 * num('side', -1), 3, -1);
  else if (q.has('side')) sideCam(d + dir * num('ahead', 6), 9 * num('side', 1), 3);
  else setTimeout(() => win.__debugCam.clear(), 300);
  drop(d, dir);
  if (shot === 'reverse')
    setTimeout(
      () => {
        input.keys.add('KeyS');
        setTimeout(() => input.keys.delete('KeyS'), 350);
      },
      num('rt', 1200),
    );
  return shot;
}
