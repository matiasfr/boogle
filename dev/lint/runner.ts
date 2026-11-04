import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { nativeConfig } from './config.ts';
import { ignored, ignorePatterns, lintSafety } from './safety.ts';
import type { Diagnostic } from './safety.ts';

export type Budgets = Record<string, Record<string, { count: number }>>;
export type Options = { typeAware?: boolean; relaxed?: boolean; prune?: boolean; fix?: boolean };
const entityRule = 'boogle/use-an-entity';
const binary = fileURLToPath(new URL('../../node_modules/.bin/oxlint', import.meta.url));

export function lintFiles(root: string, targets: string[], options: Options = {}): Diagnostic[] {
  // On macOS, /var and /private/var must not give Oxlint different bases for overrides and file paths.
  root = fs.realpathSync(root);
  const files = new Set<string>();
  for (const target of targets) {
    const absolute = path.resolve(root, target);
    const relative = path.relative(root, absolute);
    if (relative && ignored(relative)) continue;
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      if (/\.(?:[cm]?js|ts)$/.test(relative)) files.add(relative);
    } else {
      const exists = fs.existsSync(absolute);
      const pattern = exists ? (relative ? relative + '/' : '') + '**/*.{js,mjs,cjs,ts}' : target;
      let matched = false;
      for (const file of fs.globSync(pattern, { cwd: root, exclude: ignorePatterns }))
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
        ...selected,
      ];
      const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8', maxBuffer: 30_000_000 });
      if (result.error) throw result.error;
      if (result.status !== 0 && result.status !== 1)
        throw new Error(result.stderr || result.stdout || 'Oxlint failed');
      const output = JSON.parse(result.stdout) as {
        diagnostics: {
          filename: string;
          code?: string;
          message: string;
          labels?: { span: { line: number } }[];
        }[];
      };
      diagnostics = output.diagnostics.map((d) => ({
        file: d.filename,
        line: d.labels?.[0]?.span.line ?? 1,
        rule:
          d.code?.replace(/^eslint\((.*)\)$/, '$1').replace(/^typescript\((.*)\)$/, '@typescript-eslint/$1') ??
          'oxlint/unused-disable',
        message: d.message,
      }));
      // Re-read after --fix so the safety checks always see the code that is being kept.
      for (const file of selected)
        diagnostics.push(...lintSafety(fs.readFileSync(path.join(root, file), 'utf8'), file));
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
  return diagnostics;
}
