// Owner-requested safety-gate parity: preserve the 167 remaining study assertions against the fixed ESLint baseline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import fixtures from './fixtures/lint-parity.json' with { type: 'json' };
import { LOCKSTEP_FILES } from '../dev/lint/policy.ts';
import { lintSafety } from '../dev/lint/safety.ts';
import type { Diagnostic } from '../dev/lint/safety.ts';
import { lintFiles } from '../dev/lint/runner.ts';
import { compareDebt, debtOf } from '../dev/registry/debt.ts';

const write = (root: string, file: string, code: string) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), code);
};
const temporary = (run: (root: string) => void) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-lint-test-'));
  try {
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
};
const converted = (code: string) =>
  code.replace(/eslint-disable-line (.+)$/, (_, rule: string) =>
    rule.startsWith('@typescript-eslint/')
      ? `oxlint-disable-line ${rule.replace('@typescript-eslint/', 'typescript/')}`
      : `boogle-disable-line ${rule}`,
  );
const normalize = (rule: string) => (rule === 'no-unused-vars' ? '@typescript-eslint/no-unused-vars' : rule);
const has = (diagnostics: Diagnostic[], rule: string) => diagnostics.some((d) => d.rule === rule);

test('fixture assertions retain every ESLint catch and enforce current policy; JS language gate is preserved', () => {
  temporary((root) => {
    const files = new Map<string, string[]>();
    const cases = fixtures.cases.map((c) => {
      const lines = files.get(c.file) ?? [];
      lines.push(converted(c.code));
      files.set(c.file, lines);
      return { ...c, line: lines.length };
    });
    for (const [file, lines] of files) write(root, file, lines.join('\n') + '\n');
    const js = 'src/linter-language-probe.js';
    const mjs = 'dev/linter-language-probe.mjs';
    write(root, js, 'export const x = /a/v;\n');
    write(root, mjs, 'export const x = /a/v;\n');
    const diagnostics = lintFiles(root, [...files.keys(), js, mjs], { typeAware: false });
    const differences = cases.filter((c) => {
      if ('eslint' in c && c.eslint) assert.equal(c.expected, true, `lost baseline catch: ${c.group}`);
      const caught = diagnostics.some(
        (d) =>
          d.file === c.file &&
          d.line === c.line &&
          (c.rule === null ? /unused.*disable|unused.*directive/i.test(d.message) : normalize(d.rule) === c.rule),
      );
      return caught !== c.expected;
    });
    assert.equal(cases.length, 231);
    assert.deepEqual(differences, [], JSON.stringify({ differences, diagnostics }, null, 2));
    assert.ok(diagnostics.some((d) => d.file === js && d.rule === 'boogle/js-language'));
    assert.deepEqual(
      diagnostics.filter((d) => d.file === mjs),
      [],
    );
    // A renamed or moved named lockstep file must not silently drop out of lint.
    for (const named of LOCKSTEP_FILES.filter((f) => !f.includes('*'))) {
      const entry = ['.js', '.ts']
        .map((ext) => named.replace('.{js,ts}', ext))
        .find((f) => fs.existsSync(new URL('../' + f, import.meta.url)));
      assert.ok(entry, `${named} is missing: update dev/lint/policy.ts`);
      assert.ok(diagnostics.some((d) => d.file === entry && d.rule === 'no-restricted-properties'));
    }
  });
});

test('registration imports remain restricted at every fixed sync path', () => {
  for (const name of ['registerState', 'onTick']) {
    for (const ext of ['js', 'ts']) {
      for (const [file, source] of [
        ['src/probe.ts', `./world/sync.${ext}`],
        ['src/physics/backend-probe.ts', `../world/sync.${ext}`],
        ['src/world/probe.ts', `./sync.${ext}`],
      ]) {
        const code = `import { ${name} } from '${source}'; ${name}();`;
        assert.ok(has(lintSafety(code, file!), 'no-restricted-imports'), `${file}: ${code}`);
      }
      const installer = `import { ${name} } from './sync.${ext}'; ${name}();`;
      assert.ok(!has(lintSafety(installer, 'src/world/game-world.ts'), 'no-restricted-imports'), installer);
    }
    assert.deepEqual(lintSafety(`export const install = (sync) => sync.${name}();`, 'src/world/rules/probe.js'), []);
  }
});

