// Owner-requested step 5 enforcement fixtures, including the file-identity ratchet.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { computeLegacyGraph } from '../dev/lint/prefab-constructors.ts';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import fixtures from './fixtures/prefab-lint.json' with { type: 'json' };
import dynamicFixtures from './fixtures/prefab-dynamic-review.json' with { type: 'json' };
import structural from './fixtures/prefab-structural.json' with { type: 'json' };
import moduleFixtures from './fixtures/prefab-modules.json' with { type: 'json' };
import legacyFixtures from './fixtures/prefab-legacy.json' with { type: 'json' };
import { createModuleResolver } from '../dev/lint/prefab-boundaries.ts';
import debt from '../dev/lint/prefab-debt.json' with { type: 'json' };
import { lintSafety } from '../dev/lint/safety.ts';
import type { PrefabDebt } from '../dev/lint/safety.ts';
import { comparePrefabDebt, checkPrefabDebt, PREFAB_DEBT_FILE } from '../dev/registry/prefab-debt.ts';
import { checkPrefabRegistrations } from '../dev/registry/prefab-registrations.ts';

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

test('after the lift helper ships and a different binding retires, the smaller door count binds', () => {
  const file = 'src/prefab/instantiate.ts';
  const base: PrefabDebt = {
    colliders: {},
    seats: {},
    doors: { [file]: ['instantiate', 'liftOrWait'] },
    doorCounts: { [file]: { colliders: 2 } },
  };
  const grown = structuredClone(base);
  grown.doorCounts![file]!.colliders = 3;
  assert.match(comparePrefabDebt(base, grown).join('\n'), /capability bindings grew/);
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

test('registry bootstraps internal consistency, then rejects growth against a current-schema base', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-debt-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const current = {
    version: 7,
    doorCounts: {},
    forwards: {},
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
    assert.deepEqual(checkPrefabDebt(root, 'HEAD'), []);
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

// Owner-requested step 9: raw sign/interaction registrations now use the same record door.
for (const [api, module, rule] of [
  ['signBoard', './render/sign-board.ts', 'boogle/signs-from-records'],
  ['registerInteractable', './player/hands.ts', 'boogle/interactions-from-records'],
] as const) {
  for (const code of [
    `${api}();`,
    `import { ${api} as create } from '${module}'; create();`,
    `import * as api from '${module}'; api['${api}']();`,
    `export { ${api} as wrapper } from '${module}';`,
    `// boogle-disable-next-line ${rule} -- not another door\n${api}();`,
  ])
    test(`step 9 rejects ${api}: ${code.split('\n').at(-1)}`, () => {
      assert.ok(lintSafety(code, 'src/step9-probe.ts').some((d) => d.rule === rule));
    });
}

test('step 9 registry rejects registration budget growth and file substitution', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-registration-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  const budget = { count: 1, reason: '2026-11-13: Existing owner-approved registration.', exports: [], consumers: [] };
  const file = path.join(root, 'dev/lint/prefab-registrations.json');
  const write = (source: string, count: number) =>
    fs.writeFileSync(file, JSON.stringify({ signs: { [source]: { ...budget, count } }, interactions: {} }));
  try {
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(path.join(root, 'src/old.ts'), 'signBoard();');
    write('src/old.ts', 1);
    git('init', '-q');
    git('add', '.');
    git('-c', 'user.name=Prefab test', '-c', 'user.email=prefab@test.local', 'commit', '-qm', 'Baseline');
    assert.deepEqual(checkPrefabRegistrations(root, 'HEAD'), []);
    fs.writeFileSync(path.join(root, 'src/old.ts'), 'signBoard(); signBoard();');
    write('src/old.ts', 2);
    assert.ok(checkPrefabRegistrations(root, 'HEAD').some((e) => e.includes('debt grew')));
    fs.writeFileSync(path.join(root, 'src/new.ts'), 'signBoard();');
    write('src/new.ts', 1);
    assert.ok(checkPrefabRegistrations(root, 'HEAD').some((e) => e.includes('debt grew')));
    fs.writeFileSync(path.join(root, 'src/old.ts'), 'signBoard();');
    fs.writeFileSync(path.join(root, 'src/consumer.ts'), "import './old.ts';");
    fs.writeFileSync(
      file,
      JSON.stringify({ signs: { 'src/old.ts': { ...budget, consumers: ['src/consumer.ts'] } }, interactions: {} }),
    );
    assert.ok(checkPrefabRegistrations(root, 'HEAD').some((e) => e.includes('consumer grew')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('step 9 rejects new consumers of a legacy sign factory and the sign builder', () => {
  for (const source of ['./entities/railway/stock-sign.ts', './prefab/builders/greybox-label.ts'])
    assert.ok(
      lintSafety(`import * as api from '${source}';`, 'src/step9-probe.ts').some(
        (d) => d.rule === 'boogle/signs-from-records',
      ),
    );
});

for (const fixture of dynamicFixtures)
  test(`dynamic factory acquisition is rejected in ${fixture.file}`, () => {
    assert.ok(
      lintSafety(fixture.code, fixture.file).some((d) => d.rule === 'boogle/colliders-from-records'),
      'Expected prefab door rejection',
    );
  });

test('the complete documented OwnedView feature is a free door', () => {
  const code = fs.readFileSync(new URL('./fixtures/prefab-owned-feature.txt', import.meta.url), 'utf8');
  assert.deepEqual(lintSafety(code, 'src/features/review-legitimate-a.ts'), []);
});

test('a new HUD-only feature uses engine lifecycle, entity and player state without construction debt', () => {
  const code = fs.readFileSync(new URL('./fixtures/prefab-hud-feature.txt', import.meta.url), 'utf8');
  assert.deepEqual(lintSafety(code, 'src/features/review-hud.ts'), []);
  assert.ok(!stripTypeScriptTypes(code).includes('../physics/engine.ts'));
});

test('proven non-creating helpers stay available to new ordinary features', () => {
  const code =
    "import {poseCarOnLine} from '../entities/railway/car.ts'; import {kitBatch}from '../place/look-kit.ts'; import {addResident}from '../place/folk.ts'; export const helpers={poseCarOnLine,kitBatch,addResident};";
  assert.deepEqual(lintSafety(code, 'src/features/review-pure-helpers.ts'), []);
});

test('HUD fixtures do not weaken the raw physics/seat module import ban', () => {
  for (const code of [
    "import{physicsTime}from '../physics/engine.ts'; export const now=physicsTime;",
    "import{sitDown}from '../entities/railway/seat.ts';export const sit=sitDown;",
  ])
    assert.ok(
      lintSafety(code, 'src/features/review-raw-engine.ts').some(
        (d) => d.rule === 'boogle/colliders-from-records' || d.rule === 'boogle/seats-from-records',
      ),
    );
});

for (const [name, barrel] of Object.entries({
  direct: "export * as vehicles from './car.ts';",
  local: "import * as vehicles from './car.ts'; export {vehicles};",
  nested: "export * as fleet from './namespace.ts';",
}))
  test(`${name} namespace forwarding preserves constructor identity`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-ns-'));
    const sources = {
      'src/physics/engine.ts': 'export const createBody=()=>({});',
      'src/car.ts': "import {createBody}from './physics/engine.ts'; export const makeCar=()=>createBody();",
      'src/namespace.ts': "export * as vehicles from './car.ts';",
      'src/barrel.ts': barrel,
      'src/consumer.ts':
        name === 'nested'
          ? "import{fleet}from './barrel.ts';fleet.vehicles.makeCar();"
          : "import{vehicles}from './barrel.ts';vehicles.makeCar();",
    };
    try {
      for (const [file, code] of Object.entries(sources)) {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), code);
      }
      const graph = computeLegacyGraph(
        sources,
        { colliders: { 'src/car.ts': { count: 1, exports: ['makeCar'], reason: '2026-11-13: Fixture.' } }, seats: {} },
        createModuleResolver(root),
      );
      assert.ok(graph.constructors['src/car.ts#makeCar']!.importers.includes('src/consumer.ts'));
      assert.deepEqual(graph.surfaces[`src/barrel.ts#${name === 'nested' ? 'fleet' : 'vehicles'}`], [
        'src/car.ts#makeCar',
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

test('an already-importing barrel cannot add a construction forwarding surface', () => {
  const base = { colliders: {}, seats: {}, forwards: { 'src/barrel.ts#makeCar': ['src/car.ts#makeCar'] } };
  const head = { ...base, forwards: { ...base.forwards, 'src/barrel.ts#vehicles': ['src/car.ts#makeCar'] } };
  assert.match(comparePrefabDebt(base, head).join('\n'), /forwarding surface grew/);
});

test('registry works in a depth-1 clone with no merge base', () => {
  const area = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-shallow-'));
  const source = path.join(area, 'source'),
    clone = path.join(area, 'clone');
  fs.mkdirSync(source);
  const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, stdio: 'pipe' });
  const write = (root: string, file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const commit = (cwd: string) => {
    git(cwd, 'add', '.');
    git(cwd, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Fixture');
  };
  const head = {
    version: debt.version,
    doorCounts: {},
    colliders: { 'src/old.ts': { count: 1, exports: [], reason: '2026-11-13: Fixture.' } },
    seats: {},
    legacy: {},
    forwards: {},
  };
  try {
    git(source, 'init', '-q', '-b', 'main');
    write(source, 'README', 'root');
    commit(source);
    write(source, 'README', 'main');
    commit(source);
    git(source, 'switch', '-qc', 'feature', 'HEAD~1');
    write(source, 'src/old.ts', 'addStatic(shape,pos);');
    write(source, PREFAB_DEBT_FILE, JSON.stringify(head));
    commit(source);
    git(area, 'clone', '-q', '--depth', '1', '--branch', 'feature', pathToFileURL(source).href, clone);
    git(clone, 'fetch', '-q', '--depth', '1', 'origin', 'main:refs/remotes/origin/main');
    assert.equal(git(clone, 'rev-parse', '--is-shallow-repository').toString().trim(), 'true');
    assert.throws(() => git(clone, 'merge-base', 'HEAD', 'origin/main'));
    assert.deepEqual(checkPrefabDebt(clone, 'origin/main'), []);
    write(clone, 'src/old.ts', 'addStatic(shape,pos);addStatic(shape,pos);');
    assert.match(checkPrefabDebt(clone, 'origin/main').join('\n'), /has 2 violations/);
    write(clone, 'src/old.ts', 'addStatic(shape,pos);');
    git(source, 'switch', '-q', 'main');
    for (const version of [4, 5, 6, debt.version]) {
      write(source, PREFAB_DEBT_FILE, JSON.stringify({ ...head, version }));
      commit(source);
      git(clone, 'fetch', '-q', '--depth', '1', 'origin', 'main');
      git(clone, 'update-ref', 'refs/remotes/origin/main', 'FETCH_HEAD');
      assert.throws(() => git(clone, 'merge-base', 'HEAD', 'origin/main'));
      assert.deepEqual(checkPrefabDebt(clone, 'origin/main'), []);
    }
    write(clone, 'src/new.ts', 'addStatic(shape,pos);');
    write(
      clone,
      PREFAB_DEBT_FILE,
      JSON.stringify({
        ...head,
        colliders: {
          ...head.colliders,
          'src/new.ts': { count: 1, exports: [], reason: '2026-11-13: Fixture growth.' },
        },
      }),
    );
    assert.match(checkPrefabDebt(clone, 'origin/main').join('\n'), /colliders grew: src\/new.ts/);
  } finally {
    fs.rmSync(area, { recursive: true, force: true });
  }
});

test('re-check: the lift helper binding cannot be granted twice by dropping and re-adding liftOrWait', () => {
  const file = 'src/prefab/instantiate.ts';
  // Shipped: liftOrWait and 3 bindings. A later change drops the export but keeps a third binding in use.
  const shipped: PrefabDebt = {
    colliders: {},
    seats: {},
    doors: { [file]: ['instantiate', 'liftOrWait'] },
    doorCounts: { [file]: { colliders: 3 } },
  };
  const dropped = structuredClone(shipped);
  dropped.doors![file] = ['instantiate'];
  assert.deepEqual(comparePrefabDebt(shipped, dropped), []);
  // The next re-adds it with a fourth binding: the one-time grant fires again.
  const readded = structuredClone(shipped);
  readded.doorCounts![file]!.colliders = 4;
  assert.match(comparePrefabDebt(dropped, readded).join('\n'), /capability bindings grew/);
});
