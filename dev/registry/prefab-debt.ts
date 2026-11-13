// File identities, not total counts: removing one legacy file cannot pay for a new escape hatch.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { lintSafety } from '../lint/safety.ts';
import type { PrefabDebt } from '../lint/safety.ts';
import { parseSync } from 'oxc-parser';
import { createModuleResolver, runtimeExports, PREFAB_DOORS } from '../lint/prefab-boundaries.ts';
import {
  loadLegacyGraph,
  compareConstructionForwards,
  checkConstructionForwards,
  checkLegacyRecords,
  compareLegacyRecords,
} from '../lint/prefab-constructors.ts';

export const PREFAB_DEBT_FILE = 'dev/lint/prefab-debt.json';
const empty = (): PrefabDebt => ({ colliders: {}, seats: {} });
const rules = { colliders: 'boogle/colliders-from-records', seats: 'boogle/seats-from-records' } as const;

export function comparePrefabDebt(base: PrefabDebt, head: PrefabDebt): string[] {
  const errors: string[] = [];
  if ((base.version ?? 0) >= 5 && (head.version ?? 0) < base.version!)
    errors.push('Cannot drop prefab debt schema version or its construction-count records.');
  for (const kind of ['colliders', 'seats'] as const)
    for (const [file, entry] of Object.entries(head[kind])) {
      if (
        !/^src\/.+\.ts$/.test(file) ||
        typeof entry.reason !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}: \S.+/.test(entry.reason)
      )
        errors.push(`${PREFAB_DEBT_FILE}: ${kind}/${file} needs a dated reason line (YYYY-MM-DD: reason)`);
      if (!Number.isSafeInteger(entry.count) || entry.count < 1)
        errors.push(`${PREFAB_DEBT_FILE}: ${kind}/${file} needs a positive violation count; remove zero entries`);
      if (!Object.hasOwn(base[kind], file))
        errors.push(
          `${PREFAB_DEBT_FILE}: ${kind} grew: ${file}; lists may only shrink. Use src/prefab/instantiate.ts.`,
        );
      else if (entry.count > base[kind][file]!.count)
        errors.push(
          `${PREFAB_DEBT_FILE}: ${kind}/${file} count grew: ${base[kind][file]!.count} → ${entry.count}; lower the count. Use src/prefab/instantiate.ts.`,
        );
      for (const name of entry.exports ?? [])
        if (!(base[kind][file]?.exports ?? []).includes(name))
          errors.push(`${PREFAB_DEBT_FILE}: ${kind}/${file} public exports grew: ${name}`);
    }
  for (const [file, names] of Object.entries(head.doors ?? {}))
    for (const name of names)
      if (!(base.doors?.[file] ?? []).includes(name))
        errors.push(`${PREFAB_DEBT_FILE}: door ${file} public exports grew: ${name}`);
  for (const [file, counts] of Object.entries(head.doorCounts ?? {}))
    for (const kind of ['colliders', 'seats'] as const) {
      const count = counts[kind];
      if (count === undefined) continue;
      const old = base.doorCounts?.[file]?.[kind];
      if (old === undefined || count > old)
        errors.push(
          `${PREFAB_DEBT_FILE}: door ${file}/${kind} capability bindings grew. Use src/prefab/instantiate.ts.`,
        );
    }
  return [
    ...errors,
    ...compareLegacyRecords(base.legacy, head.legacy),
    ...compareConstructionForwards(base.forwards, head.forwards),
  ];
}

