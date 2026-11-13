// Owner-requested step 5 enforcement fixtures, including the file-identity ratchet.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import fixtures from './fixtures/prefab-lint.json' with { type: 'json' };
import structural from './fixtures/prefab-structural.json' with { type: 'json' };
import moduleFixtures from './fixtures/prefab-modules.json' with { type: 'json' };
import legacyFixtures from './fixtures/prefab-legacy.json' with { type: 'json' };
import { createModuleResolver } from '../dev/lint/prefab-boundaries.ts';
import debt from '../dev/lint/prefab-debt.json' with { type: 'json' };
import { lintSafety } from '../dev/lint/safety.ts';
import type { PrefabDebt } from '../dev/lint/safety.ts';
import { comparePrefabDebt, checkPrefabDebt, PREFAB_DEBT_FILE } from '../dev/registry/prefab-debt.ts';

for (const fixture of legacyFixtures)
  test(fixture.name, () =>
    assert.ok(
      lintSafety(fixture.code, 'src/entities/review/probe.ts').some((d) => d.rule === fixture.rule),
      'Expected prefab boundary rejection; received none',
    ),
  );

for (const fixture of structural)
  test(fixture.name, () =>
    assert.equal(
      lintSafety(fixture.code, fixture.file).some((d) => d.rule === fixture.rule),
      fixture.fail,
    ),
  );

test('resolved capability identity survives case-insensitive filesystems', () => {
  assert.ok(
    lintSafety(
      "import * as api from './physics/ENGINE'; const make=api['create'+'Body']; make({});",
      'src/probe.ts',
    ).some((d) => d.rule === 'boogle/colliders-from-records'),
  );
});

test('opaque import.meta loaders cannot bypass the resolved import boundary', () => {
  for (const code of [
    "const modules=import.meta.glob('./physics/*.ts',{eager:true});",
    'const meta=import.meta; const load=meta.glob; load(path);',
    "const load=import.meta['g'+'lob']; load(path);",
  ])
    assert.ok(
      lintSafety(code, 'src/probe.ts').some((d) => d.rule === 'boogle/colliders-from-records'),
      code,
    );
});

