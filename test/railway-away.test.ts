// The away credit's formula (src/sim/railway-away.ts): H × (1 − e^(−away/H)) of production, with H = 2 hours.
import test from 'node:test';
import assert from 'node:assert/strict';
import { railAwayCredit, expNeg, RAIL_AWAY } from '../src/sim/railway-away.ts';

const MIN = 600; // rule ticks (100 ms) per minute
const HOUR = 60 * MIN;

test('e^(−x) from + − × ÷ matches Math.exp across the range the credit uses', () => {
  for (let x = 0; x <= 70; x += 0.0625) {
    const want = x >= 64 ? 0 : Math.exp(-x);
    assert.ok(Math.abs(expNeg(x) - want) <= 1e-12 + want * 1e-12, `x=${x}`);
  }
  assert.equal(expNeg(0), 1);
  assert.equal(expNeg(-1), 1);
  assert.equal(expNeg(Number.NaN), 1);
});

test('the credit after 10 min, 1 h, 8 h and 3 days approaches H and never exceeds the time away', () => {
  assert.equal(RAIL_AWAY.hours, 2);
  const h = 2 * HOUR;
  const expect = (ticks: number) => Math.floor(h * (1 - Math.exp(-ticks / h)));
  for (const [away, name] of [
    [10 * MIN, '10 min'],
    [HOUR, '1 h'],
    [8 * HOUR, '8 h'],
    [72 * HOUR, '3 days'],
  ] as const) {
    const c = railAwayCredit(away);
    assert.ok(Math.abs(c - expect(away)) <= 1, name);
    assert.ok(c <= away && c < h, name);
  }
  // In minutes: 9.6, 47.2, 117.8 (1 h 57.8 min), and just under 120.
  assert.equal(Math.round(railAwayCredit(10 * MIN) / 60) / 10, 9.6);
  assert.equal(Math.round(railAwayCredit(HOUR) / 60) / 10, 47.2);
  assert.equal(Math.round(railAwayCredit(8 * HOUR) / 60) / 10, 117.8);
  assert.equal(railAwayCredit(72 * HOUR), h - 1, 'three days credits just under the two-hour limit');
  let last = 0;
  for (let away = 0; away <= 30 * HOUR; away += 997) {
    const c = railAwayCredit(away);
    assert.ok(c >= last, 'monotonic');
    last = c;
  }
});

test('the credit refuses non-integer, negative or empty absences and scales with H', () => {
  for (const bad of [0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(railAwayCredit(bad), 0);
  assert.equal(railAwayCredit(HOUR, 0), 0);
  assert.ok(railAwayCredit(HOUR, 4) > railAwayCredit(HOUR, 2));
  assert.equal(railAwayCredit(1), 0, 'a tenth of a second away credits nothing whole');
});