export function checkPrefabDebt(root: string, ref: string): string[] {
  const gitFile = (file: string, at = ref): string | null => {
    try {
      return execFileSync('git', ['show', `${at}:${file}`], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      return null;
    }
  };
  const head = JSON.parse(fs.readFileSync(path.join(root, PREFAB_DEBT_FILE), 'utf8')) as PrefabDebt;
  const baseline = gitFile(PREFAB_DEBT_FILE);
  const oldLists = baseline === null ? empty() : (JSON.parse(baseline) as PrefabDebt);
  // CI has only two shallow trees: read the base file directly, never require shared ancestry.
  // Missing/older schemas bootstrap with internal consistency only; current schemas enforce shrink-only data.
  const comparable = oldLists.version === 7;
  const resolve = createModuleResolver(root);
  const countIn = (text: string, file: string, kind: 'colliders' | 'seats') =>
    lintSafety(text, file, empty(), resolve).filter((d) => d.rule === rules[kind]).length;
  const exportsIn = (text: string, file: string) => runtimeExports(parseSync(file, text).program);
  const surfaceErrors = (actual: string[], recorded: string[] | undefined, file: string) =>
    recorded === undefined
      ? [`${file}: record the public exports in ${PREFAB_DEBT_FILE}`]
      : [
          ...actual
            .filter((name) => name === '*' || !recorded.includes(name))
            .map((name) => `${file}: unapproved public export ${name}`),
          ...recorded
            .filter((name) => !actual.includes(name))
            .map((name) => `${file}: remove stale public export ${name}`),
        ];
  const errors: string[] = [];
  if (head.version !== 7 || !head.legacy || !head.forwards || !head.doorCounts)
    errors.push(
      'Prefab debt requires schema version 7 and its binding/construction counts. Use src/prefab/instantiate.ts.',
    );
  for (const kind of ['colliders', 'seats'] as const)
    for (const file of Object.keys(head[kind])) {
      const current = path.join(root, file);
      const text = fs.existsSync(current) ? fs.readFileSync(current, 'utf8') : '';
      const count = countIn(text, file, kind);
      errors.push(...surfaceErrors(exportsIn(text, file), head[kind][file]!.exports, file));
      if (count < head[kind][file]!.count)
        errors.push(`${PREFAB_DEBT_FILE}: stale ${kind}/${file}; lower the count to ${count} (remove a zero entry).`);
      if (count > head[kind][file]!.count)
        errors.push(
          `${PREFAB_DEBT_FILE}: ${kind}/${file} has ${count} violations, budget ${head[kind][file]!.count}; use src/prefab/instantiate.ts.`,
        );
    }
  const doors = [...new Set(Object.values(PREFAB_DOORS).flat())];
  for (const file of doors) {
    const current = path.join(root, file);
    if (!fs.existsSync(current)) continue;
    errors.push(...surfaceErrors(exportsIn(fs.readFileSync(current, 'utf8'), file), head.doors?.[file], file));
  }
  for (const file of Object.keys(head.doors ?? {}))
    if (!doors.includes(file)) errors.push(`Unapproved prefab door ${file}`);
  for (const kind of ['colliders', 'seats'] as const)
    for (const file of PREFAB_DOORS[kind]) {
      if (!fs.existsSync(path.join(root, file))) continue;
      const actual = countIn(fs.readFileSync(path.join(root, file), 'utf8'), file, kind),
        recorded = head.doorCounts?.[file]?.[kind];
      if (recorded === undefined || !Number.isSafeInteger(recorded) || recorded < 0)
        errors.push(`${file}: record the ${kind} door binding count.`);
      else if (actual !== recorded)
        errors.push(
          `${file}: ${kind} door has ${actual} bindings, budget ${recorded}; ${actual < recorded ? 'lower the count' : 'use src/prefab/instantiate.ts'}.`,
        );
    }
  for (const [file, counts] of Object.entries(head.doorCounts ?? {}))
    for (const kind of Object.keys(counts))
      if (!(kind === 'colliders' || kind === 'seats') || !PREFAB_DOORS[kind].includes(file))
        errors.push(`Unapproved prefab door binding budget ${file}/${kind}`);
  if (head.legacy) {
    const graph = loadLegacyGraph(root, head);
    if (graph.conservative.length)
      console.log(`prefab conservative dynamic-import analysis: ${graph.conservative.join(', ')}`);
    errors.push(...checkLegacyRecords(graph.constructors, head.legacy));
    errors.push(...checkConstructionForwards(graph, head.forwards));
  } else if (head.version === 7)
    errors.push('Missing computed legacy construction set and importer counts; use src/prefab/instantiate.ts.');
  return [...errors, ...comparePrefabDebt(comparable ? oldLists : head, head)];
}
