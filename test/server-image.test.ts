// The server image carries only what server/Dockerfile copies. On 10 November a new shared import (src/net/rtc-wire.ts)
// built fine, passed every test from the full checkout and crash-looped on Fly with ERR_MODULE_NOT_FOUND. This walks the
// static imports the image runs (server/src/index.ts, and the seed prebuild the Dockerfile RUNs) and requires every file
// they reach to be in the three places that list the image's sources: the Dockerfile's COPY lines, the build identity
// in dev/server-build.ts and the deploy workflow's paths filter (server/README.md, "Continuous deploy").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runtimeSpecifiers as specifiers } from '../dev/scan/parse.ts';
import { SERVER_IMAGE_PATHS } from '../dev/server-build.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENTRIES = ['server/src/index.ts', 'server/src/seeds/prebuild.ts'];
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const builtin = (spec: string) => spec.startsWith('node:') || builtinModules.includes(spec.split('/')[0]!);
const packageName = (spec: string) =>
  spec
    .split('/')
    .slice(0, spec.startsWith('@') ? 2 : 1)
    .join('/');

// Every repo file (relative, posix) the entries reach, plus bare package imports by the file that makes them.
function walk(): { files: Set<string>; bare: [string, string][] } {
  const files = new Set<string>();
  const bare: [string, string][] = [];
  const queue = [...ENTRIES];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (files.has(file)) continue;
    files.add(file);
    if (!file.endsWith('.ts')) continue;
    for (const spec of specifiers(read(file))) {
      if (builtin(spec)) continue;
      if (!spec.startsWith('.')) {
        bare.push([file, spec]);
        continue;
      }
      if (spec.endsWith('/')) continue; // a directory the code reads (server/seeds), not a module
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
      assert.ok(fs.existsSync(path.join(ROOT, target)), `${file} imports ${spec}, which does not exist`);
      queue.push(target);
    }
  }
  return { files, bare };
}

// A path entry covers a file when it names it or a directory above it (`dir/**` in a workflow filter).
const covers = (entry: string, file: string) => {
  const dir = entry.replace(/\/\*\*$/, '').replace(/\/$/, '');
  return file === dir || file.startsWith(`${dir}/`);
};

function dockerCopies(): string[] {
  const sources: string[] = [];
  for (const line of read('server/Dockerfile').split('\n')) {
    const words = line.trim().split(/\s+/);
    if (words[0] !== 'COPY' || words.some((w) => w.startsWith('--from'))) continue;
    sources.push(...words.slice(1, -1).filter((w) => !w.startsWith('--')));
  }
  return sources;
}

function dockerIgnored(): string[] {
  return read('.dockerignore')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('**/'));
}

function deployPaths(): string[] {
  const block = /\n {4}paths:\n((?: {6}- .*\n)+)/.exec(read('.github/workflows/deploy-server.yml'))?.[1] ?? '';
  return [...block.matchAll(/- '([^']+)'/g)].map((m) => m[1]!);
}

test('every file the server image runs is copied, in the build identity and in the deploy filter', () => {
  const { files } = walk();
  const lists = {
    'server/Dockerfile COPY': dockerCopies(),
    'dev/server-build.ts': [...SERVER_IMAGE_PATHS],
    'deploy-server.yml paths': deployPaths(),
  };
  for (const [name, entries] of Object.entries(lists)) assert.ok(entries.length > 3, `could not parse ${name}`);
  assert.ok([...files].filter((f) => !f.startsWith('server/')).length > 20, 'the walk reached too few shared files');
  const ignored = dockerIgnored();
  const missing: string[] = [];
  for (const file of [...files].sort()) {
    for (const [name, entries] of Object.entries(lists)) {
      if (name === 'server/Dockerfile COPY' || !file.startsWith('server/')) {
        if (!entries.some((e) => covers(e, file))) missing.push(`${file}: not in ${name}`);
      }
    }
    const hidden = ignored.find((e) => covers(e, file));
    if (hidden) missing.push(`${file}: excluded by .dockerignore (${hidden})`);
  }
  assert.deepEqual(missing, [], 'add these to all three lists (server/README.md, "Continuous deploy")');
});

// Parser cases the old regex walk got wrong: a glob string swallowed the imports after it (a silent miss).
test('a glob string containing /* does not hide the imports after it', () => {
  const src =
    "const SEEDS = 'seeds/*.json';\nimport { a } from './hidden.ts';\n/** a doc comment */\nexport const b = a;\n";
  assert.deepEqual(specifiers(src), ['./hidden.ts']);
});

test('a template-literal dynamic import is found', () => {
  assert.deepEqual(specifiers('const m = await import(`./late.ts`);\n'), ['./late.ts']);
});

test('a trailing line comment is not read as an import', () => {
  assert.deepEqual(specifiers("run(); // was: import old from './gone.ts'\n"), []);
});

// automerge.yml once kept its own regex of these paths and missed src/net/rtc-wire.ts, so a change to it alone never
// redeployed the server. It now asks dev/server-build.ts; no second list.
test('automerge decides a server deploy from SERVER_IMAGE_PATHS, not a copy', () => {
  const step = read('.github/workflows/automerge.yml');
  assert.match(step, /\| node dev\/server-build\.ts --touches; then\n\s+gh workflow run deploy-server\.yml/);
  assert.doesNotMatch(step, /src\/net\/ws-wire\\\.ts/, 'an inline copy of the image paths is back');
  const touches = (input: string) => {
    try {
      execFileSync(process.execPath, ['dev/server-build.ts', '--touches'], { cwd: ROOT, input, stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  };
  assert.equal(touches('src/net/rtc-wire.ts\n'), true);
  assert.equal(touches('server/src/server.ts\n'), true);
  assert.equal(touches('src/features/x.ts\nsrc/network.ts\n'), false);
});

test('the server image resolves every package the server imports', () => {
  const deps = Object.keys((JSON.parse(read('server/package.json')) as { dependencies?: object }).dependencies ?? {});
  const problems: string[] = [];
  for (const [file, spec] of walk().bare) {
    // Node resolves a bare import from the importing file's folder up; only server/node_modules is in the image.
    if (!file.startsWith('server/')) problems.push(`${file} imports ${spec}: only server/ files can use packages`);
    else if (!deps.includes(packageName(spec))) problems.push(`${file} imports ${spec}: not a server dependency`);
  }
  assert.deepEqual(problems, []);
});
