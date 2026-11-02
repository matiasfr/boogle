// The long crossing (docs/plans/find-the-fun.md, step 7; loaded by src/features/proto-crossing.ts behind
// ?proto=crossing). A fast train over a long viaduct to a far greybox island, to find what "vast" means in seconds and
// metres. Ride-only: no verbs on the ride, silent, no shake, and you keep your movement and camera. Serves DESIGN.md 1
// (Toys before chores). Local: nothing here is sent to anyone or read by the sim.
// docs/game-design/crossing.md describes it; research: docs/research/sea-crossings.md, docs/research/train-riding.md.
import './crossing.css';
import * as THREE from 'three/webgpu';
import { FIXED, HALF, PLAYER_R } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { emit } from '../../render/particles.ts';
import { camera } from '../../render/scene.ts';
import { onPostStep, onPreStep } from '../../physics/engine.ts';
import { teleport } from '../../physics/physics.ts';
import { carry } from '../../physics/platforms.ts';
import { me, cam, camConstraints } from '../../player/player.ts';
import { registerInteractable, NO_TARGETS } from '../../player/hands.ts';
import { protoCount } from '../count.ts';
import { protoMark } from '../mark.ts';
import { LENGTH, RUN_SECONDS, STOP_B, WALK, lineAt, nearestS, railY, type LinePoint } from './line.ts';
import { cars, clock, onTrain, seekS, start, train } from './train.ts';
import { PADS, buildWorld } from './world.ts';
import { extendSky } from './sky.ts';
import { dressSea } from './sea.ts';
import { CROSSING, FEEL } from './tuning.ts';

buildWorld();
dressSea();
extendSky();

// ---------------------------------------------------------------- past the edge of the map
// The player's soft wall (src/entities/player/index.ts) turns you back 18 m inside the 510 m square, whether you swim or ride: at 237 m it sets your
// speed away from the origin to -2 m/s. This hook runs after it (lazy modules register last) and, past the wall, puts
// back the speed you would have had, by the same steering sum. The real fix: a wall that knows the world is bigger.
const WALL = HALF - 18;
let lastVx = 0,
  lastVz = 0;
onPostStep(() => {
  if (!me.body) return;
  lastVx = me.body.velocity.x;
  lastVz = me.body.velocity.z;
});
onPreStep(() => {
  const b = me.body;
  if (!b || (Math.abs(b.position.x) <= WALL && Math.abs(b.position.z) <= WALL)) return;
  const top = (me.sprint ? 9.5 : 5.6) * (me.swimming ? 0.55 : 1);
  const rvx = lastVx - carry.x,
    rvz = lastVz - carry.z;
  const braking = me.wish.x * rvx + me.wish.z * rvz < 0;
  const accel = me.coyote > 0 ? (braking ? 115 : 70) : me.swimming ? 18 : 14;
  let dx = me.wish.x * top - rvx,
    dz = me.wish.z * top - rvz;
  const dl = Math.hypot(dx, dz),
    most = accel * FIXED;
  if (dl > most) {
    dx *= most / dl;
    dz *= most / dl;
  }
  b.velocity.x = lastVx + dx;
  b.velocity.z = lastVz + dz;
});

// ---------------------------------------------------------------- arriving, falling in, getting back
const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
const backOnLine = () => {
  const b = me.body;
  if (!b) return;
  const s = Math.max(30, Math.min(LENGTH - 30, nearestS(b.position.x, b.position.z)));
  lineAt(s, P);
  const l = (WALK.in + WALK.out) / 2;
  teleport(b, P.x - P.uz * l, railY(s) + WALK.up + PLAYER_R + 0.3, P.z + P.ux * l);
  b.velocity.set(0, 0, 0);
  lastVx = lastVz = 0;
  carry.x = carry.z = 0;
  cam.yaw = me.yaw = Math.atan2(-P.ux, -P.uz);
};
const atPrompt = new THREE.Vector3();
const inOpenSea = () => {
  if (!me.swimming || !me.body) return false;
  const p = me.body.position;
  return Math.hypot(p.x, p.z) > 130; // the shore's within a swim of anywhere closer
};
// Falling in is the slapstick; swimming a kilometre back is not. Interact takes you up the nearest pillar.
registerInteractable(() => {
  if (!inOpenSea()) return NO_TARGETS;
  const p = me.body!.interpolatedPosition;
  atPrompt.set(p.x, p.y + 1.2, p.z);
  return [{ id: 'crossing-back', verb: 'Back on the line', at: atPrompt, run: backOnLine }];
});

