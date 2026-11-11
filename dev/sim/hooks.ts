// What Vite does for the game at build time, for Node at load time, so game code runs headless unchanged. `npm run sim`
// loads this with --import; test/entity-state-node.test.ts imports it first.
//   - Rapier: its packages name only a bundler's `module` entry, leave off extensions and import a .wasm. These point
//     Node at the same files and instantiate the same WASM the browser runs.
//   - import.meta.glob: expanded in the file that calls it, from the same patterns over the same folders.
//   - import.meta.env: the VITE_ variables in process.env.
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(import.meta.dirname, '../..');
const SRC = `${pathToFileURL(path.join(root, 'src')).href}/`;
const RAPIER = `${pathToFileURL(path.join(root, 'node_modules/@dimforge')).href}/`;

// The package's wasm-bindgen glue, written for a bundler's `import * as wasm`.
const rapierGlue = (url: string) => `
import fs from 'node:fs';
import * as bg from './rapier_wasm3d_bg.js';
export * from './rapier_wasm3d_bg.js';
const bytes = fs.readFileSync(new URL('./rapier_wasm3d_bg.wasm', ${JSON.stringify(url)}));
const { exports } = new WebAssembly.Instance(new WebAssembly.Module(bytes), { './rapier_wasm3d_bg.js': bg });
bg.__wbg_set_wasm(exports);
exports.__wbindgen_start?.();
`;

// import.meta.glob<T>('<pattern>', { eager, import }). Keys are as Vite gives them: relative to the file, sorted.
const GLOB = /import\.meta\.glob(?:<[^(]*>)?\(\s*'([^']+)'\s*(?:,\s*\{([^}]*)\}\s*)?\)/g;
function expandGlobs(source: string, file: string) {
  const imports: string[] = [];
  const out = source.replace(GLOB, (_all, pattern: string, options = '') => {
    const keys = fs
      .globSync(pattern, { cwd: path.dirname(file) })
      .map((key) => key.split(path.sep).join('/')) // globSync gives \ on Windows; Vite keys and specifiers use /
      .map((key) => (key.startsWith('.') ? key : `./${key}`))
      .sort();
    const eager = /eager:\s*true/.test(options);
    const picked = /import:\s*'([^']+)'/.exec(options)?.[1];
    const entries = keys.map((key) => {
      const json = key.endsWith('.json');
      const spec = JSON.stringify(key);
      if (eager) {
        const name = `__glob${imports.length}`;
        imports.push(`import * as ${name} from ${spec}${json ? ` with { type: 'json' }` : ''};`);
        return `${spec}: ${picked ? `${name}.${picked}` : name}`;
      }
      const load = `import(${spec}${json ? `, { with: { type: 'json' } }` : ''})`;
      return `${spec}: () => ${load}${picked ? `.then((m) => m.${picked})` : ''}`;
    });
    return `({ ${entries.join(', ')} })`;
  });
  return imports.join(' ') + out; // all on the first line, so stack traces keep their line numbers
}

const ENV = `(${JSON.stringify(Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('VITE_'))))})`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^@dimforge\/rapier3d(-simd)?$/.test(specifier))
      return { url: `${RAPIER}${specifier.split('/')[1]}/rapier.js`, shortCircuit: true };
    if (context.parentURL?.startsWith(RAPIER) && specifier.startsWith('.') && !path.extname(specifier)) {
      const url = new URL(`${specifier}.js`, context.parentURL);
      const found = fs.existsSync(url) ? url : new URL(`${specifier}/index.js`, context.parentURL);
      return { url: found.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(RAPIER)) {
      const source = url.endsWith('/rapier_wasm3d.js') ? rapierGlue(url) : fs.readFileSync(fileURLToPath(url));
      return { format: 'module', source, shortCircuit: true };
    }
    const result = nextLoad(url, context);
    if (!url.startsWith(SRC) || result.format !== 'module-typescript') return result;
    const source = String(result.source);
    if (!source.includes('import.meta.')) return result;
    return { ...result, source: expandGlobs(source, fileURLToPath(url)).replaceAll('import.meta.env', ENV) };
  },
});
