// The ball's course (./ball-course.ts) headless: throw, land, settle, respawn off the island, float. Each number is
// checked against what the same course did in the real game (./ball-browser.json, from ./ball-browser.ts).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { timedCourse } from './timed.ts';
import { headless, virtualClock } from './world.ts';
import { runCourse, type CourseResult, type Sample } from './ball-course.ts';

const TOLERANCE = 0.01; // m and m/s on land: the same WASM on the same ground should give the same answer
const SEA_TOLERANCE = 0.15; // m: the waves depend on how long the world has been running, which the two don't share

await headless();
virtualClock(); // performance.now() is the run's own clock from here on; speed is timed with hrtime
const browser = JSON.parse(fs.readFileSync(new URL('./ball-browser.json', import.meta.url), 'utf8')) as CourseResult;

const { result, frames, ms } = await timedCourse(runCourse);

let worst = 0;
function near(name: string, got: readonly number[], want: readonly number[]) {
  assert.equal(got.length, want.length, name);
  got.forEach((v, k) => {
    const off = Math.abs(v - want[k]!);
    worst = Math.max(worst, off);
    assert.ok(off <= TOLERANCE, `${name}[${k}]: ${v} here, ${want[k]} in the browser`);
  });
}
function nearPath(name: string, got: Sample[], want: Sample[]) {
  assert.equal(got.length, want.length, name);
  got.forEach((s, k) => near(`${name}, step ${s[0]}`, s, want[k]!));
}

near('ground', result.ground, browser.ground);
nearPath('flight', result.flight, browser.flight);
near('rest', result.rest, browser.rest);
nearPath('respawn', result.respawn, browser.respawn);
near('respawn rest', result.respawnRest, browser.respawnRest);
const seaOff = Math.abs(result.seaY - browser.seaY);
assert.ok(seaOff <= SEA_TOLERANCE, `on the sea: ${result.seaY} here, ${browser.seaY} in the browser`);

// And what the course means, whatever the browser did.
assert.ok(result.restSpeed < 0.05, `the throw settles (${result.restSpeed} m/s)`);
assert.ok(Math.abs(result.seaY - result.seaLevel) < 0.6, `the ball floats (y ${result.seaY}, sea ${result.seaLevel})`);

const seconds = frames / 60;
console.log(`rest ${result.rest}, respawn rest ${result.respawnRest}, on the sea y ${result.seaY}`);
console.log(
  `off the browser by at most ${worst.toFixed(3)} m on land (allowed ${TOLERANCE}), ${seaOff.toFixed(3)} m at sea`,
);
console.log(`${seconds.toFixed(1)} s of game in ${ms.toFixed(0)} ms: ${((seconds * 1000) / ms).toFixed(0)}x real time`);
