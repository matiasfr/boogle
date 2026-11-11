import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { sep } from 'node:path';
import {
  PAD,
  registerAction,
  actionForSlot,
  listActions,
  freeSlots,
  slotFor,
  wrapAction,
  actionById,
  describeControl,
  listControls,
  controlProblems,
  controlById,
  keyEvent,
  onKey,
  isTyping,
  GROUPS,
} from '../src/player/controls.ts';
import type { ControlRow } from '../src/player/controls.ts';

const quiet = (fn: () => unknown) => {
  const warn = console.warn;
  const warnings: string[] = [];
  console.warn = (m: string) => warnings.push(m);
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
    assert.equal(actionForSlot('a')!.id, 'jump');
    assert.equal(actionForSlot('a')!.label, 'Jump!');
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
  const log: string[] = [];
  const [padA, padB] = freeSlots(); // other tests in this file hold slots too
  registerAction('hold-test', { pad: padA!, down: () => log.push('down'), up: () => log.push('up') });
  wrapAction('hold-test', { down: (next) => (log.push('w1'), next()) });
  wrapAction('hold-test', { down: (next) => (log.push('w2'), next()), up: (next) => (log.push('w2up'), next()) });
  actionForSlot(padA!)!.down!(); // the pad reaches the wrapped handler through the slot
  actionById('hold-test')!.up!();
  assert.deepEqual(log, ['w2', 'w1', 'down', 'w2up', 'up']);

  // a wrapper may swallow the press; a missing handler is wrapped as a no-op
  log.length = 0;
  registerAction('swim-test', { pad: padB!, up: () => log.push('up') });
  wrapAction('swim-test', { down: () => log.push('dive') });
  wrapAction('swim-test', { down: (next) => next() });
  actionById('swim-test')!.down!();
  assert.deepEqual(log, ['dive']);
});

test('controls: a wrap waits for its action, and a missing id warns', async () => {
  const log: string[] = [];
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (...a) => void warnings.push(a.join(' '));
  try {
    wrapAction('late-test', { down: (next) => (log.push('wrap'), next()) });
    registerAction('late-test', { pad: freeSlots()[0]!, down: () => log.push('down') });
    wrapAction('no-such', { down: () => {} });
    await new Promise((go) => setTimeout(go));
  } finally {
    console.warn = warn;
  }
  actionById('late-test')!.down!();
  assert.deepEqual(log, ['wrap', 'down']);
  assert.deepEqual(
    warnings.filter((w) => w.includes('wrapAction')),
    ['[controls] wrapAction: no action "no-such"'],
  );
  const warnings2 = quiet(() => assert.equal(actionById('no-such-either'), null));
  assert.match(warnings2[0]!, /no action "no-such-either"/);
  // an action that lost its slot clash is not registered either
  quiet(() => registerAction('clash-test', { pad: 'b' }));
  assert.equal(quiet(() => assert.equal(actionById('clash-test'), null)).length, 1);
});

// src/ files relative to src, with / separators on every OS so prefixes like 'proto/' match.
const srcFiles = (src: URL) =>
  readdirSync(src, { recursive: true, encoding: 'utf8' }).map((f) => f.split(sep).join('/'));

