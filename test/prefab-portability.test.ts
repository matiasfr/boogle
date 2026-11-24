import { prefabs as loader } from '../src/content/prefabs/loader-yard.ts';
import { prefabs as rooms } from '../src/content/prefabs/rooms.ts';
import { prefabs as scenery } from '../src/content/prefabs/scenery.ts';
import { levels as sceneryLevels } from '../src/content/levels/scenery.ts';
import { prefabs as greenKerb } from '../src/content/prefabs/town-green-kerb.ts';
import { levels as greenKerbLevels } from '../src/content/levels/town-green-kerb.ts';
import { levels as roomLevels } from '../src/content/levels/rooms.ts';
import { prefabs as house } from '../src/content/prefabs/house.ts';
import { levels as houseLevels } from '../src/content/levels/house.ts';
import { levels as blockoutLevels } from '../src/content/levels/town-blockout.ts';
import { prefabs as plotHouses } from '../src/content/prefabs/town-plot-house.ts';
import { prefabs as plotStakes } from '../src/content/prefabs/town-plot-stakes.ts';
import { levels as plotStakeLevels } from '../src/content/levels/town-plot-stakes.ts';
import { HALTS } from '../src/place/layout.ts';
import { prefabs as museum } from '../src/content/prefabs/museum.ts';
import { haltKitContent } from '../dev/prefab/halts.ts';
import { rotundaContent } from '../dev/prefab/rotunda.ts';
import { canyonKitContent } from '../dev/prefab/canyon-kit.ts';
import { prefabs as terrain } from '../src/content/prefabs/terrain.ts';
import { prefabs as roundhouse } from '../src/content/prefabs/roundhouse.ts';
import { levels as museumLevels } from '../src/content/levels/museum.ts';
import { prefabs as curio } from '../src/content/prefabs/curio.ts';
import { prefabs as shop } from '../src/content/prefabs/shop.ts';
import { levels as shopLevels } from '../src/content/levels/shop.ts';
import { prefabs as railway } from '../src/content/prefabs/railway.ts';
import { prefabs as till } from '../src/content/prefabs/railway-till.ts';
import { levels as tillLevels } from '../src/content/levels/railway-till.ts';
import { prefabs as yoke } from '../src/content/prefabs/railway-yoke.ts';
import { levels as yokeLevels } from '../src/content/levels/railway-yoke.ts';
import { prefabs as seaLadder } from '../src/content/prefabs/sea-ladder.ts';
import { prefabs as greybox } from '../src/content/prefabs/greybox.ts';
import { prefabs as town } from '../src/content/prefabs/town.ts';
import { prefabs as rock } from '../src/content/prefabs/bell-rock.ts';
import { levels as leg2 } from '../src/content/levels/leg2.ts';
import { levels as gorge } from '../src/content/levels/gorge.ts';
import { levels as workshop } from '../src/content/levels/workshop.ts';
import { levels as kitLevels } from '../src/content/levels/workshop-kit.ts';
import { prefabs as kit } from '../src/content/prefabs/workshop-kit.ts';
import { prefabs as pois } from '../src/content/prefabs/pois.ts';
import { prefabs as caves } from '../src/content/prefabs/caves.ts';
import { levels as poiLevels } from '../src/content/levels/pois.ts';
import { prefabs as lookout } from '../src/content/prefabs/lookout.ts';
import { levels as lookoutLevels } from '../src/content/levels/lookout.ts';
import { prefabs as ringIsland } from '../src/content/prefabs/ring-island.ts';
import { levels as ringIslandLevels } from '../src/content/levels/ring-island.ts';
import { prefabs as mushrooms } from '../src/content/prefabs/mushrooms.ts';
import { levels as mushroomLevels } from '../src/content/levels/mushrooms.ts';
import { prefabs as secrets } from '../src/content/prefabs/secrets.ts';
import { levels as secretsLevels } from '../src/content/levels/secrets.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { assertAuthoredNumbers } from '../dev/prefab/authored.ts';
import { canonical, compile, writeArtifacts } from '../dev/prefab/compiler.ts';
import type { JsonObject } from '../src/prefab/types.ts';
import { metadata } from '../src/prefab/types.ts';
import { expandOperands } from '../src/prefab/operands.ts';
import * as validation from '../src/prefab/validate.ts';
import { prefabGolden } from './helpers/prefab-golden.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import bell from '../content/built/levels/bell.json' with { type: 'json' };

