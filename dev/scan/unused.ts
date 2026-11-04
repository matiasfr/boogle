// npm run unused [-- --json]: advisory reference evidence, never deletion authority. Opt-in, outside check.
// Reuse the registry/atlas reader, Knip's module graph and lexical binding identities for exports; supplement static
// edges with Boogle's browser/CLI loaders. Dynamic-name evidence is conservative, not runtime coverage.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseSync, type Node, type Program } from 'oxc-parser';
import { analyze, type ScopeManager } from '@typescript-eslint/scope-manager';
import { createOptions, createSession } from 'knip/session';
import { readFile } from './read.ts';
import { RETAINED } from './retained.ts';
import { walk } from './parse.ts';

type Use = 'runtime' | 'tool';
type Ref = { from: string; reason: string };
type Finding = {
  item: string;
  claim: string;
  incoming: Ref[];
  rootOrLoader: string[];
  dynamicUncertainty: string;
  use: Use[];
  useReason: string;
  confidence: 'high' | 'medium' | 'low';
};
const start = performance.now();
const root = process.cwd();
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((f) => fs.existsSync(f));
const code = files.filter((f) => /\.[cm]?[jt]s$/.test(f) && !f.endsWith('.d.ts'));
const texts = new Map(
  files
    .filter((f) => /\.(?:[cm]?[jt]s|css|html|json|webmanifest|sh|yml)$/.test(f))
    .filter((f) => !f.endsWith('lock.json'))
    .map((f) => [f, fs.readFileSync(f, 'utf8')]),
);
const known = new Set(files);
const incoming = new Map<string, Ref[]>();
const roots = new Map<string, string[]>();
const edges = new Map<string, Set<string>>();
const usage = new Map<string, Set<Use>>();
const rootReasons = new Map<string, Map<Use, string>>();
const literals = new Map<string, Set<string>>();
const identifiers = new Map<string, Set<string>>();
const prefixes = new Map<string, Set<string>>();
const packages = new Map<string, Set<string>>();
const namespaceTargets = new Set<string>();
const reexports = new Map<string, Set<string>>();
const add = <T>(map: Map<string, Set<T>>, key: string, value: T) => {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(value);
};
function edge(from: string, target: string, reason: string) {
  if (!known.has(target) || from === target) return;
  const refs = incoming.get(target) ?? [];
  if (!refs.some((r) => r.from === from && r.reason === reason)) refs.push({ from, reason });
  incoming.set(target, refs);
  add(edges, from, target);
}
function entry(f: string, reason: string, use: Use) {
  roots.set(f, [...new Set([...(roots.get(f) ?? []), reason])]);
  add(usage, f, use);
  if (!rootReasons.has(f)) rootReasons.set(f, new Map());
  rootReasons.get(f)!.set(use, `${use} root ${f}: ${reason}`);
}
function resolve(from: string, spec: string): string {
  const bare = spec.split(/[?#]/)[0]!;
  return bare.startsWith('/') ? bare.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(from), bare));
}
function reference(from: string, spec: string, reason: string) {
  const candidates = [resolve(from, spec), spec.replace(/^\//, ''), `public/${spec.replace(/^\//, '')}`];
  for (const target of candidates) if (known.has(target)) edge(from, target, reason);
}
// Every tracked code file participates, including manual tools and disconnected modules. Boogle owns roots/loaders.
const options = await createOptions({ cwd: root, isSession: true, isShowProgress: false, isIncludeEntryExports: true });
options.parsedConfig = {
  entry: code.filter((f) => f.endsWith('ts')),
  project: code.filter((f) => f.endsWith('ts')),
  ignoreExportsUsedInFile: false,
  eslint: false,
  vite: false,
  typescript: false,
  node: false,
  prettier: false,
};
const session = await createSession(options);
if (session.getResults().hasConfigLoadErrors) throw new Error('unused: Knip could not load its configuration');
const programs = new Map<string, Program>();
const scopes = new Map<string, ScopeManager>();
const stringOf = (n: Node | null | undefined) =>
  n?.type === 'Literal' && typeof n.value === 'string'
    ? n.value
    : n?.type === 'TemplateLiteral' && !n.expressions.length
      ? (n.quasis[0]?.value.cooked ?? undefined)
      : undefined;
for (const f of code) {
  const text = texts.get(f)!;
  const facts = readFile(f, text);
  for (const target of facts.imports) edge(f, target, 'module import/re-export');
  for (const target of facts.lazy) edge(f, target, 'dynamic import (including browser-eval literal)');
  // The project's allowJs=false also excluded JavaScript from the old compiler's symbol/literal pass.
  if (!f.endsWith('ts')) continue;
  const parsed = parseSync(f, text, { astType: 'ts', range: true, preserveParens: false });
  if (parsed.errors.length) throw new Error(`unused: ${f}: ${parsed.errors.map((e) => e.message).join('; ')}`);
  const sf = parsed.program;
  programs.set(f, sf);
  scopes.set(f, analyze(sf as unknown as Parameters<typeof analyze>[0], { sourceType: 'module', lib: [] }));
  walk(sf, (n) => {
    if (n.type === 'Identifier') add(identifiers, n.name, f);
    // The report's own example/retention paths are not consumers of the things it describes.
    const diagnostic = f === 'dev/scan/unused.ts' || f === 'dev/scan/retained.ts';
    const literal = n.type === 'TemplateElement' ? n.value.cooked : stringOf(n);
    if (!diagnostic && literal != null) {
      for (const token of literal.match(/[A-Za-z_$][\w$-]*/g) ?? []) add(literals, token, f);
      reference(f, literal, 'literal path reference');
      // Imports inside page.evaluate strings do not appear as TS import nodes.
      for (const m of literal.matchAll(/import\s*\(\s*['"]([^'"]+)['"]/g)) reference(f, m[1]!, 'browser-eval import');
    }
    if (!diagnostic && n.type === 'TemplateElement' && !n.tail) {
      const prefix = /([A-Za-z][\w-]*-)$/.exec(n.value.cooked ?? '')?.[1];
      if (prefix) add(prefixes, prefix, f);
    }
    if (n.type === 'NewExpression' && text.slice(n.callee.start, n.callee.end) === 'URL') {
      const arg = stringOf(n.arguments[0]);
      if (arg !== undefined) reference(f, arg, 'URL asset/worker entry');
    }
    if (
      n.type === 'Property' &&
      text.slice(n.key.start, n.key.end) === 'entryPoints' &&
      n.value.type === 'ArrayExpression'
    ) {
      walk(n.value, (arg) => {
        const value = stringOf(arg);
        if (value !== undefined && known.has(value)) {
          edge(f, value, 'bundler entryPoints (service worker/build entry)');
          entry(value, `bundler entry in ${f}`, 'runtime');
        }
      });
    }
    if (
      (n.type === 'ImportDeclaration' || n.type === 'ExportNamedDeclaration' || n.type === 'ExportAllDeclaration') &&
      n.source
    ) {
      const spec = n.source.value;
      reference(f, spec, 'module edge (including type-only)');
      if (!spec.startsWith('.') && !spec.startsWith('/')) {
        add(packages, spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]!, f);
      }
      if (n.type === 'ImportDeclaration' && n.specifiers.some((s) => s.type === 'ImportNamespaceSpecifier')) {
        namespaceTargets.add(resolve(f, spec));
      }
      if (n.type === 'ExportNamedDeclaration')
        for (const s of n.specifiers)
          add(reexports, resolve(f, spec), s.local.type === 'Identifier' ? s.local.name : s.local.value);
    }
    if (n.type === 'CallExpression' && text.slice(n.callee.start, n.callee.end) === 'import.meta.glob') {
      const arg = n.arguments[0];
      const patterns = arg?.type === 'ArrayExpression' ? arg.elements : arg ? [arg] : [];
      const expanded: string[] = [];
      for (const p of patterns) {
        const pattern = stringOf(p);
        if (pattern !== undefined) {
          const value = (pattern.startsWith('!') ? '!' : '') + resolve(f, pattern.replace(/^!/, ''));
          const brace = /\{([^}]+)\}/.exec(value);
          expanded.push(...(brace ? brace[1]!.split(',').map((part) => value.replace(brace[0], part)) : [value]));
        }
      }
      for (const target of files) {
        const positives = expanded.filter((p) => !p.startsWith('!'));
        if (
          positives.some((p) => path.matchesGlob(target, p)) &&
          !expanded.filter((p) => p.startsWith('!')).some((p) => path.matchesGlob(target, p.slice(1)))
        ) {
          edge(f, target, 'Vite glob loader');
        }
      }
    }
  });
}
for (const [f, text] of texts) {
  if (f.endsWith('.html')) {
    entry(f, 'HTML entry', 'runtime');
    for (const m of text.matchAll(/(?:src|href)\s*=\s*['"]([^'"]+)['"]/g))
      reference(f, m[1]!, 'HTML script/style/asset entry');
  }
  if (/\.(json|webmanifest)$/.test(f)) {
    for (const m of text.matchAll(/"([^"\n]+\.[a-z0-9]+)"/g)) reference(f, m[1]!, 'manifest path');
    if (/manifest/.test(f)) {
      for (const target of files)
        if (text.includes(`"${path.posix.basename(target)}"`)) edge(f, target, 'asset manifest source/output');
      entry(f, 'asset manifest (pipeline inputs retained)', 'tool');
    }
  }
  if (/^(?:(?:server\/)?test\/.*\.test\.ts|.*config\.[cm]?[jt]s)$/.test(f))
    entry(f, 'test runner / tool configuration', 'tool');
  if (/\.(?:json|yml|sh)$/.test(f)) {
    for (const target of code)
      if (text.includes(target)) {
        edge(f, target, 'tool configuration/command path');
        entry(target, `tool command/config in ${f}`, 'tool');
      }
  }
  if (f.endsWith('package.json')) {
    const pkg = JSON.parse(text) as { scripts?: Record<string, string> };
    for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
      for (const target of files)
        if (command.includes(target) || command.includes(path.posix.relative(path.posix.dirname(f), target))) {
          if (/\.(ts|js|sh)$/.test(target)) entry(target, `${f} script ${name}`, 'tool');
        }
    }
  }
}
const loaders = [
  ['dev/scenarios/', 'dev/scenarios/run.ts', 'scenario CLI directory loader'],
  ['dev/sim/', 'dev/sim/run.ts', 'sim CLI directory loader'],
  ['dev/video/shots/', 'dev/video/clip.ts', 'video shot CLI directory loader'],
  ['dev/look/evals/', 'dev/look/look.ts', 'manual --eval browser tool'],
] as const;
for (const [dir, loader, reason] of loaders)
  for (const f of code) {
    if (f.startsWith(dir) && !f.slice(dir.length).includes('/')) {
      edge(loader, f, reason);
      entry(f, reason, 'tool');
    }
  }
