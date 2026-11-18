// The welcome back's "what changed" on the railway (src/player/welcome-railway.ts): the count it remembers at one
// visit and the stretches it names at the next, on two accepted-op seed worlds.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { ReadWorld } from '../src/sim/railway-rows.ts';
import { stretchesLaid, stretchesSince } from '../src/player/welcome-railway.ts';
import { buildSeedWorld } from './helpers/rail.ts';

const laidAt = (stage: Parameters<typeof buildSeedWorld>[0]) =>
  stretchesLaid(buildSeedWorld(stage).w as unknown as ReadWorld);

test('left just awake, back at q1-done: progress counts both lines', () => {
  const then = laidAt('awake'),
    now = laidAt('q1-done');
  assert.equal(then, 0, 'an awake room has not laid any jobs');
  assert.equal(stretchesSince(then, now), 4, 'T1 to T3 and Q1 each count once');
});

test('unchanged, reset, or malformed memory does not report new stretches', () => {
  const now = 4;
  assert.equal(stretchesSince(now, now), 0);
  assert.equal(stretchesSince(now + 2, now), 0); // a room started over: never a negative count
  for (const bad of [undefined, null, '3', Number.NaN, { laid: 0 }]) assert.equal(stretchesSince(bad, now), 0);
});
