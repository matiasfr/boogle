// Count budgets, not file/key identities: moving or re-keying debt is not growth.
// Read the same archived local base as the mixed-build registry; WORLD_NS never exempts these lists.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import type { Allow } from '../level/allow.ts';

export const DEBT_FILES = ['eslint-suppressions.json', 'dev/registry/knots.ts', 'dev/level/allow.ts'];
type Budget = { label: string; entries: Record<string, number>; countEntries?: boolean };
export type Debt = { budgets: Budget[]; groups: number };

// KNOTS' module imports the source reader; only its literal declaration belongs to this baseline.
function knotsOf(text: string): string[][] {
  const file = ts.createSourceFile('knots.ts', text, ts.ScriptTarget.Latest, true);
  for (const s of file.statements) {
    if (!ts.isVariableStatement(s)) continue;
    for (const d of s.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || d.name.text !== 'KNOTS') continue;
      if (!d.initializer || !ts.isArrayLiteralExpression(d.initializer)) break;
      return d.initializer.elements.map((group) => {
        if (!ts.isArrayLiteralExpression(group)) throw new Error('KNOTS groups must be literal arrays');
        return group.elements.map((member) => {
          if (!ts.isStringLiteral(member)) throw new Error('KNOTS members must be literal paths');
          return member.text;
        });
      });
    }
  }
  throw new Error('cannot read literal KNOTS baseline');
}

export async function debtOf(root: string): Promise<Debt> {
  const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
  const suppressed = JSON.parse(read(DEBT_FILES[0]!)) as Record<string, Record<string, { count: number }>>;
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
        label: 'eslint-suppressions.json',
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

export function compareDebt(base: Debt, head: Debt): string[] {
  return head.budgets.flatMap((h, i) => {
    const b = base.budgets[i]!;
    const count = Object.keys(h.entries).length;
    const oldCount = Object.keys(b.entries).length;
    if (total(h) <= total(b) && (!h.countEntries || count <= oldCount)) return [];
    const additions = Object.entries(h.entries)
      .filter(([key, n]) => n > (b.entries[key] ?? 0))
      .map(([key, n]) => `${key} (+${n - (b.entries[key] ?? 0)})`);
    return [
      `${h.label} grew: ${total(b)} → ${total(h)}${h.countEntries ? ` max, ${oldCount} → ${count} entries` : ''}; additions: ${additions.join(', ')}`,
    ];
  });
}
