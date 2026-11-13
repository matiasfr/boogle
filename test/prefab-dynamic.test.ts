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

for (const [name, body] of Object.entries({
  destructured: "const{label}=await import('/src/car.ts' as string);console.log(label);",
  accessed: "const api=await import('/src/car.ts');console.log(api.label);",
  all: "const[{label}]=await Promise.all([import('/src/car.ts')]);console.log(label);",
  then: "const label=await import('/src/car.ts').then(api=>api.label);console.log(label);",
  nestedNamespace: "const api=await import('/src/barrel.ts');console.log(api.cars.label);",
}))
  test(`selected dynamic ${name} does not acquire an unused constructor`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-selected-'));
    const sources = {
      'src/physics/engine.ts': 'export function createBody(){}',
      'src/car.ts':
        "import{createBody}from './physics/engine.ts';export const makeCar=()=>createBody();export const label='safe';",
      'src/barrel.ts': "export * as cars from './car.ts';",
      'dev/look/evals/read.ts': `export async function read(){${body}}`,
    };
    try {
      for (const [f, code] of Object.entries(sources)) {
        fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
        fs.writeFileSync(path.join(root, f), code);
      }
      const graph = computeLegacyGraph(
        sources,
        {
          colliders: { 'src/car.ts': { count: 1, exports: ['makeCar', 'label'], reason: '2026-11-13: Fixture.' } },
          seats: {},
        },
        createModuleResolver(root),
      );
      assert.ok(!graph.constructors['src/car.ts#makeCar']!.importers.includes('dev/look/evals/read.ts'));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

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
    'src/physics/engine.ts':
      'export function createBody(){}; export function setShapes(body,shapes){}; export function sweepSphere(){};',
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

test('a generic callback receiver does not inherit construction from another argument', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-callback-scope-'));
  const sources = {
    'src/physics/engine.ts': 'export function createBody(){}',
    'src/pose.ts': 'export function pose(data, callback){callback();}',
    'src/driver.ts':
      "import{pose}from './pose';export async function driver(){const api=await import('./physics/engine');pose(api,()=>api.createBody());}",
  };
  const entry = { count: 1, exports: [], reason: '2026-11-13: Fixture.' };
  try {
    for (const [file, code] of Object.entries(sources)) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), code);
    }
    const graph = computeLegacyGraph(
      sources,
      { colliders: { 'src/pose.ts': entry, 'src/driver.ts': entry }, seats: {} },
      createModuleResolver(root),
    );
    assert.equal(graph.constructors['src/pose.ts#pose'], undefined);
    assert.ok(graph.constructors['src/driver.ts#driver']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('replacing shapes is a collider construction capability', () => {
  const graph = fixture("const {setShapes}=await import('./physics/engine');setShapes({},[]);");
  assert.ok(graph.constructors['src/fixture.ts#build']);
});

test('typed shape-to-body recipe callbacks remain construction without poisoning ordinary callbacks', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-shape-factory-'));
  const sources = {
    'src/physics/engine.ts': 'export type Shape={kind:string};export type Body={id:number};',
    'src/recipe.ts':
      "import type{Shape,Body}from './physics/engine';type Factory=(shape:Shape)=>Body;export function build(make:Factory){return make({kind:'box'});}",
  };
  try {
    for (const [file, code] of Object.entries(sources)) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), code);
    }
    const graph = computeLegacyGraph(
      sources,
      { colliders: { 'src/recipe.ts': { count: 1, exports: ['build'], reason: '2026-11-13: Fixture.' } }, seats: {} },
      createModuleResolver(root),
    );
    assert.deepEqual(graph.constructors['src/recipe.ts#build']?.kinds, ['colliders']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
