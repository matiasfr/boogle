// Keep Node-side test instructions trusted while loading application modules from the tested checkout,
// including src imports reached through server modules and trusted test helpers.
import { registerHooks } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function useWorkerSource(root?: string) {
  if (!root) return;
  const source = new URL('../../src/', import.meta.url).href;
  const workerSource = pathToFileURL(path.resolve(root, 'src') + path.sep).href;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('.') || specifier.startsWith('file:')) {
        const url = new URL(specifier, context.parentURL).href;
        if (url.startsWith(source)) return nextResolve(workerSource + url.slice(source.length), context);
      }
      return nextResolve(specifier, context);
    },
  });
}
