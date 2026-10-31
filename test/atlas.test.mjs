// Atlas logic on in-memory fixtures only: never reads docs/atlas/ or src/, so a rename elsewhere cannot fail it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFile, extractFacts } from '../dev/atlas/extract.mjs';

const SAMPLE = `// Sample feature.
// Second line.
import { a } from '../x/y.js';
import './sample.css';
import * as THREE from 'three';
export { b } from './z.js';
onStart(() => import('../lazy/part.js'));
addPresenceField('zz', () => null);
addHostField('hh', get, hear);
sync.registerOp('x.poke', {});
sync.registerState('x', {});
sync.onTick(fn, 'x');
onFrame(
  () => update(dt),
  { phase: 'world', order: -280 },
);
onFrame(tick);
registerAction('act', { pad: 'y', key: 'KeyT' });
registerInteractable(fn);
room.onMessage((m) => {
  if (m?.t !== 'yo') return;
});
net.room?.send({ t: 'yo' });
submitEdit({ op });
export function honkNow() {}
`;

test('extractFile reads every registration kind', () => {
  const r = extractFile('src/features/sample.js', SAMPLE);
  const lines = SAMPLE.split('\n');
  const lineOf = (s) => lines.findIndex((l) => l.includes(s)) + 1;
  assert.deepEqual(r, {
    f: 'src/features/sample.js',
    loc: lines.length,
    head: 'Sample feature. Second line.',
    imports: ['src/x/y.js', 'src/features/z.js'],
    lazy: ['src/lazy/part.js'],
    globs: [],
    exports: ['b', 'honkNow'],
    names: ['honkNow'],
    frames: [
      { phase: 'world', order: -280, name: 'update', line: lineOf('  () => update(dt)') - 1 },
      { phase: 'update', order: 0, name: 'tick', line: lineOf('onFrame(tick)') },
    ],
    owner: ['zz'],
    host: ['hh'],
    ops: ['x.poke'],
    states: ['x'],
    ticks: ['x'],
    msgs: ['yo'],
    onMessage: true,
    submits: true,
    actions: [{ id: 'act', pad: 'y', key: 'KeyT' }],
    interact: 1,
    routes: [],
  });
});

test('extractFile reads server routes', () => {
  const r = extractFile('server/src/s.js', `app.put(\n  '/rooms/:roomId/snapshot', h);\napp.get('/ice', h);\n`);
  assert.deepEqual(r.routes, ['PUT /rooms/:roomId/snapshot', 'GET /ice']);
});

test('extractFile survives a syntax error', () => {
  const r = extractFile('src/bad.js', 'const = ;');
  assert.equal(typeof r.parseError, 'string');
  assert.deepEqual([r.imports, r.frames, r.msgs, r.names, r.actions], [[], [], [], [], []]);
});

test('extractFile reads import.meta.glob and names', () => {
  const r = extractFile(
    'src/main.js',
    `import.meta.glob('./features/*.js', { eager: true });\nconst o = { go() {}, n: 1 };\nclass K {}\n`,
  );
  assert.deepEqual(r.globs, ['./features/*.js']);
  assert.deepEqual(r.names, ['o', 'go', 'K']);
});

test('extractFacts is deterministic', () => {
  const sources = [
    { path: 'src/b.js', text: `import { a } from './a.js';\nexport const b = 1;\n` },
    { path: 'src/features/c.js', text: `import { b } from '../b.js';\nonFrame(() => go());\n` },
    { path: 'src/a.js', text: `export const a = 1;\n` },
  ];
  const one = extractFacts({ git: false, sources });
  const two = extractFacts({ git: false, sources: [...sources].reverse() });
  assert.deepEqual(one, two);
  assert.deepEqual(
    one.files.map((f) => f.f),
    ['src/a.js', 'src/b.js', 'src/features/c.js'],
  );
  assert.deepEqual(one.files[1].imports, ['src/a.js']);
  assert.deepEqual(one.files[2].imports, ['src/b.js']);
  assert.equal(one.git, null);
});
