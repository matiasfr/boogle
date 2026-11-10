// The server image carries only what server/Dockerfile copies. On 10 November a new shared import (src/net/rtc-wire.ts)
// built fine, passed every test from the full checkout and crash-looped on Fly with ERR_MODULE_NOT_FOUND. This walks the
// static imports the image runs (server/src/index.ts, and the seed prebuild the Dockerfile RUNs) and requires every file
// they reach to be in the three places that list the image's sources: the Dockerfile's COPY lines, the build identity
// in dev/server-build.ts and the deploy workflow's paths filter (server/README.md, "Continuous deploy").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseSync, type Node } from 'oxc-parser';
import { walk as walkAst } from '../dev/scan/parse.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENTRIES = ['server/src/index.ts', 'server/src/seeds/prebuild.ts'];
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// A string literal or a backtick string without `${}`; anything else is not a path the walk can follow.
function literal(node: Node | null | undefined): string | undefined {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0]!.value.cooked ?? undefined;
  return undefined;
}

// Specifiers a module loads at runtime, from the parsed module (comments and strings can't fake or hide one).
// Whole `import type` / `export type` statements are erased by type stripping; `import { type A }` still loads.
function specifiers(source: string): string[] {
  const out: string[] = [];
  walkAst(parseSync('module.ts', source, { lang: 'ts' }).program, (n) => {
    if (n.type === 'ImportDeclaration' && n.importKind !== 'type') out.push(n.source.value);
    else if ((n.type === 'ExportNamedDeclaration' || n.type === 'ExportAllDeclaration') && n.source) {
      if (n.exportKind !== 'type') out.push(n.source.value);
    } else if (n.type === 'ImportExpression') {
      const spec = literal(n.source);
      if (spec !== undefined) out.push(spec);
    } else if (n.type === 'NewExpression' && n.callee.type === 'Identifier' && n.callee.name === 'URL') {
      const [first, base] = n.arguments;
      const spec = literal(first as Node | undefined);
      const metaUrl =
        base?.type === 'MemberExpression' && base.object.type === 'MetaProperty' && !base.computed
          ? base.property.type === 'Identifier' && base.property.name === 'url'
          : false;
      if (spec !== undefined && metaUrl) out.push(spec);
    }
  });
  return out;
}

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

function buildIdentityPaths(): string[] {
  const args = /'--',([\s\S]*?)\]/.exec(read('dev/server-build.ts'))?.[1] ?? '';
  return [...args.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

function deployPaths(): string[] {
  const block = /\n {4}paths:\n((?: {6}- .*\n)+)/.exec(read('.github/workflows/deploy-server.yml'))?.[1] ?? '';
  return [...block.matchAll(/- '([^']+)'/g)].map((m) => m[1]!);
}

test('every file the server image runs is copied, in the build identity and in the deploy filter', () => {
  const { files } = walk();
  const lists = {
    'server/Dockerfile COPY': dockerCopies(),
    'dev/server-build.ts': buildIdentityPaths(),
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
