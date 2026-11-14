// The registry scan (dev/registry/scan.ts): clashes inside one tree, and what a change does to main's registry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanSources, checkRegistry } from '../dev/registry/scan.ts';

// Name -> the files that claim it, as scanSources builds each map.
type Names = Record<string, string[]>;
const file = (path: string, text: string) => ({ path, text });
const NET = file(
  'src/netplay/net.ts',
  'function buildPresence() {\n  const pr = {\n    v: 1,\n    p: null,\n  };\n}\n',
);
const CONTROLS = file('src/player/controls.ts', "export const PAD = [\n  'a',\n  'b',\n  'x',\n];\n");

test('the scan ignores calls in strings and comments, and definitions', () => {
  const reg = scanSources([
    file(
      'src/features/a.js',
      "const s = \"addPresenceField('x', f)\"; // addPresenceField('y', f)\nexport function addPresenceField(key, fn) {}\naddPresenceField('z', () => 1, { a: [1, 2] });",
    ),
  ]);
  assert.deepEqual(Object.keys(reg.presence), ['z']);
  assert.deepEqual((reg.presence as Names).z, ['src/features/a.js:3']);
});

test('defineKind orders are read: clashes and the feature range fail, a non-literal order is an error', () => {
  const errorsOf = (...files: ReturnType<typeof file>[]) => checkRegistry(scanSources(files));
  assert.deepEqual(errorsOf(file('src/entities/a.ts', "defineKind('a', { update: -300, postPhysics: -300 });")), []);
  // against a core hook, another core-range kind, the feature range, and a pinned fixed-step site
  const core = file('src/player/p.ts', "onFrame(f, { phase: 'update', order: -290 });");
  assert.match(
    errorsOf(core, file('src/entities/a.ts', "defineKind('a', { update: -290 });"))[0]!,
    /equals src\/player/,
  );
  const b = file('src/entities/b.ts', "defineKind('b', { lateUpdate: -50 });");
  assert.match(
    errorsOf(b, file('src/entities/a.ts', "defineKind('a', { lateUpdate: -50 });"))[0]!,
    /late order -50 equals/,
  );
  // in the feature range kinds tie, as onFrame hooks do
  const c = file('src/features/c.ts', "defineKind('c', { lateUpdate: 0 });");
  assert.deepEqual(errorsOf(c, file('src/features/d.ts', "defineKind('d', { lateUpdate: 0 });")), []);
  assert.match(errorsOf(file('src/features/a.ts', "defineKind('a', { update: -50 });"))[0]!, /order -10 and up/);
  const site = file('src/physics/s.ts', 'onPreStep(f, { order: 40 });');
  assert.match(
    errorsOf(site, file('src/entities/a.ts', "defineKind('a', { fixedPre: 40 });"))[0]!,
    /fixedPre order 40/,
  );
  const twice = file('src/entities/b.ts', "defineKind('a', { update: 7 });");
  assert.match(errorsOf(twice, file('src/entities/a.ts', "defineKind('a', { update: 8 });"))[0]!, /defined twice/);
  // unnumbered step hooks and feature-range hooks may tie; a phase or order the reader can't see can't
  assert.deepEqual(errorsOf(file('src/proto/p.ts', 'onPreStep(f);\nonPreStep(g);')), []);
  assert.match(errorsOf(file('src/entities/a.ts', "defineKind('a', { update: ORDER });"))[0]!, /literal integer order/);
  assert.match(errorsOf(file('src/entities/a.ts', "defineKind('a', { tick: 1 });"))[0]!, /known phase/);
  assert.match(errorsOf(file('src/entities/a.ts', 'defineKind(name, orders);'))[0]!, /literal kind/);
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
  assert.deepEqual((reg.presence as Names).v, ['src/netplay/net.ts (core)']);
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
    file('src/features/b.js', "addPresenceField('hd', get);\naddPresenceField('p', get);"),
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
  (reg.messages as Names).honk!.push('src/features/copy.js');
  assert.match(checkRegistry(reg)[0]!, /message type 'honk'/);
});

test('pad slots: registerAction claims, describeControl does not, one slot must stay free', () => {
  const reg = scanSources([
    CONTROLS,
    file('src/player/input.ts', "registerAction('use', { pad: 'x', down() { go({ pad: 'a' }); } });"),
    file('src/features/held.ts', "describeControl('toss', { pad: 'x' });\nregisterAction('jump', { pad: 'a' });"),
  ]);
  assert.deepEqual(reg.pads, { x: ['src/player/input.ts:use'], a: ['src/features/held.ts:jump'] });
  assert.deepEqual(checkRegistry(reg), []);
  (reg.pads as Names).b = ['src/features/c.js:c'];
  assert.match(checkRegistry(reg).join('\n'), /every pad slot is taken/);
  reg.pads.x.push('src/features/d.js:d');
  assert.match(checkRegistry(reg).join('\n'), /pad slot 'x' is claimed twice/);
});

test("pad slots: a prototype's claim leaves the slot free and doesn't clash with the game's", () => {
  const reg = scanSources([
    CONTROLS,
    file('src/player/input.ts', "registerAction('use', { pad: 'x' });"),
    file('src/proto/toy/pad.ts', "registerAction('toy', { pad: 'x' });\nregisterAction('other', { pad: 'b' });"),
  ]);
  assert.deepEqual(reg.pads, { x: ['src/player/input.ts:use'] });
  assert.deepEqual(reg.protoPads, { x: ['src/proto/toy/pad.ts:toy'], b: ['src/proto/toy/pad.ts:other'] });
  assert.deepEqual(checkRegistry(reg), []);
  reg.protoPads.b!.push('src/proto/q.ts:q');
  assert.match(checkRegistry(reg).join('\n'), /pad slot 'b' is claimed twice/);
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
  assert.match(errors[0]!, /a\.js:2: onFrame late order 3000 equals core/);
  assert.match(errors[1]!, /b\.js:1: features use onFrame order -10 and up/);
});
