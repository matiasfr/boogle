// One headless railway player without a browser: ws-page.ts bundled for Node and run in a worker thread (its own
// globals), so a load run needs no Chromium (or its machine-wide bot slot). Driven by staging-load.ts over
// postMessage: { id, cmd, args } answered with { id, result }; cmd is a window.T method, or 'epoch' / 'ready'.
import { parentPort, workerData } from 'node:worker_threads';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';

const { search } = workerData as { search: string };
const g = globalThis as Record<string, unknown>;
g.window = globalThis;
g.location = { search };
g.addEventListener = () => {};
g.removeEventListener = () => {};
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-np-')), 'page.mjs');
await build({
  entryPoints: [path.join(here, 'ws-page.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  logLevel: 'error',
  loader: { '.json': 'json' },
});
await import(pathToFileURL(out).href);
type Probe = Record<string, (...a: unknown[]) => unknown> & { railMessages: { t: string; epoch?: number }[] };
const T = (globalThis as unknown as { T: Probe }).T;
async function handle({ id, cmd, args = [] }: { id: number; cmd: string; args?: unknown[] }) {
  let result: unknown;
  try {
    if (cmd === 'epoch') result = Number(T.railMessages.findLast((m) => m.t === 'r:session')?.epoch ?? -1);
    else if (cmd === 'ready') result = !!(T.rail!() as { ready?: boolean } | null)?.ready;
    else result = await T[cmd]!(...args);
  } catch (e) {
    result = { error: String(e) };
  }
  parentPort!.postMessage({ id, result });
}
parentPort!.on('message', (m) => void handle(m));
parentPort!.postMessage({ id: -1, result: 'up' });
