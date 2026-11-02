// The player's course (./player-course.ts) headless: walk, sprint, stop, jump, hop, swim, the fall-through net. Each number
// is checked against what the same course did in the real game (./player-browser.json, from ./player-browser.ts).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { timedCourse } from './timed.ts';
import { headless, virtualClock } from './world.ts';
import { runCourse, type PlayerCourseResult, type Sample } from './player-course.ts';

const TOLERANCE = 0.01; // m and m/s: the same WASM, the same controller and the same ground should give the same answer

await headless();
virtualClock(); // performance.now() is the run's own clock from here on; speed is timed with hrtime
const browser = JSON.parse(
  fs.readFileSync(new URL('./player-browser.json', import.meta.url), 'utf8'),
) as PlayerCourseResult;

const { result, frames, ms } = await timedCourse(runCourse);

let worst = 0;
let worstAt = '';
const failures: string[] = [];
function near(name: string, got: readonly number[], want: readonly number[]) {
  assert.equal(got.length, want.length, name);
  got.forEach((v, k) => {
    const off = Math.abs(v - want[k]!);
    if (off > worst) {
      worst = off;
      worstAt = `${name}[${k}]`;
    }
    if (off > TOLERANCE) failures.push(`${name}[${k}]: ${v} here, ${want[k]} in the browser`);
  });
}
function nearPath(name: string, got: Sample[], want: Sample[]) {
  assert.equal(got.length, want.length, name);
  got.forEach((s, k) => near(`${name}, step ${s[0]}`, s, want[k]!));
}

near('ground', result.ground, browser.ground);
for (const leg of ['walk', 'sprint', 'stop', 'jump', 'hop', 'swim', 'net'] as const)
  nearPath(leg, result[leg], browser[leg]);
assert.equal(failures.length, 0, `${failures.length} off:\n${failures.join('\n')}`);

// And what the course means, whatever the browser did.
const peak = (s: Sample[], k: number) => Math.max(...s.map((v) => v[k]!));
const walkPeak = peak(result.walk, 4);
const sprintPeak = peak(result.sprint, 4);
const stopSteps = result.stop.find((s) => s[4]! < 0.2)?.[0];
const jumpPeak = peak(result.jump, 2) - result.jump[0]![2]!;
const hopPeak = peak(result.hop, 2) - result.hop[0]![2]!;
assert.ok(Math.abs(walkPeak - 5.6) < 0.15, `walk ${walkPeak}`);
assert.ok(Math.abs(sprintPeak - 9.5) < 0.25, `sprint ${sprintPeak}`);
assert.ok(jumpPeak > hopPeak, `a held jump (${jumpPeak}) goes higher than a hop (${hopPeak})`);
// A swimmer bobbing clear of the water moves at walking speed for a moment (swimPeak 5.6): the settled speed is what's slow.
const swimSpeed = result.swim.at(-1)![4]!;
assert.ok(Math.abs(swimSpeed - 5.6 * 0.55) < 0.05, `swim ${swimSpeed}`);

const seconds = frames / 60;
console.log(
  `walk ${walkPeak} m/s, sprint ${sprintPeak} m/s, swim ${swimSpeed} m/s, stopped within ${stopSteps} steps, jump ${jumpPeak.toFixed(2)} m, hop ${hopPeak.toFixed(2)} m`,
);
console.log(`off the browser by at most ${worst.toFixed(3)} (allowed ${TOLERANCE}), at ${worstAt}`);
console.log(`${seconds.toFixed(1)} s of game in ${ms.toFixed(0)} ms: ${((seconds * 1000) / ms).toFixed(0)}x real time`);