test('page startup has exactly one catalogue validation owner shared by every consumer', () => {
  const catalogue = 'src/prefab/catalogue.ts';
  const sourceRoot = new URL('../src/', import.meta.url);
  const loads: string[] = [],
    imports: string[] = [];
  for (const relative of fs.globSync('**/*.ts', { cwd: sourceRoot })) {
    const sourcePath = `src/${relative.replaceAll('\\', '/')}`; // globSync uses backslashes on Windows
    if (sourcePath === 'src/prefab/validate.ts') continue;
    const source = fs.readFileSync(new URL(relative, sourceRoot), 'utf8');
    const calls = source.match(/\b(?:loadPrefabArtifact|validateArtifact)\s*\(/g)?.length ?? 0;
    loads.push(...Array.from({ length: calls }, () => sourcePath));
    if (/from\s+['"][^'"]*content\/built\/prefabs\.json['"]/.test(source)) imports.push(sourcePath);
  }
  assert.deepEqual(loads.sort(), [catalogue], 'full catalogue validation must happen only in the shared module');
  assert.deepEqual(imports.sort(), [catalogue], 'consumers must use the validated catalogue, not reload raw JSON');
  for (const file of [
    'src/entities/town/workshop-kit.ts',
    'src/entities/town/shop.ts',
    'src/entities/town/curio-shelf.ts',
    'src/entities/town/museum.ts',
    'src/entities/town/rooms.ts',
    'src/entities/town/house.ts',
    'src/entities/route-greybox/boxes.ts',
    'src/entities/route-greybox/leg2-draw.ts',
    'src/prefab/instantiate.ts',
    'src/entities/railway/halt-kit.ts',
    'src/entities/terrain-kit/view.ts',
  ])
    assert.match(
      fs.readFileSync(file, 'utf8'),
      /from\s+['"][^'"]*catalogue\.ts['"]/,
      `${file}: share the page catalogue`,
    );
});

// A fresh Node process prevents other unit tests' ESM caches from hiding duplicate startup validation.
// This executes consumer imports under a validator spy; it needs no Git refs or timing assumptions.
test('importing all eleven page consumers validates the catalogue exactly once', () => {
  const preloads = process.execArgv.flatMap((arg, k, args) =>
    arg === '--import' ? [arg, args[k + 1]!] : arg.startsWith('--import=') ? [arg] : [],
  );
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [...preloads, '--experimental-test-module-mocks', 'test/helpers/prefab-startup.ts'],
      { encoding: 'utf8' },
    ),
  );
  assert.deepEqual(result, { consumers: 11, catalogueValidations: 1, directValidations: 0 });
});

// Report growth without a content ceiling: owner-calls.md, "No limits ahead of a measured problem" (14 November).
// Startup validation, shared-record goldens and artifact freshness remain defect checks, independent of size.
test('compiled catalogue reports total and per-area records and bytes', (t) => {
  const records = Object.keys(artifact.prefabs).length;
  const bytes = fs.globSync('content/built/**/*.json').reduce((sum, file) => sum + fs.statSync(file).size, 0);
  t.diagnostic(`GLOBAL: ${records} records, ${bytes} bytes`);
  const areas = new Map<string, { records: number; bytes: number }>();
  for (const def of Object.values(artifact.prefabs)) {
    const area = def.key.startsWith('railway.halt-') ? 'halts' : def.key.split('.')[0]!;
    const total = areas.get(area) ?? { records: 0, bytes: 0 };
    total.records++;
    total.bytes += Buffer.byteLength(canonical(def));
    areas.set(area, total);
  }
  for (const [area, total] of [...areas].sort())
    t.diagnostic(
      `area ${area}: ${total.records} records, ${total.bytes} definition bytes (standalone canonical records)`,
    );
  for (const file of fs.globSync('content/built/**/*.json').sort())
    t.diagnostic(`${file}: ${fs.statSync(file).size} bytes`);
});

