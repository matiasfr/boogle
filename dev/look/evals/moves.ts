// Film the double jump and glide (src/proto/moves/, &jump2=1&glide=1): on the court (x=, z=), run, jump, a second jump
// at the apex, then hold it to glide down, from a fixed camera. An eval body imports this and calls run():
//   echo "await (await import('/dev/look/evals/moves.ts')).run()" > /tmp/e.js
//   BOOGLE_QUERY='proto=moves&jump2=1&glide=1' npm run look -- --eval /tmp/e.js --warm 0.2 --seconds 3 --frames 12
import { me, cam } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { teleport } from '../../../src/physics/engine.ts';
import { groundHeight } from '../../../src/island/terrain.ts';

type DebugCam = { set(cam: number[], look: number[]): void; clear(): void };
const win = window as unknown as { __debugCam: DebugCam };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => unknown, ms = 8000) => {
  for (const t0 = performance.now(); !fn() && performance.now() - t0 < ms;) await sleep(50);
  return fn();
};

function press(ms: number) {
  me.jumpQueued = 0.15;
  me.jumpHeld = true;
  setTimeout(() => (me.jumpHeld = false), ms);
}

export async function run() {
  const q = new URLSearchParams(location.search);
  const num = (k: string, v: number) => (q.has(k) ? Number(q.get(k)) : v);
  const style = document.createElement('style');
  style.textContent = '.first-run { display: none !important }';
  document.head.append(style);
  if (!(await until(() => me.body))) throw new Error('no player');
  // On the flat court, running toward -z, filmed from the east.
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
