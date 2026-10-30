import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
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
  const [padA, padB] = freeSlots(); // other tests in this file hold slots too
  registerAction('dig-test', { pad: padA, down: () => log.push('down'), up: () => log.push('up') });
  assert.ok(wrapAction('dig-test', { down: (next) => (log.push('w1'), next()) }));
  assert.ok(
    wrapAction('dig-test', { down: (next) => (log.push('w2'), next()), up: (next) => (log.push('w2up'), next()) }),
  );
  actionForSlot(padA).down(); // the pad reaches the wrapped handler through the slot
  actionById('dig-test').up();
  assert.deepEqual(log, ['w2', 'w1', 'down', 'w2up', 'up']);

  // a wrapper may swallow the press; a missing handler is wrapped as a no-op
  log.length = 0;
  registerAction('swim-test', { pad: padB, up: () => log.push('up') });
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

// Static check: every registerAction('id', { pad: 'slot' ... }) in src/ claims a real slot no other call claims.
// Slots picked at runtime (update-reload takes freeSlots()[0]) are skipped by design.
test('controls: no two actions in src/ claim the same pad slot', () => {
  const src = new URL('../src/', import.meta.url);
  const owners = new Map(); // slot -> 'file:id'
  let n = 0;
  for (const f of readdirSync(src, { recursive: true })) {
    if (!f.endsWith('.js')) continue;
    const text = readFileSync(new URL(f, src), 'utf8');
    // pad: may sit anywhere in the options object (up to its first closing brace)
    for (const [, id, pad] of text.matchAll(/registerAction\(\s*'([\w-]+)',\s*\{[^}]*?\bpad:\s*'(\w+)'/g)) {
      n++;
      const who = `${f}:${id}`;
      assert.ok(PAD.includes(pad), `${who} uses unknown pad slot "${pad}"`);
      assert.ok(!owners.has(pad), `pad slot ${pad} is claimed by both ${owners.get(pad)} and ${who}`);
      owners.set(pad, who);
    }
  }
  assert.ok(n >= 10, `found only ${n} registerAction calls; did the pattern stop matching?`);
});
