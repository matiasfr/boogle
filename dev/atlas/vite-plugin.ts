// Vite plugin: `virtual:atlas-facts` is the extracted facts, computed at build and dev time (never committed).
// It must never fail the build: any error becomes an empty facts object with an `error` message, and the page shows
// a banner and the narrative-only views.
import path from 'node:path';
import type { Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { extractFacts } from './extract.ts';
import type { Facts } from '../../atlas/types.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ID = 'virtual:atlas-facts';
const RESOLVED = '\0' + ID;

function safeFacts(): Facts {
  try {
    return extractFacts({ root: ROOT, git: true });
  } catch (err) {
    return { schema: 1, git: null, files: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export function atlasFacts(): Plugin {
  return {
    name: 'boogle-atlas-facts',
    resolveId(id) {
      return id === ID ? RESOLVED : null;
    },
    load(id) {
      return id === RESOLVED ? `export default ${JSON.stringify(safeFacts())}` : null;
    },
    configureServer(server) {
      // A dev reload shows fresh facts when the code under src/ or server/src/ changes.
      const stale = (file: string) => {
        if (!/[\\/](src|server[\\/]src)[\\/]/.test(file)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
      };
      for (const ev of ['change', 'add', 'unlink']) server.watcher.on(ev, stale);
    },
  };
}
