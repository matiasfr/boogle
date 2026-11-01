// Haul variant `toss` (?proto=haul&v=toss): take logs from the bundles as usual, then toss them at the work site.
// It shortens the last metres and never tests aim (docs/research/carrying-and-logistics-play.md rec 5): with empty
// hands and logs on your back, the use button (click, pad X, or the touch Use/Grab button when nothing is in reach) lobs a handful of 4 logs; holding it
// keeps tossing, so a full 60-log bundle empties in about 9 s, as long as a walk-in pour. A ring of the open site within
// reach (6-10 m) and roughly ahead of the camera is aimed for you; otherwise the handful lands 8 m ahead. Landing
// within the ring's radius plus 1 m counts as poured; a miss settles as a pile (./loose-logs.ts). Walking into a ring
// no longer pours. Serves DESIGN.md 2 (physics toys first) and 10 (slapstick).
import * as THREE from 'three/webgpu';
import { onFrame, onStart } from '../../loop.ts';
import { GRAVITY } from '../../constants.ts';
import { me, cam, throwFrom } from '../../player/player.ts';
import { heldId } from '../../player/inventory.ts';
import { describeControl } from '../../player/controls.ts';
import { emptyHands } from '../../player/hands.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { rules } from '../../world/game-world.ts';
import { ROUTE, TRACK, HELPER, ringAt } from '../../sim/route.ts';
import { launchLog, myLogs } from './loose-logs.ts';

export const TOSS = {
  handful: 4, // logs a toss (rec 5: start at 4)
  everyMs: 600, // held: one toss this often (60 logs / 4 = 15 tosses in 9 s)
  reach: 10, // m: a ring this close is aimed for you (rec 5: 6-10 m)
  ahead: 8, // m: with no ring in reach, where the handful lands
  cone: 1.2, // rad either side of the camera's heading that still counts as ahead
  spread: 0.35, // m: how far the logs of one handful scatter around the aim
};

let held = false; // the button is down and tossing
let next = 0;
const canToss = () => me.entered && !!me.body && !heldId() && myLogs() > 0;

// Where a toss lands: the nearest ring of the open site in reach and ahead, else a spot ahead of the camera.
const aim = new THREE.Vector3();
function target(): THREE.Vector3 {
  const p = me.body!.position;
  const s = rules.sites.sites.open;
  let best = Infinity;
  aim.set(p.x - Math.sin(cam.yaw) * TOSS.ahead, 0, p.z - Math.cos(cam.yaw) * TOSS.ahead);
  if (s < ROUTE.length)
    for (const ring of [TRACK, HELPER]) {
      if (rules.sites.room(s, ring) <= 0) continue;
      const c = ringAt(s, ring);
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      const turn = Math.atan2(-(c.x - p.x), -(c.z - p.z)) - cam.yaw;
      const off = Math.atan2(Math.sin(turn), Math.cos(turn));
      if (d < best && d <= TOSS.reach && Math.abs(off) < TOSS.cone) {
        best = d;
        aim.set(c.x, 0, c.z);
      }
    }
  aim.y = groundHeight(aim.x, aim.z);
  return aim;
}

function tossOnce() {
  const n = Math.min(TOSS.handful, myLogs());
  if (n <= 0) return false;
  const to = target();
  const from = throwFrom();
  me.yaw = Math.atan2(-(to.x - from.x), -(to.z - from.z));
  for (let k = 0; k < n; k++) {
    const tx = to.x + (Math.random() - 0.5) * 2 * TOSS.spread,
      tz = to.z + (Math.random() - 0.5) * 2 * TOSS.spread;
    const d = Math.hypot(tx - from.x, tz - from.z);
    const t = 0.55 + d * 0.035 + k * 0.03; // a lob: longer flights for longer tosses
    const v = {
      x: (tx - from.x) / t,
      y: (groundHeight(tx, tz) + 0.2 - from.y + 0.5 * GRAVITY * t * t) / t,
      z: (tz - from.z) / t,
    };
    launchLog(from, v, 1, 4 + Math.random() * 5, me.yaw + Math.PI / 2 + (Math.random() - 0.5) * 0.5);
  }
  return true;
}

// Empty hands (src/player/hands.ts): the click, pad X and the touch Use/Grab button all toss when you carry logs.
emptyHands.down = () => {
  if (!canToss()) return false;
  held = true;
  tossOnce();
  next = performance.now() + TOSS.everyMs;
  return true;
};
emptyHands.up = () => void (held = false);

onStart(() => {
  describeControl('haul-toss', {
    label: 'Toss logs at the site (hold to keep tossing)',
    keys: ['Mouse0'],
    pad: 'x',
    touch: 'Grab',
    group: 'hands',
    order: 2,
    context: 'carrying logs',
  });
});

onFrame(
  ({ now }: { now: number }) => {
    if (!held || now < next) return;
    if (!canToss()) {
      held = false;
      return;
    }
    tossOnce();
    next += TOSS.everyMs;
  },
  { phase: 'update', order: 41 },
);

(window as unknown as { __toss: unknown }).__toss = { TOSS, tossOnce };
