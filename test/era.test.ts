// Eras and opening day (src/sim/era.ts): the era is derived from the age, the sections laid and whether opening day's
// bell has run out; opening day starts only once the age's last section is laid, and its state round-trips.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eraOf,
  openingReady,
  sectionsThrough,
  createOpening,
  canOpen,
  startOpening,
  openingAt,
  openedAt,
  serializeOpening,
  loadOpening,
  hashOpening,
  OPENING_DAY,
  BELL_S,
} from '../src/sim/era.ts';
import { lengthOf } from '../src/sim/scripted-run.ts';
import { createSites, ageAt, layRest } from '../src/sim/sites.ts';
import { ROUTE } from '../src/sim/route.ts';

test('the era turns over only after the last section is laid and the bell has run out', () => {
  const last = sectionsThrough(0);
  assert.equal(last, ROUTE.filter((s) => s.age === 0).length);
  assert.equal(eraOf(0, 0, false), 1);
  assert.equal(eraOf(0, last - 1, false), 1);
  assert.equal(eraOf(1, last, false), 1, 'all laid, no opening day yet');
  assert.equal(eraOf(1, last, true), 2);
  assert.equal(eraOf(0, 1, true), 1, 'an opening flag without the route never counts');
  assert.equal(openingReady(last - 1), false);
  assert.equal(openingReady(last), true);
});

test('opening day starts once, after the route, and its bell lasts BELL_S seconds of ticks', () => {
  assert.equal(lengthOf(OPENING_DAY), BELL_S * 10);
  assert.ok(OPENING_DAY.every((p) => Number.isInteger(p.len) && p.len > 0));
  const o = createOpening();
  const st = createSites();
  assert.equal(canOpen(o, st.open), false);
  assert.equal(layRest(st), ROUTE.length);
  assert.equal(layRest(st), 0, 'nothing left to lay');
  assert.equal(ageAt(st), 1);
  assert.equal(canOpen(o, st.open), true);
  startOpening(o, 500);
  assert.equal(canOpen(o, st.open), false, 'the first start wins');
  assert.equal(openingAt(o, 550).name, 'bell');
  assert.equal(openedAt(o, 500 + BELL_S * 10 - 1), false);
  assert.equal(openedAt(o, 500 + BELL_S * 10), true);
  assert.equal(eraOf(ageAt(st), st.open, openedAt(o, 600)), 2);
});

test('opening state round-trips with the same hash and rejects junk', () => {
  const o = createOpening();
  const fresh = hashOpening(o);
  startOpening(o, 1234);
  const back = createOpening();
  loadOpening(back, JSON.parse(JSON.stringify(serializeOpening(o))));
  assert.equal(back.t0, 1234);
  assert.equal(hashOpening(back), hashOpening(o));
  assert.notEqual(hashOpening(o), fresh);
  for (const junk of [null, {}, { t0: 1.5 }, { t0: -2 }, { t0: '3' }]) assert.throws(() => loadOpening(back, junk));
});
