import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, LUNAR_DAYS, DAYLIGHT, skyAt, skyState } from '../src/sim/sky-clock.ts';

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('a day lasts DAY_MS (20 minutes) and repeats', () => {
  assert.equal(DAY_MS, 20 * 60 * 1000);
  const a = skyAt(123456);
  const b = skyAt(123456 + DAY_MS);
  close(a.frac, b.frac);
  close(a.sunAngle, b.sunAngle);
});

test('the sun is up for DAYLIGHT of the day', () => {
  close(skyState(0, 0).sunAngle, 0);
  close(skyState(DAYLIGHT / 2, 0).sunAngle, Math.PI / 2);
  close(skyState(DAYLIGHT, 0).sunAngle, Math.PI);
  assert.ok(skyState(DAYLIGHT + 0.01, 0).sunAngle > Math.PI);
});

test('moon phases cycle every LUNAR_DAYS days: new rides with the sun, full is opposite', () => {
  const t = 777777;
  close(skyAt(t).phase, skyAt(t + LUNAR_DAYS * DAY_MS).phase, 1e-6);
  assert.notEqual(skyAt(t).phase.toFixed(3), skyAt(t + DAY_MS).phase.toFixed(3));
  const n = skyState(0.3, 0);
  close(n.moonAngle, n.sunAngle);
  close(n.illum, 0);
  const f = skyState(DAYLIGHT, 0.5); // sunset at full moon: the moon is rising
  close(f.illum, 1);
  assert.ok(f.moonAngle < 0.6, `full moon should be low in the east at sunset, got ${f.moonAngle}`);
});

test('moon illum tracks (1 - cos 2 PI phase) / 2 within 0.011', () => {
  for (let i = 0; i <= 100; i++) {
    const p = i / 100;
    close(skyState(0, p).illum, (1 - Math.cos(2 * Math.PI * p)) / 2, 0.011);
  }
});

test('same world time gives the same sky (pure)', () => {
  assert.deepEqual(skyAt(5_000_000), skyAt(5_000_000));
});
