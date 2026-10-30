// The land Node tests build (test/helpers/land.mjs) is the land the game builds: the base inside the window, the
// water region match test/fixtures/world-inputs.json, which dev/scenarios/world-inputs.mjs pins
// from the browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { homeLand, fixture, fnv } from './helpers/land.mjs';
import { GRID_RES, SEABED, homeBox } from '../src/world/grid.js';
import { regionFromBase } from '../src/sim/water-region.js';

test('the home window base matches the browser', () => {
  const { n, base } = homeLand();
  assert.equal(n, GRID_RES);
  assert.equal(fixture.windowSeaCm, Math.round(SEABED * 100));
  assert.equal(fnv(base), fixture.windowHash);
});

test('the water region (land box clipped to HOME) matches the browser', () => {
  const { n, base } = homeLand();
  const full = regionFromBase(base, n, -150, 3); // rules/water.js WATER_SIM regionBelowCm, regionPad
  const h = homeBox();
  const i0 = Math.max(full.i0, h.i0),
    j0 = Math.max(full.j0, h.j0);
  const w = Math.min(full.i0 + full.w - 1, h.i1) - i0 + 1,
    hh = Math.min(full.j0 + full.h - 1, h.j1) - j0 + 1;
  assert.equal([i0, j0, w, hh].join(','), fixture.region);
});
