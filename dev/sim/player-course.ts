// A set course for the local player, run by the game's own code wherever it's loaded: walk, sprint, stop, jump, hop, swim
// and the fall-through net, each from a fresh start. It drives the player as input.ts does, by writing to `input`, `cam`
// and `me`. No Node or browser API, so `npm run sim -- player` runs this exact file headless, and dev/sim/player-browser.ts
// runs it in the real game for the numbers to compare.
//
// Input lands at the start of a frame (the intent hook), and a browser frame can hold 0 to 2 physics steps, so a leg
// counts its steps from the frame its input changed. That's why each leg starts from rest, and why `stop` is measured
// from where the brakes came on: how far the run before it got depends on the frames it landed in.
import { SEA, SPAWN } from '../../src/constants.ts';
import { cam, enterIsland, me } from '../../src/entities/player/state.ts';
import { groundHeight } from '../../src/island/heights.ts';
import { onPostStep, teleport } from '../../src/physics/engine.ts';
import { r3 } from '../../src/math.ts';
import { input } from '../../src/player/input-state.ts';

const SAMPLE_EVERY = 5; // steps
const YAW = 2.2; // heading across open ground, clear of the ball, the trees and the stall
const SETTLE = 60; // steps at rest before a leg starts

const flatSpeed = () => Math.hypot(me.body!.velocity.x, me.body!.velocity.z);

export type Sample = number[]; // step, x, y, z, horizontal speed
export type PlayerCourseResult = {
  ground: number[]; // groundHeight at the start, and at the swim
  walk: Sample[];
  sprint: Sample[];
  stop: Sample[]; // x, y, z from where the brakes came on
  jump: Sample[]; // the button held: the full arc
  hop: Sample[]; // let go at once: the short hop
  swim: Sample[];
  net: Sample[]; // from under the ground
};

// Deep water, the nearest ring around the spawn that has it: the same spot wherever this runs.
function seaSpot() {
  for (let r = 10; r < 400; r += 4)
    for (let a = 0; a < 6.28; a += 0.3) {
      const x = SPAWN.x + Math.cos(a) * r,
        z = SPAWN.z + Math.sin(a) * r;
      if (groundHeight(x, z) < SEA - 3) return { x, z };
    }
  throw new Error('no sea');
}

let steps = 0;
let sample: (() => void) | null = null;
onPostStep(() => {
  steps++;
  sample?.();
});

/** `advance(done)` runs frames, by whatever means, until done() is true. */
export async function runCourse(advance: (done: () => boolean) => Promise<void> | void): Promise<PlayerCourseResult> {
  enterIsland('course'); // the browser's game has entered already; this then does nothing
  const b = me.body!;
  const run = async (n: number) => {
    const end = steps + n;
    await advance(() => steps >= end);
  };
  async function record(n: number, from = { x: 0, y: 0, z: 0 }) {
    const start = steps;
    const samples: Sample[] = [];
    const take = () => {
      const k = steps - start;
      if (k % SAMPLE_EVERY || k > n) return;
      samples.push([
        k,
        r3(b.position.x - from.x),
        r3(b.position.y - from.y),
        r3(b.position.z - from.z),
        r3(flatSpeed()),
      ]);
    };
    take();
    sample = take;
    await run(n);
    sample = null;
    return samples;
  }
  async function place(x: number, z: number, y = groundHeight(x, z) + 0.6, settle = SETTLE) {
    input.keys.clear();
    me.jumpQueued = 0;
    me.jumpHeld = false;
    cam.yaw = YAW;
    teleport(b, x, y, z);
    b.velocity.set(0, 0, 0);
    await run(settle);
  }
  const atStart = () => place(SPAWN.x, SPAWN.z);
  const press = (...keys: string[]) => keys.forEach((key) => input.keys.add(key));

  await atStart();
  press('KeyW');
  const walk = await record(120);

  await atStart();
  press('KeyW', 'ShiftLeft');
  const sprint = await record(120);

  await atStart();
  press('KeyW', 'ShiftLeft');
  await run(90);
  input.keys.clear();
  const stop = await record(40, { x: b.position.x, y: b.position.y, z: b.position.z });

  await atStart();
  me.jumpHeld = true;
  me.jumpQueued = 0.15;
  const jump = await record(90);

  await atStart();
  me.jumpQueued = 0.15;
  const hop = await record(60);

  const sea = seaSpot();
  await place(sea.x, sea.z, SEA + 0.2, 72);
  press('KeyW');
  const swim = await record(60);

  await place(SPAWN.x + 3, SPAWN.z + 3, -24, 0);
  b.velocity.set(0, -10, 0);
  const net = await record(30);

  input.keys.clear();
  return {
    ground: [r3(groundHeight(SPAWN.x, SPAWN.z)), r3(groundHeight(sea.x, sea.z))],
    walk,
    sprint,
    stop,
    jump,
    hop,
    swim,
    net,
  };
}
