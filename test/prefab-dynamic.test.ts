// Fifth-review reproductions: real factories reached through dynamically destructured module values.
import test from 'node:test';
import assert from 'node:assert/strict';
import fixtures from './fixtures/prefab-dynamic-review.json' with { type: 'json' };
import { lintSafety } from '../dev/lint/safety.ts';
for (const fixture of fixtures)
  test(`review 5: reject ${fixture.file}`, () => {
    assert.ok(
      lintSafety(fixture.code, fixture.file).some((d) => d.rule === 'boogle/colliders-from-records'),
      'Expected prefab door rejection',
    );
  });

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { computeLegacyGraph } from '../dev/lint/prefab-constructors.ts';
import { createModuleResolver } from '../dev/lint/prefab-boundaries.ts';

const cases: Record<string, string> = {
  requireObject: "const {createBody:make}=require('./physics/engine');make();",
  await: "const api=await import('./physics/engine');api.createBody();",
  array: "const [api]=await Promise.all([import('./physics/engine')]);api.createBody();",
  object: "const {api:{createBody:make}}={api:await import('./physics/engine')};make();",
  nested: "const [{createBody:make}]=await Promise.all([import('./physics/engine')]);make();",
  settled: "const [{value:{createBody:make}}]=await Promise.allSettled([import('./physics/engine')]);make();",
  local: "let api;api=await import('./physics/engine');const {createBody:make}=api;make();",
  assignment: "let api;[api]=await Promise.all([import('./physics/engine')]);api.createBody();",
  field: "const bag={};bag.api=await import('./physics/engine');const {api:{createBody:make}}=bag;make();",
  rest: "const [first,...parts]=await Promise.all([import('./render/owned-view'),import('./physics/engine')]);first.createOwnedView();parts[0].createBody();",
  spread: "const modules=[import('./physics/engine')];const [api]=await Promise.all([...modules]);api.createBody();",
  variableArray: "const modules=[import('./physics/engine')];const [api]=await Promise.all(modules);api.createBody();",
  thenAggregate: "await Promise.all([import('./physics/engine')]).then(([api])=>api.createBody());",
  settledThen: "await Promise.allSettled([import('./physics/engine')]).then(([{value}])=>value.createBody());",
  thenBlock: "const api=await import('./physics/engine').then(m=>{return m;});api.createBody();",
  thenIdentity: "const api=await import('./physics/engine').then(m=>m);api.createBody();",
  then: "await import('./physics/engine').then(({createBody})=>createBody());",
  thenValue: "const {createBody:make}=await import('./physics/engine').then(m=>({createBody:m.createBody}));make();",
  thenNamed: "function run({createBody:make}){make();}await import('./physics/engine').then(run);",
  helper: "const {createBody:make}=await import('./physics/engine');function local(){make();}local();",
};
function fixture(body: string, file = 'src/fixture.ts', name = 'build') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-dynamic-'));
  const sources = {
    'src/physics/engine.ts': 'export function createBody(){}; export function sweepSphere(){};',
    'src/render/owned-view.ts': 'export function createOwnedView(){return {};}',
    'src/prefab/instantiate.ts':
      "import{createBody}from '../physics/engine';export function instantiate(){createBody();}",
    [file]: `export async function ${name}(){${body}}`,
  };
  try {
    for (const [f, code] of Object.entries(sources)) {
      fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
      fs.writeFileSync(path.join(root, f), code);
    }
    return computeLegacyGraph(
      sources,
      { colliders: { [file]: { count: 1, exports: [name], reason: '2026-11-13: Fixture.' } }, seats: {} },
      createModuleResolver(root),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
for (const [name, body] of Object.entries(cases))
  test(`dynamic values: ${name} retains creation identity`, () => {
    const graph = fixture(body);
    assert.deepEqual(graph.constructors['src/fixture.ts#build']?.kinds, ['colliders']);
    assert.deepEqual(graph.conservative, []);
  });
test('unknown dynamic use fails closed and names its file', () => {
  const graph = fixture("const api=await import('./physics/engine'); opaque(api);");
  assert.deepEqual(graph.constructors['src/fixture.ts#build']?.kinds, ['colliders', 'seats']);
  assert.deepEqual(graph.conservative, ['src/fixture.ts']);
});
test('dynamically acquired ownership and the record door remain open', () => {
  const graph = fixture(
    "const [{createOwnedView},{instantiate}]=await Promise.all([import('./render/owned-view'),import('./prefab/instantiate')]);const owner=createOwnedView();instantiate();return owner;",
  );
  assert.equal(graph.constructors['src/fixture.ts#build'], undefined);
  assert.deepEqual(graph.conservative, []);
});
test('an exemption cannot hide allocation in a private helper', () => {
  const graph = fixture(
    "const {createBody}=await import('../physics/engine');function local(){createBody();}local();",
    'src/player/camera-arm.ts',
    'makeCameraArm',
  );
  assert.ok(graph.constructors['src/player/camera-arm.ts#makeCameraArm']);
});

test('a proven query-only exemption stays free through dynamic import', () => {
  const graph = fixture(
    "const {sweepSphere}=await import('../physics/engine');sweepSphere();",
    'src/player/camera-arm.ts',
    'makeCameraArm',
  );
  assert.equal(graph.constructors['src/player/camera-arm.ts#makeCameraArm'], undefined);
  assert.equal(graph.exemptionAudit['src/player/camera-arm.ts#makeCameraArm']?.creates, false);
});

test('opaque use cannot hide behind a separately resolved read', () => {
  const graph = fixture(
    "const modules=await Promise.all([import('../physics/engine')]);modules[0].sweepSphere(); for(const x of modules){x.createBody();}",
    'src/player/camera-arm.ts',
    'makeCameraArm',
  );
  assert.deepEqual(graph.constructors['src/player/camera-arm.ts#makeCameraArm']?.kinds, ['colliders', 'seats']);
  assert.deepEqual(graph.conservative, ['src/player/camera-arm.ts']);
});

test('an ownership module exemption also requires a no-allocation proof', () => {
  const graph = fixture(
    "const {createBody}=await import('../physics/engine');function helper(){createBody();}helper();",
    'src/render/owned-view.ts',
    'createOwnedView',
  );
  assert.deepEqual(graph.constructors['src/render/owned-view.ts#createOwnedView']?.kinds, ['colliders']);
  assert.equal(graph.ownedFactories['src/render/owned-view.ts#createOwnedView']?.allocation, true);
});

for (const [name, code] of Object.entries({
  aggregate: "const [{makeCar:built}]=await Promise.all([import('./car')]); export {built};",
  callback: "export const built=await import('./car').then(m=>m.makeCar);",
  namespace: "const [built]=await Promise.all([import('./car')]);export {built};",
}))
  test(`dynamic ${name} forwarding preserves the provider identity`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-dynamic-forward-'));
    const sources = {
      'src/physics/engine.ts': 'export function createBody(){}',
      'src/car.ts': "import{createBody}from './physics/engine';export const makeCar=()=>createBody();",
      'src/barrel.ts': code,
      'src/consumer.ts': "import{built}from './barrel';console.log(built);",
    };
    try {
      for (const [file, text] of Object.entries(sources)) {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), text);
      }
      const graph = computeLegacyGraph(
        sources,
        { colliders: { 'src/car.ts': { count: 1, exports: ['makeCar'], reason: '2026-11-13: Fixture.' } }, seats: {} },
        createModuleResolver(root),
      );
      assert.deepEqual(graph.surfaces['src/barrel.ts#built'], ['src/car.ts#makeCar']);
      assert.ok(graph.constructors['src/car.ts#makeCar']?.importers.includes('src/consumer.ts'));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
