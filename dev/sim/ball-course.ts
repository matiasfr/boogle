// A set course for the ball, run by the game's own code wherever it's loaded: thrown, landing and settling, respawned
// off the island, floating in the sea. No Node or browser API, so `npm run sim -- ball` runs this exact file headless,
// and dev/sim/ball-browser.ts runs it in the real game for the numbers to compare.
import { BALL_SPAWN, HALF, SEA } from '../../src/constants.ts';
import { ball, grabBall, throwBall } from '../../src/entities/ball/state.ts';
import { groundHeight } from '../../src/island/heights.ts';
import { onPostStep, teleport } from '../../src/physics/engine.ts';
import { r3 } from '../../src/math.ts';

const SAMPLE_EVERY = 10; // steps: a sixth of a second
const SEA_AT = { x: -176, z: 0 }; // over deep water
const THROW = { from: { x: 12, z: 20, up: 2 }, vel: { x: -5, y: 7, z: -6 } };

const speed = () => Math.hypot(ball.body.velocity.x, ball.body.velocity.y, ball.body.velocity.z);
const pos = () => [r3(ball.body.position.x), r3(ball.body.position.y), r3(ball.body.position.z)];

export type Sample = number[]; // step, x, y, z, speed
export type CourseResult = {
  ground: number[]; // groundHeight at the spawn, where the throw came to rest, in the sea
  flight: Sample[]; // the throw, from release
  rest: number[]; // where it settled
  restSpeed: number;
  respawn: Sample[]; // from the first step back at the spawn
  respawnRest: number[];
  seaY: number; // on the water, a while after being dropped in
  seaLevel: number;
};

let steps = 0;
let sample: (() => void) | null = null;
onPostStep(() => {
  steps++;
  sample?.();
});

/** `advance(done)` runs frames, by whatever means, until done() is true. */
export async function runCourse(advance: (done: () => boolean) => Promise<void> | void): Promise<CourseResult> {
  const run = async (n: number) => {
    const end = steps + n;
    await advance(() => steps >= end);
  };
  async function record(n: number) {
    const start = steps;
    const samples: Sample[] = [];
    sample = () => {
      const k = steps - start;
      if (k % SAMPLE_EVERY === 0) samples.push([k, ...pos(), r3(speed())]);
    };
    await run(n);
    sample = null;
    return samples;
  }

  const { from, vel } = THROW;
  grabBall();
  throwBall({ x: from.x, y: groundHeight(from.x, from.z) + from.up, z: from.z }, vel);
  const flight = await record(1800);
  const rest = pos();
  const restSpeed = r3(speed());

  // Past the edge: the game's own check sends it back to the spawn, within a frame. The record starts when it's there.
  teleport(ball.body, HALF - 1, 10, 0);
  await advance(() => Math.hypot(ball.body.position.x - BALL_SPAWN.x, ball.body.position.z - BALL_SPAWN.z) < 0.01);
  const respawn = await record(240);
  const respawnRest = pos();

  teleport(ball.body, SEA_AT.x, SEA + 3, SEA_AT.z);
  ball.body.velocity.set(0, 0, 0);
  await run(360);

  return {
    ground: [
      r3(groundHeight(BALL_SPAWN.x, BALL_SPAWN.z)),
      r3(groundHeight(rest[0]!, rest[2]!)),
      r3(groundHeight(SEA_AT.x, SEA_AT.z)),
    ],
    flight,
    rest,
    restSpeed,
    respawn,
    respawnRest,
    seaY: r3(ball.body.position.y),
    seaLevel: SEA,
  };
}
