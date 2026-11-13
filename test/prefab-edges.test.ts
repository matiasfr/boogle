// Owner-requested computed-set equality, alias/barrel reachability, and shrink-only consumer ratchet.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import debt from '../dev/lint/prefab-debt.json' with { type: 'json' };
import {
  computeLegacyGraph,
  loadLegacyGraph,
  checkLegacyRecords,
  compareLegacyRecords,
  acquiredConstruction,
} from '../dev/lint/prefab-edges.ts';
import { createModuleResolver, moduleEdges } from '../dev/lint/prefab-boundaries.ts';
import { parseSync } from 'oxc-parser';
import type { PrefabDebt } from '../dev/lint/prefab-boundaries.ts';

test('computed construction exports and real importer edges equal the committed record', { timeout: 30_000 }, () => {
  const graph = loadLegacyGraph(process.cwd(), debt);
  assert.deepEqual(checkLegacyRecords(graph.constructors, debt.legacy), []);
  assert.deepEqual(graph.constructors, debt.legacy);
});

test('binding graph follows helpers, aliases, callbacks, namespace dependencies, and forwarding chains', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-edge-fixtures-'));
  const sources: Record<string, string> = {
    'src/physics/engine.ts': 'export const createBody=()=>({});',
    'src/entities/railway/seat.ts': 'export const registerSeat=()=>()=>{};',
    'src/place/land.ts': 'export const addStatic=()=>({});',
    'src/car.ts':
      "import {createBody as body} from './physics/engine'; const alias=body; function inner(){return alias();} export function makeCar(){return inner();} export const label=1;",
    'src/machine.ts':
      "import {makeCar}from './car'; import {registerSeat}from './entities/railway/seat'; export const buildMachine=()=>{makeCar(); registerSeat();};",
    'src/dependencies.ts':
      "type Deps={land:typeof import('./place/land')}; export function injected({land}:Deps){return land.addStatic();} export function callback(f:()=>unknown){const call=f;return call();}",
    'src/barrel.ts': "export {makeCar as make} from './car';",
    'dev/forward/index.ts': "export * from '../../src/barrel';",
    'src/consumer.ts': "import * as api from '../dev/forward'; export const run=()=>api['make']();",
    'src/types.ts': "import type {makeCar}from './car'; export type T=typeof makeCar;",
    'src/prefab/instantiate.ts':
      "import {createBody}from '../physics/engine'; export const instantiate=()=>createBody();",
    'src/authored.ts': "import {instantiate}from './prefab/instantiate'; export const record=()=>instantiate();",
  };
  const entry = { count: 1, exports: [], reason: '2026-11-13: Fixture baseline.' };
  const budgets: PrefabDebt = {
    colliders: { 'src/car.ts': entry, 'src/machine.ts': entry, 'src/dependencies.ts': entry },
    seats: {},
  };
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const graph = () => computeLegacyGraph(sources, budgets, createModuleResolver(root));
  try {
    for (const [file, text] of Object.entries(sources)) write(file, text);
    const base = graph();
    const car = 'src/car.ts#makeCar';
    assert.ok(base.constructors[car]);
    assert.ok(!base.constructors['src/car.ts#label']);
    assert.deepEqual(base.constructors['src/machine.ts#buildMachine']!.kinds, ['colliders', 'seats']);
    assert.ok(base.constructors['src/dependencies.ts#injected']);
    assert.ok(base.constructors['src/dependencies.ts#callback']);
    for (const file of ['src/barrel.ts', 'dev/forward/index.ts', 'src/consumer.ts'])
      assert.ok(base.constructors[car]!.importers.includes(file), file);
    assert.ok(!base.constructors[car]!.importers.includes('src/types.ts'));
    assert.ok(
      !Object.values(base.constructors).some((record) => record.importers.includes('src/authored.ts')),
      'the prefab data door stays open',
    );
    const newFile = 'src/new.ts';
    const code = "export {make as fresh}from '../dev/forward';";
    const edge = moduleEdges(parseSync(newFile, code).program)[0]!;
    assert.ok(acquiredConstruction(base, newFile, edge, createModuleResolver(root)).includes(car));
    sources[newFile] = code;
    write(newFile, code);
    const grown = graph();
    assert.match(
      checkLegacyRecords(grown.constructors, base.constructors).join('\n'),
      /New legacy importer src\/new.ts/,
    );
    assert.match(compareLegacyRecords(base.constructors, grown.constructors).join('\n'), /edges grew/);
    const loaded = loadLegacyGraph(root, budgets);
    assert.deepEqual(loaded.constructors, grown.constructors);
    delete sources[newFile];
    fs.unlinkSync(path.join(root, newFile));
    assert.match(
      checkLegacyRecords(graph().constructors, grown.constructors).join('\n'),
      /Remove stale legacy importer/,
    );
    assert.deepEqual(
      loadLegacyGraph(root, budgets).constructors,
      base.constructors,
      'adding/removing a source file invalidates the persistent cache',
    );
    sources['src/car.ts'] += ' export const second=()=>alias();';
    write('src/car.ts', sources['src/car.ts']!);
    const added = graph();
    assert.match(
      checkLegacyRecords(added.constructors, base.constructors).join('\n'),
      /Unrecorded computed legacy construction export src\/car.ts#second/,
    );
    assert.match(
      compareLegacyRecords(base.constructors, added.constructors).join('\n'),
      /New legacy construction export/,
    );
    sources['src/car.ts'] = sources['src/car.ts']!.replace('export const label=1;', 'export const label=()=>alias();');
    write('src/car.ts', sources['src/car.ts']!);
    assert.match(
      checkLegacyRecords(graph().constructors, base.constructors).join('\n'),
      /Unrecorded computed legacy construction export src\/car.ts#label/,
      'an existing public name becoming construction-capable cannot appear silently',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
