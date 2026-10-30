import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAD,
  registerAction,
  actionForSlot,
  listActions,
  freeSlots,
  slotFor,
  wrapAction,
  actionById,
} from '../src/controls.js';

const quiet = (fn) => {
  const warn = console.warn;
  const warnings = [];
  console.warn = (m) => warnings.push(m);
  try {
    fn();
  } finally {
    console.warn = warn;
  }
  return warnings;
};

test('controls: one action per pad slot, clashes stay unbound', () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(PAD.length, 16);
    assert.ok(registerAction('jump', { pad: 'a' }));
    assert.ok(registerAction('jump', { pad: 'a', label: 'Jump!' })); // re-registering the same id is fine
    assert.equal(registerAction('honk', { pad: 'a' }), false);
    assert.equal(registerAction('ping', { pad: 'nope' }), false);
    assert.equal(actionForSlot('a').id, 'jump');
    assert.equal(actionForSlot('a').label, 'Jump!');
    assert.ok(registerAction('honk', { pad: 'y' }));
    assert.deepEqual(
      listActions().map((a) => a.id),
      ['jump', 'honk'],
    );
    assert.equal(freeSlots().length, 14);
    assert.ok(!freeSlots().includes('y'));
    // Prompt glyphs read an action's slot, so they follow a rebinding; a clash or an unknown id has none.
    assert.equal(slotFor('honk'), 'y');
    assert.equal(slotFor('ping'), null);
    assert.ok(registerAction('jump', { pad: 'b' }));
    assert.equal(slotFor('jump'), 'b');
    assert.equal(actionForSlot('a'), null);
  } finally {
    console.warn = warn;
  }
});

test('controls: wrapAction keeps the original handler, the last wrap runs first', () => {
  const log = [];
  registerAction('dig-test', { pad: 'b', down: () => log.push('down'), up: () => log.push('up') });
  assert.ok(wrapAction('dig-test', { down: (next) => (log.push('w1'), next()) }));
  assert.ok(
    wrapAction('dig-test', { down: (next) => (log.push('w2'), next()), up: (next) => (log.push('w2up'), next()) }),
  );
  actionForSlot('b').down(); // the pad reaches the wrapped handler through the slot
  actionById('dig-test').up();
  assert.deepEqual(log, ['w2', 'w1', 'down', 'w2up', 'up']);

  // a wrapper may swallow the press; a missing handler is wrapped as a no-op
  log.length = 0;
  registerAction('swim-test', { pad: 'lt', up: () => log.push('up') });
  wrapAction('swim-test', { down: () => log.push('dive') });
  wrapAction('swim-test', { down: (next) => next() });
  actionById('swim-test').down();
  assert.deepEqual(log, ['dive']);
});

test('controls: a missing id warns and wraps nothing', () => {
  let r;
  const warnings = quiet(() => {
    r = wrapAction('no-such', { down: () => {} });
    assert.equal(actionById('no-such-either'), null);
  });
  assert.equal(r, false);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /\[controls\] wrapAction: no action "no-such"/);
  assert.match(warnings[1], /no action "no-such-either"/);
  // an action that lost its slot clash is not registered either
  quiet(() => registerAction('clash-test', { pad: 'b' }));
  assert.equal(quiet(() => assert.equal(actionById('clash-test'), null)).length, 1);
});
