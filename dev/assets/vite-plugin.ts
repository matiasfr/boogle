// The standalone asset stage gets build facts without importing build.ts (which executes the build CLI).
import type { Plugin } from 'vite';
import { assetHealth, BUDGET, SRC, OUT, MANIFEST } from './manifest.ts';
import { descriptors } from '../../character/descriptors.ts';

export const CATALOGUE_ID = 'virtual:asset-catalogue';
const resolved = '\0' + CATALOGUE_ID;
export function assetCatalogue(): Plugin {
  return {
    name: 'boogle-asset-catalogue',
    resolveId(id) {
      if (id === CATALOGUE_ID) return resolved;
    },
    load(id) {
      if (id !== resolved) return;
      const expected = Object.fromEntries(
        Object.entries(descriptors).map(([name, d]) => [name, d.expectedClips ?? []]),
      );
      const entries = assetHealth(expected);
      const bytes = entries.reduce((total, entry) => total + (entry.available ? entry.bytes : 0), 0);
      const totals = {
        bytes,
        budgetKB: BUDGET.totalKB,
        flags: bytes > BUDGET.totalKB * 1024 ? ['Total download budget exceeded'] : [],
      };
      this.addWatchFile(MANIFEST);
      return `export const entries = ${JSON.stringify(entries)}; export const totals = ${JSON.stringify(totals)};`;
    },
    configureServer(server) {
      server.watcher.add([SRC, OUT]);
      server.watcher.on('all', (_event, file) => {
        if (!file.startsWith(SRC + '/') && !file.startsWith(OUT + '/')) return;
        const module = server.moduleGraph.getModuleById(resolved);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload', path: '/character/*' });
      });
    },
  };
}
