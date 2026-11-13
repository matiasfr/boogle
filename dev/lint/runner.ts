import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { nativeConfig } from './config.ts';
import { ignored, ignorePatterns, lintSafety } from './safety.ts';
import type { Diagnostic, PrefabDebt } from './safety.ts';
import { createModuleResolver } from './prefab-boundaries.ts';
import { loadLegacyGraph, checkLegacyRecords, checkConstructionForwards } from './prefab-constructors.ts';

export type Budgets = Record<string, Record<string, { count: number }>>;
export type Options = { typeAware?: boolean; relaxed?: boolean; prune?: boolean; fix?: boolean };
const entityRule = 'boogle/use-an-entity';
// Run Oxlint's own bin script with this Node rather than the node_modules/.bin shim, which is a
// shell script on macOS and Linux and a .cmd file on Windows: one spawn that is the same on every OS.
const oxlintPackage = createRequire(import.meta.url).resolve('oxlint/package.json');
// Repository paths use / on every OS: ignore patterns, budgets and diagnostics all compare them as text.
const slash = (file: string) => file.split(path.sep).join('/');
const binary = path.join(
  path.dirname(oxlintPackage),
  (JSON.parse(fs.readFileSync(oxlintPackage, 'utf8')) as { bin: { oxlint: string } }).bin.oxlint,
);

type OxlintDiagnostic = { filename: string; code?: string; message: string; labels?: { span: { line: number } }[] };

// Windows caps a command line at 32,767 characters, and the whole repository's file list is longer than that, so there
// the files go to Oxlint in batches. Everywhere else they go in one run, as before.
const ARG_BUDGET = process.platform === 'win32' ? 30_000 : Infinity;
function batches(files: string[]): string[][] {
  const out: string[][] = [[]];
  let length = 0;
  for (const file of files) {
    if (length + file.length + 1 > ARG_BUDGET && out.at(-1)!.length) {
      out.push([]);
      length = 0;
    }
    out.at(-1)!.push(file);
    length += file.length + 1;
  }
  return out;
}

export function lintFiles(root: string, targets: string[], options: Options = {}): Diagnostic[] {
  // On macOS, /var and /private/var must not give Oxlint different bases for overrides and file paths.
  root = fs.realpathSync(root);
  const resolveModule = createModuleResolver(root);
  // Each lint root owns its budgets. Temporary fixtures must not inherit this checkout's file exemptions.
  const prefabPath = path.join(root, 'dev/lint/prefab-debt.json');
  const prefabDebt: PrefabDebt = fs.existsSync(prefabPath)
    ? JSON.parse(fs.readFileSync(prefabPath, 'utf8'))
    : { colliders: {}, seats: {} };
  const legacyGraph = prefabDebt.legacy ? loadLegacyGraph(root, prefabDebt) : undefined;
  const files = new Set<string>();
  for (const target of targets) {
    const absolute = path.resolve(root, target);
    const relative = slash(path.relative(root, absolute));
    if (relative && ignored(relative)) continue;
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      if (/\.(?:[cm]?js|ts)$/.test(relative)) files.add(relative);
    } else {
      const exists = fs.existsSync(absolute);
      const pattern = exists ? (relative ? relative + '/' : '') + '**/*.{js,mjs,cjs,ts}' : target;
      let matched = false;
      for (const file of fs.globSync(pattern, { cwd: root, exclude: ignorePatterns }).map(slash))
        if (!ignored(file)) {
          files.add(file);
          matched = true;
        }
      if (!exists && !matched) throw new Error(`No files match lint target: ${target}`);
    }
  }
  const selected = [...files].sort();
  const config = path.join(root, `.oxlint-run-${randomUUID()}.json`);
  let diagnostics: Diagnostic[] = [];
  if (selected.length)
    try {
      fs.writeFileSync(config, JSON.stringify(nativeConfig()));
      const args = [
        '-c',
        config,
        '--disable-nested-config',
        '--no-ignore',
        '--format',
        'json',
        '--report-unused-disable-directives-severity',
        'error',
        ...(options.typeAware === false ? [] : ['--type-aware']),
        ...(options.fix ? ['--fix'] : []),
      ];
      const found: OxlintDiagnostic[] = [];
      for (const batch of batches(selected)) {
        const result = spawnSync(process.execPath, [binary, ...args, ...batch], {
          cwd: root,
          encoding: 'utf8',
          maxBuffer: 30_000_000,
        });
        if (result.error) throw result.error;
        if (result.status !== 0 && result.status !== 1)
          throw new Error(result.stderr || result.stdout || 'Oxlint failed');
        found.push(...(JSON.parse(result.stdout) as { diagnostics: OxlintDiagnostic[] }).diagnostics);
      }
      diagnostics = found.map((d) => ({
        file: slash(d.filename),
        line: d.labels?.[0]?.span.line ?? 1,
        rule:
          d.code?.replace(/^eslint\((.*)\)$/, '$1').replace(/^typescript\((.*)\)$/, '@typescript-eslint/$1') ??
          'oxlint/unused-disable',
        message: d.message,
      }));
      // Re-read after --fix so the safety checks always see the code that is being kept.
      for (const file of selected)
        diagnostics.push(
          ...lintSafety(fs.readFileSync(path.join(root, file), 'utf8'), file, prefabDebt, resolveModule, legacyGraph),
        );
    } finally {
      fs.rmSync(config, { force: true });
    }
  const budgetPath = path.join(root, 'lint-suppressions.json');
  const budgets: Budgets = fs.existsSync(budgetPath) ? JSON.parse(fs.readFileSync(budgetPath, 'utf8')) : {};
  for (const [file, rules] of Object.entries(budgets)) {
    const count = rules[entityRule]?.count;
    if (!Number.isSafeInteger(count) || count! < 1 || Object.keys(rules).some((r) => r !== entityRule))
      throw new Error(`Invalid entity budget: ${file}`);
    const exists = fs.existsSync(path.join(root, file));
    if (!files.has(file) && exists) continue;
    const actual = diagnostics.filter((d) => d.file === file && d.rule === entityRule).length;
    // Like ESLint's count suppressions: overflow reports *all* offenders, never just the excess.
    if (actual <= count!) {
      diagnostics = diagnostics.filter((d) => d.file !== file || d.rule !== entityRule);
      if (actual < count!) {
        if (options.prune) {
          if (actual) rules[entityRule]!.count = actual;
          else delete budgets[file];
        } else if (!options.relaxed) {
          diagnostics.push({
            file,
            line: 1,
            rule: 'boogle/stale-budget',
            message: `Entity budget ${count} has ${actual} uses; run npm run lint -- --prune-suppressions.`,
          });
        }
      }
    }
  }
  if (options.prune) fs.writeFileSync(budgetPath, JSON.stringify(budgets, null, 2) + '\n');
  if (fs.existsSync(prefabPath) && (prefabDebt.version !== 5 || !prefabDebt.legacy || !prefabDebt.forwards))
    diagnostics.push({
      file: 'dev/lint/prefab-debt.json',
      line: 1,
      rule: 'boogle/legacy-construction-counts',
      message: 'Keep schema version 5 and its computed construction/importer set. Use src/prefab/instantiate.ts.',
    });
  if (legacyGraph)
    for (const message of [
      ...checkLegacyRecords(legacyGraph.constructors, prefabDebt.legacy),
      ...checkConstructionForwards(legacyGraph, prefabDebt.forwards),
    ])
      diagnostics.push({
        file: 'dev/lint/prefab-debt.json',
        line: 1,
        rule: 'boogle/legacy-construction-counts',
        message,
      });
  return diagnostics;
}
