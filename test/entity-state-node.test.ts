// An exception to AGENTS.md's test diet, by the owner's call: this exists so agents can catch a state.ts that pulls in the
// DOM or the view, which they can't see in a still. It's no precedent for testing features.
//
// Every src/entities/*/state.ts must load in Node, whatever it imports: lint sees a file's own imports, this sees the
// rest. Nothing here stubs the DOM. dev/sim/hooks.ts stands in for Vite only (Rapier's WASM, import.meta.glob), so this
// loads the real ground and real bodies, as `npm run sim` does (dev/sim/README.md).
import '../dev/sim/hooks.ts';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Node 26 exposes a warning-producing localStorage getter without a storage file. Keep this DOM-free.
Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true });

const root = path.join(import.meta.dirname, '..');
const states = fs
  .readdirSync(path.join(root, 'src/entities'))
  .flatMap((dir) => ['state.ts', 'headless.ts'].map((file) => path.join(root, 'src/entities', dir, file)))
  .filter((file) => fs.existsSync(file));

test('every entity state.ts and headless.ts imports in Node', async () => {
  const { physicsReady } = await import('../src/physics/engine.ts');
  await physicsReady;
  for (const file of states) await import(pathToFileURL(file).href);
});
