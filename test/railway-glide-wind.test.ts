// The glide's wind (Place's windAt), lost with the wingtip wisps in the port to the railway. This holds its numbers and
// that the glider's view still drives and disposes it; nobody can hear a unit test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WIND, windGain, windHz, windLevel } from '../src/entities/railway/glide-wind.ts';

test('the wind is silent unless the canopy holds you, a quarter at rest and full from 10 m/s', () => {
  for (const speed of [0, 5, 10, 30]) assert.equal(windLevel(false, speed), 0);
  assert.equal(windLevel(true, 0), 0.25);
  assert.equal(windLevel(true, 5), 0.625);
  assert.equal(windLevel(true, 10), 1);
  assert.equal(windLevel(true, 30), 1);
});
test("Place's gain and band: 0.12 at full, 300 Hz plus 45 Hz per m/s", () => {
  assert.equal(windGain(0), 0);
  assert.equal(windGain(1), 0.12);
  assert.equal(windHz(0), 300);
  assert.equal(windHz(10), 750);
  assert.deepEqual([WIND.q, WIND.seconds, WIND.gainTau, WIND.hzTau], [0.7, 2, 0.12, 0.2]);
});
test("the glider's view drives the wind on the ambience bus and stops it on cleanup", () => {
  const view = readFileSync(new URL('../src/entities/railway/glide-view.ts', import.meta.url), 'utf8');
  assert.match(view, /getAudio\('ambience'\)/);
  assert.match(view, /windLevel\(/);
  assert.match(view, /stopWind\(\)/);
});
