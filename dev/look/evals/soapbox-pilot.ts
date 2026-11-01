// A pilot for the soapbox prototype (src/proto/soapbox/), for the soapbox-*.js look evals (run, drift, crash).
// It drives through the real input (the left stick and the jump button's hold), so what the sheets show is what a
// player gets. Needs ?proto=soapbox: BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-run.js
import { input } from '../../../src/player/input.ts';
import { me } from '../../../src/player/player.ts';
import { forEachStatic } from '../../../src/physics/engine.ts';
import { GROUP } from '../../../src/physics/physics.ts';

type Box = {
  S: { heading: number; seated: boolean; slip: number; drifting: boolean };
  body: { position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } };
  board: () => void;
  backToTop: () => void;
  run: { state: string; time: number; best: number };
};
type Plan = {
  path: [number, number][]; // world x, z waypoints to steer through
  drift?: [number, number]; // seconds after the start to hold the handbrake (steering `driftSteer`)
  driftSteer?: number; // -1 left .. 1 right
  seconds?: number;
};
export type Stats = {
  boarded: boolean;
  top: number; // m/s
  slip: number; // most sideways speed, m/s
  drifted: number; // s with the handbrake drifting
  thrown: boolean;
  state: string;
  time: number;
  seconds: number;
};

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const win = window as unknown as { __soapbox?: Box; __debugCam?: { clear(): void }; __pilot?: Stats };

async function soapbox() {
  for (let k = 0; k < 100 && !win.__soapbox; k++) await new Promise((r) => setTimeout(r, 100));
  return win.__soapbox;
}

// Sheets without the first-run card over the cart.
const style = document.createElement('style');
style.textContent = '.first-run { display: none !important }';
document.head.append(style);

/** Get in (from wherever the cart is), or go back to the top if already in, then drive `plan`. */
export async function drive(plan: Plan) {
  const box = await soapbox();
  if (!box || !me.body) return { error: 'no soapbox (is ?proto=soapbox on?)' };
  const p = box.body.position;
  box.backToTop(); // the cart (and you, if in it) to the start
  if (!box.S.seated) {
    me.body.position.set(p.x + 1.5, p.y + 0.5, p.z); // stand beside it, then get in
    box.board();
  }
  setTimeout(() => win.__debugCam?.clear(), 400); // after look.mjs freezes its view: follow with the game camera
  const t0 = performance.now();
  let wp = 0;
  const stats: Stats = (win.__pilot = {
    boarded: box.S.seated,
    top: 0,
    slip: 0,
    drifted: 0,
    thrown: false,
    state: '',
    time: 0,
    seconds: 0,
  });
  let last = t0;
  const step = () => {
    const now = performance.now();
    const t = (now - t0) / 1000;
    const v = box.body.velocity;
    const speed = Math.hypot(v.x, v.z);
    while (wp < plan.path.length - 1 && Math.hypot(plan.path[wp][0] - p.x, plan.path[wp][1] - p.z) < 4) wp++;
    const [tx, tz] = plan.path[wp];
    const err = wrap(Math.atan2(-(tx - p.x), -(tz - p.z)) - box.S.heading);
    let steer = Math.max(-1, Math.min(1, -err * 2.5));
    const drifting = !!plan.drift && t > plan.drift[0] && t < plan.drift[1];
    if (drifting) steer = plan.driftSteer ?? steer;
    me.jumpHeld = drifting;
    input.stickX = steer;
    input.stickY = speed < 4.5 && t < 3 ? -1 : 0; // kick off the pad
    stats.top = Math.max(stats.top, speed);
    stats.slip = Math.max(stats.slip, Math.abs(box.S.slip));
    if (box.S.drifting) stats.drifted += (now - last) / 1000;
    last = now;
    stats.state = box.run.state;
    stats.time = box.run.time;
    stats.seconds = t;
    if (box.S.seated && t < (plan.seconds ?? 14) && box.run.state !== 'done') requestAnimationFrame(step);
    else {
      stats.thrown = !box.S.seated && box.run.state === 'crashed';
      input.stickX = input.stickY = 0;
      me.jumpHeld = false;
    }
  };
  requestAnimationFrame(step);
  return { boarded: box.S.seated };
}

// The lighthouse path from the start to past the finish (src/pois/lighthouse/site.ts, path "down towards home"), on to the finish on the flats.
export const PATH: [number, number][] = [
  [6.6, -45],
  [8, -36],
  [9.5, -27],
  [10.6, -16],
  [11.5, -6],
  [12.5, 4],
  [13, 12],
];

/** The nearest solid thing (a palm trunk, a rock) to x, z, not the lighthouse: something to crash into. */
export function obstacle(x: number, z: number): [number, number] | null {
  let best: [number, number] | null = null,
    bestD = 22;
  forEachStatic(GROUP.SCENERY, (b, shapes) => {
    for (const s of shapes) {
      if (s.kind !== 'sphere' && s.kind !== 'cylinder' && s.kind !== 'box') continue;
      const sx = b.position.x + (s.offset?.x ?? 0),
        sy = b.position.y + (s.offset?.y ?? 0),
        sz = b.position.z + (s.offset?.z ?? 0);
      const d = Math.hypot(sx - x, sz - z);
      if (d < bestD && sy < 6 && Math.hypot(sx - 6, sz + 58) > 14) {
        bestD = d;
        best = [sx, sz];
      }
    }
  });
  return best;
}