// A spawn is placed by the ground height under it, which is inside a station's concrete: lift it onto the top.
let onLine = false,
  wasSwimming = false,
  wasRiding = false,
  rodeThisLeg = false,
  arrived = false;
onFrame(
  () => {
    const b = me.body;
    if (!b) return;
    const p = b.position;
    for (const pad of PADS)
      if (p.x > pad.x0 && p.x < pad.x1 && p.z > pad.z0 && p.z < pad.z1 && p.y < pad.top && p.y > pad.top - 5) {
        teleport(b, p.x, pad.top + PLAYER_R + 0.1, p.z);
        b.velocity.set(0, 0, 0);
      }
    if (!onLine) {
      onLine = true;
      start();
      // Going downhill at train speed, the player body's CCD (on for every dynamic body, backend-rapier.ts) stops whole
      // steps at the deck under it: its sweep seems not to allow for the deck falling too, once the deck drops further
      // in a step than you're sunk into it. You lose 0.8 m along the train per step and slide off the back. Nothing here
      // is thin or fast enough to need CCD (falls are capped at 20 m/s), so it goes off. Past the facade, a throwaway's
      // shortcut: the real thing needs `setCcd` on src/physics/engine.ts.
      (b as unknown as { rb?: { enableCcd(on: boolean): void } }).rb?.enableCcd(false);
    }
    // What the owner does, for the playtest entry.
    const riding = onTrain(carry.on);
    if (riding && !wasRiding && !rodeThisLeg) {
      rodeThisLeg = true;
      protoCount('rides');
    }
    wasRiding = riding;
    if (train.stop !== -1 && !riding) rodeThisLeg = false;
    const swimming = inOpenSea();
    if (swimming && !wasSwimming) {
      protoCount('falls');
      protoMark('fall');
    }
    wasSwimming = swimming;
    // A crossing finished on the train, once per arrival.
    if (train.stop === 1 && riding && !arrived) {
      arrived = true;
      protoCount('crossings');
    } else if (train.stop === 0) arrived = false;
  },
  { phase: 'world', order: 41 }, // after the prototype bar places you (order 40)
);

// Off the map the sea is deep, and a fall from the viaduct plunges: the camera's swimming floor (3 m under) would see
// the sea from below, which draws nothing. Keep it above the water.
camConstraints.push((_, pos) => {
  if (Math.hypot(pos.x, pos.z) > 130) pos.y = Math.max(pos.y, 0.4);
  return false;
});
// Skimming over the water at train speed throws up spray: the slapstick end of jumping off.
const spray = new THREE.Color('#ffffff');
onFrame(
  () => {
    const v = Math.hypot(carry.x, carry.z);
    if (!me.swimming || v < 3 || !me.body) return;
    const p = me.body.position;
    for (let n = 0; n < 3; n++)
      emit({
        x: p.x + (Math.random() - 0.5) * 0.6,
        y: 0.1,
        z: p.z + (Math.random() - 0.5) * 0.6,
        vx: carry.x * 0.3 + (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * v * 0.15,
        vz: carry.z * 0.3 + (Math.random() - 0.5) * 3,
        life: 0.7,
        size: 0.22,
        color: spray,
        alpha: 0.85,
        gravity: 9,
        fade: 0.5,
      });
  },
  { phase: 'update', order: 9 },
);

// ---------------------------------------------------------------- selling speed: the FOV eases wider, the HUD goes quiet
const BASE_FOV = camera.fov;
let ridingFor = 0,
  quiet = false;
onFrame(
  ({ dt }) => {
    const v = Math.hypot(carry.x, carry.z);
    const want = BASE_FOV + (FEEL.fovWide * Math.min(v, 50)) / 50;
    if (Math.abs(camera.fov - want) > 0.01) {
      camera.fov += (want - camera.fov) * (1 - Math.exp(-dt * FEEL.fovIn));
      camera.updateProjectionMatrix();
    }
    ridingFor = onTrain(carry.on) && Math.abs(train.v) > 1 ? ridingFor + dt : 0;
    const q = ridingFor > FEEL.hudAfter;
    if (q !== quiet) {
      quiet = q;
      document.body.classList.toggle('crossing-quiet', q);
    }
  },
  { phase: 'update', order: 7 },
);

// ---------------------------------------------------------------- the look evals' handle (dev/look/evals/crossing.ts)
window.__crossing = {
  CROSSING,
  RUN_SECONDS,
  LENGTH,
  STOP_B,
  // a teleport in an eval: what the wall's undo starts from
  setSpeed: (x: number, z: number) => void ((lastVx = x), (lastVz = z)),
  train,
  clock,
  cars,
  seekS,
  lineAt,
  railY,
  backOnLine,
};
