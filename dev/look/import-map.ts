// Browser-side harness imports also run inside evaluate strings and CDP, beyond Vite's import analysis.
// Give those source IDs real bundled module URLs, without loading any of them. Installed only by ?debugcam.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const ID = 'virtual:harness-imports';
const resolved = '\0' + ID;

export function harnessImports(): Plugin {
  let root = '';
  let production = false;
  const enabled = process.env.BOOGLE_HARNESS === '1';
  return {
    name: 'boogle-harness-imports',
    configResolved(config) {
      root = config.root;
      production = config.command === 'build';
    },
    resolveId(id) {
      if (id === ID) return resolved;
    },
    transformIndexHtml() {
      return production && !enabled
        ? []
        : [{ tag: 'meta', attrs: { name: 'boogle-harness', content: production ? 'production' : 'dev' } }];
    },
    load(id) {
      if (id !== resolved) return;
      if (!production || !enabled) return 'export default null;';
      const sources = new Set<string>();
      for (const file of fs.readdirSync(path.join(root, 'dev'), { recursive: true, encoding: 'utf8' })) {
        if (!file.endsWith('.ts')) continue;
        const full = path.join(root, 'dev', file);
        this.addWatchFile(full);
        const code = fs.readFileSync(full, 'utf8');
        // Includes literal imports, string bodies, and IDs stored in variables. Comments can name examples that
        // don't exist; only real files enter the map. The one computed family (minis) is expanded below.
        for (const match of code.matchAll(/['"`]((?:\/src\/|\/dev\/)[\w./-]+\.ts)['"`]/g))
          if (fs.existsSync(path.join(root, match[1]!))) sources.add(match[1]!);
      }
      for (const name of ['index', 'golf', 'hop']) sources.add(`/src/proto/minis/${name}.ts`);
      const entries = [...sources].sort().map((source) => {
        const ref = this.emitFile({ type: 'chunk', id: path.join(root, source), preserveSignature: 'strict' });
        return `${JSON.stringify(source)}: import.meta.ROLLUP_FILE_URL_${ref}`;
      });
      return `export default {${entries.join(',\n')}};`;
    },
  };
}
