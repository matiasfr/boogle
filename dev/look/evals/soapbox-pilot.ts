// A pilot for the soapbox prototype (src/proto/soapbox/), for the soapbox-*.js look evals (run, drift, crash).
// It drives through the real input (the left stick and the jump button's hold), so what the sheets show is what a
// player gets. Needs ?proto=soapbox: BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-run.js
import { input } from '../../../src/player/input.ts';
import { me } from '../../../src/player/player.ts';
import { forEachStatic } from '../../../src/physics/engine.ts';
import { GROUP } from '../../../src/physics/physics.ts';

type Box = {
  S: { heading: number; seated: boolean; slip: number; drifting: boolean; grounded: boolean; boostLeft: number };
  LINE: [number, number][];
  body: { position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } };
  board: () => void;
  backToTop: () => void;
  run: { state: string; time: number; best: number };
};
type Plan = {
  path?: [number, number][]; // world x, z waypoints to steer through (default: the course's line)
  drift?: [number, number]; // seconds after the start to hold the handbrake (steering `driftSteer`)
  driftSteer?: number; // -1 left .. 1 right
  driftCorners?: boolean; // handbrake into the sharp corners instead of braking
  seconds?: number;
};
export type Stats = {
  boarded: boolean;
  top: number; // m/s
  slip: number; // most sideways speed, m/s
  drifted: number; // s with the handbrake drifting
  air: number; // longest time off the ground, s
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
    air: 0,
    thrown: false,
    state: '',
    time: 0,
    seconds: 0,
  });
  let last = t0,
    airFor = 0;
  const path = plan.path ?? box.LINE.slice(1);
  const step = () => {
    const now = performance.now();
    const t = (now - t0) / 1000;
    const v = box.body.velocity;
    const speed = Math.hypot(v.x, v.z);
    while (wp < path.length - 1 && Math.hypot(path[wp][0] - p.x, path[wp][1] - p.z) < 4) wp++;
    const [tx, tz] = path[wp];
    const err = wrap(Math.atan2(-(tx - p.x), -(tz - p.z)) - box.S.heading);
    let steer = Math.max(-1, Math.min(1, -err * 2.5));
    // how sharp the corner at the next waypoint is, and how far off it is: brake (or drift) into the sharp ones
    const nx = path[Math.min(wp + 1, path.length - 1)];
    const turn = Math.abs(wrap(Math.atan2(-(nx[0] - tx), -(nx[1] - tz)) - Math.atan2(-(tx - p.x), -(tz - p.z))));
    const dist = Math.hypot(tx - p.x, tz - p.z);
    const sharp = turn > 1.3 && dist < 9 + speed * 0.4;
    let drifting = !!plan.drift && t > plan.drift[0] && t < plan.drift[1];
    if (drifting) steer = plan.driftSteer ?? steer;
    if (plan.driftCorners && (sharp || (box.S.drifting && Math.abs(err) > 0.35)) && speed > 6) drifting = true;
    me.jumpHeld = drifting;
    input.stickX = steer;
    const bend = turn > 0.6 && dist < 6 + speed * 0.6 && speed > 9;
    const brake = !drifting && !box.S.boostLeft && ((sharp && speed > 8) || bend || (Math.abs(err) > 1 && speed > 6));
    input.stickY = brake ? 1 : speed < 4.5 ? -1 : 0; // kick along when slow
    stats.top = Math.max(stats.top, speed);
    stats.slip = Math.max(stats.slip, Math.abs(box.S.slip));
    if (box.S.drifting) stats.drifted += (now - last) / 1000;
    airFor = box.S.grounded ? 0 : airFor + (now - last) / 1000;
    stats.air = Math.max(stats.air, airFor);
    last = now;
    stats.state = box.run.state;
    stats.time = box.run.time;
    stats.seconds = t;
    if (box.S.seated && t < (plan.seconds ?? 60) && box.run.state !== 'done') requestAnimationFrame(step);
    else {
      stats.thrown = !box.S.seated && box.run.state === 'crashed';
      input.stickX = input.stickY = 0;
      me.jumpHeld = false;
    }
  };
  requestAnimationFrame(step);
  return { boarded: box.S.seated };
}

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