test('custom directives suppress only their rule and report stale entries', () => {
  for (const code of [
    'new Date(); // boogle-disable-line no-restricted-syntax',
    '// boogle-disable-next-line no-restricted-syntax -- intentional fixture\nnew Date();',
    '/* boogle-disable no-restricted-syntax */\nnew Date();\n/* boogle-enable no-restricted-syntax */',
    '/* boogle-disable no-restricted-syntax */ new Date(); /* boogle-enable no-restricted-syntax */',
  ])
    assert.deepEqual(lintSafety(code, 'src/sim/probe.ts'), [], code);
  const enabled = lintSafety(
    '/* boogle-disable no-restricted-syntax */\nnew Date();\n/* boogle-enable no-restricted-syntax */\nnew Date();',
    'src/sim/probe.ts',
  );
  assert.equal(enabled.length, 1);
  assert.equal(enabled[0]!.line, 4);
  const late = lintSafety('new Date(); /* boogle-disable no-restricted-syntax */', 'src/sim/probe.ts');
  assert.ok(has(late, 'no-restricted-syntax'), 'a later block directive cannot suppress an earlier violation');
  assert.ok(has(late, 'boogle/unused-disable'));
  const multiline = lintSafety('new Date(); /* boogle-disable-line\n no-restricted-syntax */', 'src/sim/probe.ts');
  assert.ok(has(multiline, 'no-restricted-syntax'));
  assert.ok(has(multiline, 'boogle/invalid-disable'));
  assert.ok(
    has(
      lintSafety('Math.sqrt(1); // boogle-disable-line no-restricted-syntax', 'src/sim/probe.ts'),
      'boogle/unused-disable',
    ),
  );
  assert.ok(
    has(
      lintSafety('new Date(); // boogle-disable-line no-restricted-imports', 'src/sim/probe.ts'),
      'no-restricted-syntax',
    ),
  );
  assert.ok(
    has(
      lintSafety('export const text = "// boogle-disable-line no-restricted-syntax"; new Date();', 'src/sim/probe.ts'),
      'no-restricted-syntax',
    ),
  );
});

test('import restrictions include re-exports, namespace imports and mixed physics type/value imports', () => {
  for (const code of [
    "export { registerState } from './world/sync.ts';",
    "export * from './world/sync.ts';",
    "import * as sync from './world/sync.ts';",
  ])
    assert.ok(has(lintSafety(code, 'src/probe.ts'), 'no-restricted-imports'), code);
  for (const code of [
    "import type { Player } from '../player/player.ts';",
    "import { type Player } from '../player/player.ts';",
    "export type { Player } from '../player/player.ts';",
    "import type Player = require('../player/player.ts');",
  ])
    assert.ok(!has(lintSafety(code, 'src/physics/probe.ts'), '@typescript-eslint/no-restricted-imports'), code);
  const mixed = "import { type Player, player } from '../player/player.ts';";
  assert.ok(has(lintSafety(mixed, 'src/physics/probe.ts'), '@typescript-eslint/no-restricted-imports'));
  assert.ok(
    has(
      lintSafety("import Player = require('../player/player.ts');", 'src/physics/probe.ts'),
      '@typescript-eslint/no-restricted-imports',
    ),
  );
});

test('only src/sim and src/world import the E facade; src/adapters names its types (AR-6)', () => {
  const value = "import { createWorld } from '../ecs/index.ts';";
  const type = "import type { World } from '../ecs/index.ts';";
  const dynamic = "export const e = () => import('../ecs/index.ts');";
  const banned = (code: string, file: string) =>
    lintSafety(code, file).some((d) => /no-restricted-(imports|syntax)/.test(d.rule) && /AR-6/.test(d.message));
  for (const file of [
    'src/sim/probe.ts',
    'src/world/probe.ts',
    'src/world/game-world.ts',
    'src/world/railway-server.ts',
  ])
    for (const code of [value, type]) assert.ok(!banned(code, file), `${file}: ${code}`);
  assert.ok(!banned(type, 'src/adapters/probe.ts'));
  assert.ok(!banned("import { type World } from '../ecs/index.ts';", 'src/adapters/probe.ts'));
  for (const code of [value, "export * from '../ecs/index.ts';", "import '../ecs';", dynamic])
    assert.ok(banned(code, 'src/adapters/probe.ts'), `src/adapters: ${code}`);
  for (const file of [
    'src/probe.ts',
    'src/entities/probe/view.ts',
    'src/entities/probe/state.ts',
    'src/features/probe.ts',
    'src/net/probe.ts',
    'src/netplay/probe.ts',
    'src/place/probe.ts',
    'src/debug/probe.ts',
    'src/physics/backend-probe.ts',
    'src/main.ts',
  ])
    for (const code of [value, type, dynamic]) assert.ok(banned(code, file), `${file}: ${code}`);
});