// Root provenance follows all static edges, including type-only and debug/tool-only consumers.
const queue = [...usage.keys()];
for (let i = 0; i < queue.length; i++) {
  const from = queue[i]!;
  for (const target of edges.get(from) ?? []) {
    const before = usage.get(target)?.size ?? 0;
    for (const use of usage.get(from)!) {
      add(usage, target, use);
      if (!rootReasons.has(target)) rootReasons.set(target, new Map());
      if (!rootReasons.get(target)!.has(use)) rootReasons.get(target)!.set(use, rootReasons.get(from)!.get(use)!);
    }
    if (usage.get(target)!.size !== before) queue.push(target);
  }
}
function evidence(
  f: string,
  item: string,
  claim: string,
  confidence: Finding['confidence'],
  refs = incoming.get(f) ?? [],
): Finding {
  return {
    item,
    claim,
    incoming: refs,
    rootOrLoader: [
      ...(roots.get(f) ?? []),
      ...(rootReasons.get(f)?.values() ?? []),
      ...(incoming.get(f) ?? [])
        .filter((r) => /loader|entry|worker|manifest/.test(r.reason))
        .map((r) => `${r.from}: ${r.reason}`),
    ],
    dynamicUncertainty:
      'Computed names, external/manual callers and runtime coverage are not proven by static absence.',
    use: [...(usage.get(f) ?? new Set<Use>([f.startsWith('src/') ? 'runtime' : 'tool']))],
    useReason: usage.has(f)
      ? 'reachable from known roots (type-only edges included)'
      : 'inferred from location; no reachable root proved',
    confidence,
  };
}
const groups: Record<'files' | 'exports' | 'CSS' | 'assets' | 'dependencies', Finding[]> = {
  files: [],
  exports: [],
  CSS: [],
  assets: [],
  dependencies: [],
};
const retained: Finding[] = [];
for (const [f, reason] of Object.entries(RETAINED))
  retained.push(evidence(f, f, `retained on purpose: ${reason}`, 'high'));