test('structural module and public-surface fixture table uses actual files and tsconfig resolution', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-module-fixtures-'));
  const write = (file: string, code: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), code);
  };
  try {
    write(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@body': ['src/physics/engine.ts'], '@physics/*': ['src/physics/*'] },
        },
      }),
    );
    write(
      'src/physics/engine.ts',
      'export type Body = object; export const createBody=(o:unknown)=>o; export const teleport=()=>{};',
    );
    write('src/entities/railway/seat.ts', 'export const registerSeat=(o:unknown)=>o;');
    write('src/entities/railway/works-box-view.ts', 'export const drawWorksBoxes=()=>{};');
    fs.symlinkSync('physics/engine.ts', path.join(root, 'src/body-link.ts'));
    fs.linkSync(path.join(root, 'src/physics/engine.ts'), path.join(root, 'src/body-hard.ts'));
    for (const fixture of moduleFixtures) {
      write('src/prefab/instantiate.ts', 'export const instantiate=()=>({});');
      for (const [file, code] of Object.entries(fixture.files ?? {})) if (code !== undefined) write(file, code);
      write(fixture.file, fixture.code);
      const budgets: PrefabDebt = {
        colliders: { 'src/legacy.ts': { count: 2, exports: ['existing'], reason: '2026-11-13: Fixture baseline.' } },
        seats: {},
        doors: { 'src/prefab/instantiate.ts': ['instantiate'] },
      };
      const resolve = createModuleResolver(root);
      if (fixture.files)
        assert.ok(
          resolve(
            'src/consumer.ts',
            fixture.name.includes('physics directory') ? './physics/bridge' : './barrel',
          )?.endsWith('/index.ts'),
        );
      const found = lintSafety(fixture.code, fixture.file, budgets, resolve).filter((d) => d.rule === fixture.rule);
      assert.equal(found.length > 0, fixture.fail, fixture.name + '\n' + JSON.stringify(found));
      if (fixture.name.startsWith('type:'))
        assert.equal(
          stripTypeScriptTypes(fixture.code).includes('./physics/engine'),
          fixture.fail,
          fixture.name + ' must match Node type erasure',
        );
    }
    assert.ok(
      lintSafety(
        "import * as api from './body-link'; const make=api['create'+'Body']; make({});",
        'src/probe.ts',
        { colliders: {}, seats: {} },
        createModuleResolver(root),
      ).some((d) => d.rule === 'boogle/colliders-from-records'),
    );
    assert.ok(
      lintSafety(
        "import * as api from './body-hard'; const make=api['create'+'Body']; make({});",
        'src/probe.ts',
        { colliders: {}, seats: {} },
        createModuleResolver(root),
      ).some((d) => d.rule === 'boogle/colliders-from-records'),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('review P1: capability imports cannot be hidden behind aliases or re-exports', () => {
  for (const [rule, module, name] of [
    ['boogle/colliders-from-records', './physics/engine.ts', 'createBody'],
    ['boogle/seats-from-records', './entities/railway/seat.ts', 'registerSeat'],
  ])
    for (const code of [
      `import { ${name} } from '${module}'; const make = ${name}; make({});`,
      `export { ${name} as make } from '${module}';`,
      `const { ${name}: make } = await import('${module}'); make({});`,
      `import * as api from '${module}'; const make = api['${name}']; make({});`,
      `const { ${name}: make } = require('${module}'); make({});`,
      `export * from '${module}';`,
      `const api = await import(\`${module}\`); const make = api.${name}; make({});`,
      `import api = require('${module}'); const make = api.${name}; make({});`,
    ])
      assert.ok(
        lintSafety(code, 'src/probe.ts').some((d) => d.rule === rule),
        code,
      );
});

test('review P2: legacy solid helpers and new prefab-folder wrappers are not alternative doors', () => {
  for (const [file, code, rule] of [
    [
      'src/entities/railway/probe.ts',
      "const { registerSeat: sit } = await import('./seat.ts'); sit({});",
      'boogle/seats-from-records',
    ],
    [
      'src/entities/railway/probe.ts',
      "const kit = require('./works-box-view.ts'); const draw = kit.drawWorksBoxes; draw(owner, boxes);",
      'boogle/colliders-from-records',
    ],
    [
      'src/place/probe.ts',
      "import * as land from './land.ts'; const make = land.staticBody; make(shape, pos);",
      'boogle/colliders-from-records',
    ],
  ] as const)
    assert.ok(
      lintSafety(code, file).some((d) => d.rule === rule),
      code,
    );
  for (const code of [
    "import { drawWorksBoxes as draw } from './entities/railway/works-box-view.ts'; draw(owner, [{ solid: true }]);",
    "export { drawGreyBoxes as draw } from './entities/route-greybox/boxes.ts';",
  ])
    assert.ok(
      lintSafety(code, 'src/probe.ts').some((d) => d.rule === 'boogle/colliders-from-records'),
      code,
    );
  assert.ok(
    lintSafety(
      "import { createBody } from '../physics/engine.ts'; export const make = createBody;",
      'src/prefab/wrapper.ts',
    ).some((d) => d.rule === 'boogle/colliders-from-records'),
  );
});

test('review P2: a debt file cannot append calls or retain an inflated count', () => {
  const budget: PrefabDebt = {
    colliders: { 'src/probe.ts': { count: 1, reason: '2026-11-13: Existing call.' } },
    seats: {},
  };
  assert.ok(
    lintSafety('createBody({}); createBody({}); createBody({});', 'src/probe.ts', budget).some(
      (d) => d.rule === 'boogle/colliders-from-records',
    ),
  );
  assert.ok(
    lintSafety('instantiate(key, pose, options);', 'src/probe.ts', budget).some((d) =>
      /lower the count/.test(d.message),
    ),
  );
  const grown = structuredClone(budget);
  grown.colliders['src/probe.ts']!.count = 3;
  assert.match(comparePrefabDebt(budget, grown).join('\n'), /count grew/);
  assert.deepEqual(comparePrefabDebt(grown, budget), []);
});

test('review P2: content local origin and shadowed browser names are bindings, not globals', () => {
  for (const code of [
    'const origin = [0, 0, 0]; export const pos = origin;',
    'export function point(document: number) { return document; }',
    'const globalThis = {document: 1}; export const x = globalThis.document;',
    '{ const document = 1; document; } const origin = [0, 0, 0]; export const pos = origin;',
  ])
    assert.ok(!lintSafety(code, 'src/content/levels/probe.ts').some((d) => d.rule === 'boogle/records-are-data'), code);
  assert.ok(
    lintSafety(
      'function f(origin: number) { return origin; } export const x = document;',
      'src/content/levels/probe.ts',
    ).some((d) => d.rule === 'boogle/records-are-data'),
  );
  assert.ok(
    lintSafety('{ const document = 1; document; } document;', 'src/content/levels/probe.ts').some(
      (d) => d.rule === 'boogle/records-are-data',
    ),
  );
});

test('review P3: inline type imports obey the content import boundary', () => {
  assert.ok(
    lintSafety("export type Visual = import('three').Mesh;", 'src/content/prefabs/probe.ts').some(
      (d) => d.rule === 'boogle/records-are-data',
    ),
  );
  assert.ok(
    !lintSafety("export type Prefab = import('../../prefab/types.ts').PrefabDef;", 'src/content/prefabs/probe.ts').some(
      (d) => d.rule === 'boogle/records-are-data',
    ),
  );
});

test('each prefab door has passing and failing fixtures with an actionable message', () => {
  for (const fixture of fixtures) {
    const found = lintSafety(fixture.code, fixture.file).filter((d) => d.rule === fixture.rule);
    assert.equal(found.length > 0, fixture.fail, JSON.stringify(fixture));
    for (const d of found) assert.match(d.message, /src\/prefab\/instantiate\.ts/);
  }
  for (const rule of new Set(fixtures.map((f) => f.rule)))
    assert.deepEqual(new Set(fixtures.filter((f) => f.rule === rule).map((f) => f.fail)), new Set([true, false]));
});

test('every initial file exemption has a dated reason; no list growth or equal-size substitution', () => {
  assert.deepEqual(comparePrefabDebt(debt, debt), []);
  const entry = (reason: string) => ({ count: 1, reason });
  const base = { colliders: { 'src/old.ts': entry('2026-11-13: Existing debt.') }, seats: {} };
  assert.deepEqual(comparePrefabDebt(base, { colliders: {}, seats: {} }), []);
  const added = { colliders: { 'src/new.ts': entry('') }, seats: {} };
  assert.match(comparePrefabDebt(base, added).join('\n'), /dated reason line/);
  added.colliders['src/new.ts'] = entry('2026-11-13: An agent wants a second door.');
  assert.match(comparePrefabDebt(base, added).join('\n'), /grew/);
  assert.match(
    comparePrefabDebt(base, { colliders: {}, seats: { 'src/new.ts': entry('2026-11-13: Reason.') } }).join('\n'),
    /seats grew/,
  );
  assert.deepEqual(
    lintSafety('addStatic(shape, pos);', 'src/old.ts', base).filter((d) => d.rule === 'boogle/colliders-from-records'),
    [],
  );
});

test('registry bootstraps only existing base calls, then rejects list growth and stale entries', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-debt-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const current = {
    version: 4,
    legacy: {},
    colliders: { 'src/old.ts': { count: 1, exports: [], reason: '2026-11-13: Approved existing call.' } },
    seats: {},
  };
  const save = () => write(PREFAB_DEBT_FILE, JSON.stringify(current));
  try {
    git('init', '-q');
    write('src/old.ts', 'addStatic(shape, pos);');
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Baseline');
    save();
    assert.deepEqual(checkPrefabDebt(root, 'HEAD'), []);
    write('src/new.ts', 'addStatic(shape, pos);');
    const grown = { ...current.colliders, 'src/new.ts': { count: 1, exports: [], reason: '2026-11-13: Added later.' } };
    write(PREFAB_DEBT_FILE, JSON.stringify({ ...current, colliders: grown }));
    assert.match(checkPrefabDebt(root, 'HEAD').join('\n'), /colliders grew: src\/new.ts/);
    save();
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Seed list');
    write(PREFAB_DEBT_FILE, JSON.stringify({ ...current, colliders: grown }));
    assert.match(checkPrefabDebt(root, 'HEAD').join('\n'), /colliders grew: src\/new.ts/);
    save();
    write('src/old.ts', 'addStatic(shape, pos); addStatic(shape, pos); addStatic(shape, pos);');
    assert.match(checkPrefabDebt(root, 'HEAD').join('\n'), /has 3 violations, budget 1/);
    write(
      PREFAB_DEBT_FILE,
      JSON.stringify({ colliders: { 'src/old.ts': { ...current.colliders['src/old.ts'], count: 3 } }, seats: {} }),
    );
    assert.match(checkPrefabDebt(root, 'HEAD').join('\n'), /count grew/);
    save();
    write('src/old.ts', 'addStatic(shape, pos); export const make=()=>1;');
    assert.match(checkPrefabDebt(root, 'HEAD').join('\n'), /unapproved public export make/);
    write(
      PREFAB_DEBT_FILE,
      JSON.stringify({
        ...current,
        colliders: { 'src/old.ts': { ...current.colliders['src/old.ts'], exports: ['make'] } },
      }),
    );
    assert.match(checkPrefabDebt(root, 'HEAD').join('\n'), /public exports grew/);
    save();
    write('src/old.ts', 'instantiate(key, pose, options);');
    assert.match(checkPrefabDebt(root, 'HEAD').join('\n'), /stale colliders\/src\/old.ts/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
