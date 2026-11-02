// An exception to AGENTS.md's test diet, by the owner's call: this exists so agents can catch a state.ts that pulls in the
// DOM or the view, which they can't see in a still. It's no precedent for testing features.
//
// Every src/entities/*/state.ts must load in Node, whatever it imports: lint sees a file's own imports, this sees the
// rest. Nothing here stubs the DOM. What can't load in Node yet, until step 17's headless runtime in
// docs/plans/entity-architecture.md, is listed in KNOWN_BLOCKED and replaced by the stand-in beside it. So this proves
// loading, not playing: the ground is flat here, and a body stays a mirror because Rapier isn't in.
import test from 'node:test';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KNOWN_BLOCKED: Record<string, { why: string; standIn: string }> = {
  // Reached through src/island/heights.ts (the ground, which physics and the ball read).
  'src/island/index.ts': {
    why: "import.meta.glob finds the POIs' site files, and only Vite has it. Its layout.ts has one too.",
    standIn: "import { GRID_RES } from '../world/grid.ts'; export const baseCm = new Int32Array(GRID_RES * GRID_RES);",
  },
};

const root = path.join(import.meta.dirname, '..');
registerHooks({
  load(url, context, nextLoad) {
    const file = url.startsWith('file:') ? path.relative(root, fileURLToPath(url)) : '';
    const blocked = KNOWN_BLOCKED[file];
    return blocked
      ? { format: 'module-typescript', source: blocked.standIn, shortCircuit: true }
      : nextLoad(url, context);
  },
});

const states = fs
  .readdirSync(path.join(root, 'src/entities'))
  .map((dir) => path.join(root, 'src/entities', dir, 'state.ts'))
  .filter((file) => fs.existsSync(file));

test('every entity state.ts imports in Node', async () => {
  // Rapier's packages don't resolve in Node. Its load fails with a warning, and bodies made before it's in are kept as
  // mirrors, so nothing else depends on it.
  const { physicsReady } = await import('../src/physics/engine.ts');
  physicsReady.catch(() => {});
  for (const file of states) await import(file);
});