for (const f of code) {
  if (!(incoming.get(f)?.length || roots.has(f) || RETAINED[f]))
    groups.files.push(evidence(f, f, 'no known incoming reference or root', 'medium'));
  const sf = programs.get(f);
  if (!sf) continue;
  const module = scopes.get(f)!.scopes.find((s) => s.type === 'module');
  const descriptor = session.describeFile(f, { isShowContention: false });
  if (!descriptor) throw new Error(`unused: Knip did not analyze ${f}`);
  if (!module || RETAINED[f]) continue;
  // The old compiler enumerated hoisted function exports before other declarations.
  const functions = new Set(
    sf.body.flatMap((n) =>
      n.type === 'ExportNamedDeclaration' && n.declaration?.type === 'FunctionDeclaration' && n.declaration.id
        ? [n.declaration.id.name]
        : [],
    ),
  );
  const exports = [...descriptor.exports].sort(
    (a, b) => Number(functions.has(b.identifier)) - Number(functions.has(a.identifier)),
  );
  const specifiers = sf.body.flatMap((n) => (n.type === 'ExportNamedDeclaration' && !n.source ? n.specifiers : []));
  const bindingOf = (name: string) => {
    const binding = specifiers.find(
      (s) => (s.exported.type === 'Identifier' ? s.exported.name : s.exported.value) === name,
    )?.local;
    return module.set.get(binding ? (binding.type === 'Identifier' ? binding.name : binding.value) : name);
  };
  // An imported/re-exported alias uses the shared value symbol, including its other exported names.
  // Star re-exports contain no identifier and did not count as symbol references in the old report.
  const usedBindings = new Set(
    exports
      .filter(
        (exp) =>
          exp.importLocations.some((ref) => path.relative(root, ref.filePath) !== f) ||
          reexports.get(f)?.has(exp.identifier),
      )
      .map((exp) => bindingOf(exp.identifier)),
  );
  const shorthand = new Set<number>();
  walk(sf, (n, parent) => {
    // The compiler identified an object shorthand as its property symbol, not the lexical value symbol.
    if (n.type === 'Property' && n.shorthand && parent?.type === 'ObjectExpression') shorthand.add(n.key.start);
  });
  for (const exp of exports) {
    const name = exp.identifier;
    const variable = bindingOf(name);
    // Re-exports already reference a declaration in another file; type-only declarations have no value symbol.
    if (!variable?.isValueVariable || name === 'default' || variable.defs.some((d) => d.type === 'ImportBinding'))
      continue;
    if (usedBindings.has(variable)) continue;
    // Namespace contracts include rule.install/edits/invariants; dynamic property access cannot prove one unused.
    if (namespaceTargets.has(f) || f.startsWith('src/world/rules/')) continue;
    const stringRefs = [...(literals.get(name) ?? [])].filter((source) => source !== f);
    // Browser evals and dynamic destructuring can have an identifier with no compiler link to its export.
    // Same-name unrelated symbols may hide a candidate: deliberately prefer a missed flag to a false deletion lead.
    const nameRefs = [...(identifiers.get(name) ?? [])].filter((source) => source !== f);
    if (stringRefs.length || nameRefs.length) continue;
    // Class names have inner/outer lexical bindings sharing one declaration; the compiler used one symbol.
    const bindings = scopes
      .get(f)!
      .scopes.flatMap((s) => s.variables)
      .filter((v) => v === variable || v.identifiers.some((id) => variable.identifiers.includes(id)));
    const positions = new Set(
      bindings
        .flatMap((v) => [...v.identifiers, ...v.references.map((r) => r.identifier)])
        .map((n) => n.range[0])
        .filter((pos) => !shorthand.has(pos)),
    );
    for (const specifier of specifiers)
      if ((specifier.local.type === 'Identifier' ? specifier.local.name : specifier.local.value) === variable.name)
        positions.add(specifier.exported.start);
    const count = positions.size;
    const local = count > 1;
    groups.exports.push(
      evidence(
        f,
        `${f}#${name}`,
        local ? 'export unused, body used locally' : 'no use at all (no static reference beyond declaration)',
        local ? 'high' : 'medium',
        local ? [{ from: f, reason: `${count - 1} local symbol reference(s) beyond declaration` }] : [],
      ),
    );
  }
}
const cssExplained: Finding[] = [];
for (const f of files.filter((file) => file.endsWith('.css'))) {
  const text = texts.get(f)!.replace(/\/\*[\s\S]*?\*\//g, '');
  const classes = new Set(
    [...text.matchAll(/([^{}]+)\{/g)].flatMap((m) => [...m[1]!.matchAll(/\.([A-Za-z_-][\w-]*)/g)].map((c) => c[1]!)),
  );
  for (const name of classes) {
    const refs = [...(literals.get(name) ?? [])].map((from) => ({ from, reason: 'class literal' }));
    for (const [prefix, sources] of prefixes)
      if (name.startsWith(prefix)) {
        for (const from of sources) refs.push({ from, reason: `computed class prefix ${prefix} (conservative)` });
      }
    for (const [from, html] of texts)
      if (from.endsWith('.html') && html.includes(name)) refs.push({ from, reason: 'HTML class' });
    const row = evidence(
      f,
      `${f}#.${name}`,
      refs.length
        ? 'retained: literal or computed selector evidence'
        : 'no literal or recognized computed class consumer',
      'low',
      refs,
    );
    if (!refs.length) groups.CSS.push(row);
    else cssExplained.push(row);
  }
}
for (const f of files.filter((file) => /\.(?:png|jpe?g|webp|svg|glb|gltf|wav|mp3|ogg|ktx2|woff2?)$/i.test(file))) {
  if (!incoming.get(f)?.length)
    groups.assets.push(
      evidence(f, f, 'no known asset or manifest consumer; manual reference use remains possible', 'low'),
    );
}
for (const f of files.filter((file) => file.endsWith('package.json'))) {
  const pkg = JSON.parse(texts.get(f)!) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    if (name.startsWith('@types/') || packages.has(name)) continue;
    const refs = [...texts].filter(
      ([from, text]) => from !== f && !from.endsWith('package.json') && text.includes(name),
    );
    const scripts = JSON.parse(texts.get(f)!) as { scripts?: Record<string, string> };
    if (refs.length || Object.values(scripts.scripts ?? {}).some((command) => command.includes(name))) continue;
    groups.dependencies.push(
      evidence(f, `${f}#${name}`, 'no import, config or CLI evidence; transitive/plugin use uncertain', 'low', []),
    );
  }
}
const report = {
  notice:
    'Advisory only: flags are not deletion authority. Export visibility is separate from body use. No files are changed.',
  seconds: +((performance.now() - start) / 1000).toFixed(3),
  groups,
  retained,
  explained: {
    entries: ['src/boot/index.ts', 'src/boot/sw-worker.ts', 'src/world/clock-worker.ts'].map((f) =>
      evidence(f, f, 'entry/worker references', 'high'),
    ),
    CSS: cssExplained.filter((r) => /#\.(guide-pad|pd-halo)$/.test(r.item)),
  },
};
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`${report.notice}\nScan: ${report.seconds}s`);
  for (const [group, rows] of Object.entries({
    ...groups,
    retained,
    explained: [...report.explained.entries, ...report.explained.CSS],
  })) {
    console.log(`\n${group} (${rows.length})`);
    for (const row of rows)
      console.log(
        `${row.item}: ${row.claim}\n  incoming=${JSON.stringify(row.incoming)}; root/loader=${JSON.stringify(row.rootOrLoader)}; use=${row.use.join('+')} (${row.useReason}); confidence=${row.confidence}\n  uncertainty=${row.dynamicUncertainty}`,
      );
  }
}
