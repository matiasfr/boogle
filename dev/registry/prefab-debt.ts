// File identities, not total counts: removing one legacy file cannot pay for a new escape hatch.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { lintSafety } from '../lint/safety.ts';
import type { PrefabDebt } from '../lint/safety.ts';

export const PREFAB_DEBT_FILE = 'dev/lint/prefab-debt.json';
const empty = (): PrefabDebt => ({ colliders: {}, seats: {} });
const rules = { colliders: 'boogle/colliders-from-records', seats: 'boogle/seats-from-records' } as const;

export function comparePrefabDebt(base: PrefabDebt, head: PrefabDebt): string[] {
  const errors: string[] = [];
  for (const kind of ['colliders', 'seats'] as const)
    for (const [file, reason] of Object.entries(head[kind])) {
      if (!/^src\/.+\.ts$/.test(file) || typeof reason !== 'string' || !/^\d{4}-\d{2}-\d{2}: \S.+/.test(reason))
        errors.push(`${PREFAB_DEBT_FILE}: ${kind}/${file} needs a dated reason line (YYYY-MM-DD: reason)`);
      if (!Object.hasOwn(base[kind], file))
        errors.push(
          `${PREFAB_DEBT_FILE}: ${kind} grew: ${file}; lists may only shrink. Use src/prefab/instantiate.ts.`,
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
  const base: PrefabDebt = baseline === null ? empty() : JSON.parse(baseline);
  const errors: string[] = [];
  // Bootstrap against real call sites in the local base, not this branch's additions. Once main has the list,
  // even an equal-size file substitution fails. No network and no WORLD_NS exemption.
  for (const kind of ['colliders', 'seats'] as const)
    for (const file of Object.keys(head[kind])) {
      if (baseline === null) {
        const old = gitFile(file);
        if (old !== null && lintSafety(old, file, empty()).some((d) => d.rule === rules[kind]))
          base[kind][file] = head[kind][file]!;
      }
      const current = path.join(root, file);
      if (
        !fs.existsSync(current) ||
        !lintSafety(fs.readFileSync(current, 'utf8'), file, empty()).some((d) => d.rule === rules[kind])
      )
        errors.push(`${PREFAB_DEBT_FILE}: stale ${kind}/${file}; remove the migrated file from the list.`);
    }
  return [...errors, ...comparePrefabDebt(base, head)];
}