test('every committed prefab artifact holds authored numbers, never long derived geometry', () => {
  for (const file of fs.globSync('content/built/**/*.json'))
    assertAuthoredNumbers(JSON.parse(fs.readFileSync(file, 'utf8')), file);
  assert.throws(() => assertAuthoredNumbers({ rot: [-0.030615130498210262] }), /looks derived/);
  assert.throws(() => assertAuthoredNumbers({ pos: [-0.20000000000000018] }), /do not round/);
});
test('artifact serialization is independent of runtime native transcendental results', () => {
  const original = { sin: Math.sin, cos: Math.cos, atan2: Math.atan2, hypot: Math.hypot };
  try {
    for (const key of ['sin', 'cos', 'atan2', 'hypot'] as const) {
      const f: (...args: number[]) => number = original[key];
      Math[key] = (...args: number[]) => f(...args) + 1e-15;
    }
    writeArtifacts(
      compile(
        [
          ...greybox,
          ...town,
          ...plotStakes,
          ...plotHouses,
          ...rock,
          ...railway,
          ...till,
          ...yoke,
          ...loader,
          ...seaLadder,
          ...kit,
          ...shop,
          ...curio,
          ...museum,
          ...rooms,
          ...house,
          ...roundhouse,
          ...scenery,
          ...greenKerb,
          ...pois,
          ...caves,
          ...lookout,
          ...ringIsland,
          ...mushrooms,
          ...secrets,
          ...terrain,
          ...haltKitContent().prefabs,
        ],
        [
          ...leg2,
          ...tillLevels,
          ...yokeLevels,
          ...gorge,
          ...workshop,
          ...kitLevels,
          ...shopLevels,
          ...museumLevels,
          ...roomLevels,
          ...houseLevels,
          ...blockoutLevels,
          ...plotStakeLevels,
          ...sceneryLevels,
          ...greenKerbLevels,
          ...poiLevels,
          ...lookoutLevels,
          ...ringIslandLevels,
          ...mushroomLevels,
          ...secretsLevels,
          ...haltKitContent().levels,
          ...rotundaContent().levels,
          ...canyonKitContent().levels,
        ],
      ),
      'content/built',
      true,
    );
  } finally {
    Object.assign(Math, original);
  }
});
test('moving a catalog platform makes the committed halt artifact stale', () => {
  const outputs = () => {
    const halts = haltKitContent();
    // Use the same compiled level bytes and freshness comparison as build --check.
    return compile(halts.prefabs, halts.levels).get('levels/halt-kit.json')!;
  };
  const committed = new Map(
    [...fs.globSync('**/*.json', { cwd: 'content/built' })].map((file) => [
      file.replaceAll('\\', '/'), // the artifact keys writeArtifacts compares, on Windows too
      fs.readFileSync(`content/built/${file}`, 'utf8'),
    ]),
  );
  const check = () => {
    committed.set('levels/halt-kit.json', outputs());
    writeArtifacts(committed, 'content/built', true);
  };
  check();
  const row = HALTS[1]!,
    old = row.lat;
  try {
    row.lat += 1;
    assert.throws(check, /prefab artifact differs: levels\/halt-kit.json/);
  } finally {
    row.lat = old;
  }
  check();
});
test('authored full-precision values round-trip losslessly; no decimal quantization', () => {
  const n = 0.7312345678901234;
  const outputs = compile([], [{ place: 'exact', placements: [], analysis: { authored: n } }]);
  assert.equal(JSON.parse(outputs.get('levels/exact.json')!).analysis.authored, n);
});
test('authored halt collider expressions reject coercion and invalid geometry', () => {
  const level = haltKitContent().levels[0]!;
  const load = (entry: unknown) =>
    validation.loadLevelArtifact(
      { ...metadata, format: 'boogle-level', ...level, layout: { ...level.layout, entries: [entry] } },
      validation.loadPrefabArtifact(artifact).prefabs,
    );
  const source = (level.layout!.entries as readonly import('../src/prefab/types.ts').JsonObject[]).find(
    (p) => (p.params as import('../src/prefab/types.ts').JsonObject).piece === 'canopy',
  )!;
  for (const bad of [
    null,
    { ...source, colliders: null },
    { ...source, colliders: [{ at: [0, { compute: 'add', a: '1', b: 2 }, 0], half: [1, 1, 1] }] },
    { ...source, colliders: [{ at: [0, { compute: 'unknown' }, 0], half: [1, 1, 1] }] },
    { ...source, colliders: [{ at: [0, 0, 0], half: [1, 0, 1] }] },
  ])
    assert.throws(() => load(bad));
  assert.equal(load(source).placements.length, 5);
});
test('runtime golden permits only tight numeric error and preserves structural contracts', () => {
  prefabGolden(
    { rotation: [0.24463630871500675, 0.007493084921739873] },
    { rotation: [0.24463630871500672, 0.0074930849217398725] },
  );
  for (const [a, b] of [
    [1.000001, 1],
    [1, 2],
    ['copy', 'changed'],
    [
      [1, 2],
      [2, 1],
    ],
    [{ id: 'a' }, { id: 'b' }],
    [{ flag: true }, { flag: false }],
    [[], [0]],
  ])
    assert.throws(() => prefabGolden(a, b));
});
test('authored layouts reject malformed geometry and mixed expanded data before use', () => {
  const records: unknown = artifact;
  validation.validateArtifact(records);
  const definitions = records.prefabs;
  for (const layout of [
    { ...bell.layout, kind: 'typo' },
    { ...bell.layout, data: { ...bell.layout.data, pieces: [{ compute: 'unknown' }] } },
    {
      ...bell.layout,
      data: {
        ...bell.layout.data,
        pieces: [{ id: 'bad', x: 0, z: 0, w: 0, d: 1, h: 1, top: 1, yaw: 0, tone: 'grey' }],
      },
    },
  ])
    assert.throws(() => validation.loadLevelArtifact({ ...bell, layout }, definitions));
  assert.throws(
    () =>
      validation.loadLevelArtifact(
        { ...bell, placements: [{ id: 'x', prefab: 'greybox.box', pos: [0, 0, 0] }] },
        definitions,
      ),
    /coexist/,
  );
  const resolved = validation.loadLevelArtifact(bell, definitions);
  // Bell Rock has nine bed chords and two platform chords per side of each half.
  assert.equal(resolved.placements.length, 81);
  assert.ok(!('layout' in resolved));
  assert.deepEqual(
    { ...metadata, format: 'boogle-level', place: 'empty', placements: [] },
    validation.loadLevelArtifact({ ...metadata, format: 'boogle-level', place: 'empty', placements: [] }, definitions),
  );
});

