// The land Node tests build (test/helpers/land.mjs) is the land the game builds: the base inside the window
// matches test/fixtures/world-inputs.json, which dev/scenarios/world-inputs.mjs pins from the browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { homeLand, fixture, fnv } from './helpers/land.mjs';
import { GRID_RES, SEABED } from '../src/world/grid.js';

test('the home window base matches the browser', () => {
  const { n, base } = homeLand();
  assert.equal(n, GRID_RES);
  assert.equal(fixture.windowSeaCm, Math.round(SEABED * 100));
  assert.equal(fnv(base), fixture.windowHash);
});
