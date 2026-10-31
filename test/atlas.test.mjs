// Atlas logic on in-memory fixtures only: never reads docs/atlas/ or src/, so a rename elsewhere cannot fail it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFile, extractFacts, diffFacts } from '../dev/atlas/extract.mjs';
import { BOX, KINDS, CHANNEL_IDS } from '../atlas/layout.js';
import { buildModel, kindOf, resolveCite } from '../atlas/model.js';
import { parseNarrative } from '../atlas/narrative.js';
import { checkAtlas } from '../atlas/check.js';
import { parseChanges, renderChanges } from '../atlas/changes.js';

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
  assert.deepEqual(r, {
    f: 'src/features/sample.js',
    loc: lines.length,
    head: 'Sample feature. Second line.',
    imports: ['src/x/y.js', 'src/features/z.js'],
    lazy: ['src/lazy/part.js'],
    exports: ['b', 'honkNow'],
    names: ['honkNow'],
    frames: [
      { phase: 'world', order: -280, name: 'update', core: false },
      { phase: 'update', order: 0, name: 'tick', core: false },
    ],
    owner: ['zz'],
    host: ['hh'],
    ops: ['x.poke'],
    states: ['x'],
    ticks: ['x'],
    msgs: ['yo'],
    onMessage: true,
    submits: true,
    actions: ['act'],
    interact: 1,
    routes: [],
    lockstep: false,
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

test('extractFile reads names', () => {
  const r = extractFile('src/main.js', `const o = { go() {}, n: 1 };\nclass K {}\n`);
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

// ---- narrative: fixtures only ----

const MAIN =
  'function frame() {\n  updateRemotes();\n  world.step(1);\n  runFrame();\n  renderFrame();\n}\nrenderer.setAnimationLoop(frame);\n';

function good() {
  const facts = extractFacts({
    git: false,
    sources: [
      { path: 'src/main.js', text: MAIN },
      {
        path: 'src/world/rules/mushrooms.js',
        text: "sync.registerOp('mush.plant', {});\nsync.registerState('mushrooms', {});\nexport function apply() {}\n",
      },
      {
        path: 'src/features/honk.js',
        text: "registerAction('honk', { pad: 'y', key: 'KeyT' });\nnet.room.send({ t: 'honk' });\nexport function honkNow() {}\n",
      },
    ],
  });
  const ids = [...new Set(Object.values(BOX).map((b) => b.c))];
  const concepts = {
    intro: { title: 't', ways: [{ kind: 'local', says: 's', eg: 'e' }] },
    kinds: Object.fromEntries(Object.keys(KINDS).map((k) => [k, 'text'])),
    channels: Object.fromEntries(CHANNEL_IDS.map((k) => [k, { name: k, d: 'd', tag: 't' }])),
    folders: { features: 'plug-ins', 'world/rules': 'rules' },
    boxes: { 'you.features': '{features} plug-ins' },
    concepts: ids.map((id) => ({
      id,
      title: id,
      one: 'one',
      like: 'like',
      rules: ['rule'],
      code: [{ dir: 'src/features' }],
    })),
  };
  const stories = [
    {
      id: 'mush',
      title: 'Plant',
      kind: 'lock',
      order: 40,
      _file: 'docs/atlas/stories/mush.json',
      steps: [
        {
          go: [['you.features', 'lane:lock', 'you.world']],
          text: 'It submits the edit.',
          cite: [{ file: 'src/world/rules/mushrooms.js', symbol: 'apply' }, { op: 'mush.plant' }, { message: 'honk' }],
        },
        { hl: ['you.world'], text: 'Applied.', cite: [{ state: 'mushrooms' }, { action: 'honk' }] },
      ],
    },
  ];
  const changes =
    '# What changed\n\n## 2026-10-30\n\n- New. [see](#story/mush) and [frame](#view/frame)\n\n## 2026-10-29\n\n- Older.\n';
  return { facts, concepts, stories, changes };
}
const report = (fix) => checkAtlas(fix);
const only = (problems, re) => {
  const hits = problems.filter((p) => re.test(p));
  assert.equal(hits.length, 1, `expected one match for ${re}, got ${hits.length} in:\n${problems.join('\n')}`);
  assert.equal(problems.length, 1, `extra problems:\n${problems.join('\n')}`);
};

test('checkAtlas passes a good narrative', () => {
  assert.deepEqual(report(good()), []);
});

test('checkAtlas names each problem once', () => {
  const run = (edit, re) => {
    const g = good();
    edit(g);
    only(report(g), re);
  };
  const cite = (g, c) => (g.stories[0].steps[0].cite = [c]);
  run((g) => cite(g, { file: 'src/nope.js' }), /mush\.json step 1: .*src\/nope\.js does not exist/);
  run((g) => cite(g, { file: 'src/features/honk.js', symbol: 'zzz' }), /has no symbol zzz/);
  run((g) => cite(g, { op: 'mush.nope' }), /no file registers op mush\.nope/);
  run((g) => cite(g, { op: 'mush.plant', state: 'mushrooms' }), /exactly one of/);
  run((g) => (g.stories[0].steps[0].go = [['you.features', 'nowhere']]), /unknown box or lane "nowhere" in go/);
  run((g) => (g.stories[0].steps[0].go = [['you.features', 'lane:zzz']]), /unknown box or lane "lane:zzz"/);
  run((g) => (g.stories[0].steps[1].hl = ['nope.box']), /unknown box "nope\.box" in hl/);
  run(
    (g) => (g.concepts.concepts = g.concepts.concepts.filter((c) => c.id !== 'server')),
    /BOX server: unknown concept "server"/,
  );
  run((g) => (g.stories[0]._file = 'docs/atlas/stories/other.json'), /must equal the file name "other"/);
  run(
    (g) => (g.changes = '# What changed\n\n## 2026-10-01\n\n- a\n\n## 2026-10-02\n\n- b\n'),
    /## 2026-10-02 comes after ## 2026-10-01/,
  );
  run((g) => (g.changes += '\n- [gone](#story/nope)\n'), /#story\/nope points at nothing/);
  run((g) => (g.facts.loop = null), /could not find the frame function/);
});

test('parseNarrative never throws', () => {
  const N = parseNarrative({
    conceptsText: '{ not json',
    storyTexts: {
      'x/docs/atlas/stories/a.json': '{"id":"a"}',
      'x/docs/atlas/stories/b.json': '{"id":"b","order":2,"steps":[]}',
    },
  });
  assert.equal(N.loadProblems.length, 2);
  assert.deepEqual(N.concepts, []);
  assert.deepEqual(N.boxes, {});
  assert.deepEqual(
    N.stories.map((s) => s.id),
    ['b'],
  );
  assert.doesNotThrow(() => parseNarrative());
});

test('resolveCite never throws', () => {
  const model = buildModel(good().facts);
  for (const c of [
    null,
    undefined,
    {},
    { file: 1 },
    [],
    'x',
    { file: 'a', dir: 'b' },
    { symbol: 'x' },
    { dir: 'src/features', symbol: 's' },
  ]) {
    const r = resolveCite(c, model);
    assert.equal(typeof r.error, 'string', JSON.stringify(c));
    assert.deepEqual(r.files, []);
  }
  assert.deepEqual(resolveCite({ dir: 'src/features' }, model), { files: ['src/features/honk.js'], error: null });
});

test('kindOf classifies', () => {
  const rec = (f, extra = {}) => ({
    f,
    ops: [],
    states: [],
    ticks: [],
    host: [],
    owner: [],
    msgs: [],
    onMessage: false,
    submits: false,
    ...extra,
  });
  assert.equal(kindOf(rec('src/features/x.js', { ops: ['a'] })), 'lock');
  assert.equal(kindOf(rec('src/world/sync.js', { msgs: ['w:edits'], onMessage: true })), 'lock');
  assert.equal(kindOf(rec('src/boogler/b.js', { host: ['g'] })), 'host');
  assert.equal(kindOf(rec('src/netplay/net.js', { owner: ['v', 'p'] })), 'owner');
  assert.equal(kindOf(rec('src/world/grid.js', { lockstep: true })), 'lock');
  assert.equal(kindOf(rec('src/netplay/snaps.js')), 'local');
  assert.equal(kindOf(rec('src/features/ping.js', { onMessage: true })), 'msg');
  assert.equal(kindOf(rec('src/features/g.js', { submits: true })), 'adapter');
  assert.equal(kindOf(rec('src/features/plain.js')), 'local');
});

test('changes parse and render, escaping everything', () => {
  const entries = parseChanges(
    '# What changed\n\n## 2026-10-30\n\nHello <b>x</b> `a<b`\n\n- [go](#story/mush) [dead](#story/no)\n',
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].date, '2026-10-30');
  const html = renderChanges(entries, { stories: new Set(['mush']), concepts: new Set() });
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(html, /<code>a&lt;b<\/code>/);
  assert.match(html, /<a href="#story\/mush"[^>]*>go<\/a>/);
  assert.doesNotMatch(html, /story\/no"/);
});

test('diffFacts reports files, folders and keys gained and lost', () => {
  const mk = (sources) => extractFacts({ git: false, sources });
  const before = mk([
    { path: 'src/features/old.js', text: "sync.registerOp('a.x', {});\naddPresenceField('k', f);\n" },
    { path: 'src/features/keep.js', text: "registerAction('keep', { pad: 'y' });\n" },
  ]);
  const after = mk([
    { path: 'src/features/keep.js', text: "registerAction('keep', { pad: 'y' });\nroom.send({ t: 'yo' });\n" },
    { path: 'src/guest/new.js', text: "addHostField('hf', f, g);\n" },
  ]);
  assert.deepEqual(diffFacts(before, after), {
    filesAdded: ['src/guest/new.js'],
    filesRemoved: ['src/features/old.js'],
    foldersAdded: ['guest'],
    foldersRemoved: [],
    keys: {
      ops: { added: [], removed: ['a.x'] },
      owner: { added: [], removed: ['k'] },
      host: { added: ['hf'], removed: [] },
      msgs: { added: ['yo'], removed: [] },
    },
  });
});

test('the reader tells senders from receivers, and keeps core presence keys and the frame loop', () => {
  const send = extractFile('src/features/a.js', "room.send({ t: 'a' });\nexport const ok = (m) => m.t === 'b';");
  assert.deepEqual(send.msgs, ['a', 'b']);
  const listen = extractFile('src/features/b.js', "const x = { t: 'c' };\nroom.onMessage((m) => m.t === 'd');");
  assert.deepEqual(listen.msgs, ['d']);
  const net = extractFile('src/netplay/net.js', 'function buildPresence() {\n  const pr = { v: 1, p: null };\n}\n');
  assert.deepEqual(net.owner, ['v', 'p']);
  const main = extractFacts({
    git: false,
    sources: [{ path: 'src/main.js', text: MAIN }],
  });
  assert.deepEqual(main.loop, { pre: ['updateRemotes', 'world.step'], render: 'renderFrame' });
  assert.equal(extractFacts({ git: false, sources: [{ path: 'src/main.js', text: 'const a = 1;' }] }).loop, null);
});

test('hooks are core by reserved order, and lockstep comes from the lint globs', () => {
  const globs = ['src/sim/**/*.js', 'src/world/grid.js'];
  assert.equal(extractFile('src/sim/a/b.js', '', globs).lockstep, true);
  assert.equal(extractFile('src/world/grid.js', '', globs).lockstep, true);
  assert.equal(extractFile('src/world/other.js', '', globs).lockstep, false);
  const frames = extractFile(
    'src/guest/play.js',
    "onFrame(a, { order: -5 });\nonFrame(b, { order: -200 });\nonFrame(c, { phase: 'late', order: 3000 });",
  ).frames;
  assert.deepEqual(
    frames.map((f) => f.core),
    [false, true, true],
  );
  const feat = extractFile('src/features/x.js', 'onFrame(a, { order: -200 });').frames;
  assert.equal(feat[0].core, false);
});