test('layout arithmetic rejects coercible operands instead of generating different valid geometry', () => {
  const definitions: unknown = artifact;
  validation.validateArtifact(definitions);
  const raw = JSON.parse(JSON.stringify(bell)) as { layout: { data: { pieces: Record<string, unknown>[] } } };
  for (const field of ['bounds', 'frame', 'top', 'posts', 'rise']) {
    const changed = structuredClone(raw),
      p = changed.layout.data.pieces[0]!;
    if (field === 'bounds') p.bounds = ['-60', 60, -3.8, 3.8];
    else if (field === 'frame') p.frame = { o: { x: null, z: -850 }, u: { x: 0, z: 1 }, v: { x: 1, z: 0 } };
    else if (field === 'top') p.top = '3.9';
    else if (field === 'rise') p.rise = '1';
    else p.posts = 'false';
    assert.throws(() => validation.loadLevelArtifact(changed, definitions.prefabs), /prefabs:/, field);
  }
});

test('null layouts reject without recursive revalidation', () => {
  const records: unknown = artifact;
  validation.validateArtifact(records);
  assert.throws(() => validation.loadLevelArtifact({ ...bell, layout: null }, records.prefabs), /layout operand/);
  for (const id of [123, '', null]) {
    const changed = JSON.parse(JSON.stringify(bell));
    changed.layout.data.extras[0].id = id;
    assert.throws(() => validation.loadLevelArtifact(changed, records.prefabs), /nonempty string/);
  }
});

