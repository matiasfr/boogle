// An exception to AGENTS.md's test diet, by the owner's call: this exists so agents can catch a state.ts that pulls in the
// DOM or the view, which they can't see in a still. It's no precedent for testing features.
//
// Every src/entities/*/state.ts must load in Node. None exist yet, so this passes with zero and starts working when the
// first arrives. Two modules block a real one until step 17's spike in docs/plans/entity-architecture.md:
// src/constants.ts:26 (matchMedia) and src/physics/physics.ts:20 (location.search) both read the browser at load.
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const entities = path.join(import.meta.dirname, '../src/entities');
const states = fs
  .readdirSync(entities)
  .map((dir) => path.join(entities, dir, 'state.ts'))
  .filter((file) => fs.existsSync(file));

test('every entity state.ts imports in Node', async () => {
  for (const file of states) await import(file);
});
