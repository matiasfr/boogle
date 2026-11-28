// File identities, not total counts: removing one legacy file cannot pay for a new escape hatch.
// Schema v8 (owner, 28 November): keeps the core collider/seat module boundary and shrink-only file debt lists,
// dropping the frozen public-surface export lists, door binding-count ratchets and cross-file legacy importer counts
// that blocked ordinary helper/query exports and refactors.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { lintSafety } from '../lint/safety.ts';
import type { PrefabDebt } from '../lint/safety.ts';
import { checkPrefabRegistrations } from './prefab-registrations.ts';
import { createModuleResolver } from '../lint/prefab-boundaries.ts';

export const PREFAB_DEBT_FILE = 'dev/lint/prefab-debt.json';
const empty = (): PrefabDebt => ({ colliders: {}, seats: {} });
const rules = { colliders: 'boogle/colliders-from-records', seats: 'boogle/seats-from-records' } as const;

export function comparePrefabDebt(base: PrefabDebt, head: PrefabDebt): string[] {
  const errors: string[] = [];
  if ((base.version ?? 0) >= 8 && (head.version ?? 0) < base.version!)
    errors.push('Cannot drop prefab debt schema version.');
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
  const comparable = oldLists.version === 8;
  const resolve = createModuleResolver(root);
  const countIn = (text: string, file: string, kind: 'colliders' | 'seats') =>
    lintSafety(text, file, empty(), resolve).filter((d) => d.rule === rules[kind]).length;
  const errors: string[] = [];
  if (head.version !== 8) errors.push('Prefab debt requires schema version 8. Use src/prefab/instantiate.ts.');
  for (const kind of ['colliders', 'seats'] as const)
    for (const file of Object.keys(head[kind])) {
      const current = path.join(root, file);
      const text = fs.existsSync(current) ? fs.readFileSync(current, 'utf8') : '';
      const count = countIn(text, file, kind);
      if (count < head[kind][file]!.count)
        errors.push(`${PREFAB_DEBT_FILE}: stale ${kind}/${file}; lower the count to ${count} (remove a zero entry).`);
      if (count > head[kind][file]!.count)
        errors.push(
          `${PREFAB_DEBT_FILE}: ${kind}/${file} has ${count} violations, budget ${head[kind][file]!.count}; use src/prefab/instantiate.ts.`,
        );
    }
  return [...errors, ...comparePrefabDebt(comparable ? oldLists : head, head), ...checkPrefabRegistrations(root, ref)];
}