test('seat degree recipes resolve before attachment validation and preserve authored data', () => {
  const source = structuredClone(railway.find((p) => p.key === 'railway.machine-chair')!);
  const bytes = JSON.stringify(source);
  const compiled = validation.loadPrefabArtifact({
    ...metadata,
    format: 'boogle-prefabs',
    prefabs: { [source.key]: source },
  });
  assert.equal(compiled.prefabs[source.key]!.attach!.seat!.kind, 'seat');
  const seat = compiled.prefabs[source.key]!.attach!.seat!;
  assert.ok(seat.kind === 'seat');
  assert.equal(seat.yaw, Math.PI);
  assert.equal(JSON.stringify(source), bytes);
  assert.ok(!('layout' in compiled.prefabs[source.key]!));
  for (const degrees of ['180', null, Infinity]) {
    const bad = JSON.parse(bytes);
    bad.layout.attach.seat.yawDegrees = degrees;
    assert.throws(
      () => validation.loadPrefabArtifact({ ...metadata, format: 'boogle-prefabs', prefabs: { [source.key]: bad } }),
      /prefabs:/,
    );
  }
  const duplicate = JSON.parse(bytes);
  duplicate.layout.attach.seat.yaw = 0;
  assert.throws(() => validation.validatePrefab(duplicate), /authored yawDegrees/);
});

test('room hull operands fail closed before runtime geometry', () => {
  const base = rooms.find((r) => r.key === 'town.room-house-hulls-0')!;
  const load = (r: typeof base) =>
    validation.loadPrefabArtifact({ ...metadata, format: 'boogle-prefabs', prefabs: { [r.key]: r } });
  const patches: JsonObject[] = [
    { w: '7.4' },
    { index: '0' },
    { index: 8 },
    { index: -1 },
    { index: 0.5 },
    { phase: 'unknown' },
    { high: 0.2 },
    { rise: Infinity },
  ];
  for (const patch of patches) assert.throws(() => load({ ...base, layout: { ...base.layout, ...patch } }), /prefabs:/);
  assert.throws(() => load({ ...base, colliders: [{ shape: 'box', at: [0, 0, 0], half: [1, 1, 1] }] }), /recipe-only/);
});

test('shared level operands round-trip without moving or dropping geometry', () => {
  const outputs = compile(greybox, gorge);
  const definitions = validation.loadPrefabArtifact(JSON.parse(outputs.get('prefabs.json')!)).prefabs;
  const actual = validation.loadLevelArtifact(JSON.parse(outputs.get('levels/gorge.json')!), definitions);
  const expected = validation.loadLevelArtifact({ ...metadata, format: 'boogle-level', ...gorge[0] }, definitions);
  assert.deepEqual(actual, expected);
});

test('shared operand references reject unknown, coercible, recursive and ambiguous values', () => {
  const definitions = [{ x: 1, z: 2 }];
  for (const operand of [-1, 1, 0.5, '0', null, true])
    assert.throws(() => expandOperands({ operands: definitions, frame: { operand } }), /shared operand/);
  const invalid: JsonObject[] = [
    { operands: {}, frame: { operand: 0 } },
    { operands: [{ operand: 0 }], frame: { operand: 0 } },
    { operands: definitions, frame: { operand: 0, x: 10 } },
  ];
  for (const layout of invalid) assert.throws(() => expandOperands(layout), /prefabs:/);
});

test('serialized room hulls preserve authored dimensions and reject invalid shell references', () => {
  const raw = { ...metadata, format: 'boogle-prefabs', prefabs: Object.fromEntries(rooms.map((p) => [p.key, p])) };
  const expected = validation.loadPrefabArtifact(raw);
  const artifact = JSON.parse(compile(rooms, []).get('prefabs.json')!);
  assert.deepEqual(validation.loadPrefabArtifact(artifact), expected);
  const hull = artifact.prefabs['town.room-house-hulls-0'];
  for (const source of ['missing.shell', hull.key, 'town.room-plot-board', null]) {
    const bad = structuredClone(artifact);
    bad.prefabs[hull.key].layout.source = source;
    assert.throws(() => validation.loadPrefabArtifact(bad), /dimension source/);
  }
  const ambiguous = structuredClone(artifact);
  ambiguous.prefabs[hull.key].layout.w = 7.4;
  assert.throws(() => validation.loadPrefabArtifact(ambiguous), /dimension source/);
});
