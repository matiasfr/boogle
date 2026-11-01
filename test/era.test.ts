// Eras and opening day (src/sim/era.ts): the era is derived from the age, the sections laid and whether opening day's
// bell has run out; opening day starts only once the age's last section is laid; its gathering call ends early at most
// once, only while it runs; and its state round-trips.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eraOf,
  openingReady,
  sectionsThrough,
  createOpening,
  canOpen,
  startOpening,
  resetOpening,
  noteLaid,
  openingAt,
  openedAt,
  serializeOpening,
  loadOpening,
  hashOpening,
  OPENING_DAY,
  BELL_S,
  CALL_S,
  canGather,
  gather,
  bellTick,
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

test('opening day starts once, after the route: a CALL_S call, then BELL_S of bell', () => {
  assert.equal(lengthOf(OPENING_DAY), (CALL_S + BELL_S) * 10);
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
  assert.equal(openingAt(o, 550).name, 'call');
  const bell = 500 + CALL_S * 10;
  assert.equal(bellTick(o), bell);
  assert.equal(openingAt(o, bell).name, 'bell');
  assert.equal(openedAt(o, bell + BELL_S * 10 - 1), false);
  assert.equal(openedAt(o, bell + BELL_S * 10), true);
  assert.equal(eraOf(ageAt(st), st.open, openedAt(o, bell + BELL_S * 10)), 2);
  assert.equal(canGather(o, bell), false, 'too late to end a call that ran out');
});

test('everyone at the platform ends the call early, once; the bell still runs in full', () => {
  const o = createOpening();
  assert.equal(canGather(o, 10), false, 'no call before opening day');
  startOpening(o, 500);
  assert.equal(canGather(o, 499 + CALL_S * 10), true);
  gather(o, 620);
  assert.equal(canGather(o, 621), false, 'once only');
  assert.equal(bellTick(o), 620);
  assert.equal(openingAt(o, 619).name, 'call');
  assert.equal(openingAt(o, 620).name, 'bell');
  assert.equal(openedAt(o, 620 + BELL_S * 10 - 1), false);
  assert.equal(openedAt(o, 620 + BELL_S * 10), true);
  // Alone at the platform: the call ends the tick it starts, so it's straight to the bell (one tick of call).
  const solo = createOpening();
  startOpening(solo, 500);
  gather(solo, 500);
  assert.equal(bellTick(solo), 501);
  assert.equal(openedAt(solo, 501 + BELL_S * 10), true);
  const back = createOpening();
  loadOpening(back, JSON.parse(JSON.stringify(serializeOpening(o))));
  assert.equal(back.here, 620);
  assert.equal(hashOpening(back), hashOpening(o));
  resetOpening(o);
  assert.equal(o.here, -1);
  assert.throws(() => loadOpening(back, { t0: 5, h: -1 }));
  assert.throws(() => loadOpening(back, { t0: 5, h: 1.5 }));
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

test("open.lay's note is saved only once used, round-trips, and resets with opening day", () => {
  const o = createOpening();
  const plain = { ...serializeOpening(o) };
  assert.deepEqual(plain, { t0: -1 }, 'an untouched room saves as before');
  const fresh = hashOpening(o);
  noteLaid(o, 1, 900);
  const back = createOpening();
  loadOpening(back, JSON.parse(JSON.stringify(serializeOpening(o))));
  assert.deepEqual(back.laid, [1, 900]);
  assert.equal(hashOpening(back), hashOpening(o));
  assert.notEqual(hashOpening(o), fresh);
  resetOpening(o);
  assert.equal(o.laid, null);
  assert.equal(hashOpening(o), fresh);
  for (const la of [[1], [1, -1], [1, 2.5], 'x']) assert.throws(() => loadOpening(back, { t0: -1, la }));
});
