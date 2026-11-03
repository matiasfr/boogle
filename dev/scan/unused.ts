// npm run unused [-- --json]: advisory reference evidence, never deletion authority. Opt-in, outside check.
// Reuse the registry/atlas reader, then the compiler's symbol identities for exports; supplement their static
// edges with Boogle's browser/CLI loaders. Dynamic-name evidence is conservative, not runtime coverage.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { readFile } from './read.ts';
import { RETAINED } from './retained.ts';

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
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile).config;
const options = ts.parseJsonConfigFileContent(config, ts.sys, root).options;
const program = ts.createProgram(code, options);
const checker = program.getTypeChecker();
const symbolRefs = new Map<ts.Symbol, Map<string, number>>();
const canonical = (s: ts.Symbol) => (s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s);
function walk(n: ts.Node, visit: (n: ts.Node) => void) {
  visit(n);
  ts.forEachChild(n, (child) => walk(child, visit));
}
for (const f of code) {
  const text = texts.get(f)!;
  const facts = readFile(f, text);
  for (const target of facts.imports) edge(f, target, 'module import/re-export');
  for (const target of facts.lazy) edge(f, target, 'dynamic import (including browser-eval literal)');
  const sf = program.getSourceFile(f);
  if (!sf) continue;
  walk(sf, (n) => {
    if (ts.isIdentifier(n)) {
      add(identifiers, n.text, f);
      const sym = checker.getSymbolAtLocation(n);
      if (sym) {
        const key = canonical(sym);
        if (!symbolRefs.has(key)) symbolRefs.set(key, new Map());
        const counts = symbolRefs.get(key)!;
        counts.set(f, (counts.get(f) ?? 0) + 1);
      }
    }
    // The report's own example/retention paths are not consumers of the things it describes.
    const diagnostic = f === 'dev/scan/unused.ts' || f === 'dev/scan/retained.ts';
    if (
      !diagnostic &&
      (ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n))
    ) {
      for (const token of n.text.match(/[A-Za-z_$][\w$-]*/g) ?? []) add(literals, token, f);
      reference(f, n.text, 'literal path reference');
      // Imports inside page.evaluate strings do not appear as TS import nodes.
      for (const m of n.text.matchAll(/import\s*\(\s*['"]([^'"]+)['"]/g)) reference(f, m[1]!, 'browser-eval import');
    }
    if (!diagnostic && (ts.isTemplateHead(n) || ts.isTemplateMiddle(n))) {
      const prefix = /([A-Za-z][\w-]*-)$/.exec(n.text)?.[1];
      if (prefix) add(prefixes, prefix, f);
    }
    if (ts.isNewExpression(n) && n.expression.getText(sf) === 'URL') {
      const arg = n.arguments?.[0];
      if (arg && ts.isStringLiteralLike(arg)) reference(f, arg.text, 'URL asset/worker entry');
    }
    if (
      ts.isPropertyAssignment(n) &&
      n.name.getText(sf) === 'entryPoints' &&
      ts.isArrayLiteralExpression(n.initializer)
    ) {
      walk(n.initializer, (arg) => {
        if (ts.isStringLiteralLike(arg) && known.has(arg.text)) {
          edge(f, arg.text, 'bundler entryPoints (service worker/build entry)');
          entry(arg.text, `bundler entry in ${f}`, 'runtime');
        }
      });
    }
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    ) {
      const spec = n.moduleSpecifier.text;
      reference(f, spec, 'module edge (including type-only)');
      if (!spec.startsWith('.') && !spec.startsWith('/')) {
        add(packages, spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]!, f);
      }
      if (
        ts.isImportDeclaration(n) &&
        n.importClause?.namedBindings &&
        ts.isNamespaceImport(n.importClause.namedBindings)
      ) {
        namespaceTargets.add(resolve(f, spec));
      }
    }
    if (ts.isCallExpression(n) && n.expression.getText(sf) === 'import.meta.glob') {
      const arg = n.arguments[0];
      const patterns = arg && ts.isArrayLiteralExpression(arg) ? arg.elements : arg ? [arg] : [];
      const expanded: string[] = [];
      for (const p of patterns)
        if (ts.isStringLiteralLike(p)) {
          const value = (p.text.startsWith('!') ? '!' : '') + resolve(f, p.text.replace(/^!/, ''));
          const brace = /\{([^}]+)\}/.exec(value);
          expanded.push(...(brace ? brace[1]!.split(',').map((part) => value.replace(brace[0], part)) : [value]));
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
  const sf = program.getSourceFile(f);
  const module = sf && checker.getSymbolAtLocation(sf);
  if (!sf || !module || RETAINED[f]) continue;
  for (const exp of checker.getExportsOfModule(module)) {
    const name = exp.name;
    const symbol = canonical(exp);
    if (!(symbol.flags & ts.SymbolFlags.Value) || name === 'default') continue;
    const refs = symbolRefs.get(symbol) ?? new Map<string, number>();
    if ([...refs.keys()].some((source) => source !== f)) continue;
    // Namespace contracts include rule.install/edits/invariants; dynamic property access cannot prove one unused.
    if (namespaceTargets.has(f) || f.startsWith('src/world/rules/')) continue;
    const stringRefs = [...(literals.get(name) ?? [])].filter((source) => source !== f);
    // Browser evals and dynamic destructuring can have an identifier with no compiler link to its export.
    // Same-name unrelated symbols may hide a candidate: deliberately prefer a missed flag to a false deletion lead.
    const nameRefs = [...(identifiers.get(name) ?? [])].filter((source) => source !== f);
    if (stringRefs.length || nameRefs.length) continue;
    const local = (refs.get(f) ?? 0) > 1;
    groups.exports.push(
      evidence(
        f,
        `${f}#${name}`,
        local ? 'export unused, body used locally' : 'no use at all (no static reference beyond declaration)',
        local ? 'high' : 'medium',
        local ? [{ from: f, reason: `${refs.get(f)! - 1} local symbol reference(s) beyond declaration` }] : [],
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
