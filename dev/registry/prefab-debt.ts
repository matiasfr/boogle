// File identities, not total counts: removing one legacy file cannot pay for a new escape hatch.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { lintSafety } from '../lint/safety.ts';
import type { PrefabDebt, PrefabBudget } from '../lint/safety.ts';

export const PREFAB_DEBT_FILE = 'dev/lint/prefab-debt.json';
const empty = (): PrefabDebt => ({ colliders: {}, seats: {} });
const rules = { colliders: 'boogle/colliders-from-records', seats: 'boogle/seats-from-records' } as const;

export function comparePrefabDebt(base: PrefabDebt, head: PrefabDebt): string[] {
  const errors: string[] = [];
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
    }
  return errors;
}

export function checkPrefabDebt(root: string, ref: string): string[] {
  const gitFile = (file: string): string | null => {
    try {
      return execFileSync('git', ['show', `${ref}:${file}`], {
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
  const oldLists =
    baseline === null
      ? empty()
      : (JSON.parse(baseline) as {
          colliders: Record<string, PrefabBudget | string>;
          seats: Record<string, PrefabBudget | string>;
        });
  const base = empty();
  const legacy =
    baseline === null || Object.values(oldLists).some((list) => Object.values(list).some((v) => typeof v === 'string'));
  const countIn = (text: string, file: string, kind: keyof PrefabDebt) =>
    lintSafety(text, file, empty()).filter((d) => d.rule === rules[kind]).length;
  for (const kind of ['colliders', 'seats'] as const)
    for (const [file, entry] of Object.entries(oldLists[kind]))
      base[kind][file] =
        typeof entry === 'string' ? { count: countIn(gitFile(file) ?? '', file, kind), reason: entry } : entry;
  const errors: string[] = [];
  // Bootstrap against real call sites in the local base, not this branch's additions. Once main has the list,
  // even an equal-size file substitution fails. No network and no WORLD_NS exemption.
  for (const kind of ['colliders', 'seats'] as const)
    for (const file of Object.keys(head[kind])) {
      if (legacy && !Object.hasOwn(base[kind], file)) {
        const old = gitFile(file);
        const count = old === null ? 0 : countIn(old, file, kind);
        if (count) base[kind][file] = { count, reason: head[kind][file]!.reason };
      }
      const current = path.join(root, file);
      const count = fs.existsSync(current) ? countIn(fs.readFileSync(current, 'utf8'), file, kind) : 0;
      if (count < head[kind][file]!.count)
        errors.push(`${PREFAB_DEBT_FILE}: stale ${kind}/${file}; lower the count to ${count} (remove a zero entry).`);
      if (count > head[kind][file]!.count)
        errors.push(
          `${PREFAB_DEBT_FILE}: ${kind}/${file} has ${count} violations, budget ${head[kind][file]!.count}; use src/prefab/instantiate.ts.`,
        );
    }
  return [...errors, ...comparePrefabDebt(base, head)];
}
