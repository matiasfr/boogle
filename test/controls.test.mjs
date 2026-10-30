import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAD, registerAction, actionForSlot, listActions, freeSlots, slotFor } from '../src/controls.js';

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
