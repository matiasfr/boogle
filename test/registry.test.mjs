// The registry scan (dev/registry/scan.ts): clashes inside one tree, and what a change does to main's registry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanSources, checkRegistry, compareRegistries, shapeOf } from '../dev/registry/scan.ts';

const file = (path, text) => ({ path, text });
const NET = file(
  'src/netplay/net.ts',
  'function buildPresence() {\n  const pr = {\n    v: 1,\n    p: null,\n  };\n}\n',
);
const CONTROLS = file('src/player/controls.ts', "export const PAD = [\n  'a',\n  'b',\n  'x',\n];\n");

test('the scan ignores calls in strings and comments, and definitions', () => {
  const reg = scanSources([
    file(
      'src/features/a.js',
      "const s = \"addPresenceField('x', f)\"; // addHostField('y', f)\nexport function addPresenceField(key, fn) {}\naddPresenceField('z', () => 1, { a: [1, 2] });",
    ),
  ]);
  assert.deepEqual(Object.keys(reg.presence), ['z']);
  assert.deepEqual(reg.presence.z, ['src/features/a.js:3']);
});

test('TypeScript reads like JavaScript: typed locals, `as const`, generics, a moved file', () => {
  const reg = scanSources([
    file(
      'src/netplay/net.ts',
      'function buildPresence(): Presence {\n  const pr: Presence = {\n    v: 1,\n    p: null,\n  };\n  return pr;\n}\n',
    ),
    file('src/player/controls.ts', "export const PAD = ['a', 'b'] as const;\n"),
    file(
      'src/features/a.ts',
      "addPresenceField<number>('z' as const, (): number | null => null);\nregisterAction('go', { pad: 'a' });\nroom.send({ t: 'beep' } satisfies Msg);",
    ),
  ]);
  assert.deepEqual(Object.keys(reg.presence).sort(), ['p', 'v', 'z']);
  assert.deepEqual(reg.presence.v, ['src/netplay/net.ts (core)']);
  assert.deepEqual(reg.padSlots, ['a', 'b']);
  assert.deepEqual(reg.pads, { a: ['src/features/a.ts:go'] });
  assert.deepEqual(Object.keys(reg.messages), ['beep']);
  assert.deepEqual(checkRegistry(reg), []);
});

test('a file the registry cannot parse is an error, not a silent skip', () => {
  const reg = scanSources([file('src/features/bad.js', 'addPresenceField(')]);
  assert.match(checkRegistry(reg).join('\n'), /bad\.js: .*cannot read this file/);
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
    file(
      'src/features/honk.ts',
      "room.send({ t: 'honk' });\nexport function on(m) {\n  if (m.t !== 'honk') return;\n}",
    ),
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
    file('src/player/input.ts', "registerAction('use', { pad: 'x', down() { go({ pad: 'a' }); } });"),
    file('src/features/hotbar.ts', "describeControl('toss', { pad: 'x' });\nregisterAction('jump', { pad: 'a' });"),
  ]);
  assert.deepEqual(reg.pads, { x: ['src/player/input.ts:use'], a: ['src/features/hotbar.ts:jump'] });
  assert.deepEqual(checkRegistry(reg), []);
  reg.pads.b = ['src/features/c.js:c'];
  assert.match(checkRegistry(reg).join('\n'), /every pad slot is taken/);
  reg.pads.x.push('src/features/d.js:d');
  assert.match(checkRegistry(reg).join('\n'), /pad slot 'x' is claimed twice/);
});

test('feature onFrame orders stay in the feature range and off core orders', () => {
  const reg = scanSources([
    file(
      'src/player/player.ts',
      "onFrame(cam, { phase: 'update', order: -200 });\nonFrame(send, { phase: 'late', order: 3000 });",
    ),
    file('src/guest/play.ts', 'onFrame(g, { order: -5 });'),
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

test("a new world namespace is a clean break: main's rules, ops and states bind nothing", () => {
  const s = (version, value) => ({ version, shape: shapeOf(value) });
  const base = rulesReg(['terrain', 'gifts'], { terrain: s(0, {}), gifts: s(0, { v: 1 }) }, { 'g.take': 'gifts' });
  const head = { ...rulesReg(['gifts'], { gifts: s(0, { w: 1 }) }, {}), ns: 'v01' };
  const { errors, notes } = compareRegistries(base, head);
  assert.deepEqual(errors, []);
  assert.ok(notes.some((n) => /namespace \(none\) -> v01/.test(n)));
  // the same namespace on both sides compares as usual
  assert.match(compareRegistries({ ...base, ns: 'v01' }, head).errors.join('\n'), /RULES order changed/);
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
