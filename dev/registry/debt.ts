// Count budgets, not file/key identities: moving or re-keying debt is not growth.
// Read the same archived local base as the mixed-build registry; WORLD_NS never exempts these lists.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseSync } from 'oxc-parser';
import type { Allow } from '../level/allow.ts';

export const DEBT_FILES = ['lint-suppressions.json', 'dev/registry/knots.ts', 'dev/level/allow.ts'];
// Local archived bases can predate the linter rename. Never skip the no-growth comparison on that account.
export const LEGACY_SUPPRESSIONS = 'eslint-suppressions.json';
export const debtFile = (root: string, file: string) =>
  file === DEBT_FILES[0] && !fs.existsSync(path.join(root, file)) ? LEGACY_SUPPRESSIONS : file;
type DebtList = 'lint-suppressions.json' | 'KNOTS' | 'dev/level/allow.ts';
type Budget = { label: DebtList; entries: Record<string, number>; countEntries?: boolean };
export type Debt = { budgets: Budget[]; groups: number };
type Approval = { list: DebtList; key: string; max: number; reason: string };

// Only the owner approves additions; agents must never add entries on their own.
// Copy the exact list/key printed in a failure; max is the approved total for that key, not an open-ended waiver.
// Keep the owner's reason here in the diff. Plain registry/check and CI all read this same list.
export const APPROVED_DEBT: Approval[] = [];

// KNOTS' module imports the source reader; only its literal declaration belongs to this baseline.
function knotsOf(text: string): string[][] {
  const file = parseSync('knots.ts', text).program;
  for (const st of file.body) {
    const s = st.type === 'ExportNamedDeclaration' ? st.declaration : st;
    if (s?.type !== 'VariableDeclaration') continue;
    for (const d of s.declarations) {
      if (d.id.type !== 'Identifier' || d.id.name !== 'KNOTS') continue;
      if (d.init?.type !== 'ArrayExpression') break;
      return d.init.elements.map((group) => {
        if (group?.type !== 'ArrayExpression') throw new Error('KNOTS groups must be literal arrays');
        return group.elements.map((member) => {
          if (member?.type !== 'Literal' || typeof member.value !== 'string')
            throw new Error('KNOTS members must be literal paths');
          return member.value;
        });
      });
    }
  }
  throw new Error('cannot read literal KNOTS baseline');
}

export async function debtOf(root: string): Promise<Debt> {
  const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
  const suppressed = JSON.parse(read(debtFile(root, DEBT_FILES[0]!))) as Record<
    string,
    Record<string, { count: number }>
  >;
  const knots = knotsOf(read(DEBT_FILES[1]!));
  // allow.ts is a standalone data module (including its sketch helper), with no game or tool imports.
  const { ALLOW } = (await import(pathToFileURL(path.join(root, DEBT_FILES[2]!)).href)) as { ALLOW: Allow[] };
  const entries = (pairs: [string, number][]) => {
    const out: Record<string, number> = {};
    for (const [key, n] of pairs) {
      if (!Number.isSafeInteger(n) || n < 1) throw new Error(`invalid debt count for ${key}: ${n}`);
      out[key] = (out[key] ?? 0) + n;
    }
    return out;
  };
  return {
    groups: knots.length,
    budgets: [
      {
        label: 'lint-suppressions.json',
        entries: entries(
          Object.entries(suppressed).flatMap(([f, rules]) =>
            Object.entries(rules).map(([rule, value]): [string, number] => [`${f} [${rule}]`, value.count]),
          ),
        ),
      },
      { label: 'KNOTS', entries: entries(knots.flat().map((f) => [f, 1])) },
      {
        label: 'dev/level/allow.ts',
        countEntries: true,
        entries: entries(ALLOW.map((a) => [`${a.level} / ${a.rule} / ${a.match}`, a.max ?? 1])),
      },
    ],
  };
}

const total = (b: Budget) => Object.values(b.entries).reduce((n, count) => n + count, 0);
export function debtCounts(debt: Debt): string {
  const [s, k, a] = debt.budgets;
  return `suppressions ${total(s!)}; knots ${debt.groups} groups/${total(k!)} members; allowances ${Object.keys(a!.entries).length} entries/${total(a!)} max`;
}

export function compareDebt(base: Debt, head: Debt, approvals: Approval[] = APPROVED_DEBT): string[] {
  for (const a of approvals) {
    if (!a.reason.trim() || !a.key.trim() || !Number.isSafeInteger(a.max) || a.max < 1)
      return [
        `invalid APPROVED_DEBT entry for ${a.list} / ${a.key}: needs an owner's reason and a positive integer max`,
      ];
  }
  return head.budgets.flatMap((h, i) => {
    const b = base.budgets[i]!;
    // Remove only the approved increment at its exact key. It cannot subsidize growth at another key or list,
    // and once the addition is in the base it grants no extra budget to future branches.
    const entries = Object.fromEntries(
      Object.entries(h.entries).flatMap(([key, n]) => {
        const a = approvals.find((a) => a.list === h.label && a.key === key);
        const approved = a ? Math.max(0, Math.min(n, a.max) - (b.entries[key] ?? 0)) : 0;
        return n > approved ? [[key, n - approved]] : [];
      }),
    );
    const count = Object.keys(entries).length;
    const oldCount = Object.keys(b.entries).length;
    if (total({ ...h, entries }) <= total(b) && (!h.countEntries || count <= oldCount)) return [];
    const additions = Object.entries(entries)
      .filter(([key, n]) => n > (b.entries[key] ?? 0))
      .map(([key, n]) => `${key} (+${n - (b.entries[key] ?? 0)})`);
    return [
      `${h.label} grew: ${total(b)} → ${total(h)}${h.countEntries ? ` max, ${oldCount} → ${count} entries` : ''}; additions: ${additions.join(', ')}`,
    ];
  });
}
