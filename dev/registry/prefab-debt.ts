// File identities, not total counts: removing one legacy file cannot pay for a new escape hatch.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { lintSafety } from '../lint/safety.ts';
import type { PrefabDebt } from '../lint/safety.ts';
import { checkPrefabRegistrations } from './prefab-registrations.ts';
import { parseSync } from 'oxc-parser';
import { createModuleResolver, isCapability, runtimeExports, PREFAB_DOORS } from '../lint/prefab-boundaries.ts';
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

// The only door growth the owner has approved (docs/decisions-process.md, d-2026-11-24-door-export-clearance-helper):
// the shared lift-or-wait helper's export on the record door and the engine's one overlap query, with the one import
// binding the record door needs to reach it. Nothing else may grow; once a base carries them these admit nothing new.
const APPROVED_DOOR_EXPORTS: Readonly<Record<string, readonly string[]>> = {
  'src/prefab/instantiate.ts': ['liftOrWait'],
  'src/physics/engine.ts': ['capsuleOverlaps'],
  'src/physics/backend-rapier.ts': ['capsuleOverlaps'],
};
/** The record door's capability bindings, by name: the two it had and the decision's capsuleOverlaps. checkPrefabDebt
 * refuses any other from the door's source, in any order of retiring and adding. The recorded count may grow once, from
 * 2 to 3, only as the engine's query and liftOrWait first appear together. */
const DOOR_BINDINGS = {
  file: 'src/prefab/instantiate.ts',
  /** Each capability module the door may bind, and the exports it may import from it, by name: no namespace, no
   * re-export of everything, no other export under an approved local name. */
  names: {
    'src/place/land.ts': ['ROOM_GROUP', 'staticBody'],
    'src/physics/engine.ts': ['capsuleOverlaps'],
  } as Readonly<Record<string, readonly string[]>>,
  with: 'liftOrWait',
  query: { file: 'src/physics/engine.ts', name: 'capsuleOverlaps' },
} as const;

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
        if (!(base[kind][file]?.exports ?? []).includes(name) && !APPROVED_DOOR_EXPORTS[file]?.includes(name))
          errors.push(`${PREFAB_DEBT_FILE}: ${kind}/${file} public exports grew: ${name}`);
    }
  for (const [file, names] of Object.entries(head.doors ?? {}))
    for (const name of names)
      if (!(base.doors?.[file] ?? []).includes(name) && !APPROVED_DOOR_EXPORTS[file]?.includes(name))
        errors.push(`${PREFAB_DEBT_FILE}: door ${file} public exports grew: ${name}`);
  for (const [file, counts] of Object.entries(head.doorCounts ?? {}))
    for (const kind of ['colliders', 'seats'] as const) {
      const count = counts[kind];
      if (count === undefined) continue;
      const old = base.doorCounts?.[file]?.[kind];
      const { file: door, with: name, query } = DOOR_BINDINGS,
        granted =
          kind === 'colliders' &&
          file === door &&
          old === 2 &&
          count === 3 &&
          !!head.doors?.[door]?.includes(name) &&
          !base.doors?.[door]?.includes(name) &&
          !base.doors?.[query.file]?.includes(query.name);
      if (old === undefined || (count > old && !granted))
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
  {
    const { file, names } = DOOR_BINDINGS,
      current = path.join(root, file);
    type Spec = {
      type: string;
      importKind?: string;
      exportKind?: string;
      imported?: { name?: string; value?: string };
      local?: { name?: string; value?: string };
    };
    type Edge = { type: string; source?: { value: string } | null; importKind?: string; exportKind?: string };
    if (fs.existsSync(current))
      for (const node of parseSync(file, fs.readFileSync(current, 'utf8')).program.body as unknown as (Edge & {
        specifiers?: Spec[];
      })[]) {
        if (
          !node.source ||
          !['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)
        )
          continue;
        if (node.importKind === 'type' || node.exportKind === 'type') continue;
        const target = resolve(file, node.source.value);
        if (!target || !isCapability('colliders', target)) continue;
        const allowed = names[target] ?? [];
        if (node.type === 'ExportAllDeclaration') {
          errors.push(`${file}: capability binding * of ${target}: the door re-exports no whole capability module.`);
          continue;
        }
        for (const spec of node.specifiers ?? []) {
          if (spec.importKind === 'type' || spec.exportKind === 'type') continue;
          const named =
              spec.type === 'ImportSpecifier' ? spec.imported : spec.type === 'ExportSpecifier' ? spec.local : null,
            bound = named ? (named.name ?? named.value ?? '?') : `* as ${spec.local?.name ?? '?'}`;
          if (!named || !allowed.includes(bound))
            errors.push(
              `${file}: capability binding ${bound} of ${target} is not one of the door's named imports (${Object.entries(
                names,
              )
                .map(([m, n]) => `${m}: ${n.join(', ')}`)
                .join('; ')}).`,
            );
        }
      }
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
  return [...errors, ...comparePrefabDebt(comparable ? oldLists : head, head), ...checkPrefabRegistrations(root, ref)];
}
