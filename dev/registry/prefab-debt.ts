// File identities, not total counts: removing one legacy file cannot pay for a new escape hatch.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { lintSafety } from '../lint/safety.ts';
import type { PrefabDebt } from '../lint/safety.ts';
import { parseSync } from 'oxc-parser';
import { createModuleResolver, runtimeExports, PREFAB_DOORS } from '../lint/prefab-boundaries.ts';
import { loadLegacyGraph, checkLegacyRecords, compareLegacyRecords } from '../lint/prefab-edges.ts';

export const PREFAB_DEBT_FILE = 'dev/lint/prefab-debt.json';
const empty = (): PrefabDebt => ({ colliders: {}, seats: {} });
const rules = { colliders: 'boogle/colliders-from-records', seats: 'boogle/seats-from-records' } as const;

export function comparePrefabDebt(base: PrefabDebt, head: PrefabDebt): string[] {
  const errors: string[] = [];
  if (base.version === 3 && head.version !== 3)
    errors.push('Cannot drop prefab debt schema version 3 or its construction-edge records.');
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
  return [...errors, ...compareLegacyRecords(base.legacy, head.legacy)];
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
  const base = empty();
  const legacy = oldLists.version !== 3;
  // Bootstrap only from shared history: main may have independently renamed old exports since this branch cut.
  // Once counted surfaces exist on main, compare those exact records instead of recomputing history.
  const sourceRef = legacy
    ? execFileSync('git', ['merge-base', 'HEAD', ref], { cwd: root, encoding: 'utf8' }).trim()
    : ref;
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
  if (!legacy) {
    base.colliders = oldLists.colliders;
    base.seats = oldLists.seats;
    base.doors = oldLists.doors;
    base.legacy = oldLists.legacy;
  }
  const errors: string[] = [];
  if (head.version !== 3 || !head.legacy)
    errors.push(
      'Prefab debt requires schema version 3 and its computed construction/importer set. Use src/prefab/instantiate.ts.',
    );
  // Bootstrap against real call sites in the local base, not this branch's additions. Once main has the list,
  // even an equal-size file substitution fails. No network and no WORLD_NS exemption.
  for (const kind of ['colliders', 'seats'] as const)
    for (const file of Object.keys(head[kind])) {
      if (legacy) {
        const old = gitFile(file, sourceRef);
        const count = old === null ? 0 : countIn(old, file, kind);
        if (count) base[kind][file] = { count, exports: exportsIn(old!, file), reason: head[kind][file]!.reason };
      }
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
  base.doors ??= {};
  for (const file of doors) {
    const current = path.join(root, file);
    if (!fs.existsSync(current)) continue;
    if (legacy) base.doors[file] = exportsIn(gitFile(file, sourceRef) ?? '', file);
    errors.push(...surfaceErrors(exportsIn(fs.readFileSync(current, 'utf8'), file), head.doors?.[file], file));
  }
  for (const file of Object.keys(head.doors ?? {}))
    if (!doors.includes(file)) errors.push(`Unapproved prefab door ${file}`);
  if (head.legacy) {
    const graph = loadLegacyGraph(root, head);
    errors.push(...checkLegacyRecords(graph.constructors, head.legacy));
    if (legacy) base.legacy = loadLegacyGraph(root, head, { ref: sourceRef }).constructors;
  } else if (head.version === 3)
    errors.push('Missing computed legacy construction set and importer edges; use src/prefab/instantiate.ts.');
  return [...errors, ...comparePrefabDebt(base, head)];
}
