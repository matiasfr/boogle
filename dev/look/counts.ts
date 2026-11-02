// What the normal game costs, as counts only: `npm run counts [-- --out file]` (default .look/counts.json). Draw calls,
// shadow draws and shader programs from `npm run perf` at a fixed pose (so not the same numbers as its table at the
// spawn), and the gzip size of the files the first frame needs, listed in the build's service worker (vite.config.ts,
// 'boogle-sw'). Runs nightly on SwiftShader (counts-nightly.yml), where times mean nothing: none are recorded and
// nothing has a budget yet. One draw call up or down between runs is a thing moving through the view, not a change.
// Hook objects (`npm run hitches`) aren't here: on SwiftShader they sample about 40 cold frames and read 6-7 KB/frame
// where a Mac reads 3, 8 % apart run to run, too noisy and too different from the budget to mean anything.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { root } from './lib.ts';

const argv = process.argv.slice(2);
const out = path.resolve(argv.includes('--out') ? argv[argv.indexOf('--out') + 1]! : '.look/counts.json');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-counts-'));

function node(args: string[], env: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status) throw new Error(`failed: node ${args.join(' ')}`);
}

/** Gzipped KB of the first-load files, by kind. */
function firstLoad() {
  const dist = path.join(tmp, 'dist');
  const vite = path.join(root, 'node_modules/vite/bin/vite.js');
  node([vite, 'build', '--logLevel', 'error', '--outDir', dist, '--emptyOutDir'], { VITE_BUILD: 'counts' });
  const list = /\bfirst:(\[[^\]]*\])/.exec(fs.readFileSync(path.join(dist, 'sw.js'), 'utf8'))?.[1];
  if (!list) throw new Error('no first-load list in the build sw.js');
  const kb: Record<string, number> = { js: 0, wasm: 0, css: 0, other: 0 };
  for (const f of JSON.parse(list) as string[]) {
    const ext = path.extname(f).slice(1);
    kb[ext in kb ? ext : 'other']! += gzipSync(fs.readFileSync(path.join(dist, f)), { level: 9 }).length / 1024;
  }
  return Object.fromEntries(Object.entries(kb).map(([k, v]) => [k, Math.round(v)]));
}

try {
  const perf = path.join(tmp, 'perf.json');
  node(['dev/look/perf.ts', '--render', '--json', perf]);
  const { calls, shadowCalls, programs } = JSON.parse(fs.readFileSync(perf, 'utf8'));
  const result = {
    commit: process.env.GITHUB_SHA ?? null,
    drawCalls: calls,
    shadowDraws: shadowCalls,
    programs,
    firstLoadGzipKB: firstLoad(),
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
