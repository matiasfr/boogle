// The welcome back's "what changed" on the railway (src/player/welcome-railway.ts): the count it remembers at one
// visit and the stretches it names at the next, on two accepted-op seed worlds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Leg, Plot, Route } from '../src/sim/railway-components.ts';
import type { ReadWorld } from '../src/sim/railway-rows.ts';
import { railwayDiff, railwaySnapshot, stretchesLaid, stretchesSince } from '../src/player/welcome-railway.ts';
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

const snapshot = (w: ReturnType<typeof buildSeedWorld>['w']) =>
  railwaySnapshot(w as unknown as ReadWorld);

test('route progress compares only against a snapshot that observed the route', () => {
  const { w } = buildSeedWorld('q1-done');
  const early = snapshot(w);
  w.mut(Leg, w.lookup(Leg, 0)!)!.laid = 4;
  const later = snapshot(w);
  const change = railwayDiff(later, early);
  assert.ok(change.sections > 0);
  assert.ok(change.places.includes('High Gorge'));
  assert.deepEqual(railwayDiff(later, early.lines), { sections: 0, places: [], built: [] });
  assert.equal(railwayDiff(later, early.lines - 1).sections, 1);
  assert.deepEqual(railwayDiff(later, null), { sections: 0, places: [], built: [] });
});
test('a bought plot is remembered by slot and shows its chosen building once', () => {
  const { w } = buildSeedWorld('awake');
  const early = snapshot(w);
  Object.assign(w.mut(Plot, w.lookup(Plot, 0)!)!, { at: 1, kind: 1 });
  const now = snapshot(w);
  assert.deepEqual(railwayDiff(now, early).built, ['Seed Shed']);
  assert.deepEqual(railwayDiff(now, now).built, []);
});

test('arrival names the Original Island halt as the catalog does', () => {
  const { w } = buildSeedWorld('awake');
  w.mut(Route, w.single(Route))!.arrived = 1;
  assert.equal(snapshot(w).places.at(-1), 'Original Island');
});
