// A pilot for the haul variants (src/proto/haul/), for the haul-*.js look evals: fills your stack from the bundles,
// walks you along waypoints through the real input (the left stick, the sprint latch) and tosses through the real use
// action, so what the sheets show is what a player gets. Needs the variant on:
//   BOOGLE_QUERY='proto=haul&v=barrow' npm run look -- --eval dev/look/evals/haul-barrow-push.js ...
import { rules } from '../../../src/world/game-world.ts';
import { submitEdit } from '../../../src/world/sync.ts';
import { identity } from '../../../src/player/identity.ts';
import { input } from '../../../src/player/input.ts';
import { me, cam } from '../../../src/player/player.ts';
import { triggerAction } from '../../../src/player/controls.ts';
import { touchDown, useUp } from '../../../src/player/hands.ts';
import { teleport } from '../../../src/physics/physics.ts';
import { groundHeight } from '../../../src/adapters/terrain.ts';

type Barrow = {
  S: { mode: string; wobble: number; heading: number };
  T: Record<string, number>;
  body: { position: { x: number; y: number; z: number } };
  grab: () => void;
  place: (x: number, z: number, heading?: number) => void;
};
const win = window as unknown as { __barrow?: Barrow; __debugCam?: { clear(): void } };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// Sheets without the tuning panel or the first-run card over the action.
const style = document.createElement('style');
style.textContent = '.first-run, .haul-kit { display: none !important }';
document.head.append(style);

export async function barrow() {
  for (let k = 0; k < 100 && !win.__barrow; k++) await sleep(100);
  return win.__barrow!;
}

export const myCount = () => (identity.pid ? rules.stacks.count(identity.pid) : 0);

/** Takes logs from bundles until you carry at least n (4 a take). */
export async function fill(n: number) {
  for (let k = 0; k < 100 && !identity.pid; k++) await sleep(100);
  const ids = rules.sources.list().map((_, id) => id);
  for (const id of ids) {
    if (myCount() >= n) break;
    if (rules.sources.charges(id) <= 0) continue;
    const before = myCount();
    submitEdit({ op: 'src.take', i: 0, j: 0, id });
    for (let k = 0; k < 40 && myCount() === before; k++) await sleep(100);
  }
  return myCount();
}

/** Puts you at (x, z) facing yaw, on the ground there (or on `floor`, for something standing over it: a sandbar). */
export function stand(x: number, z: number, yaw = 0, floor = groundHeight(x, z)) {
  if (!me.body) return;
  teleport(me.body, x, floor + 1, z);
  me.body.velocity.set(0, 0, 0);
  me.yaw = cam.yaw = yaw;
}

/** Walks along the waypoints (sprinting if asked) for up to `seconds`; resolves when done. */
export function walk(path: [number, number][], { sprint = false, seconds = 8 } = {}) {
  const t0 = performance.now();
  let wp = 0;
  return new Promise<void>((done) => {
    const step = () => {
      const p = me.body!.position;
      while (wp < path.length - 1 && Math.hypot(path[wp][0] - p.x, path[wp][1] - p.z) < 1.2) wp++;
      const [tx, tz] = path[wp];
      const last = wp === path.length - 1 && Math.hypot(tx - p.x, tz - p.z) < 0.6;
      cam.yaw = Math.atan2(-(tx - p.x), -(tz - p.z));
      input.stickX = 0;
      input.stickY = last ? 0 : -1;
      input.sprint = sprint && !last;
      if (!last && performance.now() - t0 < seconds * 1000) requestAnimationFrame(step);
      else {
        input.stickY = 0;
        input.sprint = false;
        done();
      }
    };
    requestAnimationFrame(step);
  });
}

/** Faces (tx, tz) (camera too) and holds the use button for `ms`: the real action (click, pad X). */
export async function holdUse(tx: number, tz: number, ms: number) {
  const p = me.body!.position;
  cam.yaw = me.yaw = Math.atan2(-(tx - p.x), -(tz - p.z));
  triggerAction('use', 'down');
  await sleep(ms);
  triggerAction('use', 'up');
}

/** The same through the touch Grab button's calls (src/player/input.ts: touchDown on press, useUp on release). */
export async function holdTouch(tx: number, tz: number, ms: number) {
  const p = me.body!.position;
  cam.yaw = me.yaw = Math.atan2(-(tx - p.x), -(tz - p.z));
  touchDown();
  await sleep(ms);
  useUp();
}

export const freeCam = () => setTimeout(() => win.__debugCam?.clear(), 400);
export { wrap };

/** A corner readout in the sheets: what the pilot and the barrow are doing (`fn` returns the text). */
export function overlay(fn: () => string) {
  const d = document.createElement('div');
  d.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:99;font:600 13px ui-monospace,monospace;color:#fff;background:#0009;padding:4px 8px;border-radius:6px';
  document.body.append(d);
  const tick = () => {
    d.textContent = fn();
    requestAnimationFrame(tick);
  };
  tick();
}
export function barrowLine(B: Barrow) {
  const S = B.S as unknown as { mode: string; wobble: number; speed: number; grade: number; why: string };
  return `${S.mode} wobble ${S.wobble.toFixed(2)} v ${S.speed.toFixed(1)} grade ${S.grade.toFixed(2)} ${S.why} | logs ${myCount()}`;
}
