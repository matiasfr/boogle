// The registry scan (dev/registry/scan.mjs): clashes inside one tree, and what a change does to main's registry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanSources, checkRegistry, compareRegistries, shapeOf, calls } from '../dev/registry/scan.mjs';

const file = (path, text) => ({ path, text });
const NET = file(
  'src/netplay/net.js',
  'function buildPresence() {\n  const pr = {\n    v: 1,\n    p: null,\n  };\n}\n',
);
const CONTROLS = file('src/player/controls.js', "export const PAD = [\n  'a',\n  'b',\n  'x',\n];\n");

test('calls splits top-level args and ignores commas and brackets in strings and comments', () => {
  const [c] = calls("onFrame(() => { f(1, 2); }, { phase: 'late', order: 5 }) // onFrame(x)", 'onFrame');
  assert.equal(c.args.length, 2);
  assert.equal(c.args[1], "{ phase: 'late', order: 5 }");
  assert.equal(calls("const s = 'onFrame(a, b)';", 'onFrame').length, 0);
  assert.equal(calls('export function onFrame(fn, opts) {}', 'onFrame').length, 0);
});

test('a presence key taken twice (core or field) fails', () => {
  const reg = scanSources([
    NET,
    file('src/features/a.js', "addPresenceField('hd', () => 1);"),
    file('src/features/b.js', "addHostField('hd', get, on);\naddPresenceField('p', get);"),
  ]);
  const errors = checkRegistry(reg);
  assert.equal(errors.length, 2);
  assert.match(errors.join('\n'), /'hd'.*a\.js.*b\.js/);
  assert.match(errors.join('\n'), /'p'.*core/);
});

test('a message type sent from two files fails; a receiver-only file does not count', () => {
  const reg = scanSources([
    file('src/features/honk.js', "room.send({ t: 'honk' });\nif (m.t !== 'honk') return;"),
    file('src/sim/honk-check.js', "export const ok = (m) => m.t === 'honk';"),
    file('src/features/other.js', "const ctx = { context: 'honk' };\nroom.send({ t: 'beep' });"),
  ]);
  assert.deepEqual(Object.keys(reg.messages).sort(), ['beep', 'honk']);
  assert.deepEqual(checkRegistry(reg), []);
  reg.messages.honk.push('src/features/copy.js');
  assert.match(checkRegistry(reg)[0], /message type 'honk'/);
});

test('pad slots: registerAction claims, describeControl does not, one slot must stay free', () => {
  const reg = scanSources([
    CONTROLS,
    file('src/player/input.js', "registerAction('use', { pad: 'x', down() { go({ pad: 'a' }); } });"),
    file('src/features/hotbar.js', "describeControl('toss', { pad: 'x' });\nregisterAction('jump', { pad: 'a' });"),
  ]);
  assert.deepEqual(reg.pads, { x: ['src/player/input.js:use'], a: ['src/features/hotbar.js:jump'] });
  assert.deepEqual(checkRegistry(reg), []);
  reg.pads.b = ['src/features/c.js:c'];
  assert.match(checkRegistry(reg).join('\n'), /every pad slot is taken/);
  reg.pads.x.push('src/features/d.js:d');
  assert.match(checkRegistry(reg).join('\n'), /pad slot 'x' is claimed twice/);
});

test('feature onFrame orders stay in the feature range and off core orders', () => {
  const reg = scanSources([
    file(
      'src/player/player.js',
      "onFrame(cam, { phase: 'update', order: -200 });\nonFrame(send, { phase: 'late', order: 3000 });",
    ),
    file('src/guest/play.js', 'onFrame(g, { order: -5 });'),
    file('src/features/a.js', "onFrame(a, { order: -5 });\nonFrame(b, { phase: 'late', order: 3000 });"),
    file('src/features/b.js', "onFrame(c, {\n  phase: 'world',\n  order: -50,\n});"),
  ]);
  const errors = checkRegistry(reg);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /a\.js:2: onFrame late order 3000 equals core/);
  assert.match(errors[1], /b\.js:1: features use onFrame order -10 and up/);
});

const rulesReg = (rules, states, ops = {}) => ({ rules, states, ops, presence: {}, messages: {} });

test('RULES must keep main as a prefix', () => {
  const base = rulesReg(['terrain', 'gifts'], {});
  assert.deepEqual(compareRegistries(base, rulesReg(['terrain', 'gifts', 'tide'], {})).errors, []);
  assert.match(compareRegistries(base, rulesReg(['terrain', 'tide', 'gifts'], {})).errors[0], /RULES order changed/);
  assert.match(compareRegistries(base, rulesReg(['terrain'], {})).errors[0], /RULES order changed/);
});

test('states: no removal, no version going down, no shape change without a version bump', () => {
  const s = (version, value) => ({ version, shape: shapeOf(value) });
  const base = rulesReg([], { g: s(0, { v: 1, it: [] }), m: s(1, { m: 0 }) }, { 'g.take': 'g' });
  const same = rulesReg([], { g: s(0, { it: [], v: 2 }), m: s(1, { m: 3 }) }, { 'g.take': 'g' });
  assert.deepEqual(compareRegistries(base, same).errors, []);
  const reshaped = rulesReg([], { g: s(0, { v: 1, items: [] }), m: s(1, { m: 0 }) }, { 'g.take': 'g' });
  assert.match(compareRegistries(base, reshaped).errors[0], /state 'g' saves a different shape .* bump `version`/s);
  const bumped = rulesReg([], { g: s(1, { v: 1, items: [] }), m: s(1, { m: 0 }) }, { 'g.take': 'g' });
  assert.deepEqual(compareRegistries(base, bumped).errors, []);
  const gone = rulesReg([], { g: s(0, { v: 1, it: [] }), m: s(0, { m: 0 }) }, {});
  const errors = compareRegistries(base, gone).errors.join('\n');
  assert.match(errors, /state 'm' version went down/);
  assert.match(errors, /op 'g\.take' was removed/);
});

test('new and dropped wire names are notes, not errors', () => {
  const base = { ...rulesReg([], {}), presence: { hd: ['a'] }, messages: { honk: ['h'] } };
  const head = { ...rulesReg([], {}), presence: { boogler: ['b'] }, messages: { honk: ['h'] } };
  const { errors, notes } = compareRegistries(base, head);
  assert.deepEqual(errors, []);
  assert.equal(notes.length, 2);
});