test('src/place and the railway machine model read input through actions (AR-4)', () => {
  const raw = "addEventListener('keydown', () => {});";
  for (const file of ['src/place/probe.ts', 'src/place/look-kit.ts', 'src/entities/railway/machine-model.ts'])
    assert.ok(has(lintSafety(raw, file), 'boogle/input-through-actions'), file);
  assert.ok(!has(lintSafety(raw, 'src/place/talk.ts'), 'boogle/input-through-actions'));
});

test('the JS language guard replaces duplicate-parameter and legacy-octal parser protections', () => {
  for (const code of ['export function f(a, a) {}', 'export const n = 010;', 'export const s = "\\1";'])
    assert.ok(has(lintSafety(code, 'dev/probe.js'), 'boogle/js-language'), code);
  assert.ok(has(lintSafety('function f(a, a) {}', 'dev/probe.cjs'), 'no-dupe-args'));
  assert.ok(has(lintSafety('const n = 010;', 'dev/probe.cjs'), 'no-octal'));
});

test('entity count budgets fail overflow and stale entries, prune downward, and relax only stale counts', () => {
  temporary((root) => {
    const file = 'src/pois/lighthouse/index.ts';
    const budget = 'lint-suppressions.json';
    const rule = 'boogle/use-an-entity';
    const setCount = (count: number) => write(root, budget, JSON.stringify({ [file]: { [rule]: { count } } }));
    const run = (options = {}) => lintFiles(root, ['.'], { typeAware: false, ...options });
    write(root, file, 'onFrame(() => {});\nonFrame(() => {});\n');
    setCount(2);
    assert.deepEqual(run(), []);
    setCount(1);
    assert.equal(run().filter((d) => d.rule === rule).length, 2, 'overflow reports all offenders');
    assert.equal(run({ relaxed: true }).filter((d) => d.rule === rule).length, 2, 'per-edit mode never permits growth');
    setCount(3);
    assert.ok(has(run(), 'boogle/stale-budget'));
    assert.deepEqual(run({ relaxed: true }), []);
    assert.deepEqual(run({ prune: true }), []);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, budget), 'utf8'))[file][rule].count, 2);
    fs.unlinkSync(path.join(root, file));
    assert.ok(has(run(), 'boogle/stale-budget'), 'deleted files cannot retain budget');
    assert.deepEqual(run({ prune: true }), []);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, budget), 'utf8')), {});
  });
});

test('missing single-file targets and unmatched globs fail instead of reporting a clean lint', () => {
  temporary((root) => {
    assert.throws(() => lintFiles(root, ['src/typo.ts'], { typeAware: false }));
    assert.throws(() => lintFiles(root, ['src/missing/**/*.ts'], { typeAware: false }));
    assert.deepEqual(lintFiles(root, ['server/ignored.ts'], { typeAware: false }), []);
  });
});

test('root-only exclusions never hide nested source directories; dependency exclusions apply at every depth', () => {
  temporary((root) => {
    for (const file of [
      'src/server/probe.ts',
      'src/sim/dist/probe.ts',
      'server/probe.ts',
      'src/demo/node_modules/probe.ts',
    ])
      write(root, file, 'new WebSocket("x");\n');
    const diagnostics = lintFiles(root, ['.'], { typeAware: false });
    assert.deepEqual(
      diagnostics
        .filter((d) => d.rule === 'no-restricted-syntax')
        .map((d) => d.file)
        .sort(),
      ['src/server/probe.ts', 'src/sim/dist/probe.ts'],
    );
    assert.deepEqual(lintFiles(root, ['src/demo/node_modules/probe.ts'], { typeAware: false }), []);
  });
});

test('the suppression budget permits reductions and rejects growth', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-lint-debt-'));
  try {
    const budget = (count: number) => JSON.stringify({ 'src/pois/probe.ts': { 'boogle/use-an-entity': { count } } });
    write(root, 'lint-suppressions.json', budget(2));
    write(root, 'dev/registry/knots.ts', 'export const KNOTS = [];\n');
    write(root, 'dev/level/allow.ts', 'export const ALLOW = [];\n');
    const before = await debtOf(root);
    write(root, 'lint-suppressions.json', budget(3));
    assert.match(compareDebt(before, await debtOf(root)).join('\n'), /lint-suppressions\.json grew: 2 → 3/);
    write(root, 'lint-suppressions.json', budget(1));
    assert.deepEqual(compareDebt(before, await debtOf(root)), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
