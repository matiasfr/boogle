// Loads the bundler-style @dimforge/rapier3d* packages in plain Node: resolves their extensionless imports and swaps
// the WASM ESM-integration import for a synchronous instantiate. RAPIER_PKGS is a folder with det/, simd/ and plain/,
// each holding an unpacked npm tarball as package/ (see node.mjs).
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = pathToFileURL(path.resolve(process.env.RAPIER_PKGS ?? '')).href + '/';
const glue = (url) => `
import fs from 'node:fs';
import * as bg from './rapier_wasm3d_bg.js';
export * from './rapier_wasm3d_bg.js';
const bytes = fs.readFileSync(new URL('./rapier_wasm3d_bg.wasm', ${JSON.stringify(url)}));
const { exports } = new WebAssembly.Instance(new WebAssembly.Module(bytes), { './rapier_wasm3d_bg.js': bg });
bg.__wbg_set_wasm(exports);
exports.__wbindgen_start?.();
`;
registerHooks({
  resolve(s, c, next) {
    if (c.parentURL?.startsWith(ROOT) && s.startsWith('.') && !path.extname(s)) {
      const u = new URL(`${s}.js`, c.parentURL);
      const f = fs.existsSync(u) ? u : new URL(`${s}/index.js`, c.parentURL);
      return { url: f.href, shortCircuit: true };
    }
    return next(s, c);
  },
  load(url, c, next) {
    if (url.startsWith(ROOT) && url.includes('/package/')) {
      const source = url.endsWith('/rapier_wasm3d.js') ? glue(url) : fs.readFileSync(fileURLToPath(url));
      return { format: 'module', source, shortCircuit: true };
    }
    return next(url, c);
  },
});
