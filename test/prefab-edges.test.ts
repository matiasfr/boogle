// Compact call-based construction counts: no persisted consumer identities or global callback closure.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import debt from '../dev/lint/prefab-debt.json' with { type: 'json' };
import {
  computeLegacyGraph,
  loadLegacyGraph,
  constructionCounts,
  constructionForwards,
  checkConstructionForwards,
  checkLegacyRecords,
  compareLegacyRecords,
} from '../dev/lint/prefab-constructors.ts';
import { createModuleResolver } from '../dev/lint/prefab-boundaries.ts';
import { lintSafety } from '../dev/lint/safety.ts';

test('computed targeted constructor counts equal the committed baseline', { timeout: 30_000 }, () => {
  const graph = loadLegacyGraph(process.cwd(), debt);
  assert.deepEqual(checkLegacyRecords(graph.constructors, debt.legacy), []);
  assert.deepEqual(constructionCounts(graph), debt.legacy);
  assert.deepEqual(checkConstructionForwards(graph, debt.forwards), []);
  assert.deepEqual(constructionForwards(graph), debt.forwards);
});

test('ordinary feature registration and the prefab door remain open', () => {
  const code =
    "import {defineKind,spawn} from '../entity/entity.ts'; import {onEntered} from '../entities/player/state.ts'; import {ballInReach} from '../entities/ball/state.ts'; import {aboard} from '../physics/platforms.ts'; import {instantiate} from '../prefab/instantiate.ts'; export const init=()=>{defineKind('fixture',{}); onEntered(()=>ballInReach()); aboard(); const value=instantiate({}); return spawn(value);};";
  assert.deepEqual(lintSafety(code, 'src/features/review-fixture.ts'), []);
});

test('direct debt calls form a fixed point; barrels count, registries and door wrappers do not', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-count-fixtures-'));
  const sources: Record<string, string> = {
    'src/physics/engine.ts': 'export const createBody=()=>({});',
    'src/entities/railway/seat.ts': 'export const registerSeat=()=>()=>{};',
    'src/car.ts':
      "import {createBody as body} from './physics/engine'; const alias=body; export function makeCar(){return alias();} export const label=1;",
    'src/machine.ts':
      "import {makeCar}from './car'; import {registerSeat}from './entities/railway/seat'; export const buildMachine=()=>{makeCar(); registerSeat();};",
    'src/callback.ts': 'export function invoke(fn:()=>unknown){return fn();}',
    'src/barrel.ts': "export {makeCar as make} from './car';",
    'dev/forward/index.ts': "export * from '../../src/barrel';",
    'src/consumer.ts': "import * as api from '../dev/forward'; export const run=()=>api['make']();",
    'src/types.ts': "import type {makeCar}from './car'; export type T=typeof makeCar;",
    'src/prefab/instantiate.ts':
      "import {createBody}from '../physics/engine'; export const instantiate=()=>createBody();",
    'src/authored.ts': "import {instantiate}from './prefab/instantiate'; export const record=()=>instantiate();",
    'src/entity/entity.ts': "import {makeCar}from '../car'; export function register(){makeCar();}",
    'src/finished.ts': "import {makeCar}from './car'; export const finished=makeCar();",
    'src/finished-consumer.ts': "import {finished}from './finished'; console.log(finished);",
    'src/new-feature.ts':
      "import {register}from './entity/entity'; import {record}from './authored'; register();record();",
  };
  const entry = { count: 1, exports: [], reason: '2026-11-13: Fixture baseline.' };
  const budgets = {
    colliders: {
      'src/car.ts': entry,
      'src/machine.ts': entry,
      'src/callback.ts': entry,
      'src/authored.ts': entry,
      'src/entity/entity.ts': entry,
    },
    seats: {},
  };
  const write = (file: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), sources[file]!);
  };
  const graph = () => computeLegacyGraph(sources, budgets, createModuleResolver(root));
  try {
    Object.keys(sources).forEach(write);
    const base = graph(),
      car = 'src/car.ts#makeCar',
      counts = constructionCounts(base);
    assert.ok(base.constructors[car]);
    assert.deepEqual(base.constructors['src/machine.ts#buildMachine']!.kinds, ['colliders', 'seats']);
    for (const key of [
      'src/car.ts#label',
      'src/callback.ts#invoke',
      'src/entity/entity.ts#register',
      'src/authored.ts#record',
    ])
      assert.ok(!base.constructors[key], key);
    for (const file of ['src/barrel.ts', 'dev/forward/index.ts', 'src/consumer.ts'])
      assert.ok(base.constructors[car]!.importers.includes(file), file);
    assert.ok(!base.constructors[car]!.importers.includes('src/types.ts'));
    assert.ok(!base.constructors[car]!.importers.includes('src/new-feature.ts'));
    assert.ok(!base.constructors[car]!.importers.includes('src/finished-consumer.ts'));
    sources['src/new.ts'] = "export {make as fresh}from '../dev/forward';";
    write('src/new.ts');
    const grown = graph();
    assert.match(checkLegacyRecords(grown.constructors, counts).join('\n'), /importer count grew/);
    assert.match(compareLegacyRecords(counts, constructionCounts(grown)).join('\n'), /importer count grew/);
    assert.deepEqual(loadLegacyGraph(root, budgets).constructors, grown.constructors);
    // Count-only intentionally permits an importer identity swap.
    delete sources['src/consumer.ts'];
    fs.unlinkSync(path.join(root, 'src/consumer.ts'));
    assert.deepEqual(checkLegacyRecords(graph().constructors, counts), []);
    delete sources['src/new.ts'];
    fs.unlinkSync(path.join(root, 'src/new.ts'));
    assert.match(checkLegacyRecords(graph().constructors, counts).join('\n'), /lower the count/);
    sources['src/car.ts'] += ' export const second=()=>alias();';
    write('src/car.ts');
    assert.match(
      checkLegacyRecords(graph().constructors, counts).join('\n'),
      /Unrecorded computed legacy construction export src\/car.ts#second/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
