// Fourth-review reproductions: namespace identity, the documented OwnedView path, and shallow CI trees.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import debt from '../dev/lint/prefab-debt.json' with { type: 'json' };
import { computeLegacyGraph } from '../dev/lint/prefab-constructors.ts';
import { createModuleResolver } from '../dev/lint/prefab-boundaries.ts';
import { lintSafety } from '../dev/lint/safety.ts';
import { checkPrefabDebt, comparePrefabDebt, PREFAB_DEBT_FILE } from '../dev/registry/prefab-debt.ts';

test('review 4: the complete documented OwnedView feature is a free door', () => {
  const code = fs.readFileSync(new URL('./fixtures/prefab-owned-feature.txt', import.meta.url), 'utf8');
  const before = fs.readFileSync(PREFAB_DEBT_FILE, 'utf8');
  assert.deepEqual(lintSafety(code, 'src/features/review-legitimate-a.ts'), []);
  assert.equal(fs.readFileSync(PREFAB_DEBT_FILE, 'utf8'), before);
});

test('a new HUD-only feature uses engine lifecycle, entity and player state without construction debt', () => {
  const code = fs.readFileSync(new URL('./fixtures/prefab-hud-feature.txt', import.meta.url), 'utf8');
  const before = fs.readFileSync(PREFAB_DEBT_FILE, 'utf8');
  assert.deepEqual(lintSafety(code, 'src/features/review-hud.ts'), []);
  assert.ok(!stripTypeScriptTypes(code).includes('../physics/engine.ts'));
  assert.equal(fs.readFileSync(PREFAB_DEBT_FILE, 'utf8'), before);
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
  test(`review 4: ${name} namespace forwarding preserves constructor identity`, () => {
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

test('review 4: an already-importing barrel cannot add a construction forwarding surface', () => {
  const base = { colliders: {}, seats: {}, forwards: { 'src/barrel.ts#makeCar': ['src/car.ts#makeCar'] } };
  const head = { ...base, forwards: { ...base.forwards, 'src/barrel.ts#vehicles': ['src/car.ts#makeCar'] } };
  assert.match(comparePrefabDebt(base, head).join('\n'), /forwarding surface grew/);
});

test('review 4: registry works in a depth-1 clone with no merge base', () => {
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