// Production and prototypes bind on separate pages, matching registry's pads/protoPads split.
// Every registerAction('id', { pad: 'slot' ... }) claims a real slot no other call in its group claims.
// Slots picked at runtime (update-reload takes freeSlots()[0]) are skipped by design.
test('controls: no two actions in src/ claim the same pad slot', () => {
  const src = new URL('../src/', import.meta.url);
  const production = new Map(),
    prototypes = new Map(); // slot -> 'file:id', per page group
  let productionClaims = 0;
  let n = 0;
  for (const f of srcFiles(src)) {
    if (!/\.[jt]s$/.test(f)) continue;
    const text = readFileSync(new URL(f, src), 'utf8');
    // pad: may sit anywhere in the options object, also after a nested { } such as a touch button spec
    for (const [, id, pad] of text.matchAll(
      /registerAction\(\s*'([\w-]+)',\s*\{(?:[^{}]|\{[^{}]*\})*?\bpad:\s*'(\w+)'/g,
    )) {
      n++;
      const who = `${f}:${id}`;
      const owners = f.startsWith('proto/') ? prototypes : production;
      if (owners === production) productionClaims++;
      assert.ok(PAD.includes(pad!), `${who} uses unknown pad slot "${pad}"`);
      assert.ok(!owners.has(pad), `pad slot ${pad} is claimed by both ${owners.get(pad)} and ${who}`);
      owners.set(pad, who);
    }
  }
  assert.ok(n >= 10, `found only ${n} registerAction calls; did the pattern stop matching?`);
  assert.equal(production.size, productionClaims, 'production code has no duplicate pad claims');
});

test('controls: listControls sorts by group, then order, then registration; describeControl claims no slot', () => {
  const free = freeSlots().length;
  quiet(() => {
    registerAction('lc-late', { pad: freeSlots()[0]!, label: 'Late', group: 'menu', keys: ['KeyL'] });
    describeControl('lc-second', { label: 'Second', group: 'move', order: 1, keys: ['KeyJ'], pad: 'ls' });
    describeControl('lc-first', { label: 'First', group: 'move', order: 0, keys: ['KeyK'], pad: 'rs' });
    describeControl('lc-tie', { label: 'Tie', group: 'move', order: 0, keys: ['KeyU'], pad: ['lb', 'rb'] });
  });
  assert.equal(freeSlots().length, free - 1); // only the action took a slot
  const ids = listControls()
    .map((c) => c.id)
    .filter((id) => id.startsWith('lc-'));
  assert.deepEqual(ids, ['lc-first', 'lc-tie', 'lc-second', 'lc-late']);
  const first = listControls().find((c) => c.id === 'lc-first');
  assert.deepEqual(first, {
    id: 'lc-first',
    label: 'First',
    detail: undefined,
    keys: ['KeyK'],
    pad: 'rs',
    touch: undefined,
    group: 'move',
    order: 0,
    context: undefined,
  });
  assert.equal(listControls().find((c) => c.id === 'lc-late')!.pad, actionById('lc-late')!.pad);
  quiet(() => describeControl('lc-first', { label: 'Replaced', group: 'move', keys: ['KeyK'], pad: 'rs' }));
  assert.equal(listControls().find((c) => c.id === 'lc-first')!.label, 'Replaced');
});

test('controls: guide false hides an action', () => {
  quiet(() => registerAction('hidden-test', { pad: freeSlots()[0]!, label: 'Hidden', group: 'menu', guide: false }));
  assert.ok(actionById('hidden-test'));
  assert.ok(!listControls().some((c) => c.id === 'hidden-test'));
});

test('controls: controlProblems finds gaps in the guide', () => {
  assert.ok(GROUPS.length > 0);
  // Rows as a caller might hand them in, missing or mistyped fields included.
  const ok = { id: 'a', label: 'A', group: 'move', keys: ['KeyA'], pad: 'ls' } as ControlRow;
  assert.deepEqual(controlProblems([ok]), []);
  assert.match(controlProblems([{ ...ok, label: '' }])[0]!, /a: no label/);
  assert.match(controlProblems([{ ...ok, group: 'nope' }])[0]!, /group "nope"/);
  assert.match(controlProblems([{ ...ok, keys: 'KeyA' } as unknown as ControlRow])[0]!, /keys must be an array/);
  assert.match(controlProblems([{ ...ok, pad: undefined }])[0]!, /no pad binding/);
  assert.match(controlProblems([{ ...ok, keys: undefined, pad: undefined, touch: 'Go' }])[0]!, /no pad binding/);
  const other = { id: 'b', label: 'B', group: 'move', keys: [['KeyA', 'KeyB']], pad: 'rs' } as ControlRow;
  assert.match(controlProblems([ok, other])[0]!, /key KeyA is claimed by both a and b/);
  assert.deepEqual(controlProblems([ok, { ...other, context: 'swimming' }]), []);
});

// As with pad slots, production and prototype key claims are checked separately.
test('controls: no two bindings in src/ claim the same key', () => {
  const src = new URL('../src/', import.meta.url);
  const production = new Map(),
    prototypes = new Map(); // code -> 'file:id', per page group
  let productionClaims = 0;
  let n = 0;
  for (const f of srcFiles(src)) {
    if (!/\.[jt]s$/.test(f) || f === 'player/controls.ts') continue;
    const text = readFileSync(new URL(f, src), 'utf8');
    const found = [
      ...[
        ...text.matchAll(/registerAction\(\s*'([\w-]+)',\s*\{(?:[^{}]|\{[^{}]*\})*?\bkey:\s*('\w+'|\[[^\]]*\])/g),
      ].map(([, id, key]) => [id, key]),
      ...[...text.matchAll(/onKey\(\s*('\w+'|`[^`]*`|\[[^\]]*\])/g)].map(([, key]) => ['onKey', key]),
    ];
    for (const [id, key] of found) {
      for (const [, code] of key!.matchAll(/['`]([\w${}+ ]+)['`]/g)) {
        n++;
        const who = `${f}:${id}`;
        const owners = f.startsWith('proto/') ? prototypes : production;
        if (owners === production) productionClaims++;
        assert.ok(!owners.has(code), `key ${code} is bound by both ${owners.get(code)} and ${who}`);
        owners.set(code, who);
      }
    }
  }
  assert.ok(n >= 3, `found only ${n} key bindings; did the pattern stop matching?`);
  assert.equal(production.size, productionClaims, 'production code has no duplicate key claims');
});

test('controls: a key presses its action through one guard', () => {
  const log: string[] = [];
  const pad = freeSlots()[0]!;
  quiet(() =>
    registerAction('key-test', {
      pad,
      key: 'KeyJ',
      touch: { label: 'Jay', className: 'jay' },
      label: 'Key test',
      group: 'menu',
      down: () => log.push('down'),
      up: () => log.push('up'),
    }),
  );
  // the guide row shows the bound key and the touch label
  assert.deepEqual(controlById('key-test')!.keys, ['KeyJ']);
  assert.equal(controlById('key-test')!.touch, 'Jay');
  const field = { closest: (sel: string) => (sel.includes('input') ? {} : null) } as unknown as EventTarget;
  assert.ok(keyEvent({ type: 'keydown', code: 'KeyJ' }));
  assert.equal(keyEvent({ type: 'keydown', code: 'KeyJ', repeat: true }), false);
  assert.equal(keyEvent({ type: 'keydown', code: 'KeyJ', ctrlKey: true }), false);
  assert.equal(keyEvent({ type: 'keydown', code: 'KeyJ', target: field }), false);
  assert.equal(keyEvent({ type: 'keydown', code: 'KeyN' }), false); // unbound
  keyEvent({ type: 'keyup', code: 'KeyJ' });
  assert.deepEqual(log, ['down', 'up']);
  assert.ok(isTyping({ target: field }));
  assert.ok(!isTyping({ target: null }));

  // keys go through the action, so a wrap reaches them too
  log.length = 0;
  wrapAction('key-test', { down: (next) => (log.push('wrap'), next()) });
  keyEvent({ type: 'keydown', code: 'KeyJ' });
  assert.deepEqual(log, ['wrap', 'down']);

  // a second owner of the same key warns and stays unbound; re-registering moves the key
  log.length = 0;
  const warnings = quiet(() => onKey('KeyJ', { owner: 'other', down: () => log.push('other') }));
  assert.match(warnings[0]!, /key KeyJ is already bound by key-test/);
  quiet(() => registerAction('key-test', { pad, key: ['KeyK', 'KeyL'], label: 'Key test', group: 'menu' }));
  assert.equal(keyEvent({ type: 'keydown', code: 'KeyJ' }), false);
  assert.ok(keyEvent({ type: 'keydown', code: 'KeyL' }));
  assert.deepEqual(controlById('key-test')!.keys, ['KeyK', 'KeyL']);
  onKey('KeyJ', { owner: 'other', down: () => log.push('other') });
  keyEvent({ type: 'keydown', code: 'KeyJ' });
  assert.deepEqual(log, ['other']);
});

test('controls: an action with a context keeps it, so it may share a key (guest-crouch on Shift beside sprint)', () => {
  const [pad] = freeSlots();
  registerAction('ctx-sprint-test', { pad: pad!, keys: ['KeyQ'], label: 'Sprint test', group: 'move' });
  const [pad2] = freeSlots();
  registerAction('ctx-crouch-test', {
    pad: pad2!,
    keys: ['KeyQ'],
    label: 'Crouch test',
    group: 'move',
    context: 'as x',
  });
  assert.equal(actionById('ctx-crouch-test')!.context, 'as x');
  assert.ok(!controlProblems().some((p) => p.includes('ctx-')), JSON.stringify(controlProblems()));
});
