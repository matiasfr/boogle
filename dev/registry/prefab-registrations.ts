import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parseSync } from 'oxc-parser';
import { registrationKinds, registrationSites } from '../lint/prefab-registrations.ts';
import { createModuleResolver, runtimeExports, moduleEdges } from '../lint/prefab-boundaries.ts';
export type RegistrationDebt = Record<
  keyof typeof registrationKinds,
  Record<string, { count: number; reason: string; exports: string[]; consumers: string[] }>
>;
export function checkPrefabRegistrations(root: string, ref: string): string[] {
  const file = 'dev/lint/prefab-registrations.json';
  if (!fs.existsSync(path.join(root, file))) return [];
  const head = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) as RegistrationDebt;
  const git = (name: string) => {
    try {
      return execFileSync('git', ['show', `${ref}:${name}`], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      return null;
    }
  };
  const old = git(file),
    base = old ? (JSON.parse(old) as RegistrationDebt) : null;
  const resolve = createModuleResolver(root),
    errors: string[] = [];
  const consumers = new Map<string, Set<string>>();
  // Explicit source closure for the unit selector; root may be an isolated registry fixture.
  const sourceDirectory = path.basename(fileURLToPath(new URL('../../src/', import.meta.url)));
  for (const name of fs.globSync('**/*.ts', { cwd: path.join(root, sourceDirectory) })) {
    const source = path.posix.join(sourceDirectory, name.split(path.sep).join('/'));
    const program = parseSync(source, fs.readFileSync(path.join(root, source), 'utf8')).program;
    for (const edge of moduleEdges(program)) {
      const target = !edge.erased && edge.source ? resolve(source, edge.source) : null;
      if (!target) continue;
      if (!consumers.has(target)) consumers.set(target, new Set());
      consumers.get(target)!.add(source);
    }
  }
  for (const kind of ['signs', 'interactions'] as const) {
    for (const [source, budget] of Object.entries(head[kind])) {
      const current = parseSync(source, fs.readFileSync(path.join(root, source), 'utf8')).program;
      const count = registrationSites(current, source, resolve, kind).length;
      if (count !== budget.count || count < 1)
        errors.push(`${source}: ${kind} debt ${budget.count} != ${count}; lower removed debt, never grow it`);
      if (!/^\d{4}-\d{2}-\d{2}: .+/.test(budget.reason)) errors.push(`${source}: ${kind} needs a dated reason`);
      const names = runtimeExports(current);
      const actualConsumers = [...(consumers.get(source) ?? [])].sort();
      if (JSON.stringify(actualConsumers) !== JSON.stringify(budget.consumers))
        errors.push(`${source}: ${kind} consumers differ; remove stale entries, never add consumers`);
      for (const consumer of budget.consumers ?? []) {
        if (base) {
          if (!base[kind][source]?.consumers.includes(consumer))
            errors.push(`${source}: ${kind} consumer grew: ${consumer}`);
        } else {
          const text = git(consumer);
          if (
            !text ||
            !moduleEdges(parseSync(consumer, text).program).some(
              (edge) => !edge.erased && edge.source && resolve(consumer, edge.source) === source,
            )
          )
            errors.push(`${source}: ${kind} new consumer lacks old-code proof: ${consumer}`);
        }
      }
      if (JSON.stringify(names) !== JSON.stringify(budget.exports))
        errors.push(`${source}: ${kind} public exports differ from the approved baseline`);
      const oldSource = git(source);
      const baseline =
        base?.[kind][source] ??
        (!base && oldSource
          ? {
              count: registrationSites(parseSync(source, oldSource).program, source, resolve, kind).length,
              exports: runtimeExports(parseSync(source, oldSource).program),
            }
          : undefined);
      if (!baseline || budget.count > baseline.count || budget.exports.some((n) => !baseline.exports.includes(n)))
        errors.push(`${source}: ${kind} debt grew; use prefab records`);
    }
  }
  return errors;
}
